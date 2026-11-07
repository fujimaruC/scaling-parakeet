import React, { useEffect, useRef, useState } from 'react';
import { type Locale, type Task, words } from './model';
export function Sheet({
  title,
  locale,
  onClose,
  children,
}: {
  title: string;
  locale: Locale;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    el.querySelector<HTMLElement>('input,select,button')?.focus();
    return () => {
      el.close();
      if (trigger.current?.isConnected) trigger.current.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="s2-sheet"
      aria-modal="true"
      aria-labelledby="s2-sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (
          e.target === e.currentTarget &&
          (e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom)
        )
          onClose();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Tab') return;
        const nodes = [
          ...e.currentTarget.querySelectorAll<HTMLElement>(
            'input:not(:disabled),select:not(:disabled),button:not(:disabled)',
          ),
        ];
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      <h2 id="s2-sheet-title">{title}</h2>
      {children}
      <button onClick={onClose}>{words[locale].close}</button>
    </dialog>
  );
}
function PrecisionFields({ task, locale }: { task?: Task; locale: Locale }) {
  const w = words[locale];
  const [precision, setPrecision] = useState(task?.due.precision ?? 'unknown');
  return (
    <div className="s2-precision-fields">
      <label>
        {w.precision}
        <select
          aria-label={w.precision}
          value={precision}
          onChange={(e) => setPrecision(e.target.value)}
        >
          <option value="datetime">{w.exact}</option>
          <option value="date_only">{w.dateOnly}</option>
          <option value="approximate">{w.approximate}</option>
          <option value="unknown">{w.unknown}</option>
        </select>
      </label>
      {precision === 'datetime' ? (
        <label>
          {w.exact}
          <input
            type="datetime-local"
            readOnly
            value={task?.due.local_datetime?.slice(0, 16) ?? ''}
          />
        </label>
      ) : precision === 'date_only' ? (
        <label>
          {w.dateOnly}
          <input
            type="date"
            readOnly
            value={
              task?.due.local_date ??
              task?.due.local_datetime?.slice(0, 10) ??
              ''
            }
          />
        </label>
      ) : (
        <p>{precision === 'approximate' ? w.approx : w.nodate}</p>
      )}
      <p>{w.readOnly}</p>
    </div>
  );
}
export function DatePreview({
  task,
  locale,
  onClose,
}: {
  task?: Task;
  locale: Locale;
  onClose: () => void;
}) {
  return (
    <Sheet title={words[locale].dateSheet} {...{ locale, onClose }}>
      <PrecisionFields {...{ task, locale }} />
      <button disabled>{words[locale].save}</button>
    </Sheet>
  );
}
export function QuickPreview({
  locale,
  onClose,
}: {
  locale: Locale;
  onClose: () => void;
}) {
  const w = words[locale];
  const [context, setContext] = useState('academic');
  return (
    <Sheet title={w.quick} {...{ locale, onClose }}>
      <label>
        {w.title}
        <input readOnly value="" />
      </label>
      <div className="s2-filters" role="group" aria-label={w.context}>
        {(['academic', 'organization', 'personal'] as const).map((key) => (
          <button
            key={key}
            aria-pressed={context === key}
            onClick={() => setContext(key)}
          >
            {w[key]}
          </button>
        ))}
      </div>
      <PrecisionFields locale={locale} />
      <button disabled>{w.add}</button>
    </Sheet>
  );
}
export function Toast({
  message,
  action,
  actionLabel,
  disabled,
}: {
  message: string;
  action?: () => void;
  actionLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div role="status" aria-live="polite" className="s2-toast">
      {message}
      {action && (
        <button disabled={disabled} onClick={action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
