import { getSiteImagePalette, formatPaletteForPrompt } from "@/lib/utils/images";
import { deriveImageSubject, fetchStockImage } from "@/lib/ai/utils/stock-images";
import {
  stripLeadingMarkedSection,
  stripLeadingTag,
  stripTrailingMarkedSection,
  stripTrailingTag,
} from "@/lib/utils";
import {
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
  generateAdditionalPageForBlueprint,
  generateBlueprintForBrief,
  generatePageForBlueprint,
} from "@/lib/ai/generate-site";
import { runWizardEngine } from "@/lib/ai/engines/wizardEngine";
import {
  jsonCompletion,
  streamCompletion,
  streamCompletionMultiTurn,
} from "@/lib/ai/runtime";
export { jsonCompletion, streamCompletion, streamCompletionMultiTurn };
import type {
  BriefChatMessage as StructuredBriefChatMessage,
  BriefInterviewResult as StructuredBriefInterviewResult,
  SiteGenerationPlan,
} from "@/lib/ai/types";
import {
  buildDesignGuidance,
  selectFontPairingForBrief,
} from "@/lib/ai/design-archetypes";
import {
  buildBlockPlanSystemPrompt,
  buildBlockPlanUserPrompt,
  buildBusinessContextBlock,
  buildSectionRefreshSystemPrompt,
  buildSectionRefreshUserPrompt,
  enrichBlueprintPageSections,
  formatBlockPlan,
  formatCreativeDirection,
  formatSectionRefreshPlan,
  normalizeBlockPlan,
  normalizeCreativeDirection,
  normalizeSectionRefreshPlan,
  type BlockPlan,
  type CreativeDirection,
  type SectionRefreshPlan,
} from "@/lib/ai/generation-strategy";
import {
  buildAdaptivePageContentSnapshot,
  buildAdaptiveSectionContentSnapshot,
  isAdaptiveGenerationGloballyDisabled,
  recordAdaptiveGenerationRun,
  resolveAdaptiveGenerationState,
  snapshotAdaptivePreferencesFromBrief,
  type AdaptiveGenerationContext,
} from "@/lib/server/ai-learning";

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTION_MAX_TOKENS  = 8_000;
const PLAN_MAX_TOKENS     = 4_096;
const JSON_MAX_RETRIES    = 4;
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u200D\uFE0F]/gu;
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

function isAdaptiveRunEnabled(enabled: boolean | null | undefined): boolean {
  return Boolean(enabled) && !isAdaptiveGenerationGloballyDisabled();
}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
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

  // Guarantee the wizard's page selection is honored: append any brief page that
  // the planner didn't produce, matching on slug so we don't duplicate existing ones.
  const existingSlugs = new Set(pages.map((page) => page.slug));
  (brief.pages ?? []).forEach((pageName, index) => {
    const name = (pageName || "").trim();
    if (!name) return;
    const slug = slugifyText(name);
    if (!slug || existingSlugs.has(slug)) return;
    existingSlugs.add(slug);
    const appendedPage: BlueprintPage = {
      id: `page-${pages.length + index + 1}`,
      slug,
      name,
      purpose: `Support the ${name} user journey.`,
      sections: [],
    };
    pages.push({
      ...appendedPage,
      sections: enrichBlueprintPageSections(appendedPage, brief),
    });
  });

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
      if (/data-sz-icon=|data-sz-count|data-sz-words|sz-gradient-text|sz-word\b/i.test(inner)) return match;
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
  const base = deriveImageSubject({ description: ctx.description, industry: ctx.siteType, excludeName: ctx.siteName });

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

// ─── Conversational Brief Interview ──────────────────────────────────────────

export type BriefChatMessage = StructuredBriefChatMessage;
export type BriefInterviewResult = StructuredBriefInterviewResult;

/**
 * Conducts an AI-powered brief interview.
 * The AI asks targeted questions based on what it already knows,
 * extracting structured SiteBrief data progressively.
 */
export async function conductBriefInterview(
  messages: BriefChatMessage[],
  currentBrief: Partial<SiteBrief>,
  options?: { skipResearch?: boolean }
): Promise<BriefInterviewResult> {
  return runWizardEngine(messages, currentBrief, options);
}

