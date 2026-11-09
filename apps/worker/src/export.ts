import tables from '../../../packages/contracts/canonical-tables.json';
export const EXPORT_TABLES: readonly string[] = tables;
export type CanonicalSnapshot = {
  schema_version: string;
  exported_at: string;
  tables: Record<string, Record<string, unknown>[]>;
};
// Quoting does not disable spreadsheet formulas. Neutralise before RFC 4180 escaping.
export function csvCell(value: unknown) {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export async function readCanonical(db: D1Database, at: string) {
  // Schema metadata comes only from the fixed allowlist, never query parameters.
  const info = await db.batch<any>(
    tables.map((t) => db.prepare('PRAGMA table_info("' + t + '")')),
  );
  const columns = Object.fromEntries(
    tables.map((t, i) => [t, info[i].results.map((c) => c.name as string)]),
  );
  const rows = await db.batch<any>(
    tables.map((t, i) => {
      const primary = info[i].results
        .filter((c) => c.pk)
        .sort((a, b) => a.pk - b.pk)
        .map((c) => c.name);
      const order = (primary.length ? primary : columns[t])
        .map((c: string) => '"' + c.replaceAll('"', '""') + '"')
        .join(',');
      return db.prepare('SELECT * FROM "' + t + '" ORDER BY ' + order);
    }),
  );
  const snapshot: CanonicalSnapshot = {
    schema_version: '2.0',
    exported_at: at,
    tables: Object.fromEntries(tables.map((t, i) => [t, rows[i].results])),
  };
  return { snapshot, columns };
}
export function canonicalCSV(
  snapshot: CanonicalSnapshot,
  columns: Record<string, string[]>,
) {
  const fields = tables.flatMap((table) =>
    columns[table].map((column) => ({ table, column })),
  );
  const lines = [
    [
      'schema_version',
      'exported_at',
      'table',
      ...fields.map((f) => f.table + '.' + f.column),
    ]
      .map(csvCell)
      .join(','),
  ];
  for (const table of tables)
    for (const row of snapshot.tables[table])
      lines.push(
        [
          snapshot.schema_version,
          snapshot.exported_at,
          table,
          ...fields.map((f) => (f.table === table ? row[f.column] : null)),
        ]
          .map(csvCell)
          .join(','),
      );
  return lines.join('\r\n') + '\r\n';
}
