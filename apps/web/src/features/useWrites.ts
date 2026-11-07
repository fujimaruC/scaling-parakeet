import { useEffect, useRef, useState } from 'react';
import { privateStore, type WritePlan } from './storage';
export type Api = (
  path: string,
  method?: string,
  value?: any,
  headers?: Record<string, string>,
) => Promise<any>;
export function haptic(ms: number) {
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
    navigator.vibrate?.(ms);
}
// Exactly one explicit online operation at a time. Reconnect never sends writes.
export function useWrites(
  owner: string | null,
  offline: boolean,
  api: Api,
  onApplied: (value: any, operation: WritePlan) => Promise<void>,
  onError: () => void,
) {
  const [pending, setPending] = useState<WritePlan | null>(null),
    [active, setActive] = useState(false),
    [ready, setReady] = useState(false);
  const ownerRef = useRef(owner),
    lock = useRef(false);
  ownerRef.current = owner;
  useEffect(() => {
    let live = true;
    setPending(null);
    setReady(false);
    if (owner)
      privateStore('write:' + owner)
        .then((p) => {
          if (live) {
            setPending(p ?? null);
            setReady(true);
          }
        })
        .catch(() => {
          if (live) onError();
        });
    return () => {
      live = false;
    };
  }, [owner]);
  async function send(operation: WritePlan, retry = false) {
    if (
      !owner ||
      offline ||
      !navigator.onLine ||
      !ready ||
      lock.current ||
      (pending && !retry)
    )
      throw Error('WRITE_UNAVAILABLE');
    const subject = owner;
    lock.current = true;
    setActive(true);
    try {
      // Crash or lost response retains the immutable body/version/key for manual retry.
      await privateStore(
        'write:' + subject,
        operation,
        () => ownerRef.current === subject,
      );
      if (ownerRef.current !== subject) throw Error('SESSION_CHANGED');
      setPending(operation);
      let response: any;
      try {
        response = await api(
          operation.path,
          operation.method,
          operation.value,
          operation.headers,
        );
      } catch (e: any) {
        if (e.status >= 400 && e.status < 500) {
          await privateStore(
            'write:' + subject,
            null,
            () => ownerRef.current === subject,
          );
          if (ownerRef.current === subject) setPending(null);
        }
        throw e;
      }
      if (ownerRef.current !== subject) return;
      await privateStore(
        'write:' + subject,
        null,
        () => ownerRef.current === subject,
      );
      setPending(null);
      haptic(
        operation.label === 'reject'
          ? 10
          : operation.label === 'accept'
            ? 16
            : operation.patch?.status === 'todo'
              ? 6
              : 12,
      );
      await onApplied(response, operation);
      return response;
    } catch (e) {
      onError();
      throw e;
    } finally {
      lock.current = false;
      setActive(false);
    }
  }
  return {
    pending,
    active,
    ready,
    send,
    retry: () => (pending ? send(pending, true) : Promise.resolve(null)),
    blocked: offline || !ready || active || !!pending,
  };
}
