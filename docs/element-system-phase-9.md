# Phase 9 — Save, Load, Preview, and State Integrity

## What changed

- Added project-aware editor-state normalization in `/src/lib/store/index.ts`.
- Saved editor snapshots now preserve durable context only:
  - page
  - file
  - section
  - panel/device/mode state
- Volatile canvas selection state is no longer trusted across persistence:
  - `selectedNode`
  - `isCanvasEditing`
- Loaded snapshots now revalidate:
  - `selectedPageId`
  - `selectedFileId`
  - `selectedSectionId`
  - `leftPanelTab`
  against the actual normalized project structure.
- Full preview now renders from normalized page HTML in `/src/components/editor/FullPreviewModal.tsx`, matching the editor preview path more closely.
- Export now normalizes every page before building output HTML in `/src/app/api/export/route.ts`, reducing schema drift between editor state and exported output.

## Why

The element-system rebuild added more structured widget and collection metadata. This phase makes sure that:

- stale editor selection does not survive save/load and point at missing nodes
- preview/export render the same normalized page shape the editor uses
- older or partially drifted page HTML is normalized before final render/export

## Files changed

- `/src/lib/store/index.ts`
- `/src/components/editor/FullPreviewModal.tsx`
- `/src/app/api/export/route.ts`

## Verification

- `npm run type-check`
