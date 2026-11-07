import { useState } from 'react';
import { Sheet } from '../read/Sheet';
import { words, type Locale } from '../read/model';
import { plan, type WritePlan } from './storage';
export const blankDue = {
  precision: 'unknown',
  local_date: null,
  local_datetime: null,
  timezone: null,
};
export function DateFields({
  value,
  onChange,
  locale,
  zone,
  disabled = false,
}: {
  value: any;
  onChange: (d: any) => void;
  locale: Locale;
  zone: string;
  disabled?: boolean;
}) {
  const w = words[locale];
  return (
    <fieldset disabled={disabled} className="date-fields">
      <legend>{w.deadline}</legend>
      <label>
        {w.precision}
        <select
          aria-label={w.precision}
          value={value.precision}
          onChange={(e) =>
            onChange({
              precision: e.target.value,
              local_date: null,
              local_datetime: null,
              timezone: ['datetime', 'date_only'].includes(e.target.value)
                ? zone
                : null,
            })
          }
        >
          <option value="datetime">{w.exact}</option>
          <option value="date_only">{w.dateOnly}</option>
          <option value="approximate">{w.approximate}</option>
          <option value="unknown">{w.unknown}</option>
        </select>
      </label>
      {value.precision === 'datetime' ? (
        <label>
          {w.exact}
          <input
            required
            type="datetime-local"
            step="1"
            value={value.local_datetime ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                local_datetime:
                  e.target.value.length === 16
                    ? e.target.value + ':00'
                    : e.target.value,
              })
            }
          />
        </label>
      ) : value.precision === 'date_only' ? (
        <label>
          {w.dateOnly}
          <input
            required
            type="date"
            value={value.local_date ?? ''}
            onChange={(e) => onChange({ ...value, local_date: e.target.value })}
          />
        </label>
      ) : (
        <p>{value.precision === 'approximate' ? w.approx : w.nodate}</p>
      )}
      {['datetime', 'date_only'].includes(value.precision) && (
        <label>
          {locale === 'en'
            ? 'Source timezone (IANA)'
            : 'Zona waktu sumber (IANA)'}
          <input
            required
            value={value.timezone ?? zone}
            onChange={(e) => onChange({ ...value, timezone: e.target.value })}
          />
        </label>
      )}
    </fieldset>
  );
}
export function DateSheet({
  task,
  locale,
  zone,
  onClose,
  onSave,
  disabled,
}: {
  task: any;
  locale: Locale;
  zone: string;
  onClose: () => void;
  onSave: (p: WritePlan) => Promise<any>;
  disabled: boolean;
}) {
  const [due, setDue] = useState(task.due),
    [busy, setBusy] = useState(false);
  const w = words[locale];
  return (
    <Sheet title={w.dateSheet} locale={locale} onClose={onClose}>
      {disabled && (
        <p role="status">
          {locale === 'en'
            ? 'Editing unavailable. Close this sheet to retry a pending request, or refresh online.'
            : 'Perubahan tidak tersedia. Tutup lembar ini untuk mencoba ulang permintaan tertunda, atau muat ulang saat online.'}
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(
              plan(
                '/tasks/' + task.id,
                'PATCH',
                { due },
                'date',
                { 'If-Match': String(task.version) },
                task.id,
                { due },
              ),
            );
            onClose();
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      >
        <DateFields
          {...{
            value: due,
            onChange: setDue,
            locale,
            zone,
            disabled: disabled || busy,
          }}
        />
        <button className="primary" disabled={disabled || busy}>
          {w.save}
        </button>
      </form>
    </Sheet>
  );
}
export function QuickSheet({
  contexts,
  locale,
  zone,
  onClose,
  onSave,
  disabled,
}: {
  contexts: any[];
  locale: Locale;
  zone: string;
  onClose: () => void;
  onSave: (p: WritePlan) => Promise<any>;
  disabled: boolean;
}) {
  const w = words[locale];
  const [title, setTitle] = useState(''),
    [type, setType] = useState('academic'),
    [context, setContext] = useState(''),
    [due, setDue] = useState<any>(blankDue),
    [busy, setBusy] = useState(false);
  const options = contexts.filter((c) => c.type === type && !c.archived_at),
    needsContext = type !== 'personal';
  return (
    <Sheet title={w.quick} {...{ locale, onClose }}>
      {disabled && (
        <p role="status">
          {locale === 'en'
            ? 'Editing unavailable. Close this sheet to retry a pending request, or refresh online.'
            : 'Perubahan tidak tersedia. Tutup lembar ini untuk mencoba ulang permintaan tertunda, atau muat ulang saat online.'}
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(
              plan(
                '/tasks',
                'POST',
                {
                  title,
                  context_id: context || null,
                  kind:
                    type === 'organization'
                      ? 'organizational_duty'
                      : type === 'academic'
                        ? 'assignment'
                        : 'personal_action',
                  due,
                },
                'create',
              ),
            );
            onClose();
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={disabled || busy}>
          <label>
            {w.title}
            <input
              required
              maxLength={240}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div
            className="s2-filters"
            role="group"
            aria-label={locale === 'en' ? 'Task type' : 'Jenis tugas'}
          >
            {(['academic', 'organization', 'personal'] as const).map((k) => (
              <button
                type="button"
                key={k}
                aria-pressed={type === k}
                onClick={() => {
                  setType(k);
                  setContext('');
                }}
              >
                {w[k]}
              </button>
            ))}
          </div>
          <label>
            {w.context}
            <select
              aria-label={w.context}
              required={needsContext}
              value={context}
              onChange={(e) => setContext(e.target.value)}
            >
              <option value="">
                {needsContext
                  ? locale === 'en'
                    ? 'Choose a saved context'
                    : 'Pilih konteks tersimpan'
                  : w.personal}
              </option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}
                </option>
              ))}
            </select>
          </label>
          {needsContext && !options.length && (
            <p>
              {locale === 'en'
                ? 'Add an academic or organization context in Settings first.'
                : 'Tambahkan konteks kuliah atau himpunan di Pengaturan dahulu.'}
            </p>
          )}
          <DateFields {...{ value: due, onChange: setDue, locale, zone }} />
          <button className="primary" disabled={needsContext && !context}>
            {w.add}
          </button>
        </fieldset>
      </form>
    </Sheet>
  );
}
