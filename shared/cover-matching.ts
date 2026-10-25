import { normalizeText, type Book } from './books.ts';

// Search with real punctuation; turning “it's” into “it s” breaks phrase queries.
export function coverSearchTitle(value: string) {
  return value.replace(/[’‘]/g, "'").replace(/-\s*\d+(?:\.\d+)?$/, '').trim();
}
const titleKey = (value: string) => normalizeText(value.replace(/['’‘]/g, '').replace(/&/g, ' and '));

function titleVariants(value: string) {
  const title = coverSearchTitle(value);
  const variants = [titleKey(title)];
  // Strip edition/series packaging, but never confuse a sequel, epilogue or box set with the book.
  const suffix = title.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (suffix && /\b(series|edition|paperback|hardcover|unabridged|audiobook)\b/i.test(suffix[2]) && !/\b(epilogue|sequel|collection|omnibus|boxed?|set|books)\b/i.test(suffix[2])) variants.push(titleKey(suffix[1]));
  const colon = title.indexOf(':');
  if (colon > 0 && !/\b(epilogue|sequel|collection|omnibus|boxed?|set|books|part|volume)\b/i.test(title.slice(colon + 1))) variants.push(titleKey(title.slice(0, colon)));
  return variants;
}

export function coverAuthorMatches(left: string, right: string) {
  const a = normalizeText(left).split(' ').filter(Boolean);
  const b = normalizeText(right).split(' ').filter(Boolean);
  if (!a.length || !b.length) return false;
  if (a.join('') === b.join('')) return true;
  if (a.length < 2 || b.length < 2 || a.at(-1) !== b.at(-1)) return false;
  const compatible = (x: string, y: string) => x === y || ((x.length === 1 || y.length === 1) && x[0] === y[0]);
  if (!compatible(a[0], b[0])) return false;
  const am = a.slice(1, -1), bm = b.slice(1, -1);
  // An omitted middle initial is fine; an omitted or conflicting full name is not.
  if (!am.length || !bm.length) return [...am, ...bm].every(t => t.length === 1);
  return am.length === bm.length && am.every((t, i) => compatible(t, bm[i]));
}

export function coverMatchScore(book: Pick<Book, 'title' | 'author'>, title: string, authors: string[]) {
  if (!authors.some(author => coverAuthorMatches(book.author, author))) return 0;
  const requested = titleVariants(book.title), found = titleVariants(title);
  if (requested[0] && requested[0] === found[0]) return 1;
  return requested.some(t => t && found.includes(t)) ? 0.95 : 0;
}

export function coverSearchParams(books: Pick<Book, 'title' | 'author'>[]) {
  const quote = (value: string) => value.replace(/["\\]/g, ' ');
  const q = books.map(book => {
    const surname = normalizeText(book.author).split(' ').at(-1) || '';
    return `(title:"${quote(coverSearchTitle(book.title))}"${surname ? ` AND author:"${quote(surname)}"` : ''})`;
  }).join(' OR ');
  return new URLSearchParams({ q, fields: 'key,title,author_name,cover_i', limit: '100' });
}
