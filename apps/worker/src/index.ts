import { owner, sha256, hmac, equal, type AuthEnv } from './auth';
import {
  Invalid,
  validateDue,
  reminderTimes,
  semanticSync,
  unknownDue,
  type Due,
} from '../../../packages/contracts/src/index';
export interface Env extends AuthEnv {
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
function result(data: unknown, status = 200) {
  const meta = { request_id: uuid(), server_time: now() };
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
async function body(req: Request) {
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
      if (size > 262144) {
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
function intents(
  db: D1Database,
  id: string,
  due: Due,
  revision: number,
  guard?: string,
) {
  return reminderTimes(due).map((t) =>
    guard
      ? db
          .prepare(
            'INSERT OR IGNORE INTO reminder_intents(id,task_id,due_revision,scheduled_for_utc) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM tasks WHERE id=? AND mutation_id=?)',
          )
          .bind(uuid(), id, revision, t, id, guard)
      : db
          .prepare(
            'INSERT OR IGNORE INTO reminder_intents(id,task_id,due_revision,scheduled_for_utc) VALUES(?,?,?,?)',
          )
          .bind(uuid(), id, revision, t),
  );
}
export async function tick(db: D1Database, at = now()) {
  // Inbox is the durable delivery channel. One atomic transaction; external push is deliberately unconfigured.
  const cutoff = new Date(Date.parse(at) - 6 * 3600000).toISOString();
  await db
    .prepare(
      "UPDATE reminder_intents SET state='canceled' WHERE state='pending' AND scheduled_for_utc<?",
    )
    .bind(cutoff)
    .run();
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
async function sync(req: Request, env: Env) {
  const { raw, value: v } = await body(req);
  const keyId = req.headers.get('X-Collector-Key-Id') ?? '';
  const stamp = req.headers.get('X-Request-Timestamp') ?? '';
  const nonce = req.headers.get('X-Nonce') ?? '';
  const signature = req.headers.get('X-Signature') ?? '';
  const cred = await env.DB.prepare(
    'SELECT * FROM collector_credentials WHERE id=? AND revoked=0',
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
    ['POST', '/api/v1/sync', stamp, nonce, digest].join('\n'),
  );
  if (
    !equal(expected, signature) ||
    req.headers.get('X-Body-SHA256') !== digest
  )
    throw new Http(403, 'ACCESS_DENIED');
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
  try {
    await env.DB.prepare('INSERT INTO replay_nonces VALUES(?,?,?)')
      .bind(keyId, nonce, Number(stamp))
      .run();
  } catch {
    throw new Http(409, 'REPLAY_DETECTED');
  }
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
export function createApp(authorize: typeof owner = owner) {
  return {
    async fetch(req: Request, env: Env): Promise<Response> {
      try {
        const url = new URL(req.url);
        const path = url.pathname;
        const db = env.DB;
        if (!path.startsWith('/api/'))
          return env.ASSETS
            ? env.ASSETS.fetch(req)
            : new Response('Academic OS', { status: 200 });
        if (path === '/api/v1/sync' && req.method === 'POST')
          return await sync(req, env);
        if (!(await authorize(req, env))) throw new Http(401, 'AUTH_REQUIRED');
        if (
          !['GET', 'HEAD'].includes(req.method) &&
          req.headers.get('Origin') !== url.origin
        )
          throw new Http(403, 'INVALID_ORIGIN');
        const p = path.replace('/api/v1', '');
        const method = req.method;
        if (p === '/me' && method === 'GET')
          return result({ subject: env.OWNER_SUB });
        if (p === '/health' && method === 'GET')
          return result({
            cloud: 'online',
            push: 'not_configured',
            collector: 'last_reported_only',
          });
        if (p === '/contexts' && method === 'GET')
          return result(
            (
              await db
                .prepare('SELECT * FROM contexts WHERE archived_at IS NULL')
                .all()
            ).results,
          );
        if (p === '/contexts' && method === 'POST') {
          const { value: v } = await body(req);
          if (!['academic', 'organization', 'personal'].includes(v.type))
            throw new Http(422, 'INVALID_PAYLOAD');
          const id = uuid();
          await db
            .prepare('INSERT INTO contexts(id,type,display_name) VALUES(?,?,?)')
            .bind(id, v.type, text(v.display_name))
            .run();
          return result(
            { id, type: v.type, display_name: v.display_name, version: 1 },
            201,
          );
        }
        if (
          (p === '/tasks' && method === 'GET') ||
          (p === '/search' && method === 'GET')
        ) {
          const limit = Math.min(
            100,
            Math.max(1, Number(url.searchParams.get('limit')) || 50),
          );
          const q = (url.searchParams.get('q') ?? '')
            .slice(0, 200)
            .replace(/[\\%_]/g, '\\$&');
          const rows = await db
            .prepare(
              "SELECT * FROM tasks WHERE deleted_at IS NULL AND title LIKE ? ESCAPE '\\' ORDER BY updated_at DESC,id LIMIT ?",
            )
            .bind('%' + q + '%', limit)
            .all();
          return result(rows.results.map(task));
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
            ...intents(db, id, fields.due, 1),
          ]);
          return result(await getTask(db, id), 201);
        }
        const tm = p.match(/^\/tasks\/([^/]+)$/);
        if (tm) {
          const current = await getTask(db, tm[1]);
          if (method === 'GET') return result(current);
          if (method === 'PATCH' || method === 'DELETE') {
            const expected = version(req);
            const v = method === 'PATCH' ? (await body(req)).value : {};
            const fields = taskFields({ ...current, ...v });
            const revision = current.due_revision + 1;
            const at = now();
            const mutation = uuid();
            const ops = [
              db
                .prepare(
                  'UPDATE tasks SET title=?,description=?,context_id=?,kind=?,status=?,priority=?,due_json=?,due_at_utc=?,version=version+1,due_revision=?,mutation_id=?,updated_at=?,deleted_at=? WHERE id=? AND version=? AND deleted_at IS NULL',
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
              !['done', 'archived'].includes(fields.status)
            )
              ops.push(...intents(db, tm[1], fields.due, revision, mutation));
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
          const { value: v } = await body(req);
          if (
            ![
              'whatsapp_export',
              'whatsapp_notification',
              'moodle_ical',
            ].includes(v.kind)
          )
            throw new Http(422, 'INVALID_PAYLOAD');
          const id = uuid();
          await db
            .prepare('INSERT INTO sources(id,display_name,kind) VALUES(?,?,?)')
            .bind(id, text(v.display_name), v.kind)
            .run();
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
        if (p === '/candidates' && method === 'GET')
          return result(
            (
              await db
                .prepare(
                  "SELECT * FROM candidates WHERE review_status IN ('pending','needs_clarification') LIMIT 100",
                )
                .all<any>()
            ).results.map((c) => ({
              ...c,
              fields: JSON.parse(c.fields_json),
              issues: JSON.parse(c.issues_json),
              fields_json: undefined,
              issues_json: undefined,
            })),
          );
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
            return result({ task_id: prev.result_id });
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
          const ops = [
            db
              .prepare(
                "UPDATE candidates SET review_status=?,version=version+1,accepted_action=?,result_task_id=?,updated_at=? WHERE id=? AND version=? AND review_status IN ('pending','needs_clarification')",
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
                  'UPDATE tasks SET title=?,description=?,due_json=?,due_at_utc=?,version=version+1,due_revision=due_revision+1,mutation_id=?,updated_at=? WHERE id=? AND version=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM candidates WHERE id=? AND accepted_action=?)',
                )
                .bind(
                  fields.title,
                  fields.description,
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
                  'INSERT INTO tasks(id,context_id,title,kind,description,status,priority,due_json,due_at_utc,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM candidates WHERE id=? AND accepted_action=?)',
                )
                .bind(
                  id,
                  fields.context_id,
                  fields.title,
                  fields.kind,
                  fields.description,
                  'todo',
                  fields.priority,
                  JSON.stringify(fields.due),
                  fields.due_at_utc,
                  at,
                  at,
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
              .bind(scope, key, digest, id, c.id, action),
          );
          if (fields)
            ops.push(
              ...intents(
                db,
                id,
                fields.due,
                target ? target.due_revision + 1 : 1,
                target ? action : 'created',
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
        if (p === '/history' && method === 'GET')
          return result(
            (
              await db
                .prepare('SELECT * FROM task_events ORDER BY id DESC LIMIT 100')
                .all()
            ).results,
          );
        if (p === '/briefing' && method === 'GET') {
          const rows = await db
            .prepare(
              'SELECT status,count(*) count FROM tasks WHERE deleted_at IS NULL GROUP BY status',
            )
            .all();
          return result({ counts: rows.results, generated_at: now() });
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
        const settingsMatch = p === '/settings';
        if (settingsMatch && method === 'PATCH') {
          const { value: v } = await body(req);
          if (
            !['id', 'en'].includes(v.language) ||
            !['light', 'dark'].includes(v.theme)
          )
            throw new Http(422, 'INVALID_PAYLOAD');
          try {
            new Intl.DateTimeFormat('en', { timeZone: v.timezone });
          } catch {
            throw new Http(422, 'INVALID_TIMEZONE');
          }
          const r = await db
            .prepare(
              'UPDATE settings SET value_json=?,version=version+1 WHERE id=1 AND version=?',
            )
            .bind(
              JSON.stringify({
                language: v.language,
                theme: v.theme,
                timezone: v.timezone,
              }),
              version(req),
            )
            .run();
          if (!r.meta.changes) throw new Http(409, 'VERSION_CONFLICT');
          return result({ updated: true });
        }
        const rm = p.match(/^\/reminders\/([^/]+)\/read$/);
        if (rm && method === 'PATCH') {
          await db
            .prepare('UPDATE notification_inbox SET read_at=? WHERE id=?')
            .bind(now(), rm[1])
            .run();
          return result({ read: true });
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
          const { value: v } = await body(req);
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
                'UPDATE sources SET purged_at=?,generation=generation+1,paused=1 WHERE id=?',
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
          if (v.task_policy === 'delete')
            ops.push(
              db
                .prepare(
                  'UPDATE tasks SET deleted_at=?,updated_at=?,version=version+1 WHERE id IN (SELECT te.task_id FROM task_evidence te JOIN source_items si ON si.id=te.source_item_id WHERE si.source_id=?) AND NOT EXISTS(SELECT 1 FROM task_evidence te2 JOIN source_items si2 ON si2.id=te2.source_item_id WHERE te2.task_id=tasks.id AND si2.source_id<>? AND si2.removed_at IS NULL)',
                )
                .bind(at, at, src.id, src.id),
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
          await db.batch(ops);
          return result({ cloud_purged: true, local_wipe_pending: true });
        }
        if (p === '/export' && method === 'GET') {
          const tables = [
            'contexts',
            'tasks',
            'task_events',
            'sources',
            'source_items',
            'candidates',
            'candidate_evidence',
            'review_actions',
            'source_tombstones',
            'settings',
            'task_evidence',
          ];
          const rows = await db.batch(
            tables.map((t) => db.prepare('SELECT * FROM ' + t)),
          );
          return result({
            schema_version: '2.0',
            exported_at: now(),
            tables: Object.fromEntries(
              tables.map((t, i) => [t, rows[i].results]),
            ),
          });
        }
        throw new Http(404, 'NOT_FOUND');
      } catch (e) {
        if (e instanceof Http)
          return result({ error: { code: e.code } }, e.status);
        if (e instanceof Error && e.message.includes('mutation_guards'))
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
    await tick(env.DB);
  },
};
