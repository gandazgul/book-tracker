import { discoveryParams, parseDiscovery, type DiscoveryQuery } from '../../shared/discovery';
import type { DiscoveryBook } from '../../shared/recommendations';
import { openLibrarySearch } from './open-library';

export type DiscoveryResult = { books: DiscoveryBook[]; fetchedAt: string | null; stale: boolean; error: string | null };
const pending = new Map<string, Promise<DiscoveryResult>>();
const memory = new Map<string, { data: unknown; fetchedAt: string }>();

export function loadDiscovery(query: DiscoveryQuery, force = false): Promise<DiscoveryResult> {
  const params = discoveryParams(query);
  const key = `book-tracker:discovery:v1:${params}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    let cached: DiscoveryResult | null = null;
    try {
      const saved = memory.get(key) ?? JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && Number.isFinite(Date.parse(saved.fetchedAt))) {
        cached = { books: parseDiscovery(saved.data, query), fetchedAt: saved.fetchedAt, stale: true, error: null };
        if (!force && Date.now() - Date.parse(saved.fetchedAt) < 86400_000) return { ...cached, stale: false };
      }
    } catch { /* Invalid or unavailable browser storage is ignored. */ }
    try {
      const data = await openLibrarySearch(params);
      const books = parseDiscovery(data, query);
      const fetchedAt = new Date().toISOString();
      memory.set(key, { data, fetchedAt });
      try { localStorage.setItem(key, JSON.stringify({ data, fetchedAt })); } catch { /* Optional cache. */ }
      return { books, fetchedAt, stale: false, error: null };
    } catch (cause) {
      return { books: cached?.books ?? [], fetchedAt: cached?.fetchedAt ?? null, stale: true,
        error: cause instanceof Error ? cause.message : 'Could not load book suggestions.' };
    }
  })();
  pending.set(key, request);
  void request.finally(() => pending.delete(key));
  return request;
}
