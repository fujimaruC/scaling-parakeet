import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
const strings = {
  id: {
    today: 'Hari ini',
    tasks: 'Tanggung jawab',
    review: 'Perlu ditinjau',
    calendar: 'Kalender',
    sources: 'Sumber',
    history: 'Riwayat',
    inbox: 'Pengingat',
    settings: 'Pengaturan',
    hello: 'Ruang untuk mengingat.',
    intro: 'Kuliah, himpunan, dan hal yang perlu kamu tuntaskan.',
    add: 'Tambah tugas',
    title: 'Nama tugas',
    context: 'Konteks',
    save: 'Simpan',
    cancel: 'Batal',
    nodate: 'Belum ada tanggal',
    date: 'Tenggat',
    time: 'Jam (opsional)',
    type: 'Jenis',
    academic: 'Akademik',
    organization: 'Organisasi',
    personal: 'Pribadi',
    complete: 'Selesai',
    empty: 'Belum ada tanggung jawab di sini.',
    emptyhint: 'Tambahkan satu hal yang ingin kamu ingat.',
    accept: 'Setujui',
    reject: 'Tolak',
    evidence:
      'Pesan asli tersedia di perangkat Linux. Usulan ini belum disetujui.',
    offline:
      'Offline · menampilkan salinan tersimpan. Perubahan dinonaktifkan.',
    search: 'Cari tanggung jawab…',
    refresh: 'Muat ulang',
    logout: 'Keluar & hapus salinan',
    signin: 'Masuk melalui akses pribadi untuk membuka ruangmu.',
    secure: 'Akses pribadi',
    theme: 'Ganti tema',
    lang: 'English',
    export: 'Ekspor data',
    sourceempty: 'Belum ada sumber terhubung. Entri manual tetap tersedia.',
    partial: 'Pengumpulan pesan bersifat parsial. Pesan lain mungkin terlewat.',
    due: 'Mendatang',
    pending: 'Usulan',
    all: 'Semua',
    createcontext: 'Tambah konteks',
    error: 'Perubahan belum tersimpan. Coba lagi.',
    archived: 'Arsip',
    todo: 'Belum selesai',
    doing: 'Dikerjakan',
    done: 'Selesai',
    blocked: 'Terhambat',
  },
  en: {
    today: 'Today',
    tasks: 'Responsibilities',
    review: 'Review inbox',
    calendar: 'Calendar',
    sources: 'Sources',
    history: 'History',
    inbox: 'Reminders',
    settings: 'Settings',
    hello: 'A little room to remember.',
    intro: 'Your courses, your community, and what needs your attention.',
    add: 'Add task',
    title: 'Task title',
    context: 'Context',
    save: 'Save',
    cancel: 'Cancel',
    nodate: 'No date yet',
    date: 'Deadline',
    time: 'Time (optional)',
    type: 'Type',
    academic: 'Academic',
    organization: 'Organization',
    personal: 'Personal',
    complete: 'Complete',
    empty: 'Nothing to keep track of here yet.',
    emptyhint: 'Add one thing you want to remember.',
    accept: 'Approve',
    reject: 'Reject',
    evidence:
      'Original message is available on Linux. This proposal is not approved.',
    offline: 'Offline · showing a saved snapshot. Editing is disabled.',
    search: 'Search responsibilities…',
    refresh: 'Refresh',
    logout: 'Sign out & clear snapshot',
    signin: 'Sign in through private access to open your workspace.',
    secure: 'Private access',
    theme: 'Switch theme',
    lang: 'Bahasa Indonesia',
    export: 'Export data',
    sourceempty: 'No sources connected yet. Manual entry is ready.',
    partial: 'Message coverage is partial. Other messages may be missing.',
    due: 'Upcoming',
    pending: 'Proposals',
    all: 'All',
    createcontext: 'Add context',
    error: 'Your change was not saved. Please retry.',
    archived: 'Archived',
    todo: 'To do',
    doing: 'In progress',
    done: 'Done',
    blocked: 'Blocked',
  },
};
type Locale = keyof typeof strings;
type Page =
  | 'today'
  | 'tasks'
  | 'review'
  | 'calendar'
  | 'sources'
  | 'history'
  | 'inbox'
  | 'settings';
