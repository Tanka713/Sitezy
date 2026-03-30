# Phase 5D — Interactive Composite Blocks

This phase moved the next interactive block group onto the structured settings path.

## Covered elements

- `pricing-toggle`
- `tabs`
- `modal-popup`

## What changed

- Added structured widget state for:
  - `pricing-toggle`
  - `modal-popup`
- Added structured repeated-item editing for:
  - `pricing-toggle` plans
  - `tabs`
- Replaced static inline-only content with metadata-driven content that the inspector can edit safely.
- Extended runtime syncing so these blocks keep their interaction while their content updates live.

## Supported settings

### Pricing Toggle
- title
- subtitle
- monthly label
- yearly label
- per plan:
  - plan name
  - monthly price
  - yearly price
  - description
  - feature list
  - CTA label

### Tabs
- tab label
- tab panel body

### Modal Popup
- trigger button label
- eyebrow
- title
- body
- primary button label
- secondary button label

## Stability notes

- The interactive behavior remains intact.
- Content no longer depends on brittle text scraping from visible buttons/panels.
- Save/load and exported preview keep the updated content because the visible DOM is synced from structured state before snapshotting.
