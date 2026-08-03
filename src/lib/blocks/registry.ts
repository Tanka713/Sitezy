import type { CanvasNodeInfo, Project, ProjectPage } from "@/types";
import { buildBlockHtml, buildIconHtml, buildInlineHtml } from "@/lib/blocks/factory";
import { type IconDef, ICONS } from "@/lib/utils/iconLibrary";
import {
  BLOCK_LIBRARY,
  type Block,
  type BlockPlacement,
} from "./library";
import { getAliasesForCanonicalBlock, resolveBlockAlias } from "./aliases";

export type SourceBlockCategory = Block["cat"];
export type BlockCategory =
  | "sections"
  | "navigation"
  | "layout"
  | "basic"
  | "typography"
  | "media"
  | "interactive"
  | "forms"
  | "advanced";
export type ElementCategoryKey = BlockCategory | "icons";
export type ElementKind = "block" | "icon";
export type ElementRenderer = "block" | "inline" | "icon";
export type ElementFamily =
  | "navigation"
  | "section"
  | "layout"
  | "container"
  | "text"
  | "button"
  | "media"
  | "form"
  | "interactive"
  | "decorative"
  | "icon";

export type ElementChildrenPolicy =
  | "none"
  | "inline-flow"
  | "layout-slots"
  | "section-content"
  | "form-fields"
  | "list-items"
  | "media-items";

export type InspectorGroupKey =
  | "content"
  | "typography"
  | "image"
  | "icon"
  | "video"
  | "embed"
  | "input"
  | "link"
  | "layout"
  | "spacing"
  | "background"
  | "border"
  | "effects"
  | "animation"
  | "section"
  | "responsive";

export interface ElementDefaultProps {
  text?: string;
  label?: string;
  placeholder?: string;
  src?: string;
  alt?: string;
  href?: string;
  target?: string;
  width?: string;
  height?: string;
  display?: string;
  gap?: string;
  items?: string[];
  options?: string[];
}

export interface ElementValidationResult {
  valid: boolean;
  canonicalId: string;
  aliases: string[];
}

export interface RenderElementOptions {
  placementHint?: BlockPlacement;
  props?: Partial<ElementDefaultProps> | null;
}

export interface ElementCapabilities {
  supportsContent: boolean;
  supportsTypography: boolean;
  supportsLayout: boolean;
  supportsSpacing: boolean;
  supportsBackground: boolean;
  supportsBorder: boolean;
  supportsEffects: boolean;
  supportsAnimation: boolean;
  supportsResponsive: boolean;
  supportsLink: boolean;
  supportsChildren: boolean;
}

interface ElementDefinitionBase {
  id: string;
  canonicalId: string;
  kind: ElementKind;
  label: string;
  icon: string;
  family: ElementFamily;
  keywords: string[];
  aliases: string[];
  renderer: ElementRenderer;
  children: ElementChildrenPolicy;
  inspector: InspectorGroupKey[];
  capabilities: ElementCapabilities;
  defaultProps: ElementDefaultProps;
  validate: (value?: Partial<ElementDefaultProps> | null) => ElementDefaultProps;
}

export interface BlockElementDefinition extends ElementDefinitionBase {
  kind: "block";
  category: BlockCategory;
  sourceCategory: SourceBlockCategory;
  preview: string;
  placement: BlockPlacement;
}

export interface IconElementDefinition extends ElementDefinitionBase {
  kind: "icon";
  category: "icons";
  preview: string;
  placement: "inline";
  name: string;
  paths: string;
}

export type EditorElementDefinition = BlockElementDefinition | IconElementDefinition;

export interface InsertionCategory {
  key: "all" | ElementCategoryKey;
  label: string;
  icon?: string;
  description?: string;
}

export interface ElementCategoryDefinition {
  key: ElementCategoryKey;
  label: string;
  icon: string;
  description: string;
  order: number;
  keywords: string[];
}

export interface InspectorProfile {
  family: ElementFamily;
  groups: InspectorGroupKey[];
  showLogoPanel: boolean;
  showWidgetPanel: boolean;
  showCollectionPanel: boolean;
  showContentPanel: boolean;
  showLinkPanel: boolean;
  showLayoutPanel: boolean;
  showBackgroundPanel: boolean;
  showBorderPanel: boolean;
}

const ALL_INSPECTOR_GROUPS: InspectorGroupKey[] = [
  "content",
  "typography",
  "image",
  "icon",
  "video",
  "embed",
  "input",
  "link",
  "layout",
  "spacing",
  "background",
  "border",
  "effects",
  "animation",
  "section",
  "responsive",
];

