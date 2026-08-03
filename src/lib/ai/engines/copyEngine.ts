import type { BusinessBrief, CopyPagePlan, CopyPlan, CopySectionPlan, DesignPlan, StrategyPlan } from "@/lib/ai/types";
import { jsonCompletion } from "@/lib/ai/runtime";
import { buildCopySystemPrompt, buildCopyUserPrompt } from "@/lib/ai/prompts/copy";
import {
  buildPageKeyMoments,
  buildPageNarrativeSummary,
  buildSectionName,
  buildSectionNarrativeNote,
  getIndustryCopyRules,
  inferIndustryKey,
} from "@/lib/ai/utils/sectionRules";
import { cleanList, dedupeStrings, slugifyText, toSentence } from "@/lib/ai/utils/normalize";

const GENERIC_MARKETING_PATTERNS = [
  /\binnovative solutions?\b/i,
  /\bcutting-edge\b/i,
  /\bworld-class\b/i,
  /\bunlock\b/i,
  /\bseamless\b/i,
  /\bredefine\b/i,
  /\belevate\b/i,
  /\btailored solutions?\b/i,
  /\btrusted partner\b/i,
  /\bexceptional\b/i,
  /\bpassionate about\b/i,
  /\bnext-level\b/i,
  /\btransform your\b/i,
  /\bempower\b/i,
  /\bjourney\b/i,
];

function countGenericTriggers(value: string): number {
  return GENERIC_MARKETING_PATTERNS.reduce((count, pattern) => count + (pattern.test(value) ? 1 : 0), 0);
}

function looksLikeAiFiller(value: string, kind: "headline" | "subheadline" | "body" | "cta" = "body"): boolean {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return true;
  const triggers = countGenericTriggers(text);
  if (triggers >= 1) return true;
  if (kind === "headline" && /^(discover|experience|welcome to|elevate|unlock)/i.test(text)) return true;
  if (kind === "cta" && /^(learn more|discover more|get started today|contact us today)$/i.test(text)) return true;
  if (/we help (businesses|brands|clients|people) /i.test(text)) return true;
  if (/for all your .* needs/i.test(text)) return true;
  return false;
}

function preferSpecificCopy(
  candidate: string,
  fallback: string,
  kind: "headline" | "subheadline" | "body" | "cta"
): string {
  const cleaned = toSentence(candidate, fallback);
  if (!cleaned) return fallback;
  return looksLikeAiFiller(cleaned, kind) ? fallback : cleaned;
}

function normalizeSpecificList(candidate: unknown, fallback: string[], limit: number): string[] {
  const next = cleanList(candidate, limit)
    .filter((entry) => !looksLikeAiFiller(entry, "body"));

  return dedupeStrings([...next, ...fallback], limit);
}

function buildContactLine(brief: BusinessBrief): string {
  const details = [
    brief.contactInfo.phone ? `Call ${brief.contactInfo.phone}` : "",
    brief.contactInfo.email ? `Email ${brief.contactInfo.email}` : "",
    brief.contactInfo.address ? `Visit ${brief.contactInfo.address}` : "",
    brief.contactInfo.hours ? `Hours: ${brief.contactInfo.hours}` : "",
  ].filter(Boolean);

  return details.join(" | ");
}

