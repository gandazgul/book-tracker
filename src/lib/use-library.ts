import { useCallback, useEffect, useRef, useState } from 'react';
import type { Library } from '../../shared/books';
import { readReader, tbrReader } from './library';

export function useSheetData(reader: typeof readReader) {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller;
    setRefreshing(true);
    try {
      const next = await reader.fetch(controller.signal);
      if (!controller.signal.aborted) { setLibrary(next); setError(null); }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Could not refresh the sheet. Try again.');
        setLibrary(previous => previous ? { ...previous, stale: true } : null);
      }
    } finally {
      if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); }
      if (active.current === controller) active.current = null;
    }
  }, [reader]);

  useEffect(() => {
    const cached = reader.cached(); if (cached) { setLibrary(cached); setLoading(false); }
    void refresh();
    const check = () => { if (document.visibilityState === 'visible') void refresh(); };
    const interval = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
    return () => {
      clearInterval(interval); document.removeEventListener('visibilitychange', check); window.removeEventListener('online', check);
      active.current?.abort(); active.current = null;
    };
  }, [refresh, reader]);
  return { library, loading, refreshing, error, refresh };
}

export function useLibrary() {
  const history = useSheetData(readReader);
  const tbr = useSheetData(tbrReader);
  const refreshAll = useCallback(() => Promise.all([history.refresh(), tbr.refresh()]), [history.refresh, tbr.refresh]);
  return { ...history, tbr, refreshAll };
}