// ─── Blueprint ────────────────────────────────────────────────────────────────
export async function generateBlueprint(
  brief: SiteBrief,
  context?: AdaptiveGenerationContext
): Promise<SiteBlueprint> {
  const adaptiveState = await resolveAdaptiveGenerationState(brief, context);
  const selfLearning = adaptiveState.settings?.experimental?.selfLearningGenerator ?? false;
  const blueprint = await generateBlueprintForBrief(adaptiveState.adaptedBrief, { selfLearning });
  const generationPlan = blueprint.generationPlan as SiteGenerationPlan | undefined;

  if (context?.userId) {
    await recordAdaptiveGenerationRun(
      {
        userId: context.userId,
        projectId: context.projectId ?? null,
        kind: "blueprint",
        brief: adaptiveState.adaptedBrief,
        preferenceSnapshot: snapshotAdaptivePreferencesFromBrief(adaptiveState.adaptedBrief),
        appliedOverrides: adaptiveState.appliedOverrides,
        profile: adaptiveState.profile,
        adaptiveEnabled: isAdaptiveRunEnabled(adaptiveState.settings?.ai.adaptiveGenerationEnabled),
        summary: generationPlan
          ? summarizeGenerationPlan(generationPlan)
          : {
              siteName: blueprint.siteName,
              pageCount: blueprint.pages.length,
              pageSlugs: blueprint.pages.map((page) => page.slug),
            },
      },
      { admin: context?.admin }
    );
  }

  return blueprint;
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

function summarizeGenerationPlan(plan: SiteGenerationPlan): Record<string, unknown> {
  return {
    generatedAt: plan.generatedAt,
    businessName: plan.businessBrief.businessName,
    industry: plan.businessBrief.industry,
    pageCount: plan.layout.pages.length,
    pageSlugs: plan.layout.pages.map((page) => page.slug),
    sectionCounts: plan.layout.pages.map((page) => ({
      pageId: page.pageId,
      slug: page.slug,
      count: page.sections.length,
    })),
    strategy: {
      positioning: plan.strategy.positioning,
      trustSignals: plan.strategy.trustSignals.slice(0, 4),
    },
    design: {
      conceptName: plan.design.conceptName,
      layoutStyle: plan.design.layoutStyle,
      siteFormat: plan.design.siteFormat,
      navigationStyle: plan.design.navigationStyle,
      footerStyle: plan.design.footerStyle,
    },
    copy: {
      tagline: plan.copy.tagline,
      primaryCta: plan.copy.primaryCta,
      secondaryCta: plan.copy.secondaryCta,
    },
    layout: {
      antiRepetitionRules: plan.layout.antiRepetitionRules.slice(0, 4),
      siteWidePatterns: plan.layout.siteWidePatterns.slice(0, 4),
    },
  };
}

// ─── Progressive section rendering event ─────────────────────────────────────
export interface ProgressiveSectionEvent {
  sectionId: string;
  sectionType: string;
  sectionName: string;
  sectionIndex: number;
  totalSections: number;
  cumulativeHtml: string;
}

/** Fires `onSectionRendered` whenever the stream closes a top-level section. */
function makeProgressiveSectionWatcher(
  expectedSectionCount: number,
  onSectionRendered: (event: ProgressiveSectionEvent) => void | Promise<void>
) {
  const SECTION_ROOT_RE =
    /<(nav|header|section|article|footer|div|main|aside)\b[^>]*data-sz-section-id="([^"]+)"[^>]*>/gi;
  const emitted = new Set<string>();

  return (full: string) => {
    SECTION_ROOT_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    let sectionIndex = 0;

    while ((match = SECTION_ROOT_RE.exec(full)) !== null) {
      const tagName = match[1].toLowerCase();
      const sectionId = match[2];
      const openStart = match.index;
      const openEnd = full.indexOf(">", openStart);
      if (openEnd === -1) break;

      const openRe = new RegExp(`<${tagName}\\b`, "gi");
      const closeRe = new RegExp(`</${tagName}\\s*>`, "gi");
      let depth = 1;
      let pos = openEnd + 1;
      let closed = false;

      while (depth > 0 && pos < full.length) {
        openRe.lastIndex = pos;
        closeRe.lastIndex = pos;
        const o = openRe.exec(full);
        const c = closeRe.exec(full);
        if (!c) break;
        if (o && o.index < c.index) {
          depth++;
          pos = o.index + o[0].length;
        } else {
          depth--;
          pos = c.index + c[0].length;
          if (depth === 0) closed = true;
        }
      }

      if (closed && !emitted.has(sectionId)) {
        emitted.add(sectionId);
        const tagHtml = full.slice(openStart, openEnd + 1);
        const typeMatch = tagHtml.match(/data-sz-section-type="([^"]+)"/i);
        const nameMatch = tagHtml.match(/data-sz-section-name="([^"]+)"/i);
        void onSectionRendered({
          sectionId,
          sectionType: typeMatch?.[1] ?? "section",
          sectionName: nameMatch?.[1] ?? `Section ${sectionIndex + 1}`,
          sectionIndex,
          totalSections: Math.max(expectedSectionCount, emitted.size),
          cumulativeHtml: full,
        });
      }
      sectionIndex++;
    }
  };
}

