import tables from '../../../packages/contracts/canonical-tables.json';
export const EXPORT_TABLES: readonly string[] = tables;
export type CanonicalSnapshot = {
  schema_version: string;
  exported_at: string;
  tables: Record<string, Record<string, unknown>[]>;
  partial?: true;
};
// Quoting does not disable spreadsheet formulas. Neutralise before RFC 4180 escaping.
export function csvCell(value: unknown) {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export type ExportOptions = { table?: string; maxRows?: number };
export const DEFAULT_EXPORT_MAX_ROWS = 100000;
export function configuredExportLimit(value?: string) {
  if (value === undefined) return DEFAULT_EXPORT_MAX_ROWS;
  if (!/^[1-9][0-9]{0,6}$/.test(value) || Number(value) > 1000000)
    throw new ExportError('EXPORT_LIMIT_INVALID');
  return Number(value);
}
async function prepareExport(db: D1Database, options: ExportOptions) {
  const selected =
    options.table === undefined
      ? [...tables]
      : tables.filter((t) => t === options.table);
  if (!selected.length) throw new ExportError('INVALID_EXPORT_TABLE', 422);
  const max = options.maxRows ?? DEFAULT_EXPORT_MAX_ROWS;
  if (!Number.isSafeInteger(max) || max < 1 || max > 1000000)
    throw new ExportError('EXPORT_LIMIT_INVALID');
  let initial: D1Result<any>[];
  try {
    initial = await db.batch<any>([
      db.prepare(revisionSQL),
      db.prepare(
        'SELECT (' +
          selected
            .map((t) => '(SELECT count(*) FROM "' + t + '")')
            .join(' + ') +
          ') AS total',
      ),
      ...selected.map((t) => db.prepare('PRAGMA table_info("' + t + '")')),
    ]);
  } catch {
    throw new ExportError('EXPORT_UNAVAILABLE');
  }
  const revision = initial[0].results[0]?.revision;
  if (typeof revision !== 'string') throw new ExportError('EXPORT_UNAVAILABLE');
  const total = Number(initial[1].results[0]?.total ?? 0);
  if (!Number.isSafeInteger(total) || total > max)
    throw new ExportError('EXPORT_TOO_LARGE', 413, max);
  const info = initial.slice(2);
  const columns = Object.fromEntries(
    selected.map((t, i) => [t, info[i].results.map((c) => c.name as string)]),
  );
  if (selected.some((t) => !columns[t].length))
    throw new ExportError('EXPORT_UNAVAILABLE');
  const orders = selected.map((t, i) => {
    const primary = info[i].results
      .filter((c) => c.pk)
      .sort((a, b) => a.pk - b.pk)
      .map((c) => c.name);
    return (primary.length ? primary : columns[t])
      .map((c: string) => '"' + c.replaceAll('"', '""') + '"')
      .join(',');
  });
  return { selected, revision, columns, orders };
}
export async function readCanonical(
  db: D1Database,
  at: string,
  options: ExportOptions = {},
) {
  const { selected, revision, columns, orders } = await prepareExport(
    db,
    options,
  );
  let rows: D1Result<any>[];
  try {
    rows = await db.batch<any>([
      ...selected.map((t, i) =>
        db
          .prepare(
            'SELECT * FROM "' +
              t +
              '" WHERE (SELECT CAST(revision AS TEXT) FROM canonical_export_revision WHERE id=1)=? ORDER BY ' +
              orders[i],
          )
          .bind(revision),
      ),
      db.prepare(revisionSQL),
    ]);
  } catch {
    throw new ExportError('EXPORT_UNAVAILABLE');
  }
  if (rows[rows.length - 1].results[0]?.revision !== revision)
    throw new ExportError('EXPORT_SNAPSHOT_CHANGED', 409);
  const snapshot: CanonicalSnapshot = {
    schema_version: '2.0',
    exported_at: at,
    tables: Object.fromEntries(selected.map((t, i) => [t, rows[i].results])),
    ...(options.table === undefined ? {} : { partial: true }),
  };
  return { snapshot, columns };
}
// Bounded pages and bounded batches; no full-ledger materialisation.
export const CSV_PAGE_ROWS = 256;
export const CSV_PREFETCH_PAGES = 8;
export const CSV_CHUNK_BYTES = 16 * 1024;
export class ExportError extends Error {
  constructor(
    readonly code: string,
    readonly status = 503,
    readonly limit?: number,
  ) {
    super(code);
  }
}
const revisionSQL =
  'SELECT CAST(revision AS TEXT) revision FROM canonical_export_revision WHERE id=1';
export async function streamCanonicalCSV(
  db: D1Database,
  at: string,
  options: ExportOptions = {},
) {
  const { selected, revision, columns, orders } = await prepareExport(
    db,
    options,
  );
  const fields = selected.flatMap((table) =>
    columns[table].map((column) => ({ table, column })),
  );
  const encoder = new TextEncoder();
  let cancelled = false;
  function* fragments(value: string) {
    const bytes = encoder.encode(value);
    for (let start = 0; start < bytes.length; start += CSV_CHUNK_BYTES) {
      if (cancelled) return;
      yield bytes.subarray(start, start + CSV_CHUNK_BYTES);
    }
  }
  async function* chunks() {
    yield* fragments(
      [
        'schema_version',
        'exported_at',
        'table',
        ...fields.map((f) => f.table + '.' + f.column),
      ]
        .map(csvCell)
        .join(',') + '\r\n',
    );
    for (let i = 0; i < selected.length; i++) {
      const table = selected[i];
      let offset = 0,
        pageCount = 1;
      while (!cancelled) {
        let batch: D1Result<any>[];
        try {
          // Small tables need one page. Full tables amortise calls with at most
          // eight pages in one transaction, bounded at 2,048 returned rows.
          batch = await db.batch<any>([
            ...Array.from({ length: pageCount }, (_, page) =>
              db
                .prepare(
                  'SELECT * FROM "' +
                    table +
                    '" ORDER BY ' +
                    orders[i] +
                    ' LIMIT ? OFFSET ?',
                )
                .bind(CSV_PAGE_ROWS, offset + page * CSV_PAGE_ROWS),
            ),
            db.prepare(revisionSQL),
          ]);
        } catch {
          throw new ExportError('EXPORT_UNAVAILABLE');
        }
        if (cancelled) return;
        if (batch[batch.length - 1].results[0]?.revision !== revision)
          throw new ExportError('EXPORT_SNAPSHOT_CHANGED');
        let finished = false;
        for (const page of batch.slice(0, -1)) {
          const rows = page.results;
          for (const row of rows) {
            yield* fragments(
              [
                '2.0',
                at,
                table,
                ...fields.map((f) =>
                  f.table === table ? row[f.column] : null,
                ),
              ]
                .map(csvCell)
                .join(',') + '\r\n',
            );
          }
          if (rows.length < CSV_PAGE_ROWS) {
            finished = true;
            break;
          }
        }
        if (finished) break;
        offset += pageCount * CSV_PAGE_ROWS;
        pageCount = CSV_PREFETCH_PAGES;
      }
    }
    if (cancelled) return;
    try {
      if ((await db.prepare(revisionSQL).first<any>())?.revision !== revision)
        throw new ExportError('EXPORT_SNAPSHOT_CHANGED');
    } catch (error) {
      if (error instanceof ExportError) throw error;
      throw new ExportError('EXPORT_UNAVAILABLE');
    }
  }
  const iterator = chunks();
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          const next = await iterator.next();
          if (cancelled) return;
          if (next.done) controller.close();
          else controller.enqueue(next.value);
        } catch (error) {
          if (!cancelled)
            controller.error(
              error instanceof ExportError
                ? error
                : new ExportError('EXPORT_UNAVAILABLE'),
            );
        }
      },
      async cancel() {
        cancelled = true;
        await iterator.return(undefined);
      },
    },
    { highWaterMark: 0 },
  );
}
