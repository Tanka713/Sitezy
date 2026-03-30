## Phase 5G — Structural and Navigation Blocks

This phase moved the remaining grouped structural/navigation blocks onto the structured widget + collection path instead of leaving them as mostly static template markup.

### Blocks completed

- `navbar`
- `navbar-center`
- `navbar-minimal`
- `hero`
- `hero-split`
- `section`
- `container`
- `grid`
- `columns`
- `split-image`
- `footer`
- `footer-columns`
- `contact`

### What changed

- Added block-level widget state for editable brand labels, headings, supporting copy, and CTA labels.
- Added structured collections for:
  - navbar links
  - footer links
  - footer link columns
  - grid cards
  - contact detail rows
- Replaced frozen content with annotated parts so the inspector can edit these blocks safely without flattening their layout.
- Added live widget sync in the editor and preview/export runtime for the new block-level content state.
- Added collection decorators for nav/footer link URLs and footer-column link lists.

### Coverage

#### Navbars

- brand
- CTA label
- nav link labels
- nav link URLs

#### Hero

- eyebrow
- title
- accent line
- body
- primary button label
- secondary button label

#### Hero Split

- title
- accent line
- body
- primary button label
- secondary button label

#### Section

- title
- body

#### Container

- body

#### Grid

- per-card title
- per-card body

#### Columns

- main title
- main body
- aside eyebrow
- aside body

#### Split Image

- eyebrow
- title
- body
- CTA label

#### Footer

- brand
- tagline
- link labels
- link URLs

#### Footer Columns

- brand
- tagline
- copyright
- per-column heading
- per-column link list

#### Contact

- title
- body
- submit button label
- per-row icon
- per-row label
- per-row value

### Stability notes

- Navbar and footer URL edits now stay structured instead of depending on direct anchor mutation only.
- Footer column links are regenerated from structured list data, so old edits no longer collapse into plain text.
- The new schema path only touches content/editability and leaves layout/placement behavior intact.
