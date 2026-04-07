# Phase 4: Organized Element Categories

Date: March 29, 2026

## What Changed

- Replaced the old raw insertion categories (`layout`, `nav`, `text`, `cards`, `cta`, `decorative`) with a cleaner user-facing category system in `/Users/hashem/Desktop/sitezyV2/src/lib/blocks/registry.ts`
- Added category metadata for:
  - label
  - icon
  - description
  - order
  - search keywords
- Added cleaner user-facing labels for ambiguous or duplicate-prone blocks
- Kept legacy raw block categories as `sourceCategory` so the system can still trace the original library data without exposing it in the UI
- Rebuilt the Elements sidebar grouping logic in `/Users/hashem/Desktop/sitezyV2/src/components/editor/RightSidebar.tsx` so it reads from the registry category model instead of the old raw category strings

## New Category Model

Blocks are now organized into these user-facing categories:

- `Sections`
- `Navigation`
- `Layout`
- `Basic`
- `Typography`
- `Media`
- `Interactive`
- `Forms`
- `Advanced`
- `Icons`

This is now the single category model used by the insert panel.

## Organization Rules Added

### Section-Level Blocks

Most full-width page blocks now surface under `Sections`, including:

- heroes
- feature sections
- pricing sections
- CTA sections
- blog/contact sections
- gallery/video sections

This is more intuitive than splitting those across `layout`, `cards`, `cta`, and `media`.

### Structural Blocks

Inline structural builders now live under `Layout`, including:

- container
- flex
- grid layout
- columns
- spacer

### Content Atoms

Small, reusable UI pieces now separate more clearly:

- `Typography` for headings, paragraphs, lists, tables, and text links
- `Basic` for buttons, cards, badges, dividers, alerts, and simple UI atoms
- `Media` for images, video, embeds, maps, avatars, galleries, and visual assets
- `Interactive` for accordions, tabs, modals, carousels, and other behavior-heavy blocks
- `Forms` for inputs and form primitives
- `Advanced` for decorative, data, and special-purpose components

## Naming Cleanup

Registry-level labels now disambiguate several confusing entries without changing block ids.

Examples:

- `Button Outline` → `Outline Button`
- `Grid Primitive` → `Grid Layout`
- `CTA` → `Call to Action`
- `Logo Scroller` → `Logo Marquee`
- `Testimonial Slider` → `Testimonial Carousel`

This improves search and insertion clarity without touching saved data or factory ids.

## Insert Panel Cleanup

The Elements sidebar now:

- filters blocks by the new category model
- sorts by smart score first, then category order, then label
- groups the `All` view by category with lightweight section headers
- shows category-aware metadata on cards

This makes the library easier to scan without changing insertion behavior.

## Files Updated

- `/Users/hashem/Desktop/sitezyV2/src/lib/blocks/registry.ts`
- `/Users/hashem/Desktop/sitezyV2/src/components/editor/RightSidebar.tsx`

## Result

Phase 4 did not add new settings or element behaviors yet, but it removed one major architectural source of confusion:

- the old block-library storage categories are no longer the same thing as the user-facing insertion taxonomy

The insert system is now cleaner for both:

- users browsing elements
- developers extending the element system in later phases
