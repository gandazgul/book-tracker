import { useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, BookOpen, Check, Circle, ExternalLink, House, Layers, ListPlus, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { booksInYear, readingStats, type Book } from '../../shared/books';
import { availableYears, filterBooks, type BookFilters } from '../../shared/filters';
import { buildSeries } from '../../shared/series';
import { categories, type Category, type Recommendation } from '../../shared/recommendations';
import { seriesCatalog } from '../data/series-catalog';
import { sheetUrl, tbrUrl } from '../lib/library';
import { useLibrary } from '../lib/use-library';
import { useRecommendations } from '../lib/use-recommendations';
import BookCover from './BookCover';

type View = 'overview' | 'library' | 'series' | 'tbr' | 'recommendations';
const empty: Book[] = [];
const navigation = [{ id: 'overview', label: 'Overview', icon: House }, { id: 'library', label: 'Library', icon: BookOpen }, { id: 'series', label: 'Series', icon: Layers }, { id: 'tbr', label: 'To be read', icon: ListPlus }, { id: 'recommendations', label: 'For your next read', icon: Sparkles }] as const;
const titles: Record<View, string> = { overview: 'Your reading, at a glance.', library: 'A life in books.', series: 'The story continues.', tbr: 'Waiting in the wings.', recommendations: 'For your next read.' };
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));

function Panel({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><header className="panel-heading"><h2>{title}</h2>{action}</header>{children}</section>;
}
function Empty({ children }: { children: ReactNode }) { return <p className="empty-state">{children}</p>; }
function BookTile({ book, details = false }: { book: Book; details?: boolean }) {
  return <article className="book-tile"><BookCover book={book} /><h3>{book.title.replace(/-\s*\d+$/, '')}</h3><p className="book-author">{book.author || 'Author not listed'}</p>
    {details && <div className="book-details"><span className={`status ${book.status === 'Finished' ? 'finished' : ''}`}>{book.status}</span>
      {book.finished && <time dateTime={book.finished}>{dateLabel(book.finished)}</time>}
      {book.series && book.series !== 'Series' && <p>{book.series}{book.number ? ` · Book ${book.number}` : ''}</p>}
      <p>{book.format || book.platform}</p>{book.notes && <p className="book-note">{book.notes}</p>}</div>}
  </article>;
}
function Books({ books, details = false, compact = false }: { books: Book[]; details?: boolean; compact?: boolean }) {
  return books.length ? <div className={`book-grid ${compact ? 'compact' : ''}`}>{books.map(book => <BookTile key={book.id} book={book} details={details} />)}</div> : <Empty>No books here yet. Add a reading entry in the sheet and refresh.</Empty>;
}
function Activity({ books, year }: { books: Book[]; year: string }) {
  const months = readingStats(books).months;
  const max = Math.max(6, Math.ceil(Math.max(...months.map(m => m.count)) / 6) * 6);
  const now = new Date();
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return <div className="activity-chart" role="img" aria-label={`Books finished by month${year === 'all' ? ', combined across all years' : ` in ${year}`}: ${months.map((m, i) => `${labels[i]} ${m.count}`).join(', ')}`}>
    <div className="chart-scale" aria-hidden="true">{[3, 2, 1, 0].map(i => <span key={i}>{max * i / 3}</span>)}</div>
    <div className="chart-columns" aria-hidden="true">
    {months.map((month, i) => {
      const future = year === String(now.getFullYear()) && i > now.getMonth();
      const height = month.count / max * 100;
      const peak = month.count > 0 && month.count === Math.max(...months.map(m => m.count));
      return <div className="chart-column" key={i} title={`${labels[i]}: ${future ? 'Not yet reached' : `${month.count} books finished`}`}>
        <div className={`chart-bar ${peak ? 'peak' : ''}`} style={{ height: `${future ? 0 : height}%` }}><span>{future ? '—' : month.count}</span></div>
        <span className="chart-month">{labels[i]}</span></div>;
    })}
    </div>
  </div>;
}
function Ranking({ values, numbered = false, onSelect }: { values: [string, number][]; numbered?: boolean; onSelect?: (name: string) => void }) {
  const max = values[0]?.[1] || 1;
  if (!values.length) return <Empty>No finished books in this period yet.</Empty>;
  return <ol className={`rankings ${numbered ? 'numbered' : ''}`}>{values.map(([name, count], i) => <li key={name}>
    {numbered && <span className="rank-number">{i + 1}</span>}
    {onSelect ? <button className="rank-name" onClick={() => onSelect(name)}>{name}</button> : <span className="rank-name">{name}</span>}
    <span className="rank-track" aria-hidden="true"><span style={{ width: `${count / max * 100}%` }} /></span><span className="rank-count">{count}</span>
  </li>)}</ol>;
}
function RecommendationLane({ title, items }: { title: string; items: Recommendation[] }) {
  return <Panel title={title}>{items.length ? <div className="recommendation-list">{items.map(item => <article key={item.key}>
    <div><h3>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.title}<ExternalLink size={13} aria-hidden="true" /></a> : item.title}</h3><p className="book-author">{item.author || 'Author not listed'}</p><p className="recommendation-reason">{item.reason}</p></div>
    {item.inTbr && <span className="status">On TBR</span>}
  </article>)}</div> : <Empty>No matches yet. Suggestions update as your reading list grows.</Empty>}</Panel>;
}

