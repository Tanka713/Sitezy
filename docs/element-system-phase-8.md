# Phase 8 — Insertion, Drag/Drop, Duplicate, Delete, Reorder

## What changed

- Added reusable section mutation helpers in `/src/lib/editor/structure.ts`:
  - `removeSectionFromPageHtml(...)`
  - `moveSectionInPageHtml(...)`
  - `duplicateSectionInPageHtml(...)`
- Added safe cloned-section id remapping so duplicated sections do not keep conflicting DOM ids or radio-group names.
- Rebuilt section management in the Layers panel:
  - move up
  - move down
  - duplicate
  - delete
  - regenerate
- Moved those section actions onto the shared HTML/state mutation path instead of relying on ad hoc iframe-only behavior.
- Added section re-focus after move/duplicate/delete so the canvas stays oriented after structural actions.
- Improved the Elements panel insertion UX:
  - clearer “click vs drag” guidance
  - richer drag overlays and drop hints on the canvas
- Added missing live-edit management actions to the canvas toolbar:
  - select parent
  - cut
  - delete

## Files changed

- `/src/lib/editor/structure.ts`
- `/src/components/editor/LeftSidebar.tsx`
- `/src/components/editor/RightSidebar.tsx`
- `/src/components/editor/PreviewCanvas.tsx`

## Verification

- `npm run type-check`
