import { matchScore, normalizeTitle, type Book, type Metadata } from '../../shared/books';
import { openLibrarySearch } from './open-library';

type Entry = Metadata & { expires: number };
type Document = { key: string; title: string; author_name?: string[]; cover_i?: number };
const empty: Metadata = { coverUrl: null, source: null, sourceUrl: null };
const keyFor = (b: Book) => `${normalizeTitle(b.title)}|${normalizeTitle(b.author)}`;
const memory = new Map<string, Entry>();
const pending = new Map<string, Promise<Metadata>>();
const waiting: { book: Book; resolve: (m: Metadata) => void }[] = [];
let working = false;

function read(key: string): Entry | null {
  try {
    const item = memory.get(key) || JSON.parse(localStorage.getItem(`book-tracker:cover:v1:${key}`) || 'null');
    if (item && item.expires > Date.now() && (item.coverUrl === null || /^https:\/\/(covers\.openlibrary\.org|books\.google\.com)\//.test(item.coverUrl))) return item;
  } catch { /* Ignore broken or unavailable storage. */ }
  return null;
}

function save(key: string, metadata: Metadata) {
  const entry = { ...metadata, expires: Date.now() + (metadata.coverUrl ? 30 : 1) * 86400_000 };
  memory.set(key, entry);
  try { localStorage.setItem(`book-tracker:cover:v1:${key}`, JSON.stringify(entry)); } catch { /* Storage is optional. */ }
}

function quoted(value: string) { return value.replace(/["\\]/g, ' '); }

async function googleFallback(book: Book): Promise<Metadata> {
  const apiKey = import.meta.env.PUBLIC_GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return empty;
  const params = new URLSearchParams({ q: `intitle:${normalizeTitle(book.title)} inauthor:${book.author}`, key: apiKey, maxResults: '5' });
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { signal: AbortSignal.timeout(8000), credentials: 'omit' });
  if (!response.ok) return empty;
  const data = await response.json();
  for (const item of data.items || []) {
    const info = item.volumeInfo;
    if (info && matchScore(book, info.title || '', info.authors || []) && info.imageLinks?.thumbnail) {
      const coverUrl = info.imageLinks.thumbnail.replace(/^http:/, 'https:');
      if (!/^https:\/\/books\.google\.com\//.test(coverUrl)) continue;
      return { coverUrl, source: 'Google Books', sourceUrl: `https://books.google.com/books?id=${encodeURIComponent(item.id)}` };
    }
  }
  return empty;
}

async function drain() {
  if (working) return;
  working = true;
  // Collect a viewport's requests into one search instead of a request per book.
  await new Promise(resolve => setTimeout(resolve, 100));
  while (waiting.length) {
    const batch = waiting.splice(0, 6);
    try {
      const q = batch.map(({ book }) => `(title:"${quoted(normalizeTitle(book.title))}" AND author:"${quoted(book.author)}")`).join(' OR ');
      const params = new URLSearchParams({ q, fields: 'key,title,author_name,cover_i', limit: '60' });
      const data = await openLibrarySearch(params) as { docs: Document[] };
      if (!Array.isArray(data.docs)) throw new Error('Invalid cover response');
      for (const { book, resolve } of batch) {
        const docs = (data.docs as Document[]).filter(d => d.cover_i && matchScore(book, d.title, d.author_name || []))
          .sort((a, b) => matchScore(book, b.title, b.author_name || []) - matchScore(book, a.title, a.author_name || []));
        const doc = docs[0];
        const metadata: Metadata = doc ? { coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg?default=false`, source: 'Open Library', sourceUrl: `https://openlibrary.org${doc.key}` } : await googleFallback(book).catch(() => empty);
        save(keyFor(book), metadata); resolve(metadata); pending.delete(keyFor(book));
      }
    } catch {
      for (const { book, resolve } of batch) { resolve(empty); pending.delete(keyFor(book)); }
    }
  }
  working = false;
}

export function getMetadata(book: Book): Promise<Metadata> {
  if (book.coverUrl) return Promise.resolve({ coverUrl: book.coverUrl, source: 'Sheet', sourceUrl: null });
  if (/^(\d{13}|\d{9}[\dXx])$/.test(book.isbn.replace(/[- ]/g, ''))) return Promise.resolve({ coverUrl: `https://covers.openlibrary.org/b/isbn/${book.isbn.replace(/[- ]/g, '')}-M.jpg?default=false`, source: 'Open Library', sourceUrl: `https://openlibrary.org/isbn/${book.isbn.replace(/[- ]/g, '')}` });
  const key = keyFor(book); const stored = read(key);
  if (stored) return Promise.resolve(stored);
  const existing = pending.get(key);
  if (existing) return existing;
  const promise = new Promise<Metadata>(resolve => { waiting.push({ book, resolve }); });
  pending.set(key, promise); void drain(); return promise;
}
