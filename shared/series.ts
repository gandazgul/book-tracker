import { normalizeTitle, type Book } from './books.ts';

export type CatalogBook = { number: number; title: string; aliases?: string[] };
export type SeriesCatalog = {
  name: string; author: string; aliases?: string[]; source: string; checkedAt: string;
  scope: string; books: CatalogBook[];
};
export type SeriesSlot = {
  number: number | null; title: string; books: Book[];
  state: 'Finished' | 'Not in sheet' | 'Number gap' | 'Unfinished' | 'Not set' | 'Reading' | 'To read' | string;
  numberConflict: boolean;
};
export type SeriesProgress = {
  key: string; name: string; author: string; books: Book[]; slots: SeriesSlot[];
  catalog?: SeriesCatalog; finished: number; missing: number; unknownNumber: number;
  complete: boolean; hasGaps: boolean; needsReview: boolean;
};

const identity = (value: string) => normalizeTitle(value).replace(/\band\b/g, '').replaceAll(' ', '');

export function bookNumber(book: Book): number | null {
  const value = book.number || book.title.match(/-\s*(\d+(?:\.\d+)?)$/)?.[1] || '';
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1000 ? n : null;
}

export function buildSeries(books: Book[], catalogs: SeriesCatalog[] = []): SeriesProgress[] {
  const grouped = new Map<string, Book[]>();
  for (const book of books) {
    if (!book.series) continue;
    const key = `${identity(book.series)}|${identity(book.author)}`;
    grouped.set(key, [...(grouped.get(key) || []), book]);
  }
  return [...grouped].map(([key, entries]) => {
    const { series: name, author } = entries[0];
    const catalog = catalogs.find(c => identity(c.author) === identity(author) && [c.name, ...(c.aliases || [])].some(n => identity(n) === identity(name)));
    const used = new Set<string>();
    const slots: SeriesSlot[] = [];
    if (catalog) {
      for (const expected of catalog.books) {
        // Match identities rather than trusting a number that could itself be wrong.
        // Search all rows: a read title still counts if its Series cell was left blank.
        const matches = books.filter(b => identity(b.author) === identity(catalog.author) && [expected.title, ...(expected.aliases || [])].some(t => identity(t) === identity(b.title)));
        matches.forEach(b => used.add(b.id));
        const finished = matches.some(b => b.status === 'Finished');
        slots.push({ number: expected.number, title: expected.title, books: matches,
          state: !matches.length ? 'Not in sheet' : finished ? 'Finished' : matches[0].status,
          numberConflict: matches.some(b => bookNumber(b) !== null && bookNumber(b) !== expected.number) });
      }
    }
    // Include every source row, even titles outside a known catalog.
    const remaining = entries.filter(b => !used.has(b.id));
    const unique = new Map<string, Book[]>();
    for (const book of remaining) {
      const titleKey = identity(book.title);
      unique.set(titleKey, [...(unique.get(titleKey) || []), book]);
    }
    for (const matches of unique.values()) slots.push({ number: bookNumber(matches[0]), title: matches[0].title, books: matches,
      state: matches.some(b => b.status === 'Finished') ? 'Finished' : matches[0].status, numberConflict: false });

    const unknownNumber = slots.filter(s => s.number === null).length;
    if (!catalog) {
      const numbers = new Set(slots.flatMap(s => s.number === null ? [] : [s.number]));
      const max = Math.floor(Math.max(0, ...numbers));
      for (let n = 1; n <= max; n++) if (!numbers.has(n)) slots.push({ number: n, title: `Book ${n}`, books: [], state: 'Number gap', numberConflict: false });
    }
    slots.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || a.title.localeCompare(b.title));
    const finished = slots.filter(s => s.state === 'Finished').length;
    const missing = slots.filter(s => !s.books.length).length;
    const complete = !!catalog && catalog.books.every(expected => slots.some(s => s.number === expected.number && s.state === 'Finished' && s.title === expected.title));
    return { key, name, author, books: entries, slots, catalog, finished, missing, unknownNumber, complete,
      hasGaps: missing > 0 || slots.some(s => s.state !== 'Finished'),
      needsReview: unknownNumber > 0 || slots.some(s => s.numberConflict || s.state === 'Not set') };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
