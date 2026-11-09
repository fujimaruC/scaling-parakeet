/** Reproducible local/synthetic resource observations; never account CPU or billing. */
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
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
      captured.push(...statements.map((s) => descriptions.get(s)!));
      return db.batch(
        statements.map((s) => (inners.get(s) ?? s) as D1PreparedStatement),
      );
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
  async function seed(start: number, end: number) {
    for (let i = start; i < end; i += 80) {
      const ops = [];
      for (let n = i; n < Math.min(i + 80, end); n++) {
        const month = String(1 + (n % 12)).padStart(2, '0');
        ops.push(
          db
            .prepare(
              "INSERT INTO tasks(id,title,kind,status,priority,due_json,created_at,updated_at) VALUES(?,?,'assignment','todo','normal',?,'2030-01-01T00:00:00Z','2030-01-01T00:00:00Z')",
            )
            .bind(
              'resource-' + String(n).padStart(5, '0'),
              n === end - 1 ? 'Synthetic needle' : 'Synthetic task ' + n,
              JSON.stringify({
                precision: 'date_only',
                local_date: '2035-' + month + '-15',
                local_datetime: null,
                timezone: 'Asia/Makassar',
              }),
            ),
        );
      }
      await db.batch(ops);
    }
  }
  let count = 0;
  for (const size of [100, 1200]) {
    await seed(count, size);
    count = size;
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
      const repetitions = path.startsWith('/export') ? 1 : 6;
      for (let sample = 0; sample < repetitions; sample++) {
        captured = [];
        const start = performance.now();
        const response = await app.fetch(
          new Request('https://resource.synthetic/api/v1' + path),
          env,
        );
        const body = await response.arrayBuffer();
        const elapsed = performance.now() - start;
        if (response.status !== 200)
          throw Error(
            'MEASUREMENT_ROUTE_FAILED ' + path + ' ' + response.status,
          );
        bytes = body.byteLength;
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
        path,
        samples: times.length,
        wall_ms: times.map((t) => Number(t.toFixed(3))),
        median_wall_ms: Number(
          sorted[Math.floor(sorted.length / 2)].toFixed(3),
        ),
        max_wall_ms: Number(Math.max(...times).toFixed(3)),
        response_bytes: bytes,
        prepared_statements_per_request: queries.length,
        queries: plans,
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
