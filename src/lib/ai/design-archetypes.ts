import type { SiteBrief } from "@/types";
import type { AIDesignStyle, ProjectTypographyStyle, ProjectSpacingStyle } from "@/types";

// ─── Design Archetype Interface ──────────────────────────────────────────────

export interface DesignArchetype {
  name: string;
  description: string;
  visualMotifs: string[];
  colorGuidance: string;
  typographyGuidance: string;
  spacingMood: string;
  componentStyle: string;
  navbarStyle: string;
  footerStyle: string;
  antiPatterns: string[];
  cssPatterns: string[];
}

// ─── Design Archetypes ───────────────────────────────────────────────────────

export const DESIGN_ARCHETYPES: Partial<Record<AIDesignStyle, DesignArchetype>> = {
  minimal: {
    name: "Minimal",
    description:
      "Clean, Swiss-inspired design rooted in the International Typographic Style. Every element earns its place. Content breathes in generous whitespace, and the layout relies on invisible grids and precise alignment rather than decoration.",
    visualMotifs: [
      "generous whitespace between all elements",
      "invisible grid-based alignment",
      "single thin-rule dividers instead of heavy borders",
      "monochrome photography with desaturated tones",
      "precise geometric shapes used sparingly",
      "content centered in narrow readable columns (max-w-2xl to max-w-4xl)",
    ],
    colorGuidance:
      "Predominantly monochrome — white or off-white backgrounds (#FAFAFA, #F5F5F5) with near-black text (#111, #1A1A1A). Use ONE accent color sparingly for links, CTAs, and interactive states. The accent should feel intentional — a single hue with maybe one tint. Avoid multi-color palettes. Background sections can alternate between white and the lightest neutral gray.",
    typographyGuidance:
      "Use geometric or neo-grotesque sans-serifs: Inter, Helvetica Neue, Suisse Int'l, or Neue Haas Grotesk. Keep font weights to two: regular (400) for body, medium or semibold (500-600) for headings. Headings should be modestly sized (text-3xl to text-5xl) — let whitespace create hierarchy, not scale. Line-height should be generous (1.6-1.75 for body).",
    spacingMood: "airy and breathing — every element has room to exist on its own",
    componentStyle:
      "Borderless or single thin-border (1px, border-gray-200) containers. No shadows or extremely subtle ones (shadow-sm at most). Buttons are minimal — outline style or solid with no border-radius beyond rounded-md. Cards are flat with no elevation. Forms use underline-style inputs or very subtle bordered fields.",
    navbarStyle:
      "Ultra-clean horizontal bar with logo left and sparse text links right. No background color — transparent or white with a thin bottom border (border-b border-gray-100). Links are plain text, no hover backgrounds — just color change. Minimal height (h-14 to h-16). No hamburger menu icon styling — keep it functional. Consider a single-line layout with generous letter-spacing on nav links.",
    footerStyle:
      "Simple one-line or two-row footer. Logo + essential links + copyright on one line. No multi-column grids, no newsletter forms. Light gray text on white, separated by thin top border. Minimal padding (py-8).",
    antiPatterns: [
      "gradients of any kind",
      "drop shadows or elevated cards",
      "decorative background elements or patterns",
      "busy or textured backgrounds",
      "more than one accent color",
      "large bold hero banners with overlay text on images",
      "icon-heavy feature grids",
      "rounded pill buttons or large border-radius",
    ],
    cssPatterns: [
      "border: 1px solid theme('colors.gray.200')",
      "max-width containers (max-w-3xl, max-w-4xl) for readable content",
      "gap utilities for consistent spacing (gap-8, gap-12)",
      "text-gray-900 for headings, text-gray-600 for secondary text",
      "tracking-tight on headings for a polished geometric feel",
      "transition-colors for subtle hover state changes",
    ],
  },

  luxury: {
    name: "Luxury",
    description:
      "High-end editorial elegance evoking fashion houses, boutique hotels, and premium brands. Dark, rich backgrounds anchor the design while metallic and cream accents add sophistication. Every detail should feel curated — from letter-spacing to the weight of a divider line.",
    visualMotifs: [
      "dark backgrounds (#0A0A0A, #111111, #1C1917) as primary surfaces",
      "gold, champagne, or warm cream accents (#C9A96E, #D4AF37, #F5F0EB)",
      "full-bleed hero images with dark overlays (bg-black/40)",
      "thin decorative horizontal rules between sections",
      "subtle parallax scrolling on hero imagery",
      "asymmetric image and text pairings with generous negative space",
    ],
    colorGuidance:
      "Dark-first palette: primary backgrounds in near-black (#0C0C0C) or very deep warm neutrals (#1C1917). Text in off-white (#F5F0EB) or warm cream (#E8E0D5). Accent color should be metallic gold (#C9A96E), rose gold (#B76E79), or warm brass (#D4A853). Use accent sparingly — on CTAs, decorative lines, and hover states. Never pair dark backgrounds with bright saturated colors. Secondary sections can use deep charcoal (#1A1A1A) for subtle contrast.",
    typographyGuidance:
      "Serif headings are mandatory — use Playfair Display, Cormorant Garamond, or DM Serif Display. Apply wide letter-spacing on headings (tracking-wide or tracking-widest, especially on all-caps subheadings). Body text in a refined sans-serif like Outfit, Jost, or Libre Franklin at light weight (300-400). Font sizes should be generous — hero headings at text-6xl to text-8xl. All-caps small-text labels with tracking-[0.2em] for category tags and section labels.",
    spacingMood: "generous and unhurried — sections breathe with 80px-120px vertical padding",
    componentStyle:
      "Cards with subtle warm-toned borders (border-stone-800). Buttons are slim, wide, uppercase, with tracking-widest and minimal padding-y. Image containers with slight overlapping or offset positioning. Dividers are thin gold or cream lines. No rounded corners beyond rounded-sm. Hover states use opacity transitions or underline reveals.",
    navbarStyle:
      "Dark background (bg-black or bg-stone-950) with logo left in gold/cream. Navigation links in uppercase small text with tracking-[0.15em], spaced widely. Thin gold bottom border or no border. Consider a full-width layout with generous side padding (px-8 to px-12). Links use opacity or underline-reveal hover. Height h-16 to h-20. CTA button if present should be slim outlined with gold border.",
    footerStyle:
      "Dark full-width footer with multi-column layout. Thin gold divider at top. Logo and tagline left column, link categories in middle columns, social links right. All text cream/off-white with opacity variations. Generous vertical padding (py-16 to py-24). Bottom bar with copyright and legal links separated by thin line.",
    antiPatterns: [
      "bright neon or saturated primary colors",
      "large rounded pill buttons",
      "playful or handwritten fonts",
      "cramped layouts with small padding",
      "generic card grids with equal spacing",
      "stock-photo-style hero sections with centered text",
      "white backgrounds as primary surface",
      "emoji or illustrated accents",
    ],
    cssPatterns: [
      "bg-[#0C0C0C] or bg-stone-950 for primary backgrounds",
      "text-[#F5F0EB] for warm off-white body text",
      "tracking-[0.15em] uppercase on labels and small headings",
      "py-20 md:py-32 for generous section spacing",
      "bg-gradient-to-b from-black/60 to-transparent for image overlays",
      "border-[#C9A96E]/20 for subtle metallic border accents",
      "transition-opacity duration-500 for elegant hover reveals",
    ],
  },

  playful: {
    name: "Playful",
    description:
      "Vibrant, energetic, and unapologetically fun. This style uses bold saturated colors, rounded shapes, and bouncy motion to create a sense of joy and approachability. Layouts are dynamic and slightly asymmetric, with illustrated accents and a hand-crafted feel.",
    visualMotifs: [
      "bold saturated color blocks as section backgrounds",
      "rounded corners on everything (rounded-2xl, rounded-3xl)",
      "illustrated accents, doodles, or blob shapes",
      "asymmetric and slightly tilted element placement",
      "colorful shadows (shadow-xl with colored tints)",
      "sticker-like badges and labels with rotation transforms",
    ],
    colorGuidance:
      "Use 3-4 bold saturated colors — think primary blue (#3B82F6), vivid orange (#F97316), hot pink (#EC4899), lime green (#84CC16). Backgrounds can be pastel tints of these (#FEF3C7, #DBEAFE, #FCE7F3) or clean white. Text should be very dark (near-black) for readability on light backgrounds, or white on saturated backgrounds. Mix and match background colors across sections. Avoid muted or desaturated palettes.",
    typographyGuidance:
      "Use rounded or friendly sans-serif fonts: Nunito, Quicksand, Poppins, Baloo 2, or Comfortaa. Headings should be bold (700-800) and can be extra-large (text-5xl to text-7xl). Body text in a clean rounded sans like Nunito or DM Sans at regular weight. Feel free to use fun display fonts for callouts. Mix font sizes more dramatically than usual for visual energy.",
    spacingMood: "dynamic and varied — some sections tight and energetic, others open and breathing",
    componentStyle:
      "Cards with large border-radius (rounded-2xl or rounded-3xl), colored backgrounds, and playful shadows (shadow-lg with slight color tint). Buttons are chunky with generous padding, full rounded-full corners, and bold text. Badges and tags are pill-shaped with vibrant fills. Image containers have rounded corners and may overlap other elements slightly. Use rotation transforms (-rotate-2, rotate-1) on cards or images for a casual feel.",
    navbarStyle:
      "Rounded floating navbar with colored background (bg-primary or a pastel tint), rounded-full or rounded-2xl shape, centered or with generous padding. Logo can be colorful/illustrated. Nav links are bold weight with slightly larger size. Consider a pill-shaped active indicator on the current page link. CTA button is chunky rounded-full with contrasting color. Maybe a slight shadow-lg for floating feel. Fun hover effects (scale or color pop).",
    footerStyle:
      "Colorful footer section with a different bold background color from the rest of the page. Rounded cards or bubble shapes for link groups. Social icons in colored circles. Fun CTA or newsletter signup with playful copy. Generous padding with large rounded shapes. Footer can feel like its own vibrant section rather than an afterthought.",
    antiPatterns: [
      "dark moody color schemes",
      "thin serif or didone fonts",
      "corporate or formal language",
      "rigid symmetric grid layouts",
      "monochrome or greyscale palettes",
      "sharp 0px border-radius anywhere",
      "thin 1px borders as primary visual structure",
      "heavy long-form text blocks",
    ],
    cssPatterns: [
      "rounded-2xl and rounded-3xl on cards and containers",
      "bg-gradient-to-br from-pink-400 to-orange-400 for vibrant gradients",
      "shadow-lg shadow-pink-500/20 for colored shadows",
      "rotate-[-2deg] or rotate-[1deg] on cards for casual placement",
      "-translate-y-1 hover:-translate-y-2 transition-transform for bouncy hover",
      "ring-4 ring-offset-2 ring-yellow-400 for playful focus states",
      "animate-bounce or custom spring animations for micro-interactions",
    ],
  },

  brutalist: {
    name: "Brutalist",
    description:
      "Raw, confrontational, and deliberately unpolished. Brutalist web design strips away conventional polish to expose the bones of the page. Heavy borders, monospace type, extreme contrast, and intentionally rough visual choices create a powerful anti-aesthetic that commands attention.",
    visualMotifs: [
      "thick black borders (2px-4px) on everything",
      "oversized typography that dominates the viewport",
      "high contrast — pure black and pure white as primary",
      "one pop color used aggressively (red, yellow, or electric blue)",
      "exposed grid structures and visible layout scaffolding",
      "intentionally misaligned or overlapping elements",
    ],
    colorGuidance:
      "Strictly high-contrast: pure black (#000000) and pure white (#FFFFFF) as the foundation. Add exactly ONE pop color used boldly — classic brutalist choices are red (#FF0000), yellow (#FFFF00), or electric blue (#0000FF). Use the pop color for highlights, selected text backgrounds, or accent blocks. No gradients, no tints, no in-between grays. If using a dark background, invert to white text and borders.",
    typographyGuidance:
      "Monospace fonts are essential — use Space Mono, JetBrains Mono, IBM Plex Mono, or Courier Prime. Headings should be massive (text-6xl to text-9xl) and may use all-caps or all-lowercase. Body text can be monospace or a stark grotesque like Helvetica or Arial. Letter-spacing should be default or tight — never wide-spaced elegance. Line-height can be tighter than normal (1.3-1.4) to create density. Mix font sizes dramatically.",
    spacingMood: "dense and packed — elements sit close together with thick borders as separators",
    componentStyle:
      "Everything has thick visible borders (border-2 or border-4, border-black). Absolutely zero border-radius — all corners sharp. Buttons are rectangular with thick borders, uppercase text, and no shadow. Cards are bordered boxes stacked tightly. Hover states are blunt — background color swap or border color change, no smooth transitions. Links are underlined always, not just on hover. Form inputs have thick borders.",
    navbarStyle:
      "Thick-bordered bar (border-b-4 border-black) spanning full width. Logo in bold monospace or oversized uppercase. Nav links in monospace, all-caps, underlined. No hover transitions — instant color swap on hover (hover:bg-black hover:text-white). No rounded corners anywhere. Consider a stacked/vertical nav or an unconventional layout (links scattered, not aligned). Active page link can have inverted colors (bg-black text-white).",
    footerStyle:
      "Thick top border (border-t-4 border-black). Minimal content — maybe just a single line of monospace text with links separated by pipes or slashes. Or a bold stacked layout with each link on its own bordered row. No columns, no icons. Raw and exposed. Copyright in monospace. Consider making it feel like a terminal output.",
    antiPatterns: [
      "gradients of any kind",
      "soft box-shadows or elevated cards",
      "border-radius on any element (rounded-none everywhere)",
      "polished corporate aesthetic",
      "smooth transitions or subtle animations",
      "light gray borders or muted color choices",
      "conventional hero-features-testimonials layouts",
      "elegant serif fonts or script typefaces",
    ],
    cssPatterns: [
      "border-2 border-black or border-4 border-black on containers",
      "rounded-none on every element — override all defaults",
      "text-7xl md:text-9xl font-bold for oversized headings",
      "font-mono on body or key sections",
      "bg-[#FF0000] or bg-yellow-400 for aggressive accent blocks",
      "hover:bg-black hover:text-white for blunt state changes",
      "mix-blend-difference for overlay text effects",
      "outline outline-2 outline-offset-4 for focus states",
    ],
  },

  editorial: {
    name: "Editorial",
    description:
      "Magazine and newspaper-inspired design with a strong focus on typographic hierarchy and reading experience. Multi-column layouts, pull quotes, decorative rules, and considered type scales create a sophisticated content-first experience that prioritizes the written word.",
    visualMotifs: [
      "multi-column text layouts (2-3 columns on desktop)",
      "large drop caps at the start of content sections",
      "pull quotes with decorative quotation marks or left borders",
      "thin horizontal rules and decorative dividers between sections",
      "mixed serif-and-sans typography creating visual rhythm",
      "asymmetric layouts with text wrapping around images",
    ],
    colorGuidance:
      "Restrained, print-inspired palette. Warm white or cream backgrounds (#FFFFF8, #FAF9F6, #F5F1EB). Very dark text (#1A1A1A, #2D2D2D). One muted accent for links and interactive elements — deep red (#8B2500), navy (#1B365D), or forest green (#2D5016). Section backgrounds can alternate between white and warm cream. Use color sparingly and purposefully, like a magazine editor choosing a spot color.",
    typographyGuidance:
      "Strong serif/sans pairing is the backbone. Headings in a high-contrast serif: Playfair Display, Lora, Libre Baskerville, or Source Serif Pro — set large (text-4xl to text-6xl) with normal or tight tracking. Body text in a clean sans-serif: Source Sans Pro, Libre Franklin, or Inter at 16-18px with generous line-height (1.7-1.8). Use italic styles for pull quotes and bylines. Small caps (font-variant: small-caps) for author names, dates, and section labels.",
    spacingMood: "structured and rhythmic — consistent vertical rhythm with purposeful density in text areas",
    componentStyle:
      "Minimal card usage — content flows in columns and text blocks. Section dividers are thin horizontal rules (border-t border-gray-300) or decorative elements. Pull quotes are indented with a thick left border or oversized quotation marks. Images are placed asymmetrically within text flow, sometimes full-bleed, sometimes inset. Navigation is text-heavy with category links. No chunky buttons — CTAs are text links or slim bordered buttons.",
    navbarStyle:
      "Newspaper/magazine masthead feel. Site name large and centered in serif font, with navigation links below in a separate row — or a horizontal rule separating masthead from content. Nav links are text-only, separated by middots (·) or thin vertical bars, in small-caps or uppercase with wide tracking. Consider a two-row header: top row = logo/masthead, bottom row = category/section links. Thin borders above and below nav. No background fill — white/cream with black text.",
    footerStyle:
      "Multi-column editorial footer like a newspaper classified section. Organized link categories with small bold headings. Thin horizontal rules between groups. Text-heavy, small font sizes (text-xs to text-sm). Colophon line at bottom with publication/copyright info in italic. Muted colors on warm white background.",
    antiPatterns: [
      "generic card grids with icons",
      "icon-heavy feature sections",
      "standard centered hero with big CTA button",
      "symmetric three-column layouts for everything",
      "chunky pill-shaped buttons",
      "lots of background colors or gradients",
      "minimal whitespace-heavy layouts with little content",
      "tech-startup visual language",
    ],
    cssPatterns: [
      "columns-2 md:columns-3 for multi-column text flow",
      "first-letter:text-6xl first-letter:font-serif first-letter:float-left for drop caps",
      "border-l-4 border-gray-900 pl-6 italic for pull quotes",
      "font-serif for headings, font-sans for body (mixed pairing)",
      "max-w-prose (65ch) for optimal reading line length",
      "leading-relaxed or leading-loose (1.7-1.8) for body text",
      "border-t border-gray-300 my-12 for section dividers",
    ],
  },

  futuristic: {
    name: "Futuristic",
    description:
      "Sci-fi and tech-forward design evoking advanced interfaces, holograms, and cyberpunk aesthetics. Dark environments with neon accents, glassmorphism, glowing edges, and grid overlays create a feeling of looking at a next-generation interface.",
    visualMotifs: [
      "dark backgrounds (#0A0A0F, #0D1117, #000814) as primary canvas",
      "neon accents — cyan (#00F0FF), electric purple (#A855F7), hot magenta (#FF006E)",
      "glassmorphism panels with backdrop-blur and semi-transparent backgrounds",
      "subtle grid or dot-matrix overlays on backgrounds",
      "glowing borders and text using box-shadow and text-shadow with neon colors",
      "animated gradient borders or accent lines",
    ],
    colorGuidance:
      "Deep dark backgrounds — near-black with a cool undertone (#0A0A0F, #0D1117). Primary accent in a single neon hue: cyan (#00F0FF), electric green (#39FF14), or neon purple (#BF00FF). Secondary accent can be a complementary neon (cyan + magenta, green + purple). Text in cool gray-white (#E2E8F0) or pure white. Use neon colors for borders, glows, interactive states, and highlights — never as large background fills. Gradients are allowed but should be dark-to-dark with neon tints.",
    typographyGuidance:
      "Mix monospace details with clean geometric sans-serifs. Headings in a geometric sans: Space Grotesk, Orbitron, Exo 2, or Rajdhani. Body text in Inter, DM Sans, or a technical sans. Use monospace (JetBrains Mono, Fira Code) for labels, data, stats, and technical details. Headings can be bold and large. Consider using all-caps with wide tracking for section labels and tags.",
    spacingMood: "structured and grid-aligned — precise spacing suggesting engineered interface panels",
    componentStyle:
      "Glassmorphism cards: bg-white/5 backdrop-blur-xl border border-white/10 with subtle rounded corners (rounded-lg). Buttons have glowing borders or neon outlines with hover glow intensification. Data displays use monospace with tabular alignment. Grid overlays (via pseudo-elements or SVG) create a technical background texture. Borders glow using box-shadow with neon colors. Navigation feels like a HUD — compact, monospace labels, active states with neon underlines.",
    navbarStyle:
      "HUD-style navigation — glassmorphism bar (bg-white/5 backdrop-blur-xl border-b border-white/10) floating over dark background. Logo in geometric sans or stylized monospace. Nav links in monospace or small caps with neon hover glow (text-shadow with cyan/green). Active link has a neon underline or glowing dot indicator. Consider a centered floating pill navbar (mx-auto max-w-4xl rounded-2xl) hovering over content. Subtle animated border gradient on the navbar edge.",
    footerStyle:
      "Dark footer with grid/dot-matrix background texture. Glassmorphism panels for link groups. Neon accent borders or glowing dividers. Social links with neon hover effects. Tech-styled copyright with monospace font. Consider a terminal-like output style or data-readout aesthetic. Subtle animated elements (pulsing dots, scanning lines).",
    antiPatterns: [
      "warm earthy or natural tones (browns, tans, olive)",
      "traditional serif fonts or calligraphic scripts",
      "vintage or retro aesthetic elements",
      "simple flat design without depth or glow effects",
      "white or light backgrounds as primary surfaces",
      "rounded-full pill shapes (too friendly for the aesthetic)",
      "handwritten or illustrated accents",
      "conventional magazine or editorial layouts",
    ],
    cssPatterns: [
      "bg-[#0A0A0F] or bg-slate-950 for deep dark backgrounds",
      "backdrop-blur-xl bg-white/5 border border-white/10 for glass panels",
      "shadow-[0_0_15px_rgba(0,240,255,0.3)] for neon glow effects",
      "text-shadow: 0 0 10px rgba(0,240,255,0.5) for glowing text",
      "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 for subtle gradient sections",
      "animate-pulse on accent elements for a living-interface feel",
      "bg-[radial-gradient(circle_at_center,_rgba(0,240,255,0.03)_1px,_transparent_1px)] bg-[length:24px_24px] for dot-grid overlays",
    ],
  },
};

