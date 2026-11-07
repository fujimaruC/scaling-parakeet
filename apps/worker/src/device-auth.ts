import { sha256, equal, type AuthEnv } from './auth';
export class DeviceAuthError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
type Environment = AuthEnv & { DB: D1Database };
export type OwnerClient = {
  id: string;
  owner_subject: string;
  token_hash: string;
  scope_version: number;
  status: string;
  grant_id: string;
  created_at: string;
  expires_at: string;
  activated_at: string | null;
  revoked_at: string | null;
};
const fail = (status = 401, code = 'AUTH_REQUIRED'): never => {
  throw new DeviceAuthError(status, code);
};
const at = () => new Date().toISOString();
const idPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const randomSecret = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
export function configured(env: Environment) {
  return !!env.OWNER_SUB && env.OWNER_SUB !== 'UNCONFIGURED';
}
export function noBrowserCredentials(req: Request) {
  if (req.headers.has('Origin')) fail(403, 'INVALID_ORIGIN');
  if (
    req.headers.has('Cookie') ||
    req.headers.has('Cf-Access-Jwt-Assertion') ||
    req.headers.has('X-Collector-Key-Id')
  )
    fail(403, 'AMBIGUOUS_CREDENTIALS');
}
function token(id: string, secret: string) {
  return 'aos1.' + id + '.' + secret;
}
export async function authenticateDevice(
  req: Request,
  env: Environment,
  pending = false,
): Promise<OwnerClient> {
  noBrowserCredentials(req);
  if (!configured(env)) fail();
  const match = /^Bearer (aos1\.([0-9a-f-]{36})\.[A-Za-z0-9_-]{43})$/.exec(
    req.headers.get('Authorization') ?? '',
  );
  if (!match || !idPattern.test(match[2])) fail();
  // Direct D1 queries use the primary. Do not change this to an unconstrained replica or positive auth cache.
  const client = await env.DB.prepare(
    'SELECT * FROM owner_client_credentials WHERE id=?',
  )
    .bind(match![2])
    .first<OwnerClient>();
  const digest = await sha256(match![1]);
  if (
    !client ||
    !equal(client.token_hash, digest) ||
    client.owner_subject !== env.OWNER_SUB ||
    client.scope_version !== 1 ||
    client.revoked_at ||
    client.expires_at <= at() ||
    (!pending && client.status !== 'active') ||
    !['active', 'pending'].includes(client.status)
  )
    fail();
  return client!;
}
export function deviceRouteAllowed(path: string, method: string) {
  const routes: [RegExp, string[]][] = [
    [/^\/(me|health|briefing|search|history|export)$/, ['GET']],
    [/^\/(tasks|contexts|sources)$/, ['GET', 'POST']],
    [/^\/tasks\/[^/]+$/, ['GET', 'PATCH', 'DELETE']],
    [/^\/candidates$/, ['GET']],
    [/^\/candidates\/[^/]+\/review$/, ['POST']],
    [/^\/review-actions\/[^/]+\/undo$/, ['POST']],
    [/^\/sources\/[^/]+\/(purge-preview|purge)$/, ['POST']],
    [/^\/sources\/[^/]+\/purge-status$/, ['GET']],
    [/^\/device-actions\/[^/]+\/retire$/, ['POST']],
    [/^\/settings$/, ['GET', 'PATCH']],
    [/^\/settings\/reminders$/, ['PATCH']],
    [/^\/reminders$/, ['GET']],
    [/^\/reminders\/[^/]+\/read$/, ['PATCH']],
    [/^\/reminders\/[^/]+\/snooze$/, ['POST']],
  ];
  return routes.some(
    ([pattern, methods]) => pattern.test(path) && methods.includes(method),
  );
}
export async function enrollDevice(req: Request, env: Environment, value: any) {
  noBrowserCredentials(req);
  if (req.headers.has('Authorization') || !configured(env)) fail();
  if (
    !value ||
    Object.keys(value).sort().join(',') !== 'client_id,grant,secret' ||
    !idPattern.test(value.client_id) ||
    !/^([0-9a-f-]{36})\.[A-Za-z0-9_-]{43}$/.test(value.grant ?? '') ||
    !/^[A-Za-z0-9_-]{43}$/.test(value.secret ?? '')
  )
    fail(422, 'INVALID_PAYLOAD');
  const bucket = Math.floor(Date.now() / 60000);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM owner_enrollment_limits WHERE bucket<?').bind(
      bucket - 2,
    ),
    env.DB.prepare(
      'INSERT INTO owner_enrollment_limits VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1',
    ).bind(bucket),
  ]);
  const limit = await env.DB.prepare(
    'SELECT attempts FROM owner_enrollment_limits WHERE bucket=?',
  )
    .bind(bucket)
    .first<any>();
  if (limit.attempts > 40) fail(429, 'RATE_LIMITED');
  const id = value.grant.split('.')[0],
    now = at(),
    hash = await sha256(token(value.client_id, value.secret));
  const grant = await env.DB.prepare(
    'SELECT * FROM owner_client_grants WHERE id=? AND owner_subject=?',
  )
    .bind(id, env.OWNER_SUB)
    .first<any>();
  if (!grant || grant.expires_at <= now || grant.attempts >= 8) fail();
  if (!equal(grant.grant_hash, await sha256(value.grant))) {
    await env.DB.prepare(
      'UPDATE owner_client_grants SET attempts=attempts+1 WHERE id=?',
    )
      .bind(id)
      .run();
    fail();
  }
  if (grant.consumed_by) {
    if (
      grant.consumed_by !== value.client_id ||
      !equal(grant.consumed_hash ?? '', hash)
    )
      fail(409, 'ENROLLMENT_CONFLICT');
    const prior = await env.DB.prepare(
      'SELECT status,expires_at FROM owner_client_credentials WHERE id=? AND token_hash=?',
    )
      .bind(value.client_id, hash)
      .first<any>();
    if (!prior || prior.status === 'revoked') fail();
    return { client_id: value.client_id, fingerprint: hash, ...prior };
  }
  const guard = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE owner_client_grants SET consumed_by=?,consumed_hash=?,attempts=attempts+1 WHERE id=? AND consumed_by IS NULL AND expires_at>? AND attempts<8',
      ).bind(value.client_id, hash, id, now),
      env.DB.prepare('INSERT INTO mutation_guards VALUES(?,changes())').bind(
        guard,
      ),
      env.DB.prepare(
        "INSERT INTO owner_client_credentials(id,owner_subject,token_hash,status,grant_id,created_at,expires_at) VALUES(?,?,?,'pending',?,?,?)",
      ).bind(value.client_id, env.OWNER_SUB, hash, id, now, grant.expires_at),
      env.DB.prepare('DELETE FROM mutation_guards WHERE id=?').bind(guard),
    ]);
  } catch {
    fail(409, 'ENROLLMENT_CONFLICT');
  }
  return {
    client_id: value.client_id,
    fingerprint: hash,
    status: 'pending',
    expires_at: grant.expires_at,
  };
}
export async function administerClients(
  db: D1Database,
  subject: string,
  path: string,
  method: string,
  value: any,
) {
  if (path === '/owner-devices' && method === 'GET')
    return (
      await db
        .prepare(
          'SELECT id,token_hash fingerprint,status,created_at,expires_at,activated_at,revoked_at FROM owner_client_credentials WHERE owner_subject=? ORDER BY created_at DESC LIMIT 100',
        )
        .bind(subject)
        .all()
    ).results;
  if (path === '/owner-devices/grants' && method === 'POST') {
    const id = crypto.randomUUID(),
      grant = id + '.' + randomSecret(),
      now = at(),
      expiry = new Date(Date.now() + 5 * 60000).toISOString();
    await db
      .prepare(
        'INSERT INTO owner_client_grants(id,owner_subject,grant_hash,created_at,expires_at) VALUES(?,?,?,?,?)',
      )
      .bind(id, subject, await sha256(grant), now, expiry)
      .run();
    return { grant, expires_at: expiry };
  }
  const match = /^\/owner-devices\/([0-9a-f-]{36})\/(activate|revoke)$/.exec(
    path,
  );
  if (!match || !idPattern.test(match[1]) || method !== 'POST')
    return undefined;
  const client = await db
    .prepare(
      'SELECT * FROM owner_client_credentials WHERE id=? AND owner_subject=?',
    )
    .bind(match[1], subject)
    .first<OwnerClient>();
  if (!client) fail(404, 'NOT_FOUND');
  if (match[2] === 'revoke') {
    await db
      .prepare(
        "UPDATE owner_client_credentials SET status='revoked',revoked_at=COALESCE(revoked_at,?) WHERE id=? AND owner_subject=?",
      )
      .bind(at(), match[1], subject)
      .run();
    return { revoked: true };
  }
  if (!value || !equal(client!.token_hash, String(value.fingerprint ?? '')))
    fail(409, 'FINGERPRINT_MISMATCH');
  if (client!.status === 'active')
    return { active: true, expires_at: client!.expires_at };
  if (client!.status !== 'pending' || client!.expires_at <= at())
    fail(409, 'ENROLLMENT_EXPIRED');
  const now = at(),
    expiry = new Date(Date.now() + 90 * 86400000).toISOString();
  const r = await db
    .prepare(
      "UPDATE owner_client_credentials SET status='active',activated_at=?,expires_at=? WHERE id=? AND status='pending' AND expires_at>? AND owner_subject=? AND EXISTS(SELECT 1 FROM owner_client_grants WHERE id=owner_client_credentials.grant_id AND expires_at>? AND consumed_by=owner_client_credentials.id)",
    )
    .bind(now, expiry, client!.id, now, subject, now)
    .run();
  if (!r.meta.changes) fail(409, 'ENROLLMENT_EXPIRED');
  return { active: true, expires_at: expiry };
}
