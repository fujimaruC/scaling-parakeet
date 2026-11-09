import { useEffect, useState } from 'react';
import type { Api } from './useWrites';
export default function History({
  api,
  locale,
  offline,
  revision,
}: {
  api: Api;
  locale: string;
  offline: boolean;
  revision: string;
}) {
  const en = locale === 'en',
    path = '/history?limit=50';
  const [view, setView] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    setView(null);
    setBusy(true);
    setError(false);
    api(path)
      .then((v) => {
        if (live) setView(v);
      })
      .catch(() => {
        if (live) setError(true);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [offline, revision]);
  return (
    <section>
      <h2>{en ? 'Events' : 'Peristiwa'}</h2>
      {busy && <p role="status">{en ? 'Loading' : 'Memuat'}</p>}
      {error && (
        <p role="alert">
          {en
            ? 'History unavailable; loaded events are preserved.'
            : 'Riwayat tidak tersedia; peristiwa dimuat tetap tersimpan.'}
        </p>
      )}
      {view?.cached && (
        <p>
          {en ? 'Saved snapshot' : 'Salinan tersimpan'} · {view.observed_at}
        </p>
      )}
      {view?.next_cursor && (
        <p role="status">
          {en
            ? 'Partial history — older events are not loaded.'
            : 'Riwayat parsial — peristiwa lama belum dimuat.'}
        </p>
      )}
      {view?.items.map((e: any) => (
        <article className="task" key={e.id}>
          <h3>{e.event_type}</h3>
          <p>{e.created_at}</p>
          <p>{e.task_id}</p>
        </article>
      ))}
      {view && !view.items.length && !error && (
        <p>{en ? 'No history' : 'Belum ada riwayat'}</p>
      )}
      {view?.next_cursor && (
        <button
          disabled={offline || busy}
          onClick={async () => {
            setBusy(true);
            setError(false);
            try {
              const v = await api(
                path + '&cursor=' + encodeURIComponent(view.next_cursor),
              );
              setView((old: any) => ({
                ...v,
                items: [
                  ...old.items,
                  ...v.items.filter(
                    (e: any) => !old.items.some((o: any) => o.id === e.id),
                  ),
                ],
              }));
            } catch {
              setError(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          {en ? 'Load older events' : 'Muat peristiwa lama'}
        </button>
      )}
    </section>
  );
}
