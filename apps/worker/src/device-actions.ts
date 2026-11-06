export function actionView(row: any, at = new Date().toISOString()) {
  return {
    ...row,
    progress: row.applied_at
      ? 'applied'
      : row.delivered_at
        ? 'delivered'
        : 'queued',
    status: row.applied_at
      ? 'confirmed'
      : row.retired_at
        ? 'retired_unconfirmed'
        : row.expires_at <= at
          ? 'expired'
          : 'pending',
    acknowledgment: row.applied_at
      ? 'applied'
      : row.delivered_at
        ? 'received_only'
        : 'never_acknowledged',
    late: !!row.applied_at && row.applied_at > row.expires_at,
  };
}
export async function relayActions(db: D1Database, source: any, value: any) {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    !Array.isArray(value.devices) ||
    value.devices.length > 100 ||
    value.devices.some((d: any) => typeof d !== 'string' || !uuid.test(d)) ||
    !Array.isArray(value.observations) ||
    value.observations.length > 100
  )
    throw Error('INVALID_ACTION_REPORT');
  for (const id of value.devices) {
    const existing = await db
      .prepare('SELECT source_id FROM capture_devices WHERE id=?')
      .bind(id)
      .first<any>();
    if (existing && existing.source_id !== source.id)
      throw Error('INVALID_ACTION_REPORT');
    await db
      .prepare('INSERT OR IGNORE INTO capture_devices VALUES(?,?)')
      .bind(id, source.id)
      .run();
  }
  if (source.purged_at)
    await db
      .prepare(
        'INSERT OR IGNORE INTO device_actions(id,source_id,device_id,generation,created_at,expires_at) SELECT lower(hex(randomblob(16))),source_id,id,?,?,? FROM capture_devices WHERE source_id=?',
      )
      .bind(
        source.generation,
        source.purged_at,
        new Date(Date.parse(source.purged_at) + 7 * 86400000).toISOString(),
        source.id,
      )
      .run();
  for (const o of value.observations) {
    if (
      Object.keys(o).sort().join(',') !== 'device_id,generation,phase' ||
      !uuid.test(o.device_id) ||
      !['delivered', 'applied'].includes(o.phase) ||
      o.generation !== source.generation ||
      !source.purged_at
    )
      throw Error('INVALID_ACTION_REPORT');
    const column = o.phase === 'applied' ? 'applied_at' : 'delivered_at';
    await db
      .prepare(
        `UPDATE device_actions SET ${column}=coalesce(${column},?) WHERE source_id=? AND device_id=? AND generation=? AND kind='purge'`,
      )
      .bind(new Date().toISOString(), source.id, o.device_id, o.generation)
      .run();
  }
  if (value.receipts !== undefined) {
    if (!Array.isArray(value.receipts) || value.receipts.length > 100)
      throw Error('INVALID_ACTION_REPORT');
    for (const r of value.receipts) {
      if (
        Object.keys(r).sort().join(',') !==
          'batch_id,device_id,generation,phase' ||
        !uuid.test(r.device_id) ||
        !uuid.test(r.batch_id) ||
        !Number.isInteger(r.generation) ||
        r.generation < 1 ||
        r.generation > source.generation ||
        !['queued', 'delivered', 'applied'].includes(r.phase)
      )
        throw Error('INVALID_ACTION_REPORT');
      const known = await db
        .prepare('SELECT id FROM capture_devices WHERE id=? AND source_id=?')
        .bind(r.device_id, source.id)
        .first();
      if (!known) throw Error('INVALID_ACTION_REPORT');
      const at = new Date().toISOString();
      await db
        .prepare(
          "INSERT OR IGNORE INTO device_actions(id,source_id,device_id,generation,kind,reference,created_at,expires_at) VALUES(?,?,?,?,'receipt',?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          source.id,
          r.device_id,
          r.generation,
          r.batch_id,
          at,
          new Date(Date.parse(at) + 7 * 86400000).toISOString(),
        )
        .run();
      if (r.phase !== 'queued') {
        const column = r.phase === 'applied' ? 'applied_at' : 'delivered_at';
        await db
          .prepare(
            `UPDATE device_actions SET ${column}=coalesce(${column},?) WHERE source_id=? AND device_id=? AND kind='receipt' AND reference=?`,
          )
          .bind(at, source.id, r.device_id, r.batch_id)
          .run();
      }
    }
  }
  return (
    await db
      .prepare(
        'SELECT * FROM device_actions WHERE source_id=? ORDER BY created_at,id LIMIT 100',
      )
      .bind(source.id)
      .all()
  ).results.map((r) => actionView(r));
}
