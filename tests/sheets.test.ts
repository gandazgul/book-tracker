import { strict as assert } from 'node:assert';
import { parseBooks, readingStats } from '../shared/books.ts';
import { createSheetReader, type CacheStorage } from '../shared/sheets.ts';

Deno.test('TBR maps its own schema, preserves notes and missing authors, and never inflates finished stats', () => {
  const tbr = parseBooks('Title,Author,Method,Series,Notes,Have I read Author before?\nA,Writer,Physical Book,Saga,Not Spicy,Yes\nB,,Audio/E-Book,,,', 'tbr');
  assert.equal(tbr[0].status, 'To read');
  assert.equal(tbr[0].format, 'Physical Book');
  assert.equal(tbr[0].notes, 'Not Spicy');
  assert.equal(tbr[0].readAuthorBefore, 'Yes');
  assert.equal(tbr[1].author, '');
  assert.equal(readingStats(tbr).finished, 0);
  assert.notEqual(tbr[0].id, parseBooks('Title,Author\nA,Writer')[0].id);
});

Deno.test('tabs have independent caches and failed or malformed responses preserve last good data', async () => {
  const values = new Map<string, string>();
  const storage: CacheStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  let failTbr = false;
  const fetcher: typeof fetch = (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('headers'), '1');
    return Promise.resolve(new Response(url.searchParams.get('gid') === '2' ? (failTbr ? '<html>Sign in</html>' : 'Title,Author\nTBR,Writer') : 'Title,Author,Status\nRead,Writer,Finished'));
  };
  const read = createSheetReader({ id: 'test', gid: '0', kind: 'read', label: 'History' }, () => storage, fetcher);
  const tbr = createSheetReader({ id: 'test', gid: '2', kind: 'tbr', label: 'TBR' }, () => storage, fetcher);
  await Promise.all([read.fetch(), tbr.fetch()]);
  assert.equal(values.size, 2);
  failTbr = true;
  await assert.rejects(tbr.fetch());
  assert.equal(tbr.cached()?.books[0].title, 'TBR');
  assert.equal(tbr.cached()?.stale, true);
  assert.equal((await read.fetch()).books[0].title, 'Read');
});

Deno.test('sheet reader works when browser storage is unavailable', async () => {
  const reader = createSheetReader({ id: 'test', gid: '0', kind: 'read', label: 'History' }, () => { throw new Error('Disabled'); }, () => Promise.resolve(new Response('Title,Author\nBook,Author')));
  assert.equal(reader.cached(), null);
  assert.equal((await reader.fetch()).books.length, 1);
});
