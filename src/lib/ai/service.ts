import Anthropic from "@anthropic-ai/sdk";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages";
import { getSiteImagePalette, formatPaletteForPrompt } from "@/lib/utils/images";
import {
  API_AUTH_001,
  API_GENERATE_001,
  API_GENERATE_002,
  createAppError,
} from "@/lib/errors";
import type {
  SiteBrief,
  SiteBlueprint,
  BlueprintPage,
  PageSection,
} from "@/types";
import {
  buildDesignGuidance,
  DESIGN_ARCHETYPES,
  selectFontPairingForBrief,
} from "@/lib/ai/design-archetypes";
import {
  buildBlockPlanSystemPrompt,
  buildBlockPlanUserPrompt,
  buildBusinessContextBlock,
  buildCreativeDirectionSystemPrompt,
  buildCreativeDirectionUserPrompt,
  buildIndustryPromptHints,
  buildPageCritiqueSystemPrompt,
  buildPageCritiqueUserPrompt,
  buildPagePlanSystemPrompt,
  buildPagePlanUserPrompt,
  buildSectionRefreshSystemPrompt,
  buildSectionRefreshUserPrompt,
  detectLocalGenericSignals,
  enrichBlueprintPageSections,
  formatBlockPlan,
  formatCreativeDirection,
  formatPagePlan,
  formatSectionRefreshPlan,
  normalizeBlockPlan,
  normalizeCreativeDirection,
  normalizePageCritique,
  normalizePagePlan,
  normalizeSectionRefreshPlan,
  type BlockPlan,
  type CreativeDirection,
  type PageCritique,
  type PagePlan,
  type SectionRefreshPlan,
} from "@/lib/ai/generation-strategy";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_MAX_TOKENS     = 16_000;
const SECTION_MAX_TOKENS  = 8_000;
const PLAN_MAX_TOKENS     = 4_096;
const JSON_MAX_RETRIES    = 4;
const GENERATOR_PLAN_MAX_TOKENS = 6_000;
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u200D\uFE0F]/gu;
const SECTION_TYPE_OPTIONS = [
  "navbar",
  "hero",
  "features",
  "about",
  "services",
  "menu",
  "pricing",
  "testimonial",
  "team",
  "gallery",
  "portfolio",
  "stats",
  "logos",
  "cta",
  "faq",
  "contact",
  "blog",
  "timeline",
  "video",
  "map",
  "reservation",
  "products",
  "integrations",
  "case-studies",
  "credentials",
  "awards",
  "process",
  "comparison",
  "footer",
  "section",
];
const TEXT_TAG_NAMES = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "a",
  "button",
  "li",
  "blockquote",
  "figcaption",
  "label",
  "small",
  "strong",
  "em",
  "mark",
  "span",
]);
const SVG_TAG_NAMES = new Set([
  "svg",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "g",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "mask",
]);
const CLASS_TO_ENTRANCE_ANIM: Record<string, string> = {
  "animate-fade-up": "fade-up",
  "animate-fade-down": "fade-down",
  "animate-fade-left": "fade-left",
  "animate-fade-right": "fade-right",
  "animate-zoom-in": "zoom-in",
  "animate-zoom-out": "zoom-out",
};
const CLASS_TO_HOVER_FX: Record<string, string> = {
  "hover-lift": "lift",
  "hover-grow": "grow",
};
const UNSUPPORTED_MOTION_CLASS_PATTERNS = [
  /^animate-/,
  /^motion-safe:animate-/,
  /^motion-reduce:animate-/,
  /^hover:(-?translate|translate|scale|rotate|skew|opacity|shadow|drop-shadow|blur|brightness|saturate|contrast|grayscale|sepia|hue-rotate|transform|filter)/,
  /^group-hover:(-?translate|translate|scale|rotate|skew|opacity|shadow|drop-shadow|blur|brightness|saturate|contrast|grayscale|sepia|hue-rotate|transform|filter)/,
];
const UNSUPPORTED_TEXT_EFFECT_CLASS_PATTERNS = [
  /^text-transparent$/,
  /^bg-clip-text$/,
  /^bg-clip-\[text\]$/,
  /^mix-blend-/,
  /^text-stroke-/,
];
const STRIP_STYLE_PROPS = new Set([
  "animation",
  "animation-name",
  "animation-duration",
  "animation-delay",
  "animation-timing-function",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-direction",
  "animation-play-state",
  "transition",
  "transition-property",
  "transition-duration",
  "transition-delay",
  "transition-timing-function",
  "will-change",
]);
const STRIP_TEXT_EFFECT_STYLE_PROPS = new Set([
  "-webkit-text-fill-color",
  "background-clip",
  "-webkit-background-clip",
  "mix-blend-mode",
  "mask",
  "mask-image",
  "mask-size",
  "mask-repeat",
  "text-shadow",
]);

// ─── Types ────────────────────────────────────────────────────────────────────
interface ContentImageNeed {
  section: string;
  slot: string;
  subject: string;
}

interface ContentOutline {
  imageNeeds: ContentImageNeed[];
}

// ─── Client ───────────────────────────────────────────────────────────────────
function getClient(): Anthropic {
  const key = process.env.SITEZY_SPARK_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw createAppError({
      code: API_AUTH_001,
      devMessage:
        "Anthropic client initialization failed: missing SITEZY_SPARK_KEY / ANTHROPIC_API_KEY",
      severity: "fatal",
    });
  }
  return new Anthropic({ apiKey: key });
}

