import React from 'react';
export function urgency(due: number, now: number) {
  const remaining = Math.max(0, due - now),
    day = 86400000;
  const window = remaining < day ? day : 7 * day;
  return {
    filled: Math.round((1 - Math.min(1, remaining / window)) * 16),
    level: remaining < day ? 'urgent' : remaining < 3 * day ? 'warn' : 'normal',
  };
}
// Exact instants only. Date-only/approximate/unknown must not acquire false urgency.
export function UrgencyBar({
  due,
  now,
  precision,
}: {
  due: number;
  now: number;
  precision: string;
}) {
  if (
    precision !== 'datetime' ||
    !Number.isFinite(due) ||
    !Number.isFinite(now)
  )
    return null;
  const value = urgency(due, now);
  return (
    <div className={`seg ${value.level}`} aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => (
        <i
          key={i}
          className={i < value.filled ? 'on' : undefined}
          style={{ animationDelay: i * 28 + 'ms' }}
        />
      ))}
    </div>
  );
}
