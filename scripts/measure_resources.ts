/** Reproducible local/synthetic resource observations; never account CPU or billing. */
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createApp, type Env } from '../apps/worker/src/index';
import { LIMITS } from '../apps/worker/src/operations';
const output = process.argv[2];
if (!output)
  throw Error(
    'Usage: node --import tsx scripts/measure_resources.ts /absolute/outside/repo.json',
  );
const root = resolve('.'),
  destination = resolve(output);
if (destination.startsWith(root + '/'))
  throw Error('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
const bundles = files('apps/web/dist')
  .sort()
  .filter((f) => !f.endsWith('.map'))
  .map((path) => {
    const bytes = readFileSync(path);
    return {
      path: relative('apps/web/dist', path),
      raw_bytes: bytes.length,
      gzip_bytes: gzipSync(bytes, { level: 9 }).length,
    };
  });
const worker = readFileSync('apps/worker/dist/index.js');
const mf = new Miniflare({
  modules: true,
  script: 'export default {fetch(){return new Response("synthetic")}}',
  d1Databases: ['DB'],
});
try {
  const db = (await mf.getD1Database('DB')) as unknown as D1Database;
  for (const file of readdirSync('apps/worker/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    for (const sql of readFileSync('apps/worker/migrations/' + file, 'utf8')
      .trim()
      .split(/;\n/))
      if (sql.trim()) await db.prepare(sql).run();
  type Query = { sql: string; bindings: unknown[] };
  let captured: Query[] = [];
  let bindingCalls = 0,
    maxExportRows = 0,
    maxExportBatchRows = 0;
  const inners = new WeakMap<object, object>();
  const descriptions = new WeakMap<object, Query>();
  function wrap(statement: any, q: Query): any {
    const proxy = new Proxy(statement, {
      get(target, key) {
        if (key === 'bind')
          return (...bindings: unknown[]) =>
            wrap(target.bind(...bindings), { sql: q.sql, bindings });
        if (['all', 'first', 'run', 'raw'].includes(String(key)))
          return (...args: any[]) => {
            bindingCalls++;
            captured.push(q);
            return target[key](...args);
          };
        return Reflect.get(target, key);
      },
    });
    inners.set(proxy, statement);
    descriptions.set(proxy, q);
    return proxy;
  }
  const observed = {
    prepare: (sql: string) => wrap(db.prepare(sql), { sql, bindings: [] }),
    batch: async (statements: any[]) => {
      bindingCalls++;
      captured.push(...statements.map((s) => descriptions.get(s)!));
      const result = await db.batch(
        statements.map((s) => (inners.get(s) ?? s) as D1PreparedStatement),
      );
      let rows = 0;
      statements.forEach((statement, i) => {
        if (
          /^SELECT \* FROM .* LIMIT \? OFFSET \?$/.test(
            descriptions.get(statement)?.sql ?? '',
          )
        ) {
          maxExportRows = Math.max(maxExportRows, result[i].results.length);
          rows += result[i].results.length;
        }
      });
      maxExportBatchRows = Math.max(maxExportBatchRows, rows);
      return result;
    },
  } as D1Database;
  const env: Env = {
    DB: observed,
    OWNER_SUB: 'synthetic',
    ACCESS_TEAM: 'UNCONFIGURED',
    ACCESS_AUD: 'UNCONFIGURED',
  };
  const app = createApp(async () => true);
  const profiles: any[] = [];
  const traversals: any[] = [];
  async function seed(start: number, end: number) {
    // Fixture construction only. Bounded set-based chunks avoid thousands of
    // remote statement proxies; these inserts are outside measured requests.
    for (let low = start; low < end; low += 1000) {
      await db
        .prepare(
          `WITH RECURSIVE seq(n) AS (
        SELECT ? UNION ALL SELECT n+1 FROM seq WHERE n+1<?
      ) INSERT INTO tasks(id,title,kind,status,priority,due_json,created_at,updated_at)
      SELECT printf('resource-%05d',n),
        CASE WHEN n=? THEN 'Synthetic needle' ELSE 'Synthetic task '||n END,
        'assignment','todo','normal',json_object('precision','date_only',
        'local_date',printf('2035-%02d-15',1+(n%12)),
        'local_datetime',NULL,'timezone','Asia/Makassar'),
        '2030-01-01T00:00:00Z','2030-01-01T00:00:00Z' FROM seq`,
        )
        .bind(low, Math.min(low + 1000, end), end - 1)
        .run();
    }
  }
  await db
    .prepare(
      "INSERT INTO sources(id,display_name,kind) VALUES('resource-source','Synthetic source','whatsapp_export')",
    )
    .run();
  let count = 0;
  for (const size of [100, 1200, 10000]) {
    await seed(count, size);
    // Populate related rows with four set-based statements, avoiding thousands
    // of RPC objects. Only synthetic fixture setup changes; handlers are untouched.
    const low = 'resource-' + String(count).padStart(5, '0');
    const high = 'resource-' + String(size).padStart(5, '0');
    await db.batch([
      db
        .prepare(
          "INSERT INTO source_items SELECT id,'resource-source',1,'2030-01-01T00:00:00Z',NULL,1,NULL FROM tasks WHERE id>=? AND id<?",
        )
        .bind(low, high),
      db
        .prepare(
          "INSERT INTO task_evidence SELECT id,id,'synthetic-approval' FROM tasks WHERE id>=? AND id<?",
        )
        .bind(low, high),
      db
        .prepare(
          "INSERT INTO candidates(id,source_id,generation,fields_json,issues_json,created_at,updated_at) SELECT id,'resource-source',1,?,'[]','2030-01-01T00:00:00Z','2030-01-01T00:00:00Z' FROM tasks WHERE id>=? AND id<?",
        )
        .bind(
          JSON.stringify({
            title: 'Synthetic proposal',
            kind: 'assignment',
            priority: 'normal',
            due: {
              precision: 'unknown',
              local_date: null,
              local_datetime: null,
              timezone: null,
            },
          }),
          low,
          high,
        ),
      db
        .prepare(
          'INSERT INTO candidate_evidence SELECT id,id FROM tasks WHERE id>=? AND id<?',
        )
        .bind(low, high),
    ]);
    count = size;
    const population: Record<string, number> = {};
    for (const table of [
      'tasks',
      'task_events',
      'source_items',
      'task_evidence',
      'candidates',
      'candidate_evidence',
    ]) {
      population[table] = (
        await db.prepare('SELECT count(*) n FROM ' + table).first<any>()
      ).n;
      assert.equal(
        population[table],
        size,
        'POPULATED_LEDGER_REQUIRED ' + table,
      );
    }
    const event = await db
      .prepare('SELECT max(id) id FROM task_events')
      .first<any>();
    const paths = [
      '/tasks?limit=100',
      '/tasks?limit=100&title_only=1&q=needle',
      '/tasks?limit=100&date_from=2035-12-01&date_to=2035-12-31&timezone=Asia%2FMakassar',
      '/history?limit=50',
      '/history?limit=50&cursor=' +
        btoa(JSON.stringify(['history-v1', event.id - 20]))
          .replaceAll('+', '-')
          .replaceAll('/', '_')
          .replaceAll('=', ''),
      '/tasks/resource-00000?view=read',
      '/candidates?limit=50',
      '/export?format=csv',
    ];
    for (const path of paths) {
      const times: number[] = [];
      let bytes = 0;
      let queries: Query[] = [];
      let returnedRows: number | null = null;
      let hasNextPage: boolean | null = null;
      let maxChunkBytes = 0;
      let firstChunkMs: number | null = null;
      const repetitions = path.startsWith('/export') ? 1 : 6;
      for (let sample = 0; sample < repetitions; sample++) {
        captured = [];
        bindingCalls = 0;
        maxExportRows = 0;
        maxExportBatchRows = 0;
        const start = performance.now();
        const response = await app.fetch(
          new Request('https://resource.synthetic/api/v1' + path),
          env,
        );
        let body: ArrayBuffer = new ArrayBuffer(0);
        if (path.startsWith('/export')) {
          bytes = 0;
          const reader = response.body!.getReader();
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            if (firstChunkMs === null) firstChunkMs = performance.now() - start;
            bytes += next.value.byteLength;
            maxChunkBytes = Math.max(maxChunkBytes, next.value.byteLength);
          }
        } else body = await response.arrayBuffer();
        const elapsed = performance.now() - start;
        if (response.status !== 200)
          throw Error(
            'MEASUREMENT_ROUTE_FAILED ' + path + ' ' + response.status,
          );
        if (!path.startsWith('/export')) {
          const result = JSON.parse(new TextDecoder().decode(body));
          if (Array.isArray(result.data)) {
            returnedRows = result.data.length;
            hasNextPage = Boolean(result.meta?.next_cursor);
            assert.ok(
              returnedRows! <=
                Number(
                  new URL('https://synthetic' + path).searchParams.get(
                    'limit',
                  ) ?? 100,
                ),
              'RESULT_PAGE_UNBOUNDED',
            );
          }
        }
        if (!path.startsWith('/export')) bytes = body.byteLength;
        queries = captured;
        if (sample > 0 || repetitions === 1) times.push(elapsed);
      }
      const unique = [...new Map(queries.map((q) => [q.sql, q])).values()];
      const plans = [];
      for (const q of unique.filter((q) => /^SELECT\b/i.test(q.sql))) {
        const plan = await db
          .prepare('EXPLAIN QUERY PLAN ' + q.sql)
          .bind(...q.bindings)
          .all<any>();
        plans.push({ sql: q.sql, plan: plan.results.map((r) => r.detail) });
      }
      const sorted = times.toSorted((a, b) => a - b);
      profiles.push({
        tasks: size,
        population,
        path,
        samples: times.length,
        wall_ms: times.map((t) => Number(t.toFixed(3))),
        median_wall_ms: Number(
          sorted[Math.floor(sorted.length / 2)].toFixed(3),
        ),
        max_wall_ms: Number(Math.max(...times).toFixed(3)),
        response_bytes: bytes,
        returned_rows: returnedRows,
        has_next_page: hasNextPage,
        prepared_statements_per_request: queries.length,
        d1_binding_calls_per_request: bindingCalls,
        export_stream: path.startsWith('/export')
          ? {
              max_page_rows: maxExportRows,
              max_batch_rows: maxExportBatchRows,
              max_chunk_bytes: maxChunkBytes,
              first_chunk_wall_ms:
                firstChunkMs === null ? null : Number(firstChunkMs.toFixed(3)),
              consumer_buffers_full_body: false,
            }
          : null,
        queries: plans,
      });
    }
    for (const basePath of paths.slice(0, 3)) {
      const ids = new Set<string>();
      let cursor: string | null = null,
        pages = 0;
      const start = performance.now();
      do {
        const response = await app.fetch(
          new Request(
            'https://resource.synthetic/api/v1' +
              basePath +
              (cursor ? '&cursor=' + cursor : ''),
          ),
          env,
        );
        assert.equal(response.status, 200, 'TRAVERSAL_ROUTE_FAILED');
        const value = (await response.json()) as any;
        assert.ok(value.data.length <= 100, 'RESULT_PAGE_UNBOUNDED');
        for (const row of value.data) {
          assert.ok(!ids.has(row.id), 'DUPLICATE_PAGE_ROW');
          ids.add(row.id);
        }
        cursor = value.meta?.next_cursor ?? null;
        pages++;
        assert.ok(pages <= Math.ceil(size / 100) + 1, 'CURSOR_LOOP');
      } while (cursor);
      const expected = basePath.includes('q=')
        ? [100, 1200, 10000].filter((n) => n <= size).length
        : basePath.includes('date_from=')
          ? Math.floor(size / 12)
          : size;
      assert.equal(ids.size, expected, 'PAGINATION_COVERAGE');
      traversals.push({
        tasks: size,
        path: basePath,
        pages,
        unique_rows: ids.size,
        expected_rows: expected,
        wall_ms: Number((performance.now() - start).toFixed(3)),
      });
    }
  }
  const result = {
    kind: 'local_synthetic_not_account_measurement',
    node: process.version,
    measurement_time: new Date().toISOString(),
    gzip_level: 9,
    bundles,
    web_js: {
      raw_bytes: bundles
        .filter((f) => f.path.endsWith('.js') && f.path !== 'sw.js')
        .reduce((n, f) => n + f.raw_bytes, 0),
      gzip_bytes: bundles
        .filter((f) => f.path.endsWith('.js') && f.path !== 'sw.js')
        .reduce((n, f) => n + f.gzip_bytes, 0),
    },
    worker: {
      raw_bytes: worker.length,
      gzip_bytes: gzipSync(worker, { level: 9 }).length,
    },
    request_limits_per_minute: LIMITS,
    daily_request_limit: 10000,
    profiles,
    traversals,
    measurement_process_rss_bytes: process.memoryUsage().rss,
    includes_workerd_process: false,
    worker_cpu_ms: null,
    production_d1_rows_read: null,
    production_d1_rows_written: null,
    mobile_startup_ms: null,
    android_callback_ms: null,
    linux_parser_peak_rss_bytes: null,
  };
  writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
  console.log(
    'MEASURED: ' +
      bundles.length +
      ' public assets; ' +
      profiles.length +
      ' local route profiles. CPU/account/device fields remain null.',
  );
} finally {
  await mf.dispose();
}
