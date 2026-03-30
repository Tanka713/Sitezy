## Phase 5F — Marketing Composite Blocks

This phase moved the remaining partially covered marketing composites onto the structured widget + collection system.

### Blocks completed

- `cta-strip`
- `newsletter`
- `features`
- `features-list`
- `testimonial`
- `gallery`

### What changed

- Added block-level widget state for editable headlines, supporting copy, and CTA text.
- Added structured collection schemas for repeated feature cards, feature-list rows, and gallery images.
- Replaced static hardcoded content with annotated DOM fields that the inspector can edit safely.
- Added live widget sync in the editor and preview/export runtime for the new block-level state.
- Reordered collection field definitions so the inspector titles items by human-readable content instead of raw image URLs.

### Coverage

#### CTA Strip

- title
- body
- buttonLabel

#### Newsletter

- title
- body
- placeholder
- buttonLabel
- note

#### Features

- Widget fields:
  - title
  - subtitle
- Collection fields:
  - title
  - description
  - icon

#### Feature List

- Widget fields:
  - title
  - subtitle
- Collection fields:
  - title
  - description
  - icon

#### Testimonial

- quote
- name
- role
- initial

#### Gallery

- Widget fields:
  - eyebrow
  - title
  - body
- Collection fields:
  - alt
  - image

### Stability notes

- Newsletter placeholder updates now sync through widget state instead of relying on direct DOM edits.
- Testimonial avatar initials now derive safely from the name when initials are not explicitly set.
- Gallery image items are now editable without flattening the supporting content card beside them.
