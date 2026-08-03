import type { BusinessBrief, CopyPlan, DesignPlan, LayoutPlan, PolishPlan, StrategyPlan } from "@/lib/ai/types";
import { dedupeStrings } from "@/lib/ai/utils/normalize";

// Concrete, scroll-aware motion plan mapped to the render-runtime hooks
// implemented in buildFullPageHtml (data-sz-reveal / data-sz-stagger /
// data-sz-parallax / data-sz-hover-fx / sz-* primitives). Intensity scales
// with the design plan's animationStyle.
function motionHintsFor(style: string, pageName: string): string[] {
  const reveal =
    'Add data-sz-reveal (paired with data-sz-anim-in="fade-up" | "fade-left" | "fade-right" | "zoom-in") to each section\'s eyebrow, heading and lead block so they animate in on scroll.';

  if (style === "none") {
    return [`Keep ${pageName} mostly still: reveal the hero only, no scroll animation elsewhere.`];
  }
  if (style === "subtle") {
    return [
      reveal,
      "Reveal hero, proof and CTA emphasis points only; keep stagger delays short (0–120ms).",
      'Use data-sz-hover-fx="lift" on primary buttons and cards; do not use parallax.',
      "Wrap key stat values in <span data-sz-count> so proof numbers count up quietly on scroll.",
      "Give nav links sz-link-underline and form fields the sz-field focus ring — restrained micro-interactions only.",
    ];
  }
  if (style === "expressive") {
    return [
      reveal,
      'Wrap card / feature / gallery grids in data-sz-stagger (data-sz-stagger-step="110") so children cascade in.',
      'Use data-sz-parallax (data-sz-parallax-speed 0.10–0.25) on hero or background decorative media / gradient blobs ONLY — never on text or on data-sz-reveal elements.',
      'Use data-sz-hover-fx="lift" | "glow" | "tilt" on cards and CTAs, and the sz-spotlight class on feature cards.',
      "Open with a cinematic hero: a sz-gradient-mesh sz-mesh-drift backdrop, an sz-display headline with data-sz-words so its words cascade in, and one orchestrated reveal sequence.",
      "Add one marquee ticker (data-sz-logo-scroller/track) and count-up stats (data-sz-count) where proof appears; keep nav links on sz-link-underline and forms on sz-field.",
    ];
  }
  // moderate (default)
  return [
    reveal,
    'Wrap card / feature / testimonial grids in data-sz-stagger (data-sz-stagger-step="90").',
    'Use data-sz-hover-fx="lift" | "grow" on cards and primary CTAs.',
    "Reserve parallax for a single hero or background accent when it strengthens the composition.",
    "Count up key stats with data-sz-count, give nav links sz-link-underline, form fields sz-field, and consider data-sz-words on the home hero headline only.",
  ];
}

export function runPolishEngine(
  brief: BusinessBrief,
  strategy: StrategyPlan,
  design: DesignPlan,
  copy: CopyPlan,
  layout: LayoutPlan
): PolishPlan {
  return {
    siteWideNotes: dedupeStrings([
      "Keep touch targets comfortable and visible on mobile.",
      "Use contrast changes between sections to reinforce hierarchy without hurting readability.",
      "Make CTA buttons and contact affordances obvious above the fold where possible.",
      ...design.visualHierarchyRules,
      brief.assets.logo.status === "missing"
        ? "Use a text-based brand treatment consistently in header and footer."
        : "Respect the provided logo clearspace and avoid stretching the logo asset.",
    ], 6),
    pages: layout.pages.map((page) => {
      const copyPage = copy.pages.find((entry) => entry.pageId === page.pageId);
      const strategyPage = strategy.pagePlans.find((entry) => entry.pageId === page.pageId);
      return {
        pageId: page.pageId,
        seoTitle: `${page.name === "Home" ? brief.businessName : `${page.name} | ${brief.businessName}`}`.slice(0, 60),
        seoDescription: (copyPage?.metaDescription || strategyPage?.purpose || brief.businessDescription).slice(0, 155),
        animationHints: dedupeStrings(motionHintsFor(design.animationStyle, page.name), 6),
        responsivenessNotes: dedupeStrings([
          "Collapse multi-column moments into a clear single-column story on mobile.",
          "Keep imagery from overwhelming copy on narrow screens.",
          "Preserve section identity when stacking layout modules vertically.",
          "Keep the primary hierarchy intact when wide layouts collapse to one column.",
        ], 4),
        accessibilityNotes: dedupeStrings([
          "Maintain readable heading hierarchy and semantic section landmarks.",
          "Keep interactive controls keyboard reachable and visibly focused.",
          "Avoid decorative text treatments that make copy hard to edit or read.",
        ], 4),
      };
    }),
  };
}
