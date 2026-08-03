/**
 * Creative DNA Engine
 *
 * The anti-sameness system. Every business gets a deterministic, binding
 * "Design DNA" — one committed choice per visual axis (palette strategy,
 * canvas plan, shape language, type character, image treatment, motion
 * temperament, hero signature, layout motif, wildcard detail) — drawn from a
 * wide combinatorial space (10 × 4+ × 5 × 5 × 5 × 3 × trend pools ≈ tens of
 * thousands of distinct identities) and salted per axis so similar briefs
 * diverge.
 *
 * The DNA is injected as a BINDING contract into the design, layout and build
 * prompts, and drives the deterministic fallback design plan — so efficient
 * mode (skipAI) produces visually distinct sites too, instead of one
 * industry-default look.
 */

import type { SiteBrief } from "@/types";
import type { BusinessBrief, DesignPlan } from "@/lib/ai/types";
import { inferIndustryKey } from "@/lib/ai/utils/sectionRules";
import {
  inferTrendStyle,
  mixHash,
  pickSignatureTrends,
  trendSeed,
  type StyleKey,
  type TrendEntry,
} from "@/lib/ai/design-trends";

// ─── Axis: palette strategy ───────────────────────────────────────────────────

interface PaletteStrategy {
  name: string;
  mode: "light" | "dark";
  guidance: string;
  /** Concrete scheme for the deterministic fallback plan. */
  scheme: DesignPlan["colorScheme"];
  styles?: StyleKey[];
}

const PALETTE_STRATEGIES: PaletteStrategy[] = [
  {
    name: "Ink & paper",
    mode: "light",
    guidance:
      "Near-black ink on warm paper tones with ONE amber accent used sparingly for actions. No blue, no violet. Feels like fine print work.",
    scheme: { primary: "#1A1A1A", secondary: "#44403C", accent: "#D97706", bg: "#FAF8F4", text: "#1C1917", muted: "#78716C", border: "#E7E2D9" },
  },
  {
    name: "Midnight luxe",
    mode: "dark",
    guidance:
      "A deep midnight canvas with champagne-gold accents and warm off-white type. Dark-first throughout; light is the exception, used for one breathing section.",
    scheme: { primary: "#C9A961", secondary: "#1E2A3A", accent: "#C9A961", bg: "#0E1420", text: "#F4F1EA", muted: "#97A0AF", border: "#243044" },
    styles: ["luxury", "editorial", "futuristic", "minimal"],
  },
  {
    name: "High-chroma pop",
    mode: "light",
    guidance:
      "A disciplined neutral canvas with ONE saturated signature color (crimson family) deployed boldly — full-bleed CTA bands, oversized numerals, hover states. Never scattered.",
    scheme: { primary: "#E11D48", secondary: "#111827", accent: "#E11D48", bg: "#FFFFFF", text: "#0F172A", muted: "#64748B", border: "#E2E8F0" },
    styles: ["playful", "brutalist", "futuristic", "editorial"],
  },
  {
    name: "Earthy organic",
    mode: "light",
    guidance:
      "Olive, terracotta and cream pulled from natural materials. Surfaces feel like linen and clay, not plastic. Accent leans warm, never neon.",
    scheme: { primary: "#5B6B47", secondary: "#8C5A3C", accent: "#C17B4D", bg: "#F7F4ED", text: "#2A2620", muted: "#7A7265", border: "#E5DFD2" },
  },
  {
    name: "Jewel depth",
    mode: "light",
    guidance:
      "Deep emerald as the brand anchor with an antique-gold accent on a near-white canvas. Rich, established, quietly expensive.",
    scheme: { primary: "#065F46", secondary: "#0F3D3E", accent: "#D4A24C", bg: "#FBFAF7", text: "#11201D", muted: "#5F6F6A", border: "#DDE4E0" },
  },
  {
    name: "Coastal calm",
    mode: "light",
    guidance:
      "Deep sea-teal with sand-gold warmth on an airy off-white canvas. Breathing room is part of the palette — let sections stay light and open.",
    scheme: { primary: "#16667A", secondary: "#0E4A57", accent: "#E0A458", bg: "#F8FAF9", text: "#13343B", muted: "#5E7A80", border: "#DCE7E5" },
  },
  {
    name: "Monochrome + signal",
    mode: "light",
    guidance:
      "Strict grayscale architecture with a single electric-lime signal color reserved for the primary action and one highlight per page. Everything else earns attention through type and spacing.",
    scheme: { primary: "#0A0A0A", secondary: "#1F1F1F", accent: "#A3E635", bg: "#FFFFFF", text: "#0A0A0A", muted: "#6B6B6B", border: "#E5E5E5" },
    styles: ["minimal", "brutalist", "futuristic", "editorial"],
  },
  {
    name: "Warm hospitality",
    mode: "light",
    guidance:
      "Brick-rust and espresso browns over cream — the palette of a place you want to stay in. Imagery carries the color; UI stays warm-neutral.",
    scheme: { primary: "#8A3324", secondary: "#5C4033", accent: "#D9913D", bg: "#FBF6EF", text: "#33261D", muted: "#8A7A6D", border: "#EBDFCF" },
  },
  {
    name: "Forest authority",
    mode: "light",
    guidance:
      "Deep forest greens with a bronze accent on a paper-white canvas. Grounded and credible — the palette of institutions that don't need to shout.",
    scheme: { primary: "#1B4332", secondary: "#2D6A4F", accent: "#B7791F", bg: "#F7F9F4", text: "#14281F", muted: "#6A7D72", border: "#DEE7DD" },
  },
  {
    name: "Dark editorial",
    mode: "dark",
    guidance:
      "Charcoal-black canvas, warm off-white type, and one vivid orange-red accent used like a highlighter on the words that matter. High-contrast, magazine-at-night energy.",
    scheme: { primary: "#FF5C39", secondary: "#2A2A2E", accent: "#FF5C39", bg: "#141417", text: "#F5F2EB", muted: "#A0A0A8", border: "#2C2C32" },
    styles: ["editorial", "brutalist", "futuristic", "luxury"],
  },
];

