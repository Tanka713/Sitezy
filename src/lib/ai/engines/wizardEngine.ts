import type { SiteBrief } from "@/types";
import { businessBriefToPartialSiteBrief, siteBriefToBusinessBrief } from "@/lib/ai/adapters/wizardAdapter";
import { researchBusinessIdentity, researchToBriefPatch } from "@/lib/ai/business-research";
import { buildWizardExtractionSystemPrompt, buildWizardExtractionUserPrompt } from "@/lib/ai/prompts/wizard";
import { jsonCompletion } from "@/lib/ai/runtime";
import type {
  BriefChatMessage,
  BriefInterviewResult,
  BusinessBrief,
  BusinessBriefFieldId,
  BusinessBriefStage,
} from "@/lib/ai/types";
import {
  mergeBusinessBrief,
  summarizeList,
  toSentence,
} from "@/lib/ai/utils/normalize";
import {
  getKnownFields,
  getMissingFields,
  getReadinessScore,
  inferStage,
  shouldAllowGeneration,
  summarizeCompletion,
} from "@/lib/ai/utils/validation";

// Fields the user can reasonably decline without blocking generation
const DECLINEABLE_FIELDS: BusinessBriefFieldId[] = [
  "testimonials",
  "socialProof",
  "story",
  "brandColors",
  "logo",
  "styleDirection",
];

// Field priority per stage — used both to choose the next question to ask and to
// identify which field the most recent stage question was targeting.
const STAGE_FIELDS: Record<BusinessBriefStage, BusinessBriefFieldId[]> = {
  identity: ["businessName", "industry", "businessDescription", "location"],
  offer: ["offerSummary", "audience", "differentiators", "services"],
  goal: ["websiteGoals", "leadCapture"],
  style: ["tone", "styleDirection", "brandColors"],
  content: ["pages", "testimonials", "socialProof", "story", "contactInfo"],
  logo: ["logo"],
  finalize: ["logo"],
  ready: [],
};

// Patterns that indicate the user is saying "no" to the current question
const NEGATIVE_RESPONSE_RE =
  /^(no+pe?|n\/a|na|none|not (yet|really|at all|currently|right now)|don'?t (have|know|got)|i (don'?t|have no|got no)|skip|pass|nothing|never mind|forget it|move on|next|no (quotes?|testimonials?|story|colors?|brand|logo)?)[\s,.!?]*$/i;

