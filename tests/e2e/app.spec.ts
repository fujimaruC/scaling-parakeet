import { test, expect } from '@playwright/test';
test('organization context, task persistence, completion and offline snapshot', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A little room to remember.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Context', { exact: true }).fill('Himpunan');
  await page
    .getByRole('combobox', { name: 'Type', exact: true })
    .selectOption('organization');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: '+ Add task', exact: true }).click();
  await page.getByLabel('Task title').fill('Prepare Himpunan event');
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Context', exact: true })
    .selectOption({ label: 'Himpunan' });
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Type', exact: true })
    .selectOption('organizational_duty');
  await page.getByRole('button', { name: 'Save', exact: true }).last().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Responsibilities', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Prepare Himpunan event' }),
  ).toBeVisible();
  await expect(
    page.getByText('No date yet', { exact: true }).last(),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole('button', { name: 'Responsibilities', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Prepare Himpunan event' }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(
    page.getByText(/Offline · showing a saved snapshot/),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '+ Add task', exact: true }),
  ).toBeDisabled();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '+ Add task', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('button', {
      name: 'Complete: Prepare Himpunan event',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Complete: Prepare Himpunan event',
      exact: true,
    }),
  ).toBeDisabled();
});
test('360px navigation and both themes fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Switch theme' }).click();
  await page.getByLabel('Page', { exact: true }).selectOption('settings');
  await expect(
    page.getByRole('heading', { name: 'Settings', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/mobile-check.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
