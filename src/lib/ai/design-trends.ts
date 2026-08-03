/**
 * Design Trends Engine
 *
 * A curated, regularly-tended library of award-level web design patterns
 * (Awwwards / FWA / SiteInspire-grade) distilled into executable guidance
 * for Sitezy's generation pipeline. Entries are matched to the business's
 * industry and design style, then rotated deterministically per business so
 * two similar briefs still receive different creative directions.
 *
 * This is inspiration synthesis, not copying: every entry describes a
 * pattern in terms of Sitezy's own render-runtime vocabulary
 * (data-sz-reveal, data-sz-stagger, data-sz-count, data-sz-words,
 * sz-glass, sz-gradient-mesh, sz-mesh-drift, sz-elev-*, ...).
 */

import type { SiteBrief } from "@/types";
import type { BusinessBrief } from "@/lib/ai/types";
import {
  getIndustryProfile,
  inferIndustryKey,
  inferStyleKeywords,
  type IndustryKey,
} from "@/lib/ai/utils/sectionRules";
import { buildBusinessFingerprint } from "@/lib/ai/utils/normalize";

/**
 * FNV-1a with a murmur3 finalizer. The shared `hashText` helper is a linear
 * ×31 polynomial, which means two businesses' hash difference is constant
 * modulo small pool sizes across every salt — same-parity names collide on
 * EVERY even-sized pool at once. The avalanche finalizer decorrelates axes.
 */
export function mixHash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Seed for creative variety. Extends the business fingerprint with the
 * description and tone so two thin briefs that differ only in wording still
 * receive different creative directions.
 */
export function trendSeed(brief: BusinessBrief | SiteBrief): string {
  const description =
    (brief as BusinessBrief).businessDescription || (brief as SiteBrief).description || "";
  const tone = (brief as BusinessBrief).tone || (brief as SiteBrief).tone || "";
  return `${buildBusinessFingerprint(brief)}::${description}::${tone}`;
}

export type StyleKey = "minimal" | "luxury" | "playful" | "brutalist" | "editorial" | "futuristic";

export interface TrendEntry {
  name: string;
  /** What the pattern is and how to execute it with the runtime vocabulary. */
  guidance: string;
  /** Restrict to industries where the pattern reads naturally. Omit = universal. */
  industries?: IndustryKey[];
  /** Restrict to design styles the pattern suits. Omit = universal. */
  styles?: StyleKey[];
}

// ─── Hero signatures (the first-3-seconds moment) ────────────────────────────

const HERO_SIGNATURES: TrendEntry[] = [
  {
    name: "Kinetic word-cascade hero",
    guidance:
      "An oversized sz-display headline with data-sz-words so each word rises into place in sequence on load, one accent phrase in sz-gradient-text, lead and CTA following via a short data-sz-stagger. The motion IS the brand moment — keep the rest of the hero quiet.",
  },
  {
    name: "Split showroom hero",
    guidance:
      "Asymmetric 55/45 split: confident copy column left, layered media right — a primary image in sz-elev-3 overlapping a soft gradient blob with data-sz-parallax. Sides enter toward each other with fade-right / fade-left reveals.",
    industries: ["automotive", "saas", "commerce", "agency"],
  },
  {
    name: "Cinematic full-bleed hero",
    guidance:
      "Full-viewport atmospheric imagery under a dark gradient scrim, headline and CTA bottom-left, and a slim sz-glass-dark info bar docked along the bottom edge (hours, location, rating). Feels like a film title card, not a banner.",
    industries: ["restaurant", "hospitality", "wellness", "portfolio", "automotive"],
    styles: ["luxury", "editorial", "minimal"],
  },
  {
    name: "Magazine cover hero",
    guidance:
      "Editorial composition: an sz-eyebrow kicker over a massive stacked sz-display headline, a thin sz-rule, and one deliberately offset image that breaks the grid. No boxed card, no centered symmetry — whitespace does the framing.",
    styles: ["editorial", "brutalist", "minimal", "luxury"],
    industries: ["agency", "portfolio", "education", "general", "restaurant", "hospitality", "wellness"],
  },
  {
    name: "Atmospheric mesh hero",
    guidance:
      "A sz-gradient-mesh sz-mesh-drift backdrop that slowly breathes, with 2–3 floating proof cards (sz-glass, sz-elev-2, animate-float) orbiting the headline — one stat with data-sz-count, one micro-testimonial, one product moment.",
    industries: ["saas", "commerce", "agency", "education", "general"],
    styles: ["futuristic", "playful", "minimal"],
  },
  {
    name: "Stat-anchored authority hero",
    guidance:
      "Headline plus a horizontal authority strip directly beneath the CTA: 3 key metrics as data-sz-count numbers separated by sz-rule dividers. Leads with credibility for trust-driven buyers.",
    industries: ["local", "education", "saas", "agency", "automotive", "general"],
  },
];