// Patterns that indicate the user wants to trigger generation
const GENERATE_INTENT_RE =
  /\b(go ahead|generate (now|it|the site|please)?|create (it|the site|now)?|start (generating|building)?|build (it|now|the site)?|yes,? ?generate|let'?s? go|do it now?|just (generate|build|create)|make (it|the site)|launch|proceed)\b/i;

export function detectGenerateIntent(message: string): boolean {
  return GENERATE_INTENT_RE.test(message.trim());
}

function detectDeclinedField(
  lastMessage: string,
  previousBrief: BusinessBrief,
  pendingField: BusinessBriefFieldId | null
): BusinessBriefFieldId | null {
  if (!NEGATIVE_RESPONSE_RE.test(lastMessage.trim())) return null;

  const declinedFields = previousBrief.intelligence.declinedFields ?? [];

  if (
    pendingField &&
    DECLINEABLE_FIELDS.includes(pendingField) &&
    !declinedFields.includes(pendingField)
  ) {
    return pendingField;
  }

  return null;
}

function chooseMissingField(
  brief: BusinessBrief,
  missingFields: BusinessBriefFieldId[],
  candidates: BusinessBriefFieldId[]
): BusinessBriefFieldId | null {
  const declined = brief.intelligence.declinedFields ?? [];

  for (const candidate of candidates) {
    if (missingFields.includes(candidate) && !declined.includes(candidate)) return candidate;
  }

  if (missingFields.includes("logo") && !declined.includes("logo") && brief.assets.logo.status !== "missing") {
    return "logo";
  }

  // Fall back to any non-declined missing field
  return missingFields.find((f) => !declined.includes(f)) ?? null;
}

function buildQuestionForField(field: BusinessBriefFieldId, brief: BusinessBrief): string {
  switch (field) {
    case "businessName":
      return "What should the site be called?";
    case "industry":
      return "What kind of business is it, in the most specific terms?";
    case "location":
      return "Where are you based or where do you serve clients?";
    case "businessDescription":
      return "Give me the clearest one- or two-sentence description of what you do.";
    case "offerSummary":
      return "What are the main services, products, or offers the site should highlight first?";
    case "audience":
      return "Who is the ideal customer you want this site to speak to?";
    case "differentiators":
      return "What makes you better or different from the alternatives?";
    case "websiteGoals":
      return "What should this website help you achieve first: leads, bookings, calls, sales, trust, or something else?";
    case "tone":
      return "What tone should the site feel like: premium, warm, bold, minimal, playful, editorial, or something else?";
    case "styleDirection":
      return "What visual direction feels right for the brand?";
    case "brandColors":
      return "Do you already have brand colors or a palette we should respect?";
    case "pages":
      return "Which pages do you know you need?";
    case "services":
      return brief.industry.toLowerCase().includes("restaurant")
        ? "What dishes, categories, or menu highlights should we feature?"
        : "Which services or products should we feature most prominently?";
    case "testimonials":
      return "Do you already have any testimonials or client quotes worth featuring?";
    case "socialProof":
      return "Any awards, notable clients, review counts, press mentions, or metrics we can use as proof?";
    case "story":
      return "Is there a founder story, brand story, or origin detail worth weaving into the site?";
    case "contactInfo":
      return "What contact details should appear on the site?";
    case "leadCapture":
      return "Should the site focus on booking, contact forms, phone calls, lead capture, or simple info requests?";
    case "logo":
      return "Do you already have a logo? You can upload it, paste a logo URL, or tell me to continue without one.";
    default:
      return "What is the most important thing the site should communicate?";
  }
}

function buildStageQuestion(brief: BusinessBrief, stage: BusinessBriefStage, missingFields: BusinessBriefFieldId[]): string {
  const field = chooseMissingField(brief, missingFields, STAGE_FIELDS[stage]);
  if (!field) {
    return "If there is anything else the site absolutely needs to communicate, tell me now and I’ll fold it in before generation.";
  }

  const declined = brief.intelligence.declinedFields ?? [];
  const question = buildQuestionForField(field, brief);
  const followUp = stage === "style" && missingFields.includes("brandColors") && !declined.includes("brandColors")
    ? " If you know your colors, include them too."
    : stage === "content" && missingFields.includes("pages") && !declined.includes("pages")
    ? " If you already know the pages, list them in one line."
    : "";

  return `${question}${followUp}`;
}

// Plain fields whose raw answer can be captured directly as a fallback.
const STRING_CAPTURE_FIELDS: BusinessBriefFieldId[] = [
  "businessName", "industry", "location", "businessDescription",
  "offerSummary", "audience", "tone", "story",
];
const LIST_CAPTURE_FIELDS: BusinessBriefFieldId[] = [
  "differentiators", "websiteGoals", "styleDirection", "pages", "services",
];

function splitAnswerList(raw: string): string[] {
  return raw.split(/[,;\n]+| and /i).map((s) => s.trim()).filter(Boolean);
}

// Best-effort capture of a raw user answer into the field that was just asked.
// Only handles plain scalar/list fields; structured fields (contactInfo,
// brandColors, logo) are left to the LLM extractor.
function applyRawAnswerToField(
  brief: BusinessBrief,
  field: BusinessBriefFieldId,
  raw: string
): BusinessBrief {
  const text = raw.trim();
  if (!text) return brief;
  const patch: Partial<BusinessBrief> = {};
  if (STRING_CAPTURE_FIELDS.includes(field)) {
    (patch as Record<string, unknown>)[field] = text;
    return mergeBusinessBrief(brief, patch);
  }
  if (LIST_CAPTURE_FIELDS.includes(field)) {
    const items = splitAnswerList(text);
    (patch as Record<string, unknown>)[field] = items.length ? items : [text];
    return mergeBusinessBrief(brief, patch);
  }
  return brief;
}

// Whether the LLM extraction changed any content field this turn. Used to decide
// if a raw-answer fallback is safe: only capture when extraction understood nothing.
function briefContentChanged(a: BusinessBrief, b: BusinessBrief): boolean {
  const key = (x: BusinessBrief) =>
    JSON.stringify({
      businessName: x.businessName, industry: x.industry, location: x.location,
      businessDescription: x.businessDescription, offerSummary: x.offerSummary,
      audience: x.audience, tone: x.tone, story: x.story,
      differentiators: x.differentiators, websiteGoals: x.websiteGoals,
      styleDirection: x.styleDirection, brandColors: x.brandColors,
      pages: x.pages, services: x.services, testimonials: x.testimonials,
      socialProof: x.socialProof, contactInfo: x.contactInfo, logo: x.assets.logo,
    });
  return key(a) !== key(b);
}

// Friendly, specific phrases for acknowledging what was captured this turn.
const ACK_LABELS: Partial<Record<BusinessBriefFieldId, string>> = {
  industry: "the business type",
  location: "your location",
  businessDescription: "what you do",
  offerSummary: "your offer",
  services: "your services",
  audience: "your audience",
  differentiators: "what sets you apart",
  websiteGoals: "your goals",
  tone: "the tone",
  styleDirection: "the visual direction",
  brandColors: "your colors",
  pages: "the pages",
  story: "your story",
};

function buildAcknowledgement(brief: BusinessBrief, previous: BusinessBrief): string {
  const gainedScalar = (prev: string, next: string) => !prev?.trim() && !!next?.trim();
  const gainedList = (prev: unknown[], next: unknown[]) =>
    (prev?.length ?? 0) === 0 && (next?.length ?? 0) > 0;

  const gained: string[] = [];

  if (gainedScalar(previous.businessName, brief.businessName)) gained.push(brief.businessName.trim());

  const scalarChecks: [BusinessBriefFieldId, string, string][] = [
    ["industry", previous.industry, brief.industry],
    ["location", previous.location, brief.location],
    ["businessDescription", previous.businessDescription, brief.businessDescription],
    ["offerSummary", previous.offerSummary, brief.offerSummary],
    ["audience", previous.audience, brief.audience],
    ["tone", previous.tone, brief.tone],
    ["story", previous.story, brief.story],
  ];
  for (const [field, prev, next] of scalarChecks) {
    if (gainedScalar(prev, next) && ACK_LABELS[field]) gained.push(ACK_LABELS[field]!);
  }

  const listChecks: [BusinessBriefFieldId, unknown[], unknown[]][] = [
    ["services", previous.services, brief.services],
    ["differentiators", previous.differentiators, brief.differentiators],
    ["websiteGoals", previous.websiteGoals, brief.websiteGoals],
    ["styleDirection", previous.styleDirection, brief.styleDirection],
    ["brandColors", previous.brandColors, brief.brandColors],
    ["pages", previous.pages, brief.pages],
  ];
  for (const [field, prev, next] of listChecks) {
    if (gainedList(prev, next) && ACK_LABELS[field]) gained.push(ACK_LABELS[field]!);
  }

  if (previous.assets.logo.status !== brief.assets.logo.status) {
    if (brief.assets.logo.status === "missing") gained.push("the logo status");
    if (brief.assets.logo.status === "uploaded" || brief.assets.logo.status === "url") gained.push("the logo");
  }

  const top = gained.slice(0, 2);
  if (!top.length) return "Got it.";
  if (top.length === 1) return `I’ve got ${top[0]}.`;
  return `I’ve got ${top[0]} and ${top[1]}.`;
}

function buildSummary(brief: BusinessBrief): string {
  const lines = [
    brief.businessName || "Unnamed business",
    brief.industry || "Industry not confirmed",
    brief.offerSummary || brief.businessDescription || "Offer still being clarified",
  ];
  return lines.filter(Boolean).join(" · ");
}

// Reset a declined field so a stray "no" can never leak into the brief content
// (e.g. story = "no") and get surfaced on the generated site.
function clearDeclinedField(brief: BusinessBrief, field: BusinessBriefFieldId): BusinessBrief {
  switch (field) {
    case "story":
      return mergeBusinessBrief(brief, { story: "" });
    case "testimonials":
      return mergeBusinessBrief(brief, { testimonials: [] });
    case "socialProof":
      return mergeBusinessBrief(brief, { socialProof: [] });
    case "brandColors":
      return mergeBusinessBrief(brief, { brandColors: [] });
    case "styleDirection":
      return mergeBusinessBrief(brief, { styleDirection: [] });
    case "logo":
      return mergeBusinessBrief(brief, {
        assets: { ...brief.assets, logo: { ...brief.assets.logo, status: "missing" } },
      });
    default:
      return brief;
  }
}

// When the interview has nothing concrete left to ask, fill any still-missing
// REQUIRED fields with sensible, context-derived defaults so the user is never
// trapped and can always generate. Only fills empties; never overrides answers.
function inferMissingRequiredFields(brief: BusinessBrief): BusinessBrief {
  const missing = new Set(getMissingFields(brief));
  const name = brief.businessName.trim() || "the business";
  const industry = brief.industry.trim() || "business";
  const patch: Partial<BusinessBrief> = {};

  if (missing.has("businessDescription")) {
    patch.businessDescription = `${name} is a ${industry} focused on quality, trust, and a great customer experience.`;
  }
  if (missing.has("offerSummary")) {
    patch.offerSummary = brief.services.length
      ? brief.services.join(", ")
      : `${industry} products and services customers can rely on.`;
  }
  if (missing.has("audience")) {
    patch.audience = `Customers looking for a ${industry} they can trust.`;
  }
  if (missing.has("websiteGoals")) {
    patch.websiteGoals = ["Build trust and drive inquiries"];
  }
  if (missing.has("styleDirection")) {
    patch.styleDirection = brief.tone.trim()
      ? [brief.tone.trim(), "modern", "clean"]
      : ["modern", "clean", "premium"];
  }
  if (missing.has("pages")) {
    patch.pages = ["Home", "About", "Services", "Contact"];
  }

  let next = mergeBusinessBrief(brief, patch);
  if (getMissingFields(next).includes("logo") && next.assets.logo.status === "unknown") {
    next = mergeBusinessBrief(next, {
      assets: { ...next.assets, logo: { ...next.assets.logo, status: "missing" } },
    });
  }
  return next;
}

// Apply a research/inference patch to a brief, but only where the brief is still
// empty — real user answers always win.
function seedEmptyFields(brief: BusinessBrief, patch: Partial<BusinessBrief>): BusinessBrief {
  const apply: Partial<BusinessBrief> = {};
  const emptyStr = (s: string) => !s || !s.trim();
  if (patch.industry && emptyStr(brief.industry)) apply.industry = patch.industry;
  if (patch.businessDescription && emptyStr(brief.businessDescription)) apply.businessDescription = patch.businessDescription;
  if (patch.offerSummary && emptyStr(brief.offerSummary)) apply.offerSummary = patch.offerSummary;
  if (patch.audience && emptyStr(brief.audience)) apply.audience = patch.audience;
  if (patch.tone && emptyStr(brief.tone)) apply.tone = patch.tone;
  if (patch.differentiators?.length && brief.differentiators.length === 0) apply.differentiators = patch.differentiators;
  if (patch.pages?.length && brief.pages.length === 0) apply.pages = patch.pages;
  if (patch.socialProof?.length && brief.socialProof.length === 0) apply.socialProof = patch.socialProof;
  return mergeBusinessBrief(brief, apply);
}

export async function runWizardEngine(
  messages: BriefChatMessage[],
  currentBrief: Partial<SiteBrief>,
  options?: { skipResearch?: boolean }
): Promise<BriefInterviewResult> {
  const previousBusinessBrief = siteBriefToBusinessBrief(currentBrief);
  let nextBusinessBrief = previousBusinessBrief;

  // Detect user intent from the last message before any LLM extraction
  const lastUserMessage = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const wantsToGenerate = detectGenerateIntent(lastUserMessage);

  // Identify the field/question the user is currently answering so extraction can
  // map even a short reply to the right field instead of re-asking the same thing.
  const previousStage = inferStage(previousBusinessBrief);
  const previousMissing = getMissingFields(previousBusinessBrief);
  const pendingField = chooseMissingField(previousBusinessBrief, previousMissing, STAGE_FIELDS[previousStage]);
  const pendingQuestion = pendingField ? buildQuestionForField(pendingField, previousBusinessBrief) : "";

  // Detect if the user declined the field being asked (e.g. "nope" to testimonials question)
  const declinedField = detectDeclinedField(lastUserMessage, previousBusinessBrief, pendingField);
  const existingDeclined = previousBusinessBrief.intelligence.declinedFields ?? [];
  let nextDeclinedFields: BusinessBriefFieldId[] = declinedField
    ? existingDeclined.includes(declinedField)
      ? existingDeclined
      : [...existingDeclined, declinedField]
    : existingDeclined;

  // Patch declined fields into the brief BEFORE extraction so chooseMissingField skips them
  if (declinedField) {
    nextBusinessBrief = mergeBusinessBrief(previousBusinessBrief, {
      intelligence: { ...previousBusinessBrief.intelligence, declinedFields: nextDeclinedFields },
    });
  }

  // Skip LLM extraction if the brief is already complete and user just wants to generate
  const skipExtraction = wantsToGenerate && shouldAllowGeneration(nextBusinessBrief);

  if (!skipExtraction) {
    try {
      const extracted = await jsonCompletion<Partial<BusinessBrief>>(
        buildWizardExtractionSystemPrompt(),
        buildWizardExtractionUserPrompt(
          messages,
          nextBusinessBrief,
          pendingField ? { field: pendingField, question: pendingQuestion } : null
        ),
        2,
        4_500
      );
      // Merge extracted data but preserve our declined fields
      nextBusinessBrief = mergeBusinessBrief(nextBusinessBrief, {
        ...extracted,
        intelligence: {
          ...(extracted.intelligence ?? nextBusinessBrief.intelligence),
          declinedFields: nextDeclinedFields,
        },
      });
    } catch {
      // Keep the brief with declined fields applied
    }
  }

  // If the user declined the asked field, ensure no stray value leaked into it.
  if (declinedField) {
    nextBusinessBrief = clearDeclinedField(nextBusinessBrief, declinedField);
  }

  // Deterministic safety net: if the field we just asked is STILL empty after
  // extraction and the user gave a real (non-negative) answer, capture it directly
  // so the interview always advances instead of re-asking the same question.
  if (
    pendingField &&
    !wantsToGenerate &&
    !nextDeclinedFields.includes(pendingField) &&
    getMissingFields(nextBusinessBrief).includes(pendingField) &&
    lastUserMessage.trim().length > 0 &&
    !NEGATIVE_RESPONSE_RE.test(lastUserMessage.trim()) &&
    // Don't hijack a URL (e.g. a pasted logo link) into a text field…
    !/https?:\/\//i.test(lastUserMessage) &&
    // …and only force-capture when extraction understood nothing this turn,
    // so messages the LLM already routed elsewhere aren't double-handled.
    !briefContentChanged(previousBusinessBrief, nextBusinessBrief)
  ) {
    nextBusinessBrief = applyRawAnswerToField(nextBusinessBrief, pendingField, lastUserMessage);
    // If the raw answer still can't satisfy the field's requirement (e.g. too
    // short for the threshold), mark it handled so we move on rather than loop.
    if (getMissingFields(nextBusinessBrief).includes(pendingField)) {
      nextDeclinedFields = nextDeclinedFields.includes(pendingField)
        ? nextDeclinedFields
        : [...nextDeclinedFields, pendingField];
    }
  }

  // Auto-research: the first time we learn the business name, look it up and
  // pre-fill any empty fields so the user barely has to answer anything.
  let researchNote = "";
  const nameJustLearned =
    !previousBusinessBrief.businessName.trim() && nextBusinessBrief.businessName.trim().length > 1;
  if (nameJustLearned && !wantsToGenerate && !options?.skipResearch) {
    const research = await researchBusinessIdentity({
      name: nextBusinessBrief.businessName,
      industryHint: nextBusinessBrief.industry || undefined,
      location: nextBusinessBrief.location || undefined,
      logoUrl:
        nextBusinessBrief.assets.logo.sourceUrl ||
        nextBusinessBrief.assets.logo.fileUrl ||
        undefined,
    });
    if (research) {
      nextBusinessBrief = seedEmptyFields(nextBusinessBrief, researchToBriefPatch(research));
      if (research.notes?.trim()) {
        researchNote = `${research.notes.trim()} I’ve pre-filled the brief from a quick look — tell me if anything’s off.`;
      }
    }
  }

  let knownFields = getKnownFields(nextBusinessBrief);
  let missingFields = getMissingFields(nextBusinessBrief);
  let stage = inferStage(nextBusinessBrief);
  let isComplete = shouldAllowGeneration(nextBusinessBrief);
  const wasComplete = shouldAllowGeneration(previousBusinessBrief);

  // If there is nothing concrete left to ask (everything answered or declined),
  // infer sensible defaults for any missing required fields so the user can always
  // finish instead of looping on "anything else?".
  const nothingLeftToAsk =
    chooseMissingField(nextBusinessBrief, missingFields, STAGE_FIELDS[stage]) === null;
  let concluded = false;
  if (nothingLeftToAsk && !isComplete) {
    nextBusinessBrief = inferMissingRequiredFields(nextBusinessBrief);
    knownFields = getKnownFields(nextBusinessBrief);
    missingFields = getMissingFields(nextBusinessBrief);
    stage = inferStage(nextBusinessBrief);
    isComplete = shouldAllowGeneration(nextBusinessBrief);
    concluded = true;
  }

  const readinessScore = getReadinessScore(nextBusinessBrief);

  nextBusinessBrief = mergeBusinessBrief(nextBusinessBrief, {
    intelligence: {
      stage,
      knownFields,
      missingFields,
      declinedFields: nextDeclinedFields,
      readinessScore,
      recommendedNextPrompt: buildStageQuestion(nextBusinessBrief, stage, missingFields),
      lastUpdatedAt: new Date().toISOString(),
    },
  });

  const partialBrief = businessBriefToPartialSiteBrief(nextBusinessBrief, currentBrief);
  const acknowledgement = researchNote
    ? researchNote
    : declinedField
    ? "No problem — we’ll skip that."
    : buildAcknowledgement(nextBusinessBrief, previousBusinessBrief);
  const businessName = nextBusinessBrief.businessName.trim() || "your site";

  // If the brief is ready AND the user explicitly said "go ahead", signal the client to generate
  if (isComplete && wantsToGenerate) {
    return {
      reply: "__GENERATE__",
      summary: `${buildSummary(nextBusinessBrief)}. Ready for generation.`,
      stage,
      businessBrief: nextBusinessBrief,
      partialBrief,
      missingFields,
      readinessScore,
      isComplete: true,
    };
  }

  let reply: string;
  if (isComplete && (concluded || nothingLeftToAsk)) {
    // Nothing left to gather — wrap up confidently and offer to generate.
    reply = wasComplete
      ? `${acknowledgement} You’re all set — say “generate” or hit Generate whenever you’re ready.`
      : `${acknowledgement} I’ve got everything I need to build a strong first version of ${businessName}, and filled in sensible defaults for anything we skipped. Want me to generate it now, or is there something specific to add first?`;
  } else if (isComplete) {
    reply = `${acknowledgement} I have everything I need. Ready to generate whenever you are.`;
  } else {
    reply = `${acknowledgement} ${buildStageQuestion(nextBusinessBrief, stage, missingFields)}`.trim();
  }

  return {
    reply,
    summary: isComplete
      ? `${buildSummary(nextBusinessBrief)}. Ready for generation.`
      : `${buildSummary(nextBusinessBrief)}. ${summarizeCompletion(nextBusinessBrief)}`,
    stage,
    businessBrief: nextBusinessBrief,
    partialBrief,
    missingFields,
    readinessScore,
    isComplete,
  };
}