// ─── Font Pairing Interface ──────────────────────────────────────────────────

export interface FontPairing {
  heading: string;
  body: string;
  style: string;
  bestFor: string[];
}

// ─── Font Pairings ───────────────────────────────────────────────────────────

export const FONT_PAIRINGS: Record<string, FontPairing[]> = {
  "modern-sans": [
    {
      heading: "Syne",
      body: "Manrope",
      style: "Distinctive display character with refined contemporary body text",
      bestFor: ["SaaS", "tech startups", "developer tools", "fintech"],
    },
    {
      heading: "Outfit",
      body: "Public Sans",
      style: "Confident, polished, and modern without reading like a default template",
      bestFor: ["apps", "marketplaces", "modern brands", "health tech"],
    },
    {
      heading: "Sora",
      body: "Instrument Sans",
      style: "Geometric precision with a sharper editorial edge",
      bestFor: ["AI products", "design tools", "creative platforms"],
    },
    {
      heading: "Urbanist",
      body: "Work Sans",
      style: "Crisp geometric display with grounded readable body copy",
      bestFor: ["e-commerce", "consumer products", "lifestyle brands"],
    },
    {
      heading: "Red Hat Display",
      body: "Albert Sans",
      style: "Structured and versatile with more character than generic product UI fonts",
      bestFor: ["dashboards", "productivity tools", "B2B products"],
    },
  ],

  "editorial-serif": [
    {
      heading: "Playfair Display",
      body: "Source Serif 4",
      style: "High-contrast editorial elegance with grounded long-form body text",
      bestFor: ["magazines", "luxury brands", "editorial sites", "wine & dining"],
    },
    {
      heading: "Fraunces",
      body: "Alegreya",
      style: "Expressive old-style serif paired with warm literary body copy",
      bestFor: ["artisan brands", "creative agencies", "cultural institutions"],
    },
    {
      heading: "Bodoni Moda",
      body: "Literata",
      style: "Sharp luxury display serif paired with elegant editorial reading text",
      bestFor: ["fashion", "beauty", "hospitality", "premium retail"],
    },
    {
      heading: "Cormorant Garamond",
      body: "Crimson Pro",
      style: "Refined and classical with stronger rhythm and clarity",
      bestFor: ["law firms", "financial advisors", "heritage brands", "galleries"],
    },
    {
      heading: "Libre Caslon Display",
      body: "Newsreader",
      style: "Traditional Caslon elegance with a literary modern reading voice",
      bestFor: ["publishers", "journalism", "book sites", "nonprofits"],
    },
  ],

  "product-sans": [
    {
      heading: "Urbanist",
      body: "Manrope",
      style: "Confident geometric display with a polished product-writing body font",
      bestFor: ["product sites", "startups", "brand sites"],
    },
    {
      heading: "Albert Sans",
      body: "Instrument Sans",
      style: "Contemporary geometric pairing with crisp UI readability",
      bestFor: ["design agencies", "portfolio sites", "creative tools"],
    },
    {
      heading: "Lexend",
      body: "Public Sans",
      style: "Bold geometric display with a pragmatic, clean companion",
      bestFor: ["tech companies", "landing pages", "media brands"],
    },
    {
      heading: "Geologica",
      body: "Work Sans",
      style: "Modern geometric warmth with more restraint and clarity",
      bestFor: ["health & wellness", "education", "consumer apps"],
    },
    {
      heading: "Red Hat Display",
      body: "DM Sans",
      style: "Polished product typography with visible personality",
      bestFor: ["SaaS dashboards", "corporate sites", "enterprise products"],
    },
  ],

  "monospace-tech": [
    {
      heading: "JetBrains Mono",
      body: "IBM Plex Sans",
      style: "Developer-focused monospace with an industrial sans companion",
      bestFor: ["developer tools", "code editors", "CLI products", "open source"],
    },
    {
      heading: "Space Mono",
      body: "Work Sans",
      style: "Quirky monospace personality with geometric body text",
      bestFor: ["creative tech", "experimental sites", "brutalist designs"],
    },
    {
      heading: "Fira Code",
      body: "Fira Sans",
      style: "Cohesive mono/sans family for technical documentation",
      bestFor: ["documentation", "API references", "technical blogs"],
    },
  ],

  "display-bold": [
    {
      heading: "Josefin Sans",
      body: "Public Sans",
      style: "Strong geometric display with clean, understated support text",
      bestFor: ["agencies", "bold brand sites", "creative portfolios"],
    },
    {
      heading: "Archivo Black",
      body: "Manrope",
      style: "Heavy graphic impact with a smoother, premium body counterweight",
      bestFor: ["music", "events", "entertainment", "streetwear"],
    },
    {
      heading: "Bricolage Grotesque",
      body: "Instrument Sans",
      style: "Eclectic display with grounded modern body text",
      bestFor: ["creative studios", "culture sites", "innovative brands"],
    },
  ],
};