// ─── Layout patterns ──────────────────────────────────────────────────────────

const LAYOUT_PATTERNS: TrendEntry[] = [
  {
    name: "Bento feature grid",
    guidance:
      "One unified grid of mixed-size tiles — one 2x-wide hero tile, one tall tile, several small ones — each with its own surface treatment (sz-glass, solid, image) under a single data-sz-stagger cascade. Replaces rows of identical cards.",
  },
  {
    name: "Editorial overlap",
    guidance:
      "Let one image and one text panel genuinely overlap (negative margins, z-layers, sz-elev-2) so the section reads as a composed spread rather than stacked rectangles. Use once per page at the story's emotional center.",
    styles: ["luxury", "editorial", "minimal", "brutalist"],
  },
  {
    name: "Numbered process rail",
    guidance:
      "Steps marked by enormous ghost numerals (01 02 03 at ~20% opacity behind content), each step revealing with fade-up as the user scrolls. A sticky heading column on desktop keeps context while steps flow.",
    industries: ["agency", "local", "education", "wellness", "saas", "general"],
  },
  {
    name: "Alternating chapter splits",
    guidance:
      "Image/text splits that alternate sides AND change proportions each time (60/40, then 45/55, then full-bleed) with direction-aware reveals — never three identical 50/50 rows.",
  },
  {
    name: "Full-bleed interlude",
    guidance:
      "A single full-width image or oversized pull-quote moment between two dense sections — a palate cleanser with a slow data-sz-parallax drift on the media and almost no other content.",
  },
  {
    name: "Masonry showcase",
    guidance:
      "A CSS-columns masonry gallery with varied image heights, each tile data-sz-hover-fx=\"grow\" with a caption that slides in on hover. Far more alive than a uniform 3-column grid.",
    industries: ["portfolio", "restaurant", "commerce", "hospitality", "wellness", "agency"],
  },
  {
    name: "Spotlight proof wall",
    guidance:
      "One lead testimonial as a large sz-glass quote panel with a data-sz-icon=\"quote\" mark and real attribution, flanked by 2–3 smaller supporting quotes in sz-spotlight cards. Hierarchy of proof, not a carousel of equals.",
  },
  {
    name: "Sticky decision rail",
    guidance:
      "Long-form content on one side with a sticky conversion card (pricing, booking, key facts, CTA) in sz-glass + sz-elev-2 riding alongside it on desktop, collapsing inline on mobile.",
    industries: ["hospitality", "automotive", "education", "saas", "local"],
  },
];

// ─── Motion language ──────────────────────────────────────────────────────────

const MOTION_PATTERNS: TrendEntry[] = [
  {
    name: "Orchestrated hero entrance",
    guidance:
      "The hero plays as one choreographed sequence: eyebrow, then headline (data-sz-words if it is the signature), then lead, then CTA — a single data-sz-stagger parent with a 90–120ms step. Everything else on the page reveals on scroll, not on load.",
  },
  {
    name: "Cascading grids",
    guidance:
      "Every multi-card grid gets data-sz-stagger (step 80–120ms) with children on data-sz-reveal fade-up, so lists assemble rhythmically instead of popping in as a block.",
  },
  {
    name: "Live counting stats",
    guidance:
      "Key metrics count up from zero when scrolled into view: wrap each value in <span data-sz-count>1,250+</span>. Reserve for 3–4 genuinely impressive numbers.",
  },
  {
    name: "Drifting atmosphere",
    guidance:
      "One or two section backdrops use sz-gradient-mesh with sz-mesh-drift so the color field slowly breathes; decorative blobs float with animate-float. Sub-perceptual speed — felt, not watched.",
  },
  {
    name: "Marquee ticker",
    guidance:
      "A logo or keyword strip scrolling infinitely via <div data-sz-logo-scroller=\"1\"><div data-sz-logo-track=\"1\">…content duplicated twice…</div></div>. Great as a trust strip under the hero or a flavor ribbon before the footer.",
  },
  {
    name: "Hover depth system",
    guidance:
      "A consistent interaction grammar: data-sz-hover-fx=\"lift\" on cards, \"grow\" on media tiles, \"glow\" on dark-surface CTAs, sz-spotlight on feature cards — the same vocabulary across every page so the site feels engineered.",
  },
  {
    name: "Direction-aware reveals",
    guidance:
      "On split sections the two halves enter toward each other (fade-right on the left column, fade-left on the right). On zigzag layouts, alternate per row so scrolling feels composed.",
  },
  {
    name: "Parallax accents",
    guidance:
      "Slow data-sz-parallax (speed 0.10–0.2) on decorative media and gradient blobs only — never on copy. One or two per page maximum so depth stays special.",
  },
];

