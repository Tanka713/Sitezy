import type { BriefChatMessage, BusinessBrief } from "@/lib/ai/types";
import { formatBusinessBrief } from "@/lib/ai/prompts/shared";

export function buildWizardExtractionSystemPrompt(): string {
  return [
    "You are Sitezy's onboarding strategist.",
    "Extract only high-value business brief information from the user's latest answer and conversation context.",
    "Never invent facts. Leave unknown fields empty.",
    "Normalize answers into concise business language.",
    "If the user says they do not have a logo, set assets.logo.status to \"missing\".",
    "If the user shares a URL that looks like a logo source, set assets.logo.status to \"url\" and sourceUrl.",
    "If the current brief already contains logo metadata, preserve it unless the user clearly changes it.",
    "If the user's answer is a short negative like 'no', 'nope', 'none', 'n/a', 'skip', or 'pass', leave the corresponding field empty — do not populate it with placeholder words.",
    "Focus on: business identity, offer, audience, differentiators, goals, style, pages, content, contact info, and logo status.",
    "When a PENDING QUESTION is provided below, treat the user's latest message as a direct answer to it and map it into that exact field — short, direct answers (even one or two words, like a product type or city) are valid and must not be left empty.",
    "Return JSON only.",
  ].join("\n");
}

export function buildWizardExtractionUserPrompt(
  messages: BriefChatMessage[],
  currentBrief: BusinessBrief,
  pending?: { field: string; question: string } | null
): string {
  const transcript = messages
    .slice(-10)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  return [
    "CURRENT STRUCTURED BRIEF:",
    formatBusinessBrief(currentBrief),
    "",
    "RECENT TRANSCRIPT:",
    transcript || "No transcript yet.",
    "",
    pending
      ? [
          "PENDING QUESTION — the user's latest message is most likely a direct answer to this:",
          `Field to fill: ${pending.field}`,
          `Question asked: "${pending.question}"`,
          "Map the latest answer into this field even if it is brief, unless it is a negative/skip.",
        ].join("\n")
      : "No specific question is pending; extract whatever the user volunteered.",
    "",
    "Return JSON in this shape:",
    "{",
    '  "businessName": "string or empty",',
    '  "industry": "string or empty",',
    '  "location": "string or empty",',
    '  "businessDescription": "string or empty",',
    '  "offerSummary": "string or empty",',
    '  "audience": "string or empty",',
    '  "differentiators": ["string"],',
    '  "websiteGoals": ["string"],',
    '  "tone": "string or empty",',
    '  "styleDirection": ["string"],',
    '  "brandColors": ["#hex"],',
    '  "pages": ["string"],',
    '  "services": ["string"],',
    '  "testimonials": ["string"],',
    '  "socialProof": ["string"],',
    '  "story": "string or empty",',
    '  "references": ["string"],',
    '  "contactInfo": {',
    '    "email": "string or empty",',
    '    "phone": "string or empty",',
    '    "address": "string or empty",',
    '    "hours": "string or empty",',
    '    "cta": "string or empty",',
    '    "bookingEnabled": true,',
    '    "leadCaptureEnabled": true',
    "  },",
    '  "brand": {',
    '    "hasExistingStyle": true,',
    '    "mood": ["string"],',
    '    "references": ["string"]',
    "  },",
    '  "assets": {',
    '    "logo": {',
    '      "status": "uploaded | url | missing | unknown",',
    '      "fileUrl": "string or empty",',
    '      "fileName": "string or empty",',
    '      "sourceUrl": "string or empty",',
    '      "altText": "string or empty",',
    '      "notes": "string or empty"',
    "    }",
    "  }",
    "}",
    "",
    "Do not add commentary.",
  ].join("\n");
}