// ─── Page generation ──────────────────────────────────────────────────────────
// Builds a compact, truncated reference of the site's existing navbar/footer so
// the model matches their visual language when generating the rest of the page.
function buildChromeReference(
  navbarHtml?: string | null,
  footerHtml?: string | null
): string | null {
  const parts: string[] = [];
  if (navbarHtml) {
    parts.push(`Existing navbar HTML:\n${navbarHtml.slice(0, 2000)}`);
  }
  if (footerHtml) {
    parts.push(`Existing footer HTML:\n${footerHtml.slice(0, 1600)}`);
  }
  return parts.length ? parts.join("\n\n") : null;
}

// Re-attaches reused chrome to a generated page body, stripping any leading
// nav/header or trailing footer the model emitted despite instructions so the
// shared chrome is never duplicated.
function assemblePageWithChrome(
  rawBody: string,
  navbarHtml?: string | null,
  footerHtml?: string | null
): string {
  const reuseNavbar = !!navbarHtml;
  const reuseFooter = !!footerHtml;
  if (!reuseNavbar && !reuseFooter) return rawBody;

  let body = rawBody;
  if (reuseNavbar) {
    body = stripLeadingMarkedSection(
      stripLeadingTag(stripLeadingTag(body, "nav"), "header"),
      "navbar"
    );
  }
  if (reuseFooter) {
    body = stripTrailingMarkedSection(stripTrailingTag(body, "footer"), "footer");
  }

  return [reuseNavbar ? navbarHtml : null, body, reuseFooter ? footerHtml : null]
    .filter(Boolean)
    .join("\n");
}

