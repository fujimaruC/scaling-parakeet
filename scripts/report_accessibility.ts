/** No observation is never PASS. Consumes only a real Playwright JSON report. */
import { readFileSync } from 'node:fs';
const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const rows: {
  screen: string;
  rule: string;
  result: string;
  checked: number;
}[] = [];
let failed = false;
function visit(suite: any) {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests) {
      if (!spec.title.startsWith('structural accessibility ')) continue;
      for (const result of test.results) {
        if (result.status !== 'passed') failed = true;
        for (const output of result.stdout ?? [])
          for (const line of (output.text ?? '').split('\n'))
            if (line.startsWith('A11Y_TABLE '))
              rows.push(...JSON.parse(line.slice(11)));
      }
    }
  for (const child of suite.suites ?? []) visit(child);
}
for (const suite of report.suites ?? []) visit(suite);
const screens = [
  'today',
  'tasks',
  'review',
  'calendar',
  'sources',
  'history',
  'inbox',
  'settings',
  'expanded-tools',
  'detail',
  'editor',
  'date-sheet-datetime',
  'date-sheet-date_only',
  'date-sheet-approximate',
  'date-sheet-unknown',
  'quick-sheet',
  'proposal-date',
];
const rules = ['name', 'label', 'tabindex', 'focus', 'target'];
console.log(
  '| Screen / language / theme | Rule | Result | Observed controls |',
);
console.log('|---|---|---|---:|');
for (const locale of ['id', 'en'])
  for (const theme of ['light', 'dark'])
    for (const screen of screens)
      for (const rule of rules) {
        const key = screen + '/' + locale + '/' + theme;
        const matches = rows.filter((r) => r.screen === key && r.rule === rule),
          row = matches[0];
        if (
          matches.length !== 1 ||
          !row ||
          !['PASS', 'N/A (no form controls)'].includes(row.result)
        )
          failed = true;
        console.log(
          `| ${key} | ${rule} | ${matches.length === 1 ? row.result : 'UNVERIFIED (missing or duplicate observation)'} | ${row?.checked ?? 'unavailable'} |`,
        );
      }
console.log(
  `Observed ${rows.length} rule records; expected ${screens.length * 4 * rules.length}.`,
);
if (failed || rows.length !== screens.length * 4 * rules.length)
  process.exitCode = 1;