// ─── Typography moves ─────────────────────────────────────────────────────────

const TYPOGRAPHY_TRENDS: TrendEntry[] = [
  {
    name: "Oversized display contrast",
    guidance:
      "Make scale the brand: an sz-display hero headline at full clamp scale against tiny, wide-tracked sz-eyebrow labels. The size gap between the largest and smallest type should feel almost uncomfortable — that tension reads premium.",
  },
  {
    name: "Editorial serif pairing",
    guidance:
      "A high-contrast serif for display set against a neutral grotesk for body. Serif carries emotion in heroes and pull quotes; the grotesk keeps UI and detail crisp.",
    styles: ["luxury", "editorial", "minimal"],
    industries: ["restaurant", "hospitality", "wellness", "portfolio", "agency", "general"],
  },
  {
    name: "Gradient accent phrase",
    guidance:
      "Exactly one phrase per page — the emotional core of the headline — gets sz-gradient-text. Used once it is a signature; used twice it is a gimmick.",
  },
  {
    name: "Ghost numerals",
    guidance:
      "Enormous outlined or low-opacity numbers/letters behind section content as spatial markers (01, 02, 03 or the brand initial). Adds depth and editorial confidence with zero performance cost.",
    styles: ["brutalist", "editorial", "futuristic", "minimal"],
  },
  {
    name: "Kicker-and-rule rhythm",
    guidance:
      "Every major section opens the same way: sz-eyebrow kicker, sz-fluid-h2 heading, optional sz-lead intro, with a thin sz-rule grounding the group. Consistent entry ritual = strong design system feel.",
  },
];

// ─── Surface & micro-detail moves ────────────────────────────────────────────

const SURFACE_DETAILS: TrendEntry[] = [
  {
    name: "Glass navigation",
    guidance:
      "A sticky sz-glass navbar floating over the hero with sz-link-underline nav links — the underline draws in from the left on hover. Mobile keeps the same glass treatment on the menu sheet.",
  },
  {
    name: "Grain over mesh",
    guidance:
      "Layer sz-grain over a sz-gradient-mesh section so digital gradients get analog warmth. Strongest on hero and final CTA sections.",
  },
  {
    name: "Layered elevation",
    guidance:
      "Build depth deliberately: sz-elev-1 for resting cards, sz-elev-2 for hover/featured, sz-elev-3 for the one floating element that overlaps a section boundary. One overlap per page reads crafted; many read messy.",
  },
  {
    name: "Pill chip system",
    guidance:
      "Rounded-full chips for tags, categories, and filters — bordered and quiet at rest, filling with the accent color on hover. A small detail that makes content feel organized and interactive.",
  },
  {
    name: "Native accordion FAQ",
    guidance:
      "FAQs as <details>/<summary> with a data-sz-icon=\"arrow-down\" chevron that rotates when open (Tailwind group-open:rotate-180). Zero JS, fully accessible, satisfying to use.",
  },
  {
    name: "Focus-ring form polish",
    guidance:
      "Every input and textarea gets the sz-field class: generous padding, calm borders, and a soft brand-colored focus ring that eases in. Labels stay visible — no placeholder-only fields.",
  },
  {
    name: "Oversized footer brand moment",
    guidance:
      "The footer as a destination: a huge wordmark or sz-display sign-off line ('Let's build something.'), organized link columns, social icons via data-sz-icon, and a final thin sz-rule. The last impression should be as designed as the first.",
  },
  {
    name: "Image hover reveal",
    guidance:
      "Portfolio/menu/product imagery in overflow-hidden frames where the image scales subtly on hover (data-sz-hover-fx=\"grow\" on the img, not the frame) while a caption or arrow chip slides in.",
    industries: ["portfolio", "restaurant", "commerce", "hospitality", "agency", "wellness"],
  },
];

// ─── Selection ────────────────────────────────────────────────────────────────

const STYLE_KEYS: StyleKey[] = ["minimal", "luxury", "playful", "brutalist", "editorial", "futuristic"];

function inferTrendStyle(brief: BusinessBrief | SiteBrief): StyleKey {
  const preferred = (brief as SiteBrief).generationDesignStyle as StyleKey | undefined;
  if (preferred && STYLE_KEYS.includes(preferred)) return preferred;

  const haystack = inferStyleKeywords(brief).join(" ").toLowerCase();
  if (/luxury|premium|exclusive|high-end|elegant/.test(haystack)) return "luxury";
  if (/playful|colorful|friendly|fun|vibrant/.test(haystack)) return "playful";
  if (/editorial|magazine|story/.test(haystack)) return "editorial";
  if (/future|futuristic|tech|cyber|bold/.test(haystack)) return "futuristic";
  if (/brutal|edgy|raw/.test(haystack)) return "brutalist";
  return "minimal";
}

