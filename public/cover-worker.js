// Only cover images are cached: app releases and sheet reads stay on the network.
const CACHE_PREFIX = 'book-tracker:images:';
const CACHE_NAME = `${CACHE_PREFIX}${self.registration.scope}:v1`;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;
const SAVED_AT = 'x-book-tracker-cached-at';
const pending = new Map();

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const prefix = `${CACHE_PREFIX}${self.registration.scope}:`;
  for (const name of await caches.keys()) {
    if (name.startsWith(prefix) && name !== CACHE_NAME) await caches.delete(name);
  }
  await self.clients.claim();
})()));

async function loadCover(request) {
  let cache;
  try {
    cache = await caches.open(CACHE_NAME);
    const saved = await cache.match(request.url);
    if (saved) {
      const savedAt = Number(saved.headers.get(SAVED_AT));
      if (savedAt > 0 && Date.now() - savedAt < MAX_AGE) return saved;
      await cache.delete(request.url);
    }
  } catch { /* Private browsing/storage limits must not break images. */ }

  let response;
  try {
    // Readable responses let us reject HTTP errors and avoid opaque cache quota padding.
    response = await fetch(request, { mode: 'cors', credentials: 'omit' });
  } catch {
    // Some manually supplied Cover URLs disallow CORS. Display them normally;
    // opaque responses could hide a 404, so leave those to the browser HTTP cache.
    return fetch(request);
  }
  if (cache && response.status === 200 && response.headers.get('content-type')?.startsWith('image/')) {
    const headers = new Headers(response.headers);
    headers.set(SAVED_AT, String(Date.now()));
    try {
      await cache.put(request.url, new Response(response.clone().body, { status: 200, headers }));
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map(key => cache.delete(key)));
    } catch { /* A full cache must not prevent this download from displaying. */ }
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.destination !== 'image' || url.protocol !== 'https:' || url.origin === self.location.origin) return;
  let result = pending.get(request.url);
  if (!result) {
    result = loadCover(request);
    pending.set(request.url, result);
    // Clear both successful and failed requests so failures can be retried.
    result.then(() => pending.delete(request.url), () => pending.delete(request.url));
  }
  event.respondWith(result.then(response => response.clone()));
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'cover-failed' || typeof event.data.url !== 'string') return;
  event.waitUntil((async () => {
    try { await (await caches.open(CACHE_NAME)).delete(event.data.url); } catch { /* Storage unavailable. */ }
  })());
});
