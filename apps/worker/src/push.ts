import { importJWK, SignJWT } from 'jose';
import { sha256 } from './auth';
export interface PushEnv {
  DB: D1Database;
  VAPID_PRIVATE_JWK?: string;
  VAPID_SUBJECT?: string;
}
const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
export async function pushConfig(env: PushEnv) {
  if (!env.VAPID_PRIVATE_JWK && !env.VAPID_SUBJECT) return null;
  try {
    const j = JSON.parse(env.VAPID_PRIVATE_JWK ?? '');
    if (
      j.kty !== 'EC' ||
      j.crv !== 'P-256' ||
      ![j.x, j.y, j.d].every(
        (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v),
      ) ||
      !/^mailto:[^\s@]+@[^\s@]+$/.test(env.VAPID_SUBJECT ?? '')
    )
      throw Error();
    const key = await importJWK(j, 'ES256');
    // A signature check catches malformed/mismatched secret coordinates before configuration is advertised.
    const pub = await crypto.subtle.importKey(
      'jwk',
      { kty: j.kty, crv: j.crv, x: j.x, y: j.y },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    const probe = new TextEncoder().encode('Academic OS VAPID configuration');
    const sig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key as CryptoKey,
      probe,
    );
    if (
      !(await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        pub,
        sig,
        probe,
      ))
    )
      throw Error();
    const raw = new Uint8Array(
      await crypto.subtle.exportKey(
        'raw',
        await crypto.subtle.importKey(
          'jwk',
          { kty: j.kty, crv: j.crv, x: j.x, y: j.y },
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['verify'],
        ),
      ),
    );
    return { key, publicKey: b64(raw), subject: env.VAPID_SUBJECT! };
  } catch {
    throw Error('PUSH_CONFIGURATION_INVALID');
  }
}
export function validEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.hash &&
      !u.search &&
      u.pathname.length > 1 &&
      [
        'fcm.googleapis.com',
        'updates.push.services.mozilla.com',
        'web.push.apple.com',
      ].includes(u.hostname)
    );
  } catch {
    return false;
  }
}
export async function subscribe(
  env: PushEnv,
  endpoint: unknown,
  at = new Date().toISOString(),
) {
  if (!validEndpoint(endpoint)) throw Error('INVALID_PUSH_SUBSCRIPTION');
  const config = await pushConfig(env);
  if (!config) throw Error('PUSH_NOT_CONFIGURED');
  const id = await sha256(endpoint);
  // A revoked endpoint is never resurrected by a delayed retry. Browser must create a fresh subscription.
  await env.DB.prepare(
    'INSERT OR IGNORE INTO push_subscriptions(id,endpoint,created_at,vapid_key) SELECT ?,?,?,? WHERE (SELECT count(*) FROM push_subscriptions WHERE revoked_at IS NULL)<4',
  )
    .bind(id, endpoint, at, config.publicKey)
    .run();
  const row = await env.DB.prepare(
    'SELECT id,revoked_at,vapid_key FROM push_subscriptions WHERE id=?',
  )
    .bind(id)
    .first<any>();
  if (!row || row.revoked_at || row.vapid_key !== config.publicKey)
    throw Error('PUSH_SUBSCRIPTION_UNAVAILABLE');
  return { id: row.id };
}
export async function dispatchPush(
  env: PushEnv,
  at = new Date().toISOString(),
  send: typeof fetch = fetch,
) {
  const config = await pushConfig(env);
  if (!config) return { state: 'not_configured', attempts: 0 };
  // Only unread inbox rows created after enrollment and within six hours. No historical alert storm.
  const rows = await env.DB.prepare(
    "SELECT n.id inbox_id,s.id subscription_id,s.endpoint FROM notification_inbox n JOIN push_subscriptions s ON s.revoked_at IS NULL AND s.created_at<=n.created_at AND s.vapid_key=? JOIN tasks t ON t.id=n.task_id JOIN reminder_intents r ON r.id=n.intent_id WHERE n.read_at IS NULL AND n.created_at>=? AND t.deleted_at IS NULL AND t.status NOT IN ('done','archived') AND t.due_revision=r.due_revision AND NOT EXISTS(SELECT 1 FROM push_attempts p WHERE p.inbox_id=n.id AND p.subscription_id=s.id) ORDER BY n.created_at,n.id,s.id LIMIT 20",
  )
    .bind(
      config.publicKey,
      new Date(Date.parse(at) - 6 * 3600000).toISOString(),
    )
    .all<any>();
  let attempts = 0;
  for (const row of rows.results) {
    const claimed = await env.DB.prepare(
      "INSERT OR IGNORE INTO push_attempts VALUES(?,?,'unknown',?)",
    )
      .bind(row.inbox_id, row.subscription_id, at)
      .run();
    if (!claimed.meta.changes) continue;
    // Persist unknown BEFORE the external call. A crash or ambiguous response is not retried automatically.
    const live = await env.DB.prepare(
      'SELECT id FROM push_subscriptions WHERE id=? AND revoked_at IS NULL',
    )
      .bind(row.subscription_id)
      .first();
    let state = 'revoked';
    if (live && validEndpoint(row.endpoint)) {
      attempts++;
      try {
        const jwt = await new SignJWT({})
          .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
          .setAudience(new URL(row.endpoint).origin)
          .setSubject(config.subject)
          .setExpirationTime(Math.floor(Date.parse(at) / 1000) + 3600)
          .sign(config.key);
        const response = await send(row.endpoint, {
          method: 'POST',
          redirect: 'error',
          headers: {
            Authorization: `vapid t=${jwt}, k=${config.publicKey}`,
            TTL: '300',
            Urgency: 'normal',
            Topic: 'academic-os-inbox',
          },
          signal: AbortSignal.timeout(10000),
        });
        state =
          response.status === 201
            ? 'provider_accepted'
            : [404, 410].includes(response.status)
              ? 'expired'
              : 'failed';
        await response.body?.cancel();
      } catch {
        state = 'unknown';
      }
    }
    if (state === 'expired')
      await env.DB.prepare(
        'UPDATE push_subscriptions SET revoked_at=? WHERE id=?',
      )
        .bind(at, row.subscription_id)
        .run();
    await env.DB.prepare(
      'UPDATE push_attempts SET state=? WHERE inbox_id=? AND subscription_id=?',
    )
      .bind(state, row.inbox_id, row.subscription_id)
      .run();
  }
  return { state: 'configured_unverified', attempts };
}
