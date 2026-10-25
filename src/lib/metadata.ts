import { type Book, type Metadata } from '../../shared/books';
import { coverMatchScore, coverSearchTitle } from '../../shared/cover-matching';
import { createCoverProvider } from '../../shared/cover-provider';
import { openLibrarySearch } from './open-library';
import { prepareCoverCache, forgetCachedCover } from './cover-cache';

// Image loading works across origins without requiring the cover host to allow fetch/CORS.
function imageLoads(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const image = new Image();
    const finish = (loaded: boolean) => {
      if (!loaded) forgetCachedCover(url);
      clearTimeout(timer); image.onload = null; image.onerror = null; resolve(loaded);
    };
    const timer = setTimeout(() => finish(false), 8000);
    image.onload = () => finish(image.naturalWidth > 1 && image.naturalHeight > 1);
    image.onerror = () => finish(false);
    image.src = url;
  });
}
async function googleFallback(book: Book): Promise<Metadata[]> {
  const apiKey = import.meta.env.PUBLIC_GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return [];
  const params = new URLSearchParams({ q: `intitle:${coverSearchTitle(book.title)} inauthor:${book.author}`, key: apiKey, maxResults: '5' });
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { signal: AbortSignal.timeout(8000), credentials: 'omit' });
  if (!response.ok) throw new Error('Google Books is unavailable');
  const data = await response.json();
  return (data.items || []).flatMap((item: { id: string; volumeInfo?: { title?: string; authors?: string[]; imageLinks?: { thumbnail?: string } } }) => {
    const info = item.volumeInfo;
    if (!info || !coverMatchScore(book, info.title || '', info.authors || []) || !info.imageLinks?.thumbnail) return [];
    const coverUrl = info.imageLinks.thumbnail.replace(/^http:/, 'https:');
    return /^https:\/\/books\.google\.com\//.test(coverUrl) ? [{ coverUrl, source: 'Google Books', sourceUrl: `https://books.google.com/books?id=${encodeURIComponent(item.id)}` }] : [];
  });
}
const provider = createCoverProvider({ search: openLibrarySearch, imageLoads, fallback: googleFallback, storage: () => localStorage });
export async function getMetadata(book: Book) {
  await prepareCoverCache();
  return provider.get(book);
}
export const invalidateMetadata = provider.invalidate;
let revision = 0;
const listeners = new Set<() => void>();
export const coverRevision = () => revision;
export function subscribeCovers(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function retryMissingCovers() { provider.retryMissing(); revision++; listeners.forEach(listener => listener()); }
