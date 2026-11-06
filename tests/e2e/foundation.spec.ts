import { test, expect } from '@playwright/test';
test('foundation: fonts stay local, theme follows system and override, reduced motion and 200% text', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (!new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      external.push(r.url());
  });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/__kit');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Theme', { exact: true }).selectOption('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () =>
        document.fonts.check('500 16px "Pixelify Sans"') &&
        document.fonts.check('400 16px Inter'),
    ),
  ).toBe(true);
  // Explicit font loads, not fallback existence, are checked too.
  expect(
    await page.evaluate(
      async () =>
        (await document.fonts.load('500 16px "Pixelify Sans"')).length,
    ),
  ).toBeGreaterThan(0);
  expect(external).toEqual([]);
  for (const width of [360, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.reload();
    await page.evaluate(() => {
      const nodes = [...document.querySelectorAll<HTMLElement>('body *')];
      const sizes = nodes.map((el) =>
        parseFloat(getComputedStyle(el).fontSize),
      );
      nodes.forEach((el, i) => (el.style.fontSize = `${sizes[i] * 2}px`));
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(page.locator('.seg').first().locator('i')).toHaveCount(16);
  await expect(page.locator('.seg').first()).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  expect(
    await page
      .getByRole('button', { name: 'Primary', exact: true })
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe('0s');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Theme', { exact: true })).toBeFocused();
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Theme', { exact: true }).selectOption(theme);
    await page.screenshot({
      path: `test-results/foundation-kit-${theme}.png`,
      fullPage: true,
    });
  }
});
test('foundation: four tabs and secondary workflows remain reachable at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('.main-nav button')).toHaveCount(4);
  await expect(
    page.getByRole('button', { name: 'Add task', exact: true }),
  ).toBeVisible();
  for (const destination of ['sources', 'history', 'inbox', 'settings']) {
    await expect(
      page.locator(`.mobile-pages option[value="${destination}"]`),
    ).toHaveCount(1);
    await page.getByLabel('Page', { exact: true }).selectOption(destination);
    await expect(
      page.getByRole('heading', {
        name: {
          sources: 'Sources',
          history: 'History',
          inbox: 'Reminders',
          settings: 'Settings',
        }[destination],
        exact: true,
      }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole('button', { name: 'Add task', exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('Page', { exact: true }).selectOption('tasks');
  await expect(
    page.getByRole('button', { name: 'Add task', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel('Page', { exact: true }).selectOption('today');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ['light', 'dark']) {
    await page
      .getByLabel('Theme preference', { exact: true })
      .selectOption(theme);
    await page.screenshot({
      path: `test-results/foundation-today-${theme}.png`,
      fullPage: true,
    });
  }
});
