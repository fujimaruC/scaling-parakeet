import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  statSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
it('VAPID generator writes only an exclusive private owner-local file and never prints key bytes', () => {
  const dir = mkdtempSync(tmpdir() + '/aos-key-test-');
  try {
    const target = dir + '/private.json';
    const run = () =>
      spawnSync(
        process.execPath,
        ['scripts/create_vapid_secrets.mjs', target],
        { encoding: 'utf8' },
      );
    const r = run();
    expect(r.status).toBe(0);
    const bytes = readFileSync(target, 'utf8');
    expect(JSON.parse(bytes).crv).toBe('P-256');
    expect(statSync(target).mode & 0o777).toBe(0o600);
    expect(r.stdout).not.toContain(JSON.parse(bytes).d);
    expect(run().status).not.toBe(0);
    expect(readFileSync(target, 'utf8')).toBe(bytes);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it('VAPID generator rejects relative and repository paths before creating secrets', () => {
  for (const target of [
    'relative.json',
    resolve('scripts/refused-test-key.json'),
  ]) {
    const r = spawnSync(
      process.execPath,
      ['scripts/create_vapid_secrets.mjs', target],
      { encoding: 'utf8' },
    );
    expect(r.status).not.toBe(0);
    expect(existsSync(target)).toBe(false);
  }
});
