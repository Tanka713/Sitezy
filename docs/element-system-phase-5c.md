# Phase 5C — Profile + Social Blocks

This phase covered the next set of partially static element blocks and moved them onto the structured widget/collection editing path.

## Covered elements

- `avatar-group`
- `social-links`
- `before-after`
- `tag-cloud`
- countdown target-date inspector control cleanup

## What changed

- Replaced the countdown browser calendar field with a builder-native date/time text field plus quick presets.
- Added structured widget + collection metadata for `avatar-group`.
- Added structured collection metadata for:
  - `social-links`
  - `before-after`
  - `tag-cloud`
- Extended runtime collection decorators so these blocks keep their visual behavior after edits:
  - social icon updates
  - avatar image alt syncing
  - tag size syncing
  - before/after image alt syncing

## Supported settings

### Avatar Group
- avatar names
- avatar images
- extra-count bubble
- caption text

### Social Links
- platform
- URL

### Before / After
- before label
- before image
- after label
- after image

### Tag Cloud
- tag label
- tag size

### Countdown
- target date now uses a clean text field
- quick `+1 day` and `+7 days` presets

## Stability notes

- These elements no longer depend on raw static text for their main editable data.
- Collection values can now safely read hidden metadata fields because the runtime falls back to `textContent` when needed.
- The same edited structure persists through editor save/load and the saved HTML path.
