import { expect, test } from 'vitest';
import {
  groupTasks,
  dueLabel,
  when,
  reminderText,
  localDay,
  words,
  type Task,
} from '../apps/web/src/read/model';
import fixture from './fixtures/s2-ledger.json';
const now = Date.parse('2026-11-06T04:00:00Z'),
  zone = 'Asia/Makassar';
const rows = fixture.map((t, i) => ({
  ...t,
  id: String(i),
  version: 1,
  context_id: null,
  status: t.status ?? 'todo',
  due_at_utc:
    t.due.precision === 'datetime' ? t.due.local_datetime + '+08:00' : null,
})) as Task[];
test('calendar grouping keeps four precisions, fixed group order and date-only last on its local date', () => {
  const groups = groupTasks([...rows].reverse(), now, zone);
  expect(Object.keys(groups)).toEqual([
    'today',
    'week',
    'later',
    'undated',
    'done',
  ]);
  expect(groups.today.map((t) => t.title)).toEqual([
    'Synthetic overdue duty',
    'Synthetic exact deadline',
    'Synthetic date-only deadline',
  ]);
  expect(groups.undated.map((t) => t.due.precision).sort()).toEqual([
    'approximate',
    'unknown',
  ]);
  expect(groups.done.map((t) => t.title)).toEqual(['Synthetic completed task']);
  const labels = rows.map((t) => dueLabel(t, 'en'));
  expect(labels[1]).toContain('23:59');
  expect(labels[2]).toContain('Date only');
  expect(labels[2]).not.toMatch(/00:00|23:59/);
  expect(labels[5]).toBe('Approximate — not confirmed');
  expect(labels[6]).toBe('No date yet');
  expect(when(rows[2], 'en', now, zone)).toBe('Date only');
});
test('grouping uses owner calendar boundaries rather than browser UTC, including DST and a large synthetic set', () => {
  const dayTask = {
    ...rows[2],
    due: { ...rows[2].due, local_date: '2026-11-07' },
  };
  const midnight = Date.parse('2026-11-06T16:01:00Z');
  expect(localDay(midnight, zone)).toBe('2026-11-07');
  const exactMidnight = {
    ...rows[1],
    due_at_utc: '2026-11-06T16:05:00Z',
    due: { ...rows[1].due, local_datetime: '2026-11-07T00:05:00' },
  };
  expect(when(exactMidnight, 'en', midnight, zone)).toBe('00:05');
  expect(groupTasks([dayTask], midnight, zone).today).toHaveLength(1);
  const many = Array.from({ length: 1500 }, (_, i) => ({
    ...rows[i % rows.length],
    id: String(i),
  }));
  const groups = groupTasks(many, now, zone);
  expect(Object.values(groups).flat()).toHaveLength(1500);
  const fold = [
    { ...rows[1], id: 'earlier', due_at_utc: '2026-11-01T05:45:00Z' },
    { ...rows[1], id: 'later', due_at_utc: '2026-11-01T06:15:00Z' },
  ];
  expect(
    groupTasks(
      fold,
      Date.parse('2026-11-01T04:00:00Z'),
      'America/New_York',
    ).today.map((t) => t.id),
  ).toEqual(['earlier', 'later']);
  const completedUnknown = { ...rows[6], status: 'done' };
  expect(groupTasks([completedUnknown], now, zone).undated).toEqual([
    completedUnknown,
  ]);
  expect(groupTasks([completedUnknown], now, zone).done).toEqual([]);
  expect(localDay(Date.parse('2026-11-01T06:30:00Z'), 'America/New_York')).toBe(
    '2026-11-01',
  );
});
test('reminder presentation follows effective server policy, including disabled, date-only and unknown', () => {
  const view = {
    reminder_policy: {
      enabled: true,
      offset_hours: [7, 1],
      date_only_hour: 11,
    },
    reminder_policy_origin: 'configured',
  };
  expect(reminderText(rows[1], view, 'en')).toContain('7, 1 hours before');
  expect(reminderText(rows[2], view, 'en')).toContain('Previous day at 11:00');
  expect(reminderText(rows[6], view, 'en')).toContain('No scheduled reminder');
  expect(
    reminderText(
      rows[1],
      { ...view, reminder_policy: { ...view.reminder_policy, enabled: false } },
      'en',
    ),
  ).toContain('disabled');
  expect(reminderText(rows[1], null, 'en')).toBe('Data unavailable');
  expect(Object.keys(words.id).sort()).toEqual(Object.keys(words.en).sort());
});

test('Today keeps its undated navigation even when the loaded ledger is empty', async () => {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: Ledger } = await import('../apps/web/src/read/Ledger');
  const html = renderToStaticMarkup(
    React.createElement(Ledger, {
      page: 'today',
      tasks: [],
      contexts: [],
      locale: 'en',
      zone,
      pending: 0,
      partial: false,
      canMore: false,
      onMore: () => {},
      onOpen: () => {},
      onPage: () => {},
      onSheet: () => {},
    }),
  );
  expect(html).toContain('class="s2-unknown"');
  expect(html).toContain('>0</strong>');
  expect(html).not.toContain('hidden=""');
  const { contextInfo } = await import('../apps/web/src/read/Ledger');
  expect(contextInfo({ ...rows[0], context_id: 'missing' }, [], 'en')).toEqual({
    name: 'Context unavailable',
    type: 'unknown',
  });
});
