import { afterEach } from 'vitest';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
import { createApp, type Env } from '../../apps/worker/src/index';
import { sha256 } from '../../apps/worker/src/auth';
import { unknownDue } from '../../packages/contracts/src/index';
let mf: Miniflare, env: Env;
const origin = 'https://native.synthetic';
const app = createApp(
  async (req) => req.headers.get('X-Synthetic-Owner') === 'true',
);
async function browser(
  path: string,
  method = 'GET',
  value?: unknown,
  extra: Record<string, string> = {},
) {
  return app.fetch(
    new Request(origin + '/api/v1' + path, {
      method,
      headers: {
        'X-Synthetic-Owner': 'true',
        Origin: origin,
        'Content-Type': 'application/json',
        ...extra,
      },
      body: value === undefined ? undefined : JSON.stringify(value),
    }),
    env,
  );
}
async function call(
  path: string,
  token?: string,
  method = 'GET',
  value?: unknown,
  headers: Record<string, string> = {},
) {
  return app.fetch(
    new Request(origin + '/api/device/v1' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...headers,
      },
      body: value === undefined ? undefined : JSON.stringify(value),
    }),
    env,
  );
}
async function data(response: Response) {
  expect(response.status).toBeLessThan(300);
  return ((await response.json()) as any).data;
}
function install() {
  const id = crypto.randomUUID(),
    secret = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
    )
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  return { id, secret, token: 'aos1.' + id + '.' + secret };
}
async function pending() {
  const c = install(),
    grant = await data(await browser('/owner-devices/grants', 'POST', {})),
    body = { client_id: c.id, secret: c.secret, grant: grant.grant };
  const result = await data(await call('/enroll', undefined, 'POST', body));
  return { ...c, grant, body, result };
}
async function enrolled() {
  const c = await pending();
  await data(
    await browser('/owner-devices/' + c.id + '/activate', 'POST', {
      fingerprint: c.result.fingerprint,
    }),
  );
  return c;
}
const keyed = () => ({ 'Idempotency-Key': crypto.randomUUID() });
async function task(token: string) {
  return data(
    await call(
      '/tasks',
      token,
      'POST',
      { title: 'Synthetic duty', kind: 'personal_action', due: unknownDue },
      keyed(),
    ),
  );
}
beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("synthetic")}}',
    d1Databases: ['DB'],
  });
  const DB = (await mf.getD1Database('DB')) as unknown as D1Database;
  for (const file of readdirSync('apps/worker/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    for (const sql of readFileSync('apps/worker/migrations/' + file, 'utf8')
      .trim()
      .split(/;\n/))
      if (sql.trim()) await DB.prepare(sql).run();
  env = {
    DB,
    OWNER_SUB: 'synthetic-owner',
    ACCESS_TEAM: 'UNCONFIGURED',
    ACCESS_AUD: 'UNCONFIGURED',
  };
});
afterAll(async () => mf?.dispose());
test('missing or forged native authority fails closed, including production administration', async () => {
  const attempts: Record<string, string>[] = [
    {},
    { 'Cf-Access-Jwt-Assertion': 'forged' },
    { Cookie: 'CF_Authorization=forged' },
    { 'X-Collector-Key-Id': 'forged' },
    { 'X-Synthetic-Owner': 'true' },
  ];
  for (const headers of attempts) {
    const r = await call('/tasks', undefined, 'GET', undefined, headers);
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(((await r.json()) as any).data).toBeUndefined();
  }
  expect(
    (await createApp().fetch(new Request(origin + '/owner-devices'), env))
      .status,
  ).toBe(401);
});
test('pending has no task authority; activation compares a hash and starts a bounded lifetime', async () => {
  const c = await pending();
  expect((await call('/tasks', c.token)).status).toBe(401);
  const row = await env.DB.prepare(
    'SELECT * FROM owner_client_credentials WHERE id=?',
  )
    .bind(c.id)
    .first<any>();
  expect(row.token_hash).toBe(await sha256(c.token));
  expect(JSON.stringify(row)).not.toContain(c.secret);
  const grant = await env.DB.prepare(
    'SELECT * FROM owner_client_grants WHERE consumed_by=?',
  )
    .bind(c.id)
    .first<any>();
  expect(JSON.stringify(grant)).not.toContain(c.grant.grant);
  expect(
    (
      await browser('/owner-devices/' + c.id + '/activate', 'POST', {
        fingerprint: 'wrong',
      })
    ).status,
  ).toBe(409);
  const a = await data(
    await browser('/owner-devices/' + c.id + '/activate', 'POST', {
      fingerprint: c.result.fingerprint,
    }),
  );
  const b = await data(
    await browser('/owner-devices/' + c.id + '/activate', 'POST', {
      fingerprint: c.result.fingerprint,
    }),
  );
  expect(b.expires_at).toBe(a.expires_at);
  expect((await data(await call('/me', c.token))).subject).toBe(
    'synthetic-owner',
  );
  expect(Date.parse(a.expires_at) - Date.now()).toBeLessThanOrEqual(
    90 * 86400000,
  );
});
test('enrollment recovers an identical lost response but never replaces a consumed grant', async () => {
  const c = await pending();
  expect(
    (await data(await call('/enroll', undefined, 'POST', c.body))).client_id,
  ).toBe(c.id);
  expect(
    (
      await call('/enroll', undefined, 'POST', {
        ...c.body,
        secret: install().secret,
      })
    ).status,
  ).toBe(409);
  const g = await data(await browser('/owner-devices/grants', 'POST', {}));
  await env.DB.prepare(
    "UPDATE owner_client_grants SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?",
  )
    .bind(g.grant.split('.')[0])
    .run();
  expect(
    (
      await call('/enroll', undefined, 'POST', {
        client_id: install().id,
        secret: install().secret,
        grant: g.grant,
      })
    ).status,
  ).toBe(401);
  expect(
    (await call('/enroll', undefined, 'POST', { ...c.body, extra: 'forged' }))
      .status,
  ).toBe(422);
});
test('native rejects every Origin and mixed credential; browser same-origin guard remains', async () => {
  const c = await enrolled();
  for (const Origin of ['', 'null', origin, 'https://foreign.synthetic'])
    expect(
      (await call('/tasks', c.token, 'GET', undefined, { Origin })).status,
    ).toBe(403);
  for (const headers of [
    { Cookie: 'x' },
    { 'Cf-Access-Jwt-Assertion': 'x' },
    { 'X-Collector-Key-Id': 'x' },
  ] as Record<string, string>[])
    expect((await call('/me', c.token, 'GET', undefined, headers)).status).toBe(
      403,
    );
  for (const Origin of ['', 'null', 'https://foreign.synthetic'])
    expect(
      (
        await browser(
          '/contexts',
          'POST',
          { type: 'academic', display_name: 'Synthetic' },
          { Origin },
        )
      ).status,
    ).toBe(403);
  const req = new Request(origin + '/api/v1/contexts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Synthetic-Owner': 'true',
    },
    body: '{}',
  });
  expect((await app.fetch(req, env)).status).toBe(403);
});
test('device scope never includes device administration, collectors or source ingestion', async () => {
  const c = await enrolled();
  for (const p of [
    '/owner-devices',
    '/owner-devices/grants',
    '/collector-credentials',
    '/sync',
    '/sync/status',
    '/sync/device-actions',
    '/sync/purge-ack',
  ])
    expect((await call(p, c.token, 'POST', {})).status).toBe(403);
});
test('revoked expired wrong-owner and unconfigured-owner credentials cannot read', async () => {
  const c = await enrolled();
  await data(await browser('/owner-devices/' + c.id + '/revoke', 'POST', {}));
  expect((await call('/tasks', c.token)).status).toBe(401);
  const e = await enrolled();
  await env.DB.prepare(
    "UPDATE owner_client_credentials SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?",
  )
    .bind(e.id)
    .run();
  expect((await call('/me', e.token)).status).toBe(401);
  const o = await enrolled();
  await env.DB.prepare(
    "UPDATE owner_client_credentials SET owner_subject='someone-else' WHERE id=?",
  )
    .bind(o.id)
    .run();
  expect((await call('/me', o.token)).status).toBe(401);
  expect(
    (
      await app.fetch(
        new Request(origin + '/api/device/v1/tasks', {
          headers: { Authorization: 'Bearer ' + o.token },
        }),
        { ...env, OWNER_SUB: 'UNCONFIGURED' },
      )
    ).status,
  ).toBe(401);
});
test('canonical context source task and CAS writes replay immutable idempotency keys', async () => {
  const c = await enrolled(),
    ctxKey = keyed(),
    ctxBody = { type: 'organization', display_name: 'Synthetic council' };
  const ctx = await data(
    await call('/contexts', c.token, 'POST', ctxBody, ctxKey),
  );
  expect(
    (await data(await call('/contexts', c.token, 'POST', ctxBody, ctxKey))).id,
  ).toBe(ctx.id);
  expect(
    (
      await call(
        '/contexts',
        c.token,
        'POST',
        { ...ctxBody, display_name: 'Other' },
        ctxKey,
      )
    ).status,
  ).toBe(409);
  const sk = keyed(),
    sb = { kind: 'whatsapp_export', display_name: 'Synthetic source' },
    source = await data(await call('/sources', c.token, 'POST', sb, sk));
  expect((await data(await call('/sources', c.token, 'POST', sb, sk))).id).toBe(
    source.id,
  );
  const tk = keyed(),
    tb = {
      title: 'Synthetic council duty',
      kind: 'organizational_duty',
      context_id: ctx.id,
      due: unknownDue,
    },
    t = await data(await call('/tasks', c.token, 'POST', tb, tk));
  expect((await data(await call('/tasks', c.token, 'POST', tb, tk))).id).toBe(
    t.id,
  );
  const pk = { ...keyed(), 'If-Match': String(t.version) },
    patch = { status: 'done' },
    done = await data(
      await call('/tasks/' + t.id, c.token, 'PATCH', patch, pk),
    );
  expect(
    (await data(await call('/tasks/' + t.id, c.token, 'PATCH', patch, pk)))
      .version,
  ).toBe(done.version);
  expect(done.due.precision).toBe('unknown');
  expect(done.due_at_utc).toBeNull();
  expect(
    (
      await call(
        '/tasks/' + t.id,
        c.token,
        'PATCH',
        { status: 'todo' },
        { ...keyed(), 'If-Match': String(t.version) },
      )
    ).status,
  ).toBe(409);
  const dk = { ...keyed(), 'If-Match': String(done.version) };
  await data(await call('/tasks/' + t.id, c.token, 'DELETE', {}, dk));
  expect(
    (await data(await call('/tasks/' + t.id, c.token, 'DELETE', {}, dk)))
      .deleted,
  ).toBe(true);
});
test('reminder-policy retries replay their receipt before revising settings again', async () => {
  const c = await enrolled(),
    s = await data(await call('/settings', c.token)),
    h = { ...keyed(), 'If-Match': String(s.version) },
    b = {
      enabled: true,
      offset_hours: [12, 2],
      date_only_hour: 8,
      quiet_hours: { enabled: true, start_hour: 22, end_hour: 7 },
    };
  await data(await call('/settings/reminders', c.token, 'PATCH', b, h));
  const after = await data(await call('/settings', c.token));
  await data(await call('/settings/reminders', c.token, 'PATCH', b, h));
  expect((await data(await call('/settings', c.token))).version).toBe(
    after.version,
  );
});
test('proposal acceptance is explicit, compensating Undo is versioned, exports exclude auth tables', async () => {
  const c = await enrolled(),
    source = crypto.randomUUID(),
    evidence = crypto.randomUUID(),
    id = crypto.randomUUID(),
    stamp = new Date().toISOString(),
    fixture = JSON.parse(
      readFileSync('examples/sync-envelope.synthetic.json', 'utf8'),
    ),
    fields = {
      ...fixture.candidates[0].fields,
      title: 'Synthetic proposal',
      due: unknownDue,
    };
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO sources(id,display_name,kind) VALUES(?,?,'whatsapp_export')",
    ).bind(source, 'Synthetic review source'),
    env.DB.prepare(
      'INSERT INTO source_items(id,source_id,generation,observed_at,local_evidence_available) VALUES(?,?,1,?,1)',
    ).bind(evidence, source, stamp),
    env.DB.prepare(
      "INSERT INTO candidates(id,source_id,generation,fields_json,issues_json,created_at,updated_at) VALUES(?,?,1,?,'[]',?,?)",
    ).bind(id, source, JSON.stringify(fields), stamp, stamp),
    env.DB.prepare('INSERT INTO candidate_evidence VALUES(?,?)').bind(
      id,
      evidence,
    ),
  ]);
  expect(
    (await data(await call('/candidates', c.token))).some(
      (p: any) => p.id === id,
    ),
  ).toBe(true);
  const before = (
    await env.DB.prepare('SELECT COUNT(*) n FROM tasks').first<any>()
  ).n;
  await data(await call('/candidates', c.token));
  expect(
    (await env.DB.prepare('SELECT COUNT(*) n FROM tasks').first<any>()).n,
  ).toBe(before);
  const review = await data(
    await call(
      '/candidates/' + id + '/review',
      c.token,
      'POST',
      { action: 'accept', expected_candidate_version: 1 },
      keyed(),
    ),
  );
  expect(review.review_action).toBeTruthy();
  const undo = await data(
    await call(
      '/review-actions/' + review.review_action + '/undo',
      c.token,
      'POST',
      {},
      keyed(),
    ),
  );
  expect(undo.undone).toBe(true);
  const exported = await data(await call('/export', c.token));
  expect(JSON.stringify(exported)).not.toContain(c.token);
  expect(JSON.stringify(exported)).not.toContain('owner_client_credentials');
});
test('self revocation affects only the current install and the administration page stays protected', async () => {
  const c = await enrolled(),
    other = await enrolled();
  await data(await call('/session', c.token, 'DELETE', {}));
  expect((await call('/me', c.token)).status).toBe(401);
  expect((await call('/me', other.token)).status).toBe(200);
  const page = await app.fetch(
    new Request(origin + '/owner-devices', {
      headers: { 'X-Synthetic-Owner': 'true' },
    }),
    env,
  );
  expect(page.status).toBe(200);
  expect(page.headers.get('Content-Security-Policy')).toContain(
    "frame-ancestors 'none'",
  );
  expect(page.headers.get('Cache-Control')).toBe('no-store');
});
test('snooze lost-response retry replays its receipt after the requested time passes', async () => {
  const c = await enrolled(),
    t = await task(c.token),
    inbox = crypto.randomUUID(),
    intent = crypto.randomUUID(),
    stamp = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO reminder_intents(id,task_id,due_revision,scheduled_for_utc) VALUES(?,?,?,?)',
    ).bind(intent, t.id, t.due_revision, stamp),
    env.DB.prepare(
      'INSERT INTO notification_inbox(id,intent_id,task_id,created_at) VALUES(?,?,?,?)',
    ).bind(inbox, intent, t.id, stamp),
  ]);
  const now = Date.now(),
    b = { until: new Date(now + 60000).toISOString() },
    h = keyed(),
    first = await data(
      await call('/reminders/' + inbox + '/snooze', c.token, 'POST', b, h),
    ),
    clock = vi.spyOn(Date, 'now').mockReturnValue(now + 120000);
  try {
    expect(
      (
        await data(
          await call('/reminders/' + inbox + '/snooze', c.token, 'POST', b, h),
        )
      ).intent_id,
    ).toBe(first.intent_id);
    expect(
      (
        await env.DB.prepare(
          'SELECT COUNT(*) n FROM reminder_intents WHERE task_id=?',
        )
          .bind(t.id)
          .first<any>()
      ).n,
    ).toBe(2);
  } finally {
    clock.mockRestore();
  }
});

// Each scenario models its own request window; budget behavior is tested separately.
afterEach(async () => {
  await env.DB.prepare('DELETE FROM operational_usage').run();
});
