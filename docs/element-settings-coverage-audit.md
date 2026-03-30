## Element Settings Coverage Audit

Last checked against:

- `src/lib/blocks/library.ts`
- `src/lib/blocks/factory.ts`
- `src/lib/blocks/registry.ts`
- `src/lib/utils/visualEditor.ts`
- `src/components/editor/EditPanel.tsx`

### Coverage legend

- **Structured**: dedicated inspector support for repeated/composite content
- **Generic**: editable through existing text/media/link/style controls by selecting inner nodes
- **Partial**: works, but lacks dedicated content/behavior settings
- **Missing behavior**: visual block exists but the actual behavior/config is still mostly static

## 1. Structured coverage in place

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
- `logo-wall`
- `logo-scroller`

These now expose item data in the inspector instead of relying only on raw text selection.

## 2. Good generic coverage

These do not have a dedicated item schema, but they are generally editable through existing node-level controls:

- `heading`
- `paragraph`
- `button`
- `button-outline`
- `icon-button`
- `badge`
- `blockquote`
- `divider`
- `spacer`
- `image`
- `video`
- `youtube`
- `embed`
- `map-embed`
- `text-input`
- `textarea-field`
- `select-field`
- `checkbox-field`
- `radio-group`
- `toggle-switch`
- `list`
- `icon-list`
- `pill-list`
- `highlight-text`
- `table`
- `code-block`
- `alert`
- `text-link`
- `icon-circle`
- `avatar`
- `floating-button`
- `breadcrumb`
- `pagination`
- `sidebar-panel`
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

These mostly rely on selecting inner text/media nodes rather than editing the whole block as one structured unit.

## 3. Partial coverage — multi-part blocks without dedicated schemas

These blocks render correctly and can often be edited by selecting sub-elements, but they still lack a proper block-level content/settings schema:

- `navbar`
- `navbar-center`
- `navbar-minimal`
- `footer`
- `footer-columns`
- `hero`
- `hero-split`
- `section`
- `split-image`
- `grid`
- `columns`
- `features`
- `features-list`
- `testimonial`
- `gallery`
- `cta`
- `cta-strip`
- `newsletter`
- `card`
- `contact-form`
- `container`
- `flex-container`
- `grid-container`
- `two-columns`
- `three-columns`
- `icon-block`
- `before-after`
- `contact`
- `video-section`
- `menu-item`

Main limitation:

- content is editable only by drilling into text/media nodes
- no block-level grouped content editor
- repeated or paired content is not modeled as a first-class data schema

## 4. Missing dedicated content/behavior settings

These are the most important remaining gaps.

### Decorative / data widgets

- `progress-bar`
  - no dedicated label/value/percent control
- `counter-stat`
  - no dedicated number/label/counter behavior control
- `notification`
  - no dedicated title/body/time/icon control
- `countdown`
  - static digits only, no target date or live countdown settings
- `tag-cloud`
  - no tag list editor

### Media / profile clusters

- `avatar-group`
  - no avatar list editor
- `rating`
  - no star count / score / review-count controls
- `social-links`
  - no per-network URL/label/icon editor
- `before-after`
  - no dedicated before/after image and caption pairing editor
- `gallery-masonry`
  - no image collection editor
- `blog-grid`
  - no post-card collection editor

### Interactive widgets

- `pricing-toggle`
  - interactive markup exists
  - no structured plan editor
  - no monthly/yearly data editor
- `tabs`
  - visual behavior exists
  - no tab labels/content schema
- `modal-popup`
  - open/close behavior exists
  - no modal title/body/actions editor
- `comparison`
  - no editable comparison row/column schema

## 5. Behavior settings still missing even on structured blocks

Even where content is now structured, many interaction settings are still not exposed yet.

- `accordion`
  - no open-first / multi-open behavior setting
- `faq`
  - same as accordion
- `carousel`
  - no autoplay, speed, loop, arrows, visible-slides, snap behavior settings
- `testimonial-slider`
  - no autoplay, loop, timing, navigation style settings
- `logo-scroller`
  - no speed, pause-on-hover, direction, gap settings
- `pricing`
  - content editable, but no featured-plan toggle in inspector

## 6. Highest-priority remaining work

1. `countdown`
2. `notification`
3. `counter-stat`
4. `progress-bar`
5. `rating`
6. `social-links`
7. `avatar-group`
8. `pricing-toggle`
9. `tabs`
10. `modal-popup`
11. `comparison`
12. `gallery-masonry`
13. `blog-grid`

## 7. Architectural conclusion

The editor now has three content-editing modes:

- plain text editing
- logo collection editing
- structured repeated-item editing

The remaining uncovered blocks should not be patched one by one with ad hoc UI.

They should be implemented in two reusable families:

- **single-widget schema**
  - countdown, notification, counter-stat, progress-bar, rating
- **composite collection schema**
  - pricing-toggle, tabs, comparison, blog-grid, gallery-masonry, avatar-group, social-links