export default function Dashboard() {
  const source = useLibrary();
  const books = source.library?.books ?? empty;
  const tbr = source.tbr.library?.books ?? empty;
  const [view, setView] = useState<View>('overview');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<BookFilters['sort']>('recent');
  const [author, setAuthor] = useState('');
  const [gapsOnly, setGapsOnly] = useState(false);
  const [showAllAuthors, setShowAllAuthors] = useState(false);
  const selectedBooks = useMemo(() => booksInYear(books, year), [books, year]);
  const stats = useMemo(() => readingStats(selectedBooks), [selectedBooks]);
  const recent = useMemo(() => filterBooks(selectedBooks, { status: 'Finished' }).slice(0, 4), [selectedBooks]);
  const series = useMemo(() => buildSeries([...books, ...tbr.filter(b => b.series !== 'Series')], seriesCatalog), [books, tbr]);
  const recommendations = useRecommendations(books, tbr, view === 'recommendations' && !source.loading && !source.tbr.loading);
  const visibleBooks = filterBooks(view === 'tbr' ? tbr : books, { query, status: view === 'tbr' ? 'all' : status, sort, author });
  const navigate = (next: View) => { setView(next); setQuery(''); setAuthor(''); setStatus('all'); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const viewAuthor = (name: string) => { navigate('library'); setAuthor(name); setStatus('Finished'); };
  const stale = source.library?.stale || source.tbr.library?.stale;
  const errors = [source.error && `Reading history: ${source.error}`, source.tbr.error && `To be read: ${source.tbr.error}`].filter(Boolean);
  const ready = !!source.library;
  const connected = ready && !!source.tbr.library && !stale && !errors.length;

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar"><a className="brand" href="#overview" onClick={event => { event.preventDefault(); navigate('overview'); }}>Between<br /> the Lines</a>
      <nav aria-label="Main navigation">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={21} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span>{id === 'tbr' && source.tbr.library && <span className="nav-count">{tbr.length}</span>}</button>)}</nav>
      <div className="sidebar-tools"><a href={sheetUrl} target="_blank" rel="noreferrer"><ExternalLink size={19} aria-hidden="true" />Open sheet</a><button onClick={() => void source.refreshAll()} disabled={source.refreshing || source.tbr.refreshing}><RefreshCw size={19} className={source.refreshing || source.tbr.refreshing ? 'refreshing' : ''} aria-hidden="true" />{source.refreshing || source.tbr.refreshing ? 'Refreshing…' : 'Refresh'}</button>
        <p className={`connection ${connected ? 'connected' : ''}`} role="status"><span />{connected ? 'Connected to Google Sheets' : stale ? 'Showing saved sheet data' : errors.length ? 'Sheet connection issue' : 'Connecting to your sheet…'}</p></div>
    </aside>
    <main id="main" tabIndex={-1}>
      <header className="page-heading"><h1>{titles[view]}</h1>{view === 'overview' && <label className="year-select"><span className="sr-only">Reading year</span><select value={year} onChange={event => setYear(event.target.value)}>{availableYears(books).map(value => <option key={value}>{value}</option>)}<option value="all">All time</option></select></label>}</header>
      {!!errors.length && <div className="notice" role="alert">{errors.map(error => <p key={String(error)}>{error}</p>)}<button className="text-link" onClick={() => void source.refreshAll()}>Try again <RefreshCw size={14} /></button></div>}
      {source.loading && !ready && <div className="loading-state" role="status">Loading your reading life…<div className="loading-lines"><span /><span /><span /></div></div>}
      {!source.loading && !ready && <Empty>Your reading history couldn’t load. Check that the sheet is viewable, then use Refresh.</Empty>}
      {(ready || (view === 'tbr' && source.tbr.library)) && <>
        {view === 'overview' && <>
          <div className="summary" aria-label={`Reading totals for ${year}`}><div><strong>{stats.finished}</strong><span>books finished</span></div><div><strong>{stats.authors}</strong><span>authors</span></div><div><strong>{stats.series}</strong><span>series</span></div></div>
          <div className="overview-charts"><Panel title="Reading activity"><Activity books={selectedBooks} year={year} />{year === 'all' && <p className="data-note">Months combine all years.</p>}</Panel><Panel title="Where you read"><Ranking values={stats.platforms} /></Panel></div>
          <div className="overview-lists"><Panel title="Recently finished" action={<button className="text-link" onClick={() => navigate('library')}>View library <ArrowRight size={15} /></button>}><Books books={recent} compact /></Panel>
            <Panel title="Most-read authors" action={<button className="text-link" onClick={() => setShowAllAuthors(value => !value)}>{showAllAuthors ? 'Show less' : 'View all'} <ArrowRight size={15} /></button>}><Ranking values={showAllAuthors ? stats.topAuthors : stats.topAuthors.slice(0, 5)} numbered onSelect={viewAuthor} /></Panel></div>
          <div className="overview-extras"><Panel title={`To be read${source.tbr.library ? ` · ${tbr.length}` : ''}`} action={<button className="text-link" onClick={() => navigate('tbr')}>View TBR <ArrowRight size={15} /></button>}>{source.tbr.loading ? <Empty>Loading your TBR list…</Empty> : !source.tbr.library ? <Empty>The TBR tab is unavailable. Try Refresh.</Empty> : <ul className="reading-list">{tbr.slice(0, 4).map(book => <li key={book.id}><span>{book.title}</span><span>{book.author || 'Author not listed'}</span></li>)}</ul>}</Panel>
            <Panel title="Keep the story going" action={<button className="text-link" onClick={() => navigate('recommendations')}>Explore <ArrowRight size={15} /></button>}>{recommendations.continueSeries.length ? <ul className="reading-list">{recommendations.continueSeries.slice(0, 3).map(item => <li key={item.key}><span>{item.title}</span><span>{item.series} · Book {item.number}</span></li>)}</ul> : <Empty>Your next read could already be on your TBR. Explore suggestions based on your reading.</Empty>}</Panel></div>
          {stats.missingDates > 0 && <p className="data-note">{stats.missingDates} finished entries have no valid date and appear only in All time.</p>}
        </>}
        {(view === 'library' || view === 'tbr') && <>
          <div className="toolbar"><label className="search-field"><Search size={18} aria-hidden="true" /><span className="sr-only">Search books</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, author or series" /></label>
            {view === 'library' && <label><span className="sr-only">Reading status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{[...new Set(books.map(b => b.status))].sort().map(value => <option key={value}>{value}</option>)}</select></label>}
            <label><span className="sr-only">Sort books</span><select value={sort} onChange={event => setSort(event.target.value as BookFilters['sort'])}><option value="recent">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="author">Author A–Z</option></select></label>
          </div>
          <div className="results-line"><p>{visibleBooks.length} {visibleBooks.length === 1 ? 'book' : 'books'}{view === 'library' ? ' · All years' : ' on your TBR'}</p>{author && <button className="filter-chip" onClick={() => setAuthor('')}>{author}<X size={15} aria-label="Clear author filter" /></button>}{view === 'tbr' && <a className="text-link" href={tbrUrl} target="_blank" rel="noreferrer">Open TBR sheet <ExternalLink size={14} /></a>}</div>
          {view === 'tbr' && !source.tbr.library ? <Empty>{source.tbr.loading ? 'Loading your TBR…' : 'Your TBR tab couldn’t load. Try Refresh.'}</Empty> : visibleBooks.length ? <Books books={visibleBooks} details /> : <Empty>{query || author || status !== 'all' ? 'No books match these filters. Try a different search or clear the filters.' : 'Add books to the sheet to see them here.'}</Empty>}
        </>}
        {view === 'series' && <><div className="toolbar"><label className="search-field"><Search size={18} aria-hidden="true" /><span className="sr-only">Search series</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search series or author" /></label><label className="checkbox-label"><input type="checkbox" checked={gapsOnly} onChange={event => setGapsOnly(event.target.checked)} />With gaps or books to finish</label></div>
          <p className="results-line">Series progress uses all years and your TBR.</p><div className="series-grid">{series.filter(group => (!gapsOnly || group.hasGaps) && `${group.name} ${group.author}`.toLowerCase().includes(query.toLowerCase())).map(group => <Panel key={group.key} title={group.name} action={<span className={`status ${group.complete ? 'finished' : ''}`}>{group.complete ? 'Main books finished' : `${group.finished} finished`}</span>}>
            <p className="series-author">{group.author}</p><ol className="series-slots">{group.slots.map((slot, i) => <li key={`${slot.title}-${i}`}><span className={slot.state === 'Finished' ? 'slot-icon done' : 'slot-icon'}>{slot.state === 'Finished' ? <Check size={16} aria-label="Finished" /> : <Circle size={14} aria-hidden="true" />}</span><div><strong>{slot.number !== null && <span className="volume-number">{slot.number}. </span>}{slot.title}</strong><p>{slot.state === 'Number gap' ? 'Number gap · title not verified' : slot.state === 'Not in sheet' ? 'Not in either sheet tab' : slot.state}{slot.numberConflict ? ' · Sheet numbering differs from catalog' : ''}</p></div></li>)}</ol>
            {group.catalog ? <a className="text-link catalog-link" href={group.catalog.source} target="_blank" rel="noreferrer">Verified main-book catalog <ExternalLink size={13} /></a> : <p className="data-note">Full series list not yet verified.{group.unknownNumber > 0 ? ` ${group.unknownNumber} titles have no book number.` : ''}</p>}
          </Panel>)}</div>{!series.some(group => (!gapsOnly || group.hasGaps) && `${group.name} ${group.author}`.toLowerCase().includes(query.toLowerCase())) && <Empty>No series match. Try clearing your search or the gaps filter.</Empty>}</>}
        {view === 'recommendations' && <><div className="toolbar"><label className="category-select">Explore <select value={recommendations.category} onChange={event => recommendations.setCategory(event.target.value as Category)}>{Object.entries(categories).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}</select></label><button className="text-link" onClick={recommendations.refreshDiscovery} disabled={recommendations.discovery.loading}><RefreshCw size={15} />Refresh suggestions</button></div>
          {recommendations.discovery.loading && <p role="status" className="data-note">Finding books on Open Library… Your TBR and series picks are ready below.</p>}
          {!!recommendations.discovery.errors.length && <p role="status" className="notice">Open Library suggestions couldn’t refresh. {recommendations.discovery.stale ? 'Showing any saved suggestions.' : ''} Your TBR and series picks are still available.</p>}
          <div className="recommendations-grid"><RecommendationLane title="Continue a series" items={recommendations.continueSeries} /><RecommendationLane title="From your TBR" items={recommendations.fromTbr} /><RecommendationLane title="More by authors you read" items={recommendations.moreByAuthors} /><RecommendationLane title={`Popular ${categories[recommendations.category].label.toLowerCase()}`} items={recommendations.popularRomance} /></div>
          {recommendations.numberGaps.length > 0 && <Panel title="Series gaps to check"><ul className="reading-list">{recommendations.numberGaps.map((gap, i) => <li key={i}><span>{gap.series} · Book {gap.number}</span><span>Title not yet verified</span></li>)}</ul></Panel>}
          <details className="how-it-works"><summary>How these suggestions are chosen</summary><p>We start with verified series gaps and your TBR, then look for books by authors you’ve finished and romance titles with interest on Open Library. Finished, reading, unfinished, and unknown-status history entries are excluded. Reading frequency suggests familiarity, not a favorite rating. Popularity reflects Open Library want-to-read lists, not sales or current bestseller charts.</p><p>Each section includes up to two books per author. Suggestions aren’t added to your sheet.</p></details>
        </>}
      </>}
      {source.library && <footer className="page-footer"><span>Read-only · Updates from your Google Sheet</span><span>History refreshed {new Date(source.library.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{source.library.stale ? ' · Saved copy' : ''}</span></footer>}
    </main>
  </div>;
}
