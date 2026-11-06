import { test, expect } from '@playwright/test';
test('built PWA reloads offline and logout clears its private snapshot', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A little room to remember.' }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'A little room to remember.' }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText(/Offline · showing a saved snapshot/),
  ).toBeVisible();
  expect(
    await page.evaluate(
      async () =>
        (await document.fonts.load('500 16px "Pixelify Sans"')).length,
    ),
  ).toBeGreaterThan(0);
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByLabel('Page', { exact: true }).selectOption('settings');
  await page.route('**/cdn-cgi/access/logout', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Signed out</h1>' }),
  );
  await page.getByRole('button', { name: 'Sign out & clear snapshot' }).click();
  await expect(page.getByRole('heading', { name: 'Signed out' })).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      return dbs.some((d) => d.name === 'academic-os-private');
    }),
  ).toBe(false);
});
