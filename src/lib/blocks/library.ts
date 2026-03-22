export type BlockPlacement = "top" | "section" | "inline" | "bottom";

export interface Block {
  id: string;
  label: string;
  cat: "layout" | "nav" | "text" | "media" | "cards" | "cta" | "form";
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
  { id: "video",           label: "Video",           cat: "media",  icon: "▶",  preview: "Video embed / placeholder",     html: "", placement: "inline"  },
  { id: "icon-block",      label: "Icon Block",      cat: "media",  icon: "◈",  preview: "Icon + label + text",           html: "", placement: "inline"  },
  { id: "card",            label: "Card",            cat: "cards",  icon: "▭",  preview: "Single content card",           html: "", placement: "inline"  },
  { id: "contact-form",    label: "Contact Form",    cat: "form",   icon: "✎",  preview: "Name / email / message form",   html: "", placement: "inline"  },
];

export const BLOCK_CATS = [
  { key: "all",    label: "All"    },
  { key: "layout", label: "Layout" },
  { key: "nav",    label: "Nav"    },
  { key: "text",   label: "Text"   },
  { key: "cards",  label: "Cards"  },
  { key: "cta",    label: "CTA"    },
  { key: "media",  label: "Media"  },
  { key: "form",   label: "Forms"  },
];
