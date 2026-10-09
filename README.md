# Between the Lines

A personal, read-only book tracker built with **Deno, Astro, React, and Tailwind CSS**. Google Sheets is the reading-history database. The app will read the sheet in the browser, so static GitHub Pages hosting is sufficient.

## Current status

The working dashboard implements the approved sidebar mockup (`.impeccable/mocks/01-atlas.png`, shown third in chat), using real sheet data. Card subheadings and the lower-left quote are removed as requested. Views include Overview, searchable Library, Series and gaps, the complete TBR, and recommendations. Author rankings are labeled **Most-read authors** and computed from explicitly finished entries for the selected year; they never use the mockup's illustrative names or imply favorite ratings. The production target is [books.dumbhome.uk](https://books.dumbhome.uk), hosted by GitHub Pages with Cloudflare DNS.

## Development

Use Deno 2.9.7 or newer. Deno manages npm dependencies and `deno.lock`; npm is not needed.

```sh
deno install --frozen --allow-scripts=npm:esbuild,npm:sharp
deno task test
deno task check
deno task dev
```

`deno task build` type-checks and generates the static `dist/` site. `deno task preview --port 4323` serves that build. `.env.example` documents optional build-time configuration. The default spreadsheet is already configured. `cookie` and `picomatch` are explicit dependencies because Astro's generated prerender entry imports them from the project root and Deno uses strict dependency resolution.

## Sheet data

