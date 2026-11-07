import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const hash = (data: Buffer | string) =>
  createHash('sha256').update(data).digest('hex');
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'public-shell-integrity',
      apply: 'build',
      closeBundle() {
        const root = resolve(import.meta.dirname, 'dist');
        const expected: Record<string, string> = {};
        function visit(dir: string) {
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const file = resolve(dir, entry.name);
            if (entry.isDirectory()) visit(file);
            else {
              const path = '/' + relative(root, file).replaceAll('\\', '/');
              if (path !== '/sw.js' && !path.endsWith('.map'))
                expected[path === '/index.html' ? '/' : path] = hash(
                  readFileSync(file),
                );
            }
          }
        }
        visit(root);
        const build = hash(JSON.stringify(expected)).slice(0, 16),
          source = readFileSync(
            resolve(import.meta.dirname, 'public/sw.js'),
            'utf8',
          );
        writeFileSync(
          resolve(root, 'sw.js'),
          source
            .replace('__STATIC_HASHES__', JSON.stringify(expected))
            .replace('__SHELL_BUILD__', build),
        );
      },
    },
  ],
  build: { target: 'chrome80' },
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:8788', changeOrigin: true } },
  },
});
