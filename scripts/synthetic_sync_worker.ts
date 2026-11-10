/** Test-only real Worker/D1 receiver behind the synthetic TLS proxy. Never deploy. */
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { createApp, type Env } from '../apps/worker/src/index';
const source = process.env.SYNTHETIC_SOURCE_ID;
if (!source || !/^[0-9a-f-]{36}$/.test(source))
  throw Error('SYNTHETIC_SOURCE_REQUIRED');
const mf = new Miniflare({
  modules: true,
  script: 'export default {fetch(){return new Response("synthetic")}}',
  d1Databases: ['DB'],
});
const DB = (await mf.getD1Database('DB')) as unknown as D1Database;
for (const file of readdirSync('apps/worker/migrations')
  .filter((f) => f.endsWith('.sql'))
  .sort())
  for (const sql of readFileSync('apps/worker/migrations/' + file, 'utf8')
    .trim()
    .split(/;\n/))
    if (sql.trim()) await DB.prepare(sql).run();
await DB.batch([
  DB.prepare(
    "INSERT INTO sources(id,display_name,kind) VALUES(?,'Synthetic LMS/router source','whatsapp_export')",
  ).bind(source),
  DB.prepare(
    "INSERT INTO collector_credentials(id,source_id,secret) VALUES('synthetic-key',?,'synthetic-not-real')",
  ).bind(source),
]);
const app = createApp(async () => true),
  env: Env = {
    DB,
    OWNER_SUB: 'synthetic',
    ACCESS_TEAM: 'UNCONFIGURED',
    ACCESS_AUD: 'UNCONFIGURED',
  };
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/__synthetic/state') {
      const values = await DB.batch([
        DB.prepare('SELECT count(*) n FROM tasks'),
        DB.prepare('SELECT count(*) n FROM candidates'),
        DB.prepare('SELECT count(*) n FROM source_items'),
      ]);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          tasks: (values[0].results[0] as any).n,
          candidates: (values[1].results[0] as any).n,
          items: (values[2].results[0] as any).n,
        }),
      );
      return;
    }
    if (!req.url?.startsWith('/api/v1/sync')) {
      res.writeHead(404).end();
      return;
    }
    const parts: Buffer[] = [];
    let length = 0;
    for await (const part of req) {
      length += part.length;
      if (length > 262144) {
        res.writeHead(413).end();
        return;
      }
      parts.push(part);
    }
    const response = await app.fetch(
      new Request('http://127.0.0.1:' + port + req.url, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: req.method === 'GET' ? undefined : Buffer.concat(parts),
      }),
      env,
    );
    res
      .writeHead(response.status, Object.fromEntries(response.headers))
      .end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(503).end();
  }
});
let port = 0;
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address !== 'string') {
    port = address.port;
    console.log('READY ' + port);
  }
});
async function stop() {
  server.close();
  await mf.dispose();
  process.exit();
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
