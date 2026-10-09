import { strict as assert } from 'node:assert';
import { parseBooks } from '../shared/books.ts';
import { familiarAuthors, recommend, type DiscoveryBook } from '../shared/recommendations.ts';
import { discoveryParams, parseDiscovery } from '../shared/discovery.ts';
import type { SeriesCatalog } from '../shared/series.ts';

const catalog: SeriesCatalog = { name: 'Saga', author: 'Writer', source: 'https://example.com/books', checkedAt: '2026-10-09', scope: 'main books',
  books: [{ number: 1, title: 'First' }, { number: 2, title: 'Second' }, { number: 3, title: 'Third' }] };
const discovered = (title: string, author = 'Writer', extra: Partial<DiscoveryBook> = {}): DiscoveryBook => ({ title, author, workId: '/works/OL1W', coverUrl: '', wantToRead: 100, category: 'romance', ...extra });

Deno.test('verified next series gap wins over duplicate TBR, and standalone TBR is untouched', () => {
  const history = parseBooks('Title,Author,Status,Series,Book #\nFirst,Writer,Finished,Saga,1');
  const tbr = parseBooks('Title,Author,Series\nSecond,Writer,Saga\nOther,Else,', 'tbr');
  const result = recommend(history, tbr, [catalog], [discovered('Second'), discovered('Other', 'Else')]);
  assert.equal(result.continueSeries[0].title, 'Second');
  assert.equal(result.continueSeries[0].inTbr, true);
  assert.equal(result.continueSeries[0].sourceUrl, catalog.source);
  assert.deepEqual(result.fromTbr.map(b => b.title), ['Other']);
  assert.equal(result.popularRomance.length, 0);
  assert.equal(tbr.length, 2);
});

Deno.test('numeric gaps remain unverified reminders, never invented recommendations', () => {
  const history = parseBooks('Title,Author,Status,Series,Book #\nThird,Writer,Finished,Unknown,3');
  const result = recommend(history, [], []);
  assert.deepEqual(result.numberGaps.map(g => g.number), [1, 2]);
  assert.equal(result.continueSeries.length, 0);
});

Deno.test('excludes finished, reading, unfinished and unknown history across all lanes', () => {
  const history = parseBooks('Title,Author,Status\nFirst-1,Writer,Finished\nSecond,Writer,Reading\nThird,Writer,Unfinished\nFourth,Writer,');
  const tbr = parseBooks('Title,Author\nFirst,Writer\nSecond,Writer\nThird,Writer\nFourth,Writer', 'tbr');
  const result = recommend(history, tbr, [], ['First', 'Second', 'Third', 'Fourth'].map(title => discovered(title, 'Writer', { matchedAuthor: 'Writer' })));
  assert.equal([...result.fromTbr, ...result.moreByAuthors, ...result.popularRomance].length, 0);
});

Deno.test('author recommendations require exact matching, deduplicate rereads and cap each author', () => {
  const history = parseBooks('Title,Author,Status\nFirst,Writer,Finished\nFirst,Writer,Finished\nOther,Second Writer,Finished');
  assert.equal(familiarAuthors(history).find(a => a.author === 'Writer')?.count, 1);
  const pool = ['A', 'B', 'C'].map(title => discovered(title, 'Writer', { matchedAuthor: 'Writer' }));
  pool.push(discovered('D', 'Second Writer', { matchedAuthor: 'Second Writer' }));
  pool.push(discovered('E', 'Unrelated', { matchedAuthor: 'Writer' }));
  const result = recommend(history, [], [], pool);
  assert.equal(result.moreByAuthors.filter(b => b.author === 'Writer').length, 2);
  assert.ok(result.moreByAuthors.some(b => b.author === 'Second Writer'));
  assert.ok(!result.moreByAuthors.some(b => b.title === 'E'));
  const keys = [...result.moreByAuthors, ...result.popularRomance].map(b => b.key);
  assert.equal(new Set(keys).size, keys.length);
});

Deno.test('romance lane respects selected category and sorts its popularity signal', () => {
  const result = recommend([], [], [], [discovered('Less', 'A', { wantToRead: 2, category: 'historical' }), discovered('More', 'B', { wantToRead: 200, category: 'historical' }), discovered('Unselected')], 'historical');
  assert.deepEqual(result.popularRomance.map(b => b.title), ['More', 'Less']);
  assert.ok(result.popularRomance[0].reason.includes('200 want-to-read'));
});

Deno.test('discovery validates work links, authors and counts from external data', () => {
  const data = { docs: [
    { key: '/works/OL1W', title: 'Valid', author_name: ['S. C. Wynne'], cover_i: 123, want_to_read_count: 5 },
    { key: '/works/OL2W', title: 'Wrong author', author_name: ['Someone Else'] },
    { key: 'https://invalid.test', title: 'Invalid link', author_name: ['SC Wynne'] },
    { key: '/works/OL3W', title: 'Anonymous', author_name: [] },
  ] };
  const books = parseDiscovery(data, { author: 'SC Wynne' });
  assert.equal(books.length, 1);
  assert.ok(books[0].coverUrl.startsWith('https://covers.openlibrary.org/'));
  assert.equal(books[0].matchedAuthor, 'SC Wynne');
  assert.throws(() => parseDiscovery({}, { category: 'romance' }));
  assert.equal(discoveryParams({ category: 'romance' }).get('sort'), 'want_to_read');
});

Deno.test('does not recommend later series volumes when the first unread volume is in progress', () => {
  const history = parseBooks('Title,Author,Status,Series\nFirst,Writer,Finished,Saga\nSecond,Writer,Reading,Saga');
  assert.equal(recommend(history, [], [catalog]).continueSeries.length, 0);
});
