import { useEffect, useState } from 'react';
export default function DeviceActions({
  source,
  api,
}: {
  source: string;
  api: (path: string, method?: string, value?: unknown) => Promise<any>;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      api('/sources/' + source + '/purge-status')
        .then((x) => {
          if (active) {
            setData(x);
            setError(false);
          }
        })
        .catch(() => {
          if (active) setError(true);
        });
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [source]);
  return (
    <section aria-label="Device acknowledgments">
      <p>
        Device acknowledgments ·{' '}
        {error
          ? 'refresh unavailable; saved status may be stale'
          : data
            ? 'last authenticated observation'
            : 'loading'}
      </p>
      {data && (
        <>
          <p>
            Linux wipe:{' '}
            {!data.cloud_purged
              ? 'not requested'
              : data.local_wipe_pending
                ? 'pending'
                : 'acknowledged by Linux'}
            . Phone inventory may be incomplete; absence is never confirmation.
          </p>
          {data.actions.length === 0 && <p>No phone acknowledgment known.</p>}
          {data.actions.length < data.actions_total && (
            <button
              onClick={async () => {
                const next = await api(
                  '/sources/' +
                    source +
                    '/purge-status?actions_offset=' +
                    data.actions.length,
                );
                setData({
                  ...next,
                  actions: [...data.actions, ...next.actions],
                });
              }}
            >
              Load more actions (periodic refresh returns to first page)
            </button>
          )}
          {data.actions.map((a: any) => (
            <article key={a.id}>
              <p>
                {a.kind} · Device {a.device_id} · generation {a.generation} ·{' '}
                {a.progress} · {a.status} · {a.acknowledgment}
                {a.late ? ' (late confirmation)' : ''}
              </p>
              {!a.applied_at && !a.retired_at && (
                <button
                  onClick={async () => {
                    await api(
                      '/device-actions/' + a.id + '/retire',
                      'POST',
                      {},
                    );
                    setData(await api('/sources/' + source + '/purge-status'));
                  }}
                >
                  Retire unresolved action (does not confirm wiping)
                </button>
              )}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
