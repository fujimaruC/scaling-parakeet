/** Isolated synthetic harness, never bundled with the production Worker. */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
for (const sql of readFileSync('apps/worker/migrations/0001_core.sql', 'utf8')
  .trim()
  .split(/;\n/))
  if (sql.trim()) await DB.prepare(sql).run();
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
  if (!req.url?.startsWith('/api/')) {
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
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500).end();
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
