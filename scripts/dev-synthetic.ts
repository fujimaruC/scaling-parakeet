/** Isolated synthetic harness, never bundled with the production Worker. */
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { seedBrowserScenario } from '../tests/fixtures/browser-seeds';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { Miniflare } from 'miniflare';
import { createServer as createViteServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createApp, type Env } from '../apps/worker/src/index';
const mf = new Miniflare({
  modules: true,
  script: 'export default {fetch(){return new Response("synthetic")}}',
  d1Databases: ['DB'],
});
const DB = (await mf.getD1Database('DB')) as unknown as D1Database;
for (const file of readdirSync('apps/worker/migrations')
  .filter((f) => f.endsWith('.sql'))
  .sort()) {
  for (const sql of readFileSync('apps/worker/migrations/' + file, 'utf8')
    .trim()
    .split(/;\n/))
    if (sql.trim()) await DB.prepare(sql).run();
}
if (process.env.SYNTHETIC_FIXTURES === '1') {
  const fixture = JSON.parse(
    readFileSync('examples/sync-envelope.synthetic.json', 'utf8'),
  );
  const candidate = fixture.candidates[0];
  candidate.fields.title = 'Synthetic proposal for review';
  await DB.batch([
    DB.prepare('INSERT INTO sources(id,display_name,kind) VALUES(?,?,?)').bind(
      fixture.source_id,
      'Synthetic group',
      'whatsapp_export',
    ),
    DB.prepare(
      'INSERT INTO source_items(id,source_id,generation,observed_at,local_evidence_available) VALUES(?,?,1,?,1)',
    ).bind(fixture.items[0].evidence_id, fixture.source_id, fixture.created_at),
    DB.prepare(
      "INSERT INTO candidates(id,source_id,generation,fields_json,issues_json,created_at,updated_at) VALUES(?,?,1,?,'[]',?,?)",
    ).bind(
      candidate.candidate_id,
      fixture.source_id,
      JSON.stringify(candidate.fields),
      fixture.created_at,
      fixture.created_at,
    ),
    DB.prepare('INSERT INTO candidate_evidence VALUES(?,?)').bind(
      candidate.candidate_id,
      fixture.items[0].evidence_id,
    ),
  ]);
}
const env: Env = {
  DB,
  OWNER_SUB: 'synthetic-owner',
  ACCESS_TEAM: 'UNCONFIGURED',
  ACCESS_AUD: 'UNCONFIGURED',
};
const app = createApp(async () => true);
const vite = await createViteServer({
  root: resolve('apps/web'),
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true, hmr: false },
});
const server = createServer(async (req, res) => {
  // Synthetic harness only: separate scenarios get separate accounting windows.
  // This file is never bundled/deployed; the production authenticator and limits have no bypass.
  if (
    process.env.SYNTHETIC_FIXTURES === '1' &&
    req.url === '/__synthetic/request-window' &&
    req.method === 'POST'
  ) {
    await DB.prepare('DELETE FROM operational_usage').run();
    res.writeHead(204).end();
    return;
  }

  if (
    process.env.SYNTHETIC_FIXTURES === '1' &&
    req.method === 'POST' &&
    [
      '/__synthetic/seed/partial-ledger',
      '/__synthetic/seed/paged-history',
    ].includes(req.url ?? '')
  ) {
    try {
      const value = await seedBrowserScenario(DB, req.url!.split('/').pop()!);
      res
        .writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify(value));
    } catch {
      res.writeHead(503).end();
    }
    return;
  }
  if (
    process.env.SYNTHETIC_FIXTURES === '1' &&
    req.url === '/__synthetic/interrupted.csv'
  ) {
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
    res.flushHeaders();
    res.write('"schema_version","exported_at","table"\r\n');
    setTimeout(() => res.destroy(), 150);
    return;
  }
  if (
    !req.url?.startsWith('/api/') &&
    req.url?.split('?')[0] !== '/owner-devices'
  ) {
    if (process.env.SYNTHETIC_PRODUCTION === '1') {
      const root = resolve('apps/web/dist');
      const requested = resolve(
        root,
        '.' +
          decodeURIComponent(
            new URL(req.url ?? '/', 'http://localhost').pathname,
          ),
      );
      if (requested !== root && !requested.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      const path =
        existsSync(requested) && statSync(requested).isFile()
          ? requested
          : resolve(root, 'index.html');
      const types: Record<string, string> = {
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.svg': 'image/svg+xml',
        '.webmanifest': 'application/manifest+json',
      };
      res.writeHead(200, {
        'Content-Type': types[extname(path)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(readFileSync(path));
      return;
    }
    vite.middlewares(req, res);
    return;
  }
  try {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 262144) {
        res.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request('http://' + req.headers.host + req.url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: ['GET', 'HEAD'].includes(req.method ?? 'GET')
        ? undefined
        : Buffer.concat(chunks),
    });
    const response = await app.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body)
      await pipeline(Readable.fromWeb(response.body as any), res);
    else res.end();
  } catch {
    if (res.headersSent) res.destroy();
    else res.writeHead(500).end();
  }
});
server.listen(4173, '127.0.0.1', () =>
  console.log('Synthetic-only, ephemeral data: http://127.0.0.1:4173'),
);
async function stop() {
  server.close();
  await vite.close();
  await mf.dispose();
  process.exit();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