Source: [the existing reading sheet](https://docs.google.com/spreadsheets/d/11e9H7MEYZdOWZlKPdGITu-bvmHbw4N5szeoqd1Ordmk/edit?gid=0).

Expected headers: `Date Finished`, `Title`, `Author`, `Book #`, `Series`, `Platform`, `Status`. Title and Author headers are required; columns may be reordered, and extra columns are ignored. Optional `ISBN` and `Cover URL` columns override automatic cover matching. None are added by the app.

The second tab, **TBR** (`gid=576515270`), is read independently. Its columns are `Title`, `Author`, `Method`, `Series`, `Notes`, and `Have I read Author before?`. Blank statuses on this tab default to `To read`; format and notes are preserved, and missing authors remain missing. The separate TBR library will show all entries, including any overlapping history records. Reading stats use the Read tab only. Each tab has its own cache, loading state, error, and refresh timestamp, so a TBR fetch failure cannot erase reading history. `useLibrary()` exposes history plus `tbr` and `refreshAll()` for the eventual dashboard.

- Reads the [Google Sheets visualization CSV endpoint](https://developers.google.com/chart/interactive/docs/spreadsheets). The supplied sheet currently allows anonymous viewing and cross-origin browser reads.
- Refreshes on load, every 60 seconds while visible, when returning to the tab, after reconnecting, and on manual refresh. Google may take a little time to expose recent edits.
- Stores the last successful CSV and timestamp locally in the browser. This is a cache, not another database; it can be cleared without losing source data. Refresh failures preserve the last-known data and set a stale flag.
- Reads only. No OAuth credentials, write scopes, or sheet mutation endpoints are used.
- Dates use `MM-DD-YY`, `MM/DD/YYYY`, or `YYYY-MM-DD` with calendar validation.
- Counts a book as finished only when its status says `Finished`. A blank status stays `Not set`; `Unfinished` is not assumed to mean currently reading. Platform whitespace and known spelling capitalization are normalized for display.
- Yearly statistics exclude entries without a valid finish date. All-time views retain those records. Each row counts as a reading entry; repeat reads count again in reading stats but do not inflate series progress.
- Public sheet access is required for this static architecture. If access becomes private, a server-side authenticated reader would be needed. Sharing settings are not changed by this app.

## Covers and metadata

1. An HTTPS `Cover URL` from the sheet, if supplied.
2. An ISBN cover from [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers), if supplied.
3. [Open Library Search API](https://openlibrary.org/dev/docs/api/search) matching title **and** author. Viewport requests are batched in groups of six; searches are spaced by at least 1.1 seconds. Successful cover results are cached in the browser for 30 days, confirmed misses for one day; failed requests are not cached as permanent misses.
4. Optional [Google Books API](https://developers.google.com/books/docs/v1/using) fallback with `PUBLIC_GOOGLE_BOOKS_API_KEY`. Keyless requests returned quota errors during live research. A browser-visible key must be restricted to Books API and the deployed site's HTTP referrer; it is not a server secret.

Missing or ambiguous matches use a title/author placeholder. Some recent indie titles have no matching Open Library record. A matching work's cover may be a different edition. No fabricated jacket artwork from the design mockups is used as bibliographic metadata. Source links are retained for attribution.

Open Library's [usage guidelines](https://openlibrary.org/developers/api) call for caching and low request rates. This is a low-volume personal library, not a bulk metadata mirror. Requests across separate browsers are not globally rate-limited.

## Series and gaps

`shared/series.ts` compares the full reading history, independent of the dashboard's selected year.

- **Number gap:** a missing integer between 1 and the highest number recorded in the sheet. This is an inferred position, not a verified missing title; unnumbered entries may account for it.
- **Not in sheet:** a specific book from a source-backed catalog is absent from all reading records. This does not assert it has never been read.
- **Not set / Unfinished / Reading / To read:** preserves the recorded status of an existing book.
- **Numbering conflict:** the title matches a verified catalog, but its sheet number differs. Both values are available; the sheet is untouched.
- **Main books finished:** only available when every main title in the catalog is explicitly marked finished. Companion books, novellas, and future releases are outside each catalog's stated scope.

Nine initial catalogs are recorded in `src/data/series-catalog.ts`, each with its source, verification date, and scope: Bridgerton, Blydon, Simply Quartet, Bedwyn Saga, The Hathaways, Wallflowers, Spoiler Alert, Harlot's Bay, and Black Tie Billionaires. Other series still group and detect number gaps automatically; their complete lineup is unknown. These bibliography snapshots do not automatically discover new releases. Add or update a catalog only after verifying an author/publisher source; reading-history updates never require a catalog change.

## Recommendations

`shared/recommendations.ts` provides a small deterministic scoring engine. `useRecommendations(allTimeHistory, tbr, enabled)` supplies its four sections, category selection, discovery loading/errors, stale state, oldest source timestamp, and manual discovery refresh. The dashboard starts external discovery when opening “For your next read” after initial sheet loading. No recommendation service or AI backend is required.

1. **Continue a series:** the earliest unfinished title in a verified catalog, provided the reader has finished a book in that series. Already queued books are marked as on TBR. Reading, unfinished, or unknown-status titles block advancing past that slot. Numeric gaps without a verified title remain separate reminders.
2. **From your TBR:** a shortlist of her own queued books, with a boost for authors she has finished before. This is separate from the full TBR library.
3. **More by authors you read:** Open Library searches for the top three authors by unique finished titles, requiring an exact normalized author match.
4. **Popular romance:** Open Library candidates for Romance (default), Historical romance, Contemporary romance, or Romantic comedy, ordered using its `want_to_read` signal. The label describes Open Library interest, not sales, current trends, or a bestseller list. Category coverage depends on the catalog's subject metadata.

Scores: series candidates start at 100, TBR at 60; familiar authors add 2 per unique finished title, capped at 20; external candidates add `2 × log10(1 + wantToReadCount)`, capped at 10. Scores order each section. Sections deduplicate in the order above, with up to six suggestions and two per author per section. External suggestions exclude all TBR titles, so books already queued stay in their own section. All lanes exclude books already in history unless explicitly `To read`, including finished, reading, unfinished, and unknown statuses. Title/author matching tolerates punctuation and numbered title suffixes but cannot reliably resolve source typos or pen-name aliases.

Each recommendation carries a reason and source link where available. No inferred spice preferences or ratings are invented. Searches cache for 24 hours, preserve stale results on failure, and share the cover provider's 1.1-second request spacing within a browser tab. Local TBR and series recommendations work even if Open Library fails. English-language searches are the initial default. This intentionally simple engine can later use explicit favorites, ratings, or more categories if she adds them.

References: [Open Library Search API](https://openlibrary.org/dev/docs/api/search), [Open Library search sort definitions](https://github.com/internetarchive/openlibrary/blob/master/openlibrary/plugins/worksearch/schemes/works.py), [content-based recommendation basics](https://developers.google.com/machine-learning/recommendation/content-based/basics).

## GitHub Pages

Repository: [gandazgul/book-tracker](https://github.com/gandazgul/book-tracker). The workflow `.github/workflows/pages.yml` installs locked dependencies, runs tests, builds for `https://books.dumbhome.uk` at `/`, and publishes `dist/` using GitHub’s official Pages actions. Pages uses **GitHub Actions** as its publishing source. The `public/CNAME` file preserves the custom domain in the artifact.

Optional repository variables: `PUBLIC_SHEET_ID`, `PUBLIC_SHEET_GID`, `PUBLIC_TBR_GID`, and a restricted `PUBLIC_GOOGLE_BOOKS_API_KEY`. The existing sheet works without variables or secrets.

Cloudflare DNS should contain a DNS-only CNAME for `books.dumbhome.uk` pointing to `gandazgul.github.io`; GitHub Pages manages the origin certificate and HTTPS enforcement. The custom domain must also be set in the repository’s Pages settings. No backend or Kubernetes deployment is needed. Each later commit requires a separate explicit user request.

References: [Astro + Deno](https://docs.deno.com/examples/astro_tutorial/), [Astro GitHub Pages](https://docs.astro.build/en/guides/deploy/github/), [Astro React](https://docs.astro.build/en/guides/integrations-guide/react/), [Astro Tailwind](https://docs.astro.build/en/guides/styling/#tailwind).

## Verification

`deno task test` covers calendar parsing, quoted CSV and invalid responses, missing statuses, year boundaries, search and sorting, cover identity matching, series gaps, incorrect numbering, rereads, unnumbered books, TBR schema and independent caches, recommendation exclusions and deduplication, author diversity, category selection, and external response validation.

Optional live diagnostics (not used in CI):

```sh
deno run --allow-net=docs.google.com --allow-read scripts/check-live.ts
deno run -A scripts/check-browser.mjs
deno task preview --port 4323
deno run -A scripts/check-ui.mjs
deno run -A scripts/check-resilience.mjs
```

The browser diagnostics use locally installed Google Chrome. `check-browser.mjs` verifies real CORS reads from a temporary static origin. `check-ui.mjs` checks the rendered app, filters, year selection, real author data, removed mockup copy, TBR, and mobile overflow, saving screenshots under `.impeccable/review/`. Its count assertions document the live sheet snapshot on October 9, 2026; update them if the sheet changes. `check-resilience.mjs` simulates failed discovery and offline sheet refresh, verifying retained local recommendations and saved stats. Set `APP_URL` to test another preview address. None of these diagnostics modify the sheet.

Visual review resolved the display-weight and mobile/control-legibility findings. The separate Impeccable pixel-comparison workflow remains at its hero gate: it still requires text the user explicitly removed and the mockup's illustrative jackets. The matching-viewport comparison and exception notes are retained under `.impeccable/`; no pixel-gate pass is claimed. The actual app, responsive layouts, unit tests, static build, Pages base-path build, and live/offline browser checks are complete.
