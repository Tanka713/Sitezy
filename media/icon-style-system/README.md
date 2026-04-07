# Sitezy Icon Style System

The Sitezy icon system should feel like product tooling, not decorative illustration.

Principles:

- geometric, but not stiff
- minimal stroke language
- no cartoon energy
- designed for dark polished surfaces
- accent color used for active states only

Base rules:

- default artboard: `24 x 24`
- stroke width: `1.75`
- line cap: `round`
- line join: `round`
- corner rhythm: soft, not bubbly
- fills: avoid by default unless a single filled detail improves clarity
- optical alignment: icons can overshoot the grid slightly when needed

Recommended usage:

- default icon color: `currentColor`
- idle state on dark UI: `#F5F7FB` at reduced opacity or `#97A3B6`
- active state: `#5B8CFF` or gradient-backed container
- container corners: `14px` to `18px` for toolbar or inspector buttons

Included starter set:

- `icons/direction.svg`
- `icons/canvas.svg`
- `icons/layers.svg`
- `icons/spark.svg`
- `icons/tune.svg`
- `icons/export.svg`
- `icons/grid.svg`
- `icons/cursor-path.svg`

Do:

- keep internal spacing generous
- let one dominant gesture define each icon
- preserve consistency across toolbar, inspector, and marketing diagrams

Do not:

- mix thick fills with thin outlines arbitrarily
- use playful glyph proportions
- rely on random stars, magic wands, or browser-window clichés
