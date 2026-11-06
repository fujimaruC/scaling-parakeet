import React, { useEffect, useRef, useState } from 'react';
import { Bitmap } from '../pixel/Bitmap';
import { ICONS } from '../pixel/icons';
import { UrgencyBar } from '../pixel/UrgencyBar';
import {
  type Task,
  type Locale,
  words,
  localDay,
  taskDay,
  groupTasks,
  groupKeys,
  dueLabel,
  when,
  timeLeft,
  exactInstant,
  reminderText,
} from './model';
import { useClock } from './clock';
const GEAR = [
  '001010100',
  '011111110',
  '110010011',
  '010000010',
  '110010011',
  '011111110',
  '001010100',
];
export function contextInfo(t: Task, contexts: any[], locale: Locale) {
  const c = contexts.find((c) => c.id === t.context_id),
    w = words[locale];
  return {
    name: c?.display_name ?? (t.context_id ? w.contextUnavailable : w.personal),
    type: c?.type ?? (t.context_id ? 'unknown' : 'personal'),
  };
}
function Meta({
  task,
  contexts,
  locale,
  view,
}: {
  task: Task;
  contexts: any[];
  locale: Locale;
  view?: any;
}) {
  const c = contextInfo(task, contexts, locale),
    w = words[locale];
  const labels = view?.sources?.map((s: any) => s.display_name) ?? [];
  return (
    <span className="s2-meta">
      <i className={`context-dot ${c.type}`} aria-hidden="true" />
      {c.name} ·{' '}
      {labels.length
        ? labels.join(' / ')
        : task.manual_owned
          ? w.manual
          : w.sourceUnknown}
    </span>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="s2-empty">
      <Bitmap rows={ICONS.star} scale={6} />
      <p>{text}</p>
    </div>
  );
}
export function TaskRow({
  task,
  contexts,
  locale,
  now,
  zone,
  onOpen,
}: {
  task: Task;
  contexts: any[];
  locale: Locale;
  now: number;
  zone: string;
  onOpen: (t: Task) => void;
}) {
  const w = words[locale],
    done = task.status === 'done';
  return (
    <article
      className={`s2-row pixel-box ${done ? 'is-done' : ''}`}
      data-task-id={task.id}
      aria-label={task.title}
    >
      <button
        className="s2-check"
        disabled
        aria-describedby="s2-readonly"
        aria-label={`${done ? w.undoComplete : w.complete}: ${task.title}`}
      >
        <span className="check-box" aria-hidden="true">
          {done && <Bitmap rows={ICONS.check} scale={2} />}
        </span>
      </button>
      <button className="s2-task-body" onClick={() => onOpen(task)}>
        <h3 className="s2-title">{task.title}</h3>
        <Meta task={task} contexts={contexts} locale={locale} />
        <span className="s2-meta">
          {dueLabel(task, locale)}
          {done ? ' · ' + w.done : ''}
        </span>
      </button>
      <span className="s2-when">{when(task, locale, now, zone)}</span>
    </article>
  );
}
function DueCard({
  task,
  contexts,
  locale,
  now,
  onOpen,
}: {
  task: Task;
  contexts: any[];
  locale: Locale;
  now: number;
  onOpen: (t: Task) => void;
}) {
  const w = words[locale],
    done = task.status === 'done';
  return (
    <article
      className={`pixel-box s2-due ${done ? 'is-done' : ''}`}
      data-task-id={task.id}
      aria-label={task.title}
    >
      <div className="s2-due-top">
        <button className="s2-task-body" onClick={() => onOpen(task)}>
          <h3 className="s2-title">{task.title}</h3>
          <Meta task={task} contexts={contexts} locale={locale} />
          <span className="s2-meta">{dueLabel(task, locale)}</span>
        </button>
        <span className="s2-time-left">
          {done ? w.done : timeLeft(task, locale, now)}
        </span>
      </div>
      {!done && (
        <UrgencyBar
          due={exactInstant(task)}
          now={now}
          precision={task.due.precision}
        />
      )}
      <button className="s2-full" disabled aria-describedby="s2-readonly">
        {done ? w.undoComplete : w.complete}
      </button>
    </article>
  );
}
export default function Ledger({
  page,
  tasks,
  contexts,
  locale,
  zone,
  pending,
  partial,
  onMore,
  canMore,
  onOpen,
  onPage,
  onSheet,
  group,
}: {
  page: 'today' | 'tasks';
  tasks: Task[];
  contexts: any[];
  locale: Locale;
  zone: string;
  pending: number | null;
  partial: boolean;
  onMore: () => void;
  canMore: boolean;
  onOpen: (t: Task) => void;
  onPage: (page: string) => void;
  onSheet: () => void;
  group?: string | null;
}) {
  const now = useClock(),
    w = words[locale];
  const [filter, setFilter] = useState('all'),
    [search, setSearch] = useState('');
  const undated = useRef<HTMLElement>(null);
  const selected = tasks.filter((t) => {
    const c = contextInfo(t, contexts, locale);
    return (
      (filter === 'all' || c.type === filter) &&
      t.title
        .toLocaleLowerCase(locale)
        .includes(search.toLocaleLowerCase(locale))
    );
  });
  const groups = groupTasks(selected, now, zone),
    allGroups = groupTasks(tasks, now, zone);
  const today = localDay(now, zone);
  const due = [
    ...allGroups.today,
    ...allGroups.done.filter((t) => {
      const d = taskDay(t, zone);
      return d !== null && d <= today;
    }),
  ];
  const week = [
    ...allGroups.week,
    ...allGroups.done.filter((t) => {
      const d = taskDay(t, zone);
      return (
        d !== null &&
        d > today &&
        d <=
          new Date(Date.parse(today + 'T12:00:00Z') + 7 * 86400000)
            .toISOString()
            .slice(0, 10)
      );
    }),
  ];
  useEffect(() => {
    if (group === 'undated' && page === 'tasks') {
      setFilter('all');
      setSearch('');
    }
  }, [group, page, tasks.length]);
  useEffect(() => {
    if (group === 'undated' && page === 'tasks' && filter === 'all' && !search)
      undated.current?.scrollIntoView({ block: 'start' });
  }, [group, page, filter, search, tasks.length]);
  const row = (task: Task) => (
    <TaskRow key={task.id} {...{ task, contexts, locale, now, zone, onOpen }} />
  );
  return (
    <div className="s2-ledger">
      <header className="s2-screen-head">
        <div>
          <p className="s2-date">
            <Bitmap rows={ICONS.star} scale={2} />
            {new Intl.DateTimeFormat(locale, {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              timeZone: zone,
            }).format(now)}
          </p>
          <h1>{w[page]}</h1>
        </div>
        <button
          className="s2-icon-button"
          aria-label={w.settings}
          onClick={() => onPage('settings')}
        >
          <Bitmap rows={GEAR} scale={2} />
        </button>
      </header>
      <p id="s2-readonly" className="s2-note">
        {w.readOnly}
      </p>
      {partial && (
        <p role="status" className="s2-partial">
          {w.partial}
          {canMore && <button onClick={onMore}>{w.more}</button>}
        </p>
      )}
      {page === 'today' ? (
        <>
          <div className="s2-chips">
            <span
              className={`pixel-chip ${allGroups.today.some((t) => taskDay(t, zone) === today) ? 'hot' : ''}`}
            >
              {allGroups.today.filter((t) => taskDay(t, zone) === today).length}{' '}
              {w.dueToday}
            </span>
            <span className="pixel-chip">
              {allGroups.week.length} {w.thisWeek}
            </span>
          </div>
          {pending !== null && pending > 0 && (
            <button
              className="pixel-box s2-review-banner"
              onClick={() => onPage('review')}
            >
              <strong>{pending}</strong>
              <span>
                {w.review}
                <small>{w.reviewHint}</small>
              </span>
              <Bitmap rows={ICONS.next} />
            </button>
          )}
          <section aria-labelledby="s2-due-heading">
            <h2 className="s2-section" id="s2-due-heading">
              {w.dueSection}
            </h2>
            {due.length ? (
              due.map((task) => (
                <DueCard
                  key={task.id}
                  {...{ task, contexts, locale, now, onOpen }}
                />
              ))
            ) : (
              <Empty text={partial ? w.noMatches : w.emptyToday} />
            )}
          </section>
          {week.length > 0 && (
            <section>
              <h2 className="s2-section">{w.week}</h2>
              {week.map(row)}
            </section>
          )}
          <section>
            <h2 className="s2-section">{w.undated}</h2>
            <button
              className="s2-unknown"
              onClick={() => onPage('tasks?group=undated')}
            >
              <strong>
                {allGroups.undated.length}
                {partial ? ' ' + w.loaded : ''}
              </strong>{' '}
              {w.unknownHint}
            </button>
          </section>
        </>
      ) : (
        <>
          <div className="s2-filters" role="group" aria-label={w.context}>
            {(['all', 'academic', 'organization', 'personal'] as const).map(
              (key) => (
                <button
                  key={key}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {w[key]}
                </button>
              ),
            )}
          </div>
          <label className="s2-search">
            {w.search}
            <input
              value={search}
              maxLength={200}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {groupKeys.map(
            (key) =>
              groups[key].length > 0 && (
                <section
                  ref={key === 'undated' ? undated : undefined}
                  key={key}
                  data-group={key}
                  aria-label={w[key]}
                >
                  <h2 className="s2-section">{w[key]}</h2>
                  {groups[key].map(row)}
                </section>
              ),
          )}
          {selected.filter((t) => t.status !== 'archived').length === 0 && (
            <Empty text={tasks.length ? w.noMatches : w.empty} />
          )}
        </>
      )}
    </div>
  );
}
export function TaskDetail({
  id,
  initial,
  contexts,
  locale,
  zone,
  offline,
  api,
  onClose,
  onDate,
  observedAt,
}: {
  id: string;
  initial?: Task;
  contexts: any[];
  locale: Locale;
  zone: string;
  offline: boolean;
  api: (path: string) => Promise<any>;
  onClose: () => void;
  onDate: () => void;
  observedAt?: string;
}) {
  const [historyError, setHistoryError] = useState(false);
  const [view, setView] = useState<any>(null),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const w = words[locale],
    now = useClock(),
    backButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let live = true;
    setView(null);
    setError(false);
    setHistoryError(false);
    backButton.current?.focus();
    if (!offline)
      api('/tasks/' + encodeURIComponent(id) + '?view=read')
        .then((v) => {
          if (live) setView(v);
        })
        .catch(() => {
          if (live) setError(true);
        });
    return () => {
      live = false;
    };
  }, [id, offline]);
  const task: Task | undefined = view?.task ?? (offline ? initial : undefined);
  const c = task ? contextInfo(task, contexts, locale) : null;
  return (
    <main
      aria-label={w.detail}
      className="s2-detail"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="s2-detail-body">
        <div className="s2-detail-head">
          <button
            ref={backButton}
            className="s2-icon-button"
            aria-label={w.back}
            onClick={onClose}
          >
            <Bitmap rows={ICONS.back} />
          </button>
          {c && <span className="pixel-tag">{c.name}</span>}
        </div>
        {error ? (
          <p role="alert">{w.taskMissing}</p>
        ) : !task ? (
          <p role="status">{offline ? w.offlineDetail : w.loading}</p>
        ) : (
          <>
            {offline && (
              <p role="status" className="banner">
                {w.snapshot} · {observedAt ?? w.unavailable} · {w.readOnly}
              </p>
            )}
            <h1 className="s2-detail-title">{task.title}</h1>
            <Meta task={task} contexts={contexts} locale={locale} view={view} />
            <p id="s2-readonly-detail" className="s2-note">
              {w.readOnly}
            </p>
            <section className="pixel-box s2-deadline">
              <h2 className="s2-section">{w.deadline}</h2>
              <p className="s2-big-date" data-precision={task.due.precision}>
                {dueLabel(task, locale)}
              </p>
              {Number.isFinite(exactInstant(task)) &&
                task.status !== 'done' && (
                  <>
                    <p className="s2-time-left">
                      {timeLeft(task, locale, now)}
                    </p>
                    <UrgencyBar
                      due={exactInstant(task)}
                      now={now}
                      precision={task.due.precision}
                    />
                  </>
                )}
              <h3>{w.reminders}</h3>
              <p className="s2-meta" data-reminder-policy>
                {view ? reminderText(task, view, locale) : w.unavailable}
              </p>
            </section>
            {task.description && (
              <section>
                <h2 className="s2-section">{w.notes}</h2>
                <p className="s2-notes">{task.description}</p>
              </section>
            )}
            <section>
              <h2 className="s2-section">{w.history}</h2>
              {!view ? (
                <p>{w.offlineDetail}</p>
              ) : (
                <>
                  <ol className="s2-timeline">
                    {view.history.map((event: any) => (
                      <li key={event.id} data-event-id={event.id}>
                        <span className="s2-meta">
                          {new Intl.DateTimeFormat(locale, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: zone,
                          }).format(new Date(event.created_at))}
                        </span>
                        <strong>
                          {event.event_type === 'created'
                            ? w.created
                            : w.updated}
                        </strong>
                        {(['before_json', 'after_json'] as const).map(
                          (key, i) => {
                            let data: any;
                            try {
                              data = JSON.parse(event[key]);
                            } catch {
                              return null;
                            }
                            if (!data?.due) return null;
                            return (
                              <p key={key}>
                                {i ? w.after : w.before}:{' '}
                                {dueLabel(
                                  {
                                    ...task,
                                    due: data.due,
                                    due_at_utc:
                                      data.due.precision === 'datetime'
                                        ? null
                                        : task.due_at_utc,
                                  },
                                  locale,
                                )}{' '}
                                ·{' '}
                                {w[data.status as keyof typeof w] ??
                                  w.unavailable}
                              </p>
                            );
                          },
                        )}
                      </li>
                    ))}
                  </ol>
                  {view.history.length === 0 && <p>{w.noHistory}</p>}
                  {historyError && <p role="alert">{w.unavailable}</p>}
                  {view.next_history_cursor && (
                    <button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setHistoryError(false);
                        try {
                          const next = await api(
                            '/tasks/' +
                              encodeURIComponent(id) +
                              '?view=read&history_before=' +
                              view.next_history_cursor,
                          );
                          if (next.task.version !== view.task.version) {
                            setView(
                              await api(
                                '/tasks/' +
                                  encodeURIComponent(id) +
                                  '?view=read',
                              ),
                            );
                          } else
                            setView({
                              ...next,
                              history: [...view.history, ...next.history],
                            });
                        } catch {
                          setHistoryError(true);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {w.moreHistory}
                    </button>
                  )}
                </>
              )}
            </section>
            <div className="s2-detail-actions">
              <button onClick={onDate}>{w.dateSheet}</button>
              <button disabled aria-describedby="s2-readonly-detail">
                {task.status === 'done' ? w.undoComplete : w.complete}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
