import { normalizeText, normalizeTitle, type Book } from './books.ts';
import { buildSeries, type SeriesCatalog } from './series.ts';

export const categories = {
  romance: { label: 'Romance', query: 'subject:romance' },
  historical: { label: 'Historical romance', query: 'subject:romance AND subject:"historical fiction"' },
  contemporary: { label: 'Contemporary romance', query: 'subject:"contemporary romance"' },
  comedy: { label: 'Romantic comedy', query: 'subject:"romantic comedy"' },
} as const;
export type Category = keyof typeof categories;
export type DiscoveryBook = {
  title: string; author: string; workId: string; coverUrl: string;
  wantToRead: number; category?: Category; matchedAuthor?: string;
};
export type Recommendation = {
  key: string; title: string; author: string; coverUrl: string;
  reason: string; score: number; inTbr: boolean; sourceUrl: string | null;
  series?: string; number?: number; popularity?: number;
};
export const authorKey = (value: string) => normalizeText(value).replaceAll(' ', '');
export const bookKey = (book: { title: string; author: string }) => `${normalizeTitle(book.title)}|${authorKey(book.author)}`;

export function familiarAuthors(history: Book[]) {
  const authors = new Map<string, { author: string; count: number }>();
  const seen = new Set<string>();
  for (const book of history) {
    if (book.status !== 'Finished' || !book.author || seen.has(bookKey(book))) continue;
    seen.add(bookKey(book));
    const key = authorKey(book.author);
    const current = authors.get(key) ?? { author: book.author, count: 0 };
    current.count++;
    authors.set(key, current);
  }
  return [...authors.values()].sort((a, b) => b.count - a.count || a.author.localeCompare(b.author));
}

// Each lane has a distinct purpose. Earlier lanes own duplicates across recommendations;
// the separate TBR library still retains every original sheet row.
export function recommend(history: Book[], tbr: Book[], catalogs: SeriesCatalog[], discovery: DiscoveryBook[] = [], category: Category = 'romance') {
  const authors = new Map(familiarAuthors(history).map(a => [authorKey(a.author), a.count]));
  const blocked = new Set([...history, ...tbr].filter(b => b.status !== 'To read').map(bookKey));
  const onTbr = new Set(tbr.map(bookKey));
  const used = new Set<string>();
  const authorScore = (author: string) => Math.min(20, (authors.get(authorKey(author)) ?? 0) * 2);
  const select = (items: Recommendation[], limit = 6) => {
    const perAuthor = new Map<string, number>();
    return items.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).filter(item => {
      const author = authorKey(item.author);
      if (blocked.has(item.key) || used.has(item.key) || (author && (perAuthor.get(author) ?? 0) >= 2)) return false;
      if (limit <= 0) return false;
      limit--; used.add(item.key); perAuthor.set(author, (perAuthor.get(author) ?? 0) + 1);
      return true;
    });
  };
  const all = [...history, ...tbr].filter(b => normalizeText(b.series) !== 'series');
  const series = buildSeries(all, catalogs);
  const seriesCandidates: Recommendation[] = [];
  for (const group of series) {
    if (!group.catalog || !group.finished) continue;
    const next = group.slots.find(s => s.state !== 'Finished' && group.catalog!.books.some(b => b.title === s.title));
    if (!next || next.number === null || !['Not in sheet', 'To read'].includes(next.state)) continue;
    const key = bookKey({ title: next.title, author: group.author });
    seriesCandidates.push({ key, title: next.title, author: group.author,
      coverUrl: next.books[0]?.coverUrl ?? '', series: group.name, number: next.number,
      reason: `Book ${next.number} in ${group.name}; ${group.finished} finished${onTbr.has(key) ? ' · Already on your TBR' : ''}`,
      score: 100 + authorScore(group.author), inTbr: onTbr.has(key), sourceUrl: group.catalog.source });
  }
  const continueSeries = select(seriesCandidates);
  const fromTbr = select(tbr.map(book => ({ key: bookKey(book), title: book.title, author: book.author,
    coverUrl: book.coverUrl, reason: authors.has(authorKey(book.author)) ? `On your TBR · ${authors.get(authorKey(book.author))} finished by ${book.author}` : 'On your TBR',
    score: 60 + authorScore(book.author), inTbr: true, sourceUrl: null })));
  const external = discovery.filter(book => book.author && !onTbr.has(bookKey(book))).map(book => ({
    key: bookKey(book), title: book.title, author: book.author, coverUrl: book.coverUrl,
    reason: '', score: authorScore(book.author) + Math.min(10, Math.log10(1 + book.wantToRead) * 2),
    inTbr: false, sourceUrl: `https://openlibrary.org${book.workId}`, popularity: book.wantToRead,
    category: book.category, matchedAuthor: book.matchedAuthor,
  }));
  const moreByAuthors = select(external.filter(b => b.matchedAuthor && authorKey(b.matchedAuthor) === authorKey(b.author) && authors.has(authorKey(b.author)))
    .map(b => ({ ...b, reason: `You've finished ${authors.get(authorKey(b.author))} books by ${b.author}` })));
  const popularRomance = select(external.filter(b => b.category === category)
    .map(b => ({ ...b, reason: `${categories[category].label} · ${b.popularity.toLocaleString('en-US')} want-to-read listings on Open Library` })));
  return { continueSeries, fromTbr, moreByAuthors, popularRomance,
    numberGaps: series.flatMap(group => group.slots.filter(s => s.state === 'Number gap').map(s => ({ series: group.name, author: group.author, number: s.number }))) };
}