// ─── Axis: canvas strategy (contrast plan) ────────────────────────────────────

const CANVAS_STRATEGIES: Record<"light" | "dark", string[]> = {
  light: [
    "Single light canvas with quiet tonal shifts between sections — hierarchy comes from spacing and scale, not background swaps.",
    "Alternating light and dark bands: every 2–3 light sections, one full dark section resets attention (proof, stats or CTA live there).",
    "Light site with ONE immersive dark interlude mid-page — the signature moment gets the dark treatment, everything else stays airy.",
    "Warm-tinted section canvases that step subtly darker toward the footer, ending on the deepest tone.",
  ],
  dark: [
    "Dark-first throughout with ONE light breathing section mid-page for menus/details/proof — the inversion is the rhythm.",
    "Dark hero descending into a light body, returning to dark for the final CTA and footer — a deliberate tonal arc.",
    "Fully dark canvas where sections differ by elevation and border glow rather than background color.",
  ],
};

// ─── Axis: shape language ─────────────────────────────────────────────────────

const SHAPE_LANGUAGES: string[] = [
  "Sharp: 0–2px radii everywhere, hairline borders, square imagery — architectural and exact. No pills, no circles.",
  "Precise: 8px radii on cards and buttons, crisp 1px borders — engineered but approachable.",
  "Soft: 16px radii, borderless surfaces separated by shadow (sz-elev-*) — friendly and contemporary.",
  "Round: 24–28px radii on cards with pill buttons — generous, optimistic, consumer-warm.",
  "Mixed-contrast: square imagery and sharp sections but fully-pill buttons and chips — the tension is the signature.",
];

// ─── Axis: type character ─────────────────────────────────────────────────────

const TYPE_CHARACTERS: string[] = [
  "Towering compressed grotesk: tight-tracked, heavy display set HUGE (full sz-display scale), often uppercase — the headline is the hero image.",
  "Elegant serif display: high-contrast serif for headlines and pull-quotes against a quiet sans body — literary and expensive.",
  "Swiss precision: one perfect grotesk family at multiple weights, flush-left, rigorous grid alignment — restraint as a flex.",
  "Editorial mix: serif for emotional moments (hero, quotes, about) and grotesk for functional UI — magazine DNA.",
  "Mono-accent tech: grotesk display with monospace eyebrows, labels and numbers — precise, systematic, engineered.",
];

// ─── Axis: image treatment ────────────────────────────────────────────────────

const IMAGE_TREATMENTS: string[] = [
  "Cinematic full-bleed: imagery runs edge-to-edge with gradient scrims for text — the photography IS the layout.",
  "Framed objects: images sit in generous mats with visible borders and breathing room, like work hung in a gallery.",
  "Brand-tinted: imagery unified under a subtle duotone/color overlay in the primary color so every photo feels art-directed.",
  "Stacked overlap: images layered over offset solid panels or over each other with sz-elev depth — composed, collage-like spreads.",
  "Editorial captioned: every significant image carries a small caption or index number (01, 02) — documentary credibility.",
];

// ─── Axis: motion temperament ─────────────────────────────────────────────────

interface MotionTemperament {
  name: string;
  animationStyle: DesignPlan["animationStyle"];
  guidance: string;
}

const MOTION_TEMPERAMENTS: MotionTemperament[] = [
  {
    name: "Calm precision",
    animationStyle: "subtle",
    guidance: "Short fade-up reveals on key moments only, lift hovers, count-up stats — motion you feel rather than notice.",
  },
  {
    name: "Orchestrated cinema",
    animationStyle: "moderate",
    guidance: "A choreographed hero entrance, cascading grids, direction-aware split reveals and one parallax accent — paced like editing, not decoration.",
  },
  {
    name: "Kinetic energy",
    animationStyle: "expressive",
    guidance: "Word-cascade headline, drifting mesh backdrops, marquee ticker, spotlight cards and staggered everything — alive, but never blocking reading.",
  },
];

