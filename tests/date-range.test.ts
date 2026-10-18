import { strict as assert } from 'node:assert';
import { parseBooks, readingStats } from '../shared/books.ts';
import { booksInDateRange, dateRangeError, rangeActivity } from '../shared/date-range.ts';

const books = parseBooks('Title,Author,Date Finished,Status,Series,Platform\nBefore,A,12-30-25,Finished,S,Kindle\nStart,A,12-31-25,Finished,S,Kindle\nEnd,B,01-01-26,Finished,T,Audible\nAfter,C,01-02-26,Finished,U,Book\nUndated,D,,Finished,V,Book\nUnknown,E,01-01-26,,W,Book\nUnfinished,F,01-01-26,Unfinished,X,Book');
const range = { start: '2025-12-31', end: '2026-01-01' };

Deno.test('date ranges include both boundaries across years and exclude undated entries', () => {
  const original = books.map(b => b.id);
  const selected = booksInDateRange(books, range);
  assert.deepEqual(selected.map(b => b.title), ['Start', 'End', 'Unknown', 'Unfinished']);
  const stats = readingStats(selected);
  assert.equal(stats.finished, 2);
  assert.equal(stats.authors, 2);
  assert.equal(stats.series, 2);
  assert.deepEqual(stats.platforms, [['Audible', 1], ['Kindle', 1]]);
  assert.deepEqual(books.map(b => b.id), original);
  assert.equal(readingStats(books).missingDates, 1);
});

Deno.test('single-day, leap-day, and empty periods are supported', () => {
  assert.equal(readingStats(booksInDateRange(books, { start: '2026-01-01', end: '2026-01-01' })).finished, 1);
  assert.equal(dateRangeError({ start: '2024-02-29', end: '2024-02-29' }), null);
  assert.deepEqual(booksInDateRange(books, { start: '2024-02-29', end: '2024-02-29' }), []);
});

Deno.test('date ranges reject missing, impossible, noncanonical and reversed dates', () => {
  for (const invalid of [
    { start: '', end: '2026-01-01' },
    { start: '2026-02-29', end: '2026-03-01' },
    { start: '2026-1-1', end: '2026-01-02' },
    { start: '2026-01-02', end: '2026-01-01' },
  ]) {
    assert.ok(dateRangeError(invalid));
    assert.deepEqual(booksInDateRange(books, invalid), []);
    assert.deepEqual(rangeActivity(books, invalid).buckets, []);
  }
});

Deno.test('range charts keep December and January chronological with zero months and finished-only totals', () => {
  assert.deepEqual(rangeActivity(books, { ...range, end: '2026-02-01' }), {
    unit: 'month', buckets: [
      { key: '2025-12', label: 'Dec 2025', count: 1 },
      { key: '2026-01', label: 'Jan 2026', count: 2 },
      { key: '2026-02', label: 'Feb 2026', count: 0 },
    ],
  });
  assert.equal(rangeActivity(books, range).buckets.reduce((sum, b) => sum + b.count, 0), 2);
});

Deno.test('long periods use annual buckets while respecting partial boundary years', () => {
  assert.deepEqual(rangeActivity(books, { start: '2023-12-31', end: '2026-01-01' }), {
    unit: 'year', buckets: [
      { key: '2023', label: '2023', count: 0 },
      { key: '2024', label: '2024', count: 0 },
      { key: '2025', label: '2025', count: 2 },
      { key: '2026', label: '2026', count: 1 },
    ],
  });
});
