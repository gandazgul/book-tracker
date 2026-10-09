---
name: Between the Lines
description: A literary lilac-and-berry reading dashboard grounded in the reader’s own library.
colors:
  berry: "#814664"
  paper: "#f5f2f7"
  ink: "#2c2032"
  muted: "#6c6173"
  line: "#ded6e3"
  surface: "#fdfcfe"
  sidebar: "#ede7f0"
  bar: "#a16b8c"
  peak: "#5b3055"
  active: "#dfd1e2"
  active-text: "#663451"
  nav-hover: "#e5dbe9"
  field-border: "#cfc4d6"
  rank-track: "#efebf3"
  rank-fill: "#95607f"
  sage: "#527354"
  finished-bg: "#e9efe8"
  finished-text: "#436343"
  status-bg: "#eee7f0"
  status-text: "#6b4264"
  filter-bg: "#e8daea"
  cover-bg: "#e5dae5"
  cover-text: "#64445e"
  cover-border: "#c5b0c5"
  link-hover: "#512840"
typography:
  brand:
    fontFamily: "Literata Variable, Georgia, serif"
    fontSize: "37px"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Literata Variable, Georgia, serif"
    fontSize: "42px"
    fontWeight: 500
    lineHeight: 1.22
    letterSpacing: "-0.035em"
  statistic:
    fontFamily: "Literata Variable, Georgia, serif"
    fontSize: "53px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "18px"
    fontWeight: 750
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  navigation:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "16px"
    fontWeight: 500
  book-title:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 750
    lineHeight: 1.45
  label:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  status: "4px"
  cover: "5px"
  navigation: "6px"
  field: "8px"
  panel: "12px"
spacing:
  compact: "8px"
  control-gap: "12px"
  panel-gap: "16px"
  mobile-panel: "18px"
  narrow-panel: "20px"
  panel: "24px"
  main: "28px"
components:
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.berry}"
    padding: "2px 0"
  button-text-hover:
    textColor: "{colors.link-hover}"
  navigation:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.navigation}"
    rounded: "{rounded.navigation}"
    padding: "13px 14px"
  navigation-active:
    backgroundColor: "{colors.active}"
    textColor: "{colors.active-text}"
    rounded: "{rounded.navigation}"
  input-search:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "9px 13px 9px 42px"
  filter-chip:
    backgroundColor: "{colors.filter-bg}"
    textColor: "{colors.status-text}"
    rounded: "{rounded.cover}"
    padding: "5px 9px"
  status:
    backgroundColor: "{colors.status-bg}"
    textColor: "{colors.status-text}"
    rounded: "{rounded.status}"
    padding: "3px 8px"
  status-finished:
    backgroundColor: "{colors.finished-bg}"
    textColor: "{colors.finished-text}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "22px 24px 24px"
  cover-placeholder:
    backgroundColor: "{colors.cover-bg}"
    textColor: "{colors.cover-text}"
    rounded: "{rounded.cover}"
    padding: "15px 10px"
---

# Design System: Between the Lines

## Overview

**Creative North Star: "Between the Lines"**

A personal reading atlas, grounded in the approved lilac-and-berry sidebar design. Literary headings give the reader’s collection warmth; compact, clear controls and visible quantities keep everyday browsing practical.

The visual hierarchy moves from the page title to integrated totals and then quiet white panels. Covers provide the imagery; reading records, author rankings, and chart values come from the actual sheet. The approved design removes decorative card subheadings and the sidebar quotation.

**Key Characteristics:**

- Pale lilac ground and sidebar with berry data accents.
- Literata headings paired with Manrope controls and metadata.
- Flat white panels, restrained rounding, and fine separators.
- Real book covers with readable title-and-author fallbacks.

## Colors

Muted berry accents sit on cool lilac neutrals, with sage reserved for completion and connection states. The frontmatter records the reused source values; the sidecar’s generated tonal ramps are exploration metadata, not additional implemented palette tokens.

### Primary

- **Berry:** links, focus outlines, checkbox selection, and large reading totals.
- **Dusty berry / deep plum:** monthly bars and peak-month emphasis.
- **Rank berry:** horizontal author and platform bars against a pale lavender track.

### Secondary

- **Sage:** connected status indicators and finished-book states; the paired finished surface and text retain a clear semantic distinction from berry.

### Neutral

- **Lilac paper:** the page ground; **lilac sidebar:** navigation’s distinct tonal region.
- **Soft white:** panel surfaces, without a shadow or enclosing border.
- **Plum ink / muted plum:** primary text and secondary metadata.
- **Pale lavender line:** section separators; field borders are slightly stronger.
- **Selected lilac / active plum:** current navigation; hover lilac is a separate transient state.
- **Cover lilac:** a calm title-and-author fallback when cover metadata is unavailable.

## Typography

**Display Font:** Literata Variable, with Georgia and serif fallbacks.

**Body Font:** Manrope Variable, with a sans-serif fallback.

Literata gives the brand, page headings, and reading totals a literary character. Manrope keeps the supporting interface compact and legible. There is no separate monospace face or uppercase eyebrow vocabulary.

### Hierarchy

