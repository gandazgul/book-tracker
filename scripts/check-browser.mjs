import { createServer } from 'node:http';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

// Test real cross-origin reads from a static localhost origin. No app route required.
const server = createServer((_, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>Connection check</title>'); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const sheet = await fetch('https://docs.google.com/spreadsheets/d/11e9H7MEYZdOWZlKPdGITu-bvmHbw4N5szeoqd1Ordmk/gviz/tq?tqx=out:csv&gid=0&headers=1', { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const csv = await sheet.text();
    const tbr = await fetch('https://docs.google.com/spreadsheets/d/11e9H7MEYZdOWZlKPdGITu-bvmHbw4N5szeoqd1Ordmk/gviz/tq?tqx=out:csv&gid=576515270&headers=1', { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const tbrCsv = await tbr.text();
    const books = await fetch('https://openlibrary.org/search.json?title=All%20the%20Feels&author=Olivia%20Dade&fields=key,title,author_name,cover_i&limit=3', { credentials: 'omit', signal: AbortSignal.timeout(15000) });
    const data = await books.json();
    const cover = data.docs.find(d => d.cover_i);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const discovery = await fetch('https://openlibrary.org/search.json?q=subject%3Aromance%20AND%20language%3Aeng&sort=want_to_read&fields=key,title,author_name,cover_i,want_to_read_count&limit=3', { credentials: 'omit', signal: AbortSignal.timeout(15000) });
    const suggestions = await discovery.json();
    return { sheetStatus: sheet.status, hasColumns: csv.includes('Date Finished') && csv.includes('Title'), lines: csv.split('\n').length,
      tbrStatus: tbr.status, tbrHasColumns: tbrCsv.includes('Method') && tbrCsv.includes('Notes'),
      metadataStatus: books.status, cover: cover?.cover_i, discoveryStatus: discovery.status,
      recommendations: suggestions.docs?.length, popularityAvailable: suggestions.docs?.some(d => d.want_to_read_count > 0) };
  });
  assert.equal(result.sheetStatus, 200);
  assert.ok(result.hasColumns);
  assert.equal(result.metadataStatus, 200);
  assert.ok(result.cover);
  assert.equal(result.tbrStatus, 200);
  assert.ok(result.tbrHasColumns);
  assert.equal(result.discoveryStatus, 200);
  assert.ok(result.recommendations);
  assert.ok(result.popularityAvailable);
  console.log(JSON.stringify({ ...result, result: 'Browser CORS reads passed for Google Sheets and Open Library' }, null, 2));
} finally {
  await browser?.close();
  server.close();
}