const BUTTON_IDS = new Set(["button", "button-outline", "icon-button", "floating-button"]);
const CONTAINER_IDS = new Set([
  "section",
  "container",
  "flex-container",
  "grid-container",
  "two-columns",
  "three-columns",
  "sidebar-panel",
  "columns",
  "grid",
]);
const TEXT_IDS = new Set([
  "heading",
  "paragraph",
  "badge",
  "blockquote",
  "divider",
  "list",
  "icon-list",
  "pill-list",
  "highlight-text",
  "table",
  "code-block",
  "alert",
  "text-link",
]);
const MEDIA_IDS = new Set([
  "image",
  "video",
  "youtube",
  "embed",
  "map-embed",
  "gallery",
  "gallery-masonry",
  "video-section",
  "before-after",
  "logo-wall",
  "logo-scroller",
  "icon-block",
  "icon-circle",
  "avatar",
  "avatar-group",
  "rating",
  "social-links",
  "carousel",
]);
const FORM_FIELD_IDS = new Set([
  "text-input",
  "textarea-field",
  "select-field",
  "checkbox-field",
  "radio-group",
  "toggle-switch",
]);
const FORM_IDS = new Set(["contact-form", ...FORM_FIELD_IDS]);
const NAV_IDS = new Set([
  "navbar",
  "navbar-center",
  "navbar-minimal",
  "footer",
  "footer-columns",
  "breadcrumb",
  "pagination",
  "banner",
]);
const INTERACTIVE_IDS = new Set([
  "accordion",
  "tabs",
  "faq",
  "pricing-toggle",
  "carousel",
  "testimonial-slider",
  "modal-popup",
]);

const ADVANCED_IDS = new Set([
  "progress-bar",
  "counter-stat",
  "notification",
  "countdown",
  "tag-cloud",
  "step-list",
  "timeline",
  "comparison",
  "wave-divider",
  "shape-row",
  "shape-circle",
  "shape-ring",
  "shape-square",
  "shape-diamond",
  "shape-triangle",
  "shape-pill",
  "shape-line",
  "shape-blob",
  "shape-cross",
  "shape-dots",
]);

const BASIC_IDS = new Set([
  "button",
  "button-outline",
  "icon-button",
  "badge",
  "divider",
  "card",
  "alert",
  "icon-block",
  "icon-circle",
  "rating",
  "floating-button",
  "menu-item",
  "notification",
]);

const SECTION_PLACEMENT_EXCLUSIONS = new Set([
  "navbar",
  "navbar-center",
  "navbar-minimal",
  "footer",
  "footer-columns",
  "banner",
  "wave-divider",
  "shape-row",
]);

const BLOCK_LABEL_OVERRIDES: Partial<Record<Block["id"], string>> = {
  "navbar-center": "Centered Navbar",
  "navbar-minimal": "Minimal Navbar",
  "footer-columns": "Multi-column Footer",
  "hero-split": "Split Hero",
  "split-image": "Image Split",
  grid: "Grid Section",
  features: "Feature Cards",
  testimonial: "Testimonial Quote",
  "pricing-toggle": "Pricing Switcher",
  "logo-wall": "Logo Grid",
  "logo-scroller": "Logo Marquee",
  cta: "Call to Action",
  "cta-strip": "CTA Bar",
  "button-outline": "Outline Button",
  "grid-container": "Grid Layout",
  "icon-list": "Checklist",
  "text-link": "Text Link",
  "icon-circle": "Icon Badge",
  "counter-stat": "Stat Counter",
  "gallery-masonry": "Masonry Gallery",
  "testimonial-slider": "Testimonial Carousel",
  "wave-divider": "Wave Section Divider",
};

const BLOCK_PREVIEW_OVERRIDES: Partial<Record<Block["id"], string>> = {
  "grid-container": "Raw editable grid container for custom layouts",
  grid: "Full-width grid section with structured content cards",
  "pricing-toggle": "Pricing section with monthly and yearly plans",
  "logo-scroller": "Animated marquee for brand logos or company names",
  "testimonial-slider": "Sliding testimonials with built-in carousel behavior",
  "wave-divider": "Decorative wave divider between sections",
};

