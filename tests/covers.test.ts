import { strict as assert } from 'node:assert';
import { parseBooks, type Book } from '../shared/books.ts';
import { coverMatchScore, coverSearchParams, coverAuthorMatches } from '../shared/cover-matching.ts';
import { createCoverProvider } from '../shared/cover-provider.ts';
const book = (overrides: Partial<Book> = {}): Book => ({ ...parseBooks('Title,Author\nMine till Midnight,Lisa Kleypas')[0], ...overrides });
const doc = (overrides = {}) => ({ title: 'Mine Till Midnight (Platinum Romance Series)', author_name: ['Lisa Kleypas'], cover_i: 2010988, key: '/works/OL4331797W', ...overrides });
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
Deno.test('cover search preserves apostrophes and author query allows middle initials', () => {
  const q = coverSearchParams([book({ title: 'It’s in His Kiss-7', author: 'Julia Quinn' }), book({ title: 'Garden', author: 'Summer England' })]).get('q')!;
  assert.ok(q.includes('title:"It\'s in His Kiss"'));
  assert.ok(!q.includes('it s'));
  assert.ok(q.includes('author:"england"'));
});
Deno.test('covers match initials and edition packaging without accepting different authors or books', () => {
  assert.ok(coverMatchScore(book(), doc().title, ['Lisa Kleypas']));
  assert.ok(coverMatchScore(book({ title: "It's in His Kiss-7", author: 'Julia Quinn' }), 'It’s in His Kiss', ['Julia Quinn']));
  assert.ok(coverAuthorMatches('Summer England', 'Summer N. England'));
  assert.ok(coverAuthorMatches('Ann H Creel', 'Ann Howard Creel'));
  assert.ok(coverAuthorMatches('SC Wynne', 'S. C. Wynne'));
  assert.equal(coverAuthorMatches('Katee Roberts', 'Katee Robert'), false);
  assert.equal(coverAuthorMatches('Summer England', 'Autumn England'), false);
  assert.equal(coverAuthorMatches('Ann H Creel', 'Ann J Creel'), false);
  assert.equal(coverAuthorMatches('Creel', 'Ann Howard Creel'), false);
  assert.equal(coverAuthorMatches('', ''), false);
  for (const title of ['Mine Till Midnight: The Second Epilogue', 'Mine Till Midnight (Series Box Set)', 'Mine Till Morning', 'Mine Till Midnight: Part Two']) assert.equal(coverMatchScore(book(), title, ['Lisa Kleypas']), 0);
  assert.equal(coverMatchScore(book(), doc().title, ['Someone Else']), 0);
});
Deno.test('missing ISBN image falls through to validated title/author cover and saves only the loaded result', async () => {
  const saved = storage(); const urls: string[] = [];
  const provider = createCoverProvider({ storage: () => saved, search: () => Promise.resolve({ docs: [doc()] }), imageLoads: url => { urls.push(url); return Promise.resolve(!url.includes('/isbn/')); } });
  const result = await provider.get(book({ isbn: '9781728278087' }));
  assert.ok(urls[0].includes('/isbn/9781728278087'));
  assert.ok(result.coverUrl?.includes('/id/2010988'));
  assert.equal(saved.values.size, 1);
  assert.equal((await provider.get(book({ isbn: '9781728278087' }))).coverUrl, result.coverUrl);
  assert.equal(urls.length, 2);
});
Deno.test('sheet image takes priority; changed ISBN or override bypasses a previous lookup', async () => {
  let queries = 0; const urls: string[] = [];
  const provider = createCoverProvider({ storage: () => storage(), search: () => { queries++; return Promise.resolve({ docs: [doc()] }); }, imageLoads: url => { urls.push(url); return Promise.resolve(true); } });
  await provider.get(book());
  assert.equal((await provider.get(book({ coverUrl: 'https://example.com/cover.jpg' }))).source, 'Sheet');
  assert.ok((await provider.get(book({ isbn: '9781728278087' }))).coverUrl?.includes('/isbn/'));
  assert.equal(queries, 1); assert.equal(urls.length, 3);
});
Deno.test('a broken first catalog image tries another matching edition, never unrelated books', async () => {
  const urls: string[] = [];
  const provider = createCoverProvider({ storage: () => undefined, search: () => Promise.resolve({ docs: [doc(), doc({ cover_i: 42 }), doc({ title: 'Wrong book', cover_i: 43 })] }), imageLoads: url => { urls.push(url); return Promise.resolve(url.includes('/42-')); } });
  assert.ok((await provider.get(book())).coverUrl?.includes('/42-'));
  assert.equal(urls.length, 2);
});
Deno.test('transient provider and image failures are retried, not cached as missing books', async () => {
  for (const failure of ['search', 'image']) {
    let first = true, queries = 0; const saved = storage();
    const provider = createCoverProvider({ storage: () => saved, search: () => { queries++; if (first && failure === 'search') return Promise.reject(Error('offline')); return Promise.resolve({ docs: [doc()] }); }, imageLoads: () => Promise.resolve(!first) });
    assert.equal((await provider.get(book())).coverUrl, null); first = false;
    assert.ok((await provider.get(book())).coverUrl); assert.equal(queries, 2);
    assert.equal(saved.values.size, 1);
  }
});
Deno.test('Refresh retries catalog misses, retains successful covers, and invalidates broken cached images', async () => {
  const saved = storage(); let available = false, queries = 0;
  const provider = createCoverProvider({ storage: () => saved, search: () => { queries++; return Promise.resolve({ docs: available ? [doc()] : [] }); }, imageLoads: () => Promise.resolve(true) });
  assert.equal((await provider.get(book())).coverUrl, null);
  assert.equal(saved.values.size, 0);
  available = true; assert.equal((await provider.get(book())).coverUrl, null); assert.equal(queries, 1);
  provider.retryMissing(); assert.ok((await provider.get(book())).coverUrl); assert.equal(queries, 2);
  provider.retryMissing(); await provider.get(book()); assert.equal(queries, 2);
  provider.invalidate(book()); await provider.get(book()); assert.equal(queries, 3);
});
Deno.test('concurrent book lookups are batched and duplicate lookups share a request', async () => {
  let queries = 0; const provider = createCoverProvider({ storage: () => undefined, search: params => { queries++; assert.ok(params.get('q')?.includes(' OR ')); return Promise.resolve({ docs: [doc()] }); }, imageLoads: () => Promise.resolve(true) });
  const a = provider.get(book()); const b = provider.get(book()); assert.equal(a, b);
  const results = await Promise.all([a, b, provider.get(book({ title: 'Another book' }))]);
  assert.equal(queries, 1); assert.ok(results[0].coverUrl); assert.equal(results[2].coverUrl, null);
});
Deno.test('optional fallback is attempted when Open Library fails and returned images are checked', async () => {
  const provider = createCoverProvider({ storage: () => undefined, search: () => Promise.reject(Error('offline')), imageLoads: () => Promise.resolve(true), fallback: () => Promise.resolve([{ coverUrl: 'https://books.google.com/cover.jpg', source: 'Google Books', sourceUrl: 'https://books.google.com/books?id=test' }]) });
  assert.equal((await provider.get(book())).source, 'Google Books');
});
Deno.test('malformed provider records and wrong titles/authors never become covers', async () => {
  let images = 0;
  const provider = createCoverProvider({ storage: () => undefined, search: () => Promise.resolve({ docs: [null, doc({ key: '//attacker.test' }), doc({ cover_i: -1 }), doc({ author_name: ['Different Author'] }), doc({ title: 'A different title' })] }), imageLoads: () => { images++; return Promise.resolve(true); } });
  assert.equal((await provider.get(book())).coverUrl, null); assert.equal(images, 0);
});
