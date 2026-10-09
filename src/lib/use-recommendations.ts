import { useEffect, useMemo, useState } from 'react';
import type { Book } from '../../shared/books';
import { familiarAuthors, recommend, type Category, type DiscoveryBook } from '../../shared/recommendations';
import { seriesCatalog } from '../data/series-catalog';
import { loadDiscovery } from './discovery';

// Call with the all-time history, independent of the dashboard's year filter.
export function useRecommendations(history: Book[], tbr: Book[], enabled = true) {
  const [category, setCategory] = useState<Category>('romance');
  const [revision, setRevision] = useState(0);
  const [remote, setRemote] = useState<{ books: DiscoveryBook[]; loading: boolean; errors: string[]; stale: boolean; fetchedAt: string | null }>({ books: [], loading: false, errors: [], stale: false, fetchedAt: null });
  const authorNames = JSON.stringify(familiarAuthors(history).slice(0, 3).map(a => a.author));
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setRemote(previous => ({ ...previous, loading: true, errors: [] }));
    const authors: string[] = JSON.parse(authorNames);
    void Promise.all([loadDiscovery({ category }, revision > 0), ...authors.map(author => loadDiscovery({ author }, revision > 0))]).then(results => {
      if (!active) return;
      const dates = results.flatMap(r => r.fetchedAt ? [r.fetchedAt] : []).sort();
      setRemote({ books: results.flatMap(r => r.books), loading: false,
        errors: [...new Set(results.flatMap(r => r.error ? [r.error] : []))],
        stale: results.some(r => r.stale), fetchedAt: dates[0] ?? null });
    });
    return () => { active = false; };
  }, [authorNames, category, enabled, revision]);
  const sections = useMemo(() => recommend(history, tbr, seriesCatalog, remote.books, category), [history, tbr, remote.books, category]);
  return { ...sections, category, setCategory, discovery: remote, refreshDiscovery: () => setRevision(v => v + 1) };
}
