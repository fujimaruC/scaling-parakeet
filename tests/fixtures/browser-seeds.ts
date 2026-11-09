/** Fixed scenarios imported only by the non-deployed loopback harness. */
export async function seedBrowserScenario(db: D1Database, name: string) {
  const at = new Date().toISOString();
  if (name === 'partial-ledger') {
    const prefix = crypto.randomUUID().slice(0, 24);
    await db
      .prepare(
        `WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<100)
      INSERT INTO tasks(id,title,kind,status,priority,due_json,created_at,updated_at)
      SELECT ?||printf('%012d',i),'Synthetic ledger tail '||i,'personal_action','todo','normal',?,?,? FROM n`,
      )
      .bind(
        prefix,
        JSON.stringify({
          precision: 'date_only',
          local_date: '2026-12-31',
          local_datetime: null,
          timezone: 'Asia/Makassar',
        }),
        at,
        at,
      )
      .run();
    return { inserted: 101 };
  }
  if (name === 'paged-history') {
    const id = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO tasks(id,title,kind,status,priority,due_json,created_at,updated_at) VALUES(?,'Synthetic paged history','personal_action','todo','normal',?,?,?)",
      )
      .bind(
        id,
        JSON.stringify({
          precision: 'unknown',
          local_date: null,
          local_datetime: null,
          timezone: null,
        }),
        at,
        at,
      )
      .run();
    // Actual audit trigger, immutable ID and version increments; fixture setup only.
    await db.batch(
      Array.from({ length: 35 }, (_, i) =>
        db
          .prepare(
            'UPDATE tasks SET description=?,version=version+1,updated_at=? WHERE id=?',
          )
          .bind('Synthetic revision ' + i, at, id),
      ),
    );
    return {
      task: await db.prepare('SELECT * FROM tasks WHERE id=?').bind(id).first(),
    };
  }
  throw Error('UNKNOWN_SYNTHETIC_SCENARIO');
}
