import { parseBooks, readingStats, booksInYear } from '../shared/books.ts';
import { buildSeries } from '../shared/series.ts';
import { seriesCatalog } from '../src/data/series-catalog.ts';
import { recommend } from '../shared/recommendations.ts';

const response = await fetch('https://docs.google.com/spreadsheets/d/11e9H7MEYZdOWZlKPdGITu-bvmHbw4N5szeoqd1Ordmk/gviz/tq?tqx=out:csv&gid=0&headers=1', { signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`);
const books = parseBooks(await response.text());
const tbrResponse = await fetch('https://docs.google.com/spreadsheets/d/11e9H7MEYZdOWZlKPdGITu-bvmHbw4N5szeoqd1Ordmk/gviz/tq?tqx=out:csv&gid=576515270&headers=1', { signal: AbortSignal.timeout(15000) });
if (!tbrResponse.ok) throw new Error(`TBR returned ${tbrResponse.status}`);
const tbr = parseBooks(await tbrResponse.text(), 'tbr');
const recommendations = recommend(books, tbr, seriesCatalog);
const currentYear = String(new Date().getFullYear());
const series = buildSeries(books, seriesCatalog);
console.log(JSON.stringify({
  books: books.length,
  tbr: tbr.length,
  recommendations: { continueSeries: recommendations.continueSeries.map(b => b.title), fromTbr: recommendations.fromTbr.map(b => b.title) },
  year: currentYear,
  stats: readingStats(booksInYear(books, currentYear)),
  series: series.length,
  catalogued: series.filter(s => s.catalog).length,
  catalogMainBooksFinished: series.filter(s => s.complete).map(s => s.name),
  gaps: series.filter(s => s.hasGaps).map(s => ({ series: s.name, catalogued: !!s.catalog, missing: s.slots.filter(b => !b.books.length).map(b => ({ title: b.title, state: b.state })), numberingConflicts: s.slots.filter(b => b.numberConflict).map(b => b.title) })),
}, null, 2));
