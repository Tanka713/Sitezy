import type { BlueprintPage, SiteBlueprint, SiteBrief } from "@/types";

export interface CreativeDirection {
  conceptName: string;
  brandCore: string;
  visualSignature: string;
  experiencePrinciples: string[];
  memorableMoments: string[];
  antiGenericRules: string[];
  colorStory: string;
  typographyStory: string;
  motionStory: string;
}

export interface SectionRefreshPlan {
  purpose: string;
  layoutIdea: string;
  visualHook: string;
  interactionHint: string;
  contentMoves: string[];
  keep: string[];
  avoid: string[];
}

export interface BlockPlan {
  purpose: string;
  layoutIdea: string;
  visualHook: string;
  interactionHint: string;
  contentMoves: string[];
}

interface IndustryProfile {
  key: string;
  label: string;
  keywords: RegExp;
  homepageSections: string[];
  promptHints: string[];
}

const INDUSTRY_PROFILES: IndustryProfile[] = [
  {
    key: "restaurant",
    label: "Restaurant / hospitality",
    keywords: /restaurant|cafe|coffee|bistro|dining|menu|chef|bakery|bar|food/i,
    homepageSections: ["menu", "gallery", "reservation"],
    promptHints: [
      "Prioritize appetite, ambiance, signature items, hours, reservations, and social proof instead of generic feature cards.",
      "Copy should sound like a host or chef speaking about experience, ingredients, service, and atmosphere.",
    ],
  },
  {
    key: "saas",
    label: "SaaS / software",
    keywords: /saas|software|app|platform|ai|analytics|automation|dashboard|workflow|api/i,
    homepageSections: ["products", "integrations", "pricing"],
    promptHints: [
      "Show the product doing something concrete. Avoid vague innovation language and empty dashboard mockup clichés.",
      "Use proof points, workflow storytelling, integrations, outcomes, and pricing clarity before generic testimonials.",
    ],
  },
  {
    key: "commerce",
    label: "Retail / ecommerce",
    keywords: /shop|store|e-?commerce|retail|product|collection|fashion|beauty|jewelry/i,
    homepageSections: ["products", "gallery", "testimonial"],
    promptHints: [
      "Merchandising matters: hero product stories, collections, tactile detail, pricing cues, and reasons to trust the brand.",
      "The layout should feel curated, not like a template storefront with repeated product cards.",
    ],
  },
  {
    key: "agency",
    label: "Agency / consulting / services",
    keywords: /agency|consult|studio|service|marketing|branding|strategy|design|development/i,
    homepageSections: ["services", "case-studies", "process"],
    promptHints: [
      "Lead with point of view, capabilities, proof of work, and a distinct operating style instead of generic features.",
      "Case studies, process, team, and credibility should feel more important than stock hero copy.",
    ],
  },
  {
    key: "portfolio",
    label: "Portfolio / personal brand",
    keywords: /portfolio|personal brand|speaker|creator|freelance|artist|photograph|writer|designer/i,
    homepageSections: ["portfolio", "about", "testimonial"],
    promptHints: [
      "The home page should feel authored. Let voice, work samples, philosophy, and personal proof replace generic marketing sections.",
      "Use editorial pacing, narrative section names, and direct first-person or founder-led copy where appropriate.",
    ],
  },
  {
    key: "local",
    label: "Local business",
    keywords: /clinic|salon|spa|gym|fitness|dentist|real estate|law|accounting|local business|service area/i,
    homepageSections: ["services", "credentials", "contact"],
    promptHints: [
      "Trust signals, locality, booking/contact details, credentials, and service specifics should outrank abstract brand language.",
      "Use reassuring, concrete copy tied to location, process, and outcomes.",
    ],
  },
];

const PAGE_NAME_SECTION_RULES: Array<{ test: RegExp; required: string[] }> = [
  { test: /menu/i, required: ["menu"] },
  { test: /pricing/i, required: ["pricing"] },
  { test: /portfolio|work|projects/i, required: ["portfolio"] },
  { test: /case\s*stud/i, required: ["case-studies"] },
  { test: /blog|journal|news/i, required: ["blog"] },
  { test: /team|people/i, required: ["team"] },
  { test: /contact|book|reservation|visit/i, required: ["contact"] },
  { test: /services|capabilities/i, required: ["services"] },
  { test: /products|shop|collection/i, required: ["products"] },
];

