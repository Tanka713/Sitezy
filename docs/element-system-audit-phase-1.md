# Phase 1: Element System Audit

Date: March 29, 2026

## Scope

This audit maps the current editor element system end to end before any architectural rewrite.

Primary files inspected:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/blocks/library.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/blocks/factory.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/utils/visualEditor.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/EditPanel.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/RightSidebar.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/PreviewCanvas.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/LeftSidebar.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/store/index.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/editor/structure.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/media/library.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/MediaLibraryModal.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/types/index.ts`

## Concise Audit Summary

The current element system is functional, but it is not yet a unified element architecture.

What exists now:

- One central block inventory in `library.ts`
- Two large HTML factories in `factory.ts`
- One large iframe runtime in `visualEditor.ts`
- One large inspector in `EditPanel.tsx`
- HTML-first persistence through page HTML plus derived top-level sections

What is missing architecturally:

- no central typed element registry beyond id/label/category/placement
- no per-element `defaultProps` model
- no per-element settings schema
- no formal child rules or nesting contract
- no validation/sanitization layer per element type
- no structured content model for most composite blocks

Current reality:

- the system is DOM-driven, not element-schema-driven
- selection/editing are inferred from live HTML structure and computed styles
- many settings work generically, but not because elements are formally modeled
- complex blocks are mostly raw HTML strings with heuristics layered on top

This means the editor is currently stable only where the runtime heuristics happen to match the block markup.

## Current Element Inventory

Total block entries in `BLOCK_LIBRARY`: `104`

Placement split:

- `top`: 4
- `bottom`: 2
- `section`: 32
- `inline`: 66

Category split:

- `layout`: 18
- `nav`: 7
- `text`: 16
- `media`: 16
- `cards`: 15
- `cta`: 6
- `form`: 7
- `decorative`: 19

Factory-only aliases not exposed in `BLOCK_LIBRARY`:

- `nav-simple`
- `hero-centered`
- `section-basic`
- `features-3`
- `cta-solid`
- `footer-simple`

This is the first source-of-truth drift: rendering supports more names than insertion exposes.

### Navigation

- `navbar`
- `navbar-center`
- `navbar-minimal`
- `footer`
- `footer-columns`
- `breadcrumb`
- `pagination`

### Layout

- `hero`
- `hero-split`
- `section`
- `split-image`
- `grid`
- `columns`
- `stats`
- `timeline`
- `spacer`
- `container`
- `flex-container`
- `grid-container`
- `two-columns`
- `three-columns`
- `accordion`
- `tabs`
- `step-list`
- `sidebar-panel`

### Text

- `heading`
- `paragraph`
- `button`
- `button-outline`
- `icon-button`
- `badge`
- `blockquote`
- `divider`
- `list`
- `icon-list`
- `pill-list`
- `highlight-text`
- `table`
- `code-block`
- `alert`
- `text-link`

### Media

- `gallery`
- `image`
- `video`
- `youtube`
- `embed`
- `icon-block`
- `icon-circle`
- `avatar`
- `avatar-group`
- `rating`
- `social-links`
- `map-embed`
- `before-after`
- `gallery-masonry`
- `video-section`
- `carousel`

### Cards / Composite Content

- `features`
- `features-list`
- `testimonial`
- `testimonials`
- `team`
- `pricing`
- `pricing-toggle`
- `faq`
- `logo-wall`
- `logo-scroller`
- `card`
- `menu-item`
- `blog-grid`
- `comparison`
- `testimonial-slider`

### CTA / Conversion

- `cta`
- `cta-strip`
- `newsletter`
- `floating-button`
- `modal-popup`
- `contact`

### Forms

- `contact-form`
- `text-input`
- `textarea-field`
- `select-field`
- `checkbox-field`
- `radio-group`
- `toggle-switch`

### Decorative

- `progress-bar`
- `counter-stat`
- `notification`
- `countdown`
- `tag-cloud`
- `shape-circle`
- `shape-ring`
- `shape-square`
- `shape-diamond`
- `shape-triangle`
- `shape-pill`
- `shape-line`
- `shape-blob`
- `shape-cross`
- `shape-dots`
- `wave-divider`
- `banner`
- `alert-bar`
- `shape-row`

### Separate Element System Outside the Main Block Registry

Icons are not part of `BLOCK_LIBRARY`.

They are handled through:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/utils/iconLibrary.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/RightSidebar.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/blocks/factory.ts` via `buildIconHtml`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/utils/visualEditor.ts`

That means the current "element system" is already split into:

- blocks
- icons
- media library assets

before it even reaches the canvas.

## How the Current System Works

### 1. Registration

Current source:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/blocks/library.ts`

