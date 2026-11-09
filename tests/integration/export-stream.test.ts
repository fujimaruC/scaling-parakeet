import { beforeEach, afterEach, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
import {
  readCanonical,
  streamCanonicalCSV,
  EXPORT_TABLES,
} from '../../apps/worker/src/export';
import { bufferedCSVReference } from '../fixtures/buffered-csv-reference';
let mf: Miniflare, db: D1Database;
const at = '2030-01-01T00:00:00Z';
beforeEach(async () => {
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
});
afterEach(() => mf.dispose());
async function populated() {
  await db.batch([
    db.prepare(
      "INSERT INTO contexts VALUES('org','organization','Synthetic',1,NULL)",
    ),
    db.prepare(
      "INSERT INTO sources(id,display_name,kind) VALUES('source','Synthetic','whatsapp_export')",
    ),
    db
      .prepare(
        `WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<599)
      INSERT INTO tasks(id,context_id,title,kind,status,priority,due_json,created_at,updated_at)
      SELECT printf('task-%04d',i),'org',CASE i WHEN 0 THEN '=cmd' WHEN 1 THEN 'comma,quote"' WHEN 2 THEN 'line'||char(10)||'العربية' ELSE 'Synthetic '||i END,'assignment','todo','normal','{}',?,? FROM n`,
      )
      .bind(at, at),
    db
      .prepare(
        "INSERT INTO source_items SELECT id,'source',1,?,NULL,1,NULL FROM tasks",
      )
      .bind(at),
    db
      .prepare(
        "INSERT INTO candidates(id,source_id,generation,fields_json,issues_json,created_at,updated_at) SELECT id,'source',1,'{}','[]',?,? FROM tasks",
      )
      .bind(at, at),
    db.prepare('INSERT INTO candidate_evidence SELECT id,id FROM tasks'),
    db
      .prepare("INSERT INTO review_actions SELECT id,id,'reject',? FROM tasks")
      .bind(at),
    db.prepare("INSERT INTO source_tombstones VALUES('source',0,?)").bind(at),
    db.prepare(
      "INSERT INTO task_evidence SELECT id,id,'synthetic-approval' FROM tasks",
    ),
  ]);
  await db
    .prepare("UPDATE tasks SET description=? WHERE id='task-0000'")
    .bind('Synthetic 🧪 '.repeat(4000))
    .run();
}
it('paged CSV is byte-identical to the frozen buffered writer for every table', async () => {
  await populated();
  const { snapshot, columns } = await readCanonical(db, at);
  const pages: number[] = [];
  let batches = 0,
    maxPageQueries = 0;
  const observed = {
    prepare: db.prepare.bind(db),
    batch: async (s: D1PreparedStatement[]) => {
      const r = await db.batch<any>(s);
      if (++batches > 1) {
        maxPageQueries = Math.max(maxPageQueries, r.length - 1);
        for (const p of r.slice(0, -1)) pages.push(p.results.length);
      }
      return r;
    },
  } as D1Database;
  const reader = (await streamCanonicalCSV(observed, at)).getReader();
  const parts: ArrayBuffer[] = [];
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    expect(next.value.byteLength).toBeLessThanOrEqual(16 * 1024);
    parts.push(new Uint8Array(next.value).buffer);
  }
  expect(await new Blob(parts).text()).toBe(
    bufferedCSVReference(snapshot, columns),
  );
  // Assertions stay OUTSIDE the observed callback: production correctly maps DB
  // exceptions to fixed errors, which would hide an assertion thrown inside it.
  expect(Math.max(...pages)).toBeLessThanOrEqual(256);
  expect(maxPageQueries).toBeLessThanOrEqual(8);
  expect(pages.some((n) => n === 256)).toBe(true);
  expect(pages.length).toBeGreaterThan(EXPORT_TABLES.length);
  expect(Object.values(snapshot.tables).every((rows) => rows.length > 0)).toBe(
    true,
  );
  const triggers = await db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'canonical_export_%'",
    )
    .all();
  expect(triggers.results).toHaveLength(EXPORT_TABLES.length * 3);
  for (const table of EXPORT_TABLES) {
    const before = await db
      .prepare('SELECT revision FROM canonical_export_revision')
      .first<any>();
    const pk = columns[table][0];
    await db
      .prepare('UPDATE "' + table + '" SET "' + pk + '"="' + pk + '"')
      .run();
    expect(
      (await db
        .prepare('SELECT revision FROM canonical_export_revision')
        .first<any>())!.revision,
    ).toBeGreaterThan(before!.revision);
  }
});
it('empty tables retain the identical header and are read in bounded pages', async () => {
  const { snapshot, columns } = await readCanonical(db, at);
  let empty = 0;
  const observed = {
    prepare: db.prepare.bind(db),
    batch: async (s: D1PreparedStatement[]) => {
      const r = await db.batch<any>(s);
      if (s.length === 2 && r[0].results.length === 0) empty++;
      return r;
    },
  } as D1Database;
  expect(
    await new Response(await streamCanonicalCSV(observed, at)).text(),
  ).toBe(bufferedCSVReference(snapshot, columns));
  expect(empty).toBe(EXPORT_TABLES.length - 1);
});
it('a canonical write and its reversal interrupt the stream instead of a clean successful EOF', async () => {
  await populated();
  const reader = (await streamCanonicalCSV(db, at)).getReader();
  await reader.read();
  await reader.read();
  await db
    .prepare(
      "UPDATE contexts SET display_name='Synthetic changed' WHERE id='org'",
    )
    .run();
  await db
    .prepare("UPDATE contexts SET display_name='Synthetic' WHERE id='org'")
    .run();
  const consume = async () => {
    while (!(await reader.read()).done) {
      /* consume until error or EOF */
    }
  };
  await expect(consume()).rejects.toThrow('EXPORT_SNAPSHOT_CHANGED');
});
it('page failures are fixed-code stream errors and cancellation does not fetch the ledger', async () => {
  let calls = 0;
  const broken = {
    prepare: db.prepare.bind(db),
    batch: async (s: D1PreparedStatement[]) => {
      if (++calls > 1) throw Error('SYNTHETIC_ERROR_DETAILS_NOT_PUBLIC');
      return db.batch<any>(s);
    },
  } as D1Database;
  await expect(
    new Response(await streamCanonicalCSV(broken, at)).blob(),
  ).rejects.toThrow('EXPORT_UNAVAILABLE');
  calls = 0;
  const safe = {
    prepare: db.prepare.bind(db),
    batch: async (s: D1PreparedStatement[]) => {
      calls++;
      return db.batch<any>(s);
    },
  } as D1Database;
  const reader = (await streamCanonicalCSV(safe, at)).getReader();
  await reader.read();
  await reader.cancel();
  expect(calls).toBe(1);
  expect((await reader.read()).done).toBe(true);
});