function getModel(): string {
  return (
    process.env.SITEZY_SPARK_MODEL ||
    process.env.ANTHROPIC_MODEL ||
    "claude-sonnet-4-20250514"
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSectionType(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function capitalizeLabel(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncateText(value: string, maxLength: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function formatNavLinks(blueprint: SiteBlueprint): string {
  return blueprint.pages
    .map((p) => `${p.name} → /${p.slug || slugifyText(p.name)}`)
    .join(", ");
}

function isGenericFont(font: string | undefined): boolean {
  return /^(inter|roboto|arial|system-ui|sans-serif)$/i.test(String(font ?? "").trim());
}

function normalizeBlueprint(blueprint: SiteBlueprint, brief: SiteBrief): SiteBlueprint {
  const defaultFonts = selectFontPairingForBrief(brief);
  const pages = (blueprint.pages ?? []).map((page, index) => ({
    ...page,
    id: page.id || `page-${index + 1}`,
    slug: page.slug || slugifyText(page.name || `page-${index + 1}`),
    name: page.name || `Page ${index + 1}`,
    purpose: page.purpose || `Support the ${page.name || `page ${index + 1}`} user journey.`,
    sections: enrichBlueprintPageSections(
      {
        ...page,
        sections: page.sections ?? [],
      },
      brief
    ),
  }));

  return {
    ...blueprint,
    siteName: blueprint.siteName || brief.siteName,
    tagline: truncateText(blueprint.tagline || brief.description, 140),
    brandPersonality: truncateText(
      blueprint.brandPersonality || "Distinct, business-specific, and grounded in the actual offer.",
      320
    ),
    colorScheme: {
      primary: blueprint.colorScheme?.primary || "#1f2937",
      secondary: blueprint.colorScheme?.secondary || "#0f172a",
      accent: blueprint.colorScheme?.accent || blueprint.colorScheme?.primary || "#2563eb",
      bg: blueprint.colorScheme?.bg || "#ffffff",
      text: blueprint.colorScheme?.text || "#111111",
      muted: blueprint.colorScheme?.muted || "#6b7280",
      border: blueprint.colorScheme?.border || "#e5e7eb",
    },
    typography: {
      headingFont:
        !isGenericFont(blueprint.typography?.headingFont) && blueprint.typography?.headingFont
          ? blueprint.typography.headingFont
          : defaultFonts.heading,
      bodyFont:
        !isGenericFont(blueprint.typography?.bodyFont) && blueprint.typography?.bodyFont
          ? blueprint.typography.bodyFont
          : defaultFonts.body,
      style: blueprint.typography?.style || defaultFonts.style,
      headingWeight: blueprint.typography?.headingWeight || "700",
      lineHeight: blueprint.typography?.lineHeight || "1.2",
    },
    layoutStyle:
      blueprint.layoutStyle ||
      (brief.generationStructurePreference === "asymmetric" ? "asymmetric" : "editorial"),
    navigationStyle: blueprint.navigationStyle || brief.defaultNavigationStyle || "full",
    footerStyle: blueprint.footerStyle || "detailed",
    animationStyle: blueprint.animationStyle || "subtle",
    designDirection: truncateText(
      blueprint.designDirection || "A distinct, brand-specific experience with clear visual hierarchy and memorable section contrast.",
      420
    ),
    pages,
  };
}

function deriveCreativeDirectionFromBlueprint(
  blueprint: SiteBlueprint,
  brief: SiteBrief
): CreativeDirection {
  return normalizeCreativeDirection({
    conceptName: `${blueprint.siteName} ${capitalizeLabel(blueprint.layoutStyle)}`.trim(),
    brandCore: blueprint.brandPersonality,
    visualSignature: blueprint.designDirection,
    experiencePrinciples: [
      `Use ${blueprint.layoutStyle} composition with section-to-section contrast.`,
      `Keep the experience grounded in ${brief.siteType || "the business"} instead of generic startup patterns.`,
      `Let ${blueprint.typography.headingFont} and ${blueprint.typography.bodyFont} set the tone early.`,
    ],
    memorableMoments: [
      `A navbar and hero that immediately express ${blueprint.siteName}'s identity.`,
      "At least one section that breaks the default grid rhythm.",
      "A final CTA or footer moment that feels integrated into the page story.",
    ],
    antiGenericRules: [
      "Do not repeat the same card shell across every section.",
      "Do not use generic feature-copy placeholders.",
      "Do not flatten the page into one visual treatment.",
    ],
    colorStory: `Primary ${blueprint.colorScheme.primary}, secondary ${blueprint.colorScheme.secondary}, and accent ${blueprint.colorScheme.accent} should be used intentionally for hierarchy and mood.`,
    typographyStory: `${blueprint.typography.headingFont} carries the expressive voice while ${blueprint.typography.bodyFont} keeps the UI readable and on-brand.`,
    motionStory: `${blueprint.animationStyle} motion should reinforce pacing and emphasis, not decorate every element equally.`,
  });
}

async function generateCreativeDirection(brief: SiteBrief): Promise<CreativeDirection> {
  const activeArchetype = DESIGN_ARCHETYPES[brief.generationDesignStyle ?? "minimal"];
  const direction = await jsonCompletion<CreativeDirection>(
    buildCreativeDirectionSystemPrompt(),
    buildCreativeDirectionUserPrompt(brief, activeArchetype.name, activeArchetype.description),
    JSON_MAX_RETRIES,
    GENERATOR_PLAN_MAX_TOKENS
  );
  return normalizeCreativeDirection(direction);
}

async function generatePagePlan(
  blueprint: SiteBlueprint,
  page: BlueprintPage,
  brief: SiteBrief,
  creativeDirection: CreativeDirection,
  instruction?: string | null
): Promise<PagePlan> {
  const plan = await jsonCompletion<PagePlan>(
    buildPagePlanSystemPrompt(),
    buildPagePlanUserPrompt(blueprint, page, brief, creativeDirection, formatNavLinks(blueprint), instruction),
    JSON_MAX_RETRIES,
    GENERATOR_PLAN_MAX_TOKENS
  );
  return normalizePagePlan(plan, page);
}

async function generateSectionRefreshPlan(
  blueprint: SiteBlueprint,
  brief: SiteBrief,
  page: Pick<BlueprintPage, "name" | "purpose">,
  section: {
    type: string;
    name: string;
    previousSectionName?: string | null;
    nextSectionName?: string | null;
    html: string;
  },
  instruction?: string
): Promise<SectionRefreshPlan> {
  const plan = await jsonCompletion<SectionRefreshPlan>(
    buildSectionRefreshSystemPrompt(),
    buildSectionRefreshUserPrompt(blueprint, brief, page, section, instruction),
    JSON_MAX_RETRIES,
    PLAN_MAX_TOKENS
  );
  return normalizeSectionRefreshPlan(plan);
}

async function generateBlockPlan(
  blueprint: SiteBlueprint,
  brief: SiteBrief,
  page: Pick<BlueprintPage, "name" | "purpose">,
  block: {
    type: string;
    label: string;
    placement: string;
  },
  context: {
    existingSections: string[];
    previousSectionName?: string | null;
    nextSectionName?: string | null;
    selectedSectionName?: string | null;
    selectedNodeLabel?: string | null;
  }
): Promise<BlockPlan> {
  const plan = await jsonCompletion<BlockPlan>(
    buildBlockPlanSystemPrompt(),
    buildBlockPlanUserPrompt(blueprint, brief, page, block, context),
    JSON_MAX_RETRIES,
    PLAN_MAX_TOKENS
  );
  return normalizeBlockPlan(plan);
}

async function critiqueGeneratedPage(
  blueprint: SiteBlueprint,
  page: BlueprintPage,
  brief: SiteBrief,
  creativeDirection: CreativeDirection,
  pagePlan: PagePlan,
  html: string
): Promise<PageCritique> {
  const critique = await jsonCompletion<PageCritique>(
    buildPageCritiqueSystemPrompt(),
    buildPageCritiqueUserPrompt(blueprint, page, brief, creativeDirection, pagePlan, html),
    2,
    PLAN_MAX_TOKENS
  ).catch(() => null);

  const normalized = normalizePageCritique(critique);
  const localSignals = detectLocalGenericSignals(html);

  return {
    ...normalized,
    genericSignals: [...new Set([...normalized.genericSignals, ...localSignals])],
  };
}

function shouldReviseGeneratedPage(critique: PageCritique): boolean {
  return critique.score < 8.2 || critique.genericSignals.length > 0 || critique.issues.length >= 4;
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/"/g, "&quot;");
}

function readHtmlAttr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`\\s${name}=(["'])([\\s\\S]*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function writeHtmlAttr(attrs: string, name: string, value: string): string {
  const escapedValue = escapeHtmlAttribute(value);
  const attrRegex = new RegExp(`\\s${name}=(["'])[\\s\\S]*?\\1`, "i");
  if (attrRegex.test(attrs)) {
    return attrs.replace(attrRegex, ` ${name}="${escapedValue}"`);
  }
  return `${attrs} ${name}="${escapedValue}"`;
}

function removeHtmlAttr(attrs: string, name: string): string {
  const attrRegex = new RegExp(`\\s${name}=(["'])[\\s\\S]*?\\1`, "ig");
  return attrs.replace(attrRegex, "");
}

function sanitizeClassTokens(classValue: string, isTextTag: boolean): {
  className: string;
  entranceAttr: string | null;
  hoverAttr: string | null;
} {
  const tokens = classValue
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  let entranceAttr: string | null = null;
  let hoverAttr: string | null = null;
  const keptTokens: string[] = [];

  tokens.forEach((token) => {
    if (!entranceAttr && CLASS_TO_ENTRANCE_ANIM[token]) {
      entranceAttr = CLASS_TO_ENTRANCE_ANIM[token];
      return;
    }
    if (!hoverAttr && CLASS_TO_HOVER_FX[token]) {
      hoverAttr = CLASS_TO_HOVER_FX[token];
      return;
    }
    if (UNSUPPORTED_MOTION_CLASS_PATTERNS.some((pattern) => pattern.test(token))) {
      return;
    }
    if (isTextTag && UNSUPPORTED_TEXT_EFFECT_CLASS_PATTERNS.some((pattern) => pattern.test(token))) {
      return;
    }
    keptTokens.push(token);
  });

  return {
    className: keptTokens.join(" "),
    entranceAttr,
    hoverAttr,
  };
}

function sanitizeInlineStyle(styleValue: string, isTextTag: boolean): string {
  const sanitized = styleValue
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      const separatorIndex = entry.indexOf(":");
      if (separatorIndex < 0) return false;
      const property = entry.slice(0, separatorIndex).trim().toLowerCase();
      if (STRIP_STYLE_PROPS.has(property)) return false;
      if (isTextTag && STRIP_TEXT_EFFECT_STYLE_PROPS.has(property)) return false;
      return true;
    });

  return sanitized.join("; ");
}

function rewriteGeneratedTagsForEditor(html: string): string {
  return html.replace(/<([a-z][a-z0-9:-]*)(\s[^<>]*?)?>/gi, (match, rawTagName, rawAttrs = "") => {
    const tagName = rawTagName.toLowerCase();
    if (SVG_TAG_NAMES.has(tagName)) return match;

    let attrs = rawAttrs;
    const isTextTag = TEXT_TAG_NAMES.has(tagName);

    const classValue = readHtmlAttr(attrs, "class");
    if (classValue) {
      const { className, entranceAttr, hoverAttr } = sanitizeClassTokens(classValue, isTextTag);
      if (className) {
        attrs = writeHtmlAttr(attrs, "class", className);
      } else {
        attrs = removeHtmlAttr(attrs, "class");
      }
      if (entranceAttr && !readHtmlAttr(attrs, "data-sz-anim-in")) {
        attrs = writeHtmlAttr(attrs, "data-sz-anim-in", entranceAttr);
      }
      if (hoverAttr && !readHtmlAttr(attrs, "data-sz-hover-fx")) {
        attrs = writeHtmlAttr(attrs, "data-sz-hover-fx", hoverAttr);
      }
    }

    const styleValue = readHtmlAttr(attrs, "style");
    if (styleValue) {
      const sanitizedStyle = sanitizeInlineStyle(styleValue, isTextTag);
      if (sanitizedStyle) {
        attrs = writeHtmlAttr(attrs, "style", sanitizedStyle);
      } else {
        attrs = removeHtmlAttr(attrs, "style");
      }
    }

    ["title", "aria-label", "alt", "placeholder"].forEach((attrName) => {
      const value = readHtmlAttr(attrs, attrName);
      if (!value) return;
      const cleaned = value.replace(EMOJI_REGEX, "").replace(/\s+/g, " ").trim();
      if (cleaned) {
        attrs = writeHtmlAttr(attrs, attrName, cleaned);
      } else {
        attrs = removeHtmlAttr(attrs, attrName);
      }
    });

    return `<${rawTagName}${attrs}>`;
  });
}

function simplifyDecorativeTextWrappers(html: string): string {
  return html.replace(
    /<(h[1-6]|p|a|button|li|blockquote|figcaption|label|small|strong|em|mark|span)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag, attrs, inner) => {
      if (/data-sz-icon=/i.test(inner)) return match;
      if (/<(?:svg|img|video|iframe|input|textarea|select|form|section|article|aside|header|footer|main|nav|ul|ol|figure|table|thead|tbody|tfoot|tr)\b/i.test(inner)) {
        return match;
      }

      const simplifiedInner = inner
        .replace(/<\/?span\b[^>]*>/gi, "")
        .replace(/<\/?mark\b[^>]*>/gi, "")
        .replace(/<\/?b\b[^>]*>/gi, "")
        .replace(/<\/?i\b[^>]*>/gi, "");

      return `<${tag}${attrs}>${simplifiedInner}</${tag}>`;
    }
  );
}

function removeEmptyGeneratedInlineNodes(html: string): string {
  return html.replace(/<(span|small|strong|em|mark)\b[^>]*>\s*<\/\1>/gi, "");
}

function normalizeGeneratedHtmlForEditor(html: string): string {
  const noEmoji = html.replace(EMOJI_REGEX, "");
  const rewritten = rewriteGeneratedTagsForEditor(noEmoji);
  const simplified = simplifyDecorativeTextWrappers(rewritten);
  return removeEmptyGeneratedInlineNodes(simplified);
}

// ─── Image context builder (DRY) ─────────────────────────────────────────────
interface ImageContext {
  wantsImages: boolean;
  imageGuide: string;
}

function buildImageContext(brief: SiteBrief): ImageContext {
  const wantsImages =
    !brief.imageStyle ||
    brief.imageStyle === "photos" ||
    brief.imageStyle === "illustrations";
  const palette = wantsImages
    ? getSiteImagePalette(brief.siteType ?? "agency")
    : null;
  return {
    wantsImages,
    imageGuide: palette ? formatPaletteForPrompt(palette) : "",
  };
}

// ─── Semantic image slots ─────────────────────────────────────────────────────
const IMAGE_SLOTS: Record<string, string[]> = {
  hero:        ["hero_background", "hero_product"],
  about:       ["team_photo", "office_environment"],
  menu:        ["featured_dish", "restaurant_ambiance"],
  team:        ["team_member_portrait"],
  gallery:     ["gallery_item_1", "gallery_item_2", "gallery_item_3"],
  testimonial: ["customer_portrait"],
  products:    ["product_shot_1", "product_shot_2"],
  features:    ["feature_illustration"],
  contact:     ["location_photo"],
  portfolio:   ["portfolio_item_1", "portfolio_item_2"],
  case_studies:["case_study_cover"],
  blog:        ["blog_cover_1", "blog_cover_2"],
};

function buildImageQuery(
  slot: string,
  ctx: { siteName: string; siteType: string; description: string }
): string {
  const base = ctx.siteType ?? "business";

  const slotQueries: Record<string, string> = {
    hero_background:       `${base} interior atmosphere wide`,
    hero_product:          `${base} signature product professional`,
    featured_dish:         `${base} food photography plated close-up`,
    restaurant_ambiance:   `${base} dining room ambiance warm lighting`,
    team_photo:            `${base} team professional group photo`,
    team_member_portrait:  "professional headshot portrait natural light",
    office_environment:    `${base} modern office workspace`,
    product_shot_1:        `${base} product photography studio`,
    product_shot_2:        `${base} product lifestyle photography`,
    feature_illustration:  `${base} technology concept abstract`,
    location_photo:        `${base} exterior building entrance`,
    gallery_item_1:        `${base} photography high quality`,
    gallery_item_2:        `${base} detail photography close-up`,
    gallery_item_3:        `${base} lifestyle photography`,
    portfolio_item_1:      `${base} project showcase`,
    portfolio_item_2:      `${base} creative work`,
    case_study_cover:      `${base} business success results`,
    blog_cover_1:          `${base} editorial photography`,
    blog_cover_2:          `${base} concept photography`,
    customer_portrait:     "happy customer portrait professional",
  };

  return slotQueries[slot] ?? `${base} ${slot.replace(/_/g, " ")} photography`;
}

// ─── Image fetching with cache ────────────────────────────────────────────────
const imageCache = new Map<string, string>();

async function fetchImage(query: string): Promise<string | null> {
  const key = query.toLowerCase().trim();
  if (imageCache.has(key)) return imageCache.get(key)!;

  // Try Unsplash first
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsplashKey) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
        { headers: { Authorization: `Client-ID ${unsplashKey}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const url: string = data?.urls?.regular;
        if (url) {
          imageCache.set(key, url);
          return url;
        }
      }
    } catch {
      // fall through to Pexels
    }
  }

  // Fallback to Pexels
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
        { headers: { Authorization: pexelsKey } }
      );
      if (res.ok) {
        const data = await res.json();
        const url: string = data?.photos?.[0]?.src?.large2x ?? data?.photos?.[0]?.src?.large;
        if (url) {
          imageCache.set(key, url);
          return url;
        }
      }
    } catch {
      // fall through to null
    }
  }

  return null;
}

// ─── Resolve image slots for a set of sections ────────────────────────────────
async function resolveImageSlots(
  sections: string[],
  ctx: { siteName: string; siteType: string; description: string }
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};

  const tasks: Array<{ slotKey: string; query: string }> = [];

  for (const section of sections) {
    const slots = IMAGE_SLOTS[section] ?? [];
    for (const slot of slots) {
      const query = buildImageQuery(slot, ctx);
      tasks.push({ slotKey: `${section}__${slot}`, query });
    }
  }

  // Resolve in parallel, cap concurrency at 5
  const CONCURRENCY = 5;
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(({ query }) => fetchImage(query))
    );
    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        resolved[batch[idx].slotKey] = result.value;
      }
    });
  }

  return resolved;
}

// ─── Two-pass: ask AI what images it needs, then resolve them ─────────────────
async function resolveSmartImages(
  blueprint: SiteBlueprint,
  page: BlueprintPage,
  brief: SiteBrief
): Promise<Record<string, string>> {
  const outlineSystem = `You are a web content planner.
Given a page plan, return JSON describing exactly what images are needed.
Respond ONLY with valid JSON. No markdown, no explanation.`;

  const outlineUser = `Business: ${brief.siteName} — ${brief.description}
Type: ${brief.siteType}
Page: ${page.name}
Sections: ${page.sections.join(", ")}

Return JSON:
{
  "imageNeeds": [
    { "section": "hero", "slot": "hero_background", "subject": "modern italian restaurant interior warm candlelight" },
    { "section": "menu", "slot": "featured_dish", "subject": "handmade pasta carbonara plated on white ceramic" }
  ]
}

Be SPECIFIC and DESCRIPTIVE for each subject — describe colors, mood, subject matter exactly as if briefing a photographer.`;

  let outline: ContentOutline = { imageNeeds: [] };
  try {
    outline = await jsonCompletion<ContentOutline>(outlineSystem, outlineUser, 2);
  } catch {
    // Non-fatal: fall back to slot-based resolution
    const resolved: Record<string, string> = {};
    const ctx = { siteName: brief.siteName, siteType: brief.siteType ?? "agency", description: brief.description };
    for (const section of page.sections) {
      const slots = IMAGE_SLOTS[section] ?? [];
      for (const slot of slots) {
        const url = await fetchImage(buildImageQuery(slot, ctx));
        if (url) resolved[`${section}__${slot}`] = url;
      }
    }
    return resolved;
  }

  // Resolve each AI-described need in parallel
  const resolved: Record<string, string> = {};
  const CONCURRENCY = 5;
  const needs = outline.imageNeeds ?? [];

  for (let i = 0; i < needs.length; i += CONCURRENCY) {
    const batch = needs.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(({ subject }) => fetchImage(subject))
    );
    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        const { section, slot } = batch[idx];
        resolved[`${section}__${slot}`] = result.value;
      }
    });
  }

  return resolved;
}

// ─── Format resolved images for prompt injection ──────────────────────────────
function formatResolvedImages(imageMap: Record<string, string>): string {
  if (Object.keys(imageMap).length === 0) return "";

  const lines = Object.entries(imageMap)
    .map(([key, url]) => {
      const [section, slot] = key.split("__");
      return `  [${section} → ${slot}]: ${url}`;
    })
    .join("\n");

  return `
IMAGE ASSIGNMENTS — USE THESE EXACT URLs ONLY:
${lines}

Match each image to the correct section and visual purpose described above.
For hero backgrounds use the hero → hero_background URL.
For food/product images use the relevant section's slot URL.
Do NOT use placeholder.com, picsum, or any made-up URLs.
Do NOT reuse the same image URL in multiple places.`;
}

// ─── Streaming helper ─────────────────────────────────────────────────────────
export async function streamCompletion(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string, full: string) => void,
  maxTokens = PAGE_MAX_TOKENS
): Promise<string> {
  const client = getClient();
  let full = "";

  const stream = await client.messages.create({
    model: getModel(),
    max_tokens: maxTokens,
    stream: true,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      full += event.delta.text;
      onChunk(event.delta.text, full);
    }
  }

  return full;
}

// ─── JSON completion ──────────────────────────────────────────────────────────
export async function jsonCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  maxRetries = JSON_MAX_RETRIES,
  maxTokens = PLAN_MAX_TOKENS
): Promise<T> {
  const client = getClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, 2 ** (attempt - 1) * 500)
      );
    }

    const msg = await client.messages.create({
      model: getModel(),
      max_tokens: maxTokens,
      system:
        systemPrompt +
        "\n\nCRITICAL: Respond ONLY with valid JSON. No markdown fences, no explanation.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = extractText(msg.content);

    try {
      const cleaned = raw
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```\s*$/m, "")
        .trim();
      return JSON.parse(cleaned) as T;
    } catch (primaryError) {
      lastError = primaryError as Error;

      // Try extracting the first JSON object/array
      const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        try {
          return JSON.parse(match[0]) as T;
        } catch (fallbackError) {
          console.warn(
            `[jsonCompletion] attempt ${attempt} fallback parse failed:`,
            (fallbackError as Error).message
          );
        }
      }

      console.warn(
        `[jsonCompletion] attempt ${attempt} failed:`,
        lastError.message
      );
    }
  }

  throw createAppError({
    code: API_GENERATE_002,
    devMessage: `JSON generation failed after ${maxRetries + 1} attempts: ${
      lastError?.message ?? "unknown parse error"
    }`,
    severity: "error",
    metadata: { maxRetries },
    cause: lastError,
  });
}

