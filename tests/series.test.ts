import { strict as assert } from 'node:assert';
import { parseBooks } from '../shared/books.ts';
import { bookNumber, buildSeries, type SeriesCatalog } from '../shared/series.ts';

const parse = (rows: string) => parseBooks(`Title,Author,Book #,Series,Status\n${rows}`);
const catalog: SeriesCatalog = { name: 'Trilogy', author: 'A', source: 'https://example.com', checkedAt: '2026-10-09', scope: 'Main novels', books: [{ number: 1, title: 'One' }, { number: 2, title: 'Two' }, { number: 3, title: 'Three' }] };

Deno.test('number-only series expose missing positions but never claim a complete catalog', () => {
  const [series] = buildSeries(parse('One,A,1,Trilogy,Finished\nThree,A,3,Trilogy,Finished'));
  assert.equal(series.slots[1].state, 'Number gap');
  assert.equal(series.missing, 1);
  assert.equal(series.complete, false);
});
Deno.test('catalog detects later books absent from the sheet', () => {
  const [series] = buildSeries(parse('One,A,1,Trilogy,Finished'), [catalog]);
  assert.equal(series.missing, 2);
  assert.equal(series.slots[1].title, 'Two');
  assert.equal(series.slots[1].state, 'Not in sheet');
});
Deno.test('catalog uses titles despite wrong sheet numbers and preserves the source', () => {
  const books = parse('Two,A,1,Trilogy,Finished');
  const [series] = buildSeries(books, [catalog]);
  assert.equal(series.slots[0].state, 'Not in sheet');
  assert.equal(series.slots[1].state, 'Finished');
  assert.equal(series.slots[1].numberConflict, true);
  assert.equal(books[0].number, '1');
});
Deno.test('rereads do not inflate series progress and blank series cells still match a catalog', () => {
  const [series] = buildSeries(parse('One,A,1,Trilogy,Finished\nOne,A,1,Trilogy,Finished\nTwo,A,2,,Finished\nThree,A,3,Trilogy,'), [catalog]);
  assert.equal(series.finished, 2);
  assert.equal(series.missing, 0);
  assert.equal(series.complete, false);
  assert.equal(series.slots[2].state, 'Not set');
});
Deno.test('unknown numbers, book zero, fractional novellas, and oversized values remain safe', () => {
  const books = parse('Prequel,A,0,S,Finished\nNovella,A,1.5,S,Finished\nUnknown,A,,S,Finished\nHuge,A,99999,S,Finished');
  assert.equal(bookNumber(books[0]), 0);
  assert.equal(bookNumber(books[1]), 1.5);
  assert.equal(bookNumber(books[3]), null);
  assert.equal(buildSeries(books)[0].unknownNumber, 2);
});
Deno.test('same-name series by different authors are kept separate', () => {
  assert.equal(buildSeries(parse('One,A,1,S,Finished\nTwo,B,2,S,Finished')).length, 2);
});
Deno.test('complete applies only to finished catalog titles', () => {
  const [series] = buildSeries(parse('One,A,1,Trilogy,Finished\nTwo,A,2,Trilogy,Finished\nThree,A,3,Trilogy,Finished'), [catalog]);
  assert.equal(series.complete, true);
  assert.equal(series.finished, 3);
});
