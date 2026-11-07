import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import fixture from '../fixtures/s2-ledger.json' with { type: 'json' };
let tasks: any[] = [];
const origin = 'http://127.0.0.1:4173';
test.beforeAll(async ({ request }) => {
  const contexts: Record<string, string> = {};
  const existing = (await (await request.get('/api/v1/contexts')).json()).data;
  for (const type of ['academic', 'organization', 'personal']) {
    const found = existing.find(
      (c: any) => c.display_name === 'Synthetic ' + type,
    );
    if (found) {
      contexts[type] = found.id;
      continue;
    }
    const r = await request.post('/api/v1/contexts', {
      headers: { Origin: origin },
      data: { type, display_name: 'Synthetic ' + type },
    });
    expect(r.ok()).toBe(true);
    contexts[type] = (await r.json()).data.id;
  }
  for (const [index, f] of fixture.entries()) {
    const r = await request.post('/api/v1/tasks', {
      headers: {
        Origin: origin,
        'Idempotency-Key':
          '00000000-0000-4000-8000-' + String(index).padStart(12, '0'),
      },
      data: {
        ...f,
        context_id: contexts[f.context],
        kind: 'personal_action',
        description: 'Synthetic owner note',
        context: undefined,
      },
    });
    expect(r.ok()).toBe(true);
    tasks.push((await r.json()).data);
  }
  const settings = (await (await request.get('/api/v1/settings')).json()).data;
  const policy = await request.patch('/api/v1/settings/reminders', {
    headers: { Origin: origin, 'If-Match': String(settings.version) },
    data: { enabled: true, offset_hours: [7, 2], date_only_hour: 11 },
  });
  expect(policy.ok()).toBe(true);
  const sources = (await (await request.get('/api/v1/sources')).json()).data;
  if (
    !sources.some((s: any) => s.display_name === 'Synthetic S2 review source')
  ) {
    const source = (
      await (
        await request.post('/api/v1/sources', {
          headers: { Origin: origin },
          data: {
            kind: 'whatsapp_notification',
            display_name: 'Synthetic S2 review source',
          },
        })
      ).json()
    ).data;
    const credential = (
      await (
        await request.post('/api/v1/collector-credentials', {
          headers: { Origin: origin },
          data: { source_id: source.id },
        })
      ).json()
    ).data;
    const example = JSON.parse(
      readFileSync('examples/sync-envelope.synthetic.json', 'utf8'),
    );
    for (const size of [50, 50, 1]) {
      const item = { ...example.items[0], evidence_id: crypto.randomUUID() };
      const envelope = {
        ...example,
        batch_id: crypto.randomUUID(),
        idempotency_key: crypto.randomUUID(),
        source_id: source.id,
        items: [item],
        candidates: Array.from({ length: size }, (_, i) => ({
          ...example.candidates[0],
          candidate_id: crypto.randomUUID(),
          fields: {
            ...example.candidates[0].fields,
            title: 'Synthetic S2 proposal ' + i,
          },
          evidence_ids: [item.evidence_id],
        })),
      };
      const raw = JSON.stringify(envelope),
        stamp = String(Math.floor(Date.now() / 1000)),
        nonce = crypto.randomUUID(),
        hash = createHash('sha256').update(raw).digest('hex');
      const signature = createHmac('sha256', credential.secret)
        .update(['POST', '/api/v1/sync', stamp, nonce, hash].join('\n'))
        .digest('base64url');
      const r = await request.post('/api/v1/sync', {
        headers: {
          'Content-Type': 'application/json',
          'X-Collector-Key-Id': credential.id,
          'X-Request-Timestamp': stamp,
          'X-Nonce': nonce,
          'X-Body-SHA256': hash,
          'X-Signature': signature,
        },
        data: raw,
      });
      expect(r.ok()).toBe(true);
    }
  }
});
async function start(page: Page, path = '/today') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-06T03:59:00Z') });
  await page.clock.pauseAt(new Date('2026-11-06T04:00:00Z'));
  await page.addInitScript(() => {
    localStorage.setItem('locale', 'en');
    localStorage.setItem('theme', 'light');
  });
  await page.goto(path);
}
function article(page: Page, title: string) {
  return page.getByRole('article', { name: title, exact: true });
}
test('S2 read-only routes, distinct dates, real policy, live clock and modal history', async ({
  page,
}) => {
  const writes: string[] = [];
  page.on('request', (r) => {
    if (
      new URL(r.url()).pathname.startsWith('/api/') &&
      !['GET', 'HEAD'].includes(r.method())
    )
      writes.push(r.method());
  });
  await start(page);
  await expect(
    page.getByRole('heading', { name: 'Today', exact: true }),
  ).toBeVisible();
  const pending = (await (await page.request.get('/api/v1/briefing')).json())
    .data.pending;
  expect(pending).toBeGreaterThanOrEqual(101);
  await expect(page.locator('.s2-review-banner strong')).toHaveText(
    String(pending),
  );
  await expect(page.locator('.main-nav b')).toHaveText(String(pending));
  const card = article(page, 'Synthetic exact deadline');
  await expect(card).toBeVisible();
  // S3 made completion a real versioned write; S2's read-only guard is superseded.
  await expect(
    card.getByRole('button', { name: 'Mark complete', exact: true }),
  ).toBeEnabled();
  await expect(card.locator('.s2-time-left')).toHaveText('11h 59m');
  await page.clock.fastForward(60000);
  await expect(card.locator('.s2-time-left')).toHaveText('11h 58m');
  await expect(
    article(page, 'Synthetic date-only deadline').locator('.seg'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await expect(page.locator('[data-group]')).toHaveCount(5);
  await page.getByRole('button', { name: 'Organization', exact: true }).click();
  // S5 added a 250 ms debounced server query; the paused test clock must advance.
  await page.clock.fastForward(400);
  await expect(article(page, 'Synthetic exact deadline')).toHaveCount(0);
  await expect(article(page, 'Synthetic unknown duty')).toBeVisible();
  await expect(article(page, 'Synthetic approximate duty')).toContainText(
    'Approximate — not confirmed',
  );
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await article(page, 'Synthetic exact deadline')
    .getByRole('button')
    .last()
    .click();
  const id = tasks.find((t) => t.title === 'Synthetic exact deadline').id;
  await expect(page).toHaveURL(new RegExp('/tasks/' + id + '$'));
  await expect(
    page.getByRole('heading', {
      name: 'Synthetic exact deadline',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('[data-reminder-policy]')).toContainText(
    '7, 2 hours before deadline',
  );
  await page.getByRole('button', { name: 'Change date', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
  // S3 replaced the read-only preview with a real versioned date write.
  await expect(
    dialog.getByRole('button', { name: 'Save', exact: true }),
  ).toBeEnabled();
  for (const precision of ['datetime', 'approximate', 'unknown', 'date_only'])
    await dialog
      .getByLabel('Date precision', { exact: true })
      .selectOption(precision);
  await dialog.getByLabel('Date precision', { exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'Close', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByLabel('Date precision', { exact: true }),
  ).toBeFocused();
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp('/tasks/' + id + '$'));
  await expect(page.locator('[data-precision="datetime"]')).toContainText(
    '23:59',
  );
  await expect(
    page.getByRole('button', { name: 'Change date', exact: true }),
  ).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(
    article(page, 'Synthetic exact deadline').getByRole('button').last(),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Organization', exact: true })
    .click();
  await expect(
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Organization', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Add task', exact: true }),
  ).toBeFocused();
  expect(
    await page
      .getByRole('button', { name: 'Add task', exact: true })
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2),
        );
      }),
  ).toBe(true);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Add task', exact: true }),
  ).toBeFocused();
  expect(writes).toEqual([]);
});
function contrast(a: number[], b: number[]) {
  const lum = (c: number[]) =>
    c
      .slice(0, 3)
      .map((x) => x / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
      .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
  const x = lum(a),
    y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
async function auditContrast(page: Page, selector: string, screen: string) {
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    const paints = await page.locator(selector).evaluate((root) => {
      const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
      const pairs: any[] = [];
      for (const el of [root, ...root.querySelectorAll('*')]) {
        if (
          !(el instanceof HTMLElement) ||
          !el.textContent?.trim() ||
          el.children.length ||
          !el.getClientRects().length
        )
          continue;
        const fg = rgb(getComputedStyle(el).color);
        let parent: Element | null = el,
          bg: number[] = [];
        while (parent) {
          bg = rgb(getComputedStyle(parent).backgroundColor);
          if (bg.length === 3 || bg[3] === 1) break;
          parent = parent.parentElement;
        }
        if (bg.length >= 3)
          pairs.push({ text: el.textContent.slice(0, 40), fg, bg });
      }
      return pairs;
    });
    expect(paints.length).toBeGreaterThan(0);
    console.log(
      'S2 contrast observations',
      JSON.stringify({
        screen,
        theme,
        samples: paints.length,
        min_ratio: Math.min(...paints.map((p) => contrast(p.fg, p.bg))),
      }),
    );
    for (const p of paints)
      expect(contrast(p.fg, p.bg), JSON.stringify(p)).toBeGreaterThanOrEqual(
        4.5,
      );
  }
}
test('S2 360px, doubled text, target sizes, foreground contrast and deep-link availability', async ({
  page,
}) => {
  await start(page, '/tasks');
  await page.setViewportSize({ width: 360, height: 844 });
  await expect(article(page, 'Synthetic unknown duty')).toBeVisible();
  for (const screen of ['Today', 'Tasks']) {
    await page.getByRole('button', { name: screen, exact: true }).click();
    await auditContrast(page, '.s2-ledger', screen);
  }
  const controls = await page
    .locator('.s2-ledger button,.s2-ledger input')
    .evaluateAll((nodes) =>
      nodes
        .filter((el) => el.getClientRects().length)
        .map((el) => ({
          name: el.getAttribute('aria-label') ?? el.textContent,
          r: el.getBoundingClientRect().toJSON(),
        })),
    );
  console.log(
    'S2 target observations',
    JSON.stringify({
      samples: controls.length,
      min_width: Math.min(...controls.map((c) => c.r.width)),
      min_height: Math.min(...controls.map((c) => c.r.height)),
    }),
  );
  for (const c of controls) {
    expect(c.r.width, String(c.name)).toBeGreaterThanOrEqual(44);
    expect(c.r.height, String(c.name)).toBeGreaterThanOrEqual(44);
  }
  expect(
    await article(page, 'Synthetic unknown duty')
      .locator('.check-box')
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBe(24);
  await page.evaluate(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>('.s2-ledger *')];
    const sizes = nodes.map((el) => parseFloat(getComputedStyle(el).fontSize));
    nodes.forEach((el, i) => (el.style.fontSize = sizes[i] * 2 + 'px'));
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const id = tasks.find((t) => t.title === 'Synthetic unknown duty').id;
  await page.goto('/tasks/' + id);
  await expect(page.locator('[data-precision="unknown"]')).toHaveText(
    'No date yet',
  );
  await expect(page.locator('[data-reminder-policy]')).toContainText(
    'No scheduled reminder',
  );
  await expect(
    page.getByRole('button', { name: 'Back', exact: true }),
  ).toBeInViewport();
  expect(
    await page
      .locator('.s2-detail')
      .evaluate((el) => el.getBoundingClientRect().height <= innerHeight),
  ).toBe(true);
  await auditContrast(page, '.s2-detail', 'Detail');
  await page.locator('.s2-detail').evaluate((root) => {
    const nodes = [...root.querySelectorAll<HTMLElement>('*')];
    const sizes = nodes.map((el) => parseFloat(getComputedStyle(el).fontSize));
    nodes.forEach((el, i) => (el.style.fontSize = sizes[i] * 2 + 'px'));
  });
  expect(
    await page
      .locator('.s2-detail')
      .evaluate((el) => el.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.getByRole('button', { name: 'Change date', exact: true }).click();
  await auditContrast(page, '.s2-sheet', 'Date sheet');
  await page.locator('.s2-sheet').evaluate((root) => {
    const nodes = [...root.querySelectorAll<HTMLElement>('*')];
    const sizes = nodes.map((el) => parseFloat(getComputedStyle(el).fontSize));
    nodes.forEach((el, i) => (el.style.fontSize = sizes[i] * 2 + 'px'));
  });
  expect(
    await page
      .locator('.s2-sheet')
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await auditContrast(page, '.s2-sheet', 'Quick sheet');
  await page.keyboard.press('Escape');
});
test('S2 keeps partial disclosure until existing bounded pages actually reach unknown tasks', async ({
  page,
  request,
}) => {
  for (let i = 0; i < 101; i++) {
    const r = await request.post('/api/v1/tasks', {
      headers: { Origin: origin, 'Idempotency-Key': crypto.randomUUID() },
      data: {
        title: 'Synthetic ledger tail ' + i,
        due: {
          precision: 'date_only',
          local_date: '2026-12-31',
          local_datetime: null,
          timezone: 'Asia/Makassar',
        },
      },
    });
    expect(r.ok()).toBe(true);
  }
  await start(page, '/today');
  await expect(page.getByText(/Partial list —/)).toBeVisible();
  await expect(page.locator('.s2-unknown')).toBeVisible();
  await page
    .getByRole('button', { name: 'Load more tasks', exact: true })
    .click();
  await expect(page.getByText(/Partial list —/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Academic', exact: true }).click();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.locator('.s2-unknown').click();
  await expect(page).toHaveURL(/group=undated/);
  await expect(article(page, 'Synthetic unknown duty')).toBeInViewport();
});

test('S2 authorization denial clears the read session instead of retaining cached owner data', async ({
  page,
  request,
}) => {
  await start(page, '/today');
  await expect(page.locator('.main-nav b')).toBeVisible();
  const id = tasks.find((t) => t.title === 'Synthetic exact deadline').id;
  await page.route('**/api/v1/tasks/' + id + '?view=read', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'AUTH_REQUIRED' } }),
    }),
  );
  await article(page, 'Synthetic exact deadline')
    .getByRole('button')
    .first()
    .click();
  await expect(
    page.getByText('Sign in through private access to open your workspace.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.main-nav b')).toHaveCount(0);
  await expect(page.locator('.s2-detail')).toHaveCount(0);
  await expect
    .poll(async () =>
      page.evaluate(
        async () =>
          !(await indexedDB.databases()).some(
            (db) => db.name === 'academic-os-private',
          ),
      ),
    )
    .toBe(true);
  await page.unroute('**/api/v1/tasks/' + id + '?view=read');
  const ledger = await (await request.get('/api/v1/tasks?limit=100')).json();
  if (!ledger.meta.next_cursor) {
    for (let i = ledger.data.length; i < 101; i++) {
      const r = await request.post('/api/v1/tasks', {
        headers: { Origin: origin, 'Idempotency-Key': crypto.randomUUID() },
        data: { title: 'Synthetic denial tail ' + i },
      });
      expect(r.ok()).toBe(true);
    }
  }
  await page.goto('/today');
  await expect(
    page.getByRole('button', { name: 'Load more tasks', exact: true }),
  ).toBeVisible();
  await page.route(/\/api\/v1\/tasks\?limit=100&cursor=/, (route) =>
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'ACCESS_DENIED' } }),
    }),
  );
  await page
    .getByRole('button', { name: 'Load more tasks', exact: true })
    .click();
  await expect(
    page.getByText('Sign in through private access to open your workspace.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.main-nav b')).toHaveCount(0);
});

