let queue: Promise<unknown> = Promise.resolve();
let lastStart = 0;

// Cover searches and discovery share the same request budget in this browser tab.
export function openLibrarySearch(params: URLSearchParams): Promise<unknown> {
  const next = queue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastStart));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    lastStart = Date.now();
    const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
      signal: AbortSignal.timeout(12_000), credentials: 'omit',
    });
    if (!response.ok) throw new Error('Open Library is unavailable. Your sheet data is still available.');
    return response.json();
  });
  queue = next.catch(() => {});
  return next;
}
