import { beforeAll, afterAll, beforeEach, expect, test } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
import { createApp, type Env } from '../../apps/worker/src/index';
import { EXPORT_TABLES } from '../../apps/worker/src/export';
let mf: Miniflare, db: D1Database, env: Env;
const app = createApp(async (r) => r.headers.get('X-Synthetic-Owner') === '1');
const request = (query: string, owner = true) =>
  app.fetch(
    new Request('https://selection.synthetic/api/v1/export' + query, {
      headers: owner ? { 'X-Synthetic-Owner': '1' } : {},
    }),
    env,
  );
beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("synthetic")}}',
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
  await db.batch(
    [
      '=cmd',
      'comma,quote"',
      'newline\nfield',
      '\rcarriage',
      '+formula',
      '@formula',
      '\tformula',
    ].map((title, i) =>
      db
        .prepare(
          "INSERT INTO tasks(id,title,kind,status,priority,due_json,created_at,updated_at) VALUES(?,?,'personal_action','todo','normal','{}','2030-01-01T00:00:00Z','2030-01-01T00:00:00Z')",
        )
        .bind('synthetic-' + i, title),
    ),
  );
});
beforeEach(async () => {
  await db.prepare('DELETE FROM operational_usage').run();
  env = {
    DB: db,
    OWNER_SUB: 'synthetic',
    ACCESS_TEAM: 'UNCONFIGURED',
    ACCESS_AUD: 'UNCONFIGURED',
  };
});
afterAll(() => mf.dispose());
test('every canonical table can be selected without widening the export allowlist', async () => {
  for (const table of EXPORT_TABLES) {
    await db.prepare('DELETE FROM operational_usage').run();
    const response = await request('?format=json&table=' + table);
    expect(response.status).toBe(200);
    const value = (await response.json()) as any;
    expect(Object.keys(value.data.tables)).toEqual([table]);
    expect(value.data.partial).toBe(true);
  }
  for (const table of [
    'collector_credentials',
    'replay_nonces',
    'push_subscriptions',
    'tasks;DROP TABLE tasks',
    '',
  ]) {
    await db.prepare('DELETE FROM operational_usage').run();
    const response = await request('?table=' + encodeURIComponent(table));
    expect(response.status).toBe(422);
  }
  expect((await request('?table=tasks&table=sources')).status).toBe(422);
});
test('selected CSV preserves quoted cells, CRLF and all formula neutralization prefixes', async () => {
  const response = await request('?format=csv&table=tasks');
  expect(response.status).toBe(200);
  const body = await response.text();
  expect(response.headers.get('X-Academic-OS-Export-Scope')).toBe(
    'table:tasks',
  );
  expect(body).toContain('"tasks.title"');
  expect(body).not.toContain('"source_items.');
  for (const value of [
    '"\'=cmd"',
    '"comma,quote"""',
    '"newline\nfield"',
    '"\'\rcarriage"',
    '"\'+formula"',
    '"\'@formula"',
    '"\'\tformula"',
  ])
    expect(body).toContain(value);
  expect(body.endsWith('\r\n')).toBe(true);
});
test('row ceilings return a clean JSON 413 before streaming any CSV bytes', async () => {
  for (const format of ['csv', 'json']) {
    await db.prepare('DELETE FROM operational_usage').run();
    env.EXPORT_MAX_ROWS = '6';
    const response = await request('?format=' + format + '&table=tasks');
    expect(response.status).toBe(413);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    const value = (await response.json()) as any;
    expect(value.error.code).toBe('EXPORT_TOO_LARGE');
    expect(value.error.limit).toBe(6);
  }
  await db.prepare('DELETE FROM operational_usage').run();
  env.EXPORT_MAX_ROWS = '7';
  expect((await request('?format=csv&table=tasks')).status).toBe(200);
  await db.prepare('DELETE FROM operational_usage').run();
  env.EXPORT_MAX_ROWS = '0';
  expect((await request('?format=json')).status).toBe(503);
});
test('selective exports retain owner authorization and durable export budgeting', async () => {
  expect((await request('?format=csv&table=tasks', false)).status).toBe(401);
  const bucket = new Date().toISOString().slice(0, 16);
  await db
    .prepare("INSERT INTO operational_usage VALUES(?,'export',4)")
    .bind(bucket)
    .run();
  expect((await request('?format=json&table=tasks')).status).toBe(429);
});
