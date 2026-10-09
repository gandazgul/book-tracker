import { strict as assert } from 'node:assert';
import { booksInYear, matchScore, parseBooks, parseDate, readingStats } from '../shared/books.ts';

Deno.test('month-first dates are calendar validated, including leap years', () => {
  assert.equal(parseDate('09-30-26'), '2026-09-30');
  assert.equal(parseDate('2/29/2024'), '2024-02-29');
  assert.equal(parseDate('02-29-25'), null);
  assert.equal(parseDate('13-01-26'), null);
  assert.equal(parseDate(''), null);
  assert.equal(parseDate('2026-10-07'), '2026-10-07');
});

Deno.test('CSV preserves quoted text, normalizes platforms, retains unknown statuses', () => {
  const books = parseBooks('Date Finished,Title,Author,Book #,Series,Platform,Status\n09-30-26,"Hello, World",Author,0,Series, audible ,Finished\n,Next book,Writer,,, Kobo,\n,,,,,,');
  assert.equal(books.length, 2);
  assert.equal(books[0].title, 'Hello, World');
  assert.equal(books[0].number, '0');
  assert.equal(books[0].platform, 'Audible');
  assert.equal(books[1].status, 'Not set');
  assert.equal(books[1].finished, null);
  assert.equal(books[1].platform, 'Kobo');
});

Deno.test('stats count only explicitly finished books, keep undated finishes out of yearly totals', () => {
  const books = parseBooks('Title,Author,Date Finished,Status,Series\nOne,A,01-01-26,Finished,S\nTwo,A,02-02-26,Unfinished,S\nThree,B,03-03-26,,\nFour,C,,Finished,\nFive,A,01-01-25,Finished,S');
  const stats = readingStats(booksInYear(books, '2026'));
  assert.equal(stats.finished, 1);
  assert.equal(stats.authors, 1);
  assert.equal(stats.months[1].count, 0);
  assert.equal(readingStats(books).finished, 3);
  assert.equal(readingStats(books).missingDates, 1);
});

Deno.test('rejects sign-in HTML, malformed CSV, and missing title/author headers', () => {
  assert.throws(() => parseBooks('<html>Sign in</html>'));
  assert.throws(() => parseBooks('Title,Status\nA,Finished'));
  assert.throws(() => parseBooks('Title,Author\n"unclosed,Someone'));
});

Deno.test('cover matching requires both title and author, handles series suffixes and initials', () => {
  assert.ok(matchScore({ title: "It's in His Kiss-7", author: 'Julia Quinn' }, "It's in His Kiss", ['Julia Quinn']));
  assert.ok(matchScore({ title: 'Last Chance', author: 'SC Wynne' }, 'Last Chance', ['S. C. Wynne']));
  assert.equal(matchScore({ title: 'Last Chance', author: 'SC Wynne' }, 'Last Chance', ['Someone Else']), 0);
  assert.equal(matchScore({ title: 'Cactus Heart', author: 'Clio Evans' }, 'Different Book', ['Clio Evans']), 0);
});
