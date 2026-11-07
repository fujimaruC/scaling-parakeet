import { useEffect, useState } from 'react';
import { Bitmap } from '../pixel/Bitmap';
import { ICONS } from '../pixel/icons';
import { TaskRow, type TaskActions } from '../read/Ledger';
import {
  localDay,
  taskDay,
  groupTasks,
  words,
  type Locale,
  type Task,
} from '../read/model';
import { useClock } from '../read/clock';
import type { Api } from './useWrites';
export default function Calendar({
  locale,
  zone,
  contexts,
  api,
  offline,
  onOpen,
  onUndated,
  actions,
  revision,
  go,
}: {
  locale: Locale;
  zone: string;
  contexts: any[];
  api: Api;
  offline: boolean;
  onOpen: (t: Task) => void;
  onUndated: () => void;
  actions: TaskActions;
  revision: string;
  go: (p: string) => void;
}) {
  const now = useClock(),
    today = localDay(now, zone),
    w = words[locale],
    en = locale === 'en';
  const params = new URLSearchParams(location.search),
    raw = params.get('month') ?? today.slice(0, 7);
  const month = /^(19|[2-8]\d|9[0-8])\d{2}-(0[1-9]|1[0-2])$/.test(raw)
    ? raw
    : today.slice(0, 7);
  const [year, m] = month.split('-').map(Number),
    last = new Date(Date.UTC(year, m, 0)).getUTCDate(),
    from = month + '-01',
    to = month + '-' + last;
  const selectedRaw = params.get('day'),
    selected =
      selectedRaw &&
      selectedRaw >= from &&
      selectedRaw <= to &&
      /^\d{4}-\d{2}-\d{2}$/.test(selectedRaw)
        ? selectedRaw
        : today.startsWith(month)
          ? today
          : from;
  const [view, setView] = useState<{
      key: string;
      items: Task[];
      cursor: string | null;
      observed?: string;
      cached?: boolean;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const path =
    '/tasks?limit=100&date_from=' +
    from +
    '&date_to=' +
    to +
    '&timezone=' +
    encodeURIComponent(zone);
  useEffect(() => {
    let live = true;
    setView(null);
    setFailed(false);
    setBusy(true);
    api(path)
      .then((v) => {
        if (live)
          setView({
            key: path,
            items: v.items,
            cursor: v.next_cursor,
            observed: v.observed_at,
            cached: v.cached,
          });
      })
      .catch(() => {
        if (live) setFailed(true);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [path, offline, revision]);
  const items = view?.key === path ? view.items : [],
    cursor = view?.key === path ? view.cursor : null;
  const offset = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  const shift = (delta: number) => {
    const next = new Date(Date.UTC(year, m - 1 + delta, 1))
      .toISOString()
      .slice(0, 7);
    go('/calendar?month=' + next);
  };
  const chosen = groupTasks(
      items.filter((t) => taskDay(t, zone) === selected),
      now,
      zone,
    ),
    rows = Object.values(chosen).flat();
  return (
    <section className="paper-calendar">
      <div className="calendar-toolbar">
        <button
          aria-label={en ? 'Previous month' : 'Bulan sebelumnya'}
          onClick={() => shift(-1)}
          disabled={year <= 1900 && m === 1}
        >
          <Bitmap rows={ICONS.prev} />
        </button>
        <h2>
          {new Intl.DateTimeFormat(locale, {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(new Date(from + 'T12:00:00Z'))}
        </h2>
        <button
          aria-label={en ? 'Next month' : 'Bulan berikutnya'}
          onClick={() => shift(1)}
          disabled={year >= 9899 && m === 12}
        >
          <Bitmap rows={ICONS.next} />
        </button>
      </div>
      {busy && <p role="status">{w.loading}</p>}
      {failed && (
        <p role="alert">
          {w.unavailable}{' '}
          {en ? 'This month was not observed.' : 'Bulan ini belum diamati.'}
        </p>
      )}
      {view?.cached && (
        <p className="banner">
          {en ? 'Saved month, read only' : 'Bulan tersimpan, hanya baca'} ·{' '}
          {view.observed}
        </p>
      )}
      {cursor && (
        <p className="s2-partial">
          {en
            ? 'Partial month — dots and day lists describe loaded tasks only.'
            : 'Bulan parsial — titik dan daftar hari hanya mencakup tugas dimuat.'}
          <button
            disabled={offline || busy}
            onClick={async () => {
              const key = path;
              setBusy(true);
              try {
                const v = await api(
                  path + '&cursor=' + encodeURIComponent(cursor),
                );
                setView((old) =>
                  old?.key === key
                    ? {
                        key,
                        items: [
                          ...old.items,
                          ...v.items.filter(
                            (t: Task) => !old.items.some((i) => i.id === t.id),
                          ),
                        ],
                        cursor: v.next_cursor,
                      }
                    : old,
                );
              } catch {
                setFailed(true);
              } finally {
                setBusy(false);
              }
            }}
          >
            {w.more}
          </button>
        </p>
      )}
      <div className="month-grid" role="group" aria-label={w.calendar}>
        {Array.from({ length: 7 }, (_, i) => (
          <span className="weekday" key={'w' + i}>
            {new Intl.DateTimeFormat(locale, {
              weekday: 'short',
              timeZone: 'UTC',
            }).format(new Date(Date.UTC(2026, 10, 2 + i)))}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={'x' + i} />
        ))}
        {Array.from({ length: last }, (_, i) => {
          const day = month + '-' + String(i + 1).padStart(2, '0'),
            tasks = items.filter(
              (t) => taskDay(t, zone) === day && t.status !== 'archived',
            ),
            active = tasks.filter((t) => t.status !== 'done'),
            available = !!view && !failed;
          return (
            <button
              className="month-day"
              key={day}
              aria-current={day === today ? 'date' : undefined}
              aria-pressed={selected === day}
              aria-label={
                new Intl.DateTimeFormat(locale, {
                  dateStyle: 'long',
                  timeZone: 'UTC',
                }).format(new Date(day + 'T12:00:00Z')) +
                ', ' +
                (available
                  ? tasks.length +
                    ' ' +
                    (cursor
                      ? en
                        ? 'loaded tasks'
                        : 'tugas dimuat'
                      : en
                        ? 'tasks'
                        : 'tugas')
                  : w.unavailable)
              }
              onClick={() => go('/calendar?month=' + month + '&day=' + day)}
            >
              <span>{i + 1}</span>
              <span className="day-dots" aria-hidden="true">
                {active.slice(0, 3).map((t) => (
                  <i
                    key={t.id}
                    className={
                      contexts.find((c) => c.id === t.context_id)?.type ??
                      'personal'
                    }
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <h3 className="s2-section">
        {new Intl.DateTimeFormat(locale, {
          dateStyle: 'full',
          timeZone: 'UTC',
        }).format(new Date(selected + 'T12:00:00Z'))}
      </h3>
      {rows.length
        ? rows.map((task) => (
            <TaskRow
              key={task.id}
              {...{ task, contexts, locale, now, zone, onOpen, actions }}
            />
          ))
        : !busy &&
          !failed &&
          view && (
            <p>
              {cursor
                ? en
                  ? 'No tasks in the loaded portion of this day.'
                  : 'Belum ada tugas pada bagian hari yang dimuat.'
                : en
                  ? 'No deadlines on this day.'
                  : 'Tidak ada tenggat di hari ini.'}
            </p>
          )}
      <button className="s2-unknown" onClick={onUndated}>
        {w.undated} →
      </button>
    </section>
  );
}