export function selectFontPairingForBrief(
  brief: SiteBrief,
  typographyStyleOverride?: ProjectTypographyStyle
): FontPairing {
  const typographyStyle = typographyStyleOverride ?? brief.defaultTypographyStyle ?? "modern-sans";
  const fontCategory = FONT_PAIRINGS[typographyStyle] ?? FONT_PAIRINGS["modern-sans"];
  const pairingIndex = hashBriefForVariety(brief) % fontCategory.length;
  return fontCategory[pairingIndex];
}

// ─── Spacing Scales ──────────────────────────────────────────────────────────

export const SPACING_SCALES: Record<
  string,
  { sectionPadding: string; innerGap: string; guidance: string }
> = {
  compact: {
    sectionPadding: "py-12 md:py-16",
    innerGap: "gap-4 md:gap-6",
    guidance:
      "Use tight spacing to create density and visual energy. Sections flow quickly into one another. Best for content-heavy sites, dashboards, and information-dense layouts. Keep padding consistent but minimal — let borders or background color changes define section breaks instead of large empty space.",
  },
  balanced: {
    sectionPadding: "py-16 md:py-24",
    innerGap: "gap-6 md:gap-8",
    guidance:
      "Standard comfortable spacing that works for most sites. Sections have clear breathing room without feeling sparse. Inner elements are grouped with moderate gaps. This is the safe default — use it when the brand doesn't have a strong opinion on density.",
  },
  airy: {
    sectionPadding: "py-24 md:py-36",
    innerGap: "gap-8 md:gap-12",
    guidance:
      "Generous whitespace that lets every element breathe. Sections feel like distinct chapters with significant vertical separation. Best for luxury, minimal, and portfolio sites where negative space is a design tool. Inner elements should still feel grouped, but the overall page rhythm is slow and deliberate.",
  },
};

