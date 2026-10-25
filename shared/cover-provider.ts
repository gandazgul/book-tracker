import { type Book, type Metadata } from './books.ts';
import { coverMatchScore, coverSearchParams } from './cover-matching.ts';

type Entry = Metadata & { expires: number };
type CoverStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Dependencies = {
  search: (params: URLSearchParams) => Promise<unknown>;
  imageLoads: (url: string) => Promise<boolean>;
  fallback?: (book: Book) => Promise<Metadata[]>;
  storage: () => CoverStorage | undefined;
  now?: () => number;
};
const empty: Metadata = { coverUrl: null, source: null, sourceUrl: null };
const prefix = 'book-tracker:cover:v2:';
const keyFor = (b: Book) => JSON.stringify([b.title, b.author, b.isbn, b.coverUrl]);

export function createCoverProvider({ search, imageLoads, fallback, storage, now = Date.now }: Dependencies) {
  const memory = new Map<string, Entry>();
  const pending = new Map<string, Promise<Metadata>>();
  let generation = 0;
  let waiting: { book: Book; resolve: (docs: unknown[]) => void; reject: (error: unknown) => void }[] = [];
  let scheduled = false;
  const lookup = (book: Book) => new Promise<unknown[]>((resolve, reject) => {
    waiting.push({ book, resolve, reject });
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      const queued = waiting; waiting = [];
      for (let i = 0; i < queued.length; i += 6) {
        const batch = queued.slice(i, i + 6);
        void search(coverSearchParams(batch.map(item => item.book))).then(data => {
          const docs = (data as { docs?: unknown[] })?.docs;
          if (!Array.isArray(docs)) throw new Error('Invalid cover search response');
          batch.forEach(item => item.resolve(docs));
        }).catch(error => batch.forEach(item => item.reject(error)));
      }
    }, 100);
  });
  const read = (key: string): Entry | null => {
    try {
      const entry = memory.get(key) || JSON.parse(storage()?.getItem(prefix + key) || 'null');
      return entry && entry.expires > now() && (entry.coverUrl === null || /^https:\/\//.test(entry.coverUrl)) ? entry : null;
    } catch { return null; }
  };
  const save = (key: string, metadata: Metadata, started: number) => {
    if (started !== generation) return;
    const entry = { ...metadata, expires: now() + (metadata.coverUrl ? 30 * 86400_000 : 10 * 60_000) };
    memory.set(key, entry);
    // Only successful, loaded images survive reloads; catalog misses are briefly cached in memory.
    if (metadata.coverUrl) try { storage()?.setItem(prefix + key, JSON.stringify(entry)); } catch { /* Optional storage. */ }
  };
  async function resolve(book: Book): Promise<{ metadata: Metadata; cacheable: boolean }> {
    const tried = new Set<string>();
    let imageFailure = false, providerFailure = false;
    const usable = async (candidate: Metadata) => {
      const url = candidate.coverUrl;
      if (!url || !url.startsWith('https://') || tried.has(url)) return false;
      tried.add(url);
      const loaded = await imageLoads(url).catch(() => false);
      if (!loaded) imageFailure = true;
      return loaded;
    };
    const supplied: Metadata[] = [];
    if (book.coverUrl) supplied.push({ coverUrl: book.coverUrl, source: 'Sheet', sourceUrl: null });
    const isbn = book.isbn.replace(/[- ]/g, '');
    if (/^(\d{13}|\d{9}[\dXx])$/.test(isbn)) supplied.push({ coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`, source: 'Open Library', sourceUrl: `https://openlibrary.org/isbn/${isbn}` });
    for (const candidate of supplied) if (await usable(candidate)) return { metadata: candidate, cacheable: true };
    if (book.author.trim()) {
      try {
        const docs = await lookup(book);
        const candidates = docs.flatMap(value => {
          if (!value || typeof value !== 'object') return [];
          const doc = value as Record<string, unknown>;
          if (typeof doc.title !== 'string' || !Array.isArray(doc.author_name) || !Number.isSafeInteger(doc.cover_i) || Number(doc.cover_i) <= 0 || typeof doc.key !== 'string' || !/^\/works\/OL\d+W$/.test(doc.key)) return [];
          const score = coverMatchScore(book, doc.title, doc.author_name.filter((a): a is string => typeof a === 'string'));
          return score ? [{ score, coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg?default=false`, source: 'Open Library' as const, sourceUrl: `https://openlibrary.org${doc.key}` }] : [];
        }).sort((a, b) => b.score - a.score);
        const unique = [...new Map(candidates.map(c => [c.coverUrl, c])).values()].slice(0, 3);
        for (const candidate of unique) if (await usable(candidate)) return { metadata: candidate, cacheable: true };
      } catch { providerFailure = true; }
      if (fallback) try {
        for (const candidate of (await fallback(book)).slice(0, 3)) if (await usable(candidate)) return { metadata: candidate, cacheable: true };
      } catch { providerFailure = true; }
    }
    return { metadata: empty, cacheable: !imageFailure && !providerFailure };
  }
  return {
    get(book: Book): Promise<Metadata> {
      const key = keyFor(book), cached = read(key);
      if (cached) return Promise.resolve(cached);
      const existing = pending.get(key); if (existing) return existing;
      const started = generation;
      const promise = resolve(book).then(({ metadata, cacheable }) => {
        if (cacheable) save(key, metadata, started);
        return metadata;
      }).finally(() => { if (pending.get(key) === promise) pending.delete(key); });
      pending.set(key, promise); return promise;
    },
    invalidate(book: Book) {
      const key = keyFor(book); memory.delete(key);
      try { storage()?.removeItem(prefix + key); } catch { /* Optional storage. */ }
    },
    retryMissing() {
      generation++;
      for (const [key, entry] of memory) if (!entry.coverUrl) memory.delete(key);
      // Existing requests can finish, but cannot put stale misses back in this generation's cache.
      pending.clear();
    },
  };
}
