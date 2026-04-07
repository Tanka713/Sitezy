# Phase 2: Element Architecture Rebuild

Date: March 29, 2026

## What Changed

- Added a central alias layer in `/Users/hashem/Desktop/sitezyV2/src/lib/blocks/aliases.ts`
- Added a unified element registry in `/Users/hashem/Desktop/sitezyV2/src/lib/blocks/registry.ts`
- Switched manual insertion to render through the registry instead of direct factory branching
- Switched the store fallback insertion path to use element metadata plus placement-aware insertion
- Moved inspector panel visibility into the registry via `resolveInspectorProfile(...)`
- Collapsed duplicated factory alias cases by resolving aliases before the main block switch

## New Source of Truth

The registry now owns:

- canonical ids
- alias resolution
- element family
- category
- placement
- renderer binding
- keywords
- children policy
- default props
- validation entrypoint
- inspector groups
- capability flags

This is now the shared metadata layer used by:

- insert menu
- renderer entrypoints
- store fallback insertion
- inspector visibility rules

## Architectural Cleanup Completed

### Aliases

Canonical aliases are now explicit instead of hidden in the block factory:

- `nav-simple -> navbar`
- `hero-centered -> hero`
- `section-basic -> section`
- `features-3 -> features`
- `cta-solid -> cta`
- `footer-simple -> footer`

### Registry

The registry now defines typed element metadata for:

- block elements
- icon elements
- element families
- children rules
- inspector groups

### Renderer Binding

Rendering now goes through `renderEditorElementHtml(...)`, which routes to:

- `buildBlockHtml(...)`
- `buildInlineHtml(...)`
- `buildIconHtml(...)`

without the sidebar or store needing to know those factory details.

### Placement-Aware Fallback Insertion

The store no longer assumes every insert is a section block.

`insertElementIntoPageHtml(...)` now handles:

- `top`
- `bottom`
- `section`
- `inline`

so fallback insertion stays aligned with the block’s real placement.

### Inspector Integration

Inspector group visibility is now centralized in `resolveInspectorProfile(...)` rather than being fully hardcoded inside `EditPanel.tsx`.

This is still node-capability-based because the editor runtime is currently DOM-driven, but the logic is now centralized and reusable.

## What Is Still Deferred To Later Phases

- full per-element settings schemas
- per-element prop sanitization beyond shallow defaults
- schema-driven composite content models
- runtime selection/rendering driven directly from registry metadata
- full drag/drop legality rules from children policies

## Result

Phase 2 did not replace the HTML-first editor model yet, but it did establish one reusable architectural layer that future phases can build on without continuing the old scattered metadata pattern.
