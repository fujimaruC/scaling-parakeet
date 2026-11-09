import { test } from './window';
import { expect } from '@playwright/test';
import { auditStructure } from '../helpers/structural-a11y';
for (const locale of ['id', 'en'])
  for (const theme of ['light', 'dark']) {
    test(
      'structural accessibility ' + locale + ' ' + theme,
      async ({ page, request }) => {
        // Grouped17-scope audit. Runtime is unverified in this recovery package;
        // owner measures this budget with report_browser_margins.ts. No blanket raise.
        test.setTimeout(60000);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setViewportSize({ width: 360, height: 844 });
        await page.addInitScript(
          ({ locale, theme }) => {
            localStorage.setItem('locale', locale);
            localStorage.setItem('theme', theme);
          },
          { locale, theme },
        );
        const response = await request.post('/api/v1/tasks', {
          headers: {
            Origin: 'http://127.0.0.1:4173',
            'Idempotency-Key': crypto.randomUUID(),
          },
          data: {
            title: 'Synthetic accessibility task',
            due: {
              precision: 'date_only',
              local_date: '2035-12-15',
              local_datetime: null,
              timezone: 'Asia/Makassar',
            },
          },
        });
        expect(response.ok()).toBe(true);
        const task = (await response.json()).data;
        async function open(path: string) {
          await page.goto(path);
          await expect(
            page.getByRole('heading', { level: 1 }).first(),
          ).toBeVisible();
          await expect(page.locator('main > p[role=status]')).toHaveCount(0);
          await expect(page.locator('html')).toHaveAttribute('lang', locale);
          await expect(page.locator('html')).toHaveAttribute(
            'data-theme',
            theme,
          );
        }
        for (const screen of [
          'today',
          'tasks',
          'review',
          'calendar',
          'sources',
          'history',
          'inbox',
          'settings',
        ]) {
          await open('/' + screen);
          await expect(page.locator('main h1')).toBeVisible();
          await auditStructure(page, screen + '/' + locale + '/' + theme);
          if (screen === 'settings') {
            await page.locator('.shell-tools > summary').click();
            await auditStructure(
              page,
              'expanded-tools/' + locale + '/' + theme,
            );
          }
        }
        await open('/tasks/' + task.id);
        await expect(
          page.getByRole('heading', { name: task.title, exact: true }),
        ).toBeVisible();
        await auditStructure(page, 'detail/' + locale + '/' + theme);
        await page
          .getByRole('button', {
            name: locale === 'en' ? 'Edit task' : 'Edit tugas',
            exact: true,
          })
          .click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await auditStructure(page, 'editor/' + locale + '/' + theme);
        await page.keyboard.press('Escape');
        await open('/tasks/' + task.id + '?sheet=date');
        await expect(page.getByRole('dialog')).toBeVisible();
        for (const precision of [
          'datetime',
          'date_only',
          'approximate',
          'unknown',
        ]) {
          await page
            .getByRole('dialog')
            .locator('.date-fields select')
            .selectOption(precision);
          await auditStructure(
            page,
            'date-sheet-' + precision + '/' + locale + '/' + theme,
          );
        }
        await page.keyboard.press('Escape');
        await open('/tasks?sheet=quick');
        await expect(page.getByRole('dialog')).toBeVisible();
        await auditStructure(page, 'quick-sheet/' + locale + '/' + theme);
        await page.keyboard.press('Escape');
        await open('/review');
        await page
          .getByRole('button', {
            name: locale === 'en' ? 'Date' : 'Tanggal',
            exact: true,
          })
          .click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await auditStructure(page, 'proposal-date/' + locale + '/' + theme);
      },
    );
  }
