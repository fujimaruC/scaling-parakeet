/** Local-only disposable restore. No Worker binding, account or dispatch capability. */
import {
  createDecipheriv,
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Miniflare } from 'miniflare';
import tables from '../../packages/contracts/canonical-tables.json';
import {
  reminderTimes,
  validateDue,
  type Due,
} from '../../packages/contracts/src/index';
import type { CanonicalSnapshot } from '../../apps/worker/src/export';
export class RestoreError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
export function canonicalDigest(rows: Record<string, unknown>[]) {
  const canonical = (row: Record<string, unknown>) =>
    JSON.stringify(
      Object.fromEntries(
        Object.keys(row)
          .sort()
          .map((k) => [k, row[k]]),
      ),
    );
  return createHash('sha256')
    .update('[' + rows.map(canonical).sort().join(',') + ']')
    .digest('hex');
}
// Fernet v0x80 wire format, using Node's standard AES-CBC/HMAC primitives. Verify
// MAC before decrypting; backup tokens deliberately have no age/TTL expiration.
export function decryptCanonical(
  archive: Uint8Array,
  keyFile: Uint8Array,
  maxBytes = 128 * 1024 * 1024,
): CanonicalSnapshot {
  try {
    if (
      !Number.isSafeInteger(maxBytes) ||
      maxBytes < 1 ||
      archive.byteLength > maxBytes
    )
      throw Error();
    const text = Buffer.from(keyFile).toString('ascii').trim(),
      encoded = Buffer.from(archive).toString('ascii').trim();
    if (
      !/^[A-Za-z0-9_-]{43}=$/.test(text) ||
      !/^[A-Za-z0-9_-]+={0,2}$/.test(encoded)
    )
      throw Error();
    const key = Buffer.from(text, 'base64url'),
      token = Buffer.from(encoded, 'base64url');
    if (
      key.length !== 32 ||
      token.length < 73 ||
      token[0] !== 0x80 ||
      (token.length - 57) % 16 !== 0
    )
      throw Error();
    const signed = token.subarray(0, -32),
      mac = createHmac('sha256', key.subarray(0, 16)).update(signed).digest();
    if (!timingSafeEqual(mac, token.subarray(-32))) throw Error();
    const cipher = createDecipheriv(
      'aes-128-cbc',
      key.subarray(16),
      token.subarray(9, 25),
    );
    const plain = Buffer.concat([
      cipher.update(token.subarray(25, -32)),
      cipher.final(),
    ]);
    if (plain.byteLength > maxBytes) throw Error();
    return JSON.parse(plain.toString('utf8'));
  } catch {
    throw new RestoreError('RESTORE_DECRYPT_FAILED');
  }
}
function validateSnapshot(value: any): asserts value is CanonicalSnapshot {
  if (
    !value ||
    Object.keys(value).sort().join('|') !==
      'exported_at|schema_version|tables' ||
    value.schema_version !== '2.0' ||
    typeof value.exported_at !== 'string' ||
    !Number.isFinite(Date.parse(value.exported_at)) ||
    !value.tables ||
    Array.isArray(value.tables) ||
    Object.keys(value.tables).sort().join('|') !==
      [...tables].sort().join('|') ||
    value.partial
  )
    throw new RestoreError('RESTORE_SCHEMA_INVALID');
  if (value.tables.settings?.length !== 1 || value.tables.settings[0]?.id !== 1)
    throw new RestoreError('RESTORE_SCHEMA_INVALID');
  for (const table of tables)
    if (!Array.isArray(value.tables[table]))
      throw new RestoreError('RESTORE_SCHEMA_INVALID');
}
export async function restoreSnapshot(
  value: unknown,
  options: { now?: string; migrations?: string } = {},
) {
  validateSnapshot(value);
  const now = options.now ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(now)))
    throw new RestoreError('RESTORE_CLOCK_INVALID');
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("disposable-only")}}',
    d1Databases: ['DB'],
    d1Persist: false,
  });
  try {
    const db = (await mf.getD1Database('DB')) as unknown as D1Database;
    const migrations = resolve(options.migrations ?? 'apps/worker/migrations');
    for (const file of readdirSync(migrations)
      .filter((f) => /^\d+.*\.sql$/.test(f))
      .sort())
      for (const sql of readFileSync(resolve(migrations, file), 'utf8')
        .trim()
        .split(/;\n/))
        if (sql.trim()) await db.prepare(sql).run();
    const triggerRows = await db
      .prepare(
        "SELECT name,sql FROM sqlite_master WHERE type='trigger' AND sql IS NOT NULL",
      )
      .all<any>();
    // Audit triggers must not manufacture new events for restored historical rows.
    // Restore the exact trigger definitions before exposing the disposable handle.
    await db.batch([
      ...triggerRows.results.map((t) =>
        db.prepare('DROP TRIGGER ' + quote(t.name)),
      ),
      db.prepare('DELETE FROM settings'),
    ]);
    for (const table of tables) {
      const info = await db
        .prepare('PRAGMA table_info(' + quote(table) + ')')
        .all<any>();
      const columns = info.results.map((c) => c.name as string).sort();
      const pending: D1PreparedStatement[] = [];
      for (const row of value.tables[table]) {
        if (
          !row ||
          Array.isArray(row) ||
          typeof row !== 'object' ||
          Object.keys(row).sort().join('|') !== columns.join('|') ||
          Object.values(row).some(
            (v) =>
              v !== null &&
              typeof v !== 'string' &&
              (typeof v !== 'number' || !Number.isSafeInteger(v)),
          )
        )
          throw new RestoreError('RESTORE_COLUMNS_INVALID');
        pending.push(
          db
            .prepare(
              'INSERT INTO ' +
                quote(table) +
                '(' +
                columns.map(quote).join(',') +
                ') VALUES(' +
                columns.map(() => '?').join(',') +
                ')',
            )
            .bind(...columns.map((c) => row[c])),
        );
        if (pending.length === 256) await db.batch(pending.splice(0));
      }
      if (pending.length) await db.batch(pending);
    }
    if (triggerRows.results.length)
      await db.batch(triggerRows.results.map((t) => db.prepare(t.sql)));
    if ((await db.prepare('PRAGMA foreign_key_check').all()).results.length)
      throw new RestoreError('RESTORE_FOREIGN_KEYS_INVALID');
    const parity: Record<string, { rows: number; digest: string }> = {};
    for (const table of tables) {
      const actual = (
        await db.prepare('SELECT * FROM ' + quote(table)).all<any>()
      ).results;
      const digest = canonicalDigest(actual);
      if (
        actual.length !== value.tables[table].length ||
        digest !== canonicalDigest(value.tables[table])
      )
        throw new RestoreError('RESTORE_PARITY_FAILED');
      parity[table] = { rows: actual.length, digest };
    }
    const inventory = await db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all<any>();
    const forbidden: Record<string, number> = {};
    for (const { name } of inventory.results) {
      if (
        tables.includes(name) ||
        name === 'canonical_export_revision' ||
        name === 'reminder_rebuilds' ||
        name.startsWith('_cf_')
      )
        continue;
      const count = await db
        .prepare('SELECT count(*) n FROM ' + quote(name))
        .first<any>();
      if (count.n !== 0) throw new RestoreError('RESTORE_DISALLOWED_DATA');
      forbidden[name] = count.n;
    }
    const settings = JSON.parse(
      (value.tables.settings.find((r) => r.id === 1)?.value_json as string) ??
        '{}',
    );
    const policy = settings.reminder_policy ?? {
      enabled: true,
      offset_hours: [24, 3],
      date_only_hour: 9,
    };
    const rebuilds: D1PreparedStatement[] = [];
    for (const task of value.tables.tasks) {
      if (
        task.deleted_at !== null ||
        ['done', 'archived'].includes(String(task.status))
      )
        continue;
      const due = JSON.parse(String(task.due_json)) as Due;
      validateDue(due);
      if (
        reminderTimes(due, policy).some(
          (at) => Date.parse(at) > Date.parse(now),
        )
      )
        rebuilds.push(
          db
            .prepare(
              'INSERT INTO reminder_rebuilds(task_id,due_revision) VALUES(?,?)',
            )
            .bind(task.id, task.due_revision),
        );
    }
    for (let i = 0; i < rebuilds.length; i += 256)
      await db.batch(rebuilds.slice(i, i + 256));
    return {
      db,
      report: {
        schema_version: '2.0',
        disposable: true,
        dispatch_enabled: false,
        foreign_keys_ok: true,
        tables: parity,
        disallowed_tables: forbidden,
        tombstones_preserved: parity.source_tombstones.rows,
        future_rebuilds: rebuilds.length,
      },
      dispose: () => mf.dispose(),
    };
  } catch (error) {
    await mf.dispose();
    if (error instanceof RestoreError) throw error;
    throw new RestoreError('RESTORE_FAILED');
  }
}
export async function restoreEncryptedCanonical(
  archive: Uint8Array,
  key: Uint8Array,
  options: { now?: string; migrations?: string; maxBytes?: number } = {},
) {
  return restoreSnapshot(
    decryptCanonical(archive, key, options.maxBytes),
    options,
  );
}