// ─── Global Anti-Patterns ────────────────────────────────────────────────────

export const GLOBAL_ANTI_PATTERNS: string[] = [
  "Do NOT default to Inter or Roboto for every site — choose fonts that match the brand personality",
  "Do NOT use purple-to-blue gradients unless specifically requested — this is the most overused gradient in web design",
  "Do NOT create symmetric 3-column card grids for every features section — vary layouts with asymmetric, staggered, or list-based alternatives",
  "Do NOT use the same hero → features → testimonials → CTA → footer pattern for every site — the page structure should reflect the actual content needs",
  "Do NOT use placeholder Lorem Ipsum — write realistic copy that sounds like it belongs to the actual business",
  "Avoid generic stock-photo-feeling layouts where images are purely decorative rectangles with no relationship to content",
  "Never use the same border-radius on every element — vary it intentionally (e.g. sharp cards with rounded buttons, or vice versa)",
  "Do NOT center-align all text — use left-alignment for readability and only center short headings or CTAs",
  "Avoid putting too many CTAs on a single page — one primary action per section maximum",
  "Do NOT make every section full-width — use max-width containers and vary section widths for visual rhythm",
  "Avoid purely decorative icons from generic icon packs that add no real information to the layout",
  "Do NOT use the same background color for every section — alternate or vary backgrounds to create visual separation",
];

