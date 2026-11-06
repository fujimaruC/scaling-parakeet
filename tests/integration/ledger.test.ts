import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
import { createApp, tick, type Env } from '../../apps/worker/src/index';
import { sha256, hmac } from '../../apps/worker/src/auth';
import {
  validateDue,
  unknownDue,
  toUtc,
  semanticSync,
  quietHoursEnd,
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
  for (const file of readdirSync('apps/worker/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync('apps/worker/migrations/' + file, 'utf8');
    for (const statement of sql.trim().split(/;\n/))
      if (statement.trim()) await db.prepare(statement).run();
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

it('title-only edits preserve reminder revision and do not re-alert', async () => {
  const task = await data(
    await call(
      '/tasks',
      'POST',
      {
        title: 'Title before',
        due: {
          precision: 'date_only',
          local_date: '2026-11-20',
          local_datetime: null,
          timezone: 'Asia/Makassar',
        },
      },
      { 'Idempotency-Key': crypto.randomUUID() },
    ),
  );
  const changed = await data(
    await call(
      '/tasks/' + task.id,
      'PATCH',
      { title: 'Title after' },
      { 'If-Match': '1' },
    ),
  );
  expect(changed.due_revision).toBe(task.due_revision);
  const reminders = await db
    .prepare('SELECT * FROM reminder_intents WHERE task_id=?')
    .bind(task.id)
    .all();
  expect(reminders.results).toHaveLength(1);
});
it('snooze retries are idempotent and completed tasks cannot snooze', async () => {
  const task = await data(
    await call(
      '/tasks',
      'POST',
      { title: 'Snooze synthetic' },
      { 'Idempotency-Key': crypto.randomUUID() },
    ),
  );
  const entry = crypto.randomUUID();
  await db
    .prepare(
      'INSERT INTO notification_inbox(id,intent_id,task_id,created_at) VALUES(?,?,?,?)',
    )
    .bind(entry, crypto.randomUUID(), task.id, new Date().toISOString())
    .run();
  const key = crypto.randomUUID(),
    value = { until: new Date(Date.now() + 3600000).toISOString() };
  const once = await data(
    await call('/reminders/' + entry + '/snooze', 'POST', value, {
      'Idempotency-Key': key,
    }),
  );
  expect(
    (
      await data(
        await call('/reminders/' + entry + '/snooze', 'POST', value, {
          'Idempotency-Key': key,
        }),
      )
    ).intent_id,
  ).toBe(once.intent_id);
  await data(
    await call(
      '/tasks/' + task.id,
      'PATCH',
      { status: 'done' },
      { 'If-Match': '1' },
    ),
  );
  expect(
    (
      await call(
        '/reminders/' + entry + '/snooze',
        'POST',
        { until: new Date(Date.now() + 7200000).toISOString() },
        { 'Idempotency-Key': crypto.randomUUID() },
      )
    ).status,
  ).toBe(409);
});
it('deadline-change approval requires explicit current target and preserves history', async () => {
  const task = await data(
    await call(
      '/tasks',
      'POST',
      { title: 'Original deadline' },
      { 'Idempotency-Key': crypto.randomUUID() },
    ),
  );
  const source = crypto.randomUUID(),
    evidence = crypto.randomUUID(),
    candidate = crypto.randomUUID(),
    at = new Date().toISOString();
  const fields = {
    kind: 'deadline_change',
    title: 'Deadline updated',
    due: {
      precision: 'date_only',
      local_date: '2026-11-25',
      local_datetime: null,
      timezone: 'Asia/Makassar',
    },
    priority: 'normal',
  };
  await db.batch([
    db
      .prepare('INSERT INTO sources(id,display_name,kind) VALUES(?,?,?)')
      .bind(source, 'Synthetic deadline source', 'whatsapp_export'),
    db
      .prepare(
        'INSERT INTO source_items(id,source_id,generation,observed_at,local_evidence_available) VALUES(?,?,1,?,1)',
      )
      .bind(evidence, source, at),
    db
      .prepare(
        "INSERT INTO candidates(id,source_id,generation,fields_json,issues_json,created_at,updated_at) VALUES(?,?,1,?,'[]',?,?)",
      )
      .bind(candidate, source, JSON.stringify(fields), at, at),
    db
      .prepare('INSERT INTO candidate_evidence VALUES(?,?)')
      .bind(candidate, evidence),
  ]);
  const review = { action: 'accept_with_edits', expected_candidate_version: 1 };
  expect(
    (
      await call('/candidates/' + candidate + '/review', 'POST', review, {
        'Idempotency-Key': crypto.randomUUID(),
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await call(
        '/candidates/' + candidate + '/review',
        'POST',
        { ...review, target_task_id: task.id, expected_task_version: 99 },
        { 'Idempotency-Key': crypto.randomUUID() },
      )
    ).status,
  ).toBe(409);
  const accepted = await data(
    await call(
      '/candidates/' + candidate + '/review',
      'POST',
      {
        ...review,
        target_task_id: task.id,
        expected_task_version: 1,
        task_patch: { priority: 'high' },
      },
      { 'Idempotency-Key': crypto.randomUUID() },
    ),
  );
  expect(accepted.task_id).toBe(task.id);
  const current = await data(await call('/tasks/' + task.id));
  expect(current.due.local_date).toBe('2026-11-25');
  expect(current.priority).toBe('high');
  expect(current.title).toBe('Original deadline');
  expect(
    (
      await db
        .prepare('SELECT * FROM task_events WHERE task_id=?')
        .bind(task.id)
        .all()
    ).results,
  ).toHaveLength(2);
});

it('source purge scrubs sole-source tasks, preserves manual edits, and accepts a scoped local wipe acknowledgment', async () => {
  const source = await data(
    await call('/sources', 'POST', {
      display_name: 'Synthetic purge alias',
      kind: 'whatsapp_export',
    }),
  );
  const cred = await data(
    await call('/collector-credentials', 'POST', { source_id: source.id }),
  );
  const ids: string[] = [];
  for (let i = 0; i < 2; i++) {
    const evidence = crypto.randomUUID(),
      candidate = crypto.randomUUID(),
      at = new Date().toISOString();
    const fields = {
      title: 'Private derived purge duty ' + i,
      kind: 'organizational_duty',
      due: unknownDue,
      priority: 'normal',
    };
    await db.batch([
      db
        .prepare(
          'INSERT INTO source_items(id,source_id,generation,observed_at,local_evidence_available) VALUES(?,?,1,?,1)',
        )
        .bind(evidence, source.id, at),
      db
        .prepare(
          "INSERT INTO candidates(id,source_id,generation,fields_json,issues_json,created_at,updated_at) VALUES(?,?,1,?,'[]',?,?)",
        )
        .bind(candidate, source.id, JSON.stringify(fields), at, at),
      db
        .prepare('INSERT INTO candidate_evidence VALUES(?,?)')
        .bind(candidate, evidence),
    ]);
    ids.push(
      (
        await data(
          await call(
            '/candidates/' + candidate + '/review',
            'POST',
            { action: 'accept', expected_candidate_version: 1 },
            { 'Idempotency-Key': crypto.randomUUID() },
          ),
        )
      ).task_id,
    );
  }
  await data(
    await call(
      '/tasks/' + ids[1],
      'PATCH',
      { title: 'Owner independent duty' },
      { 'If-Match': '1' },
    ),
  );
  await data(
    await call('/sources/' + source.id + '/purge', 'POST', {
      expected_generation: 1,
      task_policy: 'delete',
    }),
  );
  expect((await call('/tasks/' + ids[0])).status).toBe(404);
  expect((await data(await call('/tasks/' + ids[1]))).title).toBe(
    'Owner independent duty',
  );
  expect(
    JSON.stringify((await data(await call('/export'))).tables),
  ).not.toContain('Private derived purge duty 0');
  async function signed(path: string, method = 'GET', v?: any) {
    const raw = v ? JSON.stringify(v) : '',
      stamp = String(Math.floor(Date.now() / 1000)),
      nonce = crypto.randomUUID(),
      digest = await sha256(raw);
    return app.fetch(
      new Request('https://academic.test' + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Collector-Key-Id': cred.id,
          'X-Request-Timestamp': stamp,
          'X-Nonce': nonce,
          'X-Body-SHA256': digest,
          'X-Signature': await hmac(
            cred.secret,
            [method, path.split('?')[0], stamp, nonce, digest].join('\n'),
          ),
        },
        body: method === 'GET' ? undefined : raw,
      }),
      env,
    );
  }
  const status = await data(
    await signed('/api/v1/sync/status?source_id=' + source.id),
  );
  expect(status.purge_required).toBe(true);
  expect(
    (await signed('/api/v1/sync/status?source_id=' + crypto.randomUUID()))
      .status,
  ).toBe(403);
  await data(
    await signed('/api/v1/sync/purge-ack', 'POST', {
      source_id: source.id,
      generation: 2,
    }),
  );
  expect(
    (await data(await call('/sources/' + source.id + '/purge-status')))
      .local_wipe_pending,
  ).toBe(false);
});
it('task pagination has no duplicates and applies context/status filters', async () => {
  const context = await data(
    await call('/contexts', 'POST', {
      display_name: 'Pagination fixture',
      type: 'academic',
    }),
  );
  for (let i = 0; i < 5; i++)
    await data(
      await call(
        '/tasks',
        'POST',
        { title: 'Page task ' + i, context_id: context.id },
        { 'Idempotency-Key': crypto.randomUUID() },
      ),
    );
  let cursor: string | null = null;
  const seen = new Set<string>();
  do {
    const response = await call(
      '/tasks?context_id=' +
        context.id +
        '&status=todo&limit=2' +
        (cursor ? '&cursor=' + cursor : ''),
    );
    const value: any = await response.json();
    expect(response.status).toBe(200);
    for (const row of value.data) {
      expect(seen.has(row.id)).toBe(false);
      seen.add(row.id);
      expect(row.context_id).toBe(context.id);
    }
    cursor = value.meta.next_cursor;
  } while (cursor);
  expect(seen.size).toBe(5);
  expect((await call('/tasks?cursor=invalid')).status).toBe(422);
});
it('configurable reminder rules rebuild future intents without changing deadline precision', async () => {
  const settings = await data(await call('/settings'));
  const task = await data(
    await call(
      '/tasks',
      'POST',
      {
        title: 'Future policy task',
        due: {
          precision: 'datetime',
          local_date: null,
          local_datetime: '2030-01-15T12:00:00',
          timezone: 'Asia/Makassar',
        },
      },
      { 'Idempotency-Key': crypto.randomUUID() },
    ),
  );
  const policy = { enabled: true, offset_hours: [2], date_only_hour: 8 };
  await data(
    await call('/settings/reminders', 'PATCH', policy, {
      'If-Match': String(settings.version),
    }),
  );
  for (let i = 0; i < 4; i++) await tick(db, new Date().toISOString());
  const after = await data(await call('/tasks/' + task.id));
  expect(after.due).toEqual(task.due);
  const pending = await db
    .prepare(
      "SELECT * FROM reminder_intents WHERE task_id=? AND state='pending'",
    )
    .bind(task.id)
    .all<any>();
  expect(pending.results).toHaveLength(1);
  expect(pending.results[0].scheduled_for_utc).toBe('2030-01-15T02:00:00.000Z');
  expect(
    (
      await call('/settings/reminders', 'PATCH', policy, {
        'If-Match': String(settings.version),
      })
    ).status,
  ).toBe(409);
  const next = await data(await call('/settings'));
  await data(
    await call(
      '/settings/reminders',
      'PATCH',
      { ...policy, enabled: false },
      { 'If-Match': String(next.version) },
    ),
  );
  for (let i = 0; i < 4; i++) await tick(db, new Date().toISOString());
  expect(
    (
      await db
        .prepare(
          "SELECT * FROM reminder_intents WHERE task_id=? AND state='pending'",
        )
        .bind(task.id)
        .all()
    ).results,
  ).toHaveLength(0);
});
it('quiet hours defer and coalesce reminders without changing deadlines, including daylight-saving boundaries', async () => {
  const quiet = {
    enabled: true,
    start_hour: 22,
    end_hour: 7,
    timezone: 'Asia/Makassar',
  };
  expect(quietHoursEnd('2030-01-15T15:30:00Z', quiet)).toBe(
    '2030-01-15T23:00:00.000Z',
  );
  expect(quietHoursEnd('2030-01-15T23:00:00Z', quiet)).toBeNull();
  expect(
    quietHoursEnd('2026-03-08T06:30:00Z', {
      ...quiet,
      end_hour: 2,
      timezone: 'America/New_York',
    }),
  ).toBe('2026-03-08T07:00:00.000Z');
  expect(
    quietHoursEnd('2026-11-01T04:30:00Z', {
      ...quiet,
      end_hour: 2,
      timezone: 'America/New_York',
    }),
  ).toBe('2026-11-01T07:00:00.000Z');
  const settings = await data(await call('/settings'));
  await data(
    await call(
      '/settings/reminders',
      'PATCH',
      {
        enabled: true,
        offset_hours: [12, 11],
        date_only_hour: 9,
        quiet_hours: quiet,
      },
      { 'If-Match': String(settings.version) },
    ),
  );
  const task = await data(
    await call(
      '/tasks',
      'POST',
      {
        title: 'Quiet hours duty',
        due: {
          precision: 'datetime',
          local_date: null,
          local_datetime: '2030-01-16T10:00:00',
          timezone: 'Asia/Makassar',
        },
      },
      { 'Idempotency-Key': crypto.randomUUID() },
    ),
  );
  await tick(db, '2030-01-15T15:30:00.000Z');
  const pending = await db
    .prepare(
      "SELECT * FROM reminder_intents WHERE task_id=? AND state='pending'",
    )
    .bind(task.id)
    .all<any>();
  expect(pending.results).toHaveLength(1);
  expect(pending.results[0].scheduled_for_utc).toBe('2030-01-15T23:00:00.000Z');
  expect(
    (
      await db
        .prepare('SELECT * FROM notification_inbox WHERE task_id=?')
        .bind(task.id)
        .all()
    ).results,
  ).toHaveLength(0);
  await tick(db, '2030-01-15T23:00:00.000Z');
  await tick(db, '2030-01-15T23:01:00.000Z');
  expect(
    (
      await db
        .prepare('SELECT * FROM notification_inbox WHERE task_id=?')
        .bind(task.id)
        .all()
    ).results,
  ).toHaveLength(1);
  expect((await data(await call('/tasks/' + task.id))).due).toEqual(task.due);
});

it('device actions require explicit attestations and expiry/retirement never confirm', async () => {
  const { relayActions, actionView } =
    await import('../../apps/worker/src/device-actions');
  const source = await data(
    await call('/sources', 'POST', {
      display_name: 'Control fixture',
      kind: 'whatsapp_notification',
    }),
  );
  const device = crypto.randomUUID();
  await relayActions(db, source, { devices: [device], observations: [] });
  await data(
    await call('/sources/' + source.id + '/purge', 'POST', {
      expected_generation: 1,
      task_policy: 'retain_as_manual',
    }),
  );
  const revoked = await db
    .prepare('SELECT * FROM sources WHERE id=?')
    .bind(source.id)
    .first<any>();
  const snapshot = () =>
    relayActions(db, revoked, { devices: [device], observations: [] });
  let rows = await snapshot();
  expect(rows).toHaveLength(1);
  expect(rows[0].status).toBe('pending');
  expect(rows[0].progress).toBe('queued');
  expect(actionView(rows[0], '2099-01-01').status).toBe('expired');
  expect(actionView(rows[0], '2099-01-01').applied_at).toBeNull();
  await relayActions(db, revoked, {
    devices: [],
    observations: [{ device_id: device, generation: 2, phase: 'delivered' }],
  });
  rows = await snapshot();
  expect(rows[0].progress).toBe('delivered');
  expect(rows[0].status).toBe('pending');
  await data(
    await call('/device-actions/' + rows[0].id + '/retire', 'POST', {}),
  );
  rows = await snapshot();
  expect(rows[0].status).toBe('retired_unconfirmed');
  expect(rows[0].applied_at).toBeNull();
  await expect(
    relayActions(db, revoked, {
      devices: [],
      observations: [{ device_id: device, generation: 1, phase: 'applied' }],
    }),
  ).rejects.toThrow();
  await relayActions(db, revoked, {
    devices: [],
    observations: [{ device_id: device, generation: 2, phase: 'applied' }],
  });
  rows = await snapshot();
  expect(rows[0].status).toBe('confirmed');
  await relayActions(db, revoked, {
    devices: [],
    observations: [{ device_id: device, generation: 2, phase: 'delivered' }],
  });
  expect((await snapshot())[0].status).toBe('confirmed');
});
it('durable Linux receipt is queued until phone explicitly reports cleanup', async () => {
  const { relayActions } = await import('../../apps/worker/src/device-actions');
  const source = await data(
    await call('/sources', 'POST', {
      display_name: 'Receipt fixture',
      kind: 'whatsapp_notification',
    }),
  );
  const device = crypto.randomUUID(),
    batch = crypto.randomUUID();
  const send = (phase: string) =>
    relayActions(db, source, {
      devices: [device],
      observations: [],
      receipts: [{ device_id: device, batch_id: batch, generation: 1, phase }],
    });
  expect((await send('queued'))[0].progress).toBe('queued');
  expect((await send('delivered'))[0].applied_at).toBeNull();
  expect((await send('applied'))[0].status).toBe('confirmed');
  expect((await send('queued'))[0].status).toBe('confirmed');
});