function ensureSentence(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function lowerFirst(value: string): string {
  const cleaned = value.replace(/[.!?]+$/g, "").trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function buildPrimaryCtaLabel(brief: BusinessBrief, type?: string): string {
  if (brief.contactInfo.cta) return brief.contactInfo.cta;

  const industry = inferIndustryKey(brief);
  const goal = (brief.websiteGoals[0] || "").toLowerCase();

  if (type === "reservation" || industry === "restaurant" || industry === "hospitality") {
    return brief.contactInfo.bookingEnabled ? "Reserve a table" : "Plan your visit";
  }
  if (industry === "automotive") {
    return brief.contactInfo.bookingEnabled ? "Check availability" : "See the fleet";
  }
  if (industry === "saas") {
    return "Book a demo";
  }
  if (industry === "agency") {
    return "Start a project";
  }
  if (industry === "portfolio") {
    return "Start a conversation";
  }
  if (industry === "commerce") {
    return "Shop the collection";
  }
  if (industry === "local") {
    return brief.contactInfo.phone ? "Call now" : "Request a quote";
  }
  if (goal.includes("reserv")) return "Reserve now";
  if (goal.includes("book")) return "Book now";
  if (goal.includes("demo")) return "Book a demo";
  if (goal.includes("sale") || goal.includes("purchase")) return "Start shopping";
  if (goal.includes("lead") || goal.includes("inquir")) return "Get in touch";
  return "Get started";
}

function buildSecondaryCtaLabel(brief: BusinessBrief, type?: string): string {
  const industry = inferIndustryKey(brief);

  if (type === "reservation" || industry === "restaurant") return "View the menu";
  if (industry === "hospitality") return "See the rooms";
  if (industry === "automotive") return "See the fleet";
  if (industry === "saas") return "See the product";
  if (industry === "agency") return "View selected work";
  if (industry === "portfolio") return "View selected work";
  if (industry === "commerce") return "View bestsellers";
  if (industry === "local") return "See services";
  return brief.contactInfo.bookingEnabled ? "See availability" : "See how it works";
}

function buildHeroSubheadline(brief: BusinessBrief): string {
  const industry = inferIndustryKey(brief);
  const location = /remote/i.test(brief.location || "") ? "" : brief.location || brief.contactInfo.address || "";
  const audience = brief.audience ? ensureSentence(`Built for ${lowerFirst(brief.audience)}`) : "";
  const offer = ensureSentence(
    `${brief.offerSummary || brief.businessDescription}${location ? ` in ${location}` : ""}`
  );
  const differentiator = brief.differentiators[0] ? ensureSentence(brief.differentiators[0]) : "";

  switch (industry) {
    case "automotive":
      return dedupeStrings([
        offer,
        audience || ensureSentence("Fast booking and delivery stay close to hand"),
        differentiator,
      ], 2).join(" ");
    case "restaurant":
      return dedupeStrings([
        offer,
        brief.services[0] ? ensureSentence(`Start with ${lowerFirst(brief.services[0])}`) : "",
        brief.contactInfo.bookingEnabled ? ensureSentence("Reservations stay close at hand from the first scroll") : "",
      ], 2).join(" ");
    case "hospitality":
      return dedupeStrings([
        offer,
        audience,
        brief.contactInfo.bookingEnabled ? ensureSentence("Availability and booking details stay visible without breaking the calm pace") : "",
      ], 2).join(" ");
    case "saas":
      return dedupeStrings([
        offer,
        audience,
        differentiator,
      ], 2).join(" ");
    case "agency":
      return dedupeStrings([
        audience,
        ensureSentence(brief.offerSummary || brief.businessDescription),
        differentiator,
      ], 2).join(" ");
    case "portfolio":
      return dedupeStrings([
        ensureSentence(brief.businessDescription || brief.offerSummary),
        audience ? ensureSentence(`Made for ${brief.audience}`) : "",
        differentiator,
      ], 2).join(" ");
    default:
      return dedupeStrings([
        offer,
        audience,
        differentiator,
      ], 2).join(" ");
  }
}

function buildSectionHeadline(
  brief: BusinessBrief,
  pageName: string,
  type: string
): string {
  const businessName = brief.businessName || "the brand";
  const offer = brief.offerSummary || brief.businessDescription || "a clear offer";
  const normalizedOffer = offer.replace(/[.!?]+$/g, "");
  const goal = brief.websiteGoals[0] || brief.contactInfo.cta || "take the next step";
  const location = brief.location || brief.contactInfo.address || "";
  const industry = inferIndustryKey(brief);

  if (type === "hero") {
    switch (industry) {
      case "automotive":
        return `${businessName} puts luxury cars and concierge-level service on the same booking path.`;
      case "restaurant":
        return `${businessName} makes dinner feel worth planning${location ? ` in ${location}` : ""}.`;
      case "hospitality":
        return `${businessName} makes the stay feel memorable before you even arrive${location ? ` in ${location}` : ""}.`;
      case "saas":
        return `${businessName} gives operations teams workflow clarity without the cross-tool sprawl.`;
      case "commerce":
        return `${businessName} gives the collection a clearer first choice and a stronger reason to buy.`;
      case "agency":
        return `${businessName} brings sharper strategy and stronger taste to brands that need both.`;
      case "portfolio":
        return `Selected work and a clear point of view from ${businessName}.`;
      case "local":
        return `${businessName} makes the next step feel straightforward from the first visit.`;
      case "education":
        return `A clearer path to ${lowerFirst(normalizedOffer)}.`;
      case "wellness":
        return `Support for people who want ${lowerFirst(normalizedOffer)} without more overwhelm.`;
      default:
        return `${businessName} makes ${lowerFirst(normalizedOffer)} feel easier to choose.`;
    }
  }

  switch (type) {
    case "about":
      switch (industry) {
        case "automotive":
          return `Why the service feels as considered as the fleet itself.`;
        case "restaurant":
          return `The room, the fire, and the thinking behind the menu.`;
        case "agency":
          return `The point of view behind the work, not just the deliverables.`;
        case "portfolio":
          return `The perspective behind the work on the page.`;
        default:
          return `Why ${businessName} approaches ${offer.toLowerCase()} differently.`;
      }
    case "services":
      switch (industry) {
        case "agency":
          return `Where strategy ends and execution actually begins.`;
        case "local":
          return `What we do, where we do it, and what people call us for first.`;
        case "wellness":
          return `Ways to work together, depending on the support you need.`;
        default:
          return `What we help with and where the experience feels clearly premium.`;
      }
    case "products":
      return industry === "automotive"
        ? "The fleet worth considering first, with service that keeps up."
        : "What to choose first and why it stands out.";
    case "menu":
      return `What to order first and what people come back for.`;
    case "testimonial":
      switch (industry) {
        case "automotive":
          return `Why guests book again instead of shopping around.`;
        case "saas":
          return `What changed after teams put ${businessName} into the workflow.`;
        case "restaurant":
          return `What guests remember after the table is cleared.`;
        default:
          return `What people noticed after choosing ${businessName}.`;
      }
    case "portfolio":
    case "case-studies":
      return `Selected work that shows the standard, not just the output.`;
    case "process":
      return `What the experience looks like from first step to delivery.`;
    case "pricing":
      return `Clear options so people can move without second-guessing.`;
    case "faq":
      return `Answers that remove hesitation before the ${goal.toLowerCase()}.`;
    case "contact":
      return `The fastest way to start the conversation.`;
    case "cta":
      switch (industry) {
        case "restaurant":
          return `Reserve the table while the night still feels open.`;
        case "automotive":
          return `Choose the car and let the rest feel handled.`;
        case "saas":
          return `See the workflow with less friction and more clarity.`;
        default:
          return `Ready to ${goal.toLowerCase()}?`;
      }
    case "reservation":
      return `Reserve your spot without the back-and-forth.`;
    case "credentials":
      return `Why clients feel confident choosing ${businessName}.`;
    case "gallery":
      return `A closer look at the details, atmosphere, and standard.`;
    case "footer":
      return `${businessName}, with everything needed to reach out or come back later.`;
    default:
      return `${buildSectionName(type, `${pageName}-${type}`)} for ${businessName}`;
  }
}

function buildSectionSubheadline(brief: BusinessBrief, type: string): string {
  const proof = brief.socialProof[0] || brief.testimonials[0] || brief.differentiators[0] || "";
  const industry = inferIndustryKey(brief);

  switch (type) {
    case "hero":
      return buildHeroSubheadline(brief);
    case "products":
      return industry === "automotive"
        ? dedupeStrings([
            brief.offerSummary,
            brief.services[0] || "",
            brief.differentiators[0] || "",
          ], 2).join(" ")
        : dedupeStrings([
            brief.offerSummary,
            brief.services[0] || "",
            proof,
          ], 2).join(" ");
    case "services":
    case "menu":
      return dedupeStrings([
        brief.offerSummary,
        brief.services[0] || "",
        proof,
      ], 2).join(" ");
    case "testimonial":
      return proof || brief.offerSummary || brief.businessDescription;
    case "contact":
    case "reservation":
      return buildContactLine(brief) || brief.contactInfo.cta || brief.websiteGoals[0] || brief.offerSummary;
    default:
      return brief.offerSummary || brief.businessDescription;
  }
}

function buildSectionBody(brief: BusinessBrief, pageName: string, type: string): string[] {
  const proofPool = dedupeStrings([
    ...brief.socialProof,
    ...brief.testimonials,
    ...brief.differentiators,
  ], 6);
  const industry = inferIndustryKey(brief);

  switch (type) {
    case "hero":
      return dedupeStrings([
        brief.businessDescription,
        brief.offerSummary,
        brief.differentiators[0] || "",
        proofPool[0] || "",
      ], 3);
    case "products":
      return industry === "automotive"
        ? dedupeStrings([
            buildSectionNarrativeNote(brief, pageName, type),
            brief.services[0] || "",
            brief.services[1] || "",
            proofPool[0] || "",
          ], 3)
        : dedupeStrings([
            buildSectionNarrativeNote(brief, pageName, type),
            brief.offerSummary,
            brief.services[0] || "",
            brief.services[1] || "",
          ], 3);
    case "about":
      return dedupeStrings([
        brief.story,
        brief.businessDescription,
        brief.differentiators[0] || "",
      ], 3);
    case "services":
    case "menu":
      return dedupeStrings([
        buildSectionNarrativeNote(brief, pageName, type),
        brief.offerSummary,
        brief.services[0] || "",
        brief.services[1] || "",
      ], 3);
    case "process":
      return dedupeStrings([
        buildSectionNarrativeNote(brief, pageName, type),
        brief.differentiators[0] || "",
        proofPool[0] || "",
      ], 3);
    case "testimonial":
    case "credentials":
    case "stats":
      return proofPool.slice(0, 3);
    case "contact":
    case "reservation":
    case "cta":
      return dedupeStrings([
        buildSectionNarrativeNote(brief, pageName, type),
        buildContactLine(brief),
        brief.contactInfo.cta || brief.websiteGoals[0] || "",
      ], 3);
    default:
      return dedupeStrings([
        brief.offerSummary,
        brief.differentiators[0] || "",
        brief.story || "",
      ], 3);
  }
}

function buildDefaultSectionCopy(
  brief: BusinessBrief,
  pageId: string,
  pageName: string,
  type: string,
  index: number
): CopySectionPlan {
  const sectionId = `${pageId}-${type}-${index + 1}`;
  const name = buildSectionName(type, sectionId);
  const primaryGoal = brief.websiteGoals[0] || "take the next step";
  const proofItems = dedupeStrings([
    ...brief.testimonials,
    ...brief.socialProof,
    ...brief.differentiators,
  ], 5);

  return {
    sectionId,
    type,
    name,
    eyebrow: type === "hero" ? brief.industry || undefined : undefined,
    headline: buildSectionHeadline(brief, pageName, type),
    subheadline: buildSectionSubheadline(brief, type),
    body: buildSectionBody(brief, pageName, type),
    bullets: dedupeStrings([
      ...brief.services,
      ...brief.differentiators,
    ], 4),
    stats: dedupeStrings([
      ...brief.socialProof,
      ...brief.testimonials,
    ], 3),
    proofItems,
    ctaPrimary: buildPrimaryCtaLabel(brief, type),
    ctaSecondary: buildSecondaryCtaLabel(brief, type),
    mediaNotes: dedupeStrings([
      brief.styleDirection[0] || "",
      brief.brand.mood[0] || "",
      brief.assets.logo.status !== "missing" ? "Respect the supplied logo placement." : "Use text brand treatment.",
      ...getIndustryCopyRules(brief),
    ], 3),
  };
}

function buildFallbackCopyPlan(brief: BusinessBrief, strategy: StrategyPlan): CopyPlan {
  const primaryCta = buildPrimaryCtaLabel(brief);
  return {
    tagline: brief.offerSummary || brief.businessDescription,
    brandPromise: `${brief.businessName} helps ${brief.audience || "customers"} ${brief.offerSummary || brief.businessDescription}`.trim(),
    voiceNotes: dedupeStrings([
      brief.tone,
      ...brief.styleDirection,
      ...brief.brand.mood,
      ...getIndustryCopyRules(brief),
    ], 6),
    primaryCta,
    secondaryCta: buildSecondaryCtaLabel(brief),
    pages: strategy.pagePlans.map((page) => ({
      pageId: page.pageId,
      name: page.name,
      title: page.name === "Home" ? brief.businessName : `${page.name} | ${brief.businessName}`,
      intro: buildPageNarrativeSummary(brief, page.name),
      metaDescription: `${page.name} for ${brief.businessName}. ${buildPageKeyMoments(brief, page.name).join(". ")}`.slice(0, 155),
      sections: page.mustIncludeSectionTypes.map((type, index) =>
        buildDefaultSectionCopy(brief, page.pageId, page.name, type, index)
      ),
    })),
  };
}

function normalizeSection(section: Partial<CopySectionPlan>, fallback: CopySectionPlan): CopySectionPlan {
  return {
    sectionId: toSentence(section.sectionId, fallback.sectionId),
    type: toSentence(section.type, fallback.type),
    name: toSentence(section.name, fallback.name),
    eyebrow: toSentence(section.eyebrow, fallback.eyebrow || ""),
    headline: preferSpecificCopy(toSentence(section.headline, fallback.headline), fallback.headline, "headline"),
    subheadline: preferSpecificCopy(toSentence(section.subheadline, fallback.subheadline), fallback.subheadline, "subheadline"),
    body: normalizeSpecificList(section.body, fallback.body, 4),
    bullets: normalizeSpecificList(section.bullets, fallback.bullets, 5),
    stats: normalizeSpecificList(section.stats, fallback.stats, 4),
    proofItems: normalizeSpecificList(section.proofItems, fallback.proofItems, 5),
    ctaPrimary: preferSpecificCopy(toSentence(section.ctaPrimary, fallback.ctaPrimary || ""), fallback.ctaPrimary || "", "cta"),
    ctaSecondary: preferSpecificCopy(toSentence(section.ctaSecondary, fallback.ctaSecondary || ""), fallback.ctaSecondary || "", "cta"),
    mediaNotes: dedupeStrings([...cleanList(section.mediaNotes), ...fallback.mediaNotes], 4),
  };
}

function normalizeCopyPlan(brief: BusinessBrief, strategy: StrategyPlan, candidate: Partial<CopyPlan> | null): CopyPlan {
  const fallback = buildFallbackCopyPlan(brief, strategy);
  const candidatePages = Array.isArray(candidate?.pages) ? candidate.pages : [];

  return {
    tagline: toSentence(candidate?.tagline, fallback.tagline),
    brandPromise: toSentence(candidate?.brandPromise, fallback.brandPromise),
    voiceNotes: dedupeStrings([...cleanList(candidate?.voiceNotes), ...fallback.voiceNotes], 8),
    primaryCta: toSentence(candidate?.primaryCta, fallback.primaryCta),
    secondaryCta: toSentence(candidate?.secondaryCta, fallback.secondaryCta),
    pages: fallback.pages.map((fallbackPage) => {
      const rawPage = candidatePages.find((entry) =>
        slugifyText(entry.pageId || "") === slugifyText(fallbackPage.pageId) ||
        slugifyText(entry.name || "") === slugifyText(fallbackPage.name)
      );
      const rawSections = Array.isArray(rawPage?.sections) ? rawPage.sections : [];

      return {
        pageId: fallbackPage.pageId,
        name: fallbackPage.name,
        title: toSentence(rawPage?.title, fallbackPage.title),
        intro: toSentence(rawPage?.intro, fallbackPage.intro),
        metaDescription: toSentence(rawPage?.metaDescription, fallbackPage.metaDescription).slice(0, 155),
        sections: fallbackPage.sections.map((fallbackSection) => {
          const rawSection = rawSections.find((entry) =>
            slugifyText(entry.sectionId || "") === slugifyText(fallbackSection.sectionId) ||
            slugifyText(entry.type || "") === slugifyText(fallbackSection.type)
          );
          return normalizeSection(rawSection ?? {}, fallbackSection);
        }),
      };
    }),
  };
}

export async function runCopyEngine(
  brief: BusinessBrief,
  strategy: StrategyPlan,
  design: DesignPlan,
  options?: { skipAI?: boolean }
): Promise<CopyPlan> {
  if (options?.skipAI) return buildFallbackCopyPlan(brief, strategy);

  try {
    const raw = await jsonCompletion<CopyPlan>(
      buildCopySystemPrompt(),
      buildCopyUserPrompt(brief, strategy, design),
      2,
      7_000
    );
    return normalizeCopyPlan(brief, strategy, raw);
  } catch {
    return buildFallbackCopyPlan(brief, strategy);
  }
}
