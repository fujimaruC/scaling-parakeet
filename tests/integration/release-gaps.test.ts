import worker from '../../apps/worker/src/index';
import { beforeAll, afterAll, beforeEach, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
import { generateKeyPair, exportJWK, jwtVerify } from 'jose';
import { createApp, tick, type Env } from '../../apps/worker/src/index';
import {
  pushConfig,
  subscribe,
  dispatchPush,
  validEndpoint,
} from '../../apps/worker/src/push';
import {
  account,
  LIMITS,
  operationalHealth,
  reportState,
} from '../../apps/worker/src/operations';
import { listTasks } from '../../apps/worker/src/task-list';
import { listHistory } from '../../apps/worker/src/history';
import { unknownDue, validateDue } from '../../packages/contracts/src/index';
let mf: Miniflare, db: D1Database, env: Env, publicKey: CryptoKey;
const at = '2030-05-15T00:00:00.000Z';
beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    d1Databases: ['DB'],
  });
  db = (await mf.getD1Database('DB')) as unknown as D1Database;
  for (const f of readdirSync('apps/worker/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    for (const sql of readFileSync('apps/worker/migrations/' + f, 'utf8')
      .trim()
      .split(/;\n/))
      if (sql.trim()) await db.prepare(sql).run();
  const pair = await generateKeyPair('ES256', { extractable: true });
  publicKey = pair.publicKey;
  env = {
    DB: db,
    OWNER_SUB: 'synthetic',
    ACCESS_TEAM: 'UNCONFIGURED',
    ACCESS_AUD: 'UNCONFIGURED',
    VAPID_PRIVATE_JWK: JSON.stringify(await exportJWK(pair.privateKey)),
    VAPID_SUBJECT: 'mailto:synthetic@example.invalid',
  };
});
afterAll(() => mf.dispose());
beforeEach(async () => {
  await db.batch(
    [
      'push_attempts',
      'push_subscriptions',
      'notification_inbox',
      'reminder_intents',
      'task_events',
      'tasks',
      'operational_usage',
      'operational_reports',
      'sources',
    ].map((t) => db.prepare('DELETE FROM ' + t)),
  );
});
async function task(
  id: string,
  due: any = unknownDue,
  title = 'Synthetic task',
) {
  await db
    .prepare(
      "INSERT INTO tasks(id,title,kind,status,priority,due_json,due_at_utc,created_at,updated_at) VALUES(?,?,'personal_action','todo','normal',?,?,?,?)",
    )
    .bind(id, title, JSON.stringify(due), validateDue(due), at, at)
    .run();
}
async function reminder() {
  await task('task', {
    precision: 'datetime',
    local_date: null,
    local_datetime: '2030-05-15T03:00:00',
    timezone: 'UTC',
  });
  await db
    .prepare(
      "INSERT INTO reminder_intents(id,task_id,due_revision,scheduled_for_utc) VALUES('intent','task',1,?)",
    )
    .bind(at)
    .run();
  await tick(db, at);
}
const endpoint = 'https://fcm.googleapis.com/fcm/send/synthetic';
const url = (q: string) => new URL('https://synthetic/tasks?' + q);
it('push subscription lifecycle sends an empty body with verifiable VAPID and never changes the durable inbox', async () => {
  const sub = await subscribe(env, endpoint, '2030-05-14T00:00:00.000Z');
  await reminder();
  const before = await db.prepare('SELECT * FROM notification_inbox').all();
  let sent = 0;
  const send = (async (input: any, options: any) => {
    sent++;
    expect(input).toBe(endpoint);
    expect(options.body).toBeUndefined();
    expect(options.redirect).toBe('error');
    const token = /t=([^,]+),/.exec(options.headers.Authorization)![1];
    const j = await jwtVerify(token, publicKey, {
      audience: new URL(endpoint).origin,
      currentDate: new Date(at),
    });
    expect(j.payload.sub).toBe(env.VAPID_SUBJECT);
    return new Response(null, { status: 201 });
  }) as typeof fetch;
  expect((await dispatchPush(env, at, send)).attempts).toBe(1);
  await dispatchPush(env, at, send);
  expect(sent).toBe(1);
  expect(
    (await db.prepare('SELECT state FROM push_attempts').first<any>()).state,
  ).toBe('provider_accepted');
  expect(
    (await db.prepare('SELECT * FROM notification_inbox').all()).results,
  ).toEqual(before.results);
  expect(sub.id).toHaveLength(64);
});
it('expired endpoints are pruned, revoked endpoints never send or resurrect on a delayed subscribe', async () => {
  const sub = await subscribe(env, endpoint, '2030-05-14T00:00:00.000Z');
  await reminder();
  await dispatchPush(
    env,
    at,
    (async () => new Response(null, { status: 410 })) as typeof fetch,
  );
  expect(
    (
      await db
        .prepare('SELECT revoked_at FROM push_subscriptions WHERE id=?')
        .bind(sub.id)
        .first<any>()
    ).revoked_at,
  ).toBe(at);
  await expect(subscribe(env, endpoint, at)).rejects.toThrow(
    'PUSH_SUBSCRIPTION_UNAVAILABLE',
  );
  await db.prepare('DELETE FROM push_attempts').run();
  let sends = 0;
  await dispatchPush(env, at, (async () => {
    sends++;
    return new Response(null, { status: 201 });
  }) as typeof fetch);
  expect(sends).toBe(0);
});
it('ambiguous push failures remain unknown and are not replayed; inbox count and contents survive failure', async () => {
  await subscribe(env, endpoint, '2030-05-14T00:00:00.000Z');
  await reminder();
  const before = (await db.prepare('SELECT * FROM notification_inbox').all())
    .results;
  let sends = 0;
  const fail = (async () => {
    sends++;
    throw Error('synthetic network interruption');
  }) as typeof fetch;
  await dispatchPush(env, at, fail);
  await dispatchPush(env, at, fail);
  expect(sends).toBe(1);
  expect(
    (await db.prepare('SELECT state FROM push_attempts').first<any>()).state,
  ).toBe('unknown');
  expect(
    (await db.prepare('SELECT * FROM notification_inbox').all()).results,
  ).toEqual(before);
});
it('push is opt in, rejects arbitrary outbound URLs, missing/mismatched keys and has a four-install cap', async () => {
  expect(
    await pushConfig({
      ...env,
      VAPID_PRIVATE_JWK: undefined,
      VAPID_SUBJECT: undefined,
    }),
  ).toBeNull();
  expect(validEndpoint('https://127.0.0.1/private')).toBe(false);
  expect(validEndpoint('https://fcm.googleapis.com@evil.test/push')).toBe(
    false,
  );
  const wrong = JSON.parse(env.VAPID_PRIVATE_JWK!);
  wrong.x = 'A'.repeat(43);
  await expect(
    pushConfig({ ...env, VAPID_PRIVATE_JWK: JSON.stringify(wrong) }),
  ).rejects.toThrow('PUSH_CONFIGURATION_INVALID');
  for (let i = 0; i < 4; i++) await subscribe(env, endpoint + i, at);
  await expect(subscribe(env, endpoint + '5', at)).rejects.toThrow(
    'PUSH_SUBSCRIPTION_UNAVAILABLE',
  );
});
it('browser push lifecycle remains authenticated and same-origin; device namespace cannot use it', async () => {
  const app = createApp(async (r) => r.headers.has('X-Synthetic'));
  const call = (
    path: string,
    method: string,
    headers: Record<string, string> = {},
    body?: any,
  ) =>
    app.fetch(
      new Request('https://synthetic' + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
      }),
      env,
    );
  expect((await call('/api/v1/push/config', 'GET')).status).toBe(401);
  expect(
    (
      await call(
        '/api/v1/push/subscriptions',
        'POST',
        { 'X-Synthetic': '1', Origin: 'https://evil.test' },
        { endpoint },
      )
    ).status,
  ).toBe(403);
  const r = await call(
    '/api/v1/push/subscriptions',
    'POST',
    { 'X-Synthetic': '1', Origin: 'https://synthetic' },
    { endpoint },
  );
  expect(r.status).toBe(200);
  const id = ((await r.json()) as any).data.id;
  expect(
    (
      await call('/api/v1/push/subscriptions/' + id, 'DELETE', {
        'X-Synthetic': '1',
        Origin: 'https://synthetic',
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await db
        .prepare('SELECT revoked_at FROM push_subscriptions WHERE id=?')
        .bind(id)
        .first<any>()
    ).revoked_at,
  ).not.toBeNull();
  expect((await call('/api/device/v1/push/config', 'GET')).status).toBe(401);
});
it('persistent accounting enforces atomic minute limits across new handlers and a fixed refusal without mutation', async () => {
  // Miniflare's D1 RPC layer asserts under 120 simultaneous batch calls, which
  // made this test fail 2/6 on the pre-patch base too. Bound the parallelism:
  // atomicity is still proven because the 121st call must observe every prior
  // increment, and the budget-cap mutation still flips it to resolving.
  for (let i = 0; i < LIMITS.write; i += 8)
    await Promise.all(
      Array.from({ length: Math.min(8, LIMITS.write - i) }, () =>
        account(db, 'write', at),
      ),
    );
  await expect(account(db, 'write', at)).rejects.toThrow(
    'REQUEST_BUDGET_EXCEEDED',
  );
  const next = '2030-05-15T00:01:00.000Z';
  await expect(account(db, 'write', next)).resolves.toBeUndefined();
  // The real router observes stored state after a fresh handler is created.
  const clock = new Date().toISOString().slice(0, 16);
  await db
    .prepare("INSERT INTO operational_usage VALUES(?,'write',?)")
    .bind(clock, LIMITS.write)
    .run();
  const r = await createApp(async () => true).fetch(
    new Request('https://synthetic/api/v1/tasks', {
      method: 'POST',
      headers: {
        Origin: 'https://synthetic',
        'Content-Type': 'application/json',
        'Idempotency-Key': 'budget',
      },
      body: '{"title":"must not commit"}',
    }),
    env,
  );
  expect(r.status).toBe(429);
  expect(((await r.json()) as any).error.code).toBe('REQUEST_BUDGET_EXCEEDED');
  expect(
    (await db.prepare('SELECT count(*) n FROM tasks').first<any>()).n,
  ).toBe(0);
});
it('health never invents reports, labels stale/future clocks separately, and exposes durable counts instead of billing', async () => {
  expect(reportState(null, at, 100)).toBe('never_reported');
  expect(reportState('2030-05-14T00:00:00Z', at, 100)).toBe('reported_stale');
  expect(reportState(at, at, 100)).toBe('healthy');
  expect(reportState('2031-01-01T00:00:00Z', at, 100)).toBe('unavailable');
  expect((await operationalHealth(db, at)).scheduler.state).toBe(
    'never_reported',
  );
  await account(db, 'read', at);
  await db
    .prepare(
      "INSERT INTO operational_reports VALUES('scheduler',?,?,'completed')",
    )
    .bind(at, at)
    .run();
  const h = await operationalHealth(db, at);
  expect(h.scheduler.state).toBe('healthy');
  expect(h.scope).toContain('not_billing');
  expect(h.usage).toHaveLength(2);
});
it('a year ledger searches beyond the first 100, escapes wildcard queries and pages calendar without collapsing precisions', async () => {
  const ops = [];
  for (let i = 0; i < 1200; i++) {
    const month = String(1 + (i % 12)).padStart(2, '0');
    ops.push(
      db
        .prepare(
          "INSERT INTO tasks(id,title,kind,status,priority,due_json,created_at,updated_at) VALUES(?,?,'assignment','todo','normal',?,?,?)",
        )
        .bind(
          'task-' + String(i).padStart(4, '0'),
          i === 1199 ? 'Needle 100%_done' : 'Synthetic ' + i,
          JSON.stringify({
            precision: 'date_only',
            local_date: '2030-' + month + '-15',
            local_datetime: null,
            timezone: 'Asia/Makassar',
          }),
          at,
          at,
        ),
    );
  }
  for (let i = 0; i < ops.length; i += 80) await db.batch(ops.slice(i, i + 80));
  expect(
    (await listTasks(db, url('limit=100&q=Needle&title_only=1'))).items.map(
      (t) => t.id,
    ),
  ).toEqual(['task-1199']);
  expect(
    (await listTasks(db, url('q=100%25_done&title_only=1'))).items,
  ).toHaveLength(1);
  let cursor: string | null = null;
  const ids: string[] = [];
  do {
    const page = await listTasks(
      db,
      url(
        'limit=17&date_from=2030-12-01&date_to=2030-12-31&timezone=Asia%2FMakassar' +
          (cursor ? '&cursor=' + cursor : ''),
      ),
    );
    ids.push(...page.items.map((t) => t.id));
    cursor = page.cursor;
  } while (cursor);
  expect(ids).toHaveLength(100);
  expect(new Set(ids).size).toBe(100);
  expect(ids).toContain('task-1199');
  await task('exact-boundary', {
    precision: 'datetime',
    local_date: null,
    local_datetime: '2030-11-30T16:30:00',
    timezone: 'UTC',
  });
  await task('next-year', {
    precision: 'datetime',
    local_date: null,
    local_datetime: '2030-12-31T23:30:00',
    timezone: 'UTC',
  });
  await task('unknown');
  await task('approx', {
    ...unknownDue,
    precision: 'approximate',
  });
  expect(
    (
      await listTasks(db, url('date_from=2030-12-01&date_to=2030-12-31'))
    ).items.every((t) => ['date_only', 'datetime'].includes(t.due.precision)),
  ).toBe(true);
  const boundary = await listTasks(
    db,
    url('date_from=2030-12-01&date_to=2030-12-31&timezone=Asia%2FMakassar'),
  );
  expect(boundary.items.some((t) => t.id === 'exact-boundary')).toBe(true);
  expect(boundary.items.some((t) => t.id === 'next-year')).toBe(false);
  // Seeds 1200 rows. Measured 18.2s alone and 38s under full-suite load, so the
  // original 20s bound was inside the noise; 120s keeps the assertion strict.
}, 120000);
it('global history reaches old events with opaque descending cursors, even when new rows arrive between pages', async () => {
  for (let i = 0; i < 230; i++) await task('history-' + i);
  const expected = (
    await db.prepare('SELECT id FROM task_events ORDER BY id DESC').all<any>()
  ).results.map((r) => r.id);
  const first = await listHistory(db, url('limit=50'));
  expect(first.items).toHaveLength(50);
  await task('newer');
  let cursor = first.cursor;
  const ids = first.items.map((r) => r.id);
  while (cursor) {
    const page = await listHistory(db, url('limit=50&cursor=' + cursor));
    ids.push(...page.items.map((r) => r.id));
    cursor = page.cursor;
  }
  expect(ids).toEqual(expected);
  await expect(listHistory(db, url('cursor=invalid'))).rejects.toThrow(
    'INVALID_CURSOR',
  );
});

it('task cursors are bound to filters and reject reuse that would silently omit matches', async () => {
  await task('a', unknownDue, 'Match');
  await task('b', unknownDue, 'Match');
  const first = await listTasks(db, url('limit=1&title_only=1&q=Match'));
  expect(first.cursor).not.toBeNull();
  await expect(
    listTasks(db, url('limit=1&title_only=1&q=other&cursor=' + first.cursor)),
  ).rejects.toThrow('INVALID_CURSOR');
  expect(
    (
      await listTasks(
        db,
        url('q=Match&title_only=1&limit=1&cursor=' + first.cursor),
      )
    ).items.map((t) => t.id),
  ).toEqual(['b']);
});

it('health daily count remains visible beyond bounded detail and the global daily cap refuses', async () => {
  await account(db, 'read', at);
  const rows = [];
  for (let i = 0; i < 550; i++) {
    const stamp = new Date(Date.parse(at) + i * 60000)
      .toISOString()
      .slice(0, 16);
    rows.push(
      db
        .prepare("INSERT OR IGNORE INTO operational_usage VALUES(?,'read',1)")
        .bind(stamp),
    );
  }
  for (let i = 0; i < rows.length; i += 80)
    await db.batch(rows.slice(i, i + 80));
  const h = await operationalHealth(db, at);
  expect(h.usage_partial).toBe(true);
  expect(h.daily_requests).toBe(1);
  await db
    .prepare("UPDATE operational_usage SET requests=10000 WHERE class='all'")
    .run();
  await expect(account(db, 'export', at)).rejects.toThrow(
    'REQUEST_BUDGET_EXCEEDED',
  );
});
it('cron health reports actual local completion or failure and never declares a misconfigured push healthy', async () => {
  const local = {
    ...env,
    VAPID_PRIVATE_JWK: undefined,
    VAPID_SUBJECT: undefined,
  };
  await worker.scheduled({} as ScheduledController, local);
  expect((await operationalHealth(db)).scheduler.state).toBe('healthy');
  await worker.scheduled({} as ScheduledController, {
    ...env,
    VAPID_PRIVATE_JWK: 'invalid',
  });
  expect((await operationalHealth(db)).scheduler.state).toBe('failed');
});
