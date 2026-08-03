import type { BusinessBrief, CopyPlan, DesignPlan, StrategyPlan } from "@/lib/ai/types";
import type { WebInspirationResult } from "@/lib/ai/web-inspiration";
import { formatBusinessBrief, formatCopyPage, formatDesignPlan, formatStrategyPage } from "@/lib/ai/prompts/shared";
import { formatIndustryPlaybook } from "@/lib/ai/utils/sectionRules";
import { summarizeList } from "@/lib/ai/utils/normalize";
import { buildDesignTrendBriefing } from "@/lib/ai/design-trends";
import { formatCreativeDnaForPrompt } from "@/lib/ai/creative-dna";

export function buildLayoutSystemPrompt(): string {
  return [
    "You are Sitezy's layout engine.",
    "Transform strategy, design, and copy into page blueprints with strong hierarchy and section variety.",
    "Do not create repetitive hero-features-testimonials pages.",
    "Vary section structures based on industry, tone, and conversion need.",
    "Think like an editorial designer, conversion strategist, and premium art director at the same time.",
    "Plan motion and surface treatment per section so the build step can execute scroll reveals, stagger, parallax, glass / gradient-mesh / grain surfaces, layered elevation and hover effects.",
    "Return JSON only.",
  ].join("\n");
}

export function buildLayoutUserPrompt(
  brief: BusinessBrief,
  strategy: StrategyPlan,
  design: DesignPlan,
  copy: CopyPlan,
  webInspiration?: WebInspirationResult | null
): string {
  return [
    formatBusinessBrief(brief),
    "",
    formatIndustryPlaybook(brief),
    "",
    formatCreativeDnaForPrompt(brief),
    "",
    buildDesignTrendBriefing(brief),
    "",
    // Inject competitor section patterns for layout planning
    ...(webInspiration
      ? [
          `── Competitor section research ──`,
          `Common section types in this industry: ${webInspiration.insights.commonSectionTypes.join(", ")}`,
          `Layout density used by leaders: ${webInspiration.insights.layoutDensity}`,
          webInspiration.insights.trustSignalPatterns.length
            ? `Trust signal patterns: ${webInspiration.insights.trustSignalPatterns.join(", ")}`
            : "",
          `──────────────────────────────────────────────`,
          "",
        ].filter(Boolean)
      : []),
    formatDesignPlan(design),
    "",
    `Primary CTA: ${copy.primaryCta}`,
    `Secondary CTA: ${copy.secondaryCta}`,
    `Voice notes: ${summarizeList(copy.voiceNotes)}`,
    "",
    ...strategy.pagePlans.map(formatStrategyPage),
    "",
    ...copy.pages.map(formatCopyPage),
    "",
    "Return JSON:",
    "{",
    '  "antiRepetitionRules": ["string"],',
    '  "siteWidePatterns": ["string"],',
    '  "pages": [',
    "    {",
    '      "pageId": "string",',
    '      "name": "string",',
    '      "slug": "string",',
    '      "purpose": "string",',
    '      "storyArc": "string",',
    '      "rhythmPlan": "string",',
    '      "ctaStrategy": "string",',
    '      "navbarConcept": "string",',
    '      "signatureMoment": "string",',
    '      "sections": [',
    "        {",
    '          "id": "string",',
    '          "type": "string",',
    '          "name": "string",',
    '          "variation": "string",',
    '          "compositionMode": "string",',
    '          "spacingProfile": "string",',
    '          "surfaceStyle": "string",',
    '          "ctaPlacement": "string",',
    '          "contrastWithPrevious": "string",',
    '          "purpose": "string",',
    '          "layoutIdea": "string",',
    '          "emphasis": "string",',
    '          "visualHook": "string",',
    '          "interactionHint": "string",',
    '          "hierarchy": ["string"],',
    '          "contentKeys": ["string"],',
    '          "mediaBriefs": ["string"],',
    '          "premiumDetails": ["string"]',
    "        }",
    "      ]",
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- Every page needs a narrative arc, not just stacked blocks.",
    "- Every page needs a rhythm plan and CTA strategy that describe how intensity and actions are paced from top to bottom.",
    "- Use section types from the strategy plan and only add sections when they help the page's job.",
    "- Heroes, about sections, services layouts, proof sections, and CTAs should vary meaningfully across pages.",
    "- Different industries must create meaningfully different structures and pacing.",
    "- Section metadata should make the build step clearly understand composition, spacing, surface contrast, and CTA placement.",
    "- For each section, set surfaceStyle (e.g. glass panel, gradient-mesh backdrop, grain texture, solid, layered elevation), visualHook and premiumDetails using concrete treatments the runtime supports.",
    "- interactionHint must specify the motion: which elements get scroll reveals, whether the grid staggers, any parallax accent, and the hover effect on cards/CTAs. Where they earn their place, also plan count-up stats (data-sz-count), a word-cascade headline (data-sz-words, one per page max), a drifting mesh backdrop (sz-mesh-drift), a marquee ticker, or a native details/summary FAQ accordion.",
    "- Give the hero a signature first-3-seconds moment: a fluid display headline, an atmospheric backdrop, and one orchestrated reveal sequence.",
    "- Draw each page's signatureMoment from the award-level trend briefing above, adapted to this brand — pick the trend that best serves the page's conversion job, not the flashiest one.",
    "- The Design DNA block is BINDING: the home hero must execute the DNA hero signature, the DNA layout motif must appear on at least one page, the DNA wildcard detail must appear somewhere on the site, and every section's surfaceStyle must follow the DNA canvas plan.",
    ...(webInspiration
      ? [
          `- Competitor research IS PROVIDED above — incorporate common section types where they fit, but create a more distinctive arrangement.`,
          `- Mirror the layout density pattern (${webInspiration.insights.layoutDensity}) unless the brand calls for something different.`,
        ]
      : []),
  ].join("\n");
}