test('S2 history paging failure preserves known detail and retries a bounded page', async ({
  page,
  request,
}) => {
  const created = await request.post('/api/v1/tasks', {
    headers: { Origin: origin, 'Idempotency-Key': crypto.randomUUID() },
    data: { title: 'Synthetic paged history' },
  });
  expect(created.ok()).toBe(true);
  let item = (await created.json()).data;
  for (let i = 0; i < 35; i++) {
    const r = await request.patch('/api/v1/tasks/' + item.id, {
      headers: { Origin: origin, 'If-Match': String(item.version) },
      data: { description: 'Synthetic revision ' + i },
    });
    expect(r.ok()).toBe(true);
    item = (await r.json()).data;
  }
  await start(page, '/tasks/' + item.id);
  await expect(page.locator('.s2-timeline li')).toHaveCount(30);
  const pattern = new RegExp(
    '/api/v1/tasks/' + item.id + '\\?view=read&history_before=',
  );
  await page.route(pattern, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'UNAVAILABLE' } }),
    }),
  );
  await page
    .getByRole('button', { name: 'Load earlier history', exact: true })
    .click();
  await expect(page.getByRole('alert')).toHaveText('Data unavailable');
  await expect(
    page.getByRole('heading', { name: item.title, exact: true }),
  ).toBeVisible();
  await expect(page.locator('.s2-timeline li')).toHaveCount(30);
  await page.unroute(pattern);
  await page
    .getByRole('button', { name: 'Load earlier history', exact: true })
    .click();
  await expect(page.locator('.s2-timeline li')).toHaveCount(36);
  await expect(page.getByRole('alert')).toHaveCount(0);
  const ids = await page
    .locator('.s2-timeline li')
    .evaluateAll((nodes) =>
      nodes.map((el) => Number((el as HTMLElement).dataset.eventId)),
    );
  expect(new Set(ids).size).toBe(36);
  expect(ids).toEqual([...ids].sort((a, b) => b - a));
});
