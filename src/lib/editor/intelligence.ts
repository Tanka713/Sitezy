import type { CanvasNodeInfo, DevicePreview, Project } from "@/types";

export interface LiveIntelligenceSuggestion {
  id: string;
  label: string;
  prompt: string;
  icon?: string; // emoji shorthand for rendering
}

function parsePx(value: string | null | undefined): number {
  const match = (value ?? "").match(/-?[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function hexToRgb(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const normalized = hex.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(
  foreground: string | null | undefined,
  background: string | null | undefined
): number | null {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return null;
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function sectionIs(type: string | null | undefined, ...keywords: string[]): boolean {
  const t = (type ?? "").toLowerCase();
  return keywords.some((k) => t.includes(k));
}

/** Returns true for element types that are worth showing the Live card for */
export function isSignificantNode(node: CanvasNodeInfo): boolean {
  if (node.isSec) return true;
  if (node.isBtn) return true;
  if (node.isImg) return true;
  if (node.isSvg) return true;
  if (node.isText && ["h1", "h2", "h3", "h4"].includes(node.tag)) return true;
  return false;
}

export function getLiveIntelligenceSuggestions(
  node: CanvasNodeInfo,
  project: Project,
  devicePreview: DevicePreview
): LiveIntelligenceSuggestion[] {
  const suggestions: LiveIntelligenceSuggestion[] = [];
  const sectionName = node.sectionName ? `"${node.sectionName}"` : "this section";
  const sectionType = node.sectionType || node.role || "";

  // ── Section-level ──────────────────────────────────────────────────────────
  if (node.isSec) {
    const isHero        = sectionIs(sectionType, "hero", "banner", "splash", "above");
    const isCta         = sectionIs(sectionType, "cta", "call-to-action", "convert", "action");
    const isFeatures    = sectionIs(sectionType, "feature", "benefit", "service", "highlight", "how");
    const isTestimonial = sectionIs(sectionType, "testimonial", "review", "quote", "social", "proof");
    const isNav         = sectionIs(sectionType, "nav", "navigation", "menu", "header");
    const isFooter      = sectionIs(sectionType, "footer");
    const isFaq         = sectionIs(sectionType, "faq", "accordion", "question");
    const isPricing     = sectionIs(sectionType, "pric", "plan", "tier");
    const isTeam        = sectionIs(sectionType, "team", "about", "people", "staff");
    const isGallery     = sectionIs(sectionType, "gallery", "portfolio", "work", "project");
    const isStats       = sectionIs(sectionType, "stat", "metric", "number", "counter");

    if (isHero) {
      suggestions.push({
        id: "hero-headline",
        label: "Sharpen the headline",
        icon: "✍️",
        prompt: `Rewrite the hero headline and subheadline in ${sectionName} to be sharper, more specific, and conversion-focused. Keep the existing layout and visual design unchanged.`,
      });
      suggestions.push({
        id: "hero-cta",
        label: "Strengthen the CTA",
        icon: "🎯",
        prompt: `Improve the hero CTA button copy and its surrounding micro-copy to drive more clicks. Make it more action-oriented and clear about the value.`,
      });
    } else if (isCta) {
      suggestions.push({
        id: "cta-copy",
        label: "Make CTA more persuasive",
        icon: "✍️",
        prompt: `Rewrite the ${sectionName} section to be more persuasive: clearer value proposition, stronger action verb, and a secondary trust signal below the button.`,
      });
      suggestions.push({
        id: "cta-trust",
        label: "Add a trust signal",
        icon: "🔒",
        prompt: `Add a subtle trust signal to the ${sectionName} CTA (e.g. "No credit card required", star ratings, or a short testimonial) without breaking the layout.`,
      });
    } else if (isFeatures) {
      suggestions.push({
        id: "features-copy",
        label: "Benefit-first feature copy",
        icon: "✍️",
        prompt: `Rewrite the feature cards in ${sectionName} to lead with user benefits rather than features. Keep the layout and icons.`,
      });
      suggestions.push({
        id: "features-layout",
        label: "Improve card styling",
        icon: "🎨",
        prompt: `Improve the visual style of the feature cards in ${sectionName}: spacing, borders, hover states, and icon presentation.`,
      });
    } else if (isTestimonial) {
      suggestions.push({
        id: "testimonial-layout",
        label: "Improve testimonial layout",
        icon: "💬",
        prompt: `Improve the ${sectionName} section: make quotes more scannable, add better attribution styling, and improve the overall credibility feel.`,
      });
    } else if (isNav) {
      suggestions.push({
        id: "nav-ux",
        label: "Simplify navigation",
        icon: "🗺️",
        prompt: `Simplify and improve the navigation: cleaner link labels, better visual hierarchy between primary and secondary actions, and a more prominent CTA button.`,
      });
    } else if (isFooter) {
      suggestions.push({
        id: "footer-layout",
        label: "Improve footer structure",
        icon: "🗂️",
        prompt: `Improve the footer's link organization, spacing, and visual hierarchy. Ensure the copyright and key links are clearly visible.`,
      });
    } else if (isFaq) {
      suggestions.push({
        id: "faq-copy",
        label: "Improve FAQ clarity",
        icon: "❓",
        prompt: `Rewrite the FAQ questions and answers in ${sectionName} to be clearer, more concise, and directly address user objections.`,
      });
    } else if (isPricing) {
      suggestions.push({
        id: "pricing-highlight",
        label: "Highlight recommended plan",
        icon: "⭐",
        prompt: `Make the recommended pricing plan in ${sectionName} visually stand out more — add a badge, border, or background treatment to guide the user's eye.`,
      });
      suggestions.push({
        id: "pricing-copy",
        label: "Improve plan copy",
        icon: "✍️",
        prompt: `Improve the pricing plan descriptions in ${sectionName}: more benefit-oriented feature lists and clearer value differentiation between tiers.`,
      });
    } else if (isTeam) {
      suggestions.push({
        id: "team-copy",
        label: "Improve team presentation",
        icon: "👥",
        prompt: `Improve the team section: better role descriptions, more personal bios, and cleaner card layout.`,
      });
    } else if (isGallery) {
      suggestions.push({
        id: "gallery-layout",
        label: "Improve gallery layout",
        icon: "🖼️",
        prompt: `Improve the gallery layout in ${sectionName}: better grid sizing, consistent aspect ratios, and add subtle hover effects.`,
      });
    } else if (isStats) {
      suggestions.push({
        id: "stats-impact",
        label: "Make stats more impactful",
        icon: "📊",
        prompt: `Make the stats in ${sectionName} more impactful: larger numbers, better labels, and add context to each metric.`,
      });
    } else {
      suggestions.push({
        id: "section-hierarchy",
        label: "Improve visual hierarchy",
        icon: "🎨",
        prompt: `Improve the visual hierarchy of ${sectionName}: better heading/body contrast, more intentional spacing, and stronger visual flow.`,
      });
      suggestions.push({
        id: "section-copy",
        label: "Rewrite section copy",
        icon: "✍️",
        prompt: `Rewrite the copy in ${sectionName} to be clearer, more benefit-focused, and aligned with the brand voice.`,
      });
    }

    // Mobile responsiveness check
    const gridCount = (node.gridCols ?? "").split(" ").filter(Boolean).length;
    const mobileRisk = node.fontSize > 38 || gridCount >= 3 || devicePreview === "mobile";
    if (mobileRisk) {
      suggestions.push({
        id: "mobile",
        label: "Optimize for mobile",
        icon: "📱",
        prompt: `Optimize ${sectionName} for mobile: improve font sizes, spacing, and stack/simplify multi-column layouts for small screens.`,
      });
    }
  }

  // ── Button ─────────────────────────────────────────────────────────────────
  else if (node.isBtn) {
    const label = node.label || "this button";
    suggestions.push({
      id: "btn-copy",
      label: "Better button copy",
      icon: "✍️",
      prompt: `Rewrite the "${label}" button copy to be more action-oriented and benefit-driven (e.g. "Get started free" vs "Sign up").`,
    });
    suggestions.push({
      id: "btn-prominence",
      label: "Make it stand out more",
      icon: "🎨",
      prompt: `Make the "${label}" button more visually prominent: improve color contrast, padding, or add a subtle shadow/glow effect.`,
    });
  }

  // ── Image ──────────────────────────────────────────────────────────────────
  else if (node.isImg) {
    suggestions.push({
      id: "img-presentation",
      label: "Improve image presentation",
      icon: "🖼️",
      prompt: `Improve how this image is presented in ${sectionName}: consider framing, aspect ratio, overlay, or border-radius treatment.`,
    });
    if (!node.altText) {
      suggestions.push({
        id: "img-alt",
        label: "Add descriptive alt text",
        icon: "♿",
        prompt: `Add meaningful, descriptive alt text to this image in ${sectionName} for better accessibility and SEO.`,
      });
    }
  }

  // ── Heading text ───────────────────────────────────────────────────────────
  else if (node.isText) {
    const label = node.label || "this heading";
    suggestions.push({
      id: "heading-copy",
      label: "Improve heading copy",
      icon: "✍️",
      prompt: `Rewrite "${label}" to be more impactful, specific, and benefit-driven. Keep the visual style unchanged.`,
    });
    suggestions.push({
      id: "heading-style",
      label: "Better typography style",
      icon: "🎨",
      prompt: `Improve the typography treatment of "${label}": font weight, size, letter-spacing, or color for stronger visual impact.`,
    });
  }

  // ── SVG / Icon ─────────────────────────────────────────────────────────────
  else if (node.isSvg) {
    suggestions.push({
      id: "svg-better",
      label: "Suggest a better icon",
      icon: "🔄",
      prompt: `Suggest a more fitting and visually consistent icon for this element in ${sectionName} that better communicates its purpose.`,
    });
    suggestions.push({
      id: "svg-style",
      label: "Improve icon styling",
      icon: "🎨",
      prompt: `Improve the icon's visual style in ${sectionName}: adjust size, color, or stroke weight to better match the design system.`,
    });
  }

  // ── Contrast override (any text / button) ──────────────────────────────────
  const bg = node.backgroundColor || node.secBg || project.blueprint?.colorScheme?.bg || null;
  const contrast = contrastRatio(node.color, bg);
  if (contrast !== null && contrast < 3.6 && (node.isText || node.isBtn)) {
    suggestions.push({
      id: "contrast",
      label: "Fix contrast issue",
      icon: "⚠️",
      prompt: `The text in ${sectionName} has a contrast ratio of ~${contrast.toFixed(1)}, which is below WCAG AA (4.5). Fix the color to improve readability while keeping the brand palette.`,
    });
  }

  // Fallback
  if (suggestions.length === 0) {
    suggestions.push({
      id: "polish",
      label: "Polish this element",
      icon: "✨",
      prompt: `Refine the ${sectionName} to feel more polished and cohesive with the rest of the page.`,
    });
  }

  return suggestions.slice(0, 3);
}
