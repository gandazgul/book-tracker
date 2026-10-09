import Papa from 'papaparse';

export type Book = {
  id: string; row: number; title: string; author: string; series: string;
  number: string; platform: string; status: string; finished: string | null;
  rawDate: string; isbn: string; coverUrl: string;
  source?: 'read' | 'tbr'; notes?: string; format?: string; readAuthorBefore?: string;
};
export type Metadata = { coverUrl: string | null; source: 'Open Library' | 'Google Books' | 'Sheet' | null; sourceUrl: string | null };
export type Library = { books: Book[]; fetchedAt: string; stale: boolean; warning?: string; sheetUrl: string; issues: number };

export function parseDate(value: string): string | null {
  if (!value.trim()) return null;
  let year: number, month: number, day: number;
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const us = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (iso) [, year, month, day] = iso.map(Number);
  else if (us) { month = +us[1]; day = +us[2]; year = +us[3]; if (year < 100) year += 2000; }
  else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

const platformNames: Record<string, string> = { audible: 'Audible', hoopla: 'Hoopla', 'book orbit': 'Book Orbit', kindle: 'Kindle', kobo: 'Kobo', book: 'Book' };
const statusNames: Record<string, string> = { finished: 'Finished', unfinished: 'Unfinished', reading: 'Reading', 'currently reading': 'Reading', 'to read': 'To read', 'want to read': 'To read', dnf: 'Unfinished' };

export function safeImageUrl(value: string): string {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}

export function parseBooks(csv: string, source: 'read' | 'tbr' = 'read'): Book[] {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: 'greedy' });
  if (parsed.errors.length) throw new Error('The sheet could not be read as CSV. Check its formatting.');
  const [header, ...rows] = parsed.data;
  const columns = header?.map(v => v.replace(/^\uFEFF/, '').trim().toLowerCase()) ?? [];
  if (!columns.includes('title') || !columns.includes('author')) throw new Error('The sheet needs Title and Author columns. Check the selected tab and sharing settings.');
  const get = (row: string[], ...keys: string[]) => {
    for (const key of keys) { const i = columns.indexOf(key); if (i >= 0) return (row[i] ?? '').trim(); }
    return '';
  };
  return rows.flatMap((row, i) => {
    const title = get(row, 'title');
    if (!title) return [];
    const status = get(row, 'status'); const platform = get(row, 'platform');
    const rawDate = get(row, 'date finished');
    return [{ id: `${source === 'tbr' ? 'tbr-' : ''}row-${i + 2}`, row: i + 2, title, author: get(row, 'author'),
      series: get(row, 'series'), number: get(row, 'book #'), platform: platformNames[platform.toLowerCase()] ?? (platform || 'Not specified'),
      status: statusNames[status.toLowerCase()] ?? (status || (source === 'tbr' ? 'To read' : 'Not set')),
      finished: parseDate(rawDate), rawDate, isbn: get(row, 'isbn', 'isbn-13'),
      coverUrl: safeImageUrl(get(row, 'cover url', 'cover')), source,
      notes: get(row, 'notes'), format: get(row, 'method'), readAuthorBefore: get(row, 'have i read author before?') }];
  });
}

export function booksInYear(books: Book[], year: string) {
  return year === 'all' ? books : books.filter(b => b.finished?.startsWith(`${year}-`));
}

export function counts(values: string[]): [string, number][] {
  const grouped = new Map<string, number>();
  for (const value of values) grouped.set(value, (grouped.get(value) ?? 0) + 1);
  return [...grouped].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function readingStats(books: Book[]) {
  const finished = books.filter(b => b.status === 'Finished');
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i, count: 0 }));
  for (const book of finished) if (book.finished) months[Number(book.finished.slice(5, 7)) - 1].count++;
  return { finished: finished.length, authors: new Set(finished.map(b => b.author).filter(Boolean)).size,
    series: new Set(finished.map(b => b.series).filter(Boolean)).size,
    months, platforms: counts(finished.map(b => b.platform)),
    topAuthors: counts(finished.map(b => b.author).filter(Boolean)),
    missingDates: finished.filter(b => !b.finished).length };
}

export function normalizeText(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function normalizeTitle(value: string) {
  return normalizeText(value.replace(/-\s*\d+$/, '').split(':')[0]);
}

export function matchScore(book: Pick<Book, 'title' | 'author'>, title: string, authors: string[]) {
  const requested = normalizeTitle(book.title); const found = normalizeTitle(title);
  const tokens = new Set(requested.split(' ')); const other = new Set(found.split(' '));
  const overlap = [...tokens].filter(t => other.has(t)).length / Math.max(tokens.size, other.size);
  const author = normalizeTitle(book.author).replaceAll(' ', '');
  const authorMatch = !!author && authors.some(a => normalizeTitle(a).replaceAll(' ', '') === author);
  return authorMatch && (requested === found || overlap >= 0.85) ? overlap : 0;
}
