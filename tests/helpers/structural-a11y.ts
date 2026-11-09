import { expect, type Page } from '@playwright/test';
export type AuditRow = {
  screen: string;
  rule: string;
  result: string;
  checked: number;
};
export async function auditStructure(
  page: Page,
  screen: string,
): Promise<AuditRow[]> {
  const scope = (await page.getByRole('dialog').count())
    ? page.getByRole('dialog')
    : page.locator('body');
  const controls = scope.locator(
    'button,a[href],input:not([type=hidden]),select,textarea,summary',
  );
  const violations: Record<string, string[]> = {
    name: [],
    label: [],
    tabindex: [],
    focus: [],
    target: [],
  };
  const checked: Record<string, number> = {
    name: 0,
    label: 0,
    tabindex: 0,
    focus: 0,
    target: 0,
  };
  await page.keyboard.press('Tab');
  const positives = await scope
    .locator('[tabindex]')
    .evaluateAll(
      (nodes) =>
        nodes.filter(
          (el) =>
            el.getClientRects().length &&
            Number(el.getAttribute('tabindex')) > 0,
        ).length,
    );
  checked.tabindex = await scope.locator('[tabindex]').count();
  if (positives)
    violations.tabindex.push(String(positives) + ' positive tabindex values');
  for (let i = 0; i < (await controls.count()); i++) {
    const control = controls.nth(i);
    if (!(await control.isVisible())) continue;
    const info = await control.evaluate((el) => {
      const input = el as HTMLInputElement;
      const labels = Array.from(input.labels ?? []);
      const labelled = Boolean(
        el.getAttribute('aria-label')?.trim() ||
        (el.getAttribute('aria-labelledby') ?? '')
          .split(/\s+/)
          .some((id) => document.getElementById(id)?.textContent?.trim()) ||
        labels.some((l) => l.textContent?.trim()),
      );
      let rect = el.getBoundingClientRect();
      // Associated labels are effective checkbox/radio targets. The native box
      // need not be44px, but its clickable label must actually meet the bound.
      if (['checkbox', 'radio'].includes(input.type))
        for (const label of labels) {
          const hit = label.getBoundingClientRect();
          if (
            hit.width >= 44 &&
            hit.height >= 44 &&
            getComputedStyle(label).pointerEvents !== 'none'
          ) {
            rect = hit;
            break;
          }
        }
      return {
        tag: el.tagName,
        form: el.matches('input,select,textarea'),
        labelled,
        disabled: el.matches(':disabled'),
        width: rect.width,
        height: rect.height,
      };
    });
    const id = info.tag + '[' + i + ']';
    checked.name++;
    try {
      await expect(control).toHaveAccessibleName(/\S/, { timeout: 100 });
    } catch {
      violations.name.push(id + ' has no accessible name');
    }
    if (info.form) {
      checked.label++;
      if (!info.labelled)
        violations.label.push(id + ' has no associated label');
    }
    checked.target++;
    if (info.width < 43.9 || info.height < 43.9)
      violations.target.push(
        id + ' target ' + info.width.toFixed(1) + 'x' + info.height.toFixed(1),
      );
    // Disabled controls still require names/labels/targets; cannot receive focus.
    if (!info.disabled) {
      await control.focus();
      checked.focus++;
      const visible = await control.evaluate((el) => {
        const style = getComputedStyle(el);
        return (
          document.activeElement === el &&
          el.matches(':focus-visible') &&
          parseFloat(style.outlineWidth) >= 2 &&
          style.outlineStyle !== 'none' &&
          !/rgba\([^)]*,\s*0\)$/.test(style.outlineColor)
        );
      });
      if (!visible)
        violations.focus.push(id + ' has no visible keyboard focus outline');
    }
  }
  const rows = Object.keys(violations).map((rule) => ({
    screen,
    rule,
    result: violations[rule].length
      ? 'FAIL'
      : rule === 'label' && checked[rule] === 0
        ? 'N/A (no form controls)'
        : 'PASS',
    checked: checked[rule],
  }));
  console.log('A11Y_TABLE ' + JSON.stringify(rows));
  expect(checked.name, screen + ' must have observed controls').toBeGreaterThan(
    0,
  );
  expect(
    Object.values(violations).flat(),
    screen + ' structural accessibility',
  ).toEqual([]);
  return rows;
}