export async function generatePage(
  blueprint: SiteBlueprint,
  page: BlueprintPage,
  brief: SiteBrief,
  onChunk?: (chunk: string, full: string) => void,
  navbarHtml?: string | null,
  footerHtml?: string | null,
  instruction?: string | null,
  onSectionRendered?: (event: ProgressiveSectionEvent) => void | Promise<void>,
  context?: AdaptiveGenerationContext
): Promise<{ html: string; sections: PageSection[] }> {
  const adaptiveState = await resolveAdaptiveGenerationState(brief, context);
  const reuseNavbar = !!navbarHtml;
  const reuseFooter = !!footerHtml;
  const reuseChrome = reuseNavbar || reuseFooter;
  let rawHtml = "";
  const normalizedPage: BlueprintPage = {
    ...page,
    id: page.id || slugifyText(page.name || "page"),
    slug: page.slug || slugifyText(page.name || "page"),
    sections: enrichBlueprintPageSections(
      { ...page, sections: page.sections ?? [] },
      adaptiveState.adaptedBrief
    ),
    purpose: page.purpose || `Support the ${page.name} user journey.`,
  };

  const sectionWatcher = onSectionRendered
    ? makeProgressiveSectionWatcher(
        normalizedPage.sections.length || 1,
        onSectionRendered
      )
    : null;

  const handleChunk = (chunk: string, full: string) => {
    rawHtml = full;
    if (sectionWatcher) sectionWatcher(full);
    if (onChunk) onChunk(chunk, full);
  };

  const result = await generatePageForBlueprint(
    blueprint,
    normalizedPage,
    adaptiveState.adaptedBrief,
    handleChunk,
    instruction,
    {
      selfLearning: adaptiveState.settings?.experimental?.selfLearningGenerator ?? false,
      chrome: reuseChrome
        ? {
            reuseNavbar,
            reuseFooter,
            reference: buildChromeReference(navbarHtml, footerHtml),
          }
        : null,
    }
  );
  rawHtml = result.html;

  const finalHtml = assemblePageWithChrome(
    sanitizeGeneratedHtml(rawHtml),
    reuseNavbar ? navbarHtml : null,
    reuseFooter ? footerHtml : null
  );
  const sections = extractSections(finalHtml);
  const pageSnapshot = buildAdaptivePageContentSnapshot({
    id: normalizedPage.id,
    name: normalizedPage.name,
    slug: normalizedPage.slug,
    html: finalHtml,
    sections,
  });
  if (context?.userId) {
    await recordAdaptiveGenerationRun(
      {
        userId: context.userId,
        projectId: context.projectId ?? null,
        kind: "page",
        brief: adaptiveState.adaptedBrief,
        preferenceSnapshot: snapshotAdaptivePreferencesFromBrief(adaptiveState.adaptedBrief),
        appliedOverrides: adaptiveState.appliedOverrides,
        profile: adaptiveState.profile,
        adaptiveEnabled: isAdaptiveRunEnabled(adaptiveState.settings?.ai.adaptiveGenerationEnabled),
        summary: {
          pageId: normalizedPage.id,
          pageName: normalizedPage.name,
          slug: normalizedPage.slug,
          sectionCount: sections.length,
          sectionTypes: sections.map((section) => section.type),
          htmlLength: finalHtml.length,
          pageSnapshot,
        },
      },
      { admin: context?.admin }
    );
  }
  // Flush one last event so subscribers observe the sanitized final HTML.
  if (sectionWatcher) sectionWatcher(finalHtml);
  return { html: finalHtml, sections };
}