What it defines:

- `id`
- `label`
- `cat`
- `icon`
- `preview`
- `placement`

What it does not define:

- renderer binding
- default props
- children rules
- settings schema
- validation rules
- searchable keywords
- aliases
- structured content schema

### 2. Rendering

Current sources:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/blocks/factory.ts`

Rendering is split into:

- `buildBlockHtml(blockId, project)` for top/section/bottom blocks
- `buildInlineHtml(blockId, project, page)` for inline blocks
- `buildIconHtml(...)` for icons

Important finding:

- block defaults are stored as raw HTML strings, not typed props
- section blocks and inline blocks are defined in separate switch statements
- some components are duplicated conceptually across both switches
- there is no single renderer binding from the block registry

### 3. Insertion

Current sources:

- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/RightSidebar.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/store/index.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/utils/visualEditor.ts`

Insertion paths:

- manual insert from Elements tab
- AI-assisted insert through `/api/insert-block`
- icon insert through separate icon flow
- store fallback insert through `insertBlock(...)`

Current insertion behavior is determined by:

- `placement`
- current selected section
- current selected node role
- runtime heuristics inside `insert-smart`

Important finding:

- insertion rules are not centrally defined
- allowed destinations are inferred at runtime, not enforced by a schema
- nav/header/media/icon special cases are scattered in `visualEditor.ts`

### 4. Selection

Current source:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/utils/visualEditor.ts`

Selection is resolved by DOM heuristics:

- `mediaChild(...)`
- `textChild(...)`
- `iconUnit(...)`
- `iconWrap(...)`
- `gact(...)`
- `visualTarget(...)`
- `mediaDeleteUnit(...)`
- section and ancestor helpers

Important finding:

- selection is shape-driven, not element-type-driven
- wrapper behavior depends on DOM structure matching the runtime assumptions
- that is why nav/media/icon/container edge cases keep appearing

### 5. Editing

Current sources:

- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/EditPanel.tsx`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/utils/visualEditor.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/types/index.ts`

The editor does not edit typed element props.

It edits:

- DOM attributes
- inline styles
- text content
- encoded responsive attributes
- derived section metadata

The inspector is gated by `CanvasNodeInfo`, not block type.

Current inspector groups:

- `responsive`
- `content`
- `typography`
- `image`
- `video`
- `embed`
- `input`
- `link`
- `layout`
- `spacing`
- `background`
- `border`
- `effects`
- `animation`
- `section`
- `icon`

Important finding:

- this is powerful, but it is not per-element-complete
- blocks get settings because they look like a certain node, not because they are formally defined as supporting those settings

### 6. Duplicate / Copy / Paste / Delete

Current source:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/utils/visualEditor.ts`

Operations are DOM-based:

- clone live nodes
- rewrite `data-sz-id`
- remap inline refs
- normalize copied HTML
- reinsert via runtime DOM mutation

Important finding:

- this is schema-agnostic, which helps flexibility
- but there is no formal child/ownership model, so legality depends on heuristics

### 7. Nesting

Current sources:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/utils/visualEditor.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/RightSidebar.tsx`

Nesting is currently governed by:

- placement rules
- overlay-based section targeting
- runtime container detection
- inline/media/nav/icon special handling

Important finding:

- there is no declarative `canHaveChildren` / `allowedChildren` model
- illegal states are prevented only partially

### 8. Save / Load / Preview

Current sources:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/store/index.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/editor/structure.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/PreviewCanvas.tsx`

Persistence model:

- project stores page HTML
- `derivePageStateFromHtml(...)` regenerates top-level `sections`
- nested elements are not stored structurally
- media library is persisted through a hidden JSON virtual file

Preview model:

- canvas preview injects either:
  - editor runtime script
  - nav guard script
- preview HTML is normalized through `derivePageStateFromHtml(...)`

Important finding:

- top-level sections are typed
- nested elements are not
- the renderer/editor alignment depends on HTML surviving normalization

## Current Data / Props Surface

The system does not currently have per-element prop objects.

The actual editable surface is `CanvasNodeInfo`, which is a large DOM-derived capability object.

Current supported runtime fields include:

