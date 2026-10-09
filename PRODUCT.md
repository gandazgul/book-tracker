# Book tracker

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The user's wife tracks her books in Google Sheets. This app lets her browse that collection and understand her reading habits.

## Product Purpose

A personal book library and reading statistics app, with the existing Google Sheet as its only source of reading records.

## Operating Context

Read from spreadsheet `11e9H7MEYZdOWZlKPdGITu-bvmHbw4N5szeoqd1Ordmk`, tab gid `0`. Its columns are Date Finished, Title, Author, Book #, Series, Platform, Status. It is currently readable without authentication. Never modify the source sheet.

Also read the second tab, TBR (`gid=576515270`), with Title, Author, Method, Series, Notes, and Have I read Author before? columns. Preserve all TBR rows in a separate section and keep them out of finished-reading stats. Blank TBR status means To read because of the explicit tab purpose.

## Capabilities and Constraints

- Read only. Books added or changed in the sheet appear after refresh.
- Covers come from external bibliographic metadata; uncertain matches remain placeholders.
- Statistics derive from actual sheet values. Missing status is unknown, never silently finished or to-read. Unfinished is not necessarily currently reading.
- Month-first dates are evidenced by source dates such as 09-30-26.
- Future in-app additions are explicitly outside this version.
- Series tracking must expose gaps. Use all-time reading history; distinguish number gaps inferred from the sheet from titles absent in a verified catalog. Never infer that an absent entry means the reader has not read it.
- Keep catalog numbering discrepancies visible without changing source values.
- Include a separate recommendations section: verified series continuations, selections from TBR, more books by familiar authors, and popular romance. The user explicitly identified romance as the primary preference. Offer historical, contemporary, and romantic-comedy categories without claiming they were inferred from sheet data.
- Explain every recommendation; exclude books already finished, reading, unfinished, or of unknown status. Deduplicate suggestions, retain the complete TBR library, and label external popularity as Open Library want-to-read counts.

## Stack

Deno + Astro with Tailwind CSS and React, explicitly selected by the user. Prefer static GitHub Pages deployment. Only if a backend is necessary, build a container locally with Podman and deploy through ../k8s-infrastructure.

## Confirmed Experience

Stats-first reading dashboard. Generate visual mockups before implementing the interface, as selected by the user. Palette and product name remain open.

The user approved the sidebar mockup shown third in chat, identified by the attached screenshot; its source file is `.impeccable/mocks/01-atlas.png`. Keep its lilac/berry palette, literary heading, left navigation, integrated totals, monthly chart, platforms, recent books, and author ranking. The user explicitly removed card subheadings and the lower-left quote.

All generated mockup author rankings, platform counts, and jacket art were illustrative and are not product data. Derive every count and author from the live sheet. Call the ranking “Most-read authors,” not “Favorite authors”: no favorites or ratings were supplied. Verified on 2026-10-09 for 2026: Mary Balogh 10, Julia Quinn 8, Kelsie Hoss 8, Willa Kay 4; B. K. Borison does not occur in the source. These are verification observations, never hardcoded UI values.

## Evidence on Hand

Live source sheet with dated entries from 2024–2026, series, platforms, and statuses. No rating, page count, start date, or reading goal has been supplied.

## Product Principles

- Preserve the sheet as the source of truth.
- Make incomplete data visible rather than inventing facts.
- Keep browsing useful if cover providers fail.
- Refresh independently of slower cover lookups.
