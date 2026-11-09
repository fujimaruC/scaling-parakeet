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
