# Phase 5B — Widget Blocks

This phase moved the remaining single-widget content blocks onto the same structured settings path as the larger composite blocks.

## Covered widgets

- `progress-bar`
- `counter-stat`
- `notification`
- `countdown`
- `rating`

## What changed

- Added typed widget metadata to the canvas node model.
- Added a widget inspector path in the right sidebar.
- Annotated widget markup in the block factory with:
  - widget kind
  - widget label
  - widget field schema
  - widget state
  - widget part markers
- Added iframe runtime support to:
  - read widget metadata
  - expose it through `CanvasNodeInfo`
  - apply widget state safely
  - re-render widgets after edits
- Added shared page runtime support so widgets, especially `countdown`, stay functional in preview/export too.

## Supported fields

### Progress Bar
- `label`
- `value`
- `percent`

### Counter Stat
- `value`
- `label`

### Notification
- `title`
- `message`
- `time`

### Countdown
- `targetDate`
- `labelDays`
- `labelHours`
- `labelMinutes`
- `labelSeconds`

### Rating
- `score`
- `reviews`
- `stars`

## Stability notes

- Widget state now persists in HTML instead of relying on raw text scraping.
- `countdown` now stays live in the editor and in exported/full-preview pages.
- The inspector no longer needs one-off hardcoded fields for these widgets.

## Remaining uncovered block groups

- profile/social widgets
- interactive composite widgets
- data composite widgets
- marketing composite grouped blocks
- navigation/structural grouped blocks
