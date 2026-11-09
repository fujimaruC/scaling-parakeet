import { expect, it } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
function worker() {
  const handlers: Record<string, any> = {};
  const shown: any[] = [];
  const opened: string[] = [];
  const self = {
    location: { origin: 'https://synthetic' },
    addEventListener: (name: string, fn: any) => {
      handlers[name] = fn;
    },
    registration: {
      showNotification: async (...args: any[]) => {
        shown.push(args);
      },
    },
    clients: {
      matchAll: async () => [],
      openWindow: async (url: string) => {
        opened.push(url);
      },
    },
  };
  vm.runInNewContext(
    readFileSync('apps/web/public/sw.js', 'utf8')
      .replace('__STATIC_HASHES__', '{}')
      .replace('__SHELL_BUILD__', 'synthetic'),
    { self, URL },
  );
  return { handlers, shown, opened };
}
it('push renders a fixed generic alert without reading payload data', async () => {
  const w = worker();
  let done: Promise<any> | undefined;
  expect(() =>
    w.handlers.push({
      data: {
        text() {
          throw Error('must not read payload');
        },
        json() {
          throw Error('must not read payload');
        },
      },
      waitUntil(p: Promise<any>) {
        done = p;
      },
    }),
  ).not.toThrow();
  await done;
  expect(w.shown).toHaveLength(1);
  expect(w.shown[0]).toEqual([
    'Academic OS',
    {
      body: 'Open Academic OS / Buka Academic OS',
      tag: 'academic-os-inbox',
      renotify: false,
      data: { path: '/inbox' },
    },
  ]);
});
it('notification click cannot navigate to an injected external URL', async () => {
  const w = worker();
  let done: Promise<any> | undefined;
  let closed = false;
  w.handlers.notificationclick({
    notification: {
      data: { path: 'https://evil.test/private' },
      close() {
        closed = true;
      },
    },
    waitUntil(p: Promise<any>) {
      done = p;
    },
  });
  await done;
  expect(closed).toBe(true);
  expect(w.opened).toEqual(['https://synthetic/inbox']);
});
