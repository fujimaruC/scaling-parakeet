import { useEffect, useRef, useState, type FormEvent } from 'react';
export default function TaskEditor({
  item,
  contexts,
  tasks = [],
  locale,
  proposal = false,
  onSave,
  onDelete,
  onClose,
}: {
  item: any;
  contexts: any[];
  tasks?: any[];
  locale: string;
  proposal?: boolean;
  onSave: (fields: any, target?: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const en = locale === 'en';
  const due = item.due;
  const [first, setFirst] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? '');
  const [context, setContext] = useState(item.context_id ?? '');
  const [date, setDate] = useState(
    due.local_date ?? due.local_datetime?.slice(0, 10) ?? '',
  );
  const [time, setTime] = useState(due.local_datetime?.slice(11, 16) ?? '');
  const [zone, setZone] = useState(due.timezone ?? 'Asia/Makassar');
  const [status, setStatus] = useState(item.status ?? 'todo');
  const [priority, setPriority] = useState(
    item.priority === 'unknown' ? 'normal' : (item.priority ?? 'normal'),
  );
  const [kind, setKind] = useState(
    ['announcement', 'decision', 'deadline_change'].includes(item.kind)
      ? 'personal_action'
      : item.kind,
  );
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(
        {
          title: first,
          description: description || null,
          context_id: context || null,
          kind,
          status,
          priority,
          due: date
            ? {
                precision: time ? 'datetime' : 'date_only',
                local_date: time ? null : date,
                local_datetime: time ? date + 'T' + time + ':00' : null,
                timezone: zone,
              }
            : {
                precision:
                  due.precision === 'approximate' ? 'approximate' : 'unknown',
                local_date: null,
                local_datetime: null,
                timezone: null,
              },
        },
        tasks.find((t) => t.id === target),
      );
      onClose();
    } catch {
      setError(
        en
          ? 'Not saved. Refresh if this item changed.'
          : 'Belum tersimpan. Muat ulang jika data berubah.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog ref={dialog} onCancel={onClose} className="editor">
      <form onSubmit={submit}>
        <h2>
          {proposal
            ? en
              ? 'Edit & approve proposal'
              : 'Edit & setujui usulan'
            : en
              ? 'Task details'
              : 'Detail tanggung jawab'}
        </h2>
        {error && <p role="alert">{error}</p>}
        {proposal && (
          <p>
            {en
              ? 'Original evidence stays on Linux. Your approval creates or changes the saved task.'
              : 'Bukti asli tetap di Linux. Persetujuanmu membuat atau mengubah tugas tersimpan.'}
          </p>
        )}
        <label>
          {en ? 'Task title' : 'Nama tugas'}
          <input
            autoFocus
            required
            maxLength={240}
            value={first}
            onChange={(e) => setFirst(e.target.value)}
          />
        </label>
        <label>
          {en ? 'Description' : 'Catatan'}
          <textarea
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          {en ? 'Context' : 'Konteks'}
          <select value={context} onChange={(e) => setContext(e.target.value)}>
            <option value="">{en ? 'Personal' : 'Pribadi'}</option>
            {contexts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </select>
        </label>
        {proposal && (
          <label>
            {en
              ? 'Update existing task (optional)'
              : 'Perbarui tugas tersimpan (opsional)'}
            <select
              required={item.kind === 'deadline_change'}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">
                {en ? 'Create a new task' : 'Buat tugas baru'}
              </option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {en ? 'Type' : 'Jenis'}
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {[
              'assignment',
              'exam',
              'meeting',
              'personal_action',
              'organizational_duty',
            ].map((x) => (
              <option key={x} value={x}>
                {x.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label>
          {en ? 'Status' : 'Status'}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {['todo', 'doing', 'blocked', 'done', 'archived'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          {en ? 'Priority' : 'Prioritas'}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {['low', 'normal', 'high', 'urgent'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          {en ? 'Deadline' : 'Tenggat'}
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (!e.target.value) setTime('');
            }}
          />
        </label>
        <label>
          {en ? 'Time (optional)' : 'Jam (opsional)'}
          <input
            type="time"
            disabled={!date}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        {date && (
          <label>
            {en ? 'Source timezone' : 'Zona waktu sumber'}
            <input
              required
              value={zone}
              onChange={(e) => setZone(e.target.value)}
            />
          </label>
        )}
        <div className="actions">
          <button className="primary" disabled={busy} type="submit">
            {proposal
              ? en
                ? 'Approve changes'
                : 'Setujui perubahan'
              : en
                ? 'Save changes'
                : 'Simpan perubahan'}
          </button>
          <button disabled={busy} type="button" onClick={onClose}>
            {en ? 'Cancel' : 'Batal'}
          </button>
        </div>
        {onDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!confirm(en ? 'Delete this task?' : 'Hapus tugas ini?'))
                return;
              setBusy(true);
              try {
                await onDelete();
                onClose();
              } catch {
                setError(en ? 'Delete failed' : 'Penghapusan gagal');
              } finally {
                setBusy(false);
              }
            }}
          >
            {en ? 'Delete task' : 'Hapus tugas'}
          </button>
        )}
      </form>
    </dialog>
  );
}