// ─── Section regeneration ─────────────────────────────────────────────────────
export async function regenerateSection(
  blueprint: SiteBlueprint,
  brief: SiteBrief,
  page: Pick<BlueprintPage, "name" | "purpose"> & {
    id?: string | null;
    slug?: string | null;
  },
  section: {
    id?: string;
    type: string;
    name: string;
    html: string;
    previousSectionName?: string | null;
    nextSectionName?: string | null;
  },
  instruction?: string,
  context?: AdaptiveGenerationContext
): Promise<string> {
  const adaptiveState = await resolveAdaptiveGenerationState(brief, context);
  const effectiveBrief = adaptiveState.adaptedBrief;
  const normalizedBlueprint = normalizeBlueprint(blueprint, effectiveBrief);
  const creativeDirection = deriveCreativeDirectionFromBlueprint(normalizedBlueprint, effectiveBrief);
  const refreshPlan = await generateSectionRefreshPlan(
    normalizedBlueprint,
    effectiveBrief,
    page,
    section,
    instruction
  );
  const { wantsImages, imageGuide } = buildImageContext(effectiveBrief);

  let resolvedImageGuide = imageGuide;
  if (wantsImages) {
    const ctx = {
      siteName: effectiveBrief.siteName,
      siteType: effectiveBrief.siteType ?? "agency",
      description: effectiveBrief.description,
    };
    const slots = IMAGE_SLOTS[section.type] ?? [];
    const imageMap: Record<string, string> = {};

    await Promise.allSettled(
      slots.map(async (slot) => {
        const url = await fetchStockImage(buildImageQuery(slot, ctx));
        if (url) imageMap[`${section.type}__${slot}`] = url;
      })
    );

    const smartGuide = formatResolvedImages(imageMap);
    resolvedImageGuide = smartGuide || imageGuide;
  }

  const designGuidance = buildDesignGuidance(effectiveBrief);

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
${buildBusinessContextBlock(effectiveBrief)}

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
Business type: ${effectiveBrief.siteType}
Tone: ${effectiveBrief.tone}
Features: ${effectiveBrief.features || "none"}

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
  const finalHtml = sanitizeGeneratedHtml(html);
  const sectionSnapshot = buildAdaptiveSectionContentSnapshot(
    {
      id: section.id ?? "",
      type: section.type,
      name: section.name,
    },
    finalHtml
  );
  if (context?.userId) {
    await recordAdaptiveGenerationRun(
      {
        userId: context.userId,
        projectId: context.projectId ?? null,
        kind: "section",
        brief: effectiveBrief,
        preferenceSnapshot: snapshotAdaptivePreferencesFromBrief(effectiveBrief),
        appliedOverrides: adaptiveState.appliedOverrides,
        profile: adaptiveState.profile,
        adaptiveEnabled: isAdaptiveRunEnabled(adaptiveState.settings?.ai.adaptiveGenerationEnabled),
        summary: {
          pageId: page.id ?? null,
          pageSlug: page.slug ?? null,
          pageName: page.name,
          pagePurpose: page.purpose,
          sectionId: section.id ?? null,
          sectionType: section.type,
          sectionName: section.name,
          htmlLength: finalHtml.length,
          instruction: instruction ?? null,
          sectionSnapshot: sectionSnapshot
            ? {
                ...sectionSnapshot,
                pageId: page.id ?? null,
                pageSlug: page.slug ?? null,
                pageName: page.name,
              }
            : null,
        },
      },
      { admin: context?.admin }
    );
  }
  return finalHtml;
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
        const url = await fetchStockImage(buildImageQuery(slot, ctx));
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
    brief?: SiteBrief | null;
    pageName?: string;
    pageHtml?: string;
    siteType?: string;
    selectedSectionId?: string | null;
    selectedElement?: {
      nodeId: string;
      tagName: string;
      textContent?: string;
      sectionId?: string;
    } | null;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    scope?: "element" | "section" | "page" | "site";
  },
  onChunk: (chunk: string, full: string) => void
): Promise<string> {
  const palette    = getSiteImagePalette(context.siteType ?? "agency");
  const imageGuide = formatPaletteForPrompt(palette);

  // Provide focused context based on scope / selection
  let pageContext: string | null = null;
  if (context.pageHtml) {
    if (
      context.selectedSectionId &&
      context.scope !== "page" &&
      context.scope !== "site"
    ) {
      const sectionHtml = extractSectionHtmlById(
        context.pageHtml,
        context.selectedSectionId
      );
      if (sectionHtml) {
        pageContext = `[Selected section HTML — data-sz-section-id="${context.selectedSectionId}"]\n${sectionHtml}`;
      }
    }
    if (!pageContext) {
      pageContext =
        context.pageHtml.length > 6000
          ? `${context.pageHtml.slice(0, 6000)}\n<!-- HTML truncated at 6000 chars — full page is longer -->`
          : context.pageHtml;
    }
  }

  const designContext = context.blueprint
    ? `\nDesign system: ${context.blueprint.colorScheme.primary} primary, ${context.blueprint.colorScheme.secondary} secondary, ${context.blueprint.colorScheme.accent} accent, bg ${context.blueprint.colorScheme.bg}, text ${context.blueprint.colorScheme.text}. Fonts: ${context.blueprint.typography.headingFont} / ${context.blueprint.typography.bodyFont}.`
    : "";

  const selectionContext = context.selectedElement
    ? `\nUser has selected: <${context.selectedElement.tagName}> element${context.selectedElement.textContent ? ` containing "${context.selectedElement.textContent.slice(0, 100)}"` : ""}${context.selectedElement.sectionId ? ` in section "${context.selectedElement.sectionId}"` : ""}.`
    : context.selectedSectionId
    ? `\nUser has selected section: "${context.selectedSectionId}".`
    : "";

  const scopeHint = context.scope
    ? `\nEdit scope: ${context.scope}. ${
        context.scope === "element"
          ? "Focus changes on the selected element only."
          : context.scope === "section"
          ? "Focus changes on the selected section."
          : context.scope === "site"
          ? "Apply changes across all sections consistently."
          : "Apply changes to the current page."
      }`
    : "";

  const system = `You are Sitezy's in-editor AI assistant. You help the user modify their website with friendly, concise natural-language replies AND, when they ask for a change, perform a precise edit on a single section.

Project: ${context.projectName}
${context.pageName ? `Current page: ${context.pageName}` : ""}${designContext}${selectionContext}${scopeHint}

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
- When the user has a section or element selected, prefer editing that section unless they explicitly reference a different one.

${imageGuide}`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (context.history && context.history.length > 0) {
    const recent = context.history.slice(-10);
    for (const msg of recent) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  const userMsg = pageContext
    ? `Current page HTML:\n${pageContext}\n\nUser request: ${instruction}`
    : instruction;
  messages.push({ role: "user", content: userMsg });

  return streamCompletionMultiTurn(system, messages, onChunk);
}

/** Extract a single section's HTML from a full page by section ID */
function extractSectionHtmlById(
  pageHtml: string,
  sectionId: string
): string | null {
  const marker = `data-sz-section-id="${sectionId}"`;
  const markerIdx = pageHtml.indexOf(marker);
  if (markerIdx === -1) return null;
  const start = pageHtml.lastIndexOf("<", markerIdx);
  if (start === -1) return null;
  const tagMatch = pageHtml.slice(start + 1).match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  if (!tagMatch) return null;
  const tag = tagMatch[1];
  const openEnd = pageHtml.indexOf(">", markerIdx);
  if (openEnd === -1) return null;
  const openRe = new RegExp(`<${tag}\\b`, "gi");
  const closeRe = new RegExp(`</${tag}\\s*>`, "gi");
  let depth = 1;
  let pos = openEnd + 1;
  while (depth > 0) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const o = openRe.exec(pageHtml);
    const c = closeRe.exec(pageHtml);
    if (!c) return null;
    if (o && o.index < c.index) {
      depth++;
      pos = o.index + o[0].length;
    } else {
      depth--;
      pos = c.index + c[0].length;
    }
  }
  return pageHtml.slice(start, pos);
}

