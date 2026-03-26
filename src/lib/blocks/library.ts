export type BlockPlacement = "top" | "section" | "inline" | "bottom";

export interface Block {
  id: string;
  label: string;
  cat: "layout" | "nav" | "text" | "media" | "cards" | "cta" | "form" | "decorative";
  icon: string;
  preview: string;
  html: string;
  placement: BlockPlacement;
}

export const BLOCK_LIBRARY: Block[] = [
  // ── Navigation (top) ────────────────────────────────────────────────────────
  { id: "navbar",          label: "Navbar",          cat: "nav",    icon: "≡",  preview: "Sticky brand navigation",       html: "", placement: "top"     },
  { id: "navbar-center",   label: "Navbar Center",   cat: "nav",    icon: "⊟",  preview: "Centered logo + links",         html: "", placement: "top"     },
  { id: "navbar-minimal",  label: "Navbar Minimal",  cat: "nav",    icon: "─",  preview: "Logo + single CTA",             html: "", placement: "top"     },

  // ── Footer (bottom) ──────────────────────────────────────────────────────────
  { id: "footer",          label: "Footer",          cat: "nav",    icon: "⊟",  preview: "Dark footer with links",        html: "", placement: "bottom"  },
  { id: "footer-columns",  label: "Footer Columns",  cat: "nav",    icon: "⊞",  preview: "Multi-column footer",           html: "", placement: "bottom"  },

  // ── Layout sections ──────────────────────────────────────────────────────────
  { id: "hero",            label: "Hero",            cat: "layout", icon: "⬒",  preview: "Primary page hero",             html: "", placement: "section" },
  { id: "hero-split",      label: "Hero Split",      cat: "layout", icon: "⬕",  preview: "Text + image side by side",     html: "", placement: "section" },
  { id: "section",         label: "Section",         cat: "layout", icon: "▭",  preview: "General-purpose section",       html: "", placement: "section" },
  { id: "split-image",     label: "Split Image",     cat: "layout", icon: "⧈",  preview: "50/50 content + image",         html: "", placement: "section" },
  { id: "grid",            label: "Grid",            cat: "layout", icon: "⊞",  preview: "Three-column card grid",        html: "", placement: "section" },
  { id: "columns",         label: "Columns",         cat: "layout", icon: "⋮",  preview: "Two-column content split",      html: "", placement: "section" },
  { id: "stats",           label: "Stats",           cat: "layout", icon: "📊", preview: "Metrics and numbers row",       html: "", placement: "section" },
  { id: "timeline",        label: "Timeline",        cat: "layout", icon: "↕",  preview: "Vertical timeline steps",       html: "", placement: "section" },

  // ── Cards / social proof ─────────────────────────────────────────────────────
  { id: "features",        label: "Features",        cat: "cards",  icon: "✦",  preview: "3 feature highlight cards",     html: "", placement: "section" },
  { id: "features-list",   label: "Feature List",    cat: "cards",  icon: "☰",  preview: "Icon + text feature list",      html: "", placement: "section" },
  { id: "testimonial",     label: "Testimonial",     cat: "cards",  icon: "❝",  preview: "Single large quote",            html: "", placement: "section" },
  { id: "testimonials",    label: "Testimonials",    cat: "cards",  icon: "❞",  preview: "Grid of customer quotes",       html: "", placement: "section" },
  { id: "team",            label: "Team",            cat: "cards",  icon: "👥", preview: "Team member cards",             html: "", placement: "section" },
  { id: "pricing",         label: "Pricing",         cat: "cards",  icon: "◎",  preview: "3-tier pricing table",          html: "", placement: "section" },
  { id: "faq",             label: "FAQ",             cat: "cards",  icon: "?",  preview: "Accordion FAQ list",            html: "", placement: "section" },
  { id: "gallery",         label: "Gallery",         cat: "media",  icon: "▦",  preview: "Asymmetric photo gallery",      html: "", placement: "section" },
  { id: "logo-wall",       label: "Logo Wall",       cat: "cards",  icon: "⬚",  preview: "Client / partner logos",        html: "", placement: "section" },

  // ── CTA / conversion ─────────────────────────────────────────────────────────
  { id: "cta",             label: "CTA",             cat: "cta",    icon: "→",  preview: "Full-width call to action",     html: "", placement: "section" },
  { id: "cta-strip",       label: "CTA Strip",       cat: "cta",    icon: "▷",  preview: "Compact inline CTA bar",        html: "", placement: "section" },
  { id: "newsletter",      label: "Newsletter",      cat: "cta",    icon: "✉",  preview: "Email subscribe section",       html: "", placement: "section" },

  // ── Inline components ────────────────────────────────────────────────────────
  { id: "heading",         label: "Heading",         cat: "text",   icon: "H",  preview: "Section heading + subtext",     html: "", placement: "inline"  },
  { id: "paragraph",       label: "Paragraph",       cat: "text",   icon: "¶",  preview: "Body text paragraph",           html: "", placement: "inline"  },
  { id: "button",          label: "Button",          cat: "text",   icon: "◎",  preview: "Primary action button",         html: "", placement: "inline"  },
  { id: "button-outline",  label: "Button Outline",  cat: "text",   icon: "○",  preview: "Secondary outline button",      html: "", placement: "inline"  },
  { id: "badge",           label: "Badge",           cat: "text",   icon: "◈",  preview: "Label / tag pill",              html: "", placement: "inline"  },
  { id: "blockquote",      label: "Blockquote",      cat: "text",   icon: "❝",  preview: "Styled pull quote",             html: "", placement: "inline"  },
  { id: "divider",         label: "Divider",         cat: "text",   icon: "─",  preview: "Horizontal separator line",     html: "", placement: "inline"  },
  { id: "spacer",          label: "Spacer",          cat: "layout", icon: "↕",  preview: "Vertical blank spacing",        html: "", placement: "inline"  },
  { id: "image",           label: "Image",           cat: "media",  icon: "🖼", preview: "Responsive image",              html: "", placement: "inline"  },
  { id: "video",           label: "Video",           cat: "media",  icon: "▶",  preview: "Native HTML video player",      html: "", placement: "inline"  },
  { id: "youtube",         label: "YouTube Embed",   cat: "media",  icon: "▻",  preview: "Responsive YouTube embed",      html: "", placement: "inline"  },
  { id: "embed",           label: "Custom Embed",    cat: "media",  icon: "⧉",  preview: "Generic iframe embed block",    html: "", placement: "inline"  },
  { id: "icon-block",      label: "Icon Block",      cat: "media",  icon: "◈",  preview: "Icon + label + text",           html: "", placement: "inline"  },
  { id: "card",            label: "Card",            cat: "cards",  icon: "▭",  preview: "Single content card",           html: "", placement: "inline"  },
  { id: "contact-form",    label: "Contact Form",    cat: "form",   icon: "✎",  preview: "Name / email / message form",   html: "", placement: "inline"  },

  // ── Layout containers (inline) ───────────────────────────────────────────────
  { id: "container",       label: "Container",        cat: "layout", icon: "□",  preview: "Empty design-aware container",   html: "", placement: "inline"  },
  { id: "flex-container",  label: "Flex",             cat: "layout", icon: "⇆",  preview: "Row-based flexible container",  html: "", placement: "inline"  },
  { id: "grid-container",  label: "Grid Primitive",   cat: "layout", icon: "▦",  preview: "Raw editable grid container",   html: "", placement: "inline"  },
  { id: "two-columns",     label: "2 Columns",        cat: "layout", icon: "⫿",  preview: "Two equal side-by-side cols",   html: "", placement: "inline"  },
  { id: "three-columns",   label: "3 Columns",        cat: "layout", icon: "⫼",  preview: "Three-column flex layout",      html: "", placement: "inline"  },
  { id: "accordion",       label: "Accordion",        cat: "layout", icon: "≡",  preview: "Collapsible content panels",    html: "", placement: "inline"  },
  { id: "tabs",            label: "Tabs",             cat: "layout", icon: "⊟",  preview: "CSS-only tabbed panels",        html: "", placement: "inline"  },
  { id: "step-list",       label: "Steps",            cat: "layout", icon: "①",  preview: "Numbered step-by-step list",    html: "", placement: "inline"  },

  // ── Form primitives ──────────────────────────────────────────────────────────
  { id: "text-input",      label: "Text Input",       cat: "form",   icon: "⌨",  preview: "Single-line input field",       html: "", placement: "inline"  },
  { id: "textarea-field",  label: "Textarea",         cat: "form",   icon: "≣",  preview: "Multi-line message field",      html: "", placement: "inline"  },
  { id: "select-field",    label: "Select",           cat: "form",   icon: "▾",  preview: "Dropdown selection field",      html: "", placement: "inline"  },
  { id: "checkbox-field",  label: "Checkbox",         cat: "form",   icon: "☑",  preview: "Single checkbox row",           html: "", placement: "inline"  },
  { id: "radio-group",     label: "Radio Group",      cat: "form",   icon: "◉",  preview: "Multiple choice radio options", html: "", placement: "inline"  },
  { id: "toggle-switch",   label: "Toggle",           cat: "form",   icon: "⏽",  preview: "On/off switch row",             html: "", placement: "inline"  },

  // ── Text extras ──────────────────────────────────────────────────────────────
  { id: "list",            label: "Bullet List",     cat: "text",   icon: "☰",  preview: "Styled bullet list",            html: "", placement: "inline"  },
  { id: "icon-list",       label: "Check List",      cat: "text",   icon: "✓",  preview: "Checklist with tick icons",     html: "", placement: "inline"  },
  { id: "pill-list",       label: "Pill Tags",        cat: "text",   icon: "◎",  preview: "Row of keyword pill tags",      html: "", placement: "inline"  },
  { id: "highlight-text",  label: "Highlight Text",  cat: "text",   icon: "▌",  preview: "Text with color highlight",     html: "", placement: "inline"  },
  { id: "table",           label: "Table",            cat: "text",   icon: "⊞",  preview: "Data table with header row",    html: "", placement: "inline"  },
  { id: "code-block",      label: "Code Block",       cat: "text",   icon: "⟨⟩", preview: "Dark syntax-highlighted block", html: "", placement: "inline"  },
  { id: "alert",           label: "Alert",            cat: "text",   icon: "!",  preview: "Info / warning alert notice",   html: "", placement: "inline"  },
  { id: "text-link",       label: "Link",             cat: "text",   icon: "↗",  preview: "Styled hyperlink with arrow",   html: "", placement: "inline"  },

  // ── Media extras ─────────────────────────────────────────────────────────────
  { id: "icon-circle",     label: "Icon Circle",     cat: "media",  icon: "◈",  preview: "SVG icon in a colored circle",  html: "", placement: "inline"  },
  { id: "avatar",          label: "Avatar",           cat: "media",  icon: "◯",  preview: "Photo with name and role",      html: "", placement: "inline"  },
  { id: "avatar-group",    label: "Avatar Group",     cat: "media",  icon: "⊕",  preview: "Stacked avatars with count",    html: "", placement: "inline"  },
  { id: "rating",          label: "Star Rating",      cat: "media",  icon: "★",  preview: "Star rating with score text",   html: "", placement: "inline"  },
  { id: "social-links",    label: "Social Links",     cat: "media",  icon: "↗",  preview: "Social media icon buttons",     html: "", placement: "inline"  },
  { id: "map-embed",       label: "Map Embed",        cat: "media",  icon: "◎",  preview: "Embedded Google Maps iframe",   html: "", placement: "inline"  },

  // ── Decorative inline ────────────────────────────────────────────────────────
  { id: "progress-bar",    label: "Progress Bar",     cat: "decorative", icon: "▬",  preview: "Labeled progress bar",      html: "", placement: "inline"  },
  { id: "counter-stat",    label: "Counter Stat",     cat: "decorative", icon: "#",  preview: "Large number + label",      html: "", placement: "inline"  },
  { id: "notification",    label: "Notification",     cat: "decorative", icon: "◎",  preview: "Notification toast card",   html: "", placement: "inline"  },
  { id: "countdown",       label: "Countdown",        cat: "decorative", icon: "◷",  preview: "Countdown timer display",   html: "", placement: "inline"  },
  { id: "tag-cloud",       label: "Tag Cloud",        cat: "decorative", icon: "⊞",  preview: "Mixed-size tag cloud",      html: "", placement: "inline"  },

  // ── More section blocks ───────────────────────────────────────────────────────
  { id: "blog-grid",       label: "Blog Grid",        cat: "cards",  icon: "▦",  preview: "3 blog post cards with meta",   html: "", placement: "section" },
  { id: "contact",         label: "Contact",          cat: "cta",    icon: "✉",  preview: "Info + form split section",     html: "", placement: "section" },
  { id: "comparison",      label: "Comparison",       cat: "cards",  icon: "⊘",  preview: "Feature comparison table",      html: "", placement: "section" },
  { id: "gallery-masonry", label: "Gallery Masonry",  cat: "media",  icon: "▥",  preview: "Multi-row asymmetric gallery",  html: "", placement: "section" },
  { id: "video-section",   label: "Video Section",    cat: "media",  icon: "▶",  preview: "Full-width video hero section", html: "", placement: "section" },

  // ── Decorative shapes (inline) ────────────────────────────────────────────────
  { id: "shape-circle",    label: "Circle",           cat: "decorative", icon: "●",  preview: "Solid filled circle",       html: "", placement: "inline"  },
  { id: "shape-ring",      label: "Ring",             cat: "decorative", icon: "○",  preview: "Hollow circle ring",        html: "", placement: "inline"  },
  { id: "shape-square",    label: "Square",           cat: "decorative", icon: "■",  preview: "Solid rounded square",      html: "", placement: "inline"  },
  { id: "shape-diamond",   label: "Diamond",          cat: "decorative", icon: "◆",  preview: "Rotated diamond shape",     html: "", placement: "inline"  },
  { id: "shape-triangle",  label: "Triangle",         cat: "decorative", icon: "▲",  preview: "Upward pointing triangle",  html: "", placement: "inline"  },
  { id: "shape-pill",      label: "Pill",             cat: "decorative", icon: "▬",  preview: "Elongated pill capsule",    html: "", placement: "inline"  },
  { id: "shape-line",      label: "Decorative Line",  cat: "decorative", icon: "─",  preview: "Styled horizontal rule",    html: "", placement: "inline"  },
  { id: "shape-blob",      label: "Blob",             cat: "decorative", icon: "◐",  preview: "Organic SVG blob shape",    html: "", placement: "inline"  },
  { id: "shape-cross",     label: "Cross / Plus",     cat: "decorative", icon: "+",  preview: "Plus sign shape",           html: "", placement: "inline"  },
  { id: "shape-dots",      label: "Dot Grid",         cat: "decorative", icon: "⠿",  preview: "Decorative dot grid pattern", html: "", placement: "inline" },

  // ── Decorative sections ───────────────────────────────────────────────────────
  { id: "wave-divider",    label: "Wave Divider",     cat: "decorative", icon: "∿",  preview: "SVG wave section divider",  html: "", placement: "section" },
  { id: "banner",          label: "Banner Strip",     cat: "decorative", icon: "▭",  preview: "Announcement banner bar",   html: "", placement: "top"     },
  { id: "alert-bar",       label: "Alert Bar",        cat: "decorative", icon: "⚠",  preview: "Colored alert notice strip",html: "", placement: "section" },
  { id: "shape-row",       label: "Shape Row",        cat: "decorative", icon: "◐",  preview: "Row of decorative shapes",  html: "", placement: "section" },
];

export const BLOCK_CATS = [
  { key: "all",        label: "All"        },
  { key: "layout",     label: "Layout"     },
  { key: "nav",        label: "Nav"        },
  { key: "text",       label: "Text"       },
  { key: "cards",      label: "Cards"      },
  { key: "cta",        label: "CTA"        },
  { key: "media",      label: "Media"      },
  { key: "form",       label: "Forms"      },
  { key: "decorative", label: "Decorative" },
];
