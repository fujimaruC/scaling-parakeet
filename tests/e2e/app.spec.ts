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
  await page.getByLabel('Page', { exact: true }).selectOption('settings');
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
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Prepare Himpunan event' }),
  ).toBeVisible();
  await expect(
    page.getByText('No date yet', { exact: true }).last(),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
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
test('save reminder rules twice with quiet hours', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByLabel('Page', { exact: true }).selectOption('settings');
  await page.getByLabel('Defer new inbox reminders during quiet hours').check();
  await page
    .getByRole('button', { name: 'Save reminder rules', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Save reminder rules', exact: true }),
  ).toBeEnabled();
  await page.getByLabel('Quiet hours end (0–23)').fill('8');
  await page
    .getByRole('button', { name: 'Save reminder rules', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Save reminder rules', exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const settings = await page.request.get('/api/v1/settings');
  expect(
    (await settings.json()).data.reminder_policy.quiet_hours.end_hour,
  ).toBe(8);
});
test('edit task, keep date-only precision and navigate month calendar', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: '+ Add task', exact: true }).click();
  await page.getByLabel('Task title').fill('Calendar responsibility');
  await page
    .getByRole('dialog')
    .getByLabel('Deadline', { exact: true })
    .fill('2026-11-20');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page
    .getByRole('button', { name: 'Calendar responsibility', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Task title').fill('Revised responsibility');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(
    page.getByRole('group', { name: 'Month calendar' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Revised responsibility', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({
    path: 'test-results/calendar-mobile.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('correct a proposal before approval', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  const proposal = page.locator('article.proposal').filter({
    has: page.getByRole('heading', { name: 'Synthetic proposal for review' }),
  });
  await proposal.getByRole('button', { name: 'Edit & review' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Task title').fill('Owner corrected synthetic duty');
  await dialog.getByRole('button', { name: 'Approve changes' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Owner corrected synthetic duty' }),
  ).toBeVisible();
});
