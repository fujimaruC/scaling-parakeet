import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import common from '../../../schemas/common.schema.json';
import sync from '../../../schemas/sync-envelope.schema.json';
import extraction from '../../../schemas/ai-extraction.schema.json';
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(common);
export const validateSync = ajv.compile(sync);
export const validateExtraction = ajv.compile(extraction);
export type Due = {
  precision: 'datetime' | 'date_only' | 'approximate' | 'unknown';
  local_date: string | null;
  local_datetime: string | null;
  timezone: string | null;
};
export const unknownDue: Due = {
  precision: 'unknown',
  local_date: null,
  local_datetime: null,
  timezone: null,
};
export class Invalid extends Error {}
export function exactDate(s: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    throw new Invalid('INVALID_DATE');
}
function parts(ms: number, timezone: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .format(new Date(ms))
    .replace(' ', 'T');
}
export function toUtc(local: string, zone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(local))
    throw new Invalid('INVALID_DATETIME');
  exactDate(local.slice(0, 10));
  const target = Date.parse(local + 'Z');
  if (
    !Number.isFinite(target) ||
    new Date(target).toISOString().slice(0, 19) !== local
  )
    throw new Invalid('INVALID_DATETIME');
  try {
    const offsets = new Set(
      [-36, 0, 36].map((h) => {
        const t = target + h * 3600000;
        return Date.parse(parts(t, zone) + 'Z') - t;
      }),
    );
    const matches = [...offsets]
      .map((o) => target - o)
      .filter((t) => parts(t, zone) === local);
    if (matches.length !== 1) throw new Invalid('AMBIGUOUS_DATETIME');
    return new Date(matches[0]).toISOString();
  } catch (e) {
    if (e instanceof Invalid) throw e;
    throw new Invalid('INVALID_TIMEZONE');
  }
}
export function validateDue(d: Due): string | null {
  if (
    !d ||
    Object.keys(d).sort().join(',') !==
      'local_date,local_datetime,precision,timezone'
  )
    throw new Invalid('INVALID_DUE');
  if (d.precision === 'unknown' || d.precision === 'approximate') {
    if (
      d.local_date !== null ||
      d.local_datetime !== null ||
      d.timezone !== null
    )
      throw new Invalid('INVALID_DUE');
    return null;
  }
  if (typeof d.timezone !== 'string' || !d.timezone)
    throw new Invalid('INVALID_TIMEZONE');
  try {
    new Intl.DateTimeFormat('en', { timeZone: d.timezone });
  } catch {
    throw new Invalid('INVALID_TIMEZONE');
  }
  if (
    d.precision === 'date_only' &&
    typeof d.local_date === 'string' &&
    d.local_datetime === null
  ) {
    exactDate(d.local_date);
    return null;
  }
  if (
    d.precision === 'datetime' &&
    typeof d.local_datetime === 'string' &&
    d.local_date === null
  )
    return toUtc(d.local_datetime, d.timezone);
  throw new Invalid('INVALID_DUE');
}
export function semanticSync(v: any) {
  if (!(validateSync as (value: unknown) => boolean)(v))
    throw new Invalid('INVALID_PAYLOAD');
  const ids = new Set(v.items.map((x: any) => x.evidence_id));
  if (ids.size !== v.items.length) throw new Invalid('DUPLICATE_EVIDENCE');
  const candidates = new Set();
  for (const c of v.candidates) {
    if (candidates.has(c.candidate_id))
      throw new Invalid('DUPLICATE_CANDIDATE');
    candidates.add(c.candidate_id);
    if (c.evidence_ids.some((id: string) => !ids.has(id)))
      throw new Invalid('EVIDENCE_UNAVAILABLE');
    validateDue(c.fields.due);
  }
  if (
    (v.coverage.start_at === null) !== (v.coverage.end_at === null) ||
    (v.coverage.start_at &&
      Date.parse(v.coverage.start_at) > Date.parse(v.coverage.end_at))
  )
    throw new Invalid('INVALID_COVERAGE');
  return v;
}
export function reminderTimes(due: Due): string[] {
  const utc = validateDue(due);
  if (utc)
    return [24, 3].map((h) =>
      new Date(Date.parse(utc) - h * 3600000).toISOString(),
    );
  if (due.precision === 'date_only') {
    const previous = new Date(
      Date.parse(due.local_date! + 'T12:00:00Z') - 86400000,
    )
      .toISOString()
      .slice(0, 10);
    return [toUtc(previous + 'T09:00:00', due.timezone!)];
  }
  return [];
}
