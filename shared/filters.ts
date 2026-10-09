import { booksInYear, normalizeText, type Book } from './books.ts';

export type BookFilters = { query?: string; year?: string; status?: string; platform?: string; author?: string; series?: string; sort?: 'recent' | 'oldest' | 'title' | 'author' };

export function filterBooks(books: Book[], filters: BookFilters = {}): Book[] {
  const terms = normalizeText(filters.query || '').split(' ').filter(Boolean);
  const filtered = booksInYear(books, filters.year || 'all').filter(book => {
    const searchable = normalizeText(`${book.title} ${book.author} ${book.series}`);
    return terms.every(term => searchable.includes(term))
      && (!filters.status || filters.status === 'all' || book.status === filters.status)
      && (!filters.platform || filters.platform === 'all' || book.platform === filters.platform)
      && (!filters.author || book.author === filters.author)
      && (!filters.series || book.series === filters.series);
  });
  return filtered.sort((a, b) => {
    if (filters.sort === 'title') return a.title.localeCompare(b.title);
    if (filters.sort === 'author') return a.author.localeCompare(b.author) || a.title.localeCompare(b.title);
    if (!a.finished && !b.finished) return b.row - a.row;
    if (!a.finished) return 1;
    if (!b.finished) return -1;
    return (filters.sort === 'oldest' ? a.finished.localeCompare(b.finished) : b.finished.localeCompare(a.finished)) || b.row - a.row;
  });
}

export function availableYears(books: Book[], currentYear = new Date().getFullYear()) {
  return [...new Set([String(currentYear), ...books.flatMap(b => b.finished ? [b.finished.slice(0, 4)] : [])])].sort().reverse();
}
