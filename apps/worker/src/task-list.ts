import { sha256 } from './auth';
import { calendarRange } from './calendar-range';
export function encodeCursor(parts: unknown[]) {
  return btoa(JSON.stringify(parts))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
export async function listTasks(db: D1Database, url: URL) {
  const limit = Number(url.searchParams.get('limit') ?? 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw Error('INVALID_FILTER');
  if ((url.searchParams.get('q') ?? '').length > 200)
    throw Error('INVALID_FILTER');
  const where = ['deleted_at IS NULL'];
  const bindings: any[] = [];
  const q = (url.searchParams.get('q') ?? '')
    .slice(0, 200)
    .replace(/[\\%_]/g, '\\$&');
  if (q) {
    if (url.searchParams.get('title_only') === '1') {
      where.push("title LIKE ? ESCAPE '\\'");
      bindings.push('%' + q + '%');
    } else {
      where.push(
        "(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')",
      );
      bindings.push('%' + q + '%', '%' + q + '%');
    }
  }
  const type = url.searchParams.get('context_type');
  if (type) {
    if (!['academic', 'organization', 'personal'].includes(type))
      throw Error('INVALID_FILTER');
    where.push(
      type === 'personal'
        ? '(context_id IS NULL OR context_id IN (SELECT id FROM contexts WHERE type=?))'
        : 'context_id IN (SELECT id FROM contexts WHERE type=?)',
    );
    bindings.push(type);
  }
  const from = url.searchParams.get('date_from'),
    through = url.searchParams.get('date_to');
  if (from || through) {
    if (!from || !through) throw Error('INVALID_FILTER');
    const [start, end] = calendarRange(
      from,
      through,
      url.searchParams.get('timezone') ?? 'Asia/Makassar',
    );
    where.push(
      "((json_extract(due_json,'$.precision')='datetime' AND due_at_utc>=? AND due_at_utc<?) OR (json_extract(due_json,'$.precision')='date_only' AND json_extract(due_json,'$.local_date')>=? AND json_extract(due_json,'$.local_date')<=?))",
    );
    bindings.push(start, end, from, through);
  }
  const context = url.searchParams.get('context_id');
  if (context) {
    where.push('context_id=?');
    bindings.push(context);
  }
  const status = url.searchParams.get('status');
  if (status) {
    if (!['todo', 'doing', 'done', 'blocked', 'archived'].includes(status))
      throw Error('INVALID_FILTER');
    where.push('status=?');
    bindings.push(status);
  }
  const filterScope = new URLSearchParams(url.search);
  filterScope.delete('cursor');
  filterScope.delete('limit');
  filterScope.sort();
  const scope = await sha256(filterScope.toString());
  let tail = '';
  const token = url.searchParams.get('cursor');
  if (token) {
    if (!/^[A-Za-z0-9_-]{1,600}$/.test(token)) throw Error('INVALID_CURSOR');
    let c: any;
    try {
      c = JSON.parse(atob(token.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      throw Error('INVALID_CURSOR');
    }
    if (
      !Array.isArray(c) ||
      c.length !== 5 ||
      c[0] !== 'tasks-v2' ||
      c[1] !== scope ||
      ![0, 1].includes(c[2]) ||
      typeof c[3] !== 'string' ||
      typeof c[4] !== 'string'
    )
      throw Error('INVALID_CURSOR');
    tail = ' WHERE (sort_group,sort_date,id)>(?,?,?)';
    bindings.push(...c.slice(2));
  }
  const rows = await db
    .prepare(
      "SELECT * FROM (SELECT *,CASE WHEN status IN ('done','archived') THEN 1 ELSE 0 END sort_group,COALESCE(substr(due_at_utc,1,10),json_extract(due_json,'$.local_date'),'9999') sort_date FROM tasks WHERE " +
        where.join(' AND ') +
        ')' +
        tail +
        ' ORDER BY sort_group,sort_date,id LIMIT ?',
    )
    .bind(...bindings, limit + 1)
    .all<any>();
  const items = rows.results.slice(0, limit);
  const last = items[items.length - 1];
  return {
    items: items.map((t) => ({
      ...t,
      due: JSON.parse(t.due_json),
      due_json: undefined,
      sort_group: undefined,
      sort_date: undefined,
    })),
    cursor:
      rows.results.length > limit && last
        ? encodeCursor([
            'tasks-v2',
            scope,
            last.sort_group,
            last.sort_date,
            last.id,
          ])
        : null,
  };
}
