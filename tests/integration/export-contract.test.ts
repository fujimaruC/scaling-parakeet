import { beforeAll, afterAll, afterEach, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createApp, type Env } from '../../apps/worker/src/index';
import { csvCell, EXPORT_TABLES } from '../../apps/worker/src/export';
let mf: Miniflare, db: D1Database, env: Env;
const origin = 'https://export.synthetic',
  app = createApp(async (r) => r.headers.get('X-Synthetic-Owner') === '1');
const call = (
  query = '',
  headers: Record<string, string> = { 'X-Synthetic-Owner': '1' },
) =>
  app.fetch(new Request(origin + '/api/v1/export' + query, { headers }), env);
beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    d1Databases: ['DB'],
  });
  db = (await mf.getD1Database('DB')) as unknown as D1Database;
  for (const file of readdirSync('apps/worker/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    for (const sql of readFileSync('apps/worker/migrations/' + file, 'utf8')
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
function parseCSV(value: string): string[][] {
  const result = spawnSync(
    'python',
    [
      '-c',
      'import csv,io,json,sys; print(json.dumps(list(csv.reader(io.StringIO(sys.stdin.read(),newline="")))))',
    ],
    { input: value, encoding: 'utf8' },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout);
}
it('CSV escapes RFC 4180 cells and neutralises every dangerous prefix before quoting', () => {
  const cases = [
    '=cmd',
    '+SUM(1,2)',
    '-1',
    '@SUM(A1)',
    '\tformula',
    '\rformula',
    'comma,field',
    'quote"field',
    'line\nfield',
    'carriage\rreturn',
    'Tugas العربية',
  ];
  const parsed = parseCSV(cases.map(csvCell).join(',') + '\r\n');
  expect(parsed).toHaveLength(1);
  expect(parsed[0]).toEqual(
    cases.map((s) => (/^[=+\-@\t\r]/.test(s) ? "'" + s : s)),
  );
});
it('CSV and JSON export exactly the same eleven tables with per-table parity and stable columns', async () => {
  const at = '2030-01-01T00:00:00Z';
  const titles = [
    '=cmd',
    'comma,field',
    'quote"field',
    'line\nfield',
    '\rcarriage',
    '+formula',
    '@formula',
  ];
  await db.batch([
    db.prepare(
      "INSERT INTO contexts(id,type,display_name) VALUES('org','organization','Synthetic Himpunan')",
    ),
    db.prepare(
      "INSERT INTO sources(id,display_name,kind) VALUES('source','Synthetic source','whatsapp_export')",
    ),
    db
      .prepare(
        "INSERT INTO source_items(id,source_id,generation,observed_at,local_evidence_available) VALUES('evidence','source',1,?,1)",
      )
      .bind(at),
    db
      .prepare(
        "INSERT INTO candidates(id,source_id,generation,fields_json,issues_json,created_at,updated_at) VALUES('candidate','source',1,'{}','[]',?,?)",
      )
      .bind(at, at),
    db.prepare("INSERT INTO candidate_evidence VALUES('candidate','evidence')"),
    db
      .prepare(
        "INSERT INTO review_actions VALUES('review','candidate','reject',?)",
      )
      .bind(at),
    db.prepare("INSERT INTO source_tombstones VALUES('source',0,?)").bind(at),
    ...titles.map((title, i) =>
      db
        .prepare(
          "INSERT INTO tasks(id,title,kind,status,priority,due_json,created_at,updated_at) VALUES(?,?,'personal_action','todo','normal',?,?,?)",
        )
        .bind(
          'task-' + i,
          title,
          JSON.stringify({
            precision: 'unknown',
            local_date: null,
            local_datetime: null,
            timezone: null,
          }),
          at,
          at,
        ),
    ),
    db.prepare(
      "INSERT INTO task_evidence VALUES('task-0','evidence','review')",
    ),
    db.prepare(
      "INSERT INTO collector_credentials VALUES('private','source','SYNTHETIC_CREDENTIAL_MUST_NOT_EXPORT',0)",
    ),
    db
      .prepare(
        "INSERT INTO push_subscriptions VALUES('push','https://fcm.googleapis.com/fcm/send/PRIVATE_SYNTHETIC_ENDPOINT',?,NULL,'synthetic-key')",
      )
      .bind(at),
  ]);
  const jsonResponse = await call('?format=json');
  expect(
    jsonResponse.status,
    'full eleven-table JSON export must succeed',
  ).toBe(200);
  const json = (await jsonResponse.json()) as any;
  expect(Object.keys(json.data.tables)).toEqual(EXPORT_TABLES);
  const response = await call('?format=csv');
  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  const raw = await response.text();
  const [header, ...rows] = parseCSV(raw);
  expect(raw.endsWith('\r\n')).toBe(true);
  expect(rows.every((r) => r.length === header.length)).toBe(true);
  const tableIndex = header.indexOf('table');
  for (const table of EXPORT_TABLES) {
    const selected = rows.filter((r) => r[tableIndex] === table);
    expect(selected.length, table).toBe(json.data.tables[table].length);
    expect(selected.length, table).toBeGreaterThan(0);
  }
  const titleIndex = header.indexOf('tasks.title');
  expect(
    rows.filter((r) => r[tableIndex] === 'tasks').map((r) => r[titleIndex]),
  ).toEqual(titles.map((t) => (/^[=+\-@\t\r]/.test(t) ? "'" + t : t)));
  for (const forbidden of [
    'SYNTHETIC_CREDENTIAL_MUST_NOT_EXPORT',
    'PRIVATE_SYNTHETIC_ENDPOINT',
    'collector_credentials.',
    'push_subscriptions.',
    'push_attempts.',
    'operational_usage.',
  ]) {
    expect(raw).not.toContain(forbidden);
    expect(JSON.stringify(json)).not.toContain(forbidden);
  }
  expect(parseCSV(await (await call('?format=csv')).text())[0]).toEqual(header);
});
it('export formats remain owner-only, budgeted and invalid formats fail closed', async () => {
  expect((await call('?format=csv', {})).status).toBe(401);
  expect((await call('?format=invalid')).status).toBe(422);
  const current = new Date().toISOString().slice(0, 16);
  await db
    .prepare(
      "INSERT INTO operational_usage VALUES(?,'export',4) ON CONFLICT(bucket,class) DO UPDATE SET requests=4",
    )
    .bind(current)
    .run();
  const blocked = await call('?format=csv');
  expect(blocked.status).toBe(429);
  expect(((await blocked.json()) as any).error.code).toBe(
    'REQUEST_BUDGET_EXCEEDED',
  );
});
