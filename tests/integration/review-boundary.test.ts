import { beforeAll, afterAll, afterEach, it, expect } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
import { createApp, type Env } from '../../apps/worker/src/index';
import { hmac, sha256 } from '../../apps/worker/src/auth';
let mf: Miniflare, db: D1Database, env: Env;
const origin = 'https://review.synthetic';
const app = createApp(async (r) => r.headers.get('X-Synthetic-Owner') === '1');
async function call(
  path: string,
  method = 'GET',
  value?: any,
  headers: Record<string, string> = {},
) {
  return app.fetch(
    new Request(origin + '/api/v1' + path, {
      method,
      headers: {
        Origin: origin,
        'X-Synthetic-Owner': '1',
        'Content-Type': 'application/json',
        ...headers,
      },
      body: value === undefined ? undefined : JSON.stringify(value),
    }),
    env,
  );
}
async function data(r: Response) {
  const body = (await r.json()) as any;
  expect(r.status, JSON.stringify(body)).toBeLessThan(300);
  return body.data;
}
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
  env = {
    DB: db,
    OWNER_SUB: 'synthetic',
    ACCESS_TEAM: 'UNCONFIGURED',
    ACCESS_AUD: 'UNCONFIGURED',
  };
});
afterAll(() => mf.dispose());
afterEach(async () => {
  await db.prepare('DELETE FROM operational_usage').run();
});
async function ingest(
  kind: string,
  due: string,
  candidateKind = 'deadline_change',
) {
  const source = await data(
    await call('/sources', 'POST', { display_name: 'Synthetic ' + kind, kind }),
  );
  const credential = await data(
    await call('/collector-credentials', 'POST', { source_id: source.id }),
  );
  const envelope = JSON.parse(
    readFileSync('examples/sync-envelope.synthetic.json', 'utf8'),
  );
  envelope.batch_id = crypto.randomUUID();
  envelope.idempotency_key = crypto.randomUUID();
  envelope.source_id = source.id;
  envelope.created_at = new Date().toISOString();
  envelope.items[0].evidence_id = crypto.randomUUID();
  const c = envelope.candidates[0];
  c.candidate_id = crypto.randomUUID();
  c.evidence_ids = [envelope.items[0].evidence_id];
  c.fields.kind = candidateKind;
  c.fields.title = 'Synthetic conflicting deadline';
  c.fields.due = {
    precision: 'date_only',
    local_date: due,
    local_datetime: null,
    timezone: 'Asia/Makassar',
  };
  c.source_decision_state = 'disputed';
  c.issue_codes = ['conflicting_due'];
  c.needs_review = true;
  const raw = JSON.stringify(envelope),
    stamp = String(Math.floor(Date.now() / 1000)),
    nonce = crypto.randomUUID().replaceAll('-', ''),
    digest = await sha256(raw);
  const signature = await hmac(
    credential.secret,
    ['POST', '/api/v1/sync', stamp, nonce, digest].join('\n'),
  );
  const r = await app.fetch(
    new Request(origin + '/api/v1/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Collector-Key-Id': credential.id,
        'X-Request-Timestamp': stamp,
        'X-Nonce': nonce,
        'X-Body-SHA256': digest,
        'X-Signature': signature,
      },
      body: raw,
    }),
    env,
  );
  await data(r);
  return {
    source,
    candidate: c.candidate_id,
    evidence: envelope.items[0].evidence_id,
  };
}
it('two sources retain disagreeing deadline claims until the owner explicitly chooses one, with versioned reminder recomputation', async () => {
  const originalDue = {
    precision: 'date_only',
    local_date: '2035-01-05',
    local_datetime: null,
    timezone: 'Asia/Makassar',
  };
  const task = await data(
    await call(
      '/tasks',
      'POST',
      {
        title: 'Synthetic Himpunan duty',
        kind: 'organizational_duty',
        due: originalDue,
      },
      { 'Idempotency-Key': crypto.randomUUID() },
    ),
  );
  const formal = await ingest('moodle_ical', '2035-01-15');
  const group = await ingest('whatsapp_export', '2035-01-20');
  const before = await data(await call('/tasks/' + task.id));
  expect(before.due).toEqual(originalDue);
  expect(before.version).toBe(1);
  const claimRows = await db
    .prepare(
      'SELECT id,source_id,fields_json,review_status FROM candidates WHERE id IN (?,?) ORDER BY id',
    )
    .bind(formal.candidate, group.candidate)
    .all<any>();
  expect(claimRows.results).toHaveLength(2);
  expect(new Set(claimRows.results.map((c) => c.source_id)).size).toBe(2);
  expect(claimRows.results.every((c) => c.review_status === 'pending')).toBe(
    true,
  );
  const review = (id: string, value: any) =>
    call('/candidates/' + id + '/review', 'POST', value, {
      'Idempotency-Key': crypto.randomUUID(),
    });
  const missingTarget = await review(group.candidate, {
    action: 'accept',
    expected_candidate_version: 1,
  });
  expect(missingTarget.status).toBe(422);
  expect(((await missingTarget.json()) as any).error.code).toBe(
    'TARGET_TASK_REQUIRED',
  );
  expect(
    (
      await review(group.candidate, {
        action: 'accept',
        expected_candidate_version: 1,
        target_task_id: task.id,
        expected_task_version: 99,
      })
    ).status,
  ).toBe(409);
  const chosen = await data(
    await review(group.candidate, {
      action: 'accept',
      expected_candidate_version: 1,
      target_task_id: task.id,
      expected_task_version: 1,
    }),
  );
  expect(chosen.task_id).toBe(task.id);
  const current = await data(await call('/tasks/' + task.id));
  expect(current.due.local_date).toBe('2035-01-20');
  expect(current.due_revision).toBe(2);
  const intents = await db
    .prepare('SELECT due_revision,state FROM reminder_intents WHERE task_id=?')
    .bind(task.id)
    .all<any>();
  expect(
    intents.results.some((r) => r.due_revision === 1 && r.state === 'canceled'),
  ).toBe(true);
  expect(
    intents.results.some((r) => r.due_revision === 2 && r.state === 'pending'),
  ).toBe(true);
  expect(
    (
      await review(formal.candidate, {
        action: 'accept',
        expected_candidate_version: 1,
        target_task_id: task.id,
        expected_task_version: 1,
      })
    ).status,
  ).toBe(409);
  await data(
    await review(formal.candidate, {
      action: 'reject',
      expected_candidate_version: 1,
      target_task_id: task.id,
      expected_task_version: 2,
    }),
  );
  const claims = await db
    .prepare(
      'SELECT fields_json,review_status FROM candidates WHERE id IN (?,?)',
    )
    .bind(formal.candidate, group.candidate)
    .all<any>();
  expect(
    claims.results.map((c) => JSON.parse(c.fields_json).due.local_date).sort(),
  ).toEqual(['2035-01-15', '2035-01-20']);
  expect(new Set(claims.results.map((c) => c.review_status))).toEqual(
    new Set(['accepted', 'rejected']),
  );
  expect((await data(await call('/tasks/' + task.id))).due.local_date).toBe(
    '2035-01-20',
  );
});
it('AI-shaped proposals with review flags and issues cannot perform a canonical write without an explicit owner review', async () => {
  const originalCount = (
    await db.prepare('SELECT count(*) n FROM tasks').first<any>()
  ).n;
  const p = await ingest('whatsapp_notification', '2035-02-01');
  expect(
    (await db.prepare('SELECT count(*) n FROM tasks').first<any>()).n,
  ).toBe(originalCount);
  const noOwner = await app.fetch(
    new Request(origin + '/api/v1/candidates/' + p.candidate + '/review', {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({ action: 'accept', expected_candidate_version: 1 }),
    }),
    env,
  );
  expect(noOwner.status).toBe(401);
  expect(
    (await db.prepare('SELECT count(*) n FROM tasks').first<any>()).n,
  ).toBe(originalCount);
  expect(
    (
      await db
        .prepare('SELECT review_status FROM candidates WHERE id=?')
        .bind(p.candidate)
        .first<any>()
    ).review_status,
  ).toBe('pending');
});

