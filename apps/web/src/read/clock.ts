import { useSyncExternalStore } from 'react';
let now = Date.now(),
  timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
function tick() {
  if (!document.hidden) {
    now = Date.now();
    listeners.forEach((fn) => fn());
  }
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1) {
    tick();
    timer = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size) {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    }
  };
}
export function useClock() {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => now,
  );
}