// ─── Add new page ─────────────────────────────────────────────────────────────
export async function generateNewPage(
  blueprint: SiteBlueprint,
  pageName: string,
  pageDescription: string,
  brief: SiteBrief,
  options?: {
    pageId?: string;
    pageSlug?: string;
    navbarHtml?: string | null;
    footerHtml?: string | null;
  }
): Promise<{ page: BlueprintPage; html: string; sections: PageSection[] }> {
  const reuseNavbar = !!options?.navbarHtml;
  const reuseFooter = !!options?.footerHtml;
  const reuseChrome = reuseNavbar || reuseFooter;

  const generated = await generateAdditionalPageForBlueprint(
    blueprint,
    pageName,
    {
      ...brief,
      pages: brief.pages.includes(pageName) ? brief.pages : [...brief.pages, pageName],
      businessBrief: brief.businessBrief
        ? {
            ...brief.businessBrief,
            pages: brief.businessBrief.pages.includes(pageName)
              ? brief.businessBrief.pages
              : [...brief.businessBrief.pages, pageName],
          }
        : brief.businessBrief,
    },
    {
      chrome: reuseChrome
        ? {
            reuseNavbar,
            reuseFooter,
            reference: buildChromeReference(options?.navbarHtml, options?.footerHtml),
          }
        : null,
    }
  );

  const page: BlueprintPage = {
    ...generated.page,
    id: options?.pageId?.trim() || generated.page.id,
    slug: options?.pageSlug?.trim() || generated.page.slug,
    purpose: pageDescription.trim() || generated.page.purpose,
  };

  const html = assemblePageWithChrome(
    sanitizeGeneratedHtml(generated.html),
    reuseNavbar ? options?.navbarHtml : null,
    reuseFooter ? options?.footerHtml : null
  );
  const sections = extractSections(html);
  return { page, html, sections };
}

// ─── Engine availability ──────────────────────────────────────────────────────
export function hasApiKey(): boolean {
  return !!(process.env.SITEZY_SPARK_KEY || process.env.ANTHROPIC_API_KEY);
}

/** @deprecated Use hasApiKey() instead */
export function getEngineAvailability() {
  return { spark: hasApiKey() };
}
