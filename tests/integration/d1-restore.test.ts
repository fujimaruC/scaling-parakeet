import { beforeAll, afterAll, expect, test } from 'vitest';
import { Miniflare } from 'miniflare';
import {
  readFileSync,
  readdirSync,
  mkdtempSync,
  writeFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  readCanonical,
  type CanonicalSnapshot,
  EXPORT_TABLES,
} from '../../apps/worker/src/export';
import { restoreEncryptedCanonical } from '../../scripts/lib/d1-restore';
let mf: Miniflare, snapshot: CanonicalSnapshot;
const at = '2030-01-01T00:00:00.000Z';
const unknown = {
  precision: 'unknown',
  local_date: null,
  local_datetime: null,
  timezone: null,
};
function encrypted(value: unknown, raw = false) {
  const directory = mkdtempSync(join(tmpdir(), 'aos-encrypted-restore-'));
  try {
    const input = join(directory, 'canonical.json'),
      archive = join(directory, 'archive.bin'),
      key = join(directory, 'key');
    writeFileSync(input, JSON.stringify(value), { mode: 0o600 });
    const python =
      process.env.AOS_TEST_PYTHON ??
      (existsSync('.venv/bin/python')
        ? resolve('.venv/bin/python')
        : 'python3');
    const code = raw
      ? 'from cryptography.fernet import Fernet; from pathlib import Path; import sys,os; k=Fernet.generate_key(); Path(sys.argv[3]).write_bytes(k); os.chmod(sys.argv[3],0o600); Path(sys.argv[2]).write_bytes(Fernet(k).encrypt(Path(sys.argv[1]).read_bytes()))'
      : 'from academic_os.backup import encrypt; import sys; encrypt(*sys.argv[1:])';
    const result = spawnSync(python, ['-c', code, input, archive, key], {
      env: { ...process.env, PYTHONPATH: resolve('collectors/local/src') },
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(0);
    return { archive: readFileSync(archive), key: readFileSync(key) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
function digest(rows: Record<string, unknown>[]) {
  return createHash('sha256')
    .update(
      '[' +
        rows
          .map((row) => JSON.stringify(row, Object.keys(row).sort()))
          .sort()
          .join(',') +
        ']',
    )
    .digest('hex');
}
beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("synthetic")}}',
    d1Databases: ['DB'],
  });
  const db = (await mf.getD1Database('DB')) as unknown as D1Database;
  for (const file of readdirSync('apps/worker/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    for (const sql of readFileSync('apps/worker/migrations/' + file, 'utf8')
      .trim()
      .split(/;\n/))
      if (sql.trim()) await db.prepare(sql).run();
  const future = {
    precision: 'datetime',
    local_date: null,
    local_datetime: '2030-01-05T20:00:00',
    timezone: 'Asia/Makassar',
  };
  await db.batch([
    db.prepare(
      "INSERT INTO contexts(id,type,display_name) VALUES('org','organization','Synthetic organization')",
    ),
    db.prepare(
      "INSERT INTO sources(id,display_name,kind) VALUES('source','Synthetic source','itk_lms')",
    ),
    ...['future', 'past', 'done', 'archived', 'unknown', 'date-only'].map(
      (id) => {
        const due =
          id === 'unknown'
            ? unknown
            : id === 'date-only'
              ? {
                  precision: 'date_only',
                  local_date: '2030-01-05',
                  local_datetime: null,
                  timezone: 'Asia/Makassar',
                }
              : id === 'past'
                ? { ...future, local_datetime: '2029-12-30T20:00:00' }
                : future;
        return db
          .prepare(
            "INSERT INTO tasks(id,context_id,title,kind,status,priority,due_json,due_at_utc,created_at,updated_at) VALUES(?,'org',?,'assignment',?,'normal',?,?,?,?)",
          )
          .bind(
            id,
            'Synthetic ' + id,
            ['done', 'archived'].includes(id) ? id : 'todo',
            JSON.stringify(due),
            id === 'unknown' || id === 'date-only'
              ? null
              : id === 'past'
                ? '2029-12-30T12:00:00.000Z'
                : '2030-01-05T12:00:00.000Z',
            at,
            at,
          );
      },
    ),
    db
      .prepare(
        "INSERT INTO source_items(id,source_id,generation,observed_at,local_evidence_available) VALUES('evidence','source',1,?,1)",
      )
      .bind(at),
    db
      .prepare(
        "INSERT INTO candidates(id,source_id,generation,fields_json,issues_json,created_at,updated_at) VALUES('candidate','source',1,?,'[]',?,?)",
      )
      .bind(
        JSON.stringify({
          kind: 'assignment',
          title: 'Synthetic proposal',
          due: unknown,
        }),
        at,
        at,
      ),
    db.prepare("INSERT INTO candidate_evidence VALUES('candidate','evidence')"),
    db
      .prepare(
        "INSERT INTO review_actions VALUES('approval','candidate','accept_new',?)",
      )
      .bind(at),
    db.prepare(
      "INSERT INTO task_evidence VALUES('future','evidence','approval')",
    ),
    db.prepare("INSERT INTO source_tombstones VALUES('source',0,?)").bind(at),
    db.prepare(
      "INSERT INTO collector_credentials VALUES('excluded','source','synthetic-not-real',0)",
    ),
    db.prepare(
      "INSERT INTO replay_nonces VALUES('excluded','synthetic-nonce',1)",
    ),
    db
      .prepare(
        "INSERT INTO push_subscriptions VALUES('excluded','https://synthetic.invalid/endpoint',?,NULL,'synthetic-key')",
      )
      .bind(at),
    db.prepare(
      "INSERT INTO reminder_intents(id,task_id,due_revision,scheduled_for_utc) VALUES('old','future',1,'2029-12-01T00:00:00Z')",
    ),
    db
      .prepare(
        "INSERT INTO notification_inbox(id,intent_id,task_id,created_at) VALUES('old','old','future',?)",
      )
      .bind(at),
  ]);
  snapshot = (await readCanonical(db, at)).snapshot;
});
afterAll(() => mf.dispose());
test('disposable D1 restores all canonical tables with parity and future-only rebuilds', async () => {
  const input = encrypted(snapshot),
    restored = await restoreEncryptedCanonical(input.archive, input.key, {
      now: at,
    });
  try {
    expect(Object.keys(restored.report.tables)).toEqual(EXPORT_TABLES);
    for (const table of EXPORT_TABLES) {
      const actual = (
        await restored.db.prepare('SELECT * FROM "' + table + '"').all<any>()
      ).results;
      expect(snapshot.tables[table].length, table).toBeGreaterThan(0);
      expect(actual.length, table).toBe(snapshot.tables[table].length);
      expect(digest(actual), table).toBe(digest(snapshot.tables[table]));
      expect(restored.report.tables[table]).toEqual({
        rows: actual.length,
        digest: digest(actual),
      });
    }
    expect(
      (await restored.db.prepare('PRAGMA foreign_key_check').all()).results,
    ).toEqual([]);
    expect(
      (await restored.db.prepare('SELECT * FROM source_tombstones').all())
        .results,
    ).toEqual(snapshot.tables.source_tombstones);
    for (const table of [
      'collector_credentials',
      'owner_client_credentials',
      'push_subscriptions',
      'replay_nonces',
      'reminder_intents',
      'notification_inbox',
      'push_attempts',
    ])
      expect(
        (await restored.db
          .prepare('SELECT count(*) n FROM "' + table + '"')
          .first<any>())!.n,
        table,
      ).toBe(0);
    expect(restored.report.dispatch_enabled).toBe(false);
    expect(
      (
        await restored.db
          .prepare('SELECT task_id FROM reminder_rebuilds ORDER BY task_id')
          .all<any>()
      ).results.map((r) => r.task_id),
    ).toEqual(['date-only', 'future']);
    const before = await restored.db
      .prepare('SELECT revision FROM canonical_export_revision')
      .first<any>();
    await restored.db
      .prepare("UPDATE tasks SET title='Synthetic edited' WHERE id='future'")
      .run();
    expect(
      (await restored.db
        .prepare('SELECT revision FROM canonical_export_revision')
        .first<any>())!.revision,
    ).toBeGreaterThan(before!.revision);
  } finally {
    await restored.dispose();
  }
});
test('encrypted D1 restore fails closed for a corrupt key or tampered token', async () => {
  const value = encrypted(snapshot);
  await expect(
    restoreEncryptedCanonical(value.archive, Buffer.from('not-a-key')),
  ).rejects.toThrow('RESTORE_DECRYPT_FAILED');
  const changed = Buffer.from(value.archive);
  changed[45] = changed[45] === 65 ? 66 : 65;
  await expect(restoreEncryptedCanonical(changed, value.key)).rejects.toThrow(
    'RESTORE_DECRYPT_FAILED',
  );
});
test('restore rejects authenticated wrong schema, partial snapshots and disallowed tables', async () => {
  for (const value of [
    { ...snapshot, schema_version: '3.0' },
    { ...snapshot, partial: true },
    { ...snapshot, tables: { ...snapshot.tables, push_subscriptions: [] } },
  ]) {
    const input = encrypted(value, true);
    await expect(
      restoreEncryptedCanonical(input.archive, input.key),
    ).rejects.toThrow('RESTORE_SCHEMA_INVALID');
  }
});
test('invalid columns or references never expose a partially restored handle', async () => {
  const bad = structuredClone(snapshot);
  bad.tables.tasks[0].unknown_private_column = 'synthetic';
  const input = encrypted(bad, true);
  await expect(
    restoreEncryptedCanonical(input.archive, input.key),
  ).rejects.toThrow('RESTORE_COLUMNS_INVALID');
  const foreign = structuredClone(snapshot);
  foreign.tables.tasks[0].context_id = 'missing';
  const other = encrypted(foreign, true);
  await expect(
    restoreEncryptedCanonical(other.archive, other.key),
  ).rejects.toThrow(/RESTORE_/);
});