async function api(
  path: string,
  method = 'GET',
  value?: unknown,
  headers: Record<string, string> = {},
) {
  const r = await fetch('/api/v1' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: value === undefined ? undefined : JSON.stringify(value),
  });
  const j: any = await r.json();
  if (!r.ok)
    throw Object.assign(new Error(j.error?.code ?? 'REQUEST_FAILED'), {
      status: r.status,
    });
  return j.data;
}
async function snapshot(write?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('academic-os-private', 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore('snapshot');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('snapshot', write ? 'readwrite' : 'readonly');
      const store = tx.objectStore('snapshot');
      const r = write ? store.put(write, 'owner') : store.get('owner');
      r.onsuccess = () => {
        const value = r.result;
        tx.oncomplete = () => {
          db.close();
          resolve(write ?? value);
        };
      };
      r.onerror = () => {
        db.close();
        reject(r.error);
      };
    };
  });
}
function App() {
  const [locale, setLocale] = useState<Locale>(
    (localStorage.getItem('locale') as Locale) || 'id',
  );
  const s = strings[locale] ?? strings.id;
  const [dark, setDark] = useState(localStorage.getItem('theme') === 'dark');
  const [page, setPage] = useState<Page>('today');
  const [tasks, setTasks] = useState<any[]>([]),
    [contexts, setContexts] = useState<any[]>([]),
    [candidates, setCandidates] = useState<any[]>([]),
    [sources, setSources] = useState<any[]>([]),
    [rows, setRows] = useState<any[]>([]);
  const [offline, setOffline] = useState(false),
    [signed, setSigned] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [updated, setUpdated] = useState('');
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState(''),
    [form, setForm] = useState(false),
    [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    context_id: '',
    date: '',
    time: '',
    kind: 'assignment',
  });
  const [newContext, setNewContext] = useState(''),
    [newType, setNewType] = useState('academic');
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem('locale', locale);
  }, [locale]);
  async function load() {
    setLoading(true);
    setError('');
    try {
      const me = await api('/me');
      const [ts, cs, ps, ss] = await Promise.all([
        api('/tasks?limit=100'),
        api('/contexts'),
        api('/candidates'),
        api('/sources'),
      ]);
      setTasks(ts);
      setContexts(cs);
      setCandidates(ps);
      setSources(ss);
      setSigned(true);
      setOffline(false);
      const at = new Date().toISOString();
      setUpdated(at);
      await snapshot({
        owner: me.subject,
        tasks: ts,
        contexts: cs,
        updated: at,
      });
    } catch (e: any) {
      if (e.status === 401 || e.status === 403) {
        indexedDB.deleteDatabase('academic-os-private');
        setSigned(false);
        setTasks([]);
      } else {
        const cache = await snapshot().catch(() => null);
        if (cache) {
          setTasks(cache.tasks);
          setContexts(cache.contexts);
          setUpdated(cache.updated);
          setSigned(true);
          setOffline(true);
        } else setError(s.error);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const online = () => void load();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);
  useEffect(() => {
    if (['history', 'inbox'].includes(page) && !offline)
      api(page === 'history' ? '/history' : '/reminders')
        .then(setRows)
        .catch(() => setError(s.error));
  }, [page, offline]);
  async function mutate(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch {
      setError(s.error);
    } finally {
      setBusy(false);
    }
  }
  const active = tasks.filter((t) => !['done', 'archived'].includes(t.status));
  const visible = (page === 'today' ? active : tasks)
    .filter(
      (t) =>
        (!filter || t.context_id === filter) &&
        t.title.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      (a.due.local_datetime ?? a.due.local_date ?? '9999').localeCompare(
        b.due.local_datetime ?? b.due.local_date ?? '9999',
      ),
    );
  const formatDue = (t: any) =>
    t.due.precision === 'datetime'
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: t.due.timezone,
        }).format(new Date(t.due_at_utc))
      : (t.due.local_date ?? s.nodate);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await mutate(async () => {
      const due = draft.date
        ? {
            precision: draft.time ? 'datetime' : 'date_only',
            local_date: draft.time ? null : draft.date,
            local_datetime: draft.time
              ? draft.date + 'T' + draft.time + ':00'
              : null,
            timezone: 'Asia/Makassar',
          }
        : {
            precision: 'unknown',
            local_date: null,
            local_datetime: null,
            timezone: null,
          };
      await api(
        '/tasks',
        'POST',
        {
          title: draft.title,
          context_id: draft.context_id || null,
          kind: draft.kind,
          due,
        },
        { 'Idempotency-Key': crypto.randomUUID() },
      );
      setForm(false);
      setDraft({
        title: '',
        context_id: '',
        date: '',
        time: '',
        kind: 'assignment',
      });
    });
  }
  const nav: Page[] = [
    'today',
    'tasks',
    'review',
    'calendar',
    'sources',
    'history',
    'inbox',
    'settings',
  ];
  return (
    <div className="app">
      <aside>
        <a className="brand" href="/">
          a<span>Academic OS</span>
        </a>
        <p className="private">● {s.secure}</p>
        <nav aria-label="Navigation">
          {nav.map((p, i) => (
            <button
              key={p}
              aria-current={page === p ? 'page' : undefined}
              onClick={() => setPage(p)}
            >
              <span aria-hidden>
                {['◷', '✓', '◇', '▦', '↗', '↶', '♧', '⚙'][i]}
              </span>
              {s[p]}
              {p === 'review' && candidates.length > 0 && (
                <b>{candidates.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="aside-bottom">
          <button onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}>
            {s.lang}
          </button>
          <button onClick={() => setDark(!dark)}>{s.theme}</button>
          <small>Asia/Makassar · UTC+8</small>
        </div>
      </aside>
      <main>
        <header>
          <select
            aria-label="Page"
            className="mobile-pages"
            value={page}
            onChange={(e) => setPage(e.target.value as Page)}
          >
            {nav.map((p) => (
              <option key={p} value={p}>
                {s[p]}
              </option>
            ))}
          </select>
          <span className="eyebrow">YOUR PERSONAL MEMORY</span>
          <button onClick={() => void load()} disabled={loading}>
            {s.refresh}
          </button>
        </header>
        {error && (
          <p role="alert" className="banner">
            {error}
          </p>
        )}
        {offline && (
          <p role="status" className="banner">
            {s.offline} {updated}
          </p>
        )}
        {loading ? (
          <p role="status">Loading…</p>
        ) : !signed ? (
          <section className="empty">
            <h1>Academic OS</h1>
            <p>{s.signin}</p>
          </section>
        ) : (
          <>
            <section className="heading">
              <div>
                <p className="eyebrow">
                  {new Intl.DateTimeFormat(locale, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    timeZone: 'Asia/Makassar',
                  }).format(new Date())}
                </p>
                <h1>{page === 'today' ? s.hello : s[page]}</h1>
                <p>{s.intro}</p>
              </div>
              <button
                className="primary"
                onClick={() => setForm(true)}
                disabled={offline}
              >
                + {s.add}
              </button>
            </section>
            {page === 'today' && (
              <section className="overview" aria-label="Overview">
                <div>
                  <strong>{active.length}</strong>
                  <span>{s.tasks}</span>
                </div>
                <div>
                  <strong>{candidates.length}</strong>
                  <span>{s.pending}</span>
                </div>
                <div>
                  <strong>
                    {active.filter((t) => t.due.precision === 'unknown').length}
                  </strong>
                  <span>{s.nodate}</span>
                </div>
              </section>
            )}
            {['today', 'tasks', 'calendar'].includes(page) && (
              <>
                <div className="toolbar">
                  <input
                    aria-label={s.search}
                    placeholder={s.search}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select
                    aria-label={s.context}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="">{s.all}</option>
                    {contexts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.display_name}
                      </option>
                    ))}
                  </select>
                </div>
                <section className="task-list">
                  {!visible.length ? (
                    <div className="empty">
                      <span className="empty-icon">✓</span>
                      <h2>{s.empty}</h2>
                      <p>{s.emptyhint}</p>
                    </div>
                  ) : (
                    visible.map((t) => (
                      <article className="task" key={t.id}>
                        <button
                          className="check"
                          aria-label={s.complete + ': ' + t.title}
                          disabled={offline || busy || t.status === 'done'}
                          onClick={() =>
                            void mutate(() =>
                              api(
                                '/tasks/' + t.id,
                                'PATCH',
                                { status: 'done' },
                                { 'If-Match': String(t.version) },
                              ),
                            )
                          }
                        >
                          {t.status === 'done' ? '✓' : ''}
                        </button>
                        <div>
                          <small>
                            {contexts.find((c) => c.id === t.context_id)
                              ?.display_name ?? s.personal}{' '}
                            <span>
                              · {s[t.status as keyof typeof s] ?? t.status}
                            </span>
                          </small>
                          <h2>{t.title}</h2>
                          <p>{formatDue(t)}</p>
                        </div>
                        {page === 'calendar' && (
                          <span className="date-chip">
                            {t.due.local_date?.slice(-2) ?? '—'}
                          </span>
                        )}
                      </article>
                    ))
                  )}
                </section>
              </>
            )}
            {page === 'review' && (
              <section>
                {candidates.length === 0 ? (
                  <div className="empty">
                    <h2>{s.empty}</h2>
                  </div>
                ) : (
                  candidates.map((c) => (
                    <article className="proposal" key={c.id}>
                      <span className="eyebrow">{s.pending}</span>
                      <h2>{c.fields.title}</h2>
                      <p>{s.evidence}</p>
                      <p>
                        {c.fields.due.local_date ??
                          c.fields.due.local_datetime ??
                          s.nodate}
                      </p>
                      <div className="actions">
                        <button
                          className="primary"
                          disabled={offline || busy}
                          onClick={() =>
                            void mutate(() =>
                              api(
                                '/candidates/' + c.id + '/review',
                                'POST',
                                {
                                  action: 'accept',
                                  expected_candidate_version: c.version,
                                },
                                { 'Idempotency-Key': crypto.randomUUID() },
                              ),
                            )
                          }
                        >
                          {s.accept}
                        </button>
                        <button
                          disabled={offline || busy}
                          onClick={() =>
                            void mutate(() =>
                              api(
                                '/candidates/' + c.id + '/review',
                                'POST',
                                {
                                  action: 'reject',
                                  expected_candidate_version: c.version,
                                },
                                { 'Idempotency-Key': crypto.randomUUID() },
                              ),
                            )
                          }
                        >
                          {s.reject}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </section>
            )}
            {page === 'sources' && (
              <section>
                <p className="banner">{s.partial}</p>
                {sources.length ? (
                  sources.map((x) => (
                    <article className="task" key={x.id}>
                      <div>
                        <h2>{x.display_name}</h2>
                        <p>
                          {x.kind} · {x.last_sync_at ?? s.nodate}
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="empty">{s.sourceempty}</p>
                )}
              </section>
            )}
            {['history', 'inbox'].includes(page) && (
              <section>
                {rows.length ? (
                  rows.map((x) => (
                    <article className="task" key={x.id}>
                      <div>
                        <h2>{x.event_type ?? s.inbox}</h2>
                        <p>{x.created_at}</p>
                        {x.after_json && (
                          <p>{JSON.parse(x.after_json).title}</p>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="empty">{s.empty}</p>
                )}
              </section>
            )}
            {page === 'settings' && (
              <section className="settings">
                <h2>{s.createcontext}</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void mutate(async () => {
                      await api('/contexts', 'POST', {
                        type: newType,
                        display_name: newContext,
                      });
                      setNewContext('');
                    });
                  }}
                >
                  <label>
                    {s.context}
                    <input
                      required
                      maxLength={240}
                      value={newContext}
                      onChange={(e) => setNewContext(e.target.value)}
                    />
                  </label>
                  <label>
                    {s.type}
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                    >
                      {['academic', 'organization', 'personal'].map((x) => (
                        <option key={x} value={x}>
                          {s[x as keyof typeof s]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button disabled={offline || busy} type="submit">
                    {s.save}
                  </button>
                </form>
                <hr />
                <button
                  disabled={offline}
                  onClick={() =>
                    void api('/export').then((v) => {
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(
                        new Blob([JSON.stringify(v, null, 2)], {
                          type: 'application/json',
                        }),
                      );
                      a.download = 'academic-os-export.json';
                      a.click();
                      URL.revokeObjectURL(a.href);
                    })
                  }
                >
                  {s.export}
                </button>
                <button
                  onClick={() => {
                    indexedDB.deleteDatabase('academic-os-private');
                    setTasks([]);
                    setCandidates([]);
                    setSigned(false);
                    location.assign('/cdn-cgi/access/logout');
                  }}
                >
                  {s.logout}
                </button>
              </section>
            )}
            <footer>
              Academic OS{' '}
              <span>
                {updated &&
                  new Intl.DateTimeFormat(locale, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(updated))}
              </span>
            </footer>
          </>
        )}
        {form && (
          <div
            className="modal"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setForm(false);
                return;
              }
              if (e.key === 'Tab') {
                const nodes = e.currentTarget.querySelectorAll<HTMLElement>(
                  'button:not(:disabled),input:not(:disabled),select:not(:disabled)',
                );
                if (e.shiftKey && document.activeElement === nodes[0]) {
                  e.preventDefault();
                  nodes[nodes.length - 1]?.focus();
                } else if (
                  !e.shiftKey &&
                  document.activeElement === nodes[nodes.length - 1]
                ) {
                  e.preventDefault();
                  nodes[0]?.focus();
                }
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-title"
            >
              <h2 id="dialog-title">{s.add}</h2>
              <form onSubmit={save}>
                <label>
                  {s.title}
                  <input
                    autoFocus
                    required
                    maxLength={240}
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  {s.context}
                  <select
                    value={draft.context_id}
                    onChange={(e) =>
                      setDraft({ ...draft, context_id: e.target.value })
                    }
                  >
                    <option value="">{s.personal}</option>
                    {contexts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.display_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {s.type}
                  <select
                    value={draft.kind}
                    onChange={(e) =>
                      setDraft({ ...draft, kind: e.target.value })
                    }
                  >
                    <option value="assignment">{s.academic}</option>
                    <option value="organizational_duty">
                      {s.organization}
                    </option>
                    <option value="personal_action">{s.personal}</option>
                    <option value="meeting">Meeting</option>
                    <option value="exam">Exam</option>
                  </select>
                </label>
                <label>
                  {s.date}
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        date: e.target.value,
                        time: e.target.value ? draft.time : '',
                      })
                    }
                  />
                </label>
                <label>
                  {s.time}
                  <input
                    type="time"
                    disabled={!draft.date}
                    value={draft.time}
                    onChange={(e) =>
                      setDraft({ ...draft, time: e.target.value })
                    }
                  />
                </label>
                <div className="actions">
                  <button className="primary" type="submit" disabled={busy}>
                    {s.save}
                  </button>
                  <button type="button" onClick={() => setForm(false)}>
                    {s.cancel}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
if ('serviceWorker' in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register('/sw.js');
