import { strict as assert } from 'node:assert';
import { parseBooks } from '../shared/books.ts';
import { availableYears, filterBooks } from '../shared/filters.ts';

const books = parseBooks('Title,Author,Series,Platform,Status,Date Finished\nCafé Romance,Author A,S,Audible,Finished,10-02-26\nOlder,Author B,T,Book,Finished,01-01-25\nNext,Author A,S,Kindle,,\nEarlier,Author A,S,Audible,Finished,01-01-26');

Deno.test('library defaults to all books including undated entries and sorts without mutating', () => {
  const ids = books.map(b => b.id);
  const result = filterBooks(books);
  assert.equal(result.length, 4);
  assert.equal(result[0].title, 'Café Romance');
  assert.equal(result[3].title, 'Next');
  assert.deepEqual(books.map(b => b.id), ids);
});
Deno.test('composable filters handle accents and unknown statuses', () => {
  assert.equal(filterBooks(books, { query: 'cafe', platform: 'Audible', year: '2026' }).length, 1);
  assert.equal(filterBooks(books, { status: 'Not set' })[0].title, 'Next');
  assert.equal(filterBooks(books, { author: 'Author A', series: 'S' }).length, 3);
  assert.equal(filterBooks(books, { query: 'missing' }).length, 0);
});
Deno.test('oldest-first still places undated books last; years include current year', () => {
  assert.equal(filterBooks(books, { sort: 'oldest' })[0].title, 'Older');
  assert.equal(filterBooks(books, { sort: 'oldest' }).at(-1)?.title, 'Next');
  assert.deepEqual(availableYears(books, 2027), ['2027', '2026', '2025']);
});
