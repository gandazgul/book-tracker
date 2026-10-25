import { strict as assert } from 'node:assert';
import { parseBooks, readingStats } from '../shared/books.ts';
import { booksInDateRange, rangeActivity } from '../shared/date-range.ts';
import { filterBooks } from '../shared/filters.ts';
import { buildSeries, type SeriesCatalog } from '../shared/series.ts';
import { recommend, familiarAuthors } from '../shared/recommendations.ts';
import { createSheetReader, type CacheStorage } from '../shared/sheets.ts';

Deno.test('DNF tab preserves percentages, quoted reasons and stopped dates without assuming completion', () => {
  const books = parseBooks('Title,Author,Status,Comments,Date Finished\nStopped,Writer,DNF - 75%,"Too much ""repetition"", slow ending",09-14-26\nUndated,Writer,,,\nContradiction,Writer,Finished,,10-01-26', 'dnf');
  assert.equal(books[0].status, 'DNF');
  assert.equal(books[0].statusDetail, 'DNF - 75%');
  assert.equal(books[0].dnfReason, 'Too much "repetition", slow ending');
  assert.equal(books[0].finished, '2026-09-14');
  assert.equal(books[1].finished, null);
  assert.equal(books[1].status, 'DNF');
  assert.equal(books[2].status, 'DNF');
  assert.equal(readingStats(books).finished, 0);
  const row = 'Title,Author\nStopped,Writer';
  assert.equal(new Set([parseBooks(row)[0].id, parseBooks(row, 'tbr')[0].id, parseBooks(row, 'dnf')[0].id]).size, 3);
});

Deno.test('explicit DNF history statuses are distinct from unfinished and ordinary comments', () => {
  const books = parseBooks('Title,Author,Status,Comments\nOne,A,dnf - 25%,Slow\nTwo,B,Unfinished,Paused\nThree,C,Finished,Too long');
  assert.deepEqual(books.map(b => b.status), ['DNF', 'Unfinished', 'Finished']);
  assert.equal(books[0].dnfReason, 'Slow');
  assert.equal(books[2].dnfReason, undefined);
  assert.equal(parseBooks('Title,Author,Date Stopped,Reason\nOne,A,10-19-26,Lost interest', 'dnf')[0].finished, '2026-10-19');
});

Deno.test('date filters include DNF boundaries but exclude them from every finished statistic', () => {
  const history = parseBooks('Title,Author,Status,Date Finished,Series,Platform\nRead,A,Finished,09-15-26,Saga,Kindle');
  const dnf = parseBooks('Title,Author,Date Finished\nStart,B,09-01-26\nEnd,C,09-30-26\nOutside,D,10-01-26\nUndated,E,', 'dnf');
  const range = { start: '2026-09-01', end: '2026-09-30' };
  const selected = booksInDateRange([...history, ...dnf], range);
  assert.deepEqual(filterBooks(selected, { status: 'DNF' }).map(b => b.title), ['End', 'Start']);
  assert.deepEqual(readingStats(selected), readingStats(history));
  assert.equal(rangeActivity(selected, range).buckets.reduce((n, b) => n + b.count, 0), 1);
});

Deno.test('DNF excludes all recommendation lanes and blocks advancing past a stopped series volume', () => {
  const history = parseBooks('Title,Author,Status,Series,Book #\nFirst,Writer,Finished,Saga,1');
  const dnf = parseBooks('Title,Author,Series,Book #\nSecond,Writer,Saga,2', 'dnf');
  const tbr = parseBooks('Title,Author,Series,Book #\nSecond,Writer,Saga,2', 'tbr');
  const catalog: SeriesCatalog = { name: 'Saga', author: 'Writer', source: 'https://example.com', checkedAt: '2026-10-25', scope: 'main', books: [{ number: 1, title: 'First' }, { number: 2, title: 'Second' }, { number: 3, title: 'Third' }] };
  const all = [...history, ...dnf];
  const group = buildSeries([...all, ...tbr], [catalog])[0];
  assert.equal(group.slots[1].state, 'DNF');
  assert.equal(group.finished, 1);
  assert.equal(group.complete, false);
  assert.equal(familiarAuthors(all)[0].count, 1);
  for (const queue of [[], tbr]) {
    const result = recommend(all, queue, [catalog], [{ title: 'Second', author: 'Writer', workId: '/works/OL1W', coverUrl: '', wantToRead: 99, category: 'romance', matchedAuthor: 'Writer' }]);
    assert.deepEqual([...result.continueSeries, ...result.fromTbr, ...result.moreByAuthors, ...result.popularRomance], []);
  }
});

Deno.test('DNF cache survives refresh failure independently from history and TBR', async () => {
  const values = new Map<string, string>();
  const storage: CacheStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); } };
  let fail = false;
  const fetcher: typeof fetch = input => {
    const dnf = new URL(String(input)).searchParams.get('gid') === '3';
    return Promise.resolve(new Response(dnf && fail ? 'Unavailable' : 'Title,Author,Comments\nBook,Writer,Reason', { status: dnf && fail ? 503 : 200 }));
  };
  const readers = (['read', 'tbr', 'dnf'] as const).map((kind, i) => createSheetReader({ id: 'test', gid: String(i + 1), kind, label: kind }, () => storage, fetcher));
  await Promise.all(readers.map(r => r.fetch()));
  assert.equal(values.size, 3);
  fail = true;
  await assert.rejects(readers[2].fetch());
  assert.equal(readers[2].cached()?.books[0].dnfReason, 'Reason');
  assert.equal(readers[2].cached()?.stale, true);
  await Promise.all(readers.slice(0, 2).map(r => r.fetch()));
});
