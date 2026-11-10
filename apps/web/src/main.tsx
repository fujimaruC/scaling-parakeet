import CANONICAL_TABLES from '../../../packages/contracts/canonical-tables.json';
import OperationalStatus from './features/OperationalStatus';
import { PushSettings, disableLocalPush } from './features/PushSettings';
import History from './features/History';
import DeviceActions from './components/DeviceActions';
import ReminderSettings from './components/ReminderSettings';
import TaskEditor from './components/TaskEditor';
import Calendar from './features/Calendar';
import Review from './features/Review';
import { Preferences, PurgeSheet } from './features/Preferences';
import { DateSheet, QuickSheet } from './features/TaskSheets';
import { useWrites } from './features/useWrites';
import {
  plan,
  privateStore,
  updatePrivate,
  type WritePlan,
} from './features/storage';
import './features/features.css';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './design/tokens.css';
import './design/foundation.css';
import { useTheme } from './design/theme';
import { Bitmap } from './pixel/Bitmap';
import { ICONS } from './pixel/icons';
import Kit from './design/Kit';
import Ledger, { TaskDetail } from './read/Ledger';
import { Sheet, Toast } from './read/Sheet';
import { useLocation } from './read/location';
import { words } from './read/model';
import './read/read.css';
const strings = {
  id: {
    today: 'Hari ini',
    navTasks: 'Tugas',
    navReview: 'Tinjau',
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
    navTasks: 'Tasks',
    navReview: 'Review',
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
  if (
    path.startsWith('/export?') &&
    new URLSearchParams(path.split('?')[1]).get('format') === 'csv' &&
    r.ok
  ) {
    if (r.redirected)
      throw Object.assign(new Error('AUTH_REQUIRED'), { status: 401 });
    if (!r.headers.get('Content-Type')?.startsWith('text/csv'))
      throw Object.assign(new Error('INVALID_API_RESPONSE'), { status: 502 });
    return r.blob();
  }
  const j: any = await r
    .json()
    .catch(() => ({ error: { code: 'REQUEST_FAILED' } }));
  if (!r.ok)
    throw Object.assign(new Error(j.error?.code ?? 'REQUEST_FAILED'), {
      status: r.status,
    });
  if (r.redirected)
    throw Object.assign(new Error('AUTH_REQUIRED'), { status: 401 });
  if (!j.meta || !Object.prototype.hasOwnProperty.call(j, 'data'))
    throw Object.assign(new Error('INVALID_API_RESPONSE'), { status: 502 });
  return /^\/(tasks|candidates|history)\?/.test(path)
    ? { items: j.data, next_cursor: j.meta?.next_cursor ?? null }
    : j.data;
}
async function snapshot(
  write?: any,
  valid: () => boolean = () => true,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('academic-os-private', 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore('snapshot');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!valid()) {
        db.close();
        resolve(null);
        return;
      }
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
  const sessionEpoch = useRef(0),
    ownerRef = useRef<string | null>(null),
    loadTicket = useRef(0);
  const [owner, setOwner] = useState<string | null>(null),
    [reviewCursor, setReviewCursor] = useState<string | null>(null),
    [purging, setPurging] = useState<any>(null),
    [undoAction, setUndoAction] = useState<string | null>(null),
    [rowAvailable, setRowAvailable] = useState(false);
  const [revision, setRevision] = useState(0);
  const readGeneration = useRef(0);
  const [locale, setLocale] = useState<Locale>(
    localStorage.getItem('locale') === 'en' ? 'en' : 'id',
  );
  const s = strings[locale] ?? strings.id;
  const { theme, setTheme } = useTheme();
  const { route, go, back } = useLocation();
  const page = route.page as Page;
  const setPage = (p: Page) => go('/' + p);
  const readPage = page === 'today' || page === 'tasks';
  const [prefs, setPrefs] = useState<any>(null),
    [partial, setPartial] = useState(true);
  const [toast, setToast] = useState(''),
    [dateTask, setDateTask] = useState<any>(null);
  const [dateError, setDateError] = useState(false);
  const taskTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!route.taskId && taskTrigger.current?.isConnected)
      taskTrigger.current.focus();
  }, [route.taskId]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast('');
      setUndoAction(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, undoAction, revision]);
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
  const [busy, setBusy] = useState(false);
  const [newContext, setNewContext] = useState(''),
    [newType, setNewType] = useState('academic');
  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem('locale', locale);
  }, [locale]);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportTable, setExportTable] = useState('');
  const exportPath =
    '/export?format=' +
    exportFormat +
    (exportTable ? '&table=' + encodeURIComponent(exportTable) : '');
  const [sourceAlias, setSourceAlias] = useState('');
  const [sourceKind, setSourceKind] = useState('whatsapp_export');
  const [briefing, setBriefing] = useState<any>(null);
  const [taskCursor, setTaskCursor] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>(null);

  function clearReadSession() {
    sessionEpoch.current++;
    loadTicket.current++;
    ownerRef.current = null;
    setOwner(null);
    setUndoAction(null);
    setPurging(null);
    setRowAvailable(false);
    indexedDB.deleteDatabase('academic-os-private');
    setSigned(false);
    setTasks([]);
    setContexts([]);
    setCandidates([]);
    setSources([]);
    setRows([]);
    setBriefing(null);
    setPrefs(null);
    setUpdated('');
    setTaskCursor(null);
    setPartial(true);
    setLoading(false);
    setDateTask(null);
    setEditing(null);

    setToast('');
  }
  function handleReadDenial(e: any) {
    if ([401, 403].includes(e.status)) clearReadSession();
  }
  async function sessionApi(
    path: string,
    method = 'GET',
    value?: any,
    headers?: Record<string, string>,
  ) {
    const epoch = sessionEpoch.current;
    try {
      const valueOut = await api(path, method, value, headers);
      if (epoch !== sessionEpoch.current) throw Error('SESSION_CHANGED');
      return valueOut;
    } catch (e: any) {
      handleReadDenial(e);
      throw e;
    }
  }
  async function readApi(
    path: string,
    method = 'GET',
    value?: any,
    headers?: Record<string, string>,
  ) {
    if (method !== 'GET') return sessionApi(path, method, value, headers);
    const subject = ownerRef.current,
      epoch = sessionEpoch.current;
    const generation = readGeneration.current;
    const valid = () =>
      epoch === sessionEpoch.current &&
      subject === ownerRef.current &&
      generation === readGeneration.current;
    if (!subject) throw Error('NO_SESSION');
    if (offline || !navigator.onLine) {
      const saved = (await privateStore('views:' + subject))?.[path];
      if (!saved) throw Error('NOT_OBSERVED');
      return { ...saved.value, cached: true, observed_at: saved.at };
    }
    let v: any;
    try {
      v = await sessionApi(path);
    } catch (e: any) {
      if ([401, 403].includes(e.status) || !valid()) throw e;
      const saved = (await privateStore('views:' + subject))?.[path];
      if (!saved || !valid()) throw e;
      setOffline(true);
      return { ...saved.value, cached: true, observed_at: saved.at };
    }
    if (!valid()) throw Error('SESSION_CHANGED');
    await updatePrivate(
      'views:' + subject,
      (old: any) => {
        const items = {
          ...(old ?? {}),
          [path]: { value: v, at: new Date().toISOString() },
        };
        const keys = Object.keys(items).sort((a, b) =>
          items[a].at.localeCompare(items[b].at),
        );
        while (keys.length > 24) delete items[keys.shift()!];
        return items;
      },
      valid,
    );
    return v;
  }
  const writes = useWrites(
    owner,
    offline,
    async (path, method, value, headers) => {
      readGeneration.current++;
      loadTicket.current++;
      setLoading(false);
      return sessionApi(path, method, value, headers);
    },
    async (value: any, operation: WritePlan) => {
      if (operation.label === 'delete' && operation.taskId) {
        setTasks((old) => old.filter((t) => t.id !== operation.taskId));
        go('/tasks');
      }
      if (operation.taskId && value?.id)
        setTasks((old) => old.map((t) => (t.id === value.id ? value : t)));
      setError('');
      setToast(
        locale === 'en'
          ? 'Saved and acknowledged.'
          : 'Tersimpan dan dikonfirmasi.',
      );
      if (
        ['accept', 'reject'].includes(operation.label) &&
        value.review_action &&
        !value.undone
      )
        setUndoAction(value.review_action);
      else setUndoAction(null);
      // Invalidate pre-mutation private reads before requesting fresh observations.
      const subject = ownerRef.current,
        epoch = sessionEpoch.current;
      try {
        await privateStore('owner', null, () => epoch === sessionEpoch.current);
        if (subject)
          await privateStore(
            'views:' + subject,
            null,
            () => epoch === sessionEpoch.current,
          );
        if (subject)
          await privateStore(
            'utility:' + subject,
            null,
            () => epoch === sessionEpoch.current,
          );
        setRevision((n) => n + 1);
        await load();
      } catch {
        clearReadSession();
        setError(
          locale === 'en'
            ? 'Server acknowledged the save; the private cache could not refresh. Reopen online.'
            : 'Server mengonfirmasi simpan; salinan pribadi gagal diperbarui. Buka kembali saat online.',
        );
      }
    },
    () =>
      setError(
        locale === 'en'
          ? 'Save not confirmed. Retry the pending request, or refresh after a conflict.'
          : 'Simpan belum dikonfirmasi. Coba ulang permintaan tertunda, atau muat ulang setelah konflik.',
      ),
  );
  const actions = {
    disabled: writes.blocked,
    pending: (id: string) =>
      writes.pending?.taskId === id ? writes.pending.patch : null,
    toggle: (t: any) => {
      void writes
        .send(
          plan(
            '/tasks/' + t.id,
            'PATCH',
            { status: t.status === 'done' ? 'todo' : 'done' },
            'toggle',
            { 'If-Match': String(t.version) },
            t.id,
            { status: t.status === 'done' ? 'todo' : 'done' },
          ),
        )
        .catch(() => {});
    },
  };
  async function moreCandidates() {
    if (!reviewCursor || offline) return;
    try {
      const page = await readApi(
        '/candidates?limit=100&cursor=' + encodeURIComponent(reviewCursor),
      );
      setCandidates((old) => [
        ...old,
        ...page.items.filter((c: any) => !old.some((x) => x.id === c.id)),
      ]);
      setReviewCursor(page.next_cursor);
    } catch {
      setError(s.error);
    }
  }
  useEffect(() => {
    let live = true;
    setDateTask(null);
    setDateError(false);
    if (signed && route.sheet === 'date' && route.taskId) {
      if (offline) {
        const cached = tasks.find((t) => t.id === route.taskId);
        setDateTask(cached ?? null);
        setDateError(!cached);
      } else
        readApi('/tasks/' + encodeURIComponent(route.taskId) + '?view=read')
          .then((v) => {
            if (live) setDateTask(v.task);
          })
          .catch(() => {
            if (live) setDateError(true);
          });
    }
    return () => {
      live = false;
    };
  }, [route.sheet, route.taskId, signed, offline]);
  async function moreTasks() {
    if (!taskCursor || offline || busy) return;
    const epoch = sessionEpoch.current;
    setBusy(true);
    try {
      const next = await sessionApi(
        '/tasks?limit=100&cursor=' + encodeURIComponent(taskCursor),
      );
      if (epoch !== sessionEpoch.current) return;
      setTasks((current) => [
        ...current,
        ...next.items.filter((t: any) => !current.some((c) => c.id === t.id)),
      ]);
      setTaskCursor(next.next_cursor);
      setPartial(Boolean(next.next_cursor));
    } catch (e: any) {
      handleReadDenial(e);
      setError(words[locale].unavailable);
    } finally {
      setBusy(false);
    }
  }
  const openTask = (task: any) => {
    taskTrigger.current = document.activeElement as HTMLElement;
    go('/tasks/' + encodeURIComponent(task.id));
  };
  async function load() {
    const epoch = sessionEpoch.current,
      ticket = ++loadTicket.current;
    let subject: string | null = null;
    setLoading(true);
    setError('');
    try {
      const me = await sessionApi('/me');
      subject = me.subject;
      if (epoch !== sessionEpoch.current || ticket !== loadTicket.current)
        return;
      if (ownerRef.current && ownerRef.current !== subject) {
        clearReadSession();
        setLoading(false);
        return;
      }
      ownerRef.current = subject;
      setOwner(subject);
      const [ts, cs, ps, ss, overview, preferences] = await Promise.all([
        sessionApi('/tasks?limit=100'),
        sessionApi('/contexts'),
        sessionApi('/candidates?limit=100'),
        sessionApi('/sources'),
        sessionApi('/briefing'),
        sessionApi('/settings'),
      ]);
      if (epoch !== sessionEpoch.current || ticket !== loadTicket.current)
        return;
      const previous = await snapshot().catch(() => null);
      if (previous?.owner === subject) {
        const inventory = (rows: any[]) =>
          rows
            .map((x) => [x.id, x.generation, x.purged_at])
            .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
        if (
          JSON.stringify(inventory(previous.sources ?? [])) !==
          JSON.stringify(inventory(ss))
        ) {
          await privateStore(
            'views:' + subject,
            null,
            () =>
              epoch === sessionEpoch.current && ticket === loadTicket.current,
          );
          await privateStore(
            'utility:' + subject,
            null,
            () =>
              epoch === sessionEpoch.current && ticket === loadTicket.current,
          );
        }
      }
      if (epoch !== sessionEpoch.current || ticket !== loadTicket.current)
        return;
      setTasks(ts.items);
      setPrefs(preferences);
      setPartial(Boolean(ts.next_cursor));
      setTaskCursor(ts.next_cursor);
      setContexts(cs);
      setCandidates(ps.items);
      setReviewCursor(ps.next_cursor);
      setSources(ss);
      setBriefing(overview);
      setSigned(true);
      setOffline(false);
      const at = new Date().toISOString();
      setUpdated(at);
      await snapshot(
        {
          owner: me.subject,
          tasks: ts.items,
          candidates: ps.items,
          sources: ss,
          reviewCursor: ps.next_cursor,
          contexts: cs,
          updated: at,
          briefing: overview,
          prefs: preferences,
          taskCursor: ts.next_cursor,
        },
        () => epoch === sessionEpoch.current,
      );
    } catch (e: any) {
      if (epoch !== sessionEpoch.current || ticket !== loadTicket.current)
        return;
      if (e.status === 401 || e.status === 403) {
        clearReadSession();
      } else {
        const cache = await snapshot().catch(() => null);
        if (epoch !== sessionEpoch.current || ticket !== loadTicket.current)
          return;
        if (cache && (!subject || cache.owner === subject)) {
          ownerRef.current = cache.owner;
          setOwner(cache.owner);
          setCandidates(cache.candidates ?? []);
          setSources(cache.sources ?? []);
          setReviewCursor(cache.reviewCursor ?? null);
          setTasks(cache.tasks);
          setPrefs(cache.prefs ?? null);
          setTaskCursor(cache.taskCursor ?? null);
          setPartial(cache.taskCursor !== null);
          setContexts(cache.contexts);
          setUpdated(cache.updated);
          setBriefing(cache.briefing ?? null);
          setSigned(true);
          setOffline(true);
        } else setError(s.error);
      }
    } finally {
      if (epoch === sessionEpoch.current && ticket === loadTicket.current)
        setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const online = () => void load();
    const lost = () => setOffline(true);
    window.addEventListener('offline', lost);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', lost);
    };
  }, []);
  useEffect(() => {
    const changed = (e: StorageEvent) => {
      if (e.key === 'aos-signout') clearReadSession();
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  useEffect(() => {
    let live = true;
    setRowAvailable(false);
    setRows([]);
    if (page === 'inbox' && signed) {
      const path = '/reminders';
      const subject = ownerRef.current,
        epoch = sessionEpoch.current;
      const get = async () => {
        if (offline) {
          const saved = (await privateStore('utility:' + subject))?.[path];
          if (!saved) throw Error('NOT_OBSERVED');
          return saved;
        }
        const v = await sessionApi(path);
        await updatePrivate(
          'utility:' + subject,
          (old) => ({ ...old, [path]: v }),
          () => epoch === sessionEpoch.current,
        );
        return v;
      };
      get()
        .then((v) => {
          if (live) {
            setRows(v);
            setRowAvailable(true);
          }
        })
        .catch(() => {
          if (live) setError(words[locale].unavailable);
        });
    }
    return () => {
      live = false;
    };
  }, [page, offline, updated, signed]);
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
    <>
      <div
        className={`app ${readPage ? 'reading' : ''}`}
        hidden={Boolean(signed && route.taskId)}
      >
        <aside>
          <a className="brand" href="/">
            <Bitmap rows={ICONS.star} scale={3} />
            <span>Academic OS</span>
          </a>
          <p className="private">● {s.secure}</p>
          <nav
            className="main-nav"
            aria-label={locale === 'en' ? 'Main navigation' : 'Navigasi utama'}
          >
            {nav.slice(0, 4).map((p, i) => (
              <button
                key={p}
                aria-current={page === p ? 'page' : undefined}
                onClick={() => setPage(p)}
              >
                <span aria-hidden>
                  <Bitmap
                    rows={[ICONS.sun, ICONS.list, ICONS.inbox, ICONS.cal][i]}
                  />
                </span>
                {p === 'tasks'
                  ? s.navTasks
                  : p === 'review'
                    ? s.navReview
                    : s[p]}
                {signed &&
                  p === 'review' &&
                  !offline &&
                  (briefing?.pending ?? 0) > 0 && <b>{briefing.pending}</b>}
              </button>
            ))}
          </nav>
        </aside>
        {signed && ['today', 'tasks', 'calendar'].includes(page) && (
          <button
            className="fab"
            aria-label={s.add}
            disabled={writes.blocked || busy}
            onClick={() => go(location.pathname + '?sheet=quick')}
          >
            <Bitmap rows={ICONS.plus} scale={4} />
          </button>
        )}
        <details className="shell-tools">
          <summary>
            {locale === 'en' ? 'Tools & navigation' : 'Alat & navigasi'}
          </summary>
          <div className="aside-bottom">
            <button onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}>
              {s.lang}
            </button>
            <button
              onClick={() =>
                setTheme(
                  document.documentElement.dataset.theme === 'dark'
                    ? 'light'
                    : 'dark',
                )
              }
            >
              {s.theme}
            </button>
            <label className="theme-choice">
              {locale === 'en' ? 'Theme preference' : 'Pilihan tema'}
              <select
                aria-label={
                  locale === 'en' ? 'Theme preference' : 'Pilihan tema'
                }
                value={theme}
                onChange={(e) => setTheme(e.target.value as typeof theme)}
              >
                <option value="system">
                  {locale === 'en' ? 'System' : 'Sistem'}
                </option>
                <option value="light">
                  {locale === 'en' ? 'Light' : 'Terang'}
                </option>
                <option value="dark">
                  {locale === 'en' ? 'Dark' : 'Gelap'}
                </option>
              </select>
            </label>
            <small>Asia/Makassar · UTC+8</small>
          </div>{' '}
          <header>
            <select
              aria-label="Page"
              className="mobile-pages"
              value={page}
              onChange={(e) => setPage(e.target.value as Page)}
            >
              {nav.map((p) => (
                <option key={p} value={p}>
                  {p === 'tasks'
                    ? s.navTasks
                    : p === 'review'
                      ? s.navReview
                      : s[p]}
                </option>
              ))}
            </select>
            <span className="eyebrow">YOUR PERSONAL MEMORY</span>
            <button onClick={() => void load()} disabled={loading}>
              {s.refresh}
            </button>
          </header>
        </details>
        <main key={page} className="screen-entrance">
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
              {!readPage && (
                <>
                  {' '}
                  <section className="heading">
                    <div>
                      <p className="eyebrow">
                        {new Intl.DateTimeFormat(locale, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          timeZone: prefs?.timezone ?? 'Asia/Makassar',
                        }).format(new Date())}
                      </p>
                      <h1>{s[page]}</h1>
                      <p>{s.intro}</p>
                    </div>
                    <button
                      className="primary"
                      onClick={() => go(location.pathname + '?sheet=quick')}
                      disabled={offline}
                    >
                      + {s.add}
                    </button>
                  </section>
                </>
              )}
              {readPage && (
                <Ledger
                  page={page as 'today' | 'tasks'}
                  tasks={tasks}
                  contexts={contexts}
                  locale={locale}
                  zone={
                    prefs?.timezone ?? briefing?.timezone ?? 'Asia/Makassar'
                  }
                  pending={offline ? null : (briefing?.pending ?? null)}
                  partial={partial}
                  onMore={() => void moreTasks()}
                  canMore={!offline && !busy && Boolean(taskCursor)}
                  onOpen={openTask}
                  onPage={(p) => go('/' + p)}
                  onSheet={() => go(location.pathname + '?sheet=quick')}
                  group={new URLSearchParams(location.search).get('group')}
                  actions={actions}
                  queryApi={readApi}
                  offline={offline}
                  revision={updated + revision}
                />
              )}
              {page === 'calendar' && (
                <Calendar
                  {...{ locale, contexts, offline, actions, go }}
                  zone={prefs?.timezone ?? 'Asia/Makassar'}
                  api={readApi}
                  revision={String(revision)}
                  onOpen={openTask}
                  onUndated={() => go('/tasks?group=undated')}
                />
              )}
              {page === 'review' && (
                <Review
                  {...{ candidates, contexts, locale, offline }}
                  zone={prefs?.timezone ?? 'Asia/Makassar'}
                  disabled={writes.blocked}
                  api={readApi}
                  commit={writes.send}
                  onToday={() => setPage('today')}
                  more={!!reviewCursor}
                  onMore={() => void moreCandidates()}
                  total={offline ? null : (briefing?.pending ?? null)}
                />
              )}
              {page === 'sources' && (
                <section>
                  <p className="banner">{s.partial}</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void mutate(async () => {
                        await sessionApi('/sources', 'POST', {
                          display_name: sourceAlias,
                          kind: sourceKind,
                        });
                        setSourceAlias('');
                      });
                    }}
                  >
                    <label>
                      {locale === 'en' ? 'Safe source alias' : 'Alias sumber'}
                      <input
                        required
                        maxLength={240}
                        value={sourceAlias}
                        onChange={(e) => setSourceAlias(e.target.value)}
                      />
                    </label>
                    <label>
                      {locale === 'en'
                        ? 'Collection method'
                        : 'Metode pengumpulan'}
                      <select
                        value={sourceKind}
                        onChange={(e) => setSourceKind(e.target.value)}
                      >
                        <option value="whatsapp_export">WhatsApp export</option>
                        <option value="whatsapp_notification">
                          Android notification
                        </option>
                        <option value="moodle_ical">iCalendar</option>
                      </select>
                    </label>
                    <button disabled={offline || busy}>
                      {locale === 'en' ? 'Add source' : 'Tambah sumber'}
                    </button>
                  </form>
                  {sources.length ? (
                    sources.map((x) => (
                      <article className="task" key={x.id}>
                        <div>
                          <h2>{x.display_name}</h2>
                          <p>
                            {x.kind} · {x.last_sync_at ?? s.nodate}
                          </p>
                          <small>
                            {x.id} · generation {x.generation}
                          </small>
                          {!x.purged_at && (
                            <div className="actions">
                              <button
                                disabled={offline || busy}
                                onClick={() => setPurging(x)}
                              >
                                {locale === 'en'
                                  ? 'Remove source evidence'
                                  : 'Hapus bukti sumber'}
                              </button>
                            </div>
                          )}
                          <DeviceActions source={x.id} api={sessionApi} />
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="empty">{s.sourceempty}</p>
                  )}
                </section>
              )}
              {page === 'history' && (
                <History
                  api={readApi}
                  locale={locale}
                  offline={offline}
                  revision={updated}
                />
              )}
              {page === 'inbox' && (
                <section>
                  {!rowAvailable ? (
                    <p>{words[locale].unavailable}</p>
                  ) : rows.length ? (
                    rows.map((x) => (
                      <article className="task" key={x.id}>
                        <div>
                          <h2>{x.event_type ?? s.inbox}</h2>
                          <p>{x.created_at}</p>
                          {page === 'inbox' && (
                            <div className="actions">
                              <button
                                disabled={offline || busy}
                                onClick={() =>
                                  void mutate(() =>
                                    sessionApi(
                                      '/reminders/' + x.id + '/read',
                                      'PATCH',
                                      {},
                                    ),
                                  )
                                }
                              >
                                {locale === 'en'
                                  ? 'Mark read'
                                  : 'Tandai dibaca'}
                              </button>
                              <button
                                disabled={offline || busy}
                                onClick={() =>
                                  void mutate(() =>
                                    sessionApi(
                                      '/reminders/' + x.id + '/snooze',
                                      'POST',
                                      {
                                        until: new Date(
                                          Date.now() + 3600000,
                                        ).toISOString(),
                                      },
                                      {
                                        'Idempotency-Key': crypto.randomUUID(),
                                      },
                                    ),
                                  )
                                }
                              >
                                {locale === 'en'
                                  ? 'Snooze 1 hour'
                                  : 'Tunda 1 jam'}
                              </button>
                            </div>
                          )}
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
                  <OperationalStatus api={sessionApi} locale={locale} />
                  <PushSettings
                    api={sessionApi}
                    locale={locale}
                    disabled={writes.blocked}
                  />
                  <Preferences
                    {...{ locale, setLocale, theme, setTheme, prefs }}
                    disabled={writes.blocked}
                    commit={writes.send}
                    onSources={() => setPage('sources')}
                  />
                  <h2>{s.createcontext}</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void mutate(async () => {
                        await sessionApi('/contexts', 'POST', {
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
                  <ReminderSettings
                    locale={locale}
                    api={sessionApi}
                    offline={offline}
                    initial={prefs}
                    onSaved={load}
                  />
                  <hr />
                  <label htmlFor="canonical-export-format">
                    {locale === 'en' ? 'Export format' : 'Format ekspor'}
                  </label>
                  <select
                    id="canonical-export-format"
                    value={exportFormat}
                    onChange={(e) =>
                      setExportFormat(e.target.value as 'json' | 'csv')
                    }
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                  <label htmlFor="canonical-export-table">
                    {locale === 'en' ? 'Export table' : 'Tabel ekspor'}
                  </label>
                  <select
                    id="canonical-export-table"
                    value={exportTable}
                    onChange={(e) => setExportTable(e.target.value)}
                  >
                    <option value="">
                      {locale === 'en'
                        ? 'All canonical data (backup)'
                        : 'Semua data kanonis (cadangan)'}
                    </option>
                    {CANONICAL_TABLES.map((table) => (
                      <option key={table} value={table}>
                        {table}
                      </option>
                    ))}
                  </select>
                  {exportTable && (
                    <p role="status">
                      {locale === 'en'
                        ? 'Selected table only. This file is not a complete restore backup.'
                        : 'Hanya tabel terpilih. Berkas ini bukan cadangan pemulihan lengkap.'}
                    </p>
                  )}
                  <p>
                    {locale === 'en'
                      ? 'Use JSON for encrypted restore; CSV is a spreadsheet view.'
                      : 'Gunakan JSON untuk pemulihan terenkripsi; CSV untuk tampilan lembar kerja.'}
                  </p>
                  <button
                    disabled={offline}
                    onClick={() =>
                      void sessionApi(exportPath)
                        .then((v) => {
                          const a = document.createElement('a');
                          a.href = URL.createObjectURL(
                            new Blob(
                              [
                                exportFormat === 'csv'
                                  ? v
                                  : JSON.stringify(v, null, 2),
                              ],
                              {
                                type:
                                  exportFormat === 'csv'
                                    ? 'text/csv;charset=utf-8'
                                    : 'application/json',
                              },
                            ),
                          );
                          a.download =
                            'academic-os-export' +
                            (exportTable ? '-' + exportTable : '') +
                            '.' +
                            exportFormat;
                          a.click();
                          URL.revokeObjectURL(a.href);
                        })
                        .catch(() => setError(s.error))
                    }
                  >
                    {s.export}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await disableLocalPush(sessionApi);
                      } catch {}
                      clearReadSession();
                      try {
                        localStorage.setItem(
                          'aos-signout',
                          crypto.randomUUID(),
                        );
                      } catch {}
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
        </main>
      </div>
      {editing && (
        <TaskEditor
          item={editing}
          defaultZone={prefs?.timezone ?? 'Asia/Makassar'}
          contexts={contexts}
          locale={locale}
          onClose={() => setEditing(null)}
          onSave={async (fields) => {
            await writes.send(
              plan(
                '/tasks/' + editing.id,
                'PATCH',
                fields,
                'edit',
                { 'If-Match': String(editing.version) },
                editing.id,
                fields,
              ),
            );
          }}
          onDelete={async () => {
            await writes.send(
              plan(
                '/tasks/' + editing.id,
                'DELETE',
                {},
                'delete',
                { 'If-Match': String(editing.version) },
                editing.id,
              ),
            );
          }}
        />
      )}
      {signed && route.taskId && (
        <TaskDetail
          key={route.taskId}
          id={route.taskId}
          initial={tasks.find((t) => t.id === route.taskId)}
          contexts={contexts}
          locale={locale}
          zone={prefs?.timezone ?? briefing?.timezone ?? 'Asia/Makassar'}
          offline={offline}
          api={readApi}
          onClose={back}
          onDate={() => go(location.pathname + '?sheet=date')}
          observedAt={updated}
          actions={actions}
          onEdit={setEditing}
          revision={updated + revision}
        />
      )}
      {signed &&
        route.sheet === 'date' &&
        route.taskId &&
        (dateTask?.id === route.taskId ? (
          <DateSheet
            key={dateTask.id + ':' + dateTask.version}
            task={dateTask}
            locale={locale}
            zone={prefs?.timezone ?? 'Asia/Makassar'}
            onClose={back}
            onSave={writes.send}
            disabled={writes.blocked}
          />
        ) : dateError ? (
          <Sheet title={words[locale].dateSheet} locale={locale} onClose={back}>
            <p>{words[locale].unavailable}</p>
          </Sheet>
        ) : (
          <Toast message={words[locale].loading} />
        ))}
      {signed && route.sheet === 'quick' && (
        <QuickSheet
          {...{ locale, contexts }}
          zone={prefs?.timezone ?? 'Asia/Makassar'}
          onClose={back}
          onSave={writes.send}
          disabled={writes.blocked}
        />
      )}
      {signed && purging && (
        <PurgeSheet
          source={purging}
          {...{ locale }}
          api={sessionApi}
          commit={writes.send}
          disabled={writes.blocked}
          onClose={() => setPurging(null)}
        />
      )}
      {signed && writes.pending && (
        <aside className="write-recovery" aria-live="polite">
          <strong>
            {locale === 'en'
              ? 'Unconfirmed request'
              : 'Permintaan belum dikonfirmasi'}
          </strong>
          <p>
            {writes.pending.label} ·{' '}
            {locale === 'en'
              ? 'Do not submit a replacement. Retry sends the same request and key.'
              : 'Jangan kirim pengganti. Coba ulang mengirim permintaan dan kunci yang sama.'}
          </p>
          <button
            disabled={offline || writes.active}
            onClick={() => void writes.retry().catch(() => {})}
          >
            {locale === 'en'
              ? 'Retry pending request'
              : 'Coba ulang permintaan tertunda'}
          </button>
        </aside>
      )}
      {toast && (
        <Toast
          message={toast}
          disabled={writes.blocked}
          actionLabel={locale === 'en' ? 'Undo' : 'Urungkan'}
          action={
            undoAction
              ? () => {
                  void writes
                    .send(
                      plan(
                        '/review-actions/' + undoAction + '/undo',
                        'POST',
                        {},
                        'undo',
                      ),
                    )
                    .catch(() => {});
                }
              : undefined
          }
        />
      )}
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  import.meta.env.DEV && location.pathname === '/__kit' ? <Kit /> : <App />,
);
if ('serviceWorker' in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register('/sw.js');