// ─── Blueprint ────────────────────────────────────────────────────────────────
export async function generateBlueprint(brief: SiteBrief): Promise<SiteBlueprint> {
  const designGuidance = buildDesignGuidance(brief);
  const activeArchetype = DESIGN_ARCHETYPES[brief.generationDesignStyle ?? "minimal"];
  const creativeDirection = await generateCreativeDirection(brief);

  const densityMap: Record<string, string> = {
    short: "Keep content concise — short punchy headings, 1-2 sentence descriptions, minimal body text. Prioritize visual impact over text volume.",
    balanced: "Use moderate content — clear headings with 2-3 sentence descriptions. Balance visual elements with readable text blocks.",
    detailed: "Use rich detailed content — longer descriptions, multiple paragraphs where appropriate, comprehensive information. Prioritize thoroughness.",
  };
  const contentDensity = densityMap[brief.generationContentDensity ?? "balanced"] ?? densityMap.balanced;

  const structureMap: Record<string, string> = {
    clean: "Use clean, well-organized layouts with clear visual hierarchy. Predictable grid structures with consistent alignment.",
    "grid-heavy": "Use strong grid-based layouts — multi-column grids, bento grids, card matrices. Show information density through structured grids.",
    asymmetric: "Use asymmetric, editorial-style layouts. Off-center compositions, varied column widths, overlapping elements, and dynamic visual flow.",
  };
  const structureGuidance = structureMap[brief.generationStructurePreference ?? "clean"] ?? structureMap.clean;

  const system = `You are an expert web architect, designer, and brand strategist.
Generate a unique, premium website blueprint as JSON.

CRITICAL UNIQUENESS RULES:
- Every site MUST be structurally unique based on business type and industry
- Vary layouts: editorial, bento, asymmetric, split-screen, grid, storytelling, card-based, zigzag, product-first, magazine, sidebar-led
- Choose fonts that match the brand personality — never default to Inter or Roboto for every site
- Color schemes must authentically reflect the brand, industry, and tone
- Do NOT default to the same hero+features+cta+footer pattern every time
- Section lists must be industry-appropriate: a restaurant needs menu/reservation, a SaaS needs dashboard-preview/integrations, a law firm needs practice-areas/credentials, etc.
- Use the supplied creative direction as hard guidance, not optional inspiration
- The blueprint must encode a strong point of view that later page generation can execute

SECTION TYPES — pick the most relevant for the industry:
navbar, hero, features, about, services, menu, pricing, testimonial, team, gallery, portfolio, stats, logos, cta, faq, contact, blog, timeline, video, map, reservation, products, integrations, case-studies, credentials, awards, process, comparison, footer

DESIGN DIRECTION GUIDELINES:
- Be specific and actionable: describe exact visual patterns, color usage, spacing mood, and UI motifs
- Mention specific design elements: e.g. "bold oversized serif headings, warm cream backgrounds, vintage illustration accents"
- Tailor to the industry: medical = clean/trustworthy, restaurant = warm/appetizing, tech = sharp/modern, wellness = calm/earthy
- Include 2-3 sentences covering: overall mood, component style, typography use

CONTENT DENSITY: ${contentDensity}
STRUCTURE: ${structureGuidance}

═══════════════════════════════════════════════════════════════
CREATIVE DIRECTION — FOLLOW CLOSELY:
${formatCreativeDirection(creativeDirection)}
═══════════════════════════════════════════════════════════════

BUSINESS CONTEXT:
${buildBusinessContextBlock(brief)}
═══════════════════════════════════════════════════════════════

INDUSTRY HINTS:
${buildIndustryPromptHints(brief)}
═══════════════════════════════════════════════════════════════

DESIGN SYSTEM GUIDANCE:
${designGuidance}
═══════════════════════════════════════════════════════════════`;

  const user = `Create a unique website blueprint for:

${buildBusinessContextBlock(brief)}

${
  brief.colorPalette && brief.colorPalette.length > 0
    ? `Specific Colors: ${brief.colorPalette.join(", ")} — build the color scheme around these exact hex values`
    : ""
}
Requested Design Style: ${activeArchetype.name} — ${activeArchetype.description.slice(0, 120)}

IMPORTANT: The typography, color scheme, and designDirection in your blueprint MUST align with the "${activeArchetype.name}" design archetype described in the system prompt. Do NOT fall back to generic choices.
We already created a creative direction. Translate it into a blueprint that preserves the same voice, structure, and visual signature.

Return JSON:
{
  "siteName": "string",
  "tagline": "string",
  "brandPersonality": "string (2-3 sentences)",
  "colorScheme": { "primary":"#hex","secondary":"#hex","accent":"#hex","bg":"#hex","text":"#hex","muted":"#hex","border":"#hex" },
  "typography": { "headingFont":"Google Font name","bodyFont":"Google Font name","style":"string","headingWeight":"700|800|900","lineHeight":"1.1|1.2|1.3" },
  "layoutStyle": "editorial|bento|asymmetric|split-screen|grid|storytelling|card-based|zigzag|product-first|magazine|sidebar-led",
  "navigationStyle": "minimal|full|floating",
  "footerStyle": "simple|detailed|bold|minimal",
  "animationStyle": "none|subtle|moderate|expressive",
  "designDirection": "string (2-3 sentences: overall mood, component style, typography use — be specific and industry-appropriate, aligned with the ${activeArchetype.name} archetype)",
  "pages": [{ "id":"uid","name":"string","slug":"url-slug","sections":["type1","type2","type3","type4","type5"],"purpose":"string","priority":1 }]
}

Rules:
- Do not repeat the same sections across every page unless they truly belong there.
- The home page should show the business model quickly.
- If the business provided offerings, products, menu items, or services, reflect them in section choices.
- Prefer page-specific content architecture over generic catch-all pages.`;

  const blueprint = await jsonCompletion<SiteBlueprint>(
    system,
    user,
    JSON_MAX_RETRIES,
    GENERATOR_PLAN_MAX_TOKENS
  );

  return normalizeBlueprint(blueprint, brief);
}

