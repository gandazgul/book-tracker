import { parseDate, type Book } from './books.ts';

export type DateRange = { start: string; end: string };

export function dateRangeError({ start, end }: DateRange): string | null {
  if (!start || !end) return 'Choose a start and end date.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)
    || parseDate(start) !== start || parseDate(end) !== end) return 'Enter valid dates.';
  return start > end ? 'End date must be on or after start date.' : null;
}

export function booksInDateRange(books: Book[], range: DateRange): Book[] {
  if (dateRangeError(range)) return [];
  return books.filter(book => book.finished && book.finished >= range.start && book.finished <= range.end);
}

// Keep calendar months distinct across years; longer periods use annual totals.
export function rangeActivity(books: Book[], range: DateRange) {
  if (dateRangeError(range)) return { unit: 'month' as const, buckets: [] };
  const startYear = Number(range.start.slice(0, 4));
  const endYear = Number(range.end.slice(0, 4));
  const firstMonth = startYear * 12 + Number(range.start.slice(5, 7)) - 1;
  const lastMonth = endYear * 12 + Number(range.end.slice(5, 7)) - 1;
  const unit = lastMonth - firstMonth >= 24 ? 'year' : 'month';
  const counts = new Map<string, number>();
  for (const book of booksInDateRange(books, range)) {
    if (book.status !== 'Finished') continue;
    const key = book.finished!.slice(0, unit === 'year' ? 4 : 7);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const first = unit === 'year' ? startYear : firstMonth;
  const last = unit === 'year' ? endYear : lastMonth;
  const buckets = Array.from({ length: last - first + 1 }, (_, i) => {
    const index = first + i;
    const year = unit === 'year' ? index : Math.floor(index / 12);
    const key = unit === 'year' ? String(year).padStart(4, '0') : `${String(year).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`;
    const label = unit === 'year' ? String(year) : `${labels[index % 12]}${startYear !== endYear ? ` ${year}` : ''}`;
    return { key, label, count: counts.get(key) ?? 0 };
  });
  return { unit, buckets };
}