- **Brand and headline:** the final source override uses weight 500. The frontmatter records standard desktop sizes; larger desktop sizes are 41px and 47px, narrow desktop sizes 32px and 34px, and mobile sizes 26px and 29px.
- **Statistics:** weight 600 with lining, tabular numerals. The standard size is 53px, increasing to 60px on large desktops and reducing to 45px on narrow desktops and 37px on mobile.
- **Panel titles:** Manrope weight 750, 18px desktop and 16px mobile.
- **Body and book titles:** 14px; book titles use weight 750 while metadata is lighter. Author text is 13px and book details 12px.
- **Navigation:** 16px standard desktop, 14px at the narrow-desktop breakpoint, and 13px mobile. Selected navigation uses weight 700.
- **Chart month labels and scale:** 12px desktop and 11px mobile. Keep all twelve months visible.

**The Open Serif Rule.** Preserve weight 500 for the brand and page heading; the heavier earlier declarations are superseded by the final stylesheet override.

## Layout

The desktop shell has a sticky, full-height sidebar and a flexible main area. Its standard sidebar width is 238px, growing to 255px at 1500px and shrinking to 200px at 1190px. Main content is centered within a maximum width of 1620px, with 28px horizontal padding on standard desktops, 22px on narrower desktops, and 16px on mobile.

The overview uses three integrated totals, divided by fine vertical lines, above a two-column panel layout. Chart columns use a 1.83:1 ratio and recent-reading/author panels a 1.3:1 ratio at standard desktop width. Panel gaps are 16px. These are the implemented overview composition, not required proportions for every future view.

At 960px and below, overview panels, series panels, and recommendation lanes stack. At 700px and below, the sidebar becomes a normal-flow header; navigation becomes a three-column, two-row grid, with the last item spanning two columns. Totals remain three across, with number and label stacked. Compact cover grids change from four columns to two; the full library uses auto-filled minimum-150px columns on desktop and two columns on mobile.

There is no strict modular spacing scale in the source. Reuse the recorded control gaps and panel padding instead of inventing one. Panels use 22px top and 24px side/bottom padding, reducing to 20px on narrow desktops and 18px on mobile. Library, Series, To be read, and recommendations retain their own complete views within the same shell.

## Elevation & Depth

Depth comes from tonal layering: lilac ground, slightly deeper sidebar, and soft-white panels. Panels have no box shadow and no perimeter border. Fine lines divide page headings, metric groups, and list rows. There is no blur, glass effect, or decorative lift on hover.

**The Tonal Surface Rule.** Distinguish the existing surfaces with their background tones and separators, preserving the flat panel treatment.

## Shapes

Panels have the broadest corners; fields are slightly tighter, followed by navigation, covers, and status labels. Use the role-specific radii in the frontmatter. Cover slots hold a 2:3 aspect ratio and clip loaded images with object-fit cover. Vertical bars have barely rounded top corners; ranking tracks have small rounded ends. Connection indicators and completed-series icons are circular semantic marks.

## Components

### Buttons

Actions are quiet text controls. Text buttons use berry, a transparent background, a compact icon gap, and an underlined darker hover state. Sidebar tools combine a line icon with a text label. No filled primary call-to-action component is established. Disabled refresh controls reduce opacity and use a waiting cursor.

All interactive controls share a berry focus outline (2px with 4px offset). Buttons and links transition color and background over 160ms with ease-out. The refresh icon rotates over 1.2s while work is active. Reduced-motion preference removes animation and transitions.

### Chips

The author-filter chip combines an active filter label and a removable X icon on a lilac fill. Status labels are compact, noninteractive rectangles; finished status switches to the sage pair. Do not make noninteractive status badges look like additional actions.

### Cards / Containers

Soft-white panels carry a direct title and optional text action, followed by content. Keep card headings free of the removed decorative subheadings. Do not confuse record-level author names, recommendation reasons, or data-quality notes with decorative card subheadings: these remain useful content.

### Inputs / Fields

Search and select fields use a transparent surface, a fine lavender outline, and field-radius corners. Search includes a left-aligned line icon and matching text inset. Selects shift border color to berry on hover. Retain native control behavior, programmatic labels, and the shared keyboard focus treatment.

### Navigation

Line icons, clear labels, and a softly filled current item define the sidebar. Hover and selected backgrounds are distinct. The selected item also darkens its text and increases its weight. The TBR count remains data-driven. On mobile, preserve the final two-row navigation grid rather than the superseded horizontal-scrolling rule.

### Reading totals and charts

Large berry serif totals sit directly on the page ground. Monthly activity uses twelve berry bars, dark plum for a positive peak, numeric values, and visible month labels. Future months use an em dash. Horizontal rankings align the name, proportional bar, and count; author names act as library filters. Keep their tabular numerals and accessible chart description.

### Book covers

Use real metadata-backed jacket art, keeping the 2:3 slot stable during loading. A failed or uncertain lookup leaves a title-and-author placeholder with a line book icon. Show cover attribution as an actual link when available. Neither the placeholder nor the design-system preview invents a book from the reader’s sheet.

## Do's and Don'ts

### Do:

- Do use the final Literata weight of 500 for the brand and page heading.
- Do preserve the integrated totals, quiet panels, and clear chart labels.
- Do show actual reading data and identify the ranking as “Most-read authors.”
- Do retain real cover imagery or a readable title-and-author placeholder.
- Do keep keyboard focus visible and honor reduced motion.

### Don't:

- Don’t restore decorative card subheadings or the removed sidebar quotation.
- Don’t replace source-derived counts, authors, or covers with mockup illustrations.
- Don’t label reading frequency as favorites or invent ratings.
- Don’t add elevation shadows to the existing flat panel vocabulary.