function matches(entry: TrendEntry, industry: IndustryKey, style: StyleKey): boolean {
  if (entry.industries && !entry.industries.includes(industry)) return false;
  if (entry.styles && !entry.styles.includes(style)) return false;
  return true;
}

/**
 * Deterministically pick `count` matched entries per business. Uses a
 * hash-derived start AND stride (not a contiguous rotation) so businesses
 * with neighboring seeds get genuinely different selections instead of
 * heavily overlapping runs of the same ordered pool.
 */
function pickTrends(
  entries: TrendEntry[],
  industry: IndustryKey,
  style: StyleKey,
  seed: string,
  count: number
): TrendEntry[] {
  const pool = entries.filter((entry) => matches(entry, industry, style));
  const fallback = pool.length >= count ? pool : entries;
  const len = fallback.length;
  if (!len) return [];
  const h = mixHash(seed);
  const start = h % len;
  const step = len > 1 ? (Math.floor(h / 7) % (len - 1)) + 1 : 1;
  const picked: TrendEntry[] = [];
  const seen = new Set<number>();
  let idx = start;
  for (let i = 0; i < len && picked.length < count; i++) {
    while (seen.has(idx)) idx = (idx + 1) % len;
    seen.add(idx);
    picked.push(fallback[idx]);
    idx = (idx + step) % len;
  }
  return picked;
}

function formatEntries(entries: TrendEntry[]): string {
  return entries
    .map((entry, i) => `  ${i + 1}. ${entry.name} — ${entry.guidance}`)
    .join("\n");
}

/**
 * Commit to ONE hero signature, ONE layout motif and ONE micro-detail for this
 * business — the binding picks consumed by the Creative DNA system. Uses a
 * different seed salt than the briefing so the committed picks and the broader
 * inspiration list evolve independently.
 */
export function pickSignatureTrends(brief: BusinessBrief | SiteBrief): {
  hero: TrendEntry;
  layoutMotif: TrendEntry;
  detail: TrendEntry;
} {
  const industry = inferIndustryKey(brief);
  const style = inferTrendStyle(brief);
  const seed = trendSeed(brief);
  return {
    hero: pickTrends(HERO_SIGNATURES, industry, style, `${seed}:sig-hero`, 1)[0],
    layoutMotif: pickTrends(LAYOUT_PATTERNS, industry, style, `${seed}:sig-layout`, 1)[0],
    detail: pickTrends(SURFACE_DETAILS, industry, style, `${seed}:sig-detail`, 1)[0],
  };
}

export { inferTrendStyle };

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Build an award-level trend briefing tailored to this business, ready for
 * prompt injection into the design and layout engines.
 */
export function buildDesignTrendBriefing(brief: BusinessBrief | SiteBrief): string {
  const industry = inferIndustryKey(brief);
  const style = inferTrendStyle(brief);
  const profile = getIndustryProfile(brief);
  const seed = trendSeed(brief);
  const businessName =
    (brief as BusinessBrief).businessName || (brief as SiteBrief).siteName || "this brand";

  const heroes = pickTrends(HERO_SIGNATURES, industry, style, `${seed}:hero`, 2);
  const layouts = pickTrends(LAYOUT_PATTERNS, industry, style, `${seed}:layout`, 3);
  const motion = pickTrends(MOTION_PATTERNS, industry, style, `${seed}:motion`, 4);
  const typography = pickTrends(TYPOGRAPHY_TRENDS, industry, style, `${seed}:type`, 2);
  const surfaces = pickTrends(SURFACE_DETAILS, industry, style, `${seed}:surface`, 3);

  return [
    `── Award-level design trends (curated from Awwwards/FWA-grade work) — inspiration, never duplication ──`,
    `Curated for: ${profile.label} · ${style} direction`,
    ``,
    `Hero signature candidates (commit to ONE as the first-3-seconds moment):`,
    formatEntries(heroes),
    ``,
    `Layout patterns to weave in:`,
    formatEntries(layouts),
    ``,
    `Motion language:`,
    formatEntries(motion),
    ``,
    `Typography moves:`,
    formatEntries(typography),
    ``,
    `Surface & micro-detail moves:`,
    formatEntries(surfaces),
    ``,
    `Adapt everything above to ${businessName}'s identity. Choose 2–3 patterns as the site's signature and execute them fully — a few patterns done with conviction beats all of them done timidly.`,
    `──────────────────────────────────────────────`,
  ].join("\n");
}
