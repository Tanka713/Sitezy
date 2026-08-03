import type { BusinessBrief, StrategyPlan } from "@/lib/ai/types";
import { formatBusinessBrief, formatStrategyPage } from "@/lib/ai/prompts/shared";
import { formatIndustryPlaybook } from "@/lib/ai/utils/sectionRules";
import { summarizeList } from "@/lib/ai/utils/normalize";
import { formatWebInspirationForPrompt, type WebInspirationResult } from "@/lib/ai/web-inspiration";
import { buildDesignTrendBriefing } from "@/lib/ai/design-trends";
import { formatCreativeDnaForPrompt } from "@/lib/ai/creative-dna";
import { formatExamplesForPrompt, type SiteGenerationExample } from "@/lib/server/generation-knowledge";

export function buildDesignSystemPrompt(): string {
  return [
    "You are Sitezy's design engine.",
    "Create a design system that changes structure, composition, typography, rhythm, and brand atmosphere, not just colors.",
    "Think like a premium 2026 art director and systems-minded web designer working at Awwwards / Framer / Linear / Stripe level.",
    "Decide a deliberate motion language, a surface system (glass, gradient mesh, grain, layered elevation), and a confident fluid type scale — never a flat, generic template.",
    "Return JSON only.",
  ].join("\n");
}

export function buildDesignUserPrompt(
  brief: BusinessBrief,
  strategy: StrategyPlan,
  archetypeGuidance: string,
  webInspiration?: WebInspirationResult | null,
  examples?: SiteGenerationExample[]
): string {
  return [
    formatBusinessBrief(brief),
    "",
    formatIndustryPlaybook(brief),
    "",
    `Audience priorities: ${summarizeList(strategy.audiencePriorities)}`,
    `Trust signals: ${summarizeList(strategy.trustSignals)}`,
    `Content priorities: ${summarizeList(strategy.contentPriorities)}`,
    "",
    ...strategy.pagePlans.map(formatStrategyPage),
    "",
    "Design archetype guidance:",
    archetypeGuidance,
    "",
    formatCreativeDnaForPrompt(brief),
    "",
    buildDesignTrendBriefing(brief),
    "",
    // Inject web inspiration when available — primary signal for color, layout & typography
    ...(webInspiration
      ? [formatWebInspirationForPrompt(webInspiration), ""]
      : []),
    // Inject RAG examples for design style reference
    ...(examples?.length
      ? [formatExamplesForPrompt(examples), ""]
      : []),
    "Return JSON:",
    "{",
    '  "conceptName": "string",',
    '  "brandCore": "string",',
    '  "visualSignature": "string",',
    '  "layoutStyle": "editorial | bento | asymmetric | split-screen | grid | storytelling | card-based | zigzag | product-first | magazine | sidebar-led",',
    '  "siteFormat": "editorial-feature | campaign-poster | menu-first-catalog | club-community | showroom-split | story-journey | magazine-rail | product-showroom | gallery-showcase | trust-proof",',
    '  "navigationStyle": "minimal | full | sidebar | floating",',
    '  "footerStyle": "simple | detailed | bold | minimal",',
    '  "animationStyle": "none | subtle | moderate | expressive",',
    '  "colorScheme": { "primary":"#hex","secondary":"#hex","accent":"#hex","bg":"#hex","text":"#hex","muted":"#hex","border":"#hex" },',
    '  "typography": { "headingFont":"string","bodyFont":"string","style":"string","headingWeight":"700","lineHeight":"1.2" },',
    '  "sectionRhythm": "string",',
    '  "heroApproach": "string",',
    '  "componentLanguage": ["string"],',
    '  "structuralComposition": ["string"],',
    '  "visualHierarchyRules": ["string"],',
    '  "logoTreatment": "string",',
    '  "motionGuidance": ["string"],',
    '  "accessibilityPrinciples": ["string"]',
    "}",
    "",
    "Rules:",
    "- Font selections must match the brand and avoid defaulting to Inter/Roboto unless there is a strong reason.",
    "- Structural composition must shape the page hierarchy and section contrast.",
    "- Visual hierarchy rules must explain what dominates first, second, and third in the page.",
    "- If a logo exists, define how it should influence navigation and brand treatment.",
    "- motionGuidance must name concrete techniques the build step can execute: scroll reveals (fade-up/left/right, zoom-in), stagger on grids, parallax on hero/background media, hover effects (lift/grow/tilt/glow), word-cascade hero headlines (data-sz-words), count-up stats (data-sz-count), drifting mesh backdrops (sz-mesh-drift) and marquee tickers. Match the amount to animationStyle.",
    "- The Design DNA block is BINDING: translate every axis (palette strategy, canvas plan, shape language, type character, image treatment, motion temperament, hero signature, layout motif, wildcard detail) into the JSON fields. The trend briefing below it is supporting inspiration; when they conflict, the DNA wins.",
    "- Commit to ONE hero signature and 2–3 patterns from the award-level trend briefing as the site's recognizable design signature, adapted to this brand — never copied verbatim.",
    "- componentLanguage and visualSignature should specify the surface system: where to use glass panels, gradient-mesh backdrops, grain texture and layered elevation, plus an accent gradient for one highlighted phrase.",
    "- Choose a confident, modern type pairing with a large fluid display scale for heroes; avoid generic SaaS defaults.",
    "- Set animationStyle to 'expressive' or 'moderate' for brands that want a wow factor, 'subtle' for restrained luxury/corporate, and 'none' only when explicitly minimal.",
    ...(webInspiration
      ? [
          `- Web inspiration IS PROVIDED above — use the color approach, layout density, and typography style as a starting reference, then differentiate.`,
          `- DO NOT copy competitor sites — instead, take their strongest pattern and push it further or combine it with this brand's unique identity.`,
          `- The suggested layout style from research (${webInspiration.insights.suggestedLayoutStyle ?? "not specified"}) should inform your layoutStyle choice.`,
        ]
      : []),
  ].join("\n");
}