// ─── DNA assembly ─────────────────────────────────────────────────────────────

export interface CreativeDna {
  paletteName: string;
  paletteGuidance: string;
  /** Concrete hexes for the fallback plan; null when brand colors are supplied. */
  palette: DesignPlan["colorScheme"] | null;
  mode: "light" | "dark";
  canvas: string;
  shape: string;
  typeCharacter: string;
  imageTreatment: string;
  motionName: string;
  motionGuidance: string;
  animationStyle: DesignPlan["animationStyle"];
  hero: TrendEntry;
  layoutMotif: TrendEntry;
  wildcard: TrendEntry;
}

function pickAxis<T>(values: T[], seed: string): T {
  return values[mixHash(seed) % values.length];
}

function readBrandColors(brief: BusinessBrief | SiteBrief): string[] {
  const business = brief as BusinessBrief;
  if (Array.isArray(business.brandColors) && business.brandColors.length) return business.brandColors;
  const site = brief as SiteBrief;
  if (Array.isArray(site.colorPalette) && site.colorPalette.length) return site.colorPalette;
  return [];
}

export function buildCreativeDna(brief: BusinessBrief | SiteBrief): CreativeDna {
  const seed = trendSeed(brief);
  const style = inferTrendStyle(brief);
  const industry = inferIndustryKey(brief);
  const brandColors = readBrandColors(brief);

  const palettePool = PALETTE_STRATEGIES.filter(
    (entry) => !entry.styles || entry.styles.includes(style)
  );
  const paletteStrategy = pickAxis(palettePool.length ? palettePool : PALETTE_STRATEGIES, `${seed}:palette`);

  // Dark canvases read wrong for trust-first local/medical-ish briefs unless
  // the user explicitly leaned luxury/editorial — bias those to light.
  const forcedLight = (industry === "local" || industry === "education") && style !== "luxury" && style !== "futuristic";
  const effectivePalette =
    forcedLight && paletteStrategy.mode === "dark"
      ? PALETTE_STRATEGIES.find((entry) => entry.mode === "light" && (!entry.styles || entry.styles.includes(style))) ?? PALETTE_STRATEGIES[0]
      : paletteStrategy;

  const mode = brandColors.length ? "light" : effectivePalette.mode;
  const motion = pickAxis(MOTION_TEMPERAMENTS, `${seed}:motion`);
  const signatures = pickSignatureTrends(brief);

  return {
    paletteName: brandColors.length ? "Brand-anchored" : effectivePalette.name,
    paletteGuidance: brandColors.length
      ? `Build the entire scheme around the supplied brand colors (${brandColors.join(", ")}): derive tints, surfaces and borders from them, pick ONE as the dominant action color, and never introduce an unrelated hue.`
      : effectivePalette.guidance,
    palette: brandColors.length ? null : effectivePalette.scheme,
    mode,
    canvas: pickAxis(CANVAS_STRATEGIES[mode], `${seed}:canvas`),
    shape: pickAxis(SHAPE_LANGUAGES, `${seed}:shape`),
    typeCharacter: pickAxis(TYPE_CHARACTERS, `${seed}:type`),
    imageTreatment: pickAxis(IMAGE_TREATMENTS, `${seed}:image`),
    motionName: motion.name,
    motionGuidance: motion.guidance,
    animationStyle: motion.animationStyle,
    hero: signatures.hero,
    layoutMotif: signatures.layoutMotif,
    wildcard: signatures.detail,
  };
}

// ─── Prompt formatting ────────────────────────────────────────────────────────

export function formatCreativeDnaForPrompt(brief: BusinessBrief | SiteBrief): string {
  const dna = buildCreativeDna(brief);
  const businessName =
    (brief as BusinessBrief).businessName || (brief as SiteBrief).siteName || "this brand";

  return [
    `── Design DNA for ${businessName} — BINDING. These committed choices are what make this site unlike every other site; execute each axis literally. ──`,
    `Palette strategy — ${dna.paletteName}: ${dna.paletteGuidance}`,
    `Canvas plan: ${dna.canvas}`,
    `Shape language: ${dna.shape}`,
    `Type character: ${dna.typeCharacter}`,
    `Image treatment: ${dna.imageTreatment}`,
    `Motion temperament — ${dna.motionName} (${dna.animationStyle}): ${dna.motionGuidance}`,
    `Hero signature — ${dna.hero.name}: ${dna.hero.guidance}`,
    `Layout motif — ${dna.layoutMotif.name}: ${dna.layoutMotif.guidance}`,
    `Wildcard detail — ${dna.wildcard.name}: ${dna.wildcard.guidance}`,
    `Anti-default rule: never fall back to the generic AI look — white canvas with an indigo/violet accent, a centered hero with two pill buttons over three equal feature cards, or evenly-padded stacked sections. If a choice feels safe and familiar, push it toward this DNA instead.`,
    `──────────────────────────────────────────────`,
  ].join("\n");
}
