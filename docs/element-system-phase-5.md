## Phase 5 — Structured Element Settings Coverage

### What changed

Phase 5 added a reusable structured-content editing path for composite blocks that previously rendered repeated data but had no stable inspector settings.

### New collection editing system

The editor now supports fixed-set structured item editing through shared collection metadata:

- `data-sz-collection-kind`
- `data-sz-collection-label`
- `data-sz-collection-fields`
- `data-sz-collection-fixed`
- `data-sz-item`
- `data-sz-field`

The iframe runtime reads these attributes into `CanvasNodeInfo`, and the inspector renders a reusable item editor instead of flattening the block into one text field.

### Newly supported structured blocks

- `stats`
- `timeline`
- `testimonials`
- `team`
- `pricing`
- `faq`
- `accordion`
- `step-list`
- `carousel`
- `testimonial-slider`

### Supported structured field types

- `text`
- `textarea`
- `image`
- `list`

### Inspector improvements

- Added a dedicated structured-items accordion separate from plain text editing
- Kept plain text editing available when a collection block also exposes a normal text target
- Preserved the existing dedicated logo editor

### Runtime safety

- Collection blocks use fixed-count editing in this phase to avoid layout breakage from uncontrolled add/remove
- Missing or partial collection data falls back safely to the existing DOM content
- Updates preserve existing card/slide layouts and only rewrite annotated fields

### Files changed

- `src/types/index.ts`
- `src/lib/blocks/registry.ts`
- `src/lib/blocks/factory.ts`
- `src/lib/utils/visualEditor.ts`
- `src/components/editor/EditPanel.tsx`

### Remaining edge cases

- Structured add/remove/reorder for data blocks is intentionally deferred to later element-management phases
- Blocks without collection metadata still rely on direct text/media editing
- `pricing-toggle`, `tabs`, `comparison`, and some gallery/article composites still need their own structured schemas in a later pass
