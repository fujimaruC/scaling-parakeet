import { useEffect, useState, type FormEvent } from 'react';
export default function ReminderSettings({
  locale,
  api,
  offline,
  onSaved,
  initial,
}: {
  locale: string;
  api: (
    path: string,
    method?: string,
    value?: unknown,
    headers?: Record<string, string>,
  ) => Promise<any>;
  offline: boolean;
  onSaved: () => Promise<void>;
  initial?: any;
}) {
  const en = locale === 'en';
  const [version, setVersion] = useState(0),
    [enabled, setEnabled] = useState(true),
    [offsets, setOffsets] = useState('24, 3'),
    [hour, setHour] = useState(9),
    [quietEnabled, setQuietEnabled] = useState(false),
    [quietStart, setQuietStart] = useState(22),
    [quietEnd, setQuietEnd] = useState(7),
    [timezone, setTimezone] = useState('Asia/Makassar'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (offline && !initial) {
      setVersion(0);
      return;
    }
    const load = offline ? Promise.resolve(initial) : api('/settings');
    load
      .then((s) => {
        setVersion(s.version);
        setEnabled(s.reminder_policy?.enabled ?? true);
        setOffsets((s.reminder_policy?.offset_hours ?? [24, 3]).join(', '));
        setHour(s.reminder_policy?.date_only_hour ?? 9);
        setQuietEnabled(s.reminder_policy?.quiet_hours?.enabled ?? false);
        setQuietStart(s.reminder_policy?.quiet_hours?.start_hour ?? 22);
        setQuietEnd(s.reminder_policy?.quiet_hours?.end_hour ?? 7);
        setTimezone(s.timezone);
      })
      .catch(() => setError(en ? 'Cannot load rules' : 'Aturan belum dimuat'));
  }, [offline, initial]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const hours = offsets.trim()
        ? offsets.split(',').map((x) => Number(x.trim()))
        : [];
      await api(
        '/settings/reminders',
        'PATCH',
        {
          enabled,
          offset_hours: hours,
          date_only_hour: hour,
          quiet_hours: {
            enabled: quietEnabled,
            start_hour: quietStart,
            end_hour: quietEnd,
          },
        },
        { 'If-Match': String(version) },
      );
      const latest = await api('/settings');
      setVersion(latest.version);
      await onSaved();
    } catch {
      setError(
        en
          ? 'Not saved. Use up to 5 unique offsets (greater than 0, up to 168 hours), distinct quiet-hour boundaries, or refresh after a conflict.'
          : 'Belum tersimpan. Gunakan hingga 5 waktu unik (lebih dari 0 hingga 168 jam), batas jam tenang berbeda, atau muat ulang setelah konflik.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>{en ? 'Reminder rules' : 'Aturan pengingat'}</h2>
      <p>
        {en
          ? 'Saved deadlines are checked in the cloud. Date-only reminders use the preceding day in the source timezone. Rule changes apply to future reminders in bounded cloud checks. Push is not configured; the inbox remains available.'
          : 'Tenggat tersimpan diperiksa di cloud. Pengingat tanggal saja memakai hari sebelumnya pada zona waktu sumber. Perubahan diterapkan bertahap pada pemeriksaan cloud. Push belum dikonfigurasi; kotak pengingat tetap tersedia.'}
      </p>
      {error && <p role="alert">{error}</p>}
      {version === 0 && (
        <p>
          {en
            ? 'Reminder policy unavailable.'
            : 'Kebijakan pengingat belum tersedia.'}
        </p>
      )}
      <form onSubmit={save} hidden={version === 0}>
        <fieldset disabled={offline || busy}>
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            {en ? 'Enable deadline reminders' : 'Aktifkan pengingat tenggat'}
          </label>
          <label>
            {en
              ? 'Hours before an exact deadline'
              : 'Jam sebelum tenggat pasti'}
            <input
              value={offsets}
              onChange={(e) => setOffsets(e.target.value)}
              placeholder="24, 3"
            />
          </label>
          <label>
            {en
              ? 'Date-only reminder hour (0–23)'
              : 'Jam untuk tanggal saja (0–23)'}
            <input
              type="number"
              min={0}
              max={23}
              required
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
            />
          </label>
          <fieldset>
            <legend>
              {en ? 'Quiet hours' : 'Jam tenang'} · {timezone}
            </legend>
            <label>
              <input
                type="checkbox"
                checked={quietEnabled}
                onChange={(e) => setQuietEnabled(e.target.checked)}
              />
              {en
                ? 'Defer new inbox reminders during quiet hours'
                : 'Tunda pengingat baru selama jam tenang'}
            </label>
            <label>
              {en ? 'Quiet hours start (0–23)' : 'Awal jam tenang (0–23)'}
              <input
                type="number"
                min={0}
                max={23}
                required
                value={quietStart}
                onChange={(e) => setQuietStart(Number(e.target.value))}
              />
            </label>
            <label>
              {en ? 'Quiet hours end (0–23)' : 'Akhir jam tenang (0–23)'}
              <input
                type="number"
                min={0}
                max={23}
                required
                value={quietEnd}
                onChange={(e) => setQuietEnd(Number(e.target.value))}
              />
            </label>
            <p>
              {en
                ? 'Reminders in one quiet window may be combined. Deadlines stay unchanged; reminders can arrive after a deadline. Existing inbox entries remain visible.'
                : 'Pengingat pada satu rentang tenang dapat digabung. Tenggat tetap; pengingat dapat tiba setelah tenggat. Isi kotak yang ada tetap terlihat.'}
            </p>
          </fieldset>
          <button disabled={offline || busy || version === 0}>
            {en ? 'Save reminder rules' : 'Simpan aturan pengingat'}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