- content/text:
  - `text`
  - `editableText`
  - `logoItems`
  - `src`
  - `altText`
  - `placeholder`
  - `inputType`
  - `inputName`
  - `href`
  - `target`
- node targeting:
  - `nodeId`
  - `textTargetNodeId`
  - `mediaTargetNodeId`
  - `linkTargetNodeId`
  - `listTargetNodeId`
  - animation target ids
- typography:
  - font family/size/weight/style
  - line height
  - letter spacing
  - text align
  - text transform
  - font variant caps
  - text decoration
  - underline offset
  - white space
  - wrap / word break
  - text indent
  - text opacity
  - list style
  - column count
- appearance:
  - color
  - background color/image/position/size/repeat/attachment/blend
  - border/radius
  - opacity
  - box shadow
  - filter
  - backdrop filter
  - mix blend mode
- layout:
  - width / height / min / max
  - display / position / z-index
  - top/right/bottom/left
  - flex/grid properties
  - gap / row gap / column gap
  - overflow
  - object fit / object position
- responsive:
  - current mode
  - per-breakpoint override flags
  - current override property list
- animation:
  - entrance
  - hover
  - duration
  - delay
  - ease
  - custom animation flags
- section-specific:
  - section background
  - section padding
  - section visual fallback node
- icon-specific:
  - icon wrapper id
  - icon size
  - icon button state

This is a strong generic style surface.

But it is not the same thing as a complete element schema.

## Missing / Incomplete Areas

### 1. The registry is only an inventory, not a system

Broken point:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/blocks/library.ts`

Missing:

- default props
- validation
- aliases
- keywords
- child rules
- inspector schema
- content schema
- renderer binding

Impact:

- the rest of the app cannot rely on a single typed model

### 2. Rendering defaults are split and duplicated

Broken point:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/blocks/factory.ts`

Problems:

- one large section/top/bottom switch
- one large inline switch
- raw HTML strings as the data model
- alias-only cases hidden from the registry
- duplicated patterns across section and inline builders

Impact:

- hard to validate
- hard to evolve
- easy for settings coverage to drift from markup

### 3. Selection and editing depend on DOM heuristics

Broken point:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/utils/visualEditor.ts`

Problems:

- selection target resolution is heuristic-heavy
- nav/media/icon/container logic is spread through many helpers
- wrapper behavior is not explicit in a schema
- resizing/deleting/linking often needs special-case code

Impact:

- fixes tend to land as runtime patches
- edge cases reappear whenever markup changes

### 4. The inspector is monolithic and capability-driven

Broken point:

- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/EditPanel.tsx`

Problems:

- huge local state surface
- many control groups depend on node-shape checks such as:
  - `node.isImg`
  - `node.isVideo`
  - `node.isSvg`
  - `node.isContainer`
  - `node.logoCollectionNodeId`
- per-element settings are not declared centrally
- composite blocks do not have structured settings UIs

Impact:

- settings coverage is broad but uneven
- composite elements cannot be completed cleanly without more schema

### 5. Composite blocks mostly lack structured content models

Weak areas:

- `pricing`
- `pricing-toggle`
- `faq`
- `testimonials`
- `testimonial-slider`
- `team`
- `blog-grid`
- `comparison`
- `gallery`
- `gallery-masonry`
- `logo-wall`
- `logo-scroller`
- `menu-item`
- `carousel`
- `accordion`
- `tabs`

Current state:

- these mostly render as static HTML lists/cards
- editing usually happens through:
  - generic text targeting
  - generic style controls
  - a few one-off special editors like logo items

Missing:

- repeatable item schemas
- add/remove/reorder item controls
- structured item defaults
- validation for item arrays

### 6. Forms are partially modeled, not fully modeled

Current support:

- contact form block
- primitive input/textarea/select/checkbox/radio/toggle blocks
- placeholder/name/type editing for some fields

Missing:

- unified form field schema
- select option editor
- radio option editor
- checkbox/toggle content model
- form submission/action configuration
- validation rules per field

### 7. Navigation is still HTML-first

Current support:

- linking now works for text, buttons, images, icons, containers
- nav-specific insertion and media handling exist

Missing:

- structured nav menu model
- structured menu item list
- consistent CTA/menu/logo slots

Impact:

- navbars are still sensitive to markup shape and wrapper behavior

### 8. Responsive is powerful but not schema-aware

Current support:

- element-level encoded responsive overrides
- responsive badges and reset paths

