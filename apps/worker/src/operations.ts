export const LIMITS = {
  read: 600,
  write: 120,
  sync: 60,
  enroll: 10,
  export: 4,
} as const;
export type RouteClass = keyof typeof LIMITS;
export class BudgetError extends Error {
  constructor(public code = 'REQUEST_BUDGET_EXCEEDED') {
    super(code);
  }
}
export async function account(
  db: D1Database,
  kind: RouteClass,
  at = new Date().toISOString(),
) {
  const minute = at.slice(0, 16),
    day = at.slice(0, 10);
  try {
    const out = await db.batch<any>([
      db
        .prepare(
          'INSERT INTO operational_usage VALUES(?,?,1) ON CONFLICT(bucket,class) DO UPDATE SET requests=requests+1 RETURNING requests',
        )
        .bind(minute, kind),
      db
        .prepare(
          "INSERT INTO operational_usage VALUES(?,'all',1) ON CONFLICT(bucket,class) DO UPDATE SET requests=requests+1 RETURNING requests",
        )
        .bind(day),
    ]);
    if (
      out[0].results[0].requests > LIMITS[kind] ||
      out[1].results[0].requests > 10000
    )
      throw new BudgetError();
  } catch (e) {
    if (e instanceof BudgetError) throw e;
    throw new BudgetError('BUDGET_ACCOUNTING_UNAVAILABLE');
  }
}
export function reportState(
  reported: string | null,
  at: string,
  maxAge: number,
) {
  if (!reported) return 'never_reported';
  const age = Date.parse(at) - Date.parse(reported);
  return !Number.isFinite(age) || age < 0
    ? 'unavailable'
    : age > maxAge
      ? 'reported_stale'
      : 'healthy';
}
export async function operationalHealth(
  db: D1Database,
  at = new Date().toISOString(),
) {
  const reports = await db
    .prepare('SELECT * FROM operational_reports')
    .all<any>();
  const cron = reports.results.find((r) => r.component === 'scheduler');
  const sources = await db
    .prepare('SELECT id,last_sync_at FROM sources WHERE purged_at IS NULL')
    .all<any>();
  const usage = await db
    .prepare(
      'SELECT bucket,class,requests FROM operational_usage WHERE bucket>=? ORDER BY bucket DESC,class LIMIT 500',
    )
    .bind(at.slice(0, 10))
    .all();
  const daily = await db
    .prepare(
      "SELECT requests FROM operational_usage WHERE bucket=? AND class='all'",
    )
    .bind(at.slice(0, 10))
    .first<any>();
  return {
    daily_requests: daily?.requests ?? 0,
    scheduler: {
      state:
        cron?.state === 'failed'
          ? 'failed'
          : cron?.state === 'running'
            ? 'interrupted_or_running'
            : reportState(cron?.reported_at ?? null, at, 30 * 60000),
      reported_at: cron?.reported_at ?? null,
    },
    sources: sources.results.map((s) => ({
      id: s.id,
      reported_at: s.last_sync_at,
      state: reportState(s.last_sync_at, at, 24 * 3600000),
    })),
    usage: usage.results,
    limits_per_minute: LIMITS,
    daily_request_limit: 10000,
    scope: 'application_requests_only_not_billing',
    usage_partial: usage.results.length === 500,
  };
}
