## Phase 5E — Data Composite Blocks

This phase moved the remaining data composites onto the structured widget + collection path instead of leaving them as static HTML fragments.

### Blocks completed

- `comparison`
- `blog-grid`
- `gallery-masonry`

### What changed

- Added block-level widget state for editable headings/subheadings.
- Added structured collection schemas for rows, posts, and masonry tiles.
- Replaced static hardcoded DOM with annotated field-bound markup.
- Added runtime collection decorators so hidden metadata fields update visible DOM safely.
- Added preview/export widget sync for the new block-level widget state.

### Coverage

#### Comparison

- Widget fields:
  - title
  - subtitle
  - featureLabel
  - primaryLabel
  - secondaryLabel
  - tertiaryLabel
- Collection fields:
  - feature
  - primary
  - secondary
  - tertiary

#### Blog Grid

- Widget fields:
  - title
  - subtitle
- Collection fields:
  - image
  - tag
  - title
  - excerpt
  - date
  - cta
  - url

#### Gallery Masonry

- Widget fields:
  - title
  - subtitle
- Collection fields:
  - image
  - alt
  - height

### Stability notes

- Collection edits now update the visible comparison table cells instead of stale hidden data.
- Blog card CTA URLs are now preserved as structured data instead of relying on direct DOM edits.
- Masonry tile height and alt text now persist through structured collection data.
