import { test } from './window';
import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('owner chooses CSV and receives a safe download instead of the JSON envelope', async ({
  page,
  request,
}) => {
  const create = await request.post('/api/v1/tasks', {
    headers: {
      Origin: 'http://127.0.0.1:4173',
      'Idempotency-Key': crypto.randomUUID(),
    },
    data: { title: '=cmd Synthetic CSV', kind: 'personal_action' },
  });
  expect(create.ok()).toBe(true);
  await page.goto('/');
  await page.locator('.shell-tools > summary').click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByLabel('Page', { exact: true }).selectOption('settings');
  await page.getByLabel('Export format', { exact: true }).selectOption('csv');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export data', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('academic-os-export.csv');
  const text = await readFile((await file.path())!, 'utf8');
  expect(text).toContain('"schema_version","exported_at","table"');
  expect(text).toContain('"\'=cmd Synthetic CSV"');
  expect(text).not.toContain('"meta":');
});

test('an interrupted CSV body never becomes a successful downloadable file', async ({
  page,
}) => {
  let downloads = 0,
    sawHeaders = false;
  page.on('download', () => downloads++);
  page.on('response', (r) => {
    if (
      (r.url().includes('/api/v1/export?format=csv') ||
        r.url().endsWith('/__synthetic/interrupted.csv')) &&
      r.request().method() === 'GET' &&
      r.status() === 200
    )
      sawHeaders = true;
  });
  await page.route('**/api/v1/export?format=csv', (route) =>
    route.continue({
      url: 'http://127.0.0.1:4173/__synthetic/interrupted.csv',
    }),
  );
  await page.addInitScript(() => localStorage.setItem('locale', 'en'));
  await page.goto('/settings');
  await page.getByLabel('Export format', { exact: true }).selectOption('csv');
  await page.getByRole('button', { name: 'Export data', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(sawHeaders).toBe(true);
  expect(downloads).toBe(0);
});
