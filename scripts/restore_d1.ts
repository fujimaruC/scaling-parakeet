/** Owner-local CLI; only a fresh in-memory Miniflare database can be targeted. */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { restoreEncryptedCanonical, RestoreError } from './lib/d1-restore';
async function main() {
  const args = process.argv.slice(2),
    allowed = new Set(['--archive', '--key', '--report', '--now']);
  const values: Record<string, string> = {};
  if (args.length % 2) throw new RestoreError('RESTORE_ARGUMENTS_INVALID');
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.has(args[i]) || values[args[i]])
      throw new RestoreError('RESTORE_ARGUMENTS_INVALID');
    values[args[i]] = args[i + 1];
  }
  if (!values['--archive'] || !values['--key'])
    throw new RestoreError('RESTORE_ARGUMENTS_INVALID');
  const archive = resolve(values['--archive']),
    key = resolve(values['--key']);
  if (statSync(archive).size > 128 * 1024 * 1024 || statSync(key).size > 128)
    throw new RestoreError('RESTORE_INPUT_TOO_LARGE');
  if (process.platform !== 'win32' && statSync(key).mode & 0o077)
    throw new RestoreError('RESTORE_KEY_PERMISSIONS');
  const restored = await restoreEncryptedCanonical(
    readFileSync(archive),
    readFileSync(key),
    { now: values['--now'] },
  );
  try {
    const output = JSON.stringify(restored.report, null, 2) + '\n';
    if (values['--report'])
      writeFileSync(resolve(values['--report']), output, {
        flag: 'wx',
        mode: 0o600,
      });
    else process.stdout.write(output);
  } finally {
    await restored.dispose();
  }
}
main().catch((error) => {
  console.error(error instanceof RestoreError ? error.code : 'RESTORE_FAILED');
  process.exitCode = 1;
});