// ─── Extract sections from raw HTML ──────────────────────────────────────────
function extractSections(html: string): PageSection[] {
  const attrRe =
    /<(?:nav|header|section|article|footer|div|main|aside)[^>]+data-sz-section-id="([^"]+)"[^>]*>/gi;
  const typeRe = /data-sz-section-type="([^"]+)"/i;
  const nameRe = /data-sz-section-name="([^"]+)"/i;

  const sections: PageSection[] = [];
  let m: RegExpExecArray | null;

  while ((m = attrRe.exec(html)) !== null && sections.length < 30) {
    const tag  = m[0];
    const id   = m[1].trim() || `sec-${uid()}`;
    const type = typeRe.exec(tag)?.[1]?.trim() ?? "section";
    const name = nameRe.exec(tag)?.[1]?.trim() ?? (type.charAt(0).toUpperCase() + type.slice(1));
    sections.push({ id, type, name });
  }

  if (sections.length > 0) return sections;

  // Fallback: infer from semantic tag names, allow duplicates with suffixes
  const tagMap: Record<string, string> = {
    nav: "navbar", header: "hero", main: "content",
    section: "section", article: "article", footer: "footer", aside: "sidebar",
  };
  const tagRe = /<(nav|header|main|section|article|footer|aside)[^>]*>/gi;
  const typeCounts: Record<string, number> = {};

  while ((m = tagRe.exec(html)) !== null && sections.length < 20) {
    const tag   = m[1].toLowerCase();
    const type  = tagMap[tag] ?? tag;
    typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    const count = typeCounts[type];
    const name  = count > 1 ? `${type.charAt(0).toUpperCase() + type.slice(1)} ${count}` : type.charAt(0).toUpperCase() + type.slice(1);
    sections.push({ id: `sec-${uid()}`, type, name });
  }

  return sections.length > 0
    ? sections
    : [{ id: `sec-${uid()}`, type: "content", name: "Content" }];
}

