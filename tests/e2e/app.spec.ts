import { test } from './window';
import { expect } from '@playwright/test';
test('organization context, task persistence, completion and offline snapshot', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.locator('.shell-tools > summary').click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Today', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Page', { exact: true }).selectOption('settings');
  await page.getByLabel('Context', { exact: true }).fill('Himpunan');
  await page
    .getByRole('combobox', { name: 'Type', exact: true })
    .selectOption('organization');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: '+ Add task', exact: true }).click();
  // S3 QuickSheet: type is a button group, the title field is "Title".
  const quick = page.getByRole('dialog');
  await quick
    .getByRole('button', { name: 'Organization', exact: true })
    .click();
  await quick
    .getByLabel('Title', { exact: true })
    .fill('Prepare Himpunan event');
  await quick
    .getByLabel('Context', { exact: true })
    .selectOption({ label: 'Himpunan' });
  await quick.getByRole('button', { name: 'Add', exact: true }).click();
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
  await page.locator('.shell-tools > summary').click();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(
    page.getByText(/Offline · showing a saved snapshot/),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Add task', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('article', { name: 'Prepare Himpunan event', exact: true })
    .locator('.s2-task-body')
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved snapshot' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add task', exact: true }),
  ).toBeEnabled();
  // S3 wired real completion; the old read-only guard no longer applies.
  await expect(
    page.getByRole('button', {
      name: 'Mark complete: Prepare Himpunan event',
      exact: true,
    }),
  ).toBeEnabled();
  // S3 replaced the legacy dialog with a real versioned completion toggle.
  const complete = page.getByRole('button', {
    name: 'Mark complete: Prepare Himpunan event',
    exact: true,
  });
  await complete.click();
  await expect(
    page.getByRole('button', {
      name: 'Undo completion: Prepare Himpunan event',
      exact: true,
    }),
  ).toBeEnabled();
  // The toast must never intercept pointer events meant for the page beneath.
  const toast = page.locator('.s2-toast');
  await expect(toast).toBeVisible();
  const hitTest = await toast.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2,
    );
    return {
      hitNull: hit === null,
      isToast: hit === el || el.contains(hit),
    };
  });
  expect(hitTest.hitNull, 'toast centre must be inside the viewport').toBe(
    false,
  );
  expect(hitTest.isToast, 'toast must not intercept pointer events').toBe(
    false,
  );
});
test('360px navigation and both themes fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.locator('.shell-tools > summary').click();
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
  await page.locator('.shell-tools > summary').click();
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
  await page.locator('.shell-tools > summary').click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await page.getByRole('button', { name: '+ Add task', exact: true }).click();
  // S3 replaced the legacy quick-add form with the real QuickSheet.
  const quick = page.getByRole('dialog');
  await quick.getByRole('button', { name: 'Personal', exact: true }).click();
  await quick
    .getByLabel('Title', { exact: true })
    .fill('Calendar responsibility');
  await quick
    .getByLabel('Date precision', { exact: true })
    .selectOption('date_only');
  await quick.getByLabel('Date only', { exact: true }).fill('2026-11-20');
  await quick.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // S5 calendar is day-cell based; the task lives on its own day.
  await page.getByRole('button', { name: /November 20, 2026/ }).click();
  await page
    .getByRole('article', { name: 'Calendar responsibility', exact: true })
    .locator('.s2-task-body')
    .click();
  await page.getByRole('button', { name: 'Edit task', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Task title').fill('Revised responsibility');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toHaveCount(0);
  // The shell is hidden while a detail route is open, so leave it before using nav.
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Calendar' })).toBeVisible();
  await page.getByRole('button', { name: /November 20, 2026/ }).click();
  await expect(
    page.getByRole('article', { name: 'Revised responsibility', exact: true }),
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
  await page.locator('.shell-tools > summary').click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: /^Review(?: \d+)?$/ }).click();
  // S4 renders one card at a time; the action row is a sibling of the card,
  // so the button is page-level rather than nested inside the article.
  await expect(page.locator('article.review-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Edit & review' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Task title').fill('Owner corrected synthetic duty');
  await dialog.getByRole('button', { name: 'Approve changes' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Owner corrected synthetic duty' }),
  ).toBeVisible();
});
