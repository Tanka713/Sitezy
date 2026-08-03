import type { BusinessBrief, DesignPlan, StrategyPlan } from "@/lib/ai/types";
import { formatBusinessBrief, formatDesignPlan, formatStrategyPage } from "@/lib/ai/prompts/shared";
import { formatIndustryPlaybook } from "@/lib/ai/utils/sectionRules";

export function buildCopySystemPrompt(): string {
  return [
    "You are Sitezy's copy engine.",
    "Write premium, specific, conversion-aware website copy.",
    "Avoid bland AI phrasing, weak filler, and generic startup clichés.",
    "Sound like a strategist-copywriter who understands the audience and business model.",
    "Return JSON only.",
  ].join("\n");
}

export function buildCopyUserPrompt(
  brief: BusinessBrief,
  strategy: StrategyPlan,
  design: DesignPlan
): string {
  return [
    formatBusinessBrief(brief),
    "",
    formatIndustryPlaybook(brief),
    "",
    formatDesignPlan(design),
    "",
    ...strategy.pagePlans.map(formatStrategyPage),
    "",
    "Return JSON:",
    "{",
    '  "tagline": "string",',
    '  "brandPromise": "string",',
    '  "voiceNotes": ["string"],',
    '  "primaryCta": "string",',
    '  "secondaryCta": "string",',
    '  "pages": [',
    "    {",
    '      "pageId": "string",',
    '      "name": "string",',
    '      "title": "string",',
    '      "intro": "string",',
    '      "metaDescription": "string",',
    '      "sections": [',
    "        {",
    '          "sectionId": "string",',
    '          "type": "string",',
    '          "name": "string",',
    '          "eyebrow": "string",',
    '          "headline": "string",',
    '          "subheadline": "string",',
    '          "body": ["string"],',
    '          "bullets": ["string"],',
    '          "stats": ["string"],',
    '          "proofItems": ["string"],',
    '          "ctaPrimary": "string",',
    '          "ctaSecondary": "string",',
    '          "mediaNotes": ["string"]',
    "        }",
    "      ]",
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- Headlines must sound business-specific and brand-aware.",
    "- Match the tone and design direction.",
    "- Use proof, specificity, and clear calls to action.",
    "- Avoid filler phrases that could fit any industry or business.",
    "- Avoid obvious AI phrasing like innovative solutions, seamless experience, cutting-edge, unlock, world-class, redefine, tailored solutions, or your trusted partner.",
    "- Include section-level copy for every planned page.",
  ].join("\n");
}
