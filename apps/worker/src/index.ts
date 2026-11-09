import { readCanonical, canonicalCSV } from './export';
import { listHistory } from './history';
import { account, operationalHealth, BudgetError } from './operations';
import { dispatchPush, pushConfig, subscribe, type PushEnv } from './push';
import {
  authenticateDevice,
  enrollDevice,
  administerClients,
  deviceRouteAllowed,
  DeviceAuthError,
} from './device-auth';
import { deviceAdminPage } from './device-admin';
import { actionView, relayActions } from './device-actions';
import { listTasks } from './task-list';
import { owner, sha256, hmac, equal, type AuthEnv } from './auth';
import {
  Invalid,
  validateDue,
  reminderTimes,
  quietHoursEnd,
  semanticSync,
  unknownDue,
  type Due,
} from '../../../packages/contracts/src/index';
export interface Env extends AuthEnv, PushEnv {
  DB: D1Database;
  ASSETS?: Fetcher;
}
class Http extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
function result(
  data: unknown,
  status = 200,
  extraMeta: Record<string, unknown> = {},
) {
  const meta = { request_id: uuid(), server_time: now(), ...extraMeta };
  const envelope =
    status >= 400
      ? { error: (data as { error: unknown }).error, meta }
      : { data, meta };
  return new Response(JSON.stringify(envelope), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    },
  });
}
async function body(req: Request, maximum = 262144) {
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    throw new Http(422, 'INVALID_PAYLOAD');
  const reader = req.body?.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) {
        await reader.cancel();
        throw new Http(413, 'PAYLOAD_TOO_LARGE');
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  const raw = new TextDecoder().decode(bytes);
  try {
    return { raw, value: JSON.parse(raw) };
  } catch {
    throw new Http(422, 'INVALID_PAYLOAD');
  }
}
function text(v: unknown, max = 240) {
  if (typeof v !== 'string' || !v.trim() || v.length > max)
    throw new Http(422, 'INVALID_PAYLOAD');
  return v.trim();
}
function version(req: Request) {
  const v = req.headers.get('If-Match')?.replaceAll('"', '');
  if (!v || !/^\d+$/.test(v)) throw new Http(428, 'VERSION_REQUIRED');
  return Number(v);
}
function taskFields(v: any) {
  if (!v || typeof v !== 'object') throw new Http(422, 'INVALID_PAYLOAD');
  const due = v.due ?? unknownDue;
  const due_at_utc = validateDue(due);
  const status = v.status ?? 'todo';
  const priority = v.priority ?? 'normal';
  const kind = v.kind ?? 'personal_action';
  if (
    !['todo', 'doing', 'done', 'blocked', 'archived'].includes(status) ||
    !['low', 'normal', 'high', 'urgent'].includes(priority) ||
    ![
      'assignment',
      'exam',
      'meeting',
      'personal_action',
      'organizational_duty',
    ].includes(kind)
  )
    throw new Http(422, 'INVALID_PAYLOAD');
  return {
    title: text(v.title),
    description: v.description == null ? null : text(v.description, 500),
    context_id: v.context_id ?? null,
    kind,
    status,
    priority,
    due,
    due_at_utc,
  };
}
function task(row: any) {
  return { ...row, due: JSON.parse(row.due_json), due_json: undefined };
}
async function getTask(db: D1Database, id: string) {
  const row = await db
    .prepare('SELECT * FROM tasks WHERE id=? AND deleted_at IS NULL')
    .bind(id)
    .first();
  if (!row) throw new Http(404, 'NOT_FOUND');
  return task(row);
}
// One source for the scheduler's configured or default policy, including read UI.
function effectiveReminderPolicy(settings: any) {
  return (
    settings.reminder_policy ?? {
      enabled: true,
      offset_hours: [24, 3],
      date_only_hour: 9,
    }
  );
}
async function readTaskView(db: D1Database, id: string, url: URL) {
  const before = url.searchParams.get('history_before');
  if (
    before !== null &&
    (!/^[1-9][0-9]{0,14}$/.test(before) ||
      !Number.isSafeInteger(Number(before)))
  )
    throw new Http(422, 'INVALID_CURSOR');
  // D1 batch reads share a transaction: task, history, provenance and policy agree.
  const [taskRows, events, sources, settingsRows] = await db.batch<any>([
    db
      .prepare('SELECT * FROM tasks WHERE id=? AND deleted_at IS NULL')
      .bind(id),
    db
      .prepare(
        'SELECT id,task_id,event_type,before_json,after_json,created_at FROM task_events WHERE task_id=?' +
          (before ? ' AND id<?' : '') +
          ' ORDER BY id DESC LIMIT 31',
      )
      .bind(id, ...(before ? [Number(before)] : [])),
    db
      .prepare(
        'SELECT DISTINCT s.id,s.display_name FROM task_evidence te JOIN source_items si ON si.id=te.source_item_id JOIN sources s ON s.id=si.source_id WHERE te.task_id=? AND si.removed_at IS NULL AND s.purged_at IS NULL AND si.generation=s.generation ORDER BY s.id',
      )
      .bind(id),
    db.prepare('SELECT value_json FROM settings WHERE id=1'),
  ]);
  if (!taskRows.results[0]) throw new Http(404, 'NOT_FOUND');
  const history = events.results.slice(0, 30),
    settings = JSON.parse(settingsRows.results[0].value_json);
  return {
    task: task(taskRows.results[0]),
    history,
    next_history_cursor:
      events.results.length > 30
        ? String(history[history.length - 1].id)
        : null,
    sources: sources.results,
    reminder_policy: effectiveReminderPolicy(settings),
    reminder_policy_origin: settings.reminder_policy
      ? 'configured'
      : 'scheduler_default',
    timezone: settings.timezone,
  };
}
async function intents(
  db: D1Database,
  id: string,
  due: Due,
  revision: number,
  guard?: string,
  futureOnly = false,
) {
  const saved = await db
    .prepare('SELECT value_json FROM settings WHERE id=1')
    .first<any>();
  const policy = effectiveReminderPolicy(JSON.parse(saved.value_json));
  return reminderTimes(due, policy)
    .filter((at) => !futureOnly || Date.parse(at) > Date.now())
    .map((t) =>
      guard
        ? db
            .prepare(
              'INSERT OR IGNORE INTO reminder_intents(id,task_id,due_revision,scheduled_for_utc) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM tasks WHERE id=? AND mutation_id=? AND due_revision=?)',
            )
            .bind(uuid(), id, revision, t, id, guard, revision)
        : db
            .prepare(
              'INSERT OR IGNORE INTO reminder_intents(id,task_id,due_revision,scheduled_for_utc) VALUES(?,?,?,?)',
            )
            .bind(uuid(), id, revision, t),
    );
}
export async function tick(db: D1Database, at = now()) {
  const rebuilds = await db
    .prepare('SELECT * FROM reminder_rebuilds LIMIT 20')
    .all<any>();
  for (const item of rebuilds.results) {
    const task = await db
      .prepare('SELECT * FROM tasks WHERE id=?')
      .bind(item.task_id)
      .first<any>();
    const planned =
      task &&
      task.due_revision === item.due_revision &&
      !task.deleted_at &&
      !['done', 'archived'].includes(task.status)
        ? await intents(
            db,
            task.id,
            JSON.parse(task.due_json),
            task.due_revision,
            task.mutation_id,
            true,
          )
        : [];
    await db.batch([
      ...planned,
      db
        .prepare(
          'DELETE FROM reminder_rebuilds WHERE task_id=? AND due_revision=?',
        )
        .bind(item.task_id, item.due_revision),
    ]);
  }

  // Inbox is the durable channel. Push dispatch is independent and cannot create inbox rows.
  const cutoff = new Date(Date.parse(at) - 6 * 3600000).toISOString();
  await db
    .prepare(
      "UPDATE reminder_intents SET state='canceled' WHERE state='pending' AND scheduled_for_utc<?",
    )
    .bind(cutoff)
    .run();
  const configuration = await db
    .prepare('SELECT value_json FROM settings WHERE id=1')
    .first<any>();
  const preferences = JSON.parse(configuration.value_json);
  const quiet = preferences.reminder_policy?.quiet_hours;
  const until = quietHoursEnd(
    at,
    quiet ? { ...quiet, timezone: preferences.timezone } : undefined,
  );
  if (until) {
    // Coalesce offsets falling in the same quiet window; preserve one durable alert.
    await db.batch([
      db
        .prepare(
          "UPDATE OR IGNORE reminder_intents SET scheduled_for_utc=? WHERE state='pending' AND scheduled_for_utc<=?",
        )
        .bind(until, at),
      db
        .prepare(
          "UPDATE reminder_intents SET state='canceled' WHERE state='pending' AND scheduled_for_utc<=?",
        )
        .bind(at),
    ]);
    return 0;
  }
  const rows = await db
    .prepare(
      "SELECT r.* FROM reminder_intents r JOIN tasks t ON t.id=r.task_id WHERE r.state='pending' AND r.scheduled_for_utc<=? AND t.deleted_at IS NULL AND t.status NOT IN ('done','archived') AND t.due_revision=r.due_revision ORDER BY scheduled_for_utc LIMIT 20",
    )
    .bind(at)
    .all<any>();
  for (const r of rows.results) {
    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO notification_inbox(id,intent_id,task_id,created_at) SELECT ?,r.id,r.task_id,? FROM reminder_intents r JOIN tasks t ON t.id=r.task_id WHERE r.id=? AND r.state='pending' AND t.due_revision=r.due_revision AND t.deleted_at IS NULL AND t.status NOT IN ('done','archived')",
        )
        .bind(uuid(), at, r.id),
      db
        .prepare(
          "UPDATE reminder_intents SET state='completed' WHERE id=? AND EXISTS(SELECT 1 FROM notification_inbox WHERE intent_id=?)",
        )
        .bind(r.id, r.id),
    ]);
  }
  return rows.results.length;
}
async function collectorAuth(
  req: Request,
  env: Env,
  raw: string,
  allowRevoked = false,
) {
  const keyId = req.headers.get('X-Collector-Key-Id') ?? '';
  const stamp = req.headers.get('X-Request-Timestamp') ?? '';
  const nonce = req.headers.get('X-Nonce') ?? '';
  const signature = req.headers.get('X-Signature') ?? '';
  const cred = await env.DB.prepare(
    'SELECT * FROM collector_credentials WHERE id=?' +
      (allowRevoked ? '' : ' AND revoked=0'),
  )
    .bind(keyId)
    .first<any>();
  if (
    !cred ||
    !/^\d+$/.test(stamp) ||
    Math.abs(Date.now() / 1000 - Number(stamp)) > 300 ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(nonce)
  )
    throw new Http(403, 'ACCESS_DENIED');
  const digest = await sha256(raw);
  const expected = await hmac(
    cred.secret,
    [req.method, new URL(req.url).pathname, stamp, nonce, digest].join('\n'),
  );
  if (
    !equal(expected, signature) ||
    req.headers.get('X-Body-SHA256') !== digest
  )
    throw new Http(403, 'ACCESS_DENIED');
  try {
    await env.DB.prepare('INSERT INTO replay_nonces VALUES(?,?,?)')
      .bind(keyId, nonce, Number(stamp))
      .run();
  } catch {
    throw new Http(409, 'REPLAY_DETECTED');
  }
  await account(env.DB, 'sync');
  return { cred, keyId, digest };
}
async function sync(req: Request, env: Env) {
  const { raw, value: v } = await body(req);
  const { cred, keyId, digest } = await collectorAuth(req, env, raw);
  semanticSync(v);
  if (v.source_id !== cred.source_id) throw new Http(403, 'ACCESS_DENIED');
  const source = await env.DB.prepare('SELECT * FROM sources WHERE id=?')
    .bind(v.source_id)
    .first<any>();
  if (
    !source ||
    source.purged_at ||
    source.paused ||
    source.generation !== v.source_generation
  )
    throw new Http(410, 'SOURCE_REVOKED');
  const scope = 'sync:' + keyId;
  const old = await env.DB.prepare(
    'SELECT * FROM idempotency_records WHERE scope=? AND key=?',
  )
    .bind(scope, v.idempotency_key)
    .first<any>();
  if (old) {
    if (old.digest !== digest) throw new Http(409, 'IDEMPOTENCY_CONFLICT');
    return result({ batch_id: old.result_id, replayed: true });
  }
  // Refuse collector overwrites; revisions are separate proposals until CAS update path is implemented.
  for (const c of v.candidates) {
    const prior = await env.DB.prepare('SELECT * FROM candidates WHERE id=?')
      .bind(c.candidate_id)
      .first<any>();
    if (
      prior &&
      (prior.source_id !== v.source_id ||
        prior.fields_json !== JSON.stringify(c.fields))
    )
      throw new Http(409, 'VERSION_CONFLICT');
    if (c.expected_version !== null) throw new Http(409, 'VERSION_CONFLICT');
    if (
      c.fields.context_id &&
      !(await env.DB.prepare('SELECT id FROM contexts WHERE id=?')
        .bind(c.fields.context_id)
        .first())
    )
      throw new Http(422, 'INVALID_CONTEXT');
  }
  const syncGuard = uuid();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      'INSERT INTO mutation_guards SELECT ?,EXISTS(SELECT 1 FROM sources WHERE id=? AND generation=? AND purged_at IS NULL AND paused=0)',
    ).bind(syncGuard, v.source_id, v.source_generation),
    env.DB.prepare('INSERT INTO idempotency_records VALUES(?,?,?,?)').bind(
      scope,
      v.idempotency_key,
      digest,
      v.batch_id,
    ),
  ];
  for (const e of v.items) {
    const prior = await env.DB.prepare(
      'SELECT source_id,generation FROM source_items WHERE id=?',
    )
      .bind(e.evidence_id)
      .first<any>();
    if (
      prior &&
      (prior.source_id !== v.source_id ||
        prior.generation !== v.source_generation)
    )
      throw new Http(403, 'ACCESS_DENIED');
    statements.push(
      env.DB.prepare(
        'INSERT OR IGNORE INTO source_items(id,source_id,generation,observed_at,source_message_at,local_evidence_available) VALUES(?,?,?,?,?,?)',
      ).bind(
        e.evidence_id,
        v.source_id,
        v.source_generation,
        e.observed_at,
        e.source_message_at,
        e.local_evidence_available ? 1 : 0,
      ),
    );
  }
  for (const c of v.candidates) {
    statements.push(
      env.DB.prepare(
        'INSERT OR IGNORE INTO candidates(id,source_id,generation,fields_json,issues_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',
      ).bind(
        c.candidate_id,
        v.source_id,
        v.source_generation,
        JSON.stringify(c.fields),
        JSON.stringify(c.issue_codes),
        now(),
        now(),
      ),
    );
    for (const id of c.evidence_ids)
      statements.push(
        env.DB.prepare(
          'INSERT OR IGNORE INTO candidate_evidence VALUES(?,?)',
        ).bind(c.candidate_id, id),
      );
  }
  statements.push(
    env.DB.prepare(
      'UPDATE sources SET last_sync_at=?,coverage_json=? WHERE id=?',
    ).bind(now(), JSON.stringify(v.coverage), v.source_id),
  );
  statements.push(
    env.DB.prepare('DELETE FROM mutation_guards WHERE id=?').bind(syncGuard),
  );
  await env.DB.batch(statements);
  return result({
    batch_id: v.batch_id,
    items: v.items.length,
    candidates: v.candidates.length,
  });
}
async function undoReview(db: D1Database, actionId: string, req: Request) {
  const { raw } = await body(req);
  const key = text(req.headers.get('Idempotency-Key'), 128),
    scope = 'review-undo:' + actionId,
    digest = await sha256(raw);
  const prior = await db
    .prepare('SELECT * FROM idempotency_records WHERE scope=? AND key=?')
    .bind(scope, key)
    .first<any>();
  if (prior) {
    if (prior.digest !== digest) throw new Http(409, 'IDEMPOTENCY_CONFLICT');
    return { review_action: prior.result_id, undone: true };
  }
  const effect = await db
    .prepare('SELECT * FROM review_effects WHERE action_id=?')
    .bind(actionId)
    .first<any>();
  if (!effect) throw new Http(404, 'UNDO_UNAVAILABLE');
  if (effect.undo_blocked || effect.undone_by)
    throw new Http(409, 'UNDO_UNAVAILABLE');
  const action = uuid(),
    at = now(),
    ops: D1PreparedStatement[] = [];
  // All guards execute inside the atomic batch, so purge/edits cannot race a preflight.
  ops.push(
    db
      .prepare(
        `INSERT INTO mutation_guards SELECT ?,EXISTS(SELECT 1 FROM sources WHERE id=? AND generation=? AND purged_at IS NULL)`,
      )
      .bind(action, effect.source_id, effect.generation),
  );
  ops.push(
    db
      .prepare(
        `UPDATE candidates SET review_status=?,version=version+1,accepted_action=NULL,result_task_id=NULL,updated_at=? WHERE id=? AND version=? AND accepted_action=?`,
      )
      .bind(
        effect.prior_status,
        at,
        effect.candidate_id,
        effect.candidate_version,
        actionId,
      ),
  );
  ops.push(
    db
      .prepare('INSERT INTO mutation_guards VALUES(?,changes())')
      .bind(action + '-candidate'),
  );
  const original = effect.before_task_json
    ? JSON.parse(effect.before_task_json)
    : null;
  const links = JSON.parse(effect.before_evidence_json ?? '[]');
  if (effect.task_id) {
    ops.push(
      db
        .prepare(
          'INSERT INTO mutation_guards SELECT ?,EXISTS(SELECT 1 FROM tasks WHERE id=? AND version=? AND deleted_at IS NULL)',
        )
        .bind(action + '-version', effect.task_id, effect.task_version),
    );
    const accepted = await db
      .prepare('SELECT action FROM review_actions WHERE id=?')
      .bind(actionId)
      .first<any>();
    if (accepted?.action.startsWith('accept')) {
      ops.push(
        db
          .prepare(
            'INSERT INTO mutation_guards SELECT ?,EXISTS(SELECT 1 FROM tasks WHERE id=? AND mutation_id=?)',
          )
          .bind(action + '-identity', effect.task_id, actionId),
      );
      if (effect.created_task) {
        ops.push(
          db
            .prepare(
              'UPDATE tasks SET deleted_at=?,updated_at=?,version=version+1,due_revision=due_revision+1,mutation_id=? WHERE id=?',
            )
            .bind(at, at, action, effect.task_id),
        );
        // Keep historical evidence links on the tombstone so a later source purge can scrub it.
      } else {
        if (!original) throw new Http(409, 'UNDO_UNAVAILABLE');
        for (let n = 0; n < links.length; n++)
          ops.push(
            db
              .prepare(
                `INSERT INTO mutation_guards SELECT ?,EXISTS(SELECT 1 FROM source_items si JOIN sources s ON s.id=si.source_id WHERE si.id=? AND si.removed_at IS NULL AND s.purged_at IS NULL AND s.generation=si.generation)`,
              )
              .bind(action + '-evidence-' + n, links[n].source_item_id),
          );
        const current = await getTask(db, effect.task_id);
        ops.push(
          db
            .prepare(
              'UPDATE tasks SET title=?,description=?,context_id=?,kind=?,status=?,priority=?,due_json=?,due_at_utc=?,manual_owned=?,version=version+1,due_revision=due_revision+1,mutation_id=?,updated_at=? WHERE id=?',
            )
            .bind(
              original.title,
              original.description,
              original.context_id,
              original.kind,
              original.status,
              original.priority,
              JSON.stringify(original.due),
              original.due_at_utc,
              original.manual_owned,
              action,
              at,
              effect.task_id,
            ),
        );
        ops.push(
          db
            .prepare('DELETE FROM task_evidence WHERE task_id=?')
            .bind(effect.task_id),
        );
        for (const link of links)
          ops.push(
            db
              .prepare('INSERT INTO task_evidence VALUES(?,?,?)')
              .bind(
                effect.task_id,
                link.source_item_id,
                link.approval_event_id,
              ),
          );
        if (!['done', 'archived'].includes(original.status))
          ops.push(
            ...(await intents(
              db,
              effect.task_id,
              original.due,
              current.due_revision + 1,
              action,
            )),
          );
      }
    }
    ops.push(
      db
        .prepare(
          'INSERT INTO task_events(task_id,event_type,created_at) VALUES(?,?,?)',
        )
        .bind(effect.task_id, 'review_undone', at),
    );
  }
  ops.push(
    db
      .prepare('INSERT INTO review_actions VALUES(?,?,?,?)')
      .bind(action, effect.candidate_id, 'undo', at),
  );
  ops.push(
    db
      .prepare(
        'UPDATE review_effects SET undone_by=?,before_task_json=NULL,before_evidence_json=NULL WHERE action_id=? AND undone_by IS NULL AND undo_blocked=0',
      )
      .bind(action, actionId),
  );
  ops.push(
    db
      .prepare('INSERT INTO mutation_guards VALUES(?,changes())')
      .bind(action + '-effect'),
  );
  ops.push(
    db
      .prepare('INSERT INTO idempotency_records VALUES(?,?,?,?)')
      .bind(scope, key, digest, action),
  );
  ops.push(
    db
      .prepare('DELETE FROM mutation_guards WHERE id=? OR substr(id,1,?)=?')
      .bind(action, action.length + 1, action + '-'),
  );
  try {
    await db.batch(ops);
  } catch {
    throw new Http(409, 'UNDO_CONFLICT');
  }
  return { review_action: action, undone: true };
}
export function createApp(authorize: typeof owner = owner) {
  return {
    async fetch(req: Request, env: Env): Promise<Response> {
      try {
        const url = new URL(req.url);
        const path = url.pathname;
        const db = env.DB;
        if (path === '/owner-devices') {
          if (
            req.method !== 'GET' ||
            req.headers.has('Authorization') ||
            !(await authorize(req, env))
          )
            throw new Http(401, 'AUTH_REQUIRED');
          return deviceAdminPage();
        }
        if (!path.startsWith('/api/'))
          return env.ASSETS
            ? env.ASSETS.fetch(req)
            : new Response('Academic OS', { status: 200 });
        if (path === '/api/v1/sync' && req.method === 'POST')
          return await sync(req, env);
        if (path === '/api/v1/sync/status' && req.method === 'GET') {
          const { cred } = await collectorAuth(req, env, '', true);
          if (url.searchParams.get('source_id') !== cred.source_id)
            throw new Http(403, 'ACCESS_DENIED');
          const source = await env.DB.prepare(
            'SELECT id,generation,paused,purged_at FROM sources WHERE id=?',
          )
            .bind(cred.source_id)
            .first<any>();
          return result({
            ...source,
            revoked: !!cred.revoked,
            purge_required: !!source?.purged_at,
          });
        }
        if (path === '/api/v1/sync/device-actions' && req.method === 'POST') {
          const { raw, value: v } = await body(req);
          const { cred } = await collectorAuth(req, env, raw, true);
          const source = await env.DB.prepare(
            'SELECT * FROM sources WHERE id=?',
          )
            .bind(cred.source_id)
            .first<any>();
          if (
            !source ||
            v.source_id !== cred.source_id ||
            Object.keys(v).sort().join(',') !==
              'devices,observations,receipts,source_id'
          )
            throw new Http(403, 'ACCESS_DENIED');
          try {
            return result(await relayActions(env.DB, source, v));
          } catch {
            throw new Http(422, 'INVALID_ACTION_REPORT');
          }
        }
        if (path === '/api/v1/sync/purge-ack' && req.method === 'POST') {
          const { raw, value: v } = await body(req);
          const { cred } = await collectorAuth(req, env, raw, true);
          const source = await env.DB.prepare(
            'SELECT generation,purged_at FROM sources WHERE id=?',
          )
            .bind(cred.source_id)
            .first<any>();
          if (
            v.source_id !== cred.source_id ||
            !source?.purged_at ||
            v.generation !== source.generation
          )
            throw new Http(403, 'ACCESS_DENIED');
          await env.DB.prepare(
            'INSERT OR REPLACE INTO purge_acknowledgments VALUES(?,?,?,?)',
          )
            .bind(cred.source_id, v.generation, 'linux', now())
            .run();
          return result({ acknowledged: true });
        }
        const devicePath = path.startsWith('/api/device/v1/');
        let deviceId: string | null = null;
        if (devicePath) {
          if (req.headers.has('Origin')) throw new Http(403, 'INVALID_ORIGIN');
          if (path === '/api/device/v1/enroll' && req.method === 'POST') {
            await account(db, 'enroll');
            return result(
              await enrollDevice(req, env, (await body(req, 4096)).value),
            );
          }
          const client = await authenticateDevice(
            req,
            env,
            path === '/api/device/v1/enrollment',
          );
          deviceId = client.id;
          if (
            ['/api/device/v1/enrollment', '/api/device/v1/session'].includes(
              path,
            )
          )
            await account(db, req.method === 'GET' ? 'read' : 'write');
          if (path === '/api/device/v1/enrollment' && req.method === 'GET')
            return result({
              client_id: client.id,
              status: client.status,
              expires_at: client.expires_at,
              fingerprint: client.token_hash,
            });
          if (path === '/api/device/v1/session' && req.method === 'DELETE') {
            await db
              .prepare(
                "UPDATE owner_client_credentials SET status='revoked',revoked_at=? WHERE id=?",
              )
              .bind(now(), client.id)
              .run();
            return result({ revoked: true });
          }
          if (
            !deviceRouteAllowed(path.slice('/api/device/v1'.length), req.method)
          )
            throw new Http(403, 'ACCESS_DENIED');
        } else {
          if (req.headers.has('Authorization') || !(await authorize(req, env)))
            throw new Http(401, 'AUTH_REQUIRED');
          if (
            !['GET', 'HEAD'].includes(req.method) &&
            req.headers.get('Origin') !== url.origin
          )
            throw new Http(403, 'INVALID_ORIGIN');
        }
        const p = path.slice(
          devicePath ? '/api/device/v1'.length : '/api/v1'.length,
        );
        const method = req.method;
        await account(
          db,
          p === '/export'
            ? 'export'
            : ['GET', 'HEAD'].includes(method)
              ? 'read'
              : 'write',
        );
        if (!devicePath && p === '/push/config' && method === 'GET') {
          try {
            const c = await pushConfig(env);
            return result({
              state: c ? 'configured_unverified' : 'not_configured',
              public_key: c?.publicKey ?? null,
            });
          } catch {
            return result({ state: 'configuration_invalid', public_key: null });
          }
        }
        if (!devicePath && p === '/push/subscriptions' && method === 'GET')
          return result(
            (
              await db
                .prepare(
                  'SELECT id,created_at,revoked_at FROM push_subscriptions WHERE revoked_at IS NULL ORDER BY created_at DESC LIMIT 4',
                )
                .all()
            ).results,
          );
        if (!devicePath && p === '/push/subscriptions' && method === 'POST') {
          const v = (await body(req, 4096)).value;
          if (Object.keys(v ?? {}).join(',') !== 'endpoint')
            throw new Http(422, 'INVALID_PUSH_SUBSCRIPTION');
          try {
            return result(await subscribe(env, v.endpoint));
          } catch (e) {
            const code = e instanceof Error ? e.message : '';
            throw new Http(
              code === 'INVALID_PUSH_SUBSCRIPTION' ? 422 : 409,
              [
                'INVALID_PUSH_SUBSCRIPTION',
                'PUSH_NOT_CONFIGURED',
                'PUSH_CONFIGURATION_INVALID',
                'PUSH_SUBSCRIPTION_UNAVAILABLE',
              ].includes(code)
                ? code
                : 'PUSH_CONFIGURATION_INVALID',
            );
          }
        }
        const pushDelete = /^\/push\/subscriptions\/([a-f0-9]{64})$/.exec(p);
        if (!devicePath && pushDelete && method === 'DELETE') {
          await db
            .prepare(
              'UPDATE push_subscriptions SET revoked_at=coalesce(revoked_at,?) WHERE id=?',
            )
            .bind(now(), pushDelete[1])
            .run();
          return result({ revoked: true });
        }
        if (!devicePath && p.startsWith('/owner-devices')) {
          const value = method === 'POST' ? (await body(req)).value : undefined;
          const out = await administerClients(
            db,
            env.OWNER_SUB,
            p,
            method,
            value,
          );
          if (out === undefined) throw new Http(404, 'NOT_FOUND');
          return result(out);
        }
        if (p === '/me' && method === 'GET')
          return result({
            subject: env.OWNER_SUB,
            ...(deviceId ? { client_id: deviceId } : {}),
          });
        if (p === '/health' && method === 'GET') {
          let push = 'not_configured';
          try {
            if (await pushConfig(env)) push = 'configured_unverified';
          } catch {
            push = 'configuration_invalid';
          }
          return result({
            cloud: 'online',
            push,
            collector: 'last_reported_only',
            operations: await operationalHealth(db),
          });
        }
        if (p === '/contexts' && method === 'GET')
          return result(
            (
              await db
                .prepare('SELECT * FROM contexts WHERE archived_at IS NULL')
                .all()
            ).results,
          );
        if (p === '/contexts' && method === 'POST') {
          const { raw, value: v } = await body(req);
          const key = req.headers.get('Idempotency-Key'),
            digest = await sha256(raw),
            scope = 'context-create';
          if (key) {
            text(key, 128);
            const prior = await db
              .prepare(
                'SELECT * FROM idempotency_records WHERE scope=? AND key=?',
              )
              .bind(scope, key)
              .first<any>();
            if (prior) {
              if (prior.digest !== digest)
                throw new Http(409, 'IDEMPOTENCY_CONFLICT');
              return result(
                await db
                  .prepare('SELECT * FROM contexts WHERE id=?')
                  .bind(prior.result_id)
                  .first(),
              );
            }
          }
          if (!['academic', 'organization', 'personal'].includes(v.type))
            throw new Http(422, 'INVALID_PAYLOAD');
          const id = uuid(),
            name = text(v.display_name),
            ops = [
              db
                .prepare(
                  'INSERT INTO contexts(id,type,display_name) VALUES(?,?,?)',
                )
                .bind(id, v.type, name),
            ];
          if (key)
            ops.push(
              db
                .prepare('INSERT INTO idempotency_records VALUES(?,?,?,?)')
                .bind(scope, key, digest, id),
            );
          await db.batch(ops);
          return result(
            { id, type: v.type, display_name: name, version: 1 },
            201,
          );
        }
        if (
          (p === '/tasks' && method === 'GET') ||
          (p === '/search' && method === 'GET')
        ) {
          try {
            const page = await listTasks(db, url);
            return result(page.items, 200, { next_cursor: page.cursor });
          } catch (e) {
            if (
              e instanceof Error &&
              ['INVALID_CURSOR', 'INVALID_FILTER'].includes(e.message)
            )
              throw new Http(422, e.message);
            throw e;
          }
        }
        if (p === '/tasks' && method === 'POST') {
          const { raw, value: v } = await body(req);
          const fields = taskFields(v);
          const key = text(req.headers.get('Idempotency-Key'), 128);
          const digest = await sha256(raw);
          const old = await db
            .prepare(
              "SELECT * FROM idempotency_records WHERE scope='task-create' AND key=?",
            )
            .bind(key)
            .first<any>();
          if (old) {
            if (old.digest !== digest)
              throw new Http(409, 'IDEMPOTENCY_CONFLICT');
            return result(await getTask(db, old.result_id));
          }
          const id = uuid();
          const at = now();
          await db.batch([
            db
              .prepare(
                "INSERT INTO idempotency_records VALUES('task-create',?,?,?)",
              )
              .bind(key, digest, id),
            db
              .prepare(
                'INSERT INTO tasks(id,context_id,title,kind,description,status,priority,due_json,due_at_utc,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
              )
              .bind(
                id,
                fields.context_id,
                fields.title,
                fields.kind,
                fields.description,
                fields.status,
                fields.priority,
                JSON.stringify(fields.due),
                fields.due_at_utc,
                at,
                at,
              ),
            ...(await intents(db, id, fields.due, 1)),
          ]);
          return result(await getTask(db, id), 201);
        }
        const tm = p.match(/^\/tasks\/([^/]+)$/);
        if (tm) {
          if (method === 'GET' && url.searchParams.get('view') === 'read')
            return result(await readTaskView(db, tm[1], url));
          if (method === 'DELETE' && req.headers.has('Idempotency-Key')) {
            const key = text(req.headers.get('Idempotency-Key'), 128),
              digest = await sha256('{}\n' + version(req));
            const receipt = await db
              .prepare(
                'SELECT * FROM idempotency_records WHERE scope=? AND key=?',
              )
              .bind('task-DELETE:' + tm[1], key)
              .first<any>();
            if (receipt) {
              if (receipt.digest !== digest)
                throw new Http(409, 'IDEMPOTENCY_CONFLICT');
              return result({ deleted: true });
            }
          }
          const current = await getTask(db, tm[1]);
          if (method === 'GET') return result(current);
          if (method === 'PATCH' || method === 'DELETE') {
            const expected = version(req);
            const input =
              method === 'PATCH' ? await body(req) : { raw: '{}', value: {} };
            const v = input.value;
            const key = req.headers.get('Idempotency-Key');
            const scope = 'task-' + method + ':' + tm[1];
            const digest = await sha256(input.raw + '\n' + expected);
            if (key) {
              text(key, 128);
              const receipt = await db
                .prepare(
                  'SELECT * FROM idempotency_records WHERE scope=? AND key=?',
                )
                .bind(scope, key)
                .first<any>();
              if (receipt) {
                if (receipt.digest !== digest)
                  throw new Http(409, 'IDEMPOTENCY_CONFLICT');
                return result(await getTask(db, tm[1]));
              }
            }
            const fields = taskFields({ ...current, ...v });
            const reschedule =
              JSON.stringify(fields.due) !== JSON.stringify(current.due) ||
              ['done', 'archived'].includes(fields.status) !==
                ['done', 'archived'].includes(current.status) ||
              method === 'DELETE';
            const revision = current.due_revision + (reschedule ? 1 : 0);
            const at = now();
            const mutation = uuid();
            const ops = [
              db
                .prepare(
                  'UPDATE tasks SET manual_owned=1,title=?,description=?,context_id=?,kind=?,status=?,priority=?,due_json=?,due_at_utc=?,version=version+1,due_revision=?,mutation_id=?,updated_at=?,deleted_at=? WHERE id=? AND version=? AND deleted_at IS NULL',
                )
                .bind(
                  fields.title,
                  fields.description,
                  fields.context_id,
                  fields.kind,
                  fields.status,
                  fields.priority,
                  JSON.stringify(fields.due),
                  fields.due_at_utc,
                  revision,
                  mutation,
                  at,
                  method === 'DELETE' ? at : null,
                  tm[1],
                  expected,
                ),
            ];
            if (
              method === 'PATCH' &&
              reschedule &&
              !['done', 'archived'].includes(fields.status)
            )
              ops.push(
                ...(await intents(db, tm[1], fields.due, revision, mutation)),
              );
            if (key)
              ops.push(
                db
                  .prepare(
                    'INSERT INTO mutation_guards SELECT ?,EXISTS(SELECT 1 FROM tasks WHERE id=? AND mutation_id=?)',
                  )
                  .bind(mutation, tm[1], mutation),
                db
                  .prepare('INSERT INTO idempotency_records VALUES(?,?,?,?)')
                  .bind(scope, key, digest, tm[1]),
                db
                  .prepare('DELETE FROM mutation_guards WHERE id=?')
                  .bind(mutation),
              );
            const r = await db.batch(ops);
            if (!r[0].meta.changes) throw new Http(409, 'VERSION_CONFLICT');
            return result(
              method === 'DELETE'
                ? { deleted: true }
                : await getTask(db, tm[1]),
            );
          }
        }
        if (p === '/sources' && method === 'GET')
          return result(
            (await db.prepare('SELECT * FROM sources').all()).results,
          );
        if (p === '/sources' && method === 'POST') {
          const { raw, value: v } = await body(req);
          const key = req.headers.get('Idempotency-Key'),
            digest = await sha256(raw),
            scope = 'source-create';
          if (key) {
            text(key, 128);
            const prior = await db
              .prepare(
                'SELECT * FROM idempotency_records WHERE scope=? AND key=?',
              )
              .bind(scope, key)
              .first<any>();
            if (prior) {
              if (prior.digest !== digest)
                throw new Http(409, 'IDEMPOTENCY_CONFLICT');
              const old = await db
                .prepare(
                  'SELECT id,generation,purged_at FROM sources WHERE id=?',
                )
                .bind(prior.result_id)
                .first<any>();
              return result(old);
            }
          }
          if (
            ![
              'whatsapp_export',
              'whatsapp_notification',
              'moodle_ical',
            ].includes(v.kind)
          )
            throw new Http(422, 'INVALID_PAYLOAD');
          const id = uuid(),
            ops = [
              db
                .prepare(
                  'INSERT INTO sources(id,display_name,kind) VALUES(?,?,?)',
                )
                .bind(id, text(v.display_name), v.kind),
            ];
          if (key)
            ops.push(
              db
                .prepare('INSERT INTO idempotency_records VALUES(?,?,?,?)')
                .bind(scope, key, digest, id),
            );
          await db.batch(ops);
          return result({ id, generation: 1 }, 201);
        }
        if (p === '/collector-credentials' && method === 'POST') {
          const { value: v } = await body(req);
          const s = await db
            .prepare('SELECT id FROM sources WHERE id=? AND purged_at IS NULL')
            .bind(v.source_id)
            .first();
          if (!s) throw new Http(404, 'NOT_FOUND');
          const id = uuid(),
            secret = uuid() + uuid();
          await db
            .prepare(
              'INSERT INTO collector_credentials(id,source_id,secret) VALUES(?,?,?)',
            )
            .bind(id, v.source_id, secret)
            .run();
          return result({ id, secret }, 201);
        }
        if (p === '/candidates' && method === 'GET') {
          const limit = Number(url.searchParams.get('limit') ?? 100);
          const cursor = url.searchParams.get('cursor') ?? '';
          if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 100 ||
            cursor.length > 128
          )
            throw new Http(422, 'INVALID_FILTER');
          const rows = await db
            .prepare(
              `SELECT c.*,s.display_name source_label,
            (SELECT json_group_array(si.id) FROM candidate_evidence ce JOIN source_items si ON si.id=ce.source_item_id JOIN sources es ON es.id=si.source_id WHERE ce.candidate_id=c.id AND si.removed_at IS NULL AND es.purged_at IS NULL AND es.generation=si.generation) evidence_json
            FROM candidates c JOIN sources s ON s.id=c.source_id WHERE c.review_status IN ('pending','needs_clarification') AND s.purged_at IS NULL AND s.generation=c.generation AND c.id>? ORDER BY c.id LIMIT ?`,
            )
            .bind(cursor, limit + 1)
            .all<any>();
          const items = rows.results.slice(0, limit);
          return result(
            items.map((c) => ({
              ...c,
              fields: JSON.parse(c.fields_json),
              issues: JSON.parse(c.issues_json),
              evidence_ids: JSON.parse(c.evidence_json),
              fields_json: undefined,
              issues_json: undefined,
              evidence_json: undefined,
            })),
            200,
            {
              next_cursor:
                rows.results.length > limit ? items[items.length - 1].id : null,
            },
          );
        }
        const undo = p.match(/^\/review-actions\/([^/]+)\/undo$/);
        if (undo && method === 'POST')
          return result(await undoReview(db, undo[1], req));
        const review = p.match(/^\/candidates\/([^/]+)\/review$/);
        if (review && method === 'POST') {
          const { raw, value: v } = await body(req);
          const key = text(req.headers.get('Idempotency-Key'), 128),
            digest = await sha256(raw),
            scope = 'review:' + review[1];
          const prev = await db
            .prepare(
              'SELECT * FROM idempotency_records WHERE scope=? AND key=?',
            )
            .bind(scope, key)
            .first<any>();
          if (prev) {
            if (prev.digest !== digest)
              throw new Http(409, 'IDEMPOTENCY_CONFLICT');
            const effect = await db
              .prepare('SELECT * FROM review_effects WHERE action_id=?')
              .bind(prev.result_id)
              .first<any>();
            return result(
              effect
                ? {
                    task_id: effect.task_id,
                    review_action: effect.action_id,
                    undone: !!effect.undone_by,
                  }
                : { task_id: prev.result_id },
            );
          }
          const c = await db
            .prepare('SELECT * FROM candidates WHERE id=?')
            .bind(review[1])
            .first<any>();
          if (!c) throw new Http(404, 'NOT_FOUND');
          if (
            c.version !== v.expected_candidate_version ||
            !['pending', 'needs_clarification'].includes(c.review_status)
          )
            throw new Http(409, 'VERSION_CONFLICT');
          if (
            ![
              'accept',
              'accept_with_edits',
              'reject',
              'needs_clarification',
            ].includes(v.action)
          )
            throw new Http(422, 'INVALID_PAYLOAD');
          const accepting = v.action.startsWith('accept');
          const action = uuid(),
            id = accepting ? (v.target_task_id ?? uuid()) : '',
            at = now();
          const evidence = await db
            .prepare(
              'SELECT s.id FROM candidate_evidence e JOIN source_items s ON s.id=e.source_item_id JOIN sources src ON src.id=s.source_id WHERE e.candidate_id=? AND s.removed_at IS NULL AND src.purged_at IS NULL AND src.generation=s.generation',
            )
            .bind(c.id)
            .all();
          if (accepting && !evidence.results.length)
            throw new Http(410, 'EVIDENCE_UNAVAILABLE');
          const proposed = JSON.parse(c.fields_json);
          const target = v.target_task_id
            ? await getTask(db, v.target_task_id)
            : null;
          if (target && target.version !== v.expected_task_version)
            throw new Http(409, 'VERSION_CONFLICT');
          if (accepting && proposed.kind === 'deadline_change' && !target)
            throw new Http(422, 'TARGET_TASK_REQUIRED');
          const fields = accepting
            ? taskFields(
                target
                  ? { ...target, due: proposed.due, ...(v.task_patch ?? {}) }
                  : { ...proposed, ...(v.task_patch ?? {}) },
              )
            : null;
          const previousEvidence = target
            ? (
                await db
                  .prepare('SELECT * FROM task_evidence WHERE task_id=?')
                  .bind(target.id)
                  .all()
              ).results
            : [];
          const ops = [
            db
              .prepare(
                "UPDATE candidates SET review_status=?,version=version+1,accepted_action=?,result_task_id=?,updated_at=? WHERE id=? AND version=? AND review_status IN ('pending','needs_clarification') AND EXISTS(SELECT 1 FROM sources WHERE sources.id=candidates.source_id AND sources.generation=candidates.generation AND sources.purged_at IS NULL)",
              )
              .bind(
                accepting
                  ? 'accepted'
                  : v.action === 'reject'
                    ? 'rejected'
                    : 'needs_clarification',
                action,
                id,
                at,
                c.id,
                c.version,
              ),
          ];
          ops.push(
            db
              .prepare('INSERT INTO mutation_guards VALUES(?,changes())')
              .bind(action),
          );
          if (fields && target) {
            ops.push(
              db
                .prepare(
                  'UPDATE tasks SET title=?,description=?,context_id=?,kind=?,status=?,priority=?,due_json=?,due_at_utc=?,version=version+1,due_revision=due_revision+1,mutation_id=?,updated_at=? WHERE id=? AND version=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM candidates WHERE id=? AND accepted_action=?)',
                )
                .bind(
                  fields.title,
                  fields.description,
                  fields.context_id,
                  fields.kind,
                  fields.status,
                  fields.priority,
                  JSON.stringify(fields.due),
                  fields.due_at_utc,
                  action,
                  at,
                  id,
                  v.expected_task_version,
                  c.id,
                  action,
                ),
              db
                .prepare('INSERT INTO mutation_guards VALUES(?,changes())')
                .bind(action + '-task'),
            );
          } else if (fields)
            ops.push(
              db
                .prepare(
                  'INSERT INTO tasks(id,context_id,title,kind,description,status,priority,due_json,due_at_utc,created_at,updated_at,manual_owned,mutation_id) SELECT ?,?,?,?,?,?,?,?,?,?,?,0,? WHERE EXISTS(SELECT 1 FROM candidates WHERE id=? AND accepted_action=?)',
                )
                .bind(
                  id,
                  fields.context_id,
                  fields.title,
                  fields.kind,
                  fields.description,
                  fields.status,
                  fields.priority,
                  JSON.stringify(fields.due),
                  fields.due_at_utc,
                  at,
                  at,
                  action,
                  c.id,
                  action,
                ),
            );
          if (fields)
            ops.push(
              db
                .prepare(
                  'INSERT OR IGNORE INTO task_evidence SELECT ?,source_item_id,? FROM candidate_evidence WHERE candidate_id=? AND EXISTS(SELECT 1 FROM candidates WHERE id=? AND accepted_action=?)',
                )
                .bind(id, action, c.id, c.id, action),
            );
          ops.push(
            db
              .prepare(
                'INSERT INTO review_actions SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM candidates WHERE id=? AND accepted_action=?)',
              )
              .bind(action, c.id, v.action, at, c.id, action),
            db
              .prepare(
                'INSERT INTO idempotency_records SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM candidates WHERE id=? AND accepted_action=?)',
              )
              .bind(scope, key, digest, action, c.id, action),
          );
          if (fields && !['done', 'archived'].includes(fields.status))
            ops.push(
              ...(await intents(
                db,
                id,
                fields.due,
                target ? target.due_revision + 1 : 1,
                action,
              )),
            );
          ops.push(
            db
              .prepare(
                'INSERT INTO review_effects(action_id,candidate_id,source_id,generation,candidate_version,prior_status,task_id,task_version,created_task,before_task_json,before_evidence_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
              )
              .bind(
                action,
                c.id,
                c.source_id,
                c.generation,
                c.version + 1,
                c.review_status,
                target?.id ?? (fields ? id : null),
                target ? target.version + (fields ? 1 : 0) : fields ? 1 : null,
                fields && !target ? 1 : 0,
                target ? JSON.stringify(target) : null,
                JSON.stringify(previousEvidence),
              ),
          );
          if (!fields && target)
            ops.push(
              db
                .prepare(
                  'INSERT INTO task_events(task_id,event_type,created_at) VALUES(?,?,?)',
                )
                .bind(
                  target.id,
                  v.action === 'reject'
                    ? 'proposal_rejected'
                    : 'proposal_clarification_requested',
                  at,
                ),
            );
          ops.push(
            db
              .prepare('DELETE FROM mutation_guards WHERE id IN (?,?)')
              .bind(action, action + '-task'),
          );
          const res = await db.batch(ops);
          if (!res[0].meta.changes) throw new Http(409, 'VERSION_CONFLICT');
          return result({ task_id: id, review_action: action });
        }
        if (p === '/reminders' && method === 'GET')
          return result(
            (
              await db
                .prepare(
                  'SELECT * FROM notification_inbox ORDER BY created_at DESC LIMIT 100',
                )
                .all()
            ).results,
          );
        if (p === '/history' && method === 'GET') {
          try {
            const v = await listHistory(db, url);
            return result(v.items, 200, { next_cursor: v.cursor });
          } catch (e) {
            if (
              e instanceof Error &&
              ['INVALID_CURSOR', 'INVALID_FILTER'].includes(e.message)
            )
              throw new Http(422, e.message);
            throw e;
          }
        }
        if (p === '/briefing' && method === 'GET') {
          const saved = await db
            .prepare('SELECT value_json FROM settings WHERE id=1')
            .first<any>();
          const timezone = JSON.parse(saved.value_json).timezone;
          const at = now();
          const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date(at));
          const future = new Date(Date.parse(at) + 3 * 86400000).toISOString();
          const futureDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date(future));
          const counts = await db
            .prepare(
              "SELECT count(*) active,coalesce(sum(CASE WHEN due_at_utc<? OR (json_extract(due_json,'$.precision')='date_only' AND json_extract(due_json,'$.local_date')<?) THEN 1 ELSE 0 END),0) overdue,coalesce(sum(CASE WHEN (due_at_utc>=? AND due_at_utc<=?) OR (json_extract(due_json,'$.precision')='date_only' AND json_extract(due_json,'$.local_date') BETWEEN ? AND ?) THEN 1 ELSE 0 END),0) upcoming,coalesce(sum(CASE WHEN json_extract(due_json,'$.precision') IN ('unknown','approximate') THEN 1 ELSE 0 END),0) no_date FROM tasks WHERE deleted_at IS NULL AND status NOT IN ('done','archived')",
            )
            .bind(at, today, at, future, today, futureDate)
            .first();
          const pending = await db
            .prepare(
              "SELECT count(*) count FROM candidates WHERE review_status IN ('pending','needs_clarification')",
            )
            .first<any>();
          return result({
            counts,
            pending: pending.count,
            local_date: today,
            timezone,
            generated_at: at,
          });
        }
        if (p === '/settings' && method === 'GET') {
          const row = await db
            .prepare('SELECT * FROM settings WHERE id=1')
            .first<any>();
          return result({
            ...JSON.parse(row.value_json),
            version: row.version,
          });
        }
        if (p === '/settings/reminders' && method === 'PATCH') {
          const { raw, value: v } = await body(req);
          const receiptKey = req.headers.get('Idempotency-Key'),
            receiptScope = 'settings-reminders',
            receiptDigest = await sha256(raw + '\n' + version(req));
          if (receiptKey) {
            text(receiptKey, 128);
            const old = await db
              .prepare(
                'SELECT * FROM idempotency_records WHERE scope=? AND key=?',
              )
              .bind(receiptScope, receiptKey)
              .first<any>();
            if (old) {
              if (old.digest !== receiptDigest)
                throw new Http(409, 'IDEMPOTENCY_CONFLICT');
              const queued = await db
                .prepare('SELECT count(*) count FROM reminder_rebuilds')
                .first<any>();
              return result({ updated: true, pending_rebuilds: queued.count });
            }
          }
          if (
            typeof v.enabled !== 'boolean' ||
            !Array.isArray(v.offset_hours) ||
            v.offset_hours.length > 5 ||
            new Set(v.offset_hours).size !== v.offset_hours.length ||
            v.offset_hours.some(
              (h: unknown) =>
                typeof h !== 'number' ||
                !Number.isFinite(h) ||
                h <= 0 ||
                h > 168,
            ) ||
            !Number.isInteger(v.date_only_hour) ||
            v.date_only_hour < 0 ||
            v.date_only_hour > 23
          )
            throw new Http(422, 'INVALID_REMINDER_POLICY');
          const expected = version(req);
          const current = await db
            .prepare('SELECT value_json FROM settings WHERE id=1')
            .first<any>();
          const saved = JSON.parse(current.value_json);
          const quiet = v.quiet_hours;
          if (
            quiet !== undefined &&
            (typeof quiet?.enabled !== 'boolean' ||
              !Number.isInteger(quiet.start_hour) ||
              quiet.start_hour < 0 ||
              quiet.start_hour > 23 ||
              !Number.isInteger(quiet.end_hour) ||
              quiet.end_hour < 0 ||
              quiet.end_hour > 23 ||
              (quiet.enabled && quiet.start_hour === quiet.end_hour))
          )
            throw new Http(422, 'INVALID_QUIET_HOURS');
          saved.reminder_policy = {
            enabled: v.enabled,
            offset_hours: v.offset_hours,
            date_only_hour: v.date_only_hour,
            quiet_hours:
              quiet === undefined
                ? saved.reminder_policy?.quiet_hours
                : {
                    enabled: quiet.enabled,
                    start_hour: quiet.start_hour,
                    end_hour: quiet.end_hour,
                    timezone: saved.timezone,
                  },
          };
          const guard = uuid(),
            at = now();
          await db.batch([
            db
              .prepare(
                'UPDATE settings SET value_json=?,version=version+1 WHERE id=1 AND version=?',
              )
              .bind(JSON.stringify(saved), expected),
            db
              .prepare('INSERT INTO mutation_guards VALUES(?,changes())')
              .bind(guard),
            db
              .prepare(
                "UPDATE tasks SET due_revision=due_revision+1,version=version+1,updated_at=? WHERE deleted_at IS NULL AND status NOT IN ('done','archived')",
              )
              .bind(at),
            db.prepare(
              "INSERT OR REPLACE INTO reminder_rebuilds SELECT id,due_revision FROM tasks WHERE deleted_at IS NULL AND status NOT IN ('done','archived')",
            ),
            ...(receiptKey
              ? [
                  db
                    .prepare('INSERT INTO idempotency_records VALUES(?,?,?,?)')
                    .bind(receiptScope, receiptKey, receiptDigest, '1'),
                ]
              : []),
            db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(guard),
          ]);
          const pending = await db
            .prepare('SELECT count(*) count FROM reminder_rebuilds')
            .first<any>();
          return result({ updated: true, pending_rebuilds: pending.count });
        }
        const settingsMatch = p === '/settings';
        if (settingsMatch && method === 'PATCH') {
          const { raw, value: v } = await body(req);
          const expected = version(req),
            key = req.headers.get('Idempotency-Key'),
            scope = 'settings',
            digest = await sha256(raw + '\n' + expected),
            guard = uuid();
          if (key) {
            text(key, 128);
            const prior = await db
              .prepare(
                'SELECT * FROM idempotency_records WHERE scope=? AND key=?',
              )
              .bind(scope, key)
              .first<any>();
            if (prior) {
              if (prior.digest !== digest)
                throw new Http(409, 'IDEMPOTENCY_CONFLICT');
              return result({ updated: true });
            }
          }
          if (
            !['id', 'en'].includes(v.language) ||
            !['system', 'light', 'dark'].includes(v.theme)
          )
            throw new Http(422, 'INVALID_PAYLOAD');
          try {
            new Intl.DateTimeFormat('en', { timeZone: v.timezone });
          } catch {
            throw new Http(422, 'INVALID_TIMEZONE');
          }
          const oldSettings = await db
            .prepare('SELECT value_json FROM settings WHERE id=1')
            .first<any>();
          const saved = JSON.parse(oldSettings.value_json);
          if (saved.reminder_policy?.quiet_hours)
            saved.reminder_policy.quiet_hours.timezone = v.timezone;
          const update = db
            .prepare(
              'UPDATE settings SET value_json=?,version=version+1 WHERE id=1 AND version=?',
            )
            .bind(
              JSON.stringify({
                ...saved,
                language: v.language,
                theme: v.theme,
                timezone: v.timezone,
              }),
              expected,
            );
          const ops = [update];
          if (key)
            ops.push(
              db
                .prepare('INSERT INTO mutation_guards VALUES(?,changes())')
                .bind(guard),
              db
                .prepare('INSERT INTO idempotency_records VALUES(?,?,?,?)')
                .bind(scope, key, digest, '1'),
              db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(guard),
            );
          const r = await db.batch(ops);
          if (!r[0].meta.changes) throw new Http(409, 'VERSION_CONFLICT');
          return result({ updated: true });
        }
        const snooze = p.match(/^\/reminders\/([^/]+)\/snooze$/);
        if (snooze && method === 'POST') {
          const { raw, value: v } = await body(req);
          const key = text(req.headers.get('Idempotency-Key'), 128),
            digest = await sha256(raw),
            scope = 'snooze:' + snooze[1];
          const previous = await db
            .prepare(
              'SELECT * FROM idempotency_records WHERE scope=? AND key=?',
            )
            .bind(scope, key)
            .first<any>();
          if (previous) {
            if (previous.digest !== digest)
              throw new Http(409, 'IDEMPOTENCY_CONFLICT');
            return result({ intent_id: previous.result_id });
          }
          // A committed receipt remains authoritative after its requested time passes.
          const at = Date.parse(v.until);
          if (
            !Number.isFinite(at) ||
            at <= Date.now() ||
            at > Date.now() + 30 * 86400000
          )
            throw new Http(422, 'INVALID_SNOOZE');
          const entry = await db
            .prepare(
              "SELECT t.* FROM notification_inbox n JOIN tasks t ON t.id=n.task_id WHERE n.id=? AND t.deleted_at IS NULL AND t.status NOT IN ('done','archived')",
            )
            .bind(snooze[1])
            .first<any>();
          if (!entry) throw new Http(409, 'TASK_INACTIVE');
          const ident = uuid(),
            guard = uuid();
          await db.batch([
            db
              .prepare(
                "INSERT INTO mutation_guards SELECT ?,EXISTS(SELECT 1 FROM tasks WHERE id=? AND version=? AND deleted_at IS NULL AND status NOT IN ('done','archived'))",
              )
              .bind(guard, entry.id, entry.version),
            db
              .prepare('INSERT INTO idempotency_records VALUES(?,?,?,?)')
              .bind(scope, key, digest, ident),
            db
              .prepare(
                'INSERT INTO reminder_intents(id,task_id,due_revision,scheduled_for_utc) VALUES(?,?,?,?)',
              )
              .bind(
                ident,
                entry.id,
                entry.due_revision,
                new Date(at).toISOString(),
              ),
            db
              .prepare('UPDATE notification_inbox SET read_at=? WHERE id=?')
              .bind(now(), snooze[1]),
            db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(guard),
          ]);
          return result({ intent_id: ident });
        }
        const rm = p.match(/^\/reminders\/([^/]+)\/read$/);
        if (rm && method === 'PATCH') {
          await db
            .prepare('UPDATE notification_inbox SET read_at=? WHERE id=?')
            .bind(now(), rm[1])
            .run();
          return result({ read: true });
        }
        const retire = p.match(/^\/device-actions\/([^/]+)\/retire$/);
        if (retire && method === 'POST') {
          await db
            .prepare(
              'UPDATE device_actions SET retired_at=coalesce(retired_at,?) WHERE id=? AND applied_at IS NULL',
            )
            .bind(now(), retire[1])
            .run();
          return result({ retired: true, success_claimed: false });
        }
        const purgeState = p.match(/^\/sources\/([^/]+)\/purge-status$/);
        if (purgeState && method === 'GET') {
          const actionOffset = Number(
            url.searchParams.get('actions_offset') ?? 0,
          );
          if (
            !Number.isInteger(actionOffset) ||
            actionOffset < 0 ||
            actionOffset > 1000000
          )
            throw new Http(422, 'INVALID_CURSOR');
          const source = await db
            .prepare('SELECT id,generation,purged_at FROM sources WHERE id=?')
            .bind(purgeState[1])
            .first<any>();
          if (!source) throw new Http(404, 'NOT_FOUND');
          const ack = await db
            .prepare(
              'SELECT actor,acknowledged_at FROM purge_acknowledgments WHERE source_id=? AND generation=?',
            )
            .bind(source.id, source.generation)
            .all();
          return result({
            cloud_purged: !!source.purged_at,
            acknowledgments: ack.results,
            local_wipe_pending:
              !!source.purged_at &&
              !ack.results.some((a: any) => a.actor === 'linux'),
            phone_wipe_status: 'inspect_actions_inventory_may_be_incomplete',
            actions: (
              await db
                .prepare(
                  'SELECT * FROM device_actions WHERE source_id=? ORDER BY created_at,id LIMIT 100 OFFSET ?',
                )
                .bind(source.id, actionOffset)
                .all()
            ).results.map((r) => actionView(r)),
            inventory: (
              await db
                .prepare('SELECT id FROM capture_devices WHERE source_id=?')
                .bind(source.id)
                .all()
            ).results,
            inventory_complete: false,
            actions_total: (
              await db
                .prepare(
                  'SELECT count(*) n FROM device_actions WHERE source_id=?',
                )
                .bind(source.id)
                .first<any>()
            ).n,
          });
        }
        const purge = p.match(/^\/sources\/([^/]+)\/(purge-preview|purge)$/);
        if (purge && method === 'POST') {
          const src = await db
            .prepare('SELECT * FROM sources WHERE id=?')
            .bind(purge[1])
            .first<any>();
          if (!src) throw new Http(404, 'NOT_FOUND');
          const affected = await db
            .prepare(
              'SELECT DISTINCT t.id,t.title FROM tasks t JOIN task_evidence te ON te.task_id=t.id JOIN source_items si ON si.id=te.source_item_id WHERE si.source_id=? AND t.deleted_at IS NULL',
            )
            .bind(src.id)
            .all();
          if (purge[2] === 'purge-preview')
            return result({
              generation: src.generation,
              affected_tasks: affected.results,
              local_wipe_required: true,
            });
          const { raw, value: v } = await body(req);
          const key = req.headers.get('Idempotency-Key'),
            scope = 'purge:' + src.id,
            digest = await sha256(raw);
          if (key) {
            text(key, 128);
            const receipt = await db
              .prepare(
                'SELECT * FROM idempotency_records WHERE scope=? AND key=?',
              )
              .bind(scope, key)
              .first<any>();
            if (receipt) {
              if (receipt.digest !== digest)
                throw new Http(409, 'IDEMPOTENCY_CONFLICT');
              return result({ cloud_purged: true, local_wipe_pending: true });
            }
          }
          if (v.expected_generation !== src.generation || src.purged_at)
            throw new Http(409, 'VERSION_CONFLICT');
          if (!['retain_as_manual', 'delete'].includes(v.task_policy))
            throw new Http(422, 'TASK_POLICY_REQUIRED');
          const at = now();
          const ops = [
            db
              .prepare('INSERT INTO source_tombstones VALUES(?,?,?)')
              .bind(src.id, src.generation, at),
            db
              .prepare(
                "UPDATE sources SET display_name='Purged source',coverage_json=NULL,last_sync_at=NULL,purged_at=?,generation=generation+1,paused=1 WHERE id=?",
              )
              .bind(at, src.id),
            db
              .prepare(
                'UPDATE collector_credentials SET revoked=1 WHERE source_id=?',
              )
              .bind(src.id),
            db
              .prepare(
                "UPDATE candidates SET fields_json='{}',issues_json='[]',review_status='withdrawn',version=version+1 WHERE source_id=?",
              )
              .bind(src.id),
          ];
          // A compensated review may no longer have a live task_evidence link.
          // Scrub its structured history payload as well; retain event identity/type/time.
          ops.push(
            db
              .prepare(
                'UPDATE task_events SET before_json=NULL,after_json=NULL WHERE task_id IN (SELECT task_id FROM review_effects WHERE source_id=?)',
              )
              .bind(src.id),
          );
          ops.push(
            db
              .prepare(
                `UPDATE review_effects SET undo_blocked=1,before_task_json=NULL,before_evidence_json=NULL WHERE source_id=? OR task_id IN (SELECT te.task_id FROM task_evidence te JOIN source_items si ON si.id=te.source_item_id WHERE si.source_id=?)`,
              )
              .bind(src.id, src.id),
          );
          if (v.task_policy === 'delete')
            ops.push(
              db
                .prepare(
                  "UPDATE tasks SET title='Deleted responsibility',description=NULL,due_json='{}',due_at_utc=NULL,deleted_at=?,updated_at=?,version=version+1 WHERE manual_owned=0 AND id IN (SELECT te.task_id FROM task_evidence te JOIN source_items si ON si.id=te.source_item_id WHERE si.source_id=?) AND NOT EXISTS(SELECT 1 FROM task_evidence te2 JOIN source_items si2 ON si2.id=te2.source_item_id WHERE te2.task_id=tasks.id AND si2.source_id<>? AND si2.removed_at IS NULL)",
                )
                .bind(at, at, src.id, src.id),
            );
          ops.push(
            db
              .prepare(
                'UPDATE tasks SET manual_owned=1 WHERE deleted_at IS NULL AND id IN(SELECT te.task_id FROM task_evidence te JOIN source_items si ON si.id=te.source_item_id WHERE si.source_id=?)',
              )
              .bind(src.id),
            db
              .prepare(
                "DELETE FROM task_events WHERE task_id IN(SELECT id FROM tasks WHERE deleted_at=? AND title='Deleted responsibility')",
              )
              .bind(at),
          );
          ops.push(
            db
              .prepare(
                'DELETE FROM task_evidence WHERE source_item_id IN (SELECT id FROM source_items WHERE source_id=?)',
              )
              .bind(src.id),
            db
              .prepare(
                'DELETE FROM candidate_evidence WHERE source_item_id IN (SELECT id FROM source_items WHERE source_id=?)',
              )
              .bind(src.id),
            db
              .prepare(
                'UPDATE source_items SET removed_at=?,local_evidence_available=0 WHERE source_id=?',
              )
              .bind(at, src.id),
          );
          ops.push(
            db
              .prepare(
                'INSERT OR IGNORE INTO device_actions(id,source_id,device_id,generation,created_at,expires_at) SELECT lower(hex(randomblob(16))),source_id,id,?,?,? FROM capture_devices WHERE source_id=?',
              )
              .bind(
                src.generation + 1,
                at,
                new Date(Date.parse(at) + 7 * 86400000).toISOString(),
                src.id,
              ),
          );
          if (key)
            ops.push(
              db
                .prepare('INSERT INTO idempotency_records VALUES(?,?,?,?)')
                .bind(scope, key, digest, src.id),
            );
          await db.batch(ops);
          return result({ cloud_purged: true, local_wipe_pending: true });
        }
        if (p === '/export' && method === 'GET') {
          const format = url.searchParams.get('format') ?? 'json';
          if (!['json', 'csv'].includes(format))
            throw new Http(422, 'INVALID_EXPORT_FORMAT');
          const { snapshot, columns } = await readCanonical(db, now());
          if (format === 'json') return result(snapshot);
          const headers = result({}).headers;
          headers.set('Content-Type', 'text/csv; charset=utf-8');
          headers.set(
            'Content-Disposition',
            'attachment; filename="academic-os-export.csv"',
          );
          return new Response(canonicalCSV(snapshot, columns), { headers });
        }
        throw new Http(404, 'NOT_FOUND');
      } catch (e) {
        if (e instanceof BudgetError)
          return result(
            { error: { code: e.code } },
            e.code === 'REQUEST_BUDGET_EXCEEDED' ? 429 : 503,
          );
        if (e instanceof DeviceAuthError)
          return result({ error: { code: e.code } }, e.status);
        if (e instanceof Http)
          return result({ error: { code: e.code } }, e.status);
        if (
          e instanceof Error &&
          (e.message.includes('mutation_guards') ||
            e.message.includes('CHECK constraint failed: ok=1'))
        )
          return result({ error: { code: 'VERSION_CONFLICT' } }, 409);
        if (e instanceof Invalid)
          return result({ error: { code: e.message } }, 422);
        return result({ error: { code: 'INTERNAL_ERROR' } }, 500);
      }
    },
  };
}
const app = createApp();
export default {
  ...app,
  async scheduled(_event: ScheduledController, env: Env) {
    const at = now();
    await env.DB.prepare(
      "INSERT INTO operational_reports(component,started_at,state) VALUES('scheduler',?,'running') ON CONFLICT(component) DO UPDATE SET started_at=excluded.started_at,state='running'",
    )
      .bind(at)
      .run();
    try {
      await tick(env.DB, at);
      await dispatchPush(env, at);
      await env.DB.prepare(
        "UPDATE operational_reports SET reported_at=?,state='completed' WHERE component='scheduler' AND started_at=?",
      )
        .bind(now(), at)
        .run();
    } catch {
      await env.DB.prepare(
        "UPDATE operational_reports SET reported_at=?,state='failed' WHERE component='scheduler' AND started_at=?",
      )
        .bind(now(), at)
        .run();
    }
    await env.DB.prepare('DELETE FROM operational_usage WHERE bucket<?')
      .bind(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
      .run();
  },
};
