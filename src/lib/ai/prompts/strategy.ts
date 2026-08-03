import type { BusinessBrief } from "@/lib/ai/types";
import { formatBusinessBrief } from "@/lib/ai/prompts/shared";
import { formatIndustryPlaybook } from "@/lib/ai/utils/sectionRules";
import { formatExamplesForPrompt } from "@/lib/server/generation-knowledge";
import { formatPatternForPrompt } from "@/lib/server/pattern-extractor";
import type { SiteGenerationExample } from "@/lib/server/generation-knowledge";
import type { IndustryPattern } from "@/lib/server/pattern-extractor";

export function buildStrategySystemPrompt(): string {
  return [
    "You are Sitezy's strategy engine.",
    "Turn a structured business brief into a website strategy that prioritizes conversion, trust, and information hierarchy.",
    "Think like a brand strategist, UX lead, and information architect.",
    "Avoid generic page plans and do not default every business to the same homepage structure.",
    "Return JSON only.",
  ].join("\n");
}

export function buildStrategyUserPrompt(
  brief: BusinessBrief,
  knowledge?: {
    examples?: SiteGenerationExample[];
    pattern?: IndustryPattern | null;
  }
): string {
  const knowledgeBlocks: string[] = [];

  if (knowledge?.pattern) {
    knowledgeBlocks.push(formatPatternForPrompt(knowledge.pattern));
  }
  if (knowledge?.examples?.length) {
    knowledgeBlocks.push(formatExamplesForPrompt(knowledge.examples));
  }

  return [
    formatBusinessBrief(brief),
    "",
    formatIndustryPlaybook(brief),
    ...(knowledgeBlocks.length ? ["", ...knowledgeBlocks] : []),
    "",
    "Return JSON:",
    "{",
    '  "positioning": "string",',
    '  "audiencePriorities": ["string"],',
    '  "conversionStrategy": ["string"],',
    '  "trustSignals": ["string"],',
    '  "siteNarrative": "string",',
    '  "contentPriorities": ["string"],',
    '  "sectionPrinciples": ["string"],',
    '  "pagePlans": [',
    "    {",
    '      "pageId": "string",',
    '      "name": "string",',
    '      "slug": "string",',
    '      "purpose": "string",',
    '      "conversionGoal": "string",',
    '      "keyMoments": ["string"],',
    '      "mustIncludeSectionTypes": ["string"],',
    '      "optionalSectionTypes": ["string"],',
    '      "trustSignals": ["string"]',
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- Every page must have a distinct purpose.",
    "- Reflect the actual business model and audience journey.",
    "- Use section types that match the industry and website goal.",
    "- Make the homepage immediately explain what the business offers and why it is credible.",
    "- Different industries should produce different page structures, not the same hero-services-testimonials stack.",
    ...(knowledgeBlocks.length
      ? [
          "- Reference examples and patterns above are from similar accepted sites — use them as signal, not template.",
          "- Adapt patterns to this specific business; do not copy section sequences mechanically.",
        ]
      : []),
  ].join("\n");
}
