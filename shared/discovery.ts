import { authorKey, categories, type Category, type DiscoveryBook } from './recommendations.ts';

export type DiscoveryQuery = { category: Category } | { author: string };
export function discoveryParams(query: DiscoveryQuery) {
  const clause = 'author' in query ? `author:"${query.author.replace(/["\\]/g, ' ')}"` : categories[query.category].query;
  return new URLSearchParams({ q: `(${clause}) AND language:eng`, sort: 'want_to_read',
    fields: 'key,title,author_name,cover_i,want_to_read_count', limit: '30' });
}
export function parseDiscovery(data: unknown, query: DiscoveryQuery): DiscoveryBook[] {
  if (!data || typeof data !== 'object' || !('docs' in data) || !Array.isArray(data.docs)) throw new Error('Invalid discovery response');
  return data.docs.flatMap((doc: unknown) => {
    if (!doc || typeof doc !== 'object') return [];
    const d = doc as Record<string, unknown>;
    if (typeof d.key !== 'string' || !/^\/works\/OL\d+W$/.test(d.key) || typeof d.title !== 'string' || !d.title.trim() || !Array.isArray(d.author_name)) return [];
    const authors = d.author_name.filter((a): a is string => typeof a === 'string' && !!a.trim());
    const author = 'author' in query ? authors.find(a => authorKey(a) === authorKey(query.author)) : authors[0];
    if (!author) return [];
    return [{ workId: d.key, title: d.title, author,
      coverUrl: typeof d.cover_i === 'number' && Number.isSafeInteger(d.cover_i) && d.cover_i > 0 ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg?default=false` : '',
      wantToRead: typeof d.want_to_read_count === 'number' && Number.isFinite(d.want_to_read_count) ? Math.max(0, d.want_to_read_count) : 0,
      ...('author' in query ? { matchedAuthor: query.author } : { category: query.category }),
    }];
  });
}
