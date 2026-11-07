import { useEffect, useState } from 'react';
import { Sheet } from '../read/Sheet';
import { words, type Locale } from '../read/model';
import { plan, type WritePlan } from './storage';
import type { Api } from './useWrites';
export function Preferences({
  locale,
  setLocale,
  theme,
  setTheme,
  prefs,
  disabled,
  commit,
  onSources,
}: {
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: string;
  setTheme: (t: 'system' | 'light' | 'dark') => void;
  prefs: any;
  disabled: boolean;
  commit: (p: WritePlan) => Promise<any>;
  onSources: () => void;
}) {
  const en = locale === 'en',
    w = words[locale],
    [zone, setZone] = useState(prefs?.timezone ?? ''),
    [install, setInstall] = useState<any>(null);
  useEffect(() => {
    setZone(prefs?.timezone ?? '');
  }, [prefs?.timezone]);
  useEffect(() => {
    const fn = (e: Event) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener('beforeinstallprompt', fn);
    return () => window.removeEventListener('beforeinstallprompt', fn);
  }, []);
  return (
    <div className="preferences">
      <section className="pixel-box">
        <h2>{en ? 'Your preferences' : 'Preferensimu'}</h2>
        <label>
          {en ? 'Language' : 'Bahasa'}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          {en ? 'Appearance' : 'Tampilan'}
          <select
            value={theme}
            onChange={(e) =>
              setTheme(e.target.value as 'system' | 'light' | 'dark')
            }
          >
            <option value="system">{en ? 'System' : 'Sistem'}</option>
            <option value="light">{en ? 'Light' : 'Terang'}</option>
            <option value="dark">{en ? 'Dark' : 'Gelap'}</option>
          </select>
        </label>
        <p>
          {en
            ? 'Language and appearance are saved on this browser.'
            : 'Bahasa dan tampilan tersimpan di browser ini.'}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!prefs) return;
            try {
              new Intl.DateTimeFormat('en', { timeZone: zone });
              await commit(
                plan(
                  '/settings',
                  'PATCH',
                  { language: locale, theme, timezone: zone },
                  'settings',
                  { 'If-Match': String(prefs.version) },
                ),
              );
            } catch {}
          }}
        >
          <label>
            {en ? 'Owner timezone (IANA)' : 'Zona waktu pemilik (IANA)'}
            <input
              required
              value={zone}
              placeholder="Asia/Makassar"
              onChange={(e) => setZone(e.target.value)}
            />
          </label>
          <button disabled={disabled || !prefs}>{w.save}</button>
        </form>
      </section>
      <section className="pixel-box">
        <h2>{en ? 'Data & privacy' : 'Data & privasi'}</h2>
        <p>
          {en
            ? 'Export below contains structured canonical data only. Encrypt and restore locally on Linux with the commands in docs/18-DEVELOPMENT.md; keep the encryption key separately. This browser cannot perform a cloud restore.'
            : 'Ekspor di bawah hanya berisi data kanonis terstruktur. Enkripsi dan pulihkan secara lokal di Linux dengan perintah docs/18-DEVELOPMENT.md; simpan kunci terpisah. Browser ini tidak dapat memulihkan cloud.'}
        </p>
        <button onClick={onSources}>
          {en
            ? 'Sources, evidence purge & acknowledgments'
            : 'Sumber, penghapusan bukti & konfirmasi'}
        </button>
      </section>
      <section className="pixel-box">
        <h2>{en ? 'Install & reminders' : 'Instal & pengingat'}</h2>
        {install ? (
          <button
            onClick={async () => {
              try {
                await install.prompt();
                await install.userChoice;
              } finally {
                setInstall(null);
              }
            }}
          >
            {en ? 'Install app' : 'Instal aplikasi'}
          </button>
        ) : (
          <p>
            {en
              ? 'Use your browser’s Install / Add to home screen when available. Availability and installation are unverified on the owner’s phone.'
              : 'Gunakan menu Instal / Tambahkan ke layar utama jika tersedia. Ketersediaan dan instalasi belum diverifikasi di ponsel pemilik.'}
          </p>
        )}
        <p>
          {en
            ? 'Cloud reminder state and the inbox are available independently of Linux. Physical Web Push delivery is unverified; no notification permission is requested here.'
            : 'Status pengingat cloud dan kotak pengingat tersedia tanpa Linux. Pengiriman Web Push fisik belum diverifikasi; izin notifikasi tidak diminta di sini.'}
        </p>
      </section>
    </div>
  );
}
export function PurgeSheet({
  source,
  locale,
  api,
  commit,
  disabled,
  onClose,
}: {
  source: any;
  locale: Locale;
  api: Api;
  commit: (p: WritePlan) => Promise<any>;
  disabled: boolean;
  onClose: () => void;
}) {
  const en = locale === 'en';
  const [preview, setPreview] = useState<any>(null),
    [error, setError] = useState(false),
    [policy, setPolicy] = useState('retain_as_manual'),
    [confirm, setConfirm] = useState(false);
  useEffect(() => {
    let live = true;
    api('/sources/' + source.id + '/purge-preview', 'POST', {})
      .then((v) => {
        if (live) setPreview(v);
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, [source.id]);
  return (
    <Sheet
      title={en ? 'Remove source evidence' : 'Hapus bukti sumber'}
      {...{ locale, onClose }}
    >
      <p>{source.display_name}</p>
      {error ? (
        <p role="alert">{words[locale].unavailable}</p>
      ) : !preview ? (
        <p role="status">{words[locale].loading}</p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await commit(
                plan(
                  '/sources/' + source.id + '/purge',
                  'POST',
                  {
                    expected_generation: preview.generation,
                    task_policy: policy,
                  },
                  'purge',
                ),
              );
              onClose();
            } catch {}
          }}
        >
          <p>
            {preview.affected_tasks.length}{' '}
            {en ? 'linked tasks' : 'tugas terkait'}
          </p>
          <ul>
            {preview.affected_tasks.map((t: any) => (
              <li key={t.id}>{t.title}</li>
            ))}
          </ul>
          <label>
            {en ? 'Unsupported task policy' : 'Kebijakan tugas tanpa dukungan'}
            <select value={policy} onChange={(e) => setPolicy(e.target.value)}>
              <option value="retain_as_manual">
                {en ? 'Retain as manual' : 'Pertahankan sebagai manual'}
              </option>
              <option value="delete">
                {en
                  ? 'Delete sole-source, unedited AI tasks'
                  : 'Hapus tugas AI satu sumber yang belum diedit'}
              </option>
            </select>
          </label>
          <p>
            {en
              ? 'Manual and multi-source tasks survive. Cloud purge does not prove Linux or phone deletion. Those acknowledgments remain visible separately. Review Undo is revoked for affected tasks.'
              : 'Tugas manual dan multisumber bertahan. Penghapusan cloud tidak membuktikan penghapusan Linux atau ponsel. Konfirmasi tetap ditampilkan terpisah. Urungkan tinjauan dicabut untuk tugas terkait.'}
          </p>
          <label className="check-label">
            <input
              type="checkbox"
              required
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />
            {en
              ? 'I understand this revokes the source generation.'
              : 'Saya memahami generasi sumber akan dicabut.'}
          </label>
          <button className="reject" disabled={disabled || !confirm}>
            {en ? 'Purge source' : 'Hapus sumber'}
          </button>
        </form>
      )}
    </Sheet>
  );
}