Missing:

- per-element responsive capability contract
- per-prop allowlists defined by element type

Impact:

- reset/apply scope depends on target heuristics

### 9. The current category system is not the final scalable one

Current categories:

- `layout`
- `nav`
- `text`
- `cards`
- `cta`
- `media`
- `form`
- `decorative`

Missing for the long-term system:

- clearer distinction between:
  - layout primitives
  - typography
  - interactive
  - sections
  - advanced
  - navigation
- searchable keywords
- better naming normalization

### 10. Save/load is stable for HTML, not for a true nested element schema

Current persistence is reliable for:

- HTML pages
- top-level section metadata
- media library file

But not structured for:

- nested element arrays
- typed block props
- versioned element data migrations

This is the main architectural limit behind many editor edge cases.

## Current Settings Coverage by Element Family

This section maps current coverage and gaps based on actual code.

### Text Family

Elements:

- heading
- paragraph
- badge
- blockquote
- divider
- list
- icon-list
- pill-list
- highlight-text
- text-link
- alert
- code-block
- table

Current coverage:

- strong generic typography coverage
- color
- text decoration
- text indent
- columns
- list style
- link decoration
- spacing
- layout/background/border/effects when node shape allows

Missing or incomplete:

- heading level control
- structured list item editor
- table row/column editor
- code theme/language schema
- alert variants

### Button / Interactive Text Family

Elements:

- button
- button-outline
- icon-button
- floating-button

Current coverage:

- text content
- links
- background
- border
- button surface presets
- layout/spacing/effects/animation

Missing or incomplete:

- explicit button variant schema
- icon slot schema for mixed button types
- hover state model beyond generic style + animation

### Layout Primitive Family

Elements:

- section
- container
- flex-container
- grid-container
- two-columns
- three-columns
- columns
- grid
- sidebar-panel
- spacer

Current coverage:

- strong generic layout controls
- flex/grid controls
- spacing
- background
- border
- effects
- responsive

Missing or incomplete:

- formal child rules
- structural slot definitions for columns/grid primitives
- explicit empty-state placeholders per primitive

### Media Family

Elements:

- image
- video
- youtube
- embed
- map-embed
- icon-block
- icon-circle
- avatar
- avatar-group
- rating
- social-links
- before-after
- gallery
- gallery-masonry
- video-section
- carousel

Current coverage:

- media source replacement
- media library integration
- object fit/position
- dimensions
- link wrapping
- image/video/embed-specific panels

Missing or incomplete:

- structured social link item editor
- structured avatar group members
- structured rating value/editor
- structured before/after content
- structured gallery item editor
- structured carousel slides + controls

### Forms Family

Elements:

- contact-form
- text-input
- textarea-field
- select-field
- checkbox-field
- radio-group
- toggle-switch

Current coverage:

- placeholder/name/type for some inputs
- generic style/layout controls

Missing or incomplete:

- formal field schema
- option array editing for select/radio
- labels/help text/required flags
- validation patterns
- action/submission config

### Composite Content Family

Elements:

- features
- features-list
- testimonial
- testimonials
- team
- pricing
- pricing-toggle
- faq
- logo-wall
- logo-scroller
- card
- menu-item
- blog-grid
- comparison
- testimonial-slider
- accordion
- tabs
- step-list
- timeline

Current coverage:

- generic text editing works for many inner text targets
- generic style/layout/background controls
- logo-specific item editor exists

Missing or incomplete:

- repeatable item schema
- add/remove/reorder controls
- content field definitions per item
- behavior settings for tabs/accordion/carousel/pricing toggle

### Decorative Family

Elements:

- progress-bar
- counter-stat
- notification
- countdown
- tag-cloud
- shapes
- wave-divider
- banner
- alert-bar
- shape-row

Current coverage:

- generic style/layout/background/border/effects

Missing or incomplete:

- meaningful content controls for values/labels
- countdown target/date settings
- tag-cloud item list
- progress values
- notification content model

## Broken / Incomplete Architecture Points

### File-Level Weak Points

#### `/Users/hashem/Desktop/sitezyV2 copy/src/lib/blocks/library.ts`

- inventory only
- not a true registry yet

#### `/Users/hashem/Desktop/sitezyV2 copy/src/lib/blocks/factory.ts`

- two large switch renderers
- no typed props
- alias drift
- static HTML as defaults