const GENERIC_SECTIONS = new Set([
  "hero",
  "features",
  "stats",
  "logos",
  "testimonial",
  "cta",
  "about",
  "faq",
  "contact",
  "footer",
  "team",
  "pricing",
  "gallery",
]);

function toSentence(value: unknown, fallback: string): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function normalizeList(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<string>();
  const items: string[] = [];
  value.forEach((entry) => {
    const next = String(entry ?? "").replace(/\s+/g, " ").trim();
    if (!next) return;
    const key = next.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push(next);
  });
  return items.length > 0 ? items : fallback;
}

function normalizeSectionType(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanMultiline(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((entry) => entry.replace(/^[\s*-]+/, "").trim())
    .filter(Boolean);
}

function formatList(title: string, entries: string[]): string {
  if (entries.length === 0) return `${title}: none provided`;
  return `${title}:\n${entries.map((entry) => `- ${entry}`).join("\n")}`;
}

function detectIndustryProfile(brief: SiteBrief): IndustryProfile | null {
  const haystack = [brief.siteType, brief.description, brief.features, brief.targetAudience, brief.smartBrief?.offeringsText]
    .filter(Boolean)
    .join(" ");

  return INDUSTRY_PROFILES.find((profile) => profile.keywords.test(haystack)) ?? null;
}

export function buildBusinessContextBlock(brief: SiteBrief): string {
  const offerings = (
    brief.businessBrief?.services.length
      ? brief.businessBrief.services
      : cleanMultiline(brief.smartBrief?.offeringsText)
  ).slice(0, 10);
  const contactDetails = brief.businessBrief?.contactInfo ?? brief.smartBrief?.contactDetails;
  const contactLines = [
    contactDetails?.phone ? `Phone: ${contactDetails.phone}` : "",
    contactDetails?.email ? `Email: ${contactDetails.email}` : "",
    contactDetails?.address ? `Address: ${contactDetails.address}` : "",
    contactDetails?.hours ? `Hours: ${contactDetails.hours}` : "",
  ].filter(Boolean);

  return [
    `Site name: ${brief.businessBrief?.businessName || brief.siteName}`,
    `Business summary: ${brief.businessBrief?.businessDescription || brief.description}`,
    `Business type: ${brief.businessBrief?.industry || brief.siteType || "not specified"}`,
    `Tone: ${brief.businessBrief?.tone || brief.tone || "not specified"}`,
    `Target audience: ${brief.businessBrief?.audience || brief.targetAudience || "not specified"}`,
    `Competitors / references: ${brief.competitors || "none provided"}`,
    `Special features: ${brief.features || brief.businessBrief?.differentiators.join(", ") || "none provided"}`,
    `Requested pages: ${brief.businessBrief?.pages.join(", ") || brief.pages.join(", ") || "none provided"}`,
    `Image style: ${brief.imageStyle || "photos"}`,
    `Color preference: ${brief.colorPreference || "none provided"}`,
    brief.colorPalette && brief.colorPalette.length > 0
      ? `Color palette: ${brief.colorPalette.join(", ")}`
      : "Color palette: AI-selected",
    brief.currency ? `Currency: ${brief.currency}` : "",
    (brief.businessBrief?.styleDirection.length || brief.smartBrief?.stylePreference)
      ? `User style preference: ${
          brief.businessBrief?.styleDirection.join(", ") || brief.smartBrief?.stylePreference
        }`
      : "",
    brief.businessBrief?.assets.logo.status
      ? `Logo status: ${brief.businessBrief.assets.logo.status}`
      : "",
    formatList("Offerings / menu / products", offerings),
    formatList("Contact details", contactLines),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildIndustryPromptHints(brief: SiteBrief): string {
  const profile = detectIndustryProfile(brief);
  if (!profile) {
    return [
      "Use the business context to determine the real conversion path and content hierarchy.",
      "Avoid default startup sections unless the business genuinely needs them.",
    ].join("\n");
  }

  return [
    `Industry lens: ${profile.label}`,
    ...profile.promptHints.map((hint) => `- ${hint}`),
    `- Home page should strongly consider these sections when relevant: ${profile.homepageSections.join(", ")}`,
  ].join("\n");
}

export function normalizeCreativeDirection(input: Partial<CreativeDirection> | null | undefined): CreativeDirection {
  return {
    conceptName: toSentence(input?.conceptName, "Distinct brand direction"),
    brandCore: toSentence(input?.brandCore, "The brand should feel specific, confident, and rooted in the business reality."),
    visualSignature: toSentence(input?.visualSignature, "Give the site one instantly memorable visual move that shapes the whole experience."),
    experiencePrinciples: normalizeList(input?.experiencePrinciples, [
      "Create a strong first impression within the hero and navbar.",
      "Make each section feel intentionally different, not repeated cards with new copy.",
      "Ground every section in believable business-specific content.",
    ]),
    memorableMoments: normalizeList(input?.memorableMoments, [
      "A hero composition with a clear visual thesis.",
      "At least one asymmetrical or surprising layout shift.",
      "A CTA moment that feels integrated into the story instead of bolted on.",
    ]),
    antiGenericRules: normalizeList(input?.antiGenericRules, [
      "Avoid interchangeable startup copy.",
      "Avoid repeating the same card layout three times in a row.",
      "Avoid safe purple/blue gradient tropes unless the brief explicitly asks for them.",
    ]),
    colorStory: toSentence(input?.colorStory, "Color should create hierarchy and mood, not just decorate the page."),
    typographyStory: toSentence(input?.typographyStory, "Typography should establish personality before imagery does."),
    motionStory: toSentence(input?.motionStory, "Motion should support pacing with a few meaningful moments rather than constant micro-effects."),
  };
}

export function formatCreativeDirection(direction: CreativeDirection): string {
  return [
    `Creative concept: ${direction.conceptName}`,
    `Brand core: ${direction.brandCore}`,
    `Visual signature: ${direction.visualSignature}`,
    `Color story: ${direction.colorStory}`,
    `Typography story: ${direction.typographyStory}`,
    `Motion story: ${direction.motionStory}`,
    formatList("Experience principles", direction.experiencePrinciples),
    formatList("Memorable moments", direction.memorableMoments),
    formatList("Anti-generic rules", direction.antiGenericRules),
  ].join("\n");
}

export function buildSectionRefreshSystemPrompt(): string {
  return [
    "You are a creative director refreshing one section in an existing website.",
    "Return JSON only.",
    "Keep the section compatible with the surrounding page, but make it feel more specific, premium, and intentional.",
  ].join("\n");
}

export function buildSectionRefreshUserPrompt(
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
): string {
  return `Refresh the "${section.name}" section on the "${page.name}" page.

${buildBusinessContextBlock(brief)}

Design direction:
- Brand personality: ${blueprint.brandPersonality}
- Layout style: ${blueprint.layoutStyle}
- Design direction: ${blueprint.designDirection}

Section type: ${section.type}
Section name: ${section.name}
Page purpose: ${page.purpose}
Previous section: ${section.previousSectionName || "none"}
Next section: ${section.nextSectionName || "none"}

Current section HTML:
${section.html.slice(0, 5000)}
${section.html.length > 5000 ? "\n<!-- current section truncated -->" : ""}

${buildIndustryPromptHints(brief)}
${instruction ? `Additional direction: ${instruction}` : ""}

Return JSON:
{
  "purpose": "refined section goal",
  "layoutIdea": "specific composition",
  "visualHook": "memorable visual move",
  "interactionHint": "motion / hover cue",
  "contentMoves": ["content move 1", "content move 2"],
  "keep": ["detail to preserve 1", "detail to preserve 2"],
  "avoid": ["generic move 1", "generic move 2"]
}`;
}

export function normalizeSectionRefreshPlan(input: Partial<SectionRefreshPlan> | null | undefined): SectionRefreshPlan {
  return {
    purpose: toSentence(input?.purpose, "Sharpen the section so it feels intentional and specific."),
    layoutIdea: toSentence(input?.layoutIdea, "Introduce a clearer composition and stronger hierarchy."),
    visualHook: toSentence(input?.visualHook, "Add one memorable visual move."),
    interactionHint: toSentence(input?.interactionHint, "Use restrained interaction cues that fit the page."),
    contentMoves: normalizeList(input?.contentMoves, ["Replace vague marketing copy with specific content."]),
    keep: normalizeList(input?.keep, ["Preserve the surrounding design language."]),
    avoid: normalizeList(input?.avoid, ["Avoid generic cards and interchangeable copy."]),
  };
}

export function formatSectionRefreshPlan(plan: SectionRefreshPlan): string {
  return [
    `Refined purpose: ${plan.purpose}`,
    `Layout idea: ${plan.layoutIdea}`,
    `Visual hook: ${plan.visualHook}`,
    `Interaction hint: ${plan.interactionHint}`,
    formatList("Content moves", plan.contentMoves),
    formatList("Keep", plan.keep),
    formatList("Avoid", plan.avoid),
  ].join("\n");
}

export function buildBlockPlanSystemPrompt(): string {
  return [
    "You are planning a new block for an existing website page.",
    "Return JSON only.",
    "The block must feel consistent with the site, but it should still contribute a fresh visual rhythm or content angle.",
  ].join("\n");
}

export function buildBlockPlanUserPrompt(
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
): string {
  return `Plan a new "${block.label}" block for the "${page.name}" page.

${buildBusinessContextBlock(brief)}

Design direction:
- Brand personality: ${blueprint.brandPersonality}
- Layout style: ${blueprint.layoutStyle}
- Design direction: ${blueprint.designDirection}

Block type: ${block.type}
Placement: ${block.placement}
Page purpose: ${page.purpose}
Existing sections: ${context.existingSections.join(", ") || "none"}
Previous section: ${context.previousSectionName || "none"}
Next section: ${context.nextSectionName || "none"}
Selected section: ${context.selectedSectionName || "none"}
Selected node label: ${context.selectedNodeLabel || "none"}

${buildIndustryPromptHints(brief)}

Return JSON:
{
  "purpose": "what this block should accomplish",
  "layoutIdea": "specific composition",
  "visualHook": "what makes it feel designed",
  "interactionHint": "motion / hover cue",
  "contentMoves": ["content move 1", "content move 2"]
}`;
}

export function normalizeBlockPlan(input: Partial<BlockPlan> | null | undefined): BlockPlan {
  return {
    purpose: toSentence(input?.purpose, "Add meaningful content without breaking the page rhythm."),
    layoutIdea: toSentence(input?.layoutIdea, "Use a composition that adds contrast to nearby sections."),
    visualHook: toSentence(input?.visualHook, "Give the block a specific visual identity."),
    interactionHint: toSentence(input?.interactionHint, "Use subtle, purposeful interaction cues."),
    contentMoves: normalizeList(input?.contentMoves, ["Use business-specific content instead of generic placeholders."]),
  };
}

export function formatBlockPlan(plan: BlockPlan): string {
  return [
    `Purpose: ${plan.purpose}`,
    `Layout idea: ${plan.layoutIdea}`,
    `Visual hook: ${plan.visualHook}`,
    `Interaction hint: ${plan.interactionHint}`,
    formatList("Content moves", plan.contentMoves),
  ].join("\n");
}

export function shouldForceHomepageDiversification(page: BlueprintPage, brief: SiteBrief): boolean {
  const isHome = /^(home|index)$/i.test(page.slug) || /home/i.test(page.name);
  if (!isHome) return false;
  const profile = detectIndustryProfile(brief);
  if (!profile) return false;
  return !page.sections.some((section) => profile.homepageSections.includes(normalizeSectionType(section)));
}

export function enrichBlueprintPageSections(page: BlueprintPage, brief: SiteBrief): string[] {
  const normalized = normalizeList(page.sections).map(normalizeSectionType);
  const sections = normalized.length > 0 ? [...normalized] : ["hero", "about", "contact"];
  const deduped: string[] = [];
  sections.forEach((section) => {
    if (!section) return;
    if (!deduped.includes(section)) deduped.push(section);
  });

  PAGE_NAME_SECTION_RULES.forEach((rule) => {
    if (rule.test.test(page.name) || rule.test.test(page.slug)) {
      rule.required.forEach((required) => {
        if (!deduped.includes(required)) {
          const heroIndex = deduped.indexOf("hero");
          const insertionIndex = heroIndex >= 0 ? heroIndex + 1 : 0;
          deduped.splice(Math.min(insertionIndex, deduped.length), 0, required);
        }
      });
    }
  });

  if (shouldForceHomepageDiversification(page, brief)) {
    const profile = detectIndustryProfile(brief);
    profile?.homepageSections.forEach((section) => {
      if (deduped.includes(section)) return;
      const replaceIndex = deduped.findIndex((entry) => GENERIC_SECTIONS.has(entry) && entry !== "hero" && entry !== "contact" && entry !== "footer");
      if (replaceIndex >= 0) {
        deduped.splice(replaceIndex, 1, section);
      } else if (deduped.length < 7) {
        deduped.splice(Math.min(1, deduped.length), 0, section);
      }
    });
  }

  return deduped.slice(0, 8);
}
