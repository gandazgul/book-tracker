import { strict as assert } from 'node:assert';
import { runInNewContext } from 'node:vm';

const source = await Deno.readTextFile(new URL('../public/cover-worker.js', import.meta.url));
function worker(options: { failStorage?: boolean; fetch?: typeof fetch } = {}) {
  const entries = new Map<string, Response>();
  const handlers: Record<string, (event: any) => void> = {};
  let calls = 0, now = Date.now();
  const key = (request: Request | string) => typeof request === 'string' ? request : request.url;
  const cache = {
    match: (request: Request | string) => Promise.resolve(entries.get(key(request))?.clone()),
    put: (request: Request | string, response: Response) => { entries.set(key(request), response); return Promise.resolve(); },
    delete: (request: Request | string) => Promise.resolve(entries.delete(key(request))),
    keys: () => Promise.resolve([...entries.keys()].map(url => new Request(url))),
  };
  runInNewContext(source, {
    self: { registration: { scope: 'https://books.test/app/' }, location: { origin: 'https://books.test' }, addEventListener: (type: string, fn: any) => { handlers[type] = fn; } },
    caches: { open: () => options.failStorage ? Promise.reject(Error('storage denied')) : Promise.resolve(cache) },
    fetch: (...args: Parameters<typeof fetch>) => { calls++; return options.fetch ? options.fetch(...args) : Promise.resolve(new Response('image bytes', { headers: { 'content-type': 'image/jpeg' } })); },
    Date: { now: () => now }, URL, Headers, Response, Map, Promise,
  });
  return {
    entries, calls: () => calls, advance: (ms: number) => { now += ms; },
    request(url = 'https://covers.openlibrary.org/b/id/1-M.jpg', destination = 'image') {
      const request = new Request(url); Object.defineProperty(request, 'destination', { value: destination });
      let result: Promise<Response> | undefined;
      handlers.fetch({ request, respondWith: (promise: Promise<Response>) => { result = promise; } });
      return result;
    },
    forget(url: string) {
      let result: Promise<void> | undefined;
      handlers.message({ data: { type: 'cover-failed', url }, waitUntil: (promise: Promise<void>) => { result = promise; } });
      return result;
    },
  };
}
Deno.test('image cache returns repeat requests without fetching and shares simultaneous downloads', async () => {
  const sw = worker();
  const [a, b] = await Promise.all([sw.request(), sw.request()]);
  assert.equal(await a!.text(), 'image bytes'); assert.equal(await b!.text(), 'image bytes');
  assert.equal(sw.calls(), 1);
  assert.equal(await (await sw.request())!.text(), 'image bytes'); assert.equal(sw.calls(), 1);
});
Deno.test('image cache expires after 30 days and evicts decode failures', async () => {
  const sw = worker(); await sw.request(); sw.advance(31 * 24 * 60 * 60 * 1000);
  await sw.request(); assert.equal(sw.calls(), 2);
  await sw.forget('https://covers.openlibrary.org/b/id/1-M.jpg');
  await sw.request(); assert.equal(sw.calls(), 3);
});
Deno.test('image cache does not store HTTP errors or non-image responses', async () => {
  for (const response of [new Response('missing', { status: 404 }), new Response('error html', { headers: { 'content-type': 'text/html' } })]) {
    const sw = worker({ fetch: () => Promise.resolve(response.clone()) });
    await sw.request(); await sw.request(); assert.equal(sw.entries.size, 0); assert.equal(sw.calls(), 2);
  }
});
Deno.test('image cache bypasses sheet/API/app requests and same-origin assets', () => {
  const sw = worker();
  assert.equal(sw.request('https://docs.google.com/sheet', ''), undefined);
  assert.equal(sw.request('https://books.test/app/script.js', 'script'), undefined);
  assert.equal(sw.request('https://books.test/favicon.svg'), undefined);
  assert.equal(sw.calls(), 0);
});
Deno.test('unavailable storage and non-CORS hosts still load images without caching opaque failures', async () => {
  const denied = worker({ failStorage: true });
  assert.equal((await denied.request())!.status, 200); assert.equal(denied.calls(), 1);
  const noCors = worker({ fetch: (_request, init) => init?.mode === 'cors' ? Promise.reject(Error('CORS denied')) : Promise.resolve(new Response('normal image')) });
  assert.equal(await (await noCors.request())!.text(), 'normal image');
  assert.equal(noCors.entries.size, 0); assert.equal(noCors.calls(), 2);
});
Deno.test('image cache bounds storage to the newest 200 covers', async () => {
  const sw = worker();
  for (let i = 0; i < 202; i++) await sw.request(`https://covers.openlibrary.org/b/id/${i}-M.jpg`);
  assert.equal(sw.entries.size, 200);
  assert.equal(sw.entries.has('https://covers.openlibrary.org/b/id/0-M.jpg'), false);
  assert.equal(sw.entries.has('https://covers.openlibrary.org/b/id/201-M.jpg'), true);
});