export const ELEMENT_CATEGORY_DEFINITIONS: ElementCategoryDefinition[] = [
  {
    key: "sections",
    label: "Sections",
    icon: "▭",
    description: "Full-width storytelling blocks and page sections.",
    order: 0,
    keywords: ["section", "hero", "page", "story", "layout", "block"],
  },
  {
    key: "navigation",
    label: "Navigation",
    icon: "≡",
    description: "Headers, footers, breadcrumbs, and site navigation.",
    order: 1,
    keywords: ["nav", "menu", "header", "footer", "breadcrumb", "pagination"],
  },
  {
    key: "layout",
    label: "Layout",
    icon: "⊞",
    description: "Containers, columns, and structural building blocks.",
    order: 2,
    keywords: ["container", "columns", "grid", "flex", "layout", "structure"],
  },
  {
    key: "basic",
    label: "Basic",
    icon: "◈",
    description: "Common UI atoms like buttons, cards, badges, and simple blocks.",
    order: 3,
    keywords: ["button", "card", "badge", "alert", "starter", "ui"],
  },
  {
    key: "typography",
    label: "Typography",
    icon: "T",
    description: "Headings, paragraphs, lists, quotes, and text content.",
    order: 4,
    keywords: ["text", "heading", "paragraph", "copy", "list", "link"],
  },
  {
    key: "media",
    label: "Media",
    icon: "🖼",
    description: "Images, video, embeds, maps, and visual assets.",
    order: 5,
    keywords: ["image", "video", "embed", "map", "gallery", "media"],
  },
  {
    key: "interactive",
    label: "Interactive",
    icon: "✦",
    description: "Dynamic UI patterns like accordions, tabs, modals, and carousels.",
    order: 6,
    keywords: ["interactive", "accordion", "tabs", "carousel", "modal", "dynamic"],
  },
  {
    key: "forms",
    label: "Forms",
    icon: "✎",
    description: "Inputs, selects, toggles, and contact form building blocks.",
    order: 7,
    keywords: ["form", "input", "checkbox", "radio", "toggle", "select"],
  },
  {
    key: "advanced",
    label: "Advanced",
    icon: "◐",
    description: "Special-purpose, data, and decorative elements.",
    order: 8,
    keywords: ["advanced", "decorative", "shape", "countdown", "comparison", "progress"],
  },
  {
    key: "icons",
    label: "Icons",
    icon: "◈",
    description: "Scalable SVG icons for inline use.",
    order: 9,
    keywords: ["icon", "svg", "symbol"],
  },
];

const CATEGORY_DEFINITION_MAP = new Map(
  ELEMENT_CATEGORY_DEFINITIONS.map((definition) => [definition.key, definition])
);
const GENERIC_BLOCK_FALLBACKS: Record<BlockPlacement, string> = {
  top: "banner",
  section: "section",
  inline: "paragraph",
  bottom: "footer",
};
const GENERIC_ICON_FALLBACK_ID = "icon-star";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeTextValue(value: unknown, fallback = "", maxLength = 4000): string {
  if (!isNonEmptyString(value)) return fallback;
  return String(value).trim().slice(0, maxLength);
}

function sanitizeUrlValue(value: unknown, fallback = ""): string {
  if (!isNonEmptyString(value)) return fallback;
  return String(value).trim();
}

function sanitizeArrayValue(value: unknown, fallback: string[] = [], maxItems = 24): string[] {
  const source = Array.isArray(value) ? value : fallback;
  const next = source
    .map((entry) => sanitizeTextValue(entry, "", 256))
    .filter(Boolean)
    .slice(0, maxItems);

  return next.length > 0 ? next : [...fallback];
}

function sanitizeDimensionValue(value: unknown, fallback = "auto"): string {
  if (!isNonEmptyString(value)) return fallback;
  const normalized = String(value).trim();
  if (
    normalized === "auto" ||
    normalized === "fit-content" ||
    normalized === "max-content" ||
    normalized === "min-content" ||
    /^-?\d+(\.\d+)?(px|%|rem|em|vw|vh|fr)?$/i.test(normalized) ||
    /^calc\(.+\)$/i.test(normalized) ||
    /^minmax\(.+\)$/i.test(normalized)
  ) {
    return normalized;
  }
  return fallback;
}

function sanitizeDisplayValue(value: unknown, fallback = "block"): string {
  if (!isNonEmptyString(value)) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return new Set([
    "block",
    "inline",
    "inline-block",
    "flex",
    "inline-flex",
    "grid",
    "inline-grid",
    "section",
    "none",
  ]).has(normalized)
    ? normalized
    : fallback;
}

function sanitizeTargetValue(value: unknown, fallback = "_self"): string {
  if (!isNonEmptyString(value)) return fallback;
  const normalized = String(value).trim();
  return normalized === "_blank" || normalized === "_self" ? normalized : fallback;
}

