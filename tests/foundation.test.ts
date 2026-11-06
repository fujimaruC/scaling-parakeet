import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { Bitmap } from '../apps/web/src/pixel/Bitmap';
import { UrgencyBar, urgency } from '../apps/web/src/pixel/UrgencyBar';
import { ICONS } from '../apps/web/src/pixel/icons';
test('bitmap merges runs, stays decorative and uses supplied cells', () => {
  const svg = renderToStaticMarkup(
    React.createElement(Bitmap, { rows: ['1101', '0110'] }),
  );
  expect(svg).toContain('M0 0h2v1h-2zM3 0h1v1h-1zM1 1h2v1h-2z');
  expect(svg).toContain('aria-hidden="true"');
  expect(Object.keys(ICONS)).toHaveLength(12);
});
test('urgency respects boundaries and never invents an instant for imprecise dates', () => {
  const day = 86400000;
  expect(urgency(-1, 0)).toEqual({ filled: 16, level: 'urgent' });
  expect(urgency(day, 0).level).toBe('warn');
  expect(urgency(day * 3, 0).level).toBe('normal');
  expect(urgency(day * 7, 0).filled).toBe(0);
  for (const precision of ['date_only', 'approximate', 'unknown'])
    expect(
      renderToStaticMarkup(
        React.createElement(UrgencyBar, { due: 0, now: 0, precision }),
      ),
    ).toBe('');
  expect(
    renderToStaticMarkup(
      React.createElement(UrgencyBar, {
        due: 0,
        now: 0,
        precision: 'datetime',
      }),
    ).match(/<i /g),
  ).toHaveLength(16);
});
