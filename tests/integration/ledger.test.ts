import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync } from 'node:fs';
import { createApp, tick, type Env } from '../../apps/worker/src/index';
import { sha256, hmac } from '../../apps/worker/src/auth';
import {
  validateDue,
  unknownDue,
  toUtc,
  semanticSync,
} from '../../packages/contracts/src/index';
let mf: Miniflare, db: D1Database;
let env: Env;
const app = createApp(async () => true);
async function call(
  path: string,
  method = 'GET',
  value?: unknown,
  headers: Record<string, string> = {},
) {
  return app.fetch(
    new Request('https://academic.test/api/v1' + path, {
      method,
      headers: {
        Origin: 'https://academic.test',
        'Content-Type': 'application/json',
        ...headers,
      },
      body: value === undefined ? undefined : JSON.stringify(value),
    }),
    env,
  );
}
async function data(r: Response) {
  const b = (await r.json()) as any;
  expect(r.status, JSON.stringify(b)).toBeLessThan(300);
  return b.data;
}
beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    d1Databases: ['DB'],
  });
  db = (await mf.getD1Database('DB')) as unknown as D1Database;
  const sql = readFileSync('apps/worker/migrations/0001_core.sql', 'utf8');
  for (const s of sql.trim().split(/;\n/)) {
    if (s.trim()) await db.prepare(s).run();
  }
  env = {
    DB: db,
    OWNER_SUB: 'test',
    ACCESS_TEAM: 'UNCONFIGURED',
    ACCESS_AUD: 'UNCONFIGURED',
  };
});
afterAll(async () => {
  await mf?.dispose();
});
describe('persistent ledger', () => {
  it('production auth fails closed and forged headers do not authenticate', async () => {
    const r = await createApp().fetch(
      new Request('https://academic.test/api/v1/tasks', {
        headers: {
          'Cf-Access-Jwt-Assertion': 'fake',
          'Cf-Access-Authenticated-User-Email': 'owner',
        },
      }),
      env,
    );
    expect(r.status).toBe(401);
  });
  it('rejects cross-origin writes', async () => {
    const r = await call(
      '/tasks',
      'POST',
      { title: 'x' },
      { Origin: 'https://evil.test' },
    );
    expect(r.status).toBe(403);
  });
  it('stores an organizational duty without a course and preserves unknown dates', async () => {
    const c = await data(
      await call('/contexts', 'POST', {
        type: 'organization',
        display_name: 'Himpunan',
      }),
    );
    const body = {
      title: 'Prepare event needs',
      kind: 'organizational_duty',
      context_id: c.id,
      due: unknownDue,
    };
    const key = crypto.randomUUID();
    const t = await data(
      await call('/tasks', 'POST', body, { 'Idempotency-Key': key }),
    );
    expect(t.due_at_utc).toBeNull();
    expect(t.context_id).toBe(c.id);
    expect((await data(await call('/tasks/' + t.id))).title).toBe(body.title);
    expect(
      (
        await data(
          await call('/tasks', 'POST', body, { 'Idempotency-Key': key }),
        )
      ).id,
    ).toBe(t.id);
    expect(
      (
        await call(
          '/tasks',
          'POST',
          { ...body, title: 'different' },
          { 'Idempotency-Key': key },
        )
      ).status,
    ).toBe(409);
  });
  it('prevents lost edits and audits only a successful CAS', async () => {
    const t = await data(
      await call(
        '/tasks',
        'POST',
        { title: 'Report' },
        { 'Idempotency-Key': crypto.randomUUID() },
      ),
    );
    const writes = await Promise.all([
      call('/tasks/' + t.id, 'PATCH', { title: 'A' }, { 'If-Match': '1' }),
      call('/tasks/' + t.id, 'PATCH', { title: 'B' }, { 'If-Match': '1' }),
    ]);
    expect(writes.map((x) => x.status).sort()).toEqual([200, 409]);
    const events = await db
      .prepare('SELECT * FROM task_events WHERE task_id=?')
      .bind(t.id)
      .all();
    expect(events.results).toHaveLength(2);
  });
  it('processes reminders without collector or AI and cancels old deadline revisions', async () => {
    const t = await data(
      await call(
        '/tasks',
        'POST',
        {
          title: 'Report due',
          due: {
            precision: 'datetime',
            local_date: null,
            local_datetime: '2026-11-10T23:59:00',
            timezone: 'Asia/Makassar',
          },
        },
        { 'Idempotency-Key': crypto.randomUUID() },
      ),
    );
    expect(t.due_at_utc).toBe('2026-11-10T15:59:00.000Z');
    await tick(db, '2026-11-09T16:00:00.000Z');
    await tick(db, '2026-11-10T13:00:00.000Z');
    await tick(db, '2026-11-10T13:00:00.000Z');
    const r = await db
      .prepare('SELECT * FROM notification_inbox WHERE task_id=?')
      .bind(t.id)
      .all();
    expect(r.results).toHaveLength(2);
    await data(
      await call(
        '/tasks/' + t.id,
        'PATCH',
        { status: 'done' },
        { 'If-Match': '1' },
      ),
    );
    expect(
      (
        await db
          .prepare(
            "SELECT * FROM reminder_intents WHERE task_id=? AND state='pending'",
          )
          .bind(t.id)
          .all()
      ).results,
    ).toHaveLength(0);
  });
});
describe('date and projection boundaries', () => {
  it('rejects impossible dates and invented times', () => {
    expect(() =>
      validateDue({
        precision: 'date_only',
        local_date: '2026-02-30',
        local_datetime: null,
        timezone: 'Asia/Makassar',
      }),
    ).toThrow();
    expect(() =>
      validateDue({ ...unknownDue, local_date: '2026-11-10' }),
    ).toThrow();
    expect(() => toUtc('2026-03-08T02:30:00', 'America/New_York')).toThrow();
    expect(() => toUtc('2026-11-01T01:30:00', 'America/New_York')).toThrow();
  });
  it('rejects raw fields and unsupported evidence', () => {
    const x = JSON.parse(
      readFileSync('examples/sync-envelope.synthetic.json', 'utf8'),
    );
    expect(() => semanticSync(x)).not.toThrow();
    expect(() => semanticSync({ ...x, raw_text: 'secret' })).toThrow();
    x.candidates[0].evidence_ids = [crypto.randomUUID()];
    expect(() => semanticSync(x)).toThrow();
  });
});
it('signed ingestion remains proposal-only and explicit approval is idempotent', async () => {
  const src = await data(
    await call('/sources', 'POST', {
      display_name: 'Synthetic group',
      kind: 'whatsapp_notification',
    }),
  );
  const cred = await data(
    await call('/collector-credentials', 'POST', { source_id: src.id }),
  );
  const v = JSON.parse(
    readFileSync('examples/sync-envelope.synthetic.json', 'utf8'),
  );
  v.source_id = src.id;
  const send = async (extra = {}) => {
    const raw = JSON.stringify({ ...v, ...extra }),
      stamp = String(Math.floor(Date.now() / 1000)),
      nonce = crypto.randomUUID(),
      hash = await sha256(raw);
    return app.fetch(
      new Request('https://academic.test/api/v1/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Collector-Key-Id': cred.id,
          'X-Request-Timestamp': stamp,
          'X-Nonce': nonce,
          'X-Body-SHA256': hash,
          'X-Signature': await hmac(
            cred.secret,
            ['POST', '/api/v1/sync', stamp, nonce, hash].join('\n'),
          ),
        },
        body: raw,
      }),
      env,
    );
  };
  await data(await send());
  expect(
    (
      await db
        .prepare('SELECT id FROM tasks WHERE title=?')
        .bind(v.candidates[0].fields.title)
        .all()
    ).results,
  ).toHaveLength(0);
  await data(await send());
  const c = (await data(await call('/candidates')))[0];
  const key = crypto.randomUUID();
  const review = { action: 'accept', expected_candidate_version: 1 };
  const approved = await data(
    await call('/candidates/' + c.id + '/review', 'POST', review, {
      'Idempotency-Key': key,
    }),
  );
  expect(approved.task_id).toBeTruthy();
  expect(
    (
      await data(
        await call('/candidates/' + c.id + '/review', 'POST', review, {
          'Idempotency-Key': key,
        }),
      )
    ).task_id,
  ).toBe(approved.task_id);
  expect(
    (
      await call('/candidates/' + c.id + '/review', 'POST', review, {
        'Idempotency-Key': crypto.randomUUID(),
      })
    ).status,
  ).toBe(409);
});

it('a losing deadline edit cannot schedule its reminders', async () => {
  const due = (day: string) => ({
    precision: 'datetime',
    local_date: null,
    local_datetime: `2026-11-${day}T23:00:00`,
    timezone: 'Asia/Makassar',
  });
  const task = await data(
    await call(
      '/tasks',
      'POST',
      { title: 'Concurrent due', due: due('12') },
      { 'Idempotency-Key': crypto.randomUUID() },
    ),
  );
  const results = await Promise.all([
    call('/tasks/' + task.id, 'PATCH', { due: due('14') }, { 'If-Match': '1' }),
    call('/tasks/' + task.id, 'PATCH', { due: due('15') }, { 'If-Match': '1' }),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  const current = await data(await call('/tasks/' + task.id));
  const pending = await db
    .prepare(
      "SELECT * FROM reminder_intents WHERE task_id=? AND state='pending'",
    )
    .bind(task.id)
    .all<any>();
  expect(pending.results).toHaveLength(2);
  const scheduled = pending.results.map((r) => r.scheduled_for_utc).sort();
  const deadline = Date.parse(current.due_at_utc);
  expect(scheduled).toEqual(
    [24, 3].map((h) => new Date(deadline - h * 3600000).toISOString()).sort(),
  );
});