function isRenderableHtml(html: string): boolean {
  return /<([a-z][^/\s>]*)\b[^>]*>/i.test((html ?? "").trim());
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .flatMap((value) => String(value ?? "").split(/[,\s/]+/))
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function labelForBlock(block: Block): string {
  return BLOCK_LABEL_OVERRIDES[block.id] ?? block.label;
}

function previewForBlock(block: Block): string {
  return BLOCK_PREVIEW_OVERRIDES[block.id] ?? block.preview;
}

function familyForBlock(block: Block): ElementFamily {
  if (NAV_IDS.has(block.id)) return "navigation";
  if (FORM_FIELD_IDS.has(block.id)) return "form";
  if (FORM_IDS.has(block.id)) return "form";
  if (BUTTON_IDS.has(block.id)) return "button";
  if (CONTAINER_IDS.has(block.id)) return block.id === "container" ? "container" : "layout";
  if (TEXT_IDS.has(block.id) || block.cat === "text") return "text";
  if (MEDIA_IDS.has(block.id)) return "media";
  if (INTERACTIVE_IDS.has(block.id)) return "interactive";
  if (block.cat === "layout") return block.placement === "section" ? "section" : "layout";
  if (block.cat === "decorative") return "decorative";
  return block.placement === "section" ? "section" : "layout";
}

function categoryForBlock(block: Block, family: ElementFamily): BlockCategory {
  if (family === "navigation") return "navigation";
  if (FORM_IDS.has(block.id)) return "forms";

  if (block.placement === "section" || block.placement === "top" || block.placement === "bottom") {
    if (!SECTION_PLACEMENT_EXCLUSIONS.has(block.id)) return "sections";
  }

  if (INTERACTIVE_IDS.has(block.id) || block.id === "floating-button") return "interactive";
  if (ADVANCED_IDS.has(block.id) || block.cat === "decorative") return "advanced";
  if (CONTAINER_IDS.has(block.id) || block.id === "spacer") return "layout";
  if (TEXT_IDS.has(block.id) && !BUTTON_IDS.has(block.id)) return "typography";
  if (MEDIA_IDS.has(block.id)) return "media";
  if (BUTTON_IDS.has(block.id) || BASIC_IDS.has(block.id)) return "basic";

  if (family === "text") return "typography";
  if (family === "media") return "media";
  if (family === "interactive") return "interactive";
  if (family === "section") return "sections";
  return "basic";
}

function childrenPolicyForBlock(block: Block, family: ElementFamily): ElementChildrenPolicy {
  if (block.placement === "inline") {
    if (FORM_IDS.has(block.id)) return block.id === "contact-form" ? "form-fields" : "none";
    if (["list", "icon-list", "pill-list", "logo-wall", "logo-scroller", "gallery", "gallery-masonry", "carousel"].includes(block.id)) {
      return "list-items";
    }
    if (["container", "flex-container", "grid-container", "two-columns", "three-columns", "accordion", "tabs", "sidebar-panel", "card"].includes(block.id)) {
      return "layout-slots";
    }
    if (family === "navigation") return "inline-flow";
    return "none";
  }

  if (family === "navigation") return "inline-flow";
  if (family === "section" || family === "layout" || family === "interactive") return "section-content";
  return "none";
}

function defaultsForBlock(block: Block, family: ElementFamily, label: string): ElementDefaultProps {
  const base: ElementDefaultProps = {
    label,
    width: "auto",
    height: "auto",
    gap: "0",
  };

  if (TEXT_IDS.has(block.id)) {
    return {
      ...base,
      text:
        block.id === "heading"
          ? "Section heading"
          : block.id === "paragraph"
          ? "Use this space for a concise message."
          : block.id === "text-link"
          ? "Read more"
          : label,
      display: block.id === "divider" ? "block" : "inline-block",
    };
  }

  if (BUTTON_IDS.has(block.id)) {
    return {
      ...base,
      label: block.id === "floating-button" ? "Chat with us" : "Primary action",
      href: "#",
      target: "_self",
      display: "inline-flex",
    };
  }

  if (family === "media") {
    return {
      ...base,
      src:
        block.id === "video"
          ? "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
          : block.id === "youtube"
          ? "https://www.youtube.com/embed/dQw4w9WgXcQ"
          : block.id === "embed"
          ? "https://example.com"
          : block.id === "map-embed"
          ? "https://www.google.com/maps"
          : "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
      alt: label,
      display: "block",
    };
  }

  if (FORM_FIELD_IDS.has(block.id)) {
    return {
      ...base,
      label,
      placeholder: block.id === "select-field" ? undefined : "Your answer",
      options: block.id === "select-field" || block.id === "radio-group" ? ["Option 1", "Option 2", "Option 3"] : undefined,
      display: "block",
    };
  }

  if (block.id === "contact-form") {
    return {
      ...base,
      label: "Contact form",
      display: "block",
    };
  }

  if (block.id === "logo-wall" || block.id === "logo-scroller") {
    return {
      ...base,
      items: ["Vercel", "Linear", "Framer", "Stripe"],
      display: "block",
    };
  }

  if (block.id === "faq") {
    return {
      ...base,
      items: ["What is included?", "How long does setup take?", "Can I customize everything?"],
      display: "block",
    };
  }

  if (["pricing", "pricing-toggle", "comparison", "testimonial-slider", "testimonials", "team", "gallery", "gallery-masonry", "carousel"].includes(block.id)) {
    return {
      ...base,
      items: ["Item 1", "Item 2", "Item 3"],
      display: "block",
    };
  }

  return {
    ...base,
    display: block.placement === "inline" ? "block" : "section",
  };
}

function capabilitiesForBlock(block: Block, family: ElementFamily): ElementCapabilities {
  const typography = family === "text" || family === "button" || family === "navigation";
  const background = block.placement !== "top" || family !== "navigation";
  const link =
    family === "text" ||
    family === "button" ||
    family === "media" ||
    family === "icon" ||
    family === "navigation" ||
    family === "container" ||
    family === "layout";

  return {
    supportsContent:
      typography ||
      family === "form" ||
      family === "media" ||
      family === "interactive" ||
      block.id === "logo-wall" ||
      block.id === "logo-scroller",
    supportsTypography: typography,
    supportsLayout: family !== "decorative" || block.placement !== "section",
    supportsSpacing: true,
    supportsBackground: background,
    supportsBorder: family !== "navigation" || block.placement !== "top",
    supportsEffects: true,
    supportsAnimation: true,
    supportsResponsive: true,
    supportsLink: link,
    supportsChildren: childrenPolicyForBlock(block, family) !== "none",
  };
}

function inspectorGroupsForBlock(block: Block, family: ElementFamily): InspectorGroupKey[] {
  const groups = new Set<InspectorGroupKey>(["layout", "spacing", "animation", "effects", "responsive"]);

  if (capabilitiesForBlock(block, family).supportsContent) groups.add("content");
  if (capabilitiesForBlock(block, family).supportsTypography) groups.add("typography");
  if (capabilitiesForBlock(block, family).supportsBackground && block.id !== "section") groups.add("background");
  if (capabilitiesForBlock(block, family).supportsBorder) groups.add("border");
  if (capabilitiesForBlock(block, family).supportsLink) groups.add("link");
  if (block.id === "section" || block.placement === "section") groups.add("section");
  if (family === "media") {
    if (block.id === "video" || block.id === "video-section") groups.add("video");
    else if (block.id === "youtube" || block.id === "embed" || block.id === "map-embed") groups.add("embed");
    else groups.add("image");
  }
  if (family === "form") groups.add("input");

  return ALL_INSPECTOR_GROUPS.filter((group) => groups.has(group));
}

function validateDefaults(defaults: ElementDefaultProps) {
  return (value?: Partial<ElementDefaultProps> | null): ElementDefaultProps => {
    const next = { ...defaults, ...(value ?? {}) };

    next.text = sanitizeTextValue(next.text, defaults.text ?? "");
    next.label = sanitizeTextValue(next.label, defaults.label ?? "Untitled");
    next.placeholder = sanitizeTextValue(next.placeholder, defaults.placeholder ?? "");
    next.src = sanitizeUrlValue(next.src, defaults.src ?? "");
    next.alt = sanitizeTextValue(next.alt, defaults.alt ?? defaults.label ?? "Media");
    next.href = sanitizeUrlValue(next.href, defaults.href ?? "");
    next.target = sanitizeTargetValue(next.target, defaults.target ?? "_self");
    next.width = sanitizeDimensionValue(next.width, defaults.width ?? "auto");
    next.height = sanitizeDimensionValue(next.height, defaults.height ?? "auto");
    next.display = sanitizeDisplayValue(next.display, defaults.display ?? "block");
    next.gap = sanitizeDimensionValue(next.gap, defaults.gap ?? "0");
    next.items = sanitizeArrayValue(next.items, defaults.items ?? []);
    next.options = sanitizeArrayValue(next.options, defaults.options ?? []);

    return next;
  };
}

function buildBlockDefinition(block: Block): BlockElementDefinition {
  const canonicalId = resolveBlockAlias(block.id);
  const family = familyForBlock(block);
  const label = labelForBlock(block);
  const preview = previewForBlock(block);
  const category = categoryForBlock(block, family);
  const categoryMeta = CATEGORY_DEFINITION_MAP.get(category);
  const defaultProps = defaultsForBlock(block, family, label);

  return {
    id: canonicalId,
    canonicalId,
    kind: "block",
    label,
    icon: block.icon,
    category,
    sourceCategory: block.cat,
    preview,
    placement: block.placement,
    family,
    keywords: uniqueStrings([
      block.id,
      block.label,
      label,
      block.preview,
      preview,
      block.cat,
      category,
      categoryMeta?.label,
      ...(categoryMeta?.keywords ?? []),
      family,
      ...getAliasesForCanonicalBlock(canonicalId),
    ]),
    aliases: getAliasesForCanonicalBlock(canonicalId),
    renderer: block.placement === "inline" ? "inline" : "block",
    children: childrenPolicyForBlock(block, family),
    inspector: inspectorGroupsForBlock(block, family),
    capabilities: capabilitiesForBlock(block, family),
    defaultProps,
    validate: validateDefaults(defaultProps),
  };
}

function buildIconDefinition(icon: IconDef): IconElementDefinition {
  const defaultProps: ElementDefaultProps = {
    label: icon.name,
    display: "inline-block",
  };

  return {
    id: `icon-${icon.id}`,
    canonicalId: `icon-${icon.id}`,
    kind: "icon",
    label: icon.name,
    name: icon.name,
    icon: "◈",
    category: "icons",
    preview: `${icon.name} icon`,
    placement: "inline",
    family: "icon",
    keywords: uniqueStrings([icon.id, icon.name, "icon", "svg"]),
    aliases: [],
    renderer: "icon",
    children: "none",
    inspector: ["content", "icon", "layout", "spacing", "border", "effects", "animation", "responsive", "link"],
    capabilities: {
      supportsContent: true,
      supportsTypography: false,
      supportsLayout: true,
      supportsSpacing: true,
      supportsBackground: false,
      supportsBorder: true,
      supportsEffects: true,
      supportsAnimation: true,
      supportsResponsive: true,
      supportsLink: true,
      supportsChildren: false,
    },
    defaultProps,
    validate: validateDefaults(defaultProps),
    paths: icon.paths,
  };
}

const canonicalBlocks = BLOCK_LIBRARY.filter((block) => block.id === resolveBlockAlias(block.id));

export const BLOCK_DEFINITIONS: BlockElementDefinition[] = canonicalBlocks.map(buildBlockDefinition);
export const BLOCK_DEFINITION_MAP = new Map(BLOCK_DEFINITIONS.map((definition) => [definition.id, definition]));
const EDITOR_BLOCK_PICKER_HIDDEN_IDS = new Set([
  "pricing-toggle",
  "carousel",
  "testimonial-slider",
  "modal-popup",
  "notification",
  "countdown",
  "tag-cloud",
  "breadcrumb",
  "pagination",
  "menu-item",
  "shape-circle",
  "shape-ring",
  "shape-square",
  "shape-diamond",
  "shape-triangle",
  "shape-pill",
  "shape-line",
  "shape-blob",
  "shape-cross",
  "shape-dots",
  "shape-row",
  "wave-divider",
  "alert-bar",
]);
export const BLOCK_PICKER_DEFINITIONS: BlockElementDefinition[] = BLOCK_DEFINITIONS.filter(
  (definition) => !EDITOR_BLOCK_PICKER_HIDDEN_IDS.has(definition.id)
);
export const ICON_DEFINITIONS: IconElementDefinition[] = ICONS.map(buildIconDefinition);
export const ICON_DEFINITION_MAP = new Map(ICON_DEFINITIONS.map((definition) => [definition.id, definition]));
export const EDITOR_ELEMENT_DEFINITIONS: EditorElementDefinition[] = [
  ...BLOCK_DEFINITIONS,
  ...ICON_DEFINITIONS,
];

export const EDITOR_INSERTION_CATEGORIES: InsertionCategory[] = [
  {
    key: "all",
    label: "All",
    icon: "◫",
    description: "Browse the full element library.",
  },
  ...ELEMENT_CATEGORY_DEFINITIONS.map((entry) => ({
    key: entry.key,
    label: entry.label,
    icon: entry.icon,
    description: entry.description,
  })),
];

export function getElementCategoryDefinition(key: ElementCategoryKey): ElementCategoryDefinition | null {
  return CATEGORY_DEFINITION_MAP.get(key) ?? null;
}

export function compareElementCategories(a: ElementCategoryKey, b: ElementCategoryKey): number {
  return (CATEGORY_DEFINITION_MAP.get(a)?.order ?? 999) - (CATEGORY_DEFINITION_MAP.get(b)?.order ?? 999);
}

export function getBlockDefinition(blockId: string): BlockElementDefinition | null {
  return BLOCK_DEFINITION_MAP.get(resolveBlockAlias(blockId)) ?? null;
}

export function getFallbackBlockDefinition(placement: BlockPlacement = "inline"): BlockElementDefinition {
  return BLOCK_DEFINITION_MAP.get(GENERIC_BLOCK_FALLBACKS[placement]) ?? BLOCK_DEFINITIONS[0];
}

export function getIconDefinition(iconId: string): IconElementDefinition | null {
  if (ICON_DEFINITION_MAP.has(iconId)) return ICON_DEFINITION_MAP.get(iconId) ?? null;
  const prefixed = iconId.startsWith("icon-") ? iconId : `icon-${iconId}`;
  return ICON_DEFINITION_MAP.get(prefixed) ?? null;
}

export function getFallbackIconDefinition(): IconElementDefinition {
  return ICON_DEFINITION_MAP.get(GENERIC_ICON_FALLBACK_ID) ?? ICON_DEFINITIONS[0];
}

export function getEditorElementDefinition(elementId: string): EditorElementDefinition | null {
  return getBlockDefinition(elementId) ?? getIconDefinition(elementId);
}

export function normalizeStoredElementId(elementId: string | null | undefined): string | null {
  if (!isNonEmptyString(elementId)) return null;
  const normalized = resolveBlockAlias(elementId.trim());
  return getEditorElementDefinition(normalized)?.canonicalId ?? normalized;
}

export function getSafeEditorElementDefinition(
  elementId: string,
  placementHint: BlockPlacement = "inline"
): EditorElementDefinition {
  return getEditorElementDefinition(elementId)
    ?? (elementId.startsWith("icon-") ? getFallbackIconDefinition() : getFallbackBlockDefinition(placementHint));
}

export function validateElementId(elementId: string): ElementValidationResult {
  const resolved = getEditorElementDefinition(elementId);
  const canonicalId = resolved?.canonicalId ?? resolveBlockAlias(elementId);
  return {
    valid: !!resolved,
    canonicalId,
    aliases: resolved?.aliases ?? getAliasesForCanonicalBlock(canonicalId),
  };
}

export function sanitizeElementDefaults(
  elementId: string,
  value?: Partial<ElementDefaultProps> | null,
  placementHint: BlockPlacement = "inline"
): ElementDefaultProps {
  const definition = getSafeEditorElementDefinition(elementId, placementHint);
  return definition.validate(value);
}

function renderFallbackHtml(
  definition: EditorElementDefinition,
  project: Project,
  page?: ProjectPage | null
): string {
  if (definition.kind === "icon") {
    return buildIconHtml(definition.name, definition.paths, project);
  }

  const safeDefinition = definition.kind === "block" ? definition : getFallbackBlockDefinition("inline");
  const raw = safeDefinition.renderer === "inline"
    ? buildInlineHtml(safeDefinition.canonicalId, project, page)
    : buildBlockHtml(safeDefinition.canonicalId, project);

  if (isRenderableHtml(raw)) return raw;

  const defaults = safeDefinition.validate();
  if (safeDefinition.placement === "inline") {
    return `<div style="margin:0 0 20px;padding:16px;border-radius:14px;border:1px dashed rgba(148,163,184,0.28);background:rgba(255,255,255,0.04);font-size:14px;color:#cbd5e1;">${defaults.text || defaults.label || safeDefinition.label}</div>`;
  }

  return `<section data-sz-section-id="sec-fallback" data-sz-section-type="${safeDefinition.canonicalId}" data-sz-section-name="${defaults.label || safeDefinition.label}" style="padding:72px 32px;"><div style="width:min(100%,1160px);margin:0 auto;"><div style="padding:28px;border-radius:18px;border:1px dashed rgba(148,163,184,0.28);background:rgba(255,255,255,0.04);font-size:16px;color:#cbd5e1;">${defaults.text || defaults.label || safeDefinition.label}</div></div></section>`;
}

export function renderEditorElementHtml(
  elementId: string,
  project: Project,
  page?: ProjectPage | null,
  options?: RenderElementOptions
): string {
  const definition = getSafeEditorElementDefinition(elementId, options?.placementHint ?? "inline");
  const definitionDefaults = definition.validate(options?.props);
  void definitionDefaults;

  let html = "";

  switch (definition.renderer) {
    case "inline":
      html = buildInlineHtml(definition.canonicalId, project, page);
      break;
    case "icon":
      html = definition.kind === "icon"
        ? buildIconHtml(definition.name, definition.paths, project)
        : "";
      break;
    case "block":
    default:
      html = buildBlockHtml(definition.canonicalId, project);
      break;
  }

  return isRenderableHtml(html) ? html : renderFallbackHtml(definition, project, page);
}

function groupsFromNode(node: CanvasNodeInfo): Set<InspectorGroupKey> {
  const groups = new Set<InspectorGroupKey>(["spacing", "animation", "effects", "responsive"]);
  const isMediaNode = node.isImg || node.isVideo || node.isIframe;
  const hasEditableText = node.hasEditableText || node.isText || node.isBtn || node.isInput;
  const showLinkPanel =
    !node.isInput &&
    (
      node.isText ||
      node.isBtn ||
      node.tag === "a" ||
      node.href !== null ||
      (!!node.textTargetNodeId && node.textTargetNodeId === node.nodeId) ||
      node.isImg ||
      node.isVideo ||
      node.isIframe ||
      node.isSvg ||
      node.isContainer
    );

  if (node.logoCollectionNodeId) groups.add("content");
  if (node.collectionNodeId) groups.add("content");
  // Containers (nav bars, wrappers, etc.) should NOT get a text editor — only their child elements should.
  // editableText on a container is scraped from the first text child's innerText, which concatenates all
  // descendant text and causes the "JFD JUKEBOX JUNCTION HOME RESERVE NOW" merge bug when applied.
  if ((node.editableText || hasEditableText || node.isBtn || node.tag === "a") && !node.isInput && !node.isContainer) groups.add("content");
  if (hasEditableText && !node.logoCollectionNodeId) groups.add("typography");
  if (node.isImg) groups.add("image");
  if (node.isSvg) groups.add("icon");
  if (node.isVideo) groups.add("video");
  if (node.isIframe) groups.add("embed");
  if (node.isInput) groups.add("input");
  if (showLinkPanel) groups.add("link");
  if (node.isSec || node.isContainer || isMediaNode || node.isBtn || node.isInput || node.isSvg) groups.add("layout");
  if (!node.isSec && (node.isContainer || isMediaNode || node.isBtn || node.isInput || node.isSvg || node.hasBgImage)) {
    groups.add("background");
  }
  if (node.isSec || node.isContainer || isMediaNode || node.isBtn || node.isInput || node.isSvg) groups.add("border");
  if (node.isSec || node.sectionId) groups.add("section");

  return groups;
}

export function resolveNodeElementFamily(node: CanvasNodeInfo): ElementFamily {
  if (node.isSvg) return "icon";
  if (node.isInput) return "form";
  if (node.isImg || node.isVideo || node.isIframe) return "media";
  if (node.isBtn || node.tag === "a") return "button";
  if (node.isSec) {
    const sectionDefinition = node.sectionType ? getBlockDefinition(node.sectionType) : null;
    if (sectionDefinition) return sectionDefinition.family;
    return "section";
  }
  if (node.isContainer) return "container";
  if (node.hasEditableText || node.isText) return "text";
  return "layout";
}

export function resolveInspectorProfile(node: CanvasNodeInfo | null): InspectorProfile | null {
  if (!node) return null;

  const groups = groupsFromNode(node);
  return {
    family: resolveNodeElementFamily(node),
    groups: ALL_INSPECTOR_GROUPS.filter((group) => groups.has(group)),
    showLogoPanel: !!node.logoCollectionNodeId,
    showWidgetPanel: !!node.widgetNodeId && (node.widgetFields?.length ?? 0) > 0,
    showCollectionPanel: !!node.collectionNodeId && (node.collectionFields?.length ?? 0) > 0,
    showContentPanel: groups.has("content"),
    showLinkPanel: groups.has("link"),
    showLayoutPanel: groups.has("layout"),
    showBackgroundPanel: groups.has("background"),
    showBorderPanel: groups.has("border"),
  };
}