// ─── Helper: Build Design Guidance ───────────────────────────────────────────

/**
 * Assembles all relevant design guidance into a single string block
 * that can be injected into AI generation prompts. Picks the right
 * archetype, fonts, spacing, and anti-patterns based on the site brief.
 */
export function buildDesignGuidance(brief: SiteBrief): string {
  const designStyle = brief.generationDesignStyle ?? "minimal";
  const layoutSpacing = brief.defaultLayoutSpacing ?? "balanced";
  const isCreative = brief.creativeMode?.surpriseMe === true;

  const archetype =
    DESIGN_ARCHETYPES[designStyle] ?? DESIGN_ARCHETYPES["minimal"]!;
  const spacing = SPACING_SCALES[layoutSpacing] ?? SPACING_SCALES["balanced"];
  const fonts = selectFontPairingForBrief(brief);

  const sections: string[] = [];

  // ── Design Archetype ───────────────────────────────────────────────────────

  sections.push(`## Design Style: ${archetype.name}
${archetype.description}

Visual Motifs:
${archetype.visualMotifs.map((m) => `- ${m}`).join("\n")}

Color Guidance:
${archetype.colorGuidance}

Typography Guidance:
${archetype.typographyGuidance}

Spacing Mood: ${archetype.spacingMood}

Component Style:
${archetype.componentStyle}

NAVBAR — Style-Specific:
${archetype.navbarStyle}

FOOTER — Style-Specific:
${archetype.footerStyle}

CSS Techniques to Use:
${archetype.cssPatterns.map((p) => `- ${p}`).join("\n")}`);

  // ── Font Pairing ───────────────────────────────────────────────────────────

  sections.push(`## Typography
Heading font: ${fonts.heading}
Body font: ${fonts.body}
Style: ${fonts.style}
Best for: ${fonts.bestFor.join(", ")}

Import these fonts from Google Fonts. Use the heading font for h1-h3 elements and the body font for paragraph text, navigation, and UI elements.`);

  // ── Spacing ────────────────────────────────────────────────────────────────

  sections.push(`## Spacing
Section padding: ${spacing.sectionPadding}
Inner element gaps: ${spacing.innerGap}
${spacing.guidance}`);

  // ── Anti-Patterns ──────────────────────────────────────────────────────────

  const allAntiPatterns = [
    ...archetype.antiPatterns.map((p) => `[${archetype.name} style] ${p}`),
    ...GLOBAL_ANTI_PATTERNS,
  ];

  sections.push(`## Anti-Patterns — What NOT To Do
${allAntiPatterns.map((p) => `- ${p}`).join("\n")}`);

  // ── Creative Mode ──────────────────────────────────────────────────────────

  if (isCreative) {
    const boldness = brief.creativeMode?.boldness ?? 5;
    const breakRules = brief.creativeMode?.breakDesignRules ?? false;

    sections.push(`## Creative Mode: ACTIVE (boldness ${boldness}/10)
You have creative license to push beyond safe defaults. Interpret the style more aggressively:
- Use more dramatic font size contrasts (tiny labels vs massive headings)
- Try unexpected layout structures (overlapping elements, broken grids, asymmetric compositions)
- Lean harder into the visual identity of the ${archetype.name} archetype
- Use bolder color choices within the style's palette
- Add more visual personality through spacing variations, decorative elements, or motion hints
${boldness >= 7 ? "- At this boldness level, take SIGNIFICANT creative risks — surprise the user with something they haven't seen before" : ""}
${boldness >= 9 ? "- MAXIMUM boldness — be avant-garde, push every aspect to its expressive limit while maintaining usability" : ""}
${breakRules ? "- DESIGN RULE BREAKING is enabled — you may intentionally subvert anti-patterns for artistic effect, but the result must still be functional and intentional, not broken" : ""}`);
  }

  return sections.join("\n\n---\n\n");
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Simple deterministic hash of brief content to select different font
 * pairings and avoid always picking the first option.
 */
function hashBriefForVariety(brief: SiteBrief): number {
  const seed = `${brief.siteName ?? ""}${brief.siteType ?? ""}${brief.description ?? ""}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