#### `/Users/hashem/Desktop/sitezyV2 copy/src/lib/utils/visualEditor.ts`

- too much responsibility:
  - selection
  - target resolution
  - mutation
  - responsive writes
  - animation runtime
  - copy/paste/duplicate/delete
  - drag/drop
  - nav/media/icon special cases

#### `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/EditPanel.tsx`

- inspector monolith
- not schema-driven
- very large local state buffer
- many family-specific branches mixed with generic controls

#### `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/RightSidebar.tsx`

- insertion UX, AI insert, icons, drag overlays, category UI, and block scoring all mixed together
- icons remain a separate system

#### `/Users/hashem/Desktop/sitezyV2 copy/src/lib/store/index.ts`

- persistence model is page HTML plus derived sections
- no nested structured element state
- insert fallback still bypasses the richer runtime path

#### `/Users/hashem/Desktop/sitezyV2 copy/src/lib/editor/structure.ts`

- stable for top-level sections
- intentionally not aware of nested element schemas

## Minimum Architectural Cleanup Needed Before Full Fixes

This is the minimum cleanup needed before Phase 2 can succeed.

### 1. Promote the block inventory into a real element registry

Needed fields:

- `type`
- `label`
- `category`
- `placement`
- `icon`
- `keywords`
- `aliases`
- `family`
- `defaultContent`
- `defaultStyle`
- `childrenPolicy`
- `inspectorCapabilities`
- `validator`
- `sanitize`

### 2. Introduce element families

At minimum:

- `section`
- `layout`
- `text`
- `button`
- `media`
- `form-field`
- `navigation`
- `composite-list`
- `decorative`
- `icon`

This lets the editor share rules cleanly without trying to hand-author 104 unique components immediately.

### 3. Centralize target resolution by family

Move the logic for:

- text targets
- media targets
- icon wrappers
- link wrappers
- delete units
- resize targets

into one reusable capability layer instead of re-scattering more heuristics.

### 4. Separate composite content blocks from pure presentational blocks

Blocks like `pricing`, `faq`, `team`, `carousel`, `logo-scroller`, `comparison`, and `testimonials` need structured item schemas.

They cannot be completed cleanly through generic text editing alone.

### 5. Split the inspector into schema-driven sections

Keep the current generic controls, but stop deciding coverage solely from raw node shape.

The registry should define:

- which groups appear
- which fields each group shows
- which target node each field writes to

## Refactor Plan for Next Phases

### Phase 2: Element Architecture Rebuild

Build a new central registry and normalize aliases, families, children rules, and capability metadata.

Primary targets:

- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/blocks/library.ts`
- new registry/config files under `src/lib/editor` or `src/lib/elements`
- `/Users/hashem/Desktop/sitezyV2 copy/src/lib/blocks/factory.ts`
- `/Users/hashem/Desktop/sitezyV2 copy/src/components/editor/RightSidebar.tsx`

### Phase 3: Defaults, Validation, Safe Fallbacks

Add default content/style merges, prop sanitization, and schema upgrade helpers so malformed or old block data cannot destabilize the canvas.

### Phase 4: Category Cleanup

Reorganize categories into a user-facing taxonomy that better matches the actual block families and future growth.

### Phase 5: Complete Settings Coverage

Prioritize family-based structured settings:

1. navigation
2. forms
3. composite content blocks
4. media collections
5. interactive behavior blocks

### Phase 6: Inspector Stability

Refactor `EditPanel.tsx` into smaller schema-driven groups after the registry is in place.

### Phase 7: Canvas Reliability

Use the family/capability layer to normalize:

- selection targets
- delete units
- resize targets
- wrapper rules
- preview alignment

### Phase 8: Insertion / Drag / Reorder

Replace heuristic-only placement logic with registry-backed placement and child rules.

### Phase 9: Save / Load / Preview Integrity

Keep HTML compatibility, but introduce block sanitization and old-data upgrades around the new registry.

### Phase 10: Final Cleanup

Remove aliases, dead branches, and one-off patches that become obsolete once the family/registry model is live.

## Recommended Starting Point for Phase 2

Do not start by rewriting every block.

Start with the minimum central model:

1. create a new registry layer over `BLOCK_LIBRARY`
2. formalize element families
3. add aliases + keywords + placement + child policy
4. map generic inspector groups to families
5. move icon definitions under the same registry umbrella

That is the smallest change that unlocks the rest of the phases without breaking current functionality.
