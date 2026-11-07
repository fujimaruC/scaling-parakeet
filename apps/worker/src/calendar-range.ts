// An owner-calendar range filters exact instants separately from literal date-only values.
export function calendarRange(from: string, through: string, zone: string) {
  const valid = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (
    !valid(from) ||
    !valid(through) ||
    through < from ||
    Date.parse(through) - Date.parse(from) > 366 * 86400000
  )
    throw Error('INVALID_FILTER');
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const day = (n: number) => {
    const p = fmt.formatToParts(n);
    return ['year', 'month', 'day']
      .map((k) => p.find((v) => v.type === k)!.value)
      .join('-');
  };
  const boundary = (s: string) => {
    let lo = Date.parse(s) - 2 * 86400000,
      hi = Date.parse(s) + 2 * 86400000;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (day(mid) < s) lo = mid;
      else hi = mid;
    }
    return new Date(hi).toISOString();
  };
  const next = new Date(Date.parse(through) + 86400000)
    .toISOString()
    .slice(0, 10);
  return [boundary(from), boundary(next)];
}
