import { useState } from 'react';
export default function MonthCalendar({
  tasks,
  locale,
  onOpen,
}: {
  tasks: any[];
  locale: string;
  onOpen: (task: any) => void;
}) {
  const [now, setMonth] = useState(() => new Date());
  const year = now.getFullYear(),
    month = now.getMonth();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
    offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const dayKey = (t: any) =>
    t.due.precision === 'datetime'
      ? new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Makassar',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(t.due_at_utc))
      : t.due.local_date;
  return (
    <section>
      <div className="calendar-toolbar">
        <button
          aria-label={locale === 'en' ? 'Previous month' : 'Bulan sebelumnya'}
          onClick={() => setMonth(new Date(year, month - 1, 1))}
        >
          ‹
        </button>
        <h2>
          {new Intl.DateTimeFormat(locale, {
            month: 'long',
            year: 'numeric',
          }).format(now)}
        </h2>
        <button
          aria-label={locale === 'en' ? 'Next month' : 'Bulan berikutnya'}
          onClick={() => setMonth(new Date(year, month + 1, 1))}
        >
          ›
        </button>
      </div>
      <div
        className="calendar-grid"
        role="group"
        aria-label={locale === 'en' ? 'Month calendar' : 'Kalender bulanan'}
      >
        {Array.from({ length: 7 }, (_, i) => (
          <div className="weekday" key={'w' + i}>
            {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
              new Date(2026, 10, 2 + i),
            )}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={'x' + i} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const key =
            year +
            '-' +
            String(month + 1).padStart(2, '0') +
            '-' +
            String(i + 1).padStart(2, '0');
          return (
            <div className="calendar-day" key={key}>
              <span>{i + 1}</span>
              {tasks
                .filter((t) => dayKey(t) === key)
                .map((t) => (
                  <button key={t.id} title={t.title} onClick={() => onOpen(t)}>
                    {t.title}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
      <h2>{locale === 'en' ? 'No date yet' : 'Belum ada tanggal'}</h2>
      {tasks
        .filter((t) => !dayKey(t))
        .map((t) => (
          <button className="undated-task" key={t.id} onClick={() => onOpen(t)}>
            {t.title}
          </button>
        ))}
    </section>
  );
}