it('reject and clarify only audit a proposal; accept with edits alone creates the corrected canonical task', async () => {
  const baseline = (
    await db.prepare('SELECT count(*) n FROM tasks').first<any>()
  ).n;
  for (const action of ['reject', 'needs_clarification', 'accept_with_edits']) {
    const p = await ingest(
      'whatsapp_export',
      '2035-03-01',
      'organizational_duty',
    );
    const payload: any = { action, expected_candidate_version: 1 };
    if (action === 'accept_with_edits')
      payload.task_patch = {
        title: 'Owner corrected synthetic duty',
        priority: 'high',
      };
    const reply = await data(
      await call('/candidates/' + p.candidate + '/review', 'POST', payload, {
        'Idempotency-Key': crypto.randomUUID(),
      }),
    );
    const saved = await db
      .prepare('SELECT review_status,version FROM candidates WHERE id=?')
      .bind(p.candidate)
      .first<any>();
    expect(saved.review_status).toBe(
      action === 'reject'
        ? 'rejected'
        : action === 'needs_clarification'
          ? 'needs_clarification'
          : 'accepted',
    );
    expect(saved.version).toBe(2);
    expect(
      (
        await db
          .prepare('SELECT count(*) n FROM review_actions WHERE candidate_id=?')
          .bind(p.candidate)
          .first<any>()
      ).n,
    ).toBe(1);
    expect(
      (await db.prepare('SELECT count(*) n FROM tasks').first<any>()).n,
    ).toBe(baseline + (action === 'accept_with_edits' ? 1 : 0));
    if (action === 'accept_with_edits') {
      const task = await data(await call('/tasks/' + reply.task_id));
      expect(task.title).toBe('Owner corrected synthetic duty');
      expect(task.priority).toBe('high');
    }
  }
});
