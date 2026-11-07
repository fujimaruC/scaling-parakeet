import { useEffect, useRef, useState } from 'react';
import { Bitmap } from '../pixel/Bitmap';
import { ICONS } from '../pixel/icons';
import { dueLabel, words, type Locale } from '../read/model';
import { Sheet } from '../read/Sheet';
import { DateFields } from './TaskSheets';
import TaskEditor from '../components/TaskEditor';
import { plan, type WritePlan } from './storage';
import type { Api } from './useWrites';

export default function Review({
  candidates,
  contexts,
  locale,
  zone,
  disabled,
  api,
  commit,
  onToday,
  more,
  onMore,
  total,
  offline,
}: {
  candidates: any[];
  contexts: any[];
  locale: Locale;
  zone: string;
  disabled: boolean;
  api: Api;
  commit: (p: WritePlan) => Promise<any>;
  onToday: () => void;
  more: boolean;
  onMore: () => void;
  total: number | null;
  offline: boolean;
}) {
  const en = locale === 'en',
    w = words[locale],
    c = candidates[0];
  const [due, setDue] = useState<any>(null),
    [dateOpen, setDateOpen] = useState(false),
    [editing, setEditing] = useState(false),
    [target, setTarget] = useState<any>(null),
    [query, setQuery] = useState(''),
    [options, setOptions] = useState<any[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [searchError, setSearchError] = useState(false),
    [loading, setLoading] = useState(false),
    [flying, setFlying] = useState(0),
    [dx, setDx] = useState(0);
  const gesture = useRef<{
      id: number;
      x: number;
      y: number;
      cancel: boolean;
    } | null>(null),
    lock = useRef(false),
    mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  useEffect(() => {
    setDue(null);
    setTarget(null);
    setQuery('');
    setOptions([]);
    setCursor(null);
    setFlying(0);
    setDx(0);
    setDateOpen(false);
    setEditing(false);
    lock.current = false;
  }, [c?.id, c?.version]);
  const conflict = c?.fields.kind === 'deadline_change';
  useEffect(() => {
    let live = true;
    setOptions([]);
    setCursor(null);
    setSearchError(false);
    if (!conflict || offline) return;
    setLoading(true);
    const timer = setTimeout(
      () =>
        api('/tasks?limit=50&q=' + encodeURIComponent(query))
          .then((v) => {
            if (live) {
              setOptions(v.items ?? v.data ?? []);
              setCursor(v.next_cursor ?? null);
            }
          })
          .catch(() => {
            if (live) setSearchError(true);
          })
          .finally(() => {
            if (live) setLoading(false);
          }),
      250,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [c?.id, conflict, query, offline]);
  const needsEdit =
    c &&
    (c.issues.length > 0 ||
      ![
        'assignment',
        'exam',
        'meeting',
        'personal_action',
        'organizational_duty',
        'deadline_change',
      ].includes(c.fields.kind));
  const canAccept =
    c &&
    !disabled &&
    !needsEdit &&
    (!conflict || target) &&
    c.evidence_ids?.length > 0;
  async function decide(accept: boolean, patch?: any, chosen = target) {
    if (
      !c ||
      lock.current ||
      disabled ||
      (accept && !patch && !canAccept) ||
      (accept && conflict && !chosen)
    )
      return;
    lock.current = true;
    setFlying(accept ? 1 : -1);
    try {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
        await new Promise<void>((resolve) => setTimeout(resolve, 220));
      if (!mounted.current) return;
      await commit(
        plan(
          '/candidates/' + c.id + '/review',
          'POST',
          {
            action: accept
              ? patch || due
                ? 'accept_with_edits'
                : 'accept'
              : 'reject',
            expected_candidate_version: c.version,
            ...(accept && (patch || due)
              ? { task_patch: patch ?? { due } }
              : {}),
            ...(chosen
              ? {
                  target_task_id: chosen.id,
                  expected_task_version: chosen.version,
                }
              : {}),
          },
          accept ? 'accept' : 'reject',
        ),
      );
      if (mounted.current) {
        setFlying(0);
        lock.current = false;
      }
    } catch (e) {
      lock.current = false;
      setFlying(0);
      setDx(0);
      if (patch) throw e;
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.repeat ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        document.querySelector('dialog[open]') ||
        (e.target instanceof Element &&
          e.target.closest(
            'input,select,textarea,button,a,[contenteditable=true]',
          ))
      )
        return;
      if (e.key === 'ArrowRight' && canAccept) {
        e.preventDefault();
        void decide(true);
      }
      if (e.key === 'ArrowLeft' && !disabled && c) {
        e.preventDefault();
        void decide(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  if (!c)
    return (
      <section className="s2-empty">
        <Bitmap rows={ICONS.star} scale={6} />
        <h2>
          {offline
            ? en
              ? 'No saved proposal page'
              : 'Halaman usulan belum tersimpan'
            : en
              ? 'Everything reviewed'
              : 'Semua sudah ditinjau'}
        </h2>
        {more && (
          <button disabled={disabled} onClick={onMore}>
            {en ? 'Load next proposals' : 'Muat usulan berikutnya'}
          </button>
        )}
        <button onClick={onToday}>{w.today}</button>
      </section>
    );
  const proposed = { ...c.fields, due: due ?? c.fields.due };
  return (
    <section aria-label={en ? 'Proposal review' : 'Tinjauan usulan'}>
      <p className="pixel-label">
        {en ? 'Next of' : 'Berikutnya dari'}{' '}
        {total ?? (en ? 'unknown total' : 'total belum diketahui')} ·{' '}
        {candidates.length} {en ? 'loaded' : 'dimuat'}
      </p>
      <p className="s2-note">
        {en
          ? 'Swipe or use buttons. Arrow keys decide when no control is focused.'
          : 'Geser atau gunakan tombol. Tombol panah memutuskan saat fokus di luar kontrol.'}
      </p>
      <div className="review-stack">
        <i className="stack-peek second" aria-hidden="true" />
        <i className="stack-peek third" aria-hidden="true" />
        <article
          className={'pixel-box review-card ' + (flying ? 'fly-out' : '')}
          style={{
            transform: `translateX(${flying ? flying * 480 : dx}px) rotate(${flying ? flying * 18 : dx / 28}deg)`,
          }}
          onPointerDown={(e) => {
            if (
              disabled ||
              lock.current ||
              !e.isPrimary ||
              (e.pointerType === 'mouse' && e.button !== 0) ||
              (e.target as Element).closest(
                'button,input,textarea,select,a,code',
              )
            )
              return;
            gesture.current = {
              id: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              cancel: false,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const g = gesture.current;
            if (!g || g.id !== e.pointerId) return;
            const x = e.clientX - g.x,
              y = e.clientY - g.y;
            if (Math.abs(y) > 18 && Math.abs(y) > Math.abs(x)) {
              g.cancel = true;
              setDx(0);
            }
            if (!g.cancel) setDx(Math.max(-160, Math.min(160, x)));
          }}
          onPointerCancel={() => {
            gesture.current = null;
            setDx(0);
          }}
          onPointerUp={(e) => {
            const g = gesture.current;
            gesture.current = null;
            const delta = g && !g.cancel ? e.clientX - g.x : 0;
            setDx(0);
            if (delta >= 90 && canAccept) void decide(true);
            else if (delta <= -90 && !disabled) void decide(false);
          }}
        >
          <span
            className="review-stamp accept-stamp"
            aria-hidden="true"
            style={{
              opacity: canAccept ? Math.min(1, Math.max(0, dx / 90)) : 0,
            }}
          >
            {en ? 'ACCEPT' : 'TERIMA'}
          </span>
          <span
            className="review-stamp reject-stamp"
            aria-hidden="true"
            style={{ opacity: Math.min(1, Math.max(0, -dx / 90)) }}
          >
            {en ? 'REJECT' : 'TOLAK'}
          </span>
          <span className="pixel-tag">
            {conflict
              ? en
                ? 'Date conflict'
                : 'Konflik tanggal'
              : c.fields.due.precision === 'unknown'
                ? w.undated
                : en
                  ? 'New'
                  : 'Baru'}
          </span>
          <h2>{c.fields.title}</h2>
          <p>
            {contexts.find((x) => x.id === c.fields.context_id)?.display_name ??
              (c.fields.context_id ? w.contextUnavailable : w.personal)}{' '}
            · {c.source_label ?? w.unavailable}
          </p>
          {conflict && (
            <>
              <label>
                {en ? 'Find the existing task' : 'Cari tugas tersimpan'}
                <input
                  maxLength={200}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setTarget(null);
                  }}
                />
              </label>
              <label>
                {en ? 'Target task (required)' : 'Tugas tujuan (wajib)'}
                <select
                  disabled={disabled || loading}
                  value={target?.id ?? ''}
                  onChange={(e) =>
                    setTarget(
                      options.find((t) => t.id === e.target.value) ?? null,
                    )
                  }
                >
                  <option value="">
                    {en ? 'Choose explicitly' : 'Pilih secara eksplisit'}
                  </option>
                  {options.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
              {loading && <p role="status">{w.loading}</p>}
              {searchError && <p role="alert">{w.unavailable}</p>}
              {cursor && (
                <button
                  disabled={disabled || loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const v = await api(
                        '/tasks?limit=50&q=' +
                          encodeURIComponent(query) +
                          '&cursor=' +
                          encodeURIComponent(cursor),
                      );
                      setOptions((old) => [...old, ...(v.items ?? [])]);
                      setCursor(v.next_cursor ?? null);
                    } catch {
                      setSearchError(true);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {w.more}
                </button>
              )}
              <div className="conflict-dates">
                <section>
                  <h3>{en ? 'Current' : 'Sekarang'}</h3>
                  <p>
                    <s>{target ? dueLabel(target, locale) : w.unavailable}</s>
                  </p>
                </section>
                <span aria-hidden="true">→</span>
                <section>
                  <h3>{en ? 'New claim' : 'Klaim baru'}</h3>
                  <p>{dueLabel(proposed, locale)}</p>
                </section>
              </div>
              <p>
                {en
                  ? 'The previous date and evidence remain in task history.'
                  : 'Tanggal sebelumnya dan bukti tetap tersimpan di riwayat tugas.'}
              </p>
            </>
          )}
          {!conflict && (
            <p className="proposal-date">{dueLabel(proposed, locale)}</p>
          )}
          {needsEdit && (
            <p>
              {en
                ? 'Issues require an explicit edited approval.'
                : 'Masalah perlu ditinjau melalui persetujuan dengan edit.'}{' '}
              {c.issues.join(' · ')}
            </p>
          )}
          <footer className="evidence-footer">
            <Bitmap rows={ICONS.lock} scale={2} />
            <p>
              {en
                ? 'Evidence stays on Linux. No chat quotation is sent to the cloud.'
                : 'Bukti tetap di Linux. Kutipan chat tidak dikirim ke cloud.'}
            </p>
            {c.evidence_ids?.length ? (
              c.evidence_ids.map((id: string) => <code key={id}>{id}</code>)
            ) : (
              <p>
                {en
                  ? 'Active evidence unavailable — acceptance blocked.'
                  : 'Bukti aktif tidak tersedia — persetujuan diblokir.'}
              </p>
            )}
          </footer>
        </article>
      </div>
      <div className="review-actions">
        <button
          className="reject"
          disabled={disabled}
          onClick={() => void decide(false)}
        >
          {en ? 'Reject' : 'Tolak'}
        </button>
        <button disabled={disabled} onClick={() => setDateOpen(true)}>
          {en ? 'Date' : 'Tanggal'}
        </button>
        <button
          className="accept"
          disabled={!canAccept}
          onClick={() => void decide(true)}
        >
          {en ? 'Accept' : 'Terima'}
        </button>
      </div>
      <button
        disabled={disabled || !c.evidence_ids?.length || (conflict && !target)}
        onClick={() => setEditing(true)}
      >
        {en ? 'Edit & review' : 'Edit & tinjau'}
      </button>
      <button
        disabled={disabled}
        onClick={() =>
          void commit(
            plan(
              '/candidates/' + c.id + '/review',
              'POST',
              {
                action: 'needs_clarification',
                expected_candidate_version: c.version,
                ...(target
                  ? {
                      target_task_id: target.id,
                      expected_task_version: target.version,
                    }
                  : {}),
              },
              'clarify',
            ),
          ).catch(() => {})
        }
      >
        {en ? 'Need more information' : 'Perlu informasi'}
      </button>
      {more && (
        <p className="s2-partial">
          {en
            ? 'Only a proposal page is loaded.'
            : 'Hanya satu halaman usulan dimuat.'}
          <button disabled={disabled} onClick={onMore}>
            {w.more}
          </button>
        </p>
      )}
      {dateOpen && (
        <ProposalDate
          {...{ locale, zone }}
          initial={due ?? c.fields.due}
          onClose={() => setDateOpen(false)}
          onSave={(d) => {
            setDue(d);
            setDateOpen(false);
          }}
        />
      )}
      {editing && (
        <TaskEditor
          item={
            conflict && target ? { ...target, due: proposed.due } : proposed
          }
          contexts={contexts}
          tasks={conflict && target ? [target] : []}
          initialTarget={target?.id}
          lockedTarget={conflict}
          defaultZone={zone}
          locale={locale}
          proposal
          onClose={() => setEditing(false)}
          onSave={async (fields, chosen) => {
            if (!c.evidence_ids?.length) throw Error('EVIDENCE_UNAVAILABLE');
            await decide(true, fields, chosen ?? target);
          }}
        />
      )}
    </section>
  );
}
function ProposalDate({
  initial,
  locale,
  zone,
  onClose,
  onSave,
}: {
  initial: any;
  locale: Locale;
  zone: string;
  onClose: () => void;
  onSave: (d: any) => void;
}) {
  const [due, setDue] = useState(initial);
  return (
    <Sheet title={words[locale].dateSheet} {...{ locale, onClose }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(due);
        }}
      >
        <DateFields {...{ value: due, onChange: setDue, locale, zone }} />
        <p>
          {locale === 'en'
            ? 'Draft only. Accept explicitly to save the proposal.'
            : 'Hanya draf. Terima secara eksplisit untuk menyimpan usulan.'}
        </p>
        <button>{words[locale].save}</button>
      </form>
    </Sheet>
  );
}