// ─── HTML sanitizer ───────────────────────────────────────────────────────────
function sanitizeGeneratedHtml(raw: string): string {
  let html = raw
    .replace(/^```html?\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  if (!html) {
    throw createAppError({
      code: API_GENERATE_002,
      devMessage: "Generated HTML was empty after sanitization",
      severity: "error",
    });
  }

  // Unwrap JSON wrapper if AI ignored instructions
  if (html.startsWith("{") || html.startsWith('{"html"')) {
    try {
      const parsed = JSON.parse(html);
      if (typeof parsed.html === "string") {
        html = parsed.html.trim();
      }
    } catch {
      const m = html.match(/"html"\s*:\s*"([\s\S]*?)"\s*[,}]/);
      if (m) {
        html = m[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\")
          .trim();
      }
    }
  }

  // Strip full document wrapper if present
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) html = bodyMatch[1].trim();

  html = html
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .trim();

  html = normalizeGeneratedHtmlForEditor(html);

  if (!html.startsWith("<")) {
    throw createAppError({
      code: API_GENERATE_002,
      devMessage: "Generated content did not sanitize into valid HTML",
      severity: "error",
      metadata: { preview: html.slice(0, 160) },
    });
  }

  return html;
}

// ─── Shared system prompt builder ────────────────────────────────────────────
function buildPageSystemPrompt(
  blueprint: SiteBlueprint,
  brief: SiteBrief,
  imageGuide: string,
  wantsImages: boolean,
  logoInstruction: string,
  currencyInstruction: string,
  creativeDirection: CreativeDirection,
  pagePlan: PagePlan
): string {
  const designGuidance = buildDesignGuidance(brief);
  const allowedSectionTypes = SECTION_TYPE_OPTIONS.join(", ");

  return `You are an elite frontend developer specializing in premium, unique website design.
Generate production-ready HTML for a single website page body.

OUTPUT RULES — CRITICAL:
- Output ONLY the raw HTML body content. Nothing else.
- Do NOT wrap in JSON. Do NOT use markdown fences. Do NOT add explanation.
- Do NOT include <html>, <head>, or <body> tags — output only what goes INSIDE <body>
- Start your response directly with the first HTML tag (e.g. <nav or <header)

EDITOR DATA ATTRIBUTES — MANDATORY ON EVERY TOP-LEVEL SECTION:
Every direct child of the body MUST have these three attributes:
  data-sz-section-id="sec-[8-char-random]"  — unique stable ID. Generate a DIFFERENT random suffix for EVERY section. NEVER reuse.
  data-sz-section-type="[type]"              — use the real section type for that block. Allowed types: ${allowedSectionTypes}
  data-sz-section-name="[Name]"             — short human-readable label, max 50 chars
Examples:
  <nav data-sz-section-id="sec-n7x2k9qm" data-sz-section-type="navbar" data-sz-section-name="Navigation" class="...">
  <section data-sz-section-id="sec-h4p8r1wz" data-sz-section-type="hero" data-sz-section-name="Hero" class="...">
  <footer data-sz-section-id="sec-b1k7s4dn" data-sz-section-type="footer" data-sz-section-name="Footer" class="...">

NAVBAR RULES — CRITICAL:
- ALWAYS use position:sticky; top:0; z-index:1000 — NEVER position:fixed
- Sticky navbars stay in flow — no padding-top compensation needed on sections below
- Do NOT use negative margins, negative translateY offsets, or absolute positioning that pulls sections up
- The navbar must match the design archetype's NAVBAR style guidance — do NOT default to a generic logo-left links-right bar for every site
- Make the navbar feel unique and tailored to the brand — it's the first thing users see
${logoInstruction}

MAP / LOCATION RULES:
- For any map/location/directions section: use a REAL Google Maps iframe
- Format: <iframe src="https://www.google.com/maps?q=[URL_ENCODED_ADDRESS]&output=embed" width="100%" height="400" style="border:0;display:block;" allowfullscreen loading="lazy"></iframe>
- NEVER use a fake placeholder image as a map
${currencyInstruction}

TECHNICAL REQUIREMENTS:
- Use inline Tailwind CSS classes (CDN already loaded)
- Use inline styles with CSS variables (--primary, --secondary, --accent, --bg, --text)
- Make it visually stunning — not a generic template
- Include smooth hover effects using CSS transitions
- Use semantic HTML5 elements (nav, header, section, article, footer)
- Make fully responsive with Tailwind prefixes (sm:, md:, lg:)
- Do NOT use external JS libraries
- Avoid repeating the same card pattern, heading pattern, or background treatment across the whole page
- Make each section feel like it has its own job, not just new copy inside the same shell
${
  wantsImages
    ? "- Use ONLY the image URLs provided in IMAGE ASSIGNMENTS above — do NOT use placeholder.com, picsum, or make up any other URLs"
    : "- Do NOT use any images. Design with color and typography only."
}

ICON RULES:
- Do NOT use emojis anywhere in the HTML, copy, buttons, nav, badges, labels, or decorative text
- Do NOT use raw unicode symbols as fake icons (for example: ✓, ★, →, sparkles, map-pin emoji)
- If an icon is truly necessary, use a small inline SVG only
- Wrap any SVG icon in: <span data-sz-icon="true" style="display:inline-flex;align-items:center;justify-content:center;line-height:0;vertical-align:middle;"><svg ...></svg></span>
- Use icons sparingly: never more than one icon per button/card row unless the content truly requires it

EDITOR COMPATIBILITY RULES:
- All text must remain easy to edit in the visual editor
- Keep real copy in normal text elements: h1-h6, p, li, a, button, label, blockquote, figcaption
- Do NOT split a sentence or word across many nested spans just for styling
- Avoid letter-by-letter spans, per-word wrappers, SVG text, pseudo-element text, masked text, or decorative unicode text effects
- Do NOT use gradient text patterns that require text-transparent, background-clip:text, mix-blend-mode, or masked text
- Prefer one clean text node, with at most one simple accent span if absolutely necessary

MOTION COMPATIBILITY RULES:
- Use ONLY Sitezy-supported motion primitives
- Entrance motion must use data-sz-anim-in with one of: fade-up, fade-down, fade-left, fade-right, zoom-in, zoom-out
- Hover motion must use data-sz-hover-fx with one of: lift, grow, tilt, glow, soften
- Optional timing can use CSS variables on that same element: --sz-anim-duration, --sz-anim-delay, --sz-anim-ease
- Do NOT use custom keyframes, animate-* classes, marquee effects, parallax hacks, animation: inline styles, or JS-driven motion
- Do NOT hide meaning inside motion. The page must still look clean and complete with motion disabled

DESIGN REQUIREMENTS:
- Layout: ${blueprint.layoutStyle}
- Brand: ${blueprint.brandPersonality}
- Colors: primary=${blueprint.colorScheme.primary}, secondary=${blueprint.colorScheme.secondary}, accent=${blueprint.colorScheme.accent}, bg=${blueprint.colorScheme.bg}, text=${blueprint.colorScheme.text}${blueprint.colorScheme.muted ? `, muted=${blueprint.colorScheme.muted}` : ""}${blueprint.colorScheme.border ? `, border=${blueprint.colorScheme.border}` : ""}
- Heading font: ${blueprint.typography.headingFont}
- Body font: ${blueprint.typography.bodyFont}
- Heading weight: ${blueprint.typography.headingWeight ?? "700"}
- Line height: ${blueprint.typography.lineHeight ?? "1.2"}
- Animation: ${blueprint.animationStyle}
- Direction: ${blueprint.designDirection}

BUSINESS CONTEXT:
${buildBusinessContextBlock(brief)}

CREATIVE DIRECTION — THIS IS THE STANDARD TO HIT:
${formatCreativeDirection(creativeDirection)}

PAGE PLAN — EXECUTE THIS CLOSELY:
${formatPagePlan(pagePlan)}

═══════════════════════════════════════════════════════════════
DESIGN ARCHETYPE GUIDANCE — FOLLOW CLOSELY:
${designGuidance}
═══════════════════════════════════════════════════════════════

${imageGuide}`;
}

// ─── Page generation ──────────────────────────────────────────────────────────
export async function generatePage(
  blueprint: SiteBlueprint,
  page: BlueprintPage,
  brief: SiteBrief,
  onChunk?: (chunk: string, full: string) => void,
  navbarHtml?: string | null,
  instruction?: string | null
): Promise<{ html: string; sections: PageSection[] }> {
  const normalizedBlueprint = normalizeBlueprint(blueprint, brief);
  const normalizedPage: BlueprintPage = {
    ...page,
    id: page.id || slugifyText(page.name || "page"),
    slug: page.slug || slugifyText(page.name || "page"),
    sections: enrichBlueprintPageSections(
      { ...page, sections: page.sections ?? [] },
      brief
    ),
    purpose: page.purpose || `Support the ${page.name} user journey.`,
  };
  const creativeDirection = deriveCreativeDirectionFromBlueprint(normalizedBlueprint, brief);
  const pagePlan = await generatePagePlan(
    normalizedBlueprint,
    normalizedPage,
    brief,
    creativeDirection,
    instruction
  );
  const { wantsImages, imageGuide } = buildImageContext(brief);

  let resolvedImageGuide = imageGuide;
  if (wantsImages) {
    const imageMap = await resolveSmartImages(normalizedBlueprint, normalizedPage, brief);
    const smartGuide = formatResolvedImages(imageMap);
    resolvedImageGuide = smartGuide || imageGuide;
  }

  const logoInstruction = brief.hasLogo
    ? `\nLOGO IMAGE — CRITICAL: A custom logo image has been uploaded. In the navbar, use EXACTLY this as the logo element (no text brand name alongside it):\n<img src="__LOGO__" alt="${normalizedBlueprint.siteName} logo" style="height:44px;width:auto;object-fit:contain;display:block;" />\nUse src="__LOGO__" exactly as written — it will be replaced with the real image. Do NOT show the site name as text next to it.`
    : "";

  const currencyInstruction = brief.currency
    ? `\nCURRENCY: All prices MUST use ${brief.currency}. Do NOT use $ unless the currency is USD.`
    : "";

  const system = buildPageSystemPrompt(
    normalizedBlueprint,
    brief,
    resolvedImageGuide,
    wantsImages,
    logoInstruction,
    currencyInstruction,
    creativeDirection,
    pagePlan
  );

  const navLinks = formatNavLinks(normalizedBlueprint);

  const navbarInstruction = navbarHtml
    ? `\nNAVBAR CONSISTENCY — IMPORTANT:
The first page already has a navbar. You MUST generate a navbar that looks visually identical in style, colors, layout, fonts, and structure — but with the correct active state for THIS page ("${normalizedPage.name}").
Reference the design archetype guidance above for the navbar style. The existing navbar uses these navigation links: ${navLinks}.
Do NOT copy-paste the old HTML. Regenerate it fresh using the same design system so it stays consistent but can have page-specific active states.
Navbar concept for this page: ${pagePlan.navbarConcept}`
    : `\nGenerate a navbar as the first section. Follow the NAVBAR style from the design archetype guidance closely — do NOT default to a generic horizontal bar.`;

  const user = `Generate the "${normalizedPage.name}" page body for ${normalizedBlueprint.siteName}.

Business context:
${buildBusinessContextBlock(brief)}

Page purpose: ${normalizedPage.purpose}
Sections to include in order: ${normalizedPage.sections.join(", ")}
Navigation links (use these exact hrefs — NOT hash anchors): ${navLinks}
Signature moment to land: ${pagePlan.signatureMoment}
Story arc: ${pagePlan.storyArc}

IMPORTANT: For all navigation links use the slug paths above (e.g. href="/menu", href="/about"). Do NOT use href="#menu" or href="#about" — these break page navigation.
${navbarInstruction}

Output ONLY the raw HTML. Start with the first tag. No JSON, no markdown, no explanation.
${instruction ? `\nSPECIAL DIRECTION FOR THIS GENERATION: ${instruction}` : ""}`.trimEnd();

  let rawHtml = "";

  if (onChunk) {
    await streamCompletion(system, user, (chunk, full) => {
      rawHtml = full;
      onChunk(chunk, full);
    });
  } else {
    rawHtml = await streamCompletion(system, user, () => {});
  }

  const finalHtml = sanitizeGeneratedHtml(rawHtml);
  const sections = extractSections(finalHtml);
  return { html: finalHtml, sections };
}

// ─── Section regeneration ─────────────────────────────────────────────────────
export async function regenerateSection(
  blueprint: SiteBlueprint,
  brief: SiteBrief,
  page: Pick<BlueprintPage, "name" | "purpose">,
  section: {
    id?: string;
    type: string;
    name: string;
    html: string;
    previousSectionName?: string | null;
    nextSectionName?: string | null;
  },
  instruction?: string
): Promise<string> {
  const normalizedBlueprint = normalizeBlueprint(blueprint, brief);
  const creativeDirection = deriveCreativeDirectionFromBlueprint(normalizedBlueprint, brief);
  const refreshPlan = await generateSectionRefreshPlan(
    normalizedBlueprint,
    brief,
    page,
    section,
    instruction
  );
  const { wantsImages, imageGuide } = buildImageContext(brief);

  let resolvedImageGuide = imageGuide;
  if (wantsImages) {
    const ctx = {
      siteName: brief.siteName,
      siteType: brief.siteType ?? "agency",
      description: brief.description,
    };
    const slots = IMAGE_SLOTS[section.type] ?? [];
    const imageMap: Record<string, string> = {};

    await Promise.allSettled(
      slots.map(async (slot) => {
        const url = await fetchImage(buildImageQuery(slot, ctx));
        if (url) imageMap[`${section.type}__${slot}`] = url;
      })
    );

    const smartGuide = formatResolvedImages(imageMap);
    resolvedImageGuide = smartGuide || imageGuide;
  }

  const designGuidance = buildDesignGuidance(brief);

  const system = `You are an elite frontend developer and web designer.
Return ONLY the replacement HTML for ONE section. No explanation, no markdown.

OUTPUT RULES:
- Return a single top-level semantic section block only
- Do NOT return the full page
- Do NOT wrap in JSON
- Do NOT include <html>, <head>, or <body>
- Match the existing site's visual language exactly
- Keep spacing rhythm, typography, color usage, and component tone consistent
- Preserve the semantic role of the section
- Use inline Tailwind utility classes and inline styles with CSS variables (--primary, --secondary, --accent, --bg, --text)
- PRESERVE ALL three data-sz-* attributes from the original on the root element
- If any are missing, add them: data-sz-section-id="${section.id ?? ""}" data-sz-section-type="${section.type}" data-sz-section-name="${section.name}"
- The data-sz-section-id MUST remain identical to the original — never change it
- Sharpen the section so it feels more authored and less templated than before
${wantsImages ? "- Use ONLY the image URLs from IMAGE ASSIGNMENTS above — no placeholders" : "- Do NOT use images"}
- Do NOT use emojis or raw unicode symbols as fake icons
- If an icon is needed, use one small inline SVG wrapped in <span data-sz-icon="true">...</span>
- Keep text directly editable: do NOT split sentences across many spans or use gradient/masked text effects
- Use only Sitezy-supported motion via data-sz-anim-in and data-sz-hover-fx; no custom keyframes or animate-* classes

SITE DESIGN SYSTEM:
- Site: ${normalizedBlueprint.siteName}
- Layout: ${normalizedBlueprint.layoutStyle}
- Brand: ${normalizedBlueprint.brandPersonality}
- Direction: ${normalizedBlueprint.designDirection}
- Colors: primary=${normalizedBlueprint.colorScheme.primary}, secondary=${normalizedBlueprint.colorScheme.secondary}, accent=${normalizedBlueprint.colorScheme.accent}, bg=${normalizedBlueprint.colorScheme.bg}, text=${normalizedBlueprint.colorScheme.text}
- Heading font: ${normalizedBlueprint.typography.headingFont}
- Body font: ${normalizedBlueprint.typography.bodyFont}

BUSINESS CONTEXT:
${buildBusinessContextBlock(brief)}

CREATIVE DIRECTION:
${formatCreativeDirection(creativeDirection)}

SECTION REFRESH PLAN:
${formatSectionRefreshPlan(refreshPlan)}

DESIGN ARCHETYPE GUIDANCE:
${designGuidance}

${resolvedImageGuide}`;

  const user = `Regenerate this section so it feels fresh, premium, and on-brand.

Page: ${page.name}
Page purpose: ${page.purpose}
Business type: ${brief.siteType}
Tone: ${brief.tone}
Features: ${brief.features || "none"}

Section type: ${section.type}
Section name: ${section.name}
Previous section: ${section.previousSectionName || "none"}
Next section: ${section.nextSectionName || "none"}

Current section HTML:
${section.html.slice(0, 6000)}
${section.html.length > 6000 ? "\n<!-- section truncated for brevity -->" : ""}

Return ONLY the new HTML for this one section.
${instruction ? `Additional direction: ${instruction}` : ""}

Avoid generic filler headings, repeated card shells, vague copy like "Why choose us" unless the section truly needs it, and any decorative emoji/symbol text.`;

  const html = await streamCompletion(system, user, () => {}, SECTION_MAX_TOKENS);
  return sanitizeGeneratedHtml(html);
}

// ─── Generate new block ───────────────────────────────────────────────────────
async function reuseOrGenerateNavbar(
  navbarHtml: string | null | undefined,
  blueprint: SiteBlueprint,
  brief: SiteBrief,
  block: { type: string; label: string },
  page: Pick<BlueprintPage, "name" | "purpose">
): Promise<string | null> {
  if (block.type !== "navbar") return null;
  if (navbarHtml) return sanitizeGeneratedHtml(navbarHtml);
  return null; // Let the main flow generate a new navbar
}

export async function generateNewBlock(
  blueprint: SiteBlueprint,
  brief: SiteBrief,
  page: Pick<BlueprintPage, "name" | "purpose">,
  block: {
    type: string;
    label: string;
    placement: string;
  },
  context: {
    existingSections: string[];
    previousSectionName?: string | null;
    nextSectionName?: string | null;
    selectedSectionName?: string | null;
    selectedNodeLabel?: string | null;
    navbarHtml?: string | null;
  }
): Promise<string> {
  const normalizedBlueprint = normalizeBlueprint(blueprint, brief);
  const creativeDirection = deriveCreativeDirectionFromBlueprint(normalizedBlueprint, brief);
  const reusedNavbar = await reuseOrGenerateNavbar(
    context.navbarHtml,
    normalizedBlueprint,
    brief,
    block,
    page
  );
  if (reusedNavbar) return reusedNavbar;
  const blockPlan = await generateBlockPlan(
    normalizedBlueprint,
    brief,
    page,
    block,
    {
      existingSections: context.existingSections,
      previousSectionName: context.previousSectionName ?? null,
      nextSectionName: context.nextSectionName ?? null,
      selectedSectionName: context.selectedSectionName ?? null,
      selectedNodeLabel: context.selectedNodeLabel ?? null,
    }
  );

  const { wantsImages, imageGuide } = buildImageContext(brief);

  let resolvedImageGuide = imageGuide;
  if (wantsImages) {
    const ctx = {
      siteName: brief.siteName,
      siteType: brief.siteType ?? "agency",
      description: brief.description,
    };
    const slots = IMAGE_SLOTS[block.type] ?? [];
    const imageMap: Record<string, string> = {};

    await Promise.allSettled(
      slots.map(async (slot) => {
        const url = await fetchImage(buildImageQuery(slot, ctx));
        if (url) imageMap[`${block.type}__${slot}`] = url;
      })
    );

    const smartGuide = formatResolvedImages(imageMap);
    resolvedImageGuide = smartGuide || imageGuide;
  }

  const isInline = block.placement === "inline";

  const placementContext =
    block.placement === "top"
      ? "Position it at the very top of the page (e.g. navbar or announcement bar)."
      : block.placement === "bottom"
      ? "Position it at the bottom of the page (e.g. footer or bottom CTA)."
      : isInline
      ? `Insert it INLINE inside a section${context.selectedSectionName ? ` (inside "${context.selectedSectionName}")` : ""}${context.selectedNodeLabel ? ` near the element "${context.selectedNodeLabel}"` : ""}. Return a compact inline snippet, NOT a full section wrapper.`
      : `Insert it as a full standalone section${context.previousSectionName ? ` after "${context.previousSectionName}"` : ""}${context.nextSectionName ? ` before "${context.nextSectionName}"` : ""}.`;

  const designGuidance = buildDesignGuidance(brief);

  const system = `You are an elite frontend developer generating a NEW block or section for an existing website.
Return ONLY the HTML for the new block/section. No explanation, no markdown, no full page.

OUTPUT RULES:
- Return a single top-level HTML block/section only
- Do NOT return the full page — only the new block
- Do NOT wrap in JSON
- Do NOT include <html>, <head>, or <body>
- Match the existing site's visual language exactly
- Use inline Tailwind utility classes and inline styles with CSS variables (--primary, --secondary, --accent, --bg, --text)
${
  wantsImages
    ? "- Use ONLY the image URLs from IMAGE ASSIGNMENTS above — no placeholders, no picsum"
    : "- Do NOT use images"
}
- Make the new block feel intentionally designed for this business, not like a generic addon
- Do NOT use emojis or raw unicode symbols as fake icons
- If an icon is necessary, use one small inline SVG wrapped in <span data-sz-icon="true">...</span>
- Keep text easy to edit: no fragmented letter-by-letter spans, gradient text hacks, or masked text effects
- Use only Sitezy-supported motion via data-sz-anim-in and data-sz-hover-fx; do not use animate-* classes or custom animation CSS
- Add all three editor attributes on the ROOT element:
    data-sz-section-id="sec-${uid()}"
    data-sz-section-type="${block.type}"
    data-sz-section-name="${block.label}"

SITE DESIGN SYSTEM:
- Site: ${normalizedBlueprint.siteName}
- Layout: ${normalizedBlueprint.layoutStyle}
- Brand: ${normalizedBlueprint.brandPersonality}
- Direction: ${normalizedBlueprint.designDirection}
- Colors: primary=${normalizedBlueprint.colorScheme.primary}, secondary=${normalizedBlueprint.colorScheme.secondary}, accent=${normalizedBlueprint.colorScheme.accent}, bg=${normalizedBlueprint.colorScheme.bg}, text=${normalizedBlueprint.colorScheme.text}
- Heading font: ${normalizedBlueprint.typography.headingFont}
- Body font: ${normalizedBlueprint.typography.bodyFont}
- Animation: ${normalizedBlueprint.animationStyle}

BUSINESS CONTEXT:
${buildBusinessContextBlock(brief)}

CREATIVE DIRECTION:
${formatCreativeDirection(creativeDirection)}

BLOCK PLAN:
${formatBlockPlan(blockPlan)}

DESIGN ARCHETYPE GUIDANCE:
${designGuidance}

${resolvedImageGuide}`;

  const user = `Generate a new "${block.label}" (type: ${block.type}) block for the "${page.name}" page.

Page purpose: ${page.purpose}
Business: ${brief.siteName} — ${brief.description}
Business type: ${brief.siteType}
Tone: ${brief.tone}
Features: ${brief.features || "none"}

Existing sections on this page (in order): ${
    context.existingSections.length > 0
      ? context.existingSections.join(", ")
      : "none yet"
  }
${context.previousSectionName ? `Section immediately before: ${context.previousSectionName}` : ""}
${context.nextSectionName ? `Section immediately after: ${context.nextSectionName}` : ""}

Placement: ${placementContext}

Return ONLY the new ${isInline ? "inline snippet" : "section"} HTML.
Avoid generic headings, repeated feature-card patterns, and decorative emoji/symbol text.`;

  const html = await streamCompletion(system, user, () => {}, SECTION_MAX_TOKENS);
  return sanitizeGeneratedHtml(html);
}

// ─── AI assistant ─────────────────────────────────────────────────────────────
export async function aiAssist(
  instruction: string,
  context: {
    projectName: string;
    blueprint?: SiteBlueprint | null;
    pageName?: string;
    pageHtml?: string;
    siteType?: string;
  },
  onChunk: (chunk: string, full: string) => void
): Promise<string> {
  const palette    = getSiteImagePalette(context.siteType ?? "agency");
  const imageGuide = formatPaletteForPrompt(palette);

  // Summarise pageHtml rather than blindly truncating — indicate truncation to AI
  const pageContext = context.pageHtml
    ? context.pageHtml.length > 6000
      ? `${context.pageHtml.slice(0, 6000)}\n<!-- HTML truncated at 6000 chars — full page is longer -->`
      : context.pageHtml
    : null;

  const system = `You are Sitezy's in-editor AI assistant. You help the user modify their website with friendly, concise natural-language replies AND, when they ask for a change, perform a precise edit on a single section.

Project: ${context.projectName}
${context.pageName ? `Current page: ${context.pageName}` : ""}

REPLY FORMAT — follow exactly:
1. ALWAYS begin with a short, friendly natural-language message (1–2 sentences) describing what you are doing or answering. Examples: "Alright, punching up the hero headline.", "Sure — swapping the CTA button copy to 'Start free trial'."
2. If (and only if) the user is requesting a change you can make to the page, append an edit block AFTER the message in this EXACT format:

---SITEZY-EDIT---
{"sectionId":"<the data-sz-section-id of the section to replace>","sectionType":"<short type label>"}
---SITEZY-HTML---
<the FULL replacement HTML for that single section, starting with the same root tag>
---SITEZY-END---

STRICT RULES:
- Use the EXACT data-sz-section-id value from the current page HTML below. Never invent IDs.
- Replace exactly ONE section per reply. Never return the entire page.
- The replacement HTML must keep the same root element tag and preserve its data-sz-section-id, data-sz-section-type, and data-sz-section-name attributes.
- Output raw HTML only inside the html block — no markdown fences, no commentary.
- Never write anything after ---SITEZY-END---.
- If the user is just asking a question or you cannot identify a target section, omit the edit block entirely and only reply with the natural-language message.
- Keep the natural-language message friendly, specific, and under 200 characters.

${imageGuide}`;

  const user = pageContext
    ? `Current page HTML:\n${pageContext}\n\nUser request: ${instruction}`
    : instruction;

  return streamCompletion(system, user, onChunk);
}

// ─── Add new page ─────────────────────────────────────────────────────────────
export async function generateNewPage(
  blueprint: SiteBlueprint,
  pageName: string,
  pageDescription: string,
  brief: SiteBrief
): Promise<{ page: BlueprintPage; html: string; sections: PageSection[] }> {
  const normalizedBlueprint = normalizeBlueprint(blueprint, brief);
  const creativeDirection = deriveCreativeDirectionFromBlueprint(normalizedBlueprint, brief);
  const planSystem =
    "You are a web architect planning a new page for an existing premium website. Return JSON only.";
  const planUser = `Add a "${pageName}" page to ${normalizedBlueprint.siteName}.

${buildBusinessContextBlock(brief)}

Existing pages: ${normalizedBlueprint.pages.map((p) => `${p.name} (${p.purpose})`).join(", ")}
Current design direction: ${normalizedBlueprint.designDirection}
Creative direction:
${formatCreativeDirection(creativeDirection)}

New page description: ${pageDescription}

Return JSON:
{
  "id":"uid",
  "name":"${pageName}",
  "slug":"url-slug",
  "sections":["type1","type2","type3"],
  "purpose":"string",
  "priority": 99
}

Rules:
- Make the section list specific to the actual purpose of this page.
- Avoid generic filler sections unless they are truly needed.
- Use section types from this list when possible: ${SECTION_TYPE_OPTIONS.join(", ")}.`;

  const rawPageBlueprint = await jsonCompletion<BlueprintPage>(
    planSystem,
    planUser,
    JSON_MAX_RETRIES,
    PLAN_MAX_TOKENS
  );
  const pageBlueprint: BlueprintPage = {
    ...rawPageBlueprint,
    id: rawPageBlueprint.id || slugifyText(pageName),
    name: rawPageBlueprint.name || pageName,
    slug: rawPageBlueprint.slug || slugifyText(pageName),
    purpose: rawPageBlueprint.purpose || pageDescription,
    sections: enrichBlueprintPageSections(
      {
        ...rawPageBlueprint,
        name: rawPageBlueprint.name || pageName,
        slug: rawPageBlueprint.slug || slugifyText(pageName),
        sections: rawPageBlueprint.sections ?? [],
        purpose: rawPageBlueprint.purpose || pageDescription,
      },
      brief
    ),
    priority: rawPageBlueprint.priority,
  };
  const result = await generatePage(normalizedBlueprint, pageBlueprint, brief);
  return { page: pageBlueprint, html: result.html, sections: result.sections };
}

// ─── Engine availability ──────────────────────────────────────────────────────
export function hasApiKey(): boolean {
  return !!(process.env.SITEZY_SPARK_KEY || process.env.ANTHROPIC_API_KEY);
}

/** @deprecated Use hasApiKey() instead */
export function getEngineAvailability() {
  return { spark: hasApiKey() };
}
