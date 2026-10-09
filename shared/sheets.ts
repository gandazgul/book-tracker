import { parseBooks, type Library } from './books.ts';

export type SheetSource = { id: string; gid: string; kind: 'read' | 'tbr'; label: string };
export type CacheStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function sheetLink(source: SheetSource) {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(source.id)}/edit?gid=${encodeURIComponent(source.gid)}`;
}

export function createSheetReader(source: SheetSource, storage: () => CacheStorage | undefined, fetcher: typeof fetch = fetch) {
  const key = `book-tracker:sheet:v2:${source.id}:${source.gid}:${source.kind}`;
  const parse = (csv: string, fetchedAt: string, stale = false): Library => {
    const books = parseBooks(csv, source.kind);
    return { books, fetchedAt, stale, sheetUrl: sheetLink(source),
      issues: books.filter(b => !b.author || b.status === 'Not set' || (b.rawDate && !b.finished) || (b.status === 'Finished' && !b.finished)).length };
  };
  return {
    cached(): Library | null {
      try {
        const saved = JSON.parse(storage()?.getItem(key) || 'null');
        return saved && typeof saved.csv === 'string' && typeof saved.fetchedAt === 'string' && Number.isFinite(Date.parse(saved.fetchedAt)) ? parse(saved.csv, saved.fetchedAt, true) : null;
      } catch { return null; }
    },
    async fetch(signal?: AbortSignal): Promise<Library> {
      const url = new URL(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(source.id)}/gviz/tq`);
      url.search = new URLSearchParams({ tqx: 'out:csv', gid: source.gid, headers: '1' }).toString();
      const timeout = AbortSignal.timeout(15_000);
      const response = await fetcher(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error(`${source.label} could not refresh. Check your connection and the sheet’s viewing access.`);
      const csv = await response.text(); const fetchedAt = new Date().toISOString();
      const result = parse(csv, fetchedAt);
      try { storage()?.setItem(key, JSON.stringify({ csv, fetchedAt })); } catch { /* Caching is optional. */ }
      return result;
    },
  };
}
