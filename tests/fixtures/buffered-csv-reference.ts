// Frozen buffered writer: test-only, not imported by production.
import tables from '../../packages/contracts/canonical-tables.json';
import type { CanonicalSnapshot } from '../../apps/worker/src/export';
export function csvCell(value: unknown) {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function bufferedCSVReference(
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
