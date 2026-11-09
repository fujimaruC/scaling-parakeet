/** Existing Playwright JSON output; no reporter dependency. Missing results fail. */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
const files = process.argv.slice(2);
if (!files.length)
  throw Error(
    'Usage: node --import tsx scripts/report_browser_margins.ts report.json ...',
  );
const rows: {
  report: string;
  title: string;
  duration: number;
  timeout: number;
  status: string;
}[] = [];
for (const file of files) {
  const report = JSON.parse(readFileSync(file, 'utf8'));
  function visit(suite: any) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests)
        for (const result of test.results) {
          rows.push({
            report: basename(file),
            title: spec.title,
            duration: result.duration,
            timeout: test.timeout,
            status: result.status,
          });
        }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);
}
console.log(
  '| Report | Test | Duration ms | Budget ms | Remaining ms | Used % | Result |',
);
console.log('|---|---|---:|---:|---:|---:|---|');
for (const r of rows.sort((a, b) => b.duration - a.duration))
  console.log(
    `| ${r.report} | ${r.title.replaceAll('|', '/')} | ${r.duration} | ${r.timeout} | ${r.timeout - r.duration} | ${((100 * r.duration) / r.timeout).toFixed(1)} | ${r.status} |`,
  );
if (!rows.length || rows.some((r) => r.status !== 'passed'))
  process.exitCode = 1;
