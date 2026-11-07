export type Locale = 'id' | 'en';
export type Task = {
  id: string;
  title: string;
  status: string;
  context_id: string | null;
  description?: string | null;
  manual_owned?: number;
  version: number;
  due_at_utc: string | null;
  due: {
    precision: string;
    local_date: string | null;
    local_datetime: string | null;
    timezone: string | null;
  };
};
export const words = {
  id: {
    today: 'Hari ini',
    todo: 'Belum selesai',
    doing: 'Dikerjakan',
    blocked: 'Terhambat',
    archived: 'Diarsipkan',
    tasks: 'Tugas',
    week: 'Minggu ini',
    later: 'Nanti',
    undated: 'Tanpa tanggal',
    done: 'Selesai',
    all: 'Semua',
    academic: 'Kuliah',
    organization: 'Himpunan',
    personal: 'Pribadi',
    contextUnavailable: 'Konteks tidak tersedia',
    loaded: 'dimuat',
    snapshot: 'Salinan tersimpan',
    review: 'Proposal menunggu review',
    reviewHint: 'Tinjau usulan sebelum menjadi tugas.',
    dueToday: 'tenggat hari ini',
    thisWeek: 'minggu ini',
    unknownHint: 'tugas belum jelas tenggatnya',
    emptyToday: 'Tidak ada tenggat hari ini',
    empty: 'Belum ada tugas',
    nodate: 'Belum ada tanggal',
    approx: 'Perkiraan — belum dikonfirmasi',
    unknown: 'Tanggal tidak diketahui',
    overdue: 'Lewat tenggat',
    readOnly: 'Pratinjau hanya baca. Perubahan belum tersedia.',
    complete: 'Tandai selesai',
    undoComplete: 'Batalkan selesai',
    back: 'Kembali',
    settings: 'Pengaturan',
    detail: 'Detail tugas',
    deadline: 'Tenggat',
    notes: 'Catatan',
    history: 'Riwayat',
    moreHistory: 'Muat riwayat sebelumnya',
    unavailable: 'Data belum tersedia',
    loading: 'Memuat…',
    sourceUnknown: 'Sumber belum dimuat',
    manual: 'Manual',
    created: 'Dibuat',
    updated: 'Diubah',
    before: 'Sebelum',
    after: 'Sesudah',
    reminders: 'Aturan pengingat',
    disabled: 'Pengingat dinonaktifkan',
    noReminder: 'Tidak ada pengingat terjadwal untuk ketepatan ini',
    noOffsets: 'Tidak ada offset pengingat',
    defaultPolicy: 'Kebijakan bawaan penjadwal',
    policy: 'Kebijakan tersimpan',
    hoursBefore: 'jam sebelum tenggat',
    priorDay: 'Hari sebelumnya, pukul',
    notDelivery: 'Kebijakan, bukan bukti pengiriman',
    dateSheet: 'Ubah tanggal',
    precision: 'Ketepatan tanggal',
    exact: 'Waktu pasti',
    dateOnly: 'Tanggal saja',
    approximate: 'Perkiraan',
    save: 'Simpan',
    close: 'Tutup',
    quick: 'Tugas baru',
    title: 'Judul',
    context: 'Konteks',
    add: 'Tambah',
    partial:
      'Daftar parsial — kelompok, filter, dan hitungan hanya mencakup tugas yang dimuat.',
    more: 'Muat tugas lainnya',
    noHistory: 'Belum ada peristiwa tersimpan',
    offlineDetail:
      'Offline — riwayat dan aturan tidak tersedia dalam salinan ini.',
    taskMissing: 'Tugas tidak tersedia atau akses ditolak.',
    search: 'Cari judul',
    noMatches: 'Tidak ada tugas yang cocok.',
    dueSection: 'Tenggat hari ini / terlewat',
    day: 'hari lagi',
    calendar: 'Kalender',
  },
  en: {
    today: 'Today',
    todo: 'To do',
    doing: 'In progress',
    blocked: 'Blocked',
    archived: 'Archived',
    tasks: 'Tasks',
    week: 'This week',
    later: 'Later',
    undated: 'No date',
    done: 'Done',
    all: 'All',
    academic: 'Academic',
    organization: 'Organization',
    personal: 'Personal',
    contextUnavailable: 'Context unavailable',
    loaded: 'loaded',
    snapshot: 'Saved snapshot',
    review: 'Proposals awaiting review',
    reviewHint: 'Review proposals before they become tasks.',
    dueToday: 'due today',
    thisWeek: 'this week',
    unknownHint: 'tasks without a confirmed deadline',
    emptyToday: 'No deadlines today',
    empty: 'No tasks yet',
    nodate: 'No date yet',
    approx: 'Approximate — not confirmed',
    unknown: 'Unknown date',
    overdue: 'Overdue',
    readOnly: 'Read-only preview. Changes are not available in this build.',
    complete: 'Mark complete',
    undoComplete: 'Undo completion',
    back: 'Back',
    settings: 'Settings',
    detail: 'Task details',
    deadline: 'Deadline',
    notes: 'Notes',
    history: 'History',
    moreHistory: 'Load earlier history',
    unavailable: 'Data unavailable',
    loading: 'Loading…',
    sourceUnknown: 'Source not loaded',
    manual: 'Manual',
    created: 'Created',
    updated: 'Updated',
    before: 'Before',
    after: 'After',
    reminders: 'Reminder rules',
    disabled: 'Reminders disabled',
    noReminder: 'No scheduled reminder for this precision',
    noOffsets: 'No reminder offsets',
    defaultPolicy: 'Scheduler default policy',
    policy: 'Saved policy',
    hoursBefore: 'hours before deadline',
    priorDay: 'Previous day at',
    notDelivery: 'Policy, not delivery evidence',
    dateSheet: 'Change date',
    precision: 'Date precision',
    exact: 'Exact timestamp',
    dateOnly: 'Date only',
    approximate: 'Approximate',
    save: 'Save',
    close: 'Close',
    quick: 'New task',
    title: 'Title',
    context: 'Context',
    add: 'Add',
    partial:
      'Partial list — groups, filters and counts cover loaded tasks only.',
    more: 'Load more tasks',
    noHistory: 'No recorded events',
    offlineDetail:
      'Offline — history and rules are not available in this snapshot.',
    taskMissing: 'Task unavailable or access denied.',
    search: 'Search titles',
    noMatches: 'No matching tasks.',
    dueSection: 'Due today / overdue',
    day: 'days left',
    calendar: 'Calendar',
  },
};
export function localDay(instant: number, zone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  return ['year', 'month', 'day']
    .map((k) => parts.find((p) => p.type === k)!.value)
    .join('-');
}
export function addDays(day: string, n: number) {
  return new Date(Date.parse(day + 'T12:00:00Z') + n * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function taskDay(task: Task, zone: string) {
  if (task.due.precision === 'date_only') return task.due.local_date;
  if (
    task.due.precision === 'datetime' &&
    task.due_at_utc &&
    Number.isFinite(Date.parse(task.due_at_utc))
  )
    return localDay(Date.parse(task.due_at_utc), zone);
  return null;
}
export function exactInstant(task: Task) {
  return task.due.precision === 'datetime' && task.due_at_utc
    ? Date.parse(task.due_at_utc)
    : NaN;
}
export function dueLabel(task: Task, locale: Locale) {
  const w = words[locale],
    d = task.due;
  if (d.precision === 'approximate') return w.approx;
  if (d.precision === 'unknown') return w.nodate;
  if (d.precision === 'date_only' && d.local_date)
    return (
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(d.local_date + 'T12:00:00Z')) +
      ' · ' +
      w.dateOnly
    );
  if (d.precision === 'datetime' && d.timezone && d.local_datetime) {
    // Historical events store original wall components, not a derived UTC instant.
    const wall = Date.parse(d.local_datetime + 'Z');
    if (Number.isFinite(wall))
      return (
        new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
          hourCycle: 'h23',
          timeZone: 'UTC',
        }).format(wall) +
        ' · ' +
        d.timezone
      );
  }
  return w.unavailable;
}
export function when(task: Task, locale: Locale, now: number, zone: string) {
  const w = words[locale],
    day = taskDay(task, zone);
  if (!day) return task.due.precision === 'approximate' ? '~' : '?';
  const today = localDay(now, zone);
  if (
    day < today ||
    (Number.isFinite(exactInstant(task)) && exactInstant(task) < now)
  )
    return w.overdue;
  if (day === today)
    return task.due.precision === 'datetime'
      ? new Intl.DateTimeFormat(locale, {
          timeZone: zone,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(exactInstant(task))
      : w.dateOnly;
  return (
    'H-' +
    Math.round(
      (Date.parse(day + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) /
        86400000,
    )
  );
}
export function timeLeft(task: Task, locale: Locale, now: number) {
  const at = exactInstant(task);
  if (!Number.isFinite(at)) return dueLabel(task, locale);
  if (at < now) return words[locale].overdue;
  const m = Math.floor((at - now) / 60000);
  return m < 60
    ? `${m}m`
    : m < 1440
      ? `${Math.floor(m / 60)}${locale === 'id' ? 'j' : 'h'} ${m % 60}m`
      : `${Math.floor(m / 1440)} ${words[locale].day}`;
}
export const groupKeys = ['today', 'week', 'later', 'undated', 'done'] as const;
export function groupTasks(tasks: Task[], now: number, zone: string) {
  const today = localDay(now, zone),
    until = addDays(today, 7);
  const groups: Record<(typeof groupKeys)[number], Task[]> = {
    today: [],
    week: [],
    later: [],
    undated: [],
    done: [],
  };
  for (const task of tasks) {
    if (task.status === 'archived') continue;
    const day = taskDay(task, zone);
    const key = !day
      ? 'undated'
      : task.status === 'done'
        ? 'done'
        : day <= today
          ? 'today'
          : day <= until
            ? 'week'
            : 'later';
    groups[key].push(task);
  }
  // Date-only sorts after timed entries on its calendar date, without inventing an instant.
  const key = (t: Task) => {
    const day = taskDay(t, zone);
    return day
      ? day +
          'T' +
          (t.due.precision === 'date_only'
            ? '~'
            : new Date(exactInstant(t)).toISOString())
      : '9999';
  };
  // Compute each sort key once; exact instants stay chronological across DST folds.
  for (const group of groupKeys)
    groups[group] = groups[group]
      .map((task) => ({ task, key: key(task) }))
      .sort(
        (a, b) =>
          (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) ||
          a.task.id.localeCompare(b.task.id),
      )
      .map(({ task }) => task);
  return groups;
}
export function reminderText(task: Task, view: any, locale: Locale) {
  const w = words[locale],
    policy = view?.reminder_policy;
  if (!policy) return w.unavailable;
  const origin =
    view.reminder_policy_origin === 'scheduler_default'
      ? w.defaultPolicy
      : w.policy;
  if (!policy.enabled) return origin + ' · ' + w.disabled;
  if (['approximate', 'unknown'].includes(task.due.precision))
    return origin + ' · ' + w.noReminder;
  if (task.status === 'done' || task.status === 'archived')
    return origin + ' · ' + w.noReminder;
  const value =
    task.due.precision === 'date_only'
      ? w.priorDay +
        ' ' +
        String(policy.date_only_hour).padStart(2, '0') +
        ':00 · ' +
        task.due.timezone
      : policy.offset_hours.length
        ? policy.offset_hours.join(', ') + ' ' + w.hoursBefore
        : w.noOffsets;
  return (
    origin +
    ' · ' +
    value +
    ' · ' +
    w.notDelivery +
    (policy.quiet_hours?.enabled
      ? ' · ' +
        (locale === 'en' ? 'Quiet hours' : 'Jam tenang') +
        ` ${policy.quiet_hours.start_hour}–${policy.quiet_hours.end_hour} (${view.timezone})`
      : '')
  );
}
