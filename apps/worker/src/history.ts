import { encodeCursor } from './task-list';
export async function listHistory(db: D1Database, url: URL) {
  const limit = Number(url.searchParams.get('limit') ?? 100);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw Error('INVALID_FILTER');
  const cursor = url.searchParams.get('cursor');
  let before: number | null = null;
  if (cursor) {
    try {
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(cursor)) throw Error();
      const c = JSON.parse(
        atob(cursor.replaceAll('-', '+').replaceAll('_', '/')),
      );
      if (
        !Array.isArray(c) ||
        c.length !== 2 ||
        c[0] !== 'history-v1' ||
        !Number.isSafeInteger(c[1]) ||
        c[1] < 1
      )
        throw Error();
      before = c[1];
    } catch {
      throw Error('INVALID_CURSOR');
    }
  }
  const rows = await db
    .prepare(
      'SELECT * FROM task_events' +
        (before ? ' WHERE id<?' : '') +
        ' ORDER BY id DESC LIMIT ?',
    )
    .bind(...(before ? [before] : []), limit + 1)
    .all<any>();
  const items = rows.results.slice(0, limit);
  return {
    items,
    cursor:
      rows.results.length > limit
        ? encodeCursor(['history-v1', items.at(-1).id])
        : null,
  };
}
