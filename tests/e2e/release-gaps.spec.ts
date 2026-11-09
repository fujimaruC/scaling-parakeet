import { test } from './window';
import { expect } from '@playwright/test';
test('paged history preserves prior events on failure and reaches older events on retry', async ({
  page,
}) => {
  let older = 0;
  await page.route('**/api/v1/history?*', async (route) => {
    const q = new URL(route.request().url()).searchParams;
    const cursor = q.get('cursor');
    if (cursor && older++ === 0) {
      await route.fulfill({
        status: 503,
        json: {
          error: { code: 'SYNTHETIC_UNAVAILABLE' },
          meta: { server_time: new Date().toISOString() },
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        data: [
          {
            id: cursor ? 1 : 2,
            event_type: cursor
              ? 'Synthetic older event'
              : 'Synthetic newer event',
            task_id: 'synthetic-task',
            created_at: '2030-05-15T00:00:00Z',
          },
        ],
        meta: {
          server_time: '2030-05-15T00:00:00Z',
          next_cursor: cursor ? null : 'opaque-synthetic-cursor',
        },
      },
    });
  });
  await page.goto('/');
  await page.locator('.shell-tools > summary').click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByLabel('Page', { exact: true }).selectOption('history');
  await expect(
    page.getByText('Partial history — older events are not loaded.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Load older events' }).click();
  await expect(page.getByRole('alert')).toContainText('History unavailable');
  await expect(
    page.getByRole('heading', { name: 'Synthetic newer event' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Load older events' }).click();
  await expect(
    page.getByRole('heading', { name: 'Synthetic older event' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Load older events' }),
  ).toHaveCount(0);
});
test('settings reports push unconfigured and health never reported without permission prompts', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.shell-tools > summary').click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByLabel('Page', { exact: true }).selectOption('settings');
  await expect(
    page.getByRole('heading', { name: 'Browser notifications' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Enable on this browser' }),
  ).toBeDisabled();
  await expect(page.getByText('not_configured', { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Scheduler report: never_reported/),
  ).toBeVisible();
});

test('history ignores an older response after a fresh observation', async ({
  page,
}) => {
  let pageNumber = 0;
  let release: () => void = () => {};
  await page.route('**/api/v1/history?*', async (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    if (cursor === 'old') {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({
        json: {
          data: [
            {
              id: 1,
              event_type: 'Stale older event',
              task_id: 'synthetic',
              created_at: '2030-01-01T00:00:00Z',
            },
          ],
          meta: { server_time: '2030-01-01T00:00:00Z', next_cursor: null },
        },
      });
      return;
    }
    pageNumber++;
    await route.fulfill({
      json: {
        data: [
          {
            id: pageNumber === 1 ? 2 : 4,
            event_type: pageNumber === 1 ? 'Initial event' : 'Fresh event',
            task_id: 'synthetic',
            created_at: '2030-01-01T00:00:00Z',
          },
        ],
        meta: {
          server_time: '2030-01-01T00:00:00Z',
          next_cursor: pageNumber === 1 ? 'old' : 'new',
        },
      },
    });
  });
  await page.goto('/');
  await page.locator('.shell-tools > summary').click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByLabel('Page', { exact: true }).selectOption('history');
  await expect(
    page.getByRole('heading', { name: 'Initial event' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Load older events' }).click();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Fresh event' }),
  ).toBeVisible();
  const finished = page.waitForResponse((r) => r.url().includes('cursor=old'));
  release();
  await finished;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(
    page.getByRole('heading', { name: 'Stale older event' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Load older events' }),
  ).toBeVisible();
});
