import { useEffect, useState } from 'react';
import type { Api } from './useWrites';
export default function OperationalStatus({
  api,
  locale,
}: {
  api: Api;
  locale: string;
}) {
  const [data, setData] = useState<any>(null),
    [failed, setFailed] = useState(false);
  const en = locale === 'en';
  const load = async () => {
    setFailed(false);
    try {
      setData(await api('/health'));
    } catch {
      setFailed(true);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="pixel-box">
      <h2>{en ? 'Operations' : 'Operasional'}</h2>
      {failed && (
        <p role="alert">
          {en ? 'Health unavailable' : 'Kesehatan tidak tersedia'}
        </p>
      )}
      {data ? (
        <>
          <p>
            {en ? 'Scheduler report' : 'Laporan penjadwal'}:{' '}
            {data.operations.scheduler.state} ·{' '}
            {data.operations.scheduler.reported_at ??
              (en ? 'Never reported' : 'Belum dilaporkan')}
          </p>
          <p>
            {en
              ? 'Application requests today; not account billing'
              : 'Permintaan aplikasi hari ini; bukan tagihan akun'}
            : {data.operations.daily_requests} /{' '}
            {data.operations.daily_request_limit}
          </p>
          {data.operations.usage_partial && (
            <p>
              {en ? 'Usage detail is partial' : 'Rincian penggunaan parsial'}
            </p>
          )}
          {data.operations.sources.map((s: any) => (
            <p key={s.id}>
              {s.id}: {s.state} ·{' '}
              {s.reported_at ?? (en ? 'Never reported' : 'Belum dilaporkan')}
            </p>
          ))}
        </>
      ) : (
        !failed && <p role="status">{en ? 'Loading' : 'Memuat'}</p>
      )}
      <button onClick={() => void load()}>
        {en ? 'Refresh health' : 'Segarkan kesehatan'}
      </button>
    </section>
  );
}
