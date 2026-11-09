import { useEffect, useState } from 'react';
import type { Api } from './useWrites';
export async function disableLocalPush(api: Api) {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const sub = await registration?.pushManager?.getSubscription();
  if (!sub) return;
  // Remove the local browser delivery capability even if the cloud is offline.
  try {
    const rows = await api('/push/subscriptions');
    const bytes = new TextEncoder().encode(sub.endpoint);
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('');
    if (rows.some((r: any) => r.id === digest))
      await api('/push/subscriptions/' + digest, 'DELETE');
  } finally {
    await sub.unsubscribe();
  }
}
export function PushSettings({
  api,
  locale,
  disabled,
}: {
  api: Api;
  locale: string;
  disabled: boolean;
}) {
  const en = locale === 'en',
    supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
  const [config, setConfig] = useState<any>(null),
    [rows, setRows] = useState<any[] | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const load = async () => {
    const [c, r] = await Promise.all([
      api('/push/config'),
      api('/push/subscriptions'),
    ]);
    setConfig(c);
    setRows(r);
  };
  useEffect(() => {
    let live = true;
    Promise.all([api('/push/config'), api('/push/subscriptions')])
      .then(([c, r]) => {
        if (live) {
          setConfig(c);
          setRows(r);
        }
      })
      .catch(() => {
        if (live) setError('PUSH_STATUS_UNAVAILABLE');
      });
    return () => {
      live = false;
    };
  }, []);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e.message || 'PUSH_UNAVAILABLE');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="pixel-box">
      <h2>{en ? 'Browser notifications' : 'Notifikasi browser'}</h2>
      <p>
        {en
          ? 'Optional generic inbox alert. The inbox remains authoritative; provider acceptance does not prove phone delivery.'
          : 'Peringatan kotak masuk opsional tanpa isi tugas. Penerimaan penyedia bukan bukti notifikasi tiba di ponsel.'}
      </p>
      <p role="status">
        {!supported
          ? en
            ? 'Unsupported in this browser'
            : 'Tidak didukung browser ini'
          : (config?.state ??
            (en ? 'Status unavailable' : 'Status belum tersedia'))}
      </p>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={disabled || busy || !supported || !config?.public_key}
        onClick={() =>
          void run(async () => {
            if ((await Notification.requestPermission()) !== 'granted')
              throw Error('PUSH_PERMISSION_NOT_GRANTED');
            const r = await navigator.serviceWorker.ready;
            let sub = await r.pushManager.getSubscription();
            const raw = Uint8Array.from(
              atob(config.public_key.replaceAll('-', '+').replaceAll('_', '/')),
              (c) => c.charCodeAt(0),
            );
            if (!sub)
              sub = await r.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: raw,
              });
            try {
              await api('/push/subscriptions', 'POST', {
                endpoint: sub.endpoint,
              });
            } catch (e) {
              await sub.unsubscribe();
              throw e;
            }
          })
        }
      >
        {en ? 'Enable on this browser' : 'Aktifkan di browser ini'}
      </button>
      <button
        disabled={busy || !supported}
        onClick={() => void run(() => disableLocalPush(api))}
      >
        {en ? 'Disable on this browser' : 'Nonaktifkan di browser ini'}
      </button>
      {rows === null ? (
        <p>{en ? 'Subscriptions unavailable' : 'Langganan belum tersedia'}</p>
      ) : (
        rows
          .filter((r) => !r.revoked_at)
          .map((r, i) => (
            <p key={r.id}>
              {en ? 'Browser subscription' : 'Langganan browser'} {i + 1} ·{' '}
              {r.created_at}{' '}
              <button
                disabled={disabled || busy}
                onClick={() =>
                  void run(() => api('/push/subscriptions/' + r.id, 'DELETE'))
                }
              >
                {en ? 'Revoke' : 'Cabut'}
              </button>
            </p>
          ))
      )}
    </section>
  );
}
