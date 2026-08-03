import type { SiteBrief } from "@/types";
import type { BusinessBrief } from "@/lib/ai/types";
import {
  cleanList,
  dedupeStrings,
  pickByHash,
  slugifyText,
  summarizeList,
} from "@/lib/ai/utils/normalize";

export type IndustryKey =
  | "automotive"
  | "restaurant"
  | "saas"
  | "commerce"
  | "agency"
  | "portfolio"
  | "local"
  | "hospitality"
  | "education"
  | "wellness"
  | "general";

type SectionBlueprintPreset = {
  variations?: string[];
  compositionModes?: string[];
  spacingProfiles?: string[];
  surfaceStyles?: string[];
  ctaPlacements?: string[];
  contrastWithPrevious?: string[];
  purposes?: string[];
  layoutIdeas?: string[];
  emphases?: string[];
  visualHooks?: string[];
  interactionHints?: string[];
  hierarchy?: string[][];
  contentKeys?: string[][];
  mediaBriefs?: string[];
  premiumDetails?: string[];
};

type IndustryPageRule = {
  test: RegExp;
  sections: string[];
  arc: string;
  keyMoments: string[];
};

type IndustryProfile = {
  label: string;
  keywords: RegExp;
  defaultPages: string[];
  homepageSections: string[];
  trustSignals: string[];
  serviceSection: string;
  designCues: string[];
  hierarchyRules: string[];
  copyRules: string[];
  heroApproaches: string[];
  pageRules: IndustryPageRule[];
  sectionOverrides: Partial<Record<string, SectionBlueprintPreset>>;
};

export interface SectionBlueprintSeed {
  variation: string;
  compositionMode: string;
  spacingProfile: string;
  surfaceStyle: string;
  ctaPlacement: string;
  contrastWithPrevious: string;
  purpose: string;
  layoutIdea: string;
  emphasis: string;
  visualHook: string;
  interactionHint: string;
  hierarchy: string[];
  contentKeys: string[];
  mediaBriefs: string[];
  premiumDetails: string[];
}

const BASE_PAGE_RULES: IndustryPageRule[] = [
  {
    test: /about/i,
    sections: ["navbar", "hero", "about", "stats", "team", "cta", "footer"],
    arc: "Move from introduction into philosophy, operating standards, and the people behind the business before the final invitation.",
    keyMoments: ["clear backstory", "operating philosophy", "proof of standards", "human credibility"],
  },
  {
    test: /service|capabilit|program/i,
    sections: ["navbar", "hero", "services", "process", "pricing", "cta", "footer"],
    arc: "Clarify the offer, unpack how it works, remove pricing hesitation, and make the next step feel obvious.",
    keyMoments: ["offer clarity", "process transparency", "pricing confidence", "decisive CTA"],
  },
  {
    test: /work|portfolio|project|case/i,
    sections: ["navbar", "hero", "portfolio", "case-studies", "testimonial", "cta", "footer"],
    arc: "Lead with the caliber of work, then show selected examples, evidence of results, and a direct path to enquire.",
    keyMoments: ["work preview", "signature projects", "results proof", "contact invite"],
  },
  {
    test: /pricing/i,
    sections: ["navbar", "hero", "pricing", "faq", "cta", "footer"],
    arc: "Explain the model, compare options, answer objections, and end with a conversion-ready CTA.",
    keyMoments: ["pricing model", "package comparison", "risk reduction", "action step"],
  },
  {
    test: /contact|book|reservation|visit/i,
    sections: ["navbar", "hero", "contact", "map", "faq", "footer"],
    arc: "Keep the path short: reassurance first, direct contact details next, then location or availability support.",
    keyMoments: ["contact reassurance", "primary contact method", "location clarity", "final trust cue"],
  },
  {
    test: /menu/i,
    sections: ["navbar", "hero", "menu", "gallery", "reservation", "footer"],
    arc: "Set the appetite, present standout options, reinforce atmosphere, and bring bookings forward.",
    keyMoments: ["signature highlight", "menu categories", "ambience proof", "reservation CTA"],
  },
  {
    test: /shop|product|collection/i,
    sections: ["navbar", "hero", "products", "gallery", "testimonial", "cta", "footer"],
    arc: "Frame the collection, spotlight the best entry points, prove desirability, and guide the purchase decision.",
    keyMoments: ["collection promise", "featured products", "social proof", "buy CTA"],
  },
  {
    test: /blog|journal|news|insight/i,
    sections: ["navbar", "hero", "blog", "cta", "footer"],
    arc: "Open with editorial framing, surface featured stories, and use the CTA to pull visitors into a deeper relationship.",
    keyMoments: ["editorial framing", "featured articles", "voice or expertise", "next-step CTA"],
  },
  {
    test: /faq/i,
    sections: ["navbar", "hero", "faq", "contact", "footer"],
    arc: "Resolve hesitation quickly and keep support or contact details immediately available.",
    keyMoments: ["expectation setting", "objection handling", "support path"],
  },
];

const BASE_SECTION_PRESETS: Record<string, SectionBlueprintPreset> = {
  navbar: {
    variations: ["brand-bar", "floating-pill-nav", "editorial-topline", "proof-led-navbar"],
    purposes: [
      "Orient the visitor quickly while making the brand feel intentional from the first scroll position.",
      "Establish confidence and navigation clarity without looking like a default website header.",
    ],
    layoutIdeas: [
      "Use a tailored header composition with a strong brand anchor and navigation grouped according to the page priorities.",
      "Balance identity, navigation, and a small utility action so the navbar feels considered rather than generic.",
    ],
    emphases: ["brand presence", "navigation clarity", "premium first impression"],
    visualHooks: [
      "A header silhouette or framing detail that previews the page's design language.",
      "A wordmark or logo treatment that feels integrated into the whole composition.",
    ],
    interactionHints: [
      "Keep hover states restrained and crisp so the header feels premium.",
      "Use subtle underline, opacity, or background reveal cues instead of flashy movement.",
    ],
    hierarchy: [
      ["brand mark", "primary nav", "utility CTA"],
      ["wordmark", "page links", "contact or booking action"],
    ],
    contentKeys: [
      ["brand", "navigation", "primary CTA"],
      ["location or contact", "primary nav", "next step"],
    ],
    mediaBriefs: ["Respect the logo or wordmark as a real brand anchor."],
  },
  hero: {
    variations: [
      "immersive-brand-story",
      "split-proof-and-cta",
      "editorial-stacked-copy",
      "media-first-showcase",
      "trust-led-conversion",
      "asymmetric-proof-strip",
    ],
    compositionModes: [
      "asymmetric hero with offset copy and framed media",
      "editorial poster composition with stacked typography",
      "split hero with proof rail and compact action cluster",
      "quiet luxury cover with one dominant image plane",
    ],
    spacingProfiles: [
      "heroic opening with generous top and bottom breathing room",
      "poster-like top section with compressed action cluster and wide outer margins",
      "cinematic opening that gives the hero more vertical space than the sections below",
    ],
    surfaceStyles: [
      "high-contrast opening canvas with one refined material shift",
      "quiet editorial surface with a framed media counterpoint",
      "atmospheric hero with tonal layering instead of noisy decoration",
    ],
    ctaPlacements: [
      "place the primary CTA directly beneath the supporting copy with proof close by",
      "anchor the action cluster in the copy column instead of floating it separately",
      "use one strong hero action and one quieter secondary path only if it clarifies the decision",
    ],
    contrastWithPrevious: [
      "set the page's tone immediately instead of easing in with a generic intro band",
      "treat the hero as the dominant scene, then let the next section feel more structured and grounded",
    ],
    purposes: [
      "Explain the offer, why it matters, and what to do next within the first screen.",
      "Create immediate brand distinction while giving visitors enough clarity to continue confidently.",
    ],
    layoutIdeas: [
      "Build an opening with one dominant message, one strong support layer, and a clear action cluster.",
      "Use a hero composition that balances narrative, proof, and action instead of only large type over a generic background.",
    ],
    emphases: ["headline clarity", "brand atmosphere", "first conversion cue"],
    visualHooks: [
      "One signature framing move that makes the first viewport memorable.",
      "A contrast between editorial copy scale and a proof or media anchor.",
    ],
    interactionHints: [
      "Use entrance motion to stage the headline, proof strip, and CTA in a clear order.",
      "Keep motion concentrated around the most important message cluster.",
    ],
    hierarchy: [
      ["eyebrow", "headline", "supporting copy", "proof strip", "primary CTA"],
      ["brand marker", "headline", "subheadline", "cta row", "supporting metrics"],
    ],
    contentKeys: [
      ["brand promise", "offer summary", "primary CTA", "trust signal"],
      ["audience fit", "differentiator", "social proof", "next step"],
    ],
    mediaBriefs: [
      "Use imagery only if it adds atmosphere or proof, not as filler.",
      "If a logo exists, it can reinforce the opening brand signature.",
    ],
    premiumDetails: [
      "Avoid the default centered headline with two buttons and a generic image on the side.",
      "Make one element unmistakably dominant in the first viewport.",
      "Use a proof strip, metric rail, or service cue only if it sharpens the opening proposition.",
    ],
  },
  about: {
    variations: ["story-with-timeline", "founder-letter", "split-image-narrative", "stat-supported-story"],
    compositionModes: [
      "editorial narrative with a quiet proof rail",
      "founder-letter composition with offset supporting details",
      "image-and-story split with one secondary evidence column",
    ],
    spacingProfiles: [
      "breathing room around a denser story core",
      "chapter-like spacing that slows the page after a stronger opening section",
    ],
    surfaceStyles: [
      "quiet surface with subtle tonal contrast",
      "paper-like editorial canvas with one framed proof module",
    ],
    ctaPlacements: [
      "keep any CTA low-emphasis at the end of the narrative, not in the middle of the story",
      "use a soft handoff toward the next proof or services section instead of a hard sell",
    ],
    contrastWithPrevious: [
      "shift from high-impact messaging into slower narrative pacing",
      "let this section feel more intimate and textural than the section above it",
    ],
    purposes: [
      "Turn the business story into trust, perspective, and emotional context.",
      "Explain why the business exists or how it approaches the work differently.",
    ],
    layoutIdeas: [
      "Contrast narrative copy with one supporting proof rail, timeline, or image-led detail column.",
      "Give the story structure so it feels authored rather than like a long generic paragraph.",
    ],
    emphases: ["beliefs and standards", "backstory", "human credibility"],
    visualHooks: [
      "A narrative layout that feels more editorial than brochure-like.",
      "A timeline, letter, or supporting stat treatment that makes the section feel composed.",
    ],
    interactionHints: [
      "Use small reveal timing between narrative beats rather than heavy animation.",
      "Let the emphasis come from typography scale and pacing before motion.",
    ],
    hierarchy: [
      ["section label", "story headline", "founder or brand narrative", "proof note"],
      ["headline", "body narrative", "supporting stats", "soft CTA"],
    ],
    contentKeys: [
      ["story", "differentiators", "brand mood"],
      ["origin", "approach", "proof"],
    ],
    mediaBriefs: ["If imagery is used, prefer real people, place, or process over generic stock vibes."],
    premiumDetails: [
      "Avoid a wall of centered paragraphs followed by a button.",
      "Let the narrative breathe and give supporting proof its own quieter lane.",
      "Use typography scale changes to create movement through the story.",
    ],
  },
  services: {
    variations: ["editorial-columns", "proof-rail", "zigzag-detail", "bento-offer-grid", "tiered-offer-story"],
    compositionModes: [
      "lead-offer panel with supporting modules",
      "editorial capabilities grid with one dominant anchor",
      "zigzag offer narrative with alternating density",
      "bento-like offer field with one oversized strategic block",
    ],
    spacingProfiles: [
      "measured rhythm with one dense offer cluster and one quieter transition",
      "compact section core with generous outer margins so the offers feel curated",
    ],
    surfaceStyles: [
      "structured contrast surface with framed offer modules",
      "quiet canvas with selective accent surfaces for the strongest offer",
    ],
    ctaPlacements: [
      "place the action after the lead offer or decision summary, not under every card",
      "use one decisive CTA at the end of the section after the value hierarchy is clear",
    ],
    contrastWithPrevious: [
      "be more structured and decision-focused than the section above",
      "move from narrative tone into offer clarity without repeating the same shell",
    ],
    purposes: [
      "Clarify what is offered and why each offer matters without flattening everything into identical cards.",
      "Translate capabilities into decision-ready offer blocks with real value cues.",
    ],
    layoutIdeas: [
      "Use a mixed-width services composition where one core offer leads and supporting offers create rhythm.",
      "Break the offer into distinct tiers, tracks, or clusters rather than a uniform feature grid.",
    ],
    emphases: ["offer clarity", "value hierarchy", "decision support"],
    visualHooks: [
      "One dominant offer panel paired with lighter supporting modules.",
      "A split between high-level offer narrative and concrete deliverable detail.",
    ],
    interactionHints: [
      "Use hover states to clarify hierarchy, not to make every card jump equally.",
      "Let one key offer feel primary while the others stay supportive.",
    ],
    hierarchy: [
      ["section intro", "lead offer", "supporting offers", "proof note", "cta"],
      ["headline", "offer clusters", "deliverables", "decision CTA"],
    ],
    contentKeys: [
      ["services", "outcomes", "process cue", "proof"],
      ["offer summary", "audience fit", "conversion CTA"],
    ],
    mediaBriefs: ["Use images only if they clarify process, environment, or results."],
    premiumDetails: [
      "Avoid equal-size cards when one offer should clearly lead the section.",
      "Let the section help a visitor choose what matters first.",
      "Use contrasting densities so services do not read like a spreadsheet.",
    ],
  },
  menu: {
    variations: ["signature-highlights", "course-by-course", "chef-picks-rail", "menu-editorial-grid"],
    purposes: [
      "Make the menu or offering feel craveable, legible, and easy to act on.",
      "Show signature options with enough curation to help visitors choose quickly.",
    ],
    layoutIdeas: [
      "Mix a signature highlight with organized menu categories so the section feels guided, not dumped.",
      "Present dishes or offerings with editorial pacing and clear category anchors.",
    ],
    emphases: ["signature choices", "category clarity", "booking or ordering cues"],
    visualHooks: [
      "A lead dish or standout category presented with more visual weight than the rest.",
      "Contrast between chef picks and the broader menu list.",
    ],
    interactionHints: [
      "Use restrained hover emphasis for categories or dish rows.",
      "Support scanning first, then detail reveal second.",
    ],
    hierarchy: [
      ["section title", "signature highlight", "categories", "reservation cue"],
      ["headline", "featured picks", "menu groups", "next-step CTA"],
    ],
    contentKeys: [
      ["signature items", "menu categories", "dietary or service detail", "reservation CTA"],
      ["featured dishes", "ordering cues", "atmosphere note"],
    ],
    mediaBriefs: ["Use appetizing imagery with real texture and atmosphere, not generic food collages."],
  },
  products: {
    variations: ["collection-highlight", "stacked-merch-grid", "feature-product-story", "shop-editorial"],
    purposes: [
      "Present products with a clear first-choice path and enough detail to build desire.",
      "Blend merchandising and trust so the section feels curated instead of purely transactional.",
    ],
    layoutIdeas: [
      "Lead with a flagship product or collection, then support it with a smaller product field.",
      "Balance tactile product storytelling with shopping clarity and trust cues.",
    ],
    emphases: ["flagship product", "collection logic", "purchase confidence"],
    visualHooks: [
      "A standout hero product composition that sets the tone for the rest of the collection.",
      "Editorial product framing rather than uniform tiles alone.",
    ],
    interactionHints: [
      "Hover states should reveal depth or detail, not just generic lift on every card.",
      "Use motion to help comparison and browsing, not to distract from the products.",
    ],
    hierarchy: [
      ["section intro", "featured product", "collection or product list", "trust cue", "shop CTA"],
      ["headline", "product story", "buying options", "supporting proof"],
    ],
    contentKeys: [
      ["flagship products", "price or collection cue", "product differentiators", "buy CTA"],
      ["materials or quality", "social proof", "shipping confidence"],
    ],
    mediaBriefs: ["Use product imagery with texture, context, and lighting that matches the brand mood."],
  },
  gallery: {
    variations: ["masonry-gallery", "strip-carousel", "framed-grid", "editorial-columns"],
    purposes: [
      "Let visitors feel the atmosphere, work quality, or product detail through a paced visual section.",
      "Use imagery as proof and mood, not just decoration.",
    ],
    layoutIdeas: [
      "Create a gallery with varied crop sizes and breathing room so it feels curated.",
      "Use a paced visual strip or masonry composition that supports the narrative of the page.",
    ],
    emphases: ["atmosphere", "detail", "craft or quality"],
    visualHooks: [
      "Deliberate variation in crop, frame, or spacing rhythm.",
      "An editorial gallery rhythm rather than a flat equal-card grid.",
    ],
    interactionHints: [
      "Keep image hover states subtle and tactile.",
      "Use motion to stage the gallery sequence, not to gimmick it.",
    ],
    hierarchy: [
      ["section intro", "lead visual", "supporting gallery", "caption or CTA"],
      ["headline", "gallery field", "proof note"],
    ],
    contentKeys: [
      ["brand atmosphere", "detail shots", "proof cue"],
      ["selected visuals", "supporting caption", "CTA"],
    ],
    mediaBriefs: ["Every image should feel curated and on-brief; avoid repeating the same angle three times."],
  },
  testimonial: {
    variations: ["quote-wall", "founder-proof", "case-snippets", "rating-and-results"],
    compositionModes: [
      "lead testimonial with supporting proof rail",
      "result-led proof band with one hero quote",
      "editorial quote wall anchored by a single standout voice",
    ],
    spacingProfiles: [
      "compressed proof moment between larger narrative sections",
      "tight proof band with enough breathing room to feel intentional, not cramped",
    ],
    surfaceStyles: [
      "proof-focused contrast band",
      "quiet, trust-led surface with subtle framing around the lead quote",
    ],
    ctaPlacements: [
      "treat the CTA as a bridge in the closing corner of the section, not as the headline itself",
      "if the next section is a CTA, keep this section focused on proof and hand off gently",
    ],
    contrastWithPrevious: [
      "make this section more compact and credibility-driven than the section above",
      "switch from explanation into evidence with sharper hierarchy and less copy",
    ],
    purposes: [
      "Translate praise and proof into a stronger trust layer before the next conversion ask.",
      "Show evidence in a way that feels specific to the business rather than like filler quotes.",
    ],
    layoutIdeas: [
      "Pair one hero quote with supporting proof snippets or results.",
      "Use a trust section that mixes social proof with tangible credibility markers.",
    ],
    emphases: ["proof specificity", "credibility", "emotional reassurance"],
    visualHooks: [
      "A lead quote or result with visibly higher hierarchy than secondary proof.",
      "A blend of testimonial voice and proof markers such as ratings, press, or outcomes.",
    ],
    interactionHints: [
      "Keep proof interactions light so credibility stays clear and stable.",
      "Avoid carousel dependence unless it clearly improves comprehension.",
    ],
    hierarchy: [
      ["section intro", "lead quote", "supporting proof", "trust marker"],
      ["headline", "proof cluster", "result callout", "cta bridge"],
    ],
    contentKeys: [
      ["testimonials", "outcomes", "social proof"],
      ["reviews", "ratings", "credibility"],
    ],
    mediaBriefs: ["If portraits are used, they should feel real and restrained, not stock-heavy."],
    premiumDetails: [
      "Do not turn testimonials into another generic card grid if the page already used cards heavily.",
      "Let one quote or proof point carry more authority than the rest.",
      "Use proof to lower resistance before the next conversion step.",
    ],
  },
  portfolio: {
    variations: ["selected-work-wall", "case-study-strip", "editorial-showcase", "project-story-grid"],
    purposes: [
      "Show the standard of work through curation and context, not a pile of interchangeable thumbnails.",
      "Turn selected work into evidence of taste, capability, or results.",
    ],
    layoutIdeas: [
      "Lead with one hero project or collection, then support it with a paced selection.",
      "Mix project scale and annotation so the section feels curated and authored.",
    ],
    emphases: ["best work first", "project context", "range with curation"],
    visualHooks: [
      "A standout project treatment that creates instant confidence.",
      "Annotations, captions, or results details that elevate the work from a generic gallery.",
    ],
    interactionHints: [
      "Use hover to reveal context or metadata rather than generic movement.",
      "Let the projects feel confident and still, with motion only where useful.",
    ],
    hierarchy: [
      ["section intro", "hero project", "selected projects", "CTA"],
      ["headline", "featured work", "supporting work", "proof note"],
    ],
    contentKeys: [
      ["selected projects", "results or context", "project categories"],
      ["featured work", "client or medium", "CTA"],
    ],
    mediaBriefs: ["Use project imagery or case visuals that feel intentionally sequenced."],
  },
  process: {
    variations: ["numbered-steps", "timeline-rail", "split-explainer", "founder-walkthrough"],
    purposes: [
      "Reduce uncertainty by showing how the experience unfolds from first step to delivery.",
      "Turn the process into a trust and conversion asset, not a generic list of steps.",
    ],
    layoutIdeas: [
      "Build a process rhythm with one high-level narrative rail and supporting step detail.",
      "Use a timeline or step structure that makes the work feel manageable and clear.",
    ],
    emphases: ["clarity", "confidence", "next-step logic"],
    visualHooks: [
      "A paced step sequence with one meaningful highlight or checkpoint.",
      "A process layout that feels more guided than grid-based.",
    ],
    interactionHints: [
      "Use step reveals or hover states to support understanding, not spectacle.",
      "Each step can animate lightly in sequence if it reinforces readability.",
    ],
    hierarchy: [
      ["section intro", "step summary", "expanded step detail", "next step CTA"],
      ["headline", "timeline or steps", "assurance note", "cta"],
    ],
    contentKeys: [
      ["process steps", "timeline", "expectations"],
      ["how it works", "deliverables", "CTA"],
    ],
    mediaBriefs: ["Prefer diagrams, process imagery, or real environment details over unrelated stock scenes."],
  },
  pricing: {
    variations: ["tier-comparison", "package-story", "anchored-offer", "pricing-proof"],
    purposes: [
      "Make pricing or investment feel understandable and easier to say yes to.",
      "Balance transparency with reassurance so the page removes friction rather than creating it.",
    ],
    layoutIdeas: [
      "Lead with the recommended option or pricing logic, then support it with clear comparisons and notes.",
      "Keep pricing structured around decision help, not just tables.",
    ],
    emphases: ["clarity", "recommended option", "objection removal"],
    visualHooks: [
      "A visibly preferred option or anchored offer that guides the eye.",
      "Supportive pricing notes that reduce second-guessing.",
    ],
    interactionHints: [
      "Hover states can deepen comparison or highlight the recommended tier.",
      "Keep the structure steady and readable on mobile.",
    ],
    hierarchy: [
      ["section intro", "recommended offer", "comparison", "faq cue", "cta"],
      ["headline", "pricing options", "reassurance note", "action"],
    ],
    contentKeys: [
      ["price framing", "package options", "inclusions", "CTA"],
      ["recommended plan", "proof", "support"],
    ],
    mediaBriefs: ["Pricing sections should rely on hierarchy and contrast more than imagery."],
  },
  faq: {
    variations: ["accordion-rail", "split-q-and-a", "trust-qa-grid", "short-answer-stack"],
    purposes: [
      "Answer the last questions that slow people down before they act.",
      "Make hesitation feel normal and resolvable with concise, useful answers.",
    ],
    layoutIdeas: [
      "Use a selective FAQ with well-prioritized questions instead of an oversized dump of answers.",
      "Pair a compact question stack with a nearby conversion or contact cue.",
    ],
    emphases: ["objection handling", "clarity", "conversion support"],
    visualHooks: [
      "A composed FAQ rail that feels integrated into the page rather than tacked on.",
      "A nearby contact or reassurance block that makes the FAQ feel actionable.",
    ],
    interactionHints: [
      "Accordion motion should feel crisp and readable, not flashy.",
      "Use subtle transitions that preserve readability.",
    ],
    hierarchy: [
      ["headline", "priority questions", "secondary support CTA"],
      ["section intro", "faq list", "contact cue"],
    ],
    contentKeys: [
      ["common concerns", "clarifying answers", "contact path"],
      ["faq", "trust note", "CTA"],
    ],
    mediaBriefs: ["FAQs rarely need images; rely on structure and typography."],
  },
  contact: {
    variations: ["direct-contact-panel", "split-form-and-details", "visit-us-layout", "booking-callout"],
    purposes: [
      "Make the next step feel direct, low-friction, and credible.",
      "Collect or route interest without making visitors hunt for contact details.",
    ],
    layoutIdeas: [
      "Balance direct contact details with one clear action path such as form, booking, or call.",
      "Use location, hours, or response expectations to reduce friction.",
    ],
    emphases: ["primary contact path", "location or availability", "confidence to reach out"],
    visualHooks: [
      "A strong contact panel that feels easier than leaving the page.",
      "Clear contrast between contact methods and supporting details.",
    ],
    interactionHints: [
      "Keep interactive fields obvious, stable, and readable.",
      "Use motion only to guide focus toward the primary action.",
    ],
    hierarchy: [
      ["headline", "primary action", "contact details", "hours or location"],
      ["section intro", "form or booking UI", "supporting contact info"],
    ],
    contentKeys: [
      ["primary CTA", "email or phone", "address or hours"],
      ["booking path", "lead capture", "response expectation"],
    ],
    mediaBriefs: ["If imagery is used, it should reinforce place, team, or service environment."],
  },
  reservation: {
    variations: ["inline-booking", "time-slot-callout", "visit-planner", "host-invitation"],
    purposes: [
      "Move visitors from interest into a reservation or booking decision with minimal friction.",
      "Frame booking as easy, clear, and desirable.",
    ],
    layoutIdeas: [
      "Keep the reservation experience compact and direct, supported by one last reassurance layer.",
      "Use a booking callout that feels integrated into the brand atmosphere.",
    ],
    emphases: ["booking ease", "availability confidence", "last reassurance"],
    visualHooks: [
      "A booking cluster that stands out without feeling like a disconnected widget.",
      "A final moment of atmosphere or hospitality before the action.",
    ],
    interactionHints: [
      "Keep forms calm and obvious with minimal motion.",
      "If animation is used, let it reinforce the booking flow, not compete with it.",
    ],
    hierarchy: [
      ["headline", "booking CTA", "supporting details"],
      ["section intro", "availability cue", "booking action"],
    ],
    contentKeys: [
      ["booking CTA", "hours or availability", "contact fallback"],
      ["reservation benefit", "location cue", "CTA"],
    ],
    mediaBriefs: ["If visuals appear here, they should strengthen atmosphere and trust."],
  },
  credentials: {
    variations: ["trust-bar", "badge-and-proof", "credential-columns", "assurance-panel"],
    purposes: [
      "Surface qualifications, reputation, or service area trust cues before the ask.",
      "Make credibility concrete and quick to scan.",
    ],
    layoutIdeas: [
      "Use a tight proof section that prioritizes recognisable trust cues and local relevance.",
      "Present credentials with clarity and contrast, not a decorative logo wall alone.",
    ],
    emphases: ["qualifications", "service trust", "credibility"],
    visualHooks: [
      "A compact trust composition with one standout credential or guarantee.",
      "A proof cluster that feels specific rather than generic.",
    ],
    interactionHints: [
      "Keep this section stable and easy to scan.",
      "Avoid over-animating credentials or badges.",
    ],
    hierarchy: [
      ["headline", "core credentials", "supporting proof"],
      ["section intro", "trust markers", "service reassurance"],
    ],
    contentKeys: [
      ["credentials", "service area", "reviews or guarantees"],
      ["qualifications", "trust note", "CTA bridge"],
    ],
    mediaBriefs: ["Credentials sections usually work best with minimal or no imagery."],
  },
  stats: {
    variations: ["impact-band", "milestone-columns", "result-rail", "quiet-proof-strip"],
    purposes: [
      "Quantify momentum, scale, or proof without turning the page into a dashboard.",
      "Support belief with a few well-chosen numbers or milestones.",
    ],
    layoutIdeas: [
      "Use a contained proof band with strong hierarchy between the lead stat and the rest.",
      "Keep stats sparse and meaningful rather than filling space with vanity numbers.",
    ],
    emphases: ["one lead number", "supporting proof", "credibility"],
    visualHooks: [
      "A single oversized metric or milestone paired with quieter supporting figures.",
      "A restrained stat rhythm that feels premium instead of noisy.",
    ],
    interactionHints: [
      "Numbers can reveal with subtle sequencing, but readability comes first.",
      "Do not animate every number equally.",
    ],
    hierarchy: [
      ["headline", "lead stat", "supporting stats"],
      ["section intro", "milestones", "proof note"],
    ],
    contentKeys: [
      ["results", "milestones", "trust signal"],
      ["numbers", "proof", "context"],
    ],
    mediaBriefs: ["Stats should usually rely on typography and spacing, not imagery."],
  },
  cta: {
    variations: ["contrast-banner", "soft-invite", "inline-form", "split-callout"],
    compositionModes: [
      "contrast closing banner with offset action cluster",
      "editorial split callout with copy on one side and action on the other",
      "soft invitation panel with a decisive primary action",
    ],
    spacingProfiles: [
      "final-act spacing with more top padding and a confident close",
      "chapter-ending block with enough isolation to feel intentional",
    ],
    surfaceStyles: [
      "high-contrast close that still feels on-brand",
      "framed CTA module with calmer outer canvas",
    ],
    ctaPlacements: [
      "make the primary action the visual anchor of the block",
      "support the CTA with one reassurance line rather than a full paragraph stack",
    ],
    contrastWithPrevious: [
      "create a decisive final shift in contrast or framing from the section above",
      "make the CTA feel like a culmination, not a repeated button bar",
    ],
    purposes: [
      "Turn accumulated interest into a specific next step.",
      "Close the page with a confident ask that matches the tone of the brand.",
    ],
    layoutIdeas: [
      "Use a decisive CTA block that feels like a culmination of the page rather than an afterthought.",
      "Pair one clear action with just enough reassurance or context to make acting feel easy.",
    ],
    emphases: ["single next step", "clarity", "momentum"],
    visualHooks: [
      "A contrast shift or framing device that gives the CTA a final-act feeling.",
      "A strong split between copy and action that keeps the ask clear.",
    ],
    interactionHints: [
      "Give the primary action the cleanest hover state on the page.",
      "The CTA can use slightly stronger motion than the rest of the layout if it helps emphasis.",
    ],
    hierarchy: [
      ["headline", "supporting copy", "primary CTA", "secondary CTA"],
      ["action statement", "reassurance", "cta row"],
    ],
    contentKeys: [
      ["primary CTA", "reassurance", "secondary path"],
      ["conversion goal", "proof cue", "action"],
    ],
    mediaBriefs: ["CTAs should lean on hierarchy, contrast, and type before imagery."],
    premiumDetails: [
      "Avoid repeating the same primary CTA cluster from the hero without a new framing reason.",
      "Use fewer elements with stronger emphasis.",
      "Let the closing ask feel intentional and earned.",
    ],
  },
  footer: {
    variations: ["editorial-footer", "detail-rich-footer", "brand-closing", "minimal-contact-footer"],
    compositionModes: [
      "editorial close with strong brand anchor",
      "utility-rich footer with a calm final CTA note",
      "minimal closing band with compact contact structure",
    ],
    spacingProfiles: [
      "quiet closing cadence with generous top padding",
      "compressed utility finish after a stronger CTA block",
    ],
    surfaceStyles: [
      "tonal close with restrained contrast",
      "brand-darkened footer that still preserves readability",
    ],
    ctaPlacements: [
      "if a CTA appears here, keep it subtle and secondary to the utility structure",
      "use the footer to reassure and orient, not to repeat the whole CTA section again",
    ],
    contrastWithPrevious: [
      "bring the page down into a calmer utility-focused close",
      "shift from the CTA's stronger emphasis into a quieter brand sign-off",
    ],
    purposes: [
      "Close the page with brand presence, essential navigation, and useful details.",
      "Provide a strong final impression without feeling like a generic sitemap dump.",
    ],
    layoutIdeas: [
      "Use a footer that feels like part of the design story, with one strong brand or contact anchor.",
      "Balance practical links with a final brand note or CTA.",
    ],
    emphases: ["brand close", "utility", "contact reassurance"],
    visualHooks: [
      "A footer tone that feels intentional and slightly different from the body sections.",
      "A closing brand treatment that feels memorable without becoming decorative fluff.",
    ],
    interactionHints: [
      "Keep motion minimal and clarity high.",
      "Links should feel crisp and legible.",
    ],
    hierarchy: [
      ["brand anchor", "utility links", "contact details"],
      ["headline or wordmark", "navigation", "legal or contact"],
    ],
    contentKeys: [
      ["brand", "navigation", "contact info"],
      ["location", "hours or contact", "social or utility links"],
    ],
    mediaBriefs: ["Use the logo or text wordmark to close the site cleanly when appropriate."],
    premiumDetails: [
      "Avoid a cluttered sitemap footer unless the page genuinely needs that density.",
      "Let the footer feel like the final tone-setting note, not a default dump.",
    ],
  },
};

const GENERIC_SECTION_VARIATIONS: Record<string, string[]> = {
  services: ["editorial-columns", "proof-rail", "zigzag-detail", "bento-offer-grid", "tiered-offer-story"],
  about: ["story-with-timeline", "founder-letter", "split-image-narrative", "stat-supported-story"],
  testimonial: ["quote-wall", "founder-proof", "case-snippets", "rating-and-results"],
  cta: ["contrast-banner", "soft-invite", "inline-form", "split-callout"],
  gallery: ["masonry-gallery", "strip-carousel", "framed-grid", "editorial-columns"],
  products: ["collection-highlight", "stacked-merch-grid", "feature-product-story", "shop-editorial"],
  process: ["numbered-steps", "timeline-rail", "split-explainer", "founder-walkthrough"],
  pricing: ["tier-comparison", "package-story", "anchored-offer", "pricing-proof"],
  portfolio: ["selected-work-wall", "case-study-strip", "editorial-showcase", "project-story-grid"],
  menu: ["signature-highlights", "course-by-course", "chef-picks-rail", "menu-editorial-grid"],
  contact: ["direct-contact-panel", "split-form-and-details", "visit-us-layout", "booking-callout"],
};

const INDUSTRY_PROFILES: Record<IndustryKey, IndustryProfile> = {
  automotive: {
    label: "Automotive / luxury rental",
    keywords: /\b(car rental|luxury car|supercar|exotic car|fleet|vehicle rental|chauffeur|automotive)\b/i,
    defaultPages: ["Home", "Fleet", "About", "Contact"],
    homepageSections: ["navbar", "hero", "products", "credentials", "testimonial", "cta", "footer"],
    trustSignals: ["fleet quality", "availability confidence", "delivery or concierge service", "booking clarity"],
    serviceSection: "products",
    designCues: [
      "Treat the site like a premium showroom with a concierge conversion path.",
      "Lead with the fleet, the city or lifestyle context, and the booking action before longer brand story.",
      "Use cinematic contrast and vehicle detail instead of generic luxury tropes.",
    ],
    hierarchyRules: [
      "The hero should reveal the caliber of vehicles, the service area, and the booking path immediately.",
      "Fleet highlights should outrank generic about copy on the homepage.",
      "Availability, delivery, or concierge reassurance should appear before the final CTA.",
    ],
    copyRules: [
      "Write with concierge confidence and concrete vehicle or service language.",
      "Avoid software, process, or startup phrasing.",
    ],
    heroApproaches: [
      "showroom split with lead vehicle and booking rail",
      "cinematic fleet hero with concierge proof",
      "city-night editorial opening with fleet highlights",
    ],
    pageRules: [
      {
        test: /^home$/i,
        sections: ["navbar", "hero", "products", "credentials", "testimonial", "cta", "footer"],
        arc: "Open with aspiration and instant booking clarity, showcase the fleet, reinforce service trust, and close with a decisive reservation path.",
        keyMoments: ["lead vehicle moment", "fleet highlights", "delivery or concierge proof", "booking CTA"],
      },
      {
        test: /fleet|car|vehicle|collection/i,
        sections: ["navbar", "hero", "products", "gallery", "testimonial", "cta", "footer"],
        arc: "Show the caliber of the fleet, guide people toward the right choice, and support the booking decision with proof and service confidence.",
        keyMoments: ["fleet categories", "lead vehicles", "service reassurance", "reservation action"],
      },
      {
        test: /contact|book|reservation/i,
        sections: ["navbar", "hero", "contact", "faq", "cta", "footer"],
        arc: "Keep the booking path short and premium, with direct contact, response confidence, and one final reassurance layer.",
        keyMoments: ["contact clarity", "response expectation", "booking CTA"],
      },
    ],
    sectionOverrides: {
      hero: {
        variations: ["showroom-split-booking", "lead-vehicle-cover", "concierge-proof-opening", "city-night-showcase"],
        compositionModes: [
          "showroom split with a dominant lead vehicle and compact concierge booking rail",
          "cinematic cover with a detail crop, stacked copy, and one booking anchor",
        ],
        spacingProfiles: [
          "full-height showroom opening with deep side gutters and a compact proof lane",
          "cinematic opening with oversized media weight and a restrained action cluster",
        ],
        ctaPlacements: [
          "pair a concierge-ready primary action with a quieter fleet-browse path near the booking cues",
          "keep the booking action tight to the lead copy and service reassurance rather than floating below the fold",
        ],
        layoutIdeas: [
          "Pair one dominant vehicle or fleet image with a compact booking and service reassurance column.",
          "Use a showroom-like hero where the lead vehicle carries visual weight and the CTA cluster feels concierge-ready.",
        ],
        contentKeys: [
          ["fleet promise", "location", "booking CTA", "delivery proof"],
          ["lead vehicle", "availability cue", "concierge note", "CTA"],
        ],
        premiumDetails: [
          "Let the lead vehicle own the frame before any supporting fleet details appear.",
          "Keep booking language concise and concierge-like, not salesy.",
          "Use one tactile detail crop or city cue instead of multiple competing luxury motifs.",
        ],
      },
      products: {
        variations: ["fleet-showcase", "vehicle-category-ladder", "lead-car-and-grid", "showroom-rail"],
        compositionModes: [
          "lead-car spotlight followed by a paced supporting fleet rail",
          "category ladder with one dominant vehicle panel and compact supporting options",
        ],
        emphases: ["lead vehicle", "fleet variety", "booking confidence"],
        visualHooks: [
          "Give one lead vehicle or category visibly more dominance than the rest of the fleet.",
          "Use a premium showroom rhythm rather than identical product cards.",
        ],
        premiumDetails: [
          "Do not let every vehicle card carry equal weight.",
          "Use one standout booking moment inside the fleet story instead of repeating identical buttons.",
        ],
      },
      credentials: {
        emphases: ["service trust", "delivery confidence", "VIP treatment"],
      },
      testimonial: {
        compositionModes: ["client quote paired with concierge-proof details and delivery reassurance"],
        premiumDetails: [
          "Support the lead quote with service proof such as delivery speed, discretion, or repeat booking cues.",
        ],
      },
    },
  },
  restaurant: {
    label: "Restaurant / dining",
    keywords: /restaurant|cafe|coffee|bakery|bistro|dining|chef|bar|menu|food/i,
    defaultPages: ["Home", "Menu", "About", "Reservations", "Contact"],
    homepageSections: ["navbar", "hero", "menu", "gallery", "testimonial", "reservation", "footer"],
    trustSignals: ["signature dishes", "guest reviews", "hours and location", "reservation ease"],
    serviceSection: "menu",
    designCues: [
      "Lead with atmosphere, signature dishes, and reservation ease before longer brand story.",
      "Let imagery feel appetizing and cinematic instead of generic lifestyle filler.",
      "Use pacing that feels like an invitation to a night out, not a corporate brochure.",
    ],
    hierarchyRules: [
      "The hero should resolve three things fast: what kind of place it is, why it is special, and how to book.",
      "Menu highlights should outrank generic about copy on the homepage.",
      "Hours, location, and reservations should stay visible before the visitor reaches the footer.",
    ],
    copyRules: [
      "Write like a confident host or chef, not a startup founder.",
      "Name dishes, ingredients, or ambience details instead of using empty adjectives like premium or unforgettable.",
    ],
    heroApproaches: [
      "full-bleed dining atmosphere with reservation rail",
      "chef-signature split hero with featured dishes",
      "night-out editorial hero with location and booking cues",
    ],
    pageRules: [
      {
        test: /^home$/i,
        sections: ["navbar", "hero", "menu", "gallery", "testimonial", "reservation", "footer"],
        arc: "Start with atmosphere and signature appeal, move into curated menu highlights, reinforce social proof, and end with a friction-light reservation action.",
        keyMoments: ["ambience first impression", "signature dishes", "guest praise", "reservation ease"],
      },
      {
        test: /menu/i,
        sections: ["navbar", "hero", "menu", "gallery", "reservation", "footer"],
        arc: "Set appetite, show standout menu categories, bring in atmosphere, and convert interest into reservations.",
        keyMoments: ["signature picks", "menu categories", "ambience", "booking"],
      },
      {
        test: /reservation|book|visit|contact/i,
        sections: ["navbar", "hero", "reservation", "contact", "map", "footer"],
        arc: "Keep the path short: availability, reservation action, and practical location details.",
        keyMoments: ["reservation action", "hours", "location"],
      },
    ],
    sectionOverrides: {
      hero: {
        variations: ["host-invitation", "chef-led-opening", "late-night-editorial", "reservation-first-split"],
        compositionModes: [
          "full-bleed dining atmosphere with a compact reservation rail",
          "chef-signature split with one featured dish, editorial copy, and utility details tucked close",
        ],
        spacingProfiles: [
          "slow opening cadence with a large visual field and compact booking details",
          "atmospheric first screen with generous outer margins and a dense utility corner",
        ],
        ctaPlacements: [
          "keep the reservation action close to the hours or location cue so the page feels immediately useful",
          "let the menu and reservation cues sit in the copy cluster instead of as a detached button row",
        ],
        layoutIdeas: [
          "Pair an atmosphere-led image with a compact reservation or hours cluster so the first screen feels immediately useful.",
          "Use large editorial copy, signature dish or venue imagery, and a direct booking action.",
        ],
        contentKeys: [
          ["cuisine or concept", "location", "reservation CTA", "signature dish cue"],
          ["atmosphere", "hours", "booking", "guest-proof"],
        ],
        mediaBriefs: ["Show real ambience or plating detail that makes the venue feel specific."],
        premiumDetails: [
          "Anchor the opening with one memorable room or plating image, not a collage.",
          "Let the booking cue feel like part of the host experience rather than a utility widget.",
        ],
      },
      menu: {
        compositionModes: [
          "chef-picks narrative with one featured dish block and supporting category lanes",
          "menu editorial with signature highlights leading into structured categories",
        ],
        emphases: ["signature dishes", "menu categories", "chef point of view"],
        visualHooks: [
          "Lead one standout dish or menu category with more scale than the rest.",
          "Use a chef-picks or seasonal spotlight inside the menu flow.",
        ],
        premiumDetails: [
          "Resist turning the menu into a flat list too early; curate the first read.",
          "Use one signature dish or tasting cue to lead the section before the full category structure.",
        ],
      },
      testimonial: {
        compositionModes: ["guest memory quote with supporting room, service, or menu cues"],
        premiumDetails: [
          "Use testimonials to reinforce atmosphere and service, not only generic praise.",
        ],
      },
      reservation: {
        mediaBriefs: ["Keep booking clear and compact, with hospitality details close by."],
      },
    },
  },
  hospitality: {
    label: "Hotel / hospitality",
    keywords: /hotel|resort|villa|stay|hospitality|suite|lodging|retreat/i,
    defaultPages: ["Home", "Rooms", "Experiences", "Gallery", "Contact"],
    homepageSections: ["navbar", "hero", "about", "gallery", "stats", "testimonial", "contact", "footer"],
    trustSignals: ["amenities", "location", "guest reviews", "booking CTA"],
    serviceSection: "services",
    designCues: [
      "Open with calm, high-confidence atmosphere and location appeal.",
      "Use fewer, larger sections with more breathing room and strong imagery or editorial framing.",
      "Booking and stay details should feel luxurious but easy to find.",
    ],
    hierarchyRules: [
      "Atmosphere and booking should appear before long descriptive copy.",
      "Amenity proof and location cues should be visually quieter but always easy to access.",
    ],
    copyRules: [
      "Speak with hospitality confidence and sensory detail.",
      "Avoid corporate travel clichés; focus on the feel of the stay and the ease of booking.",
    ],
    heroApproaches: [
      "resort-style cinematic opening with booking rail",
      "suite showcase with amenity proof",
      "destination-first editorial cover",
    ],
    pageRules: [
      {
        test: /^home$/i,
        sections: ["navbar", "hero", "gallery", "about", "testimonial", "contact", "footer"],
        arc: "Start with destination and atmosphere, show the experience, build guest confidence, and guide the booking or enquiry.",
        keyMoments: ["destination promise", "room or amenity preview", "guest proof", "booking path"],
      },
      {
        test: /room|suite|stay/i,
        sections: ["navbar", "hero", "services", "gallery", "pricing", "contact", "footer"],
        arc: "Present the stay options with calm clarity, then support them with visuals and booking context.",
        keyMoments: ["stay options", "amenities", "pricing or availability", "booking"],
      },
    ],
    sectionOverrides: {
      hero: {
        variations: ["suite-showcase", "destination-cover", "amenity-split", "booking-led-opening"],
      },
      gallery: {
        mediaBriefs: ["Show rooms, amenities, and place with a calm editorial pacing."],
      },
    },
  },
  saas: {
    label: "SaaS / software",
    keywords: /\b(saas|software|platform|automation|analytics|dashboard|workflow|integration|integrations|crm|reporting|approval|approvals|trial|demo|api|app|ai)\b/i,
    defaultPages: ["Home", "Product", "Pricing", "About", "Contact"],
    homepageSections: ["navbar", "hero", "products", "integrations", "stats", "testimonial", "pricing", "cta", "footer"],
    trustSignals: ["proof of outcomes", "feature clarity", "integrations", "pricing confidence"],
    serviceSection: "products",
    designCues: [
      "Show the workflow, result, or product logic early instead of hiding behind vague innovation language.",
      "Use product proof and integration logic before stacking generic testimonials.",
      "Let hierarchy move from problem and workflow into proof, then pricing or conversion.",
    ],
    hierarchyRules: [
      "The hero should explain the product and its payoff before visual flourish.",
      "Workflow or product detail should outrank decorative statistics.",
      "Proof should be concrete: integrations, outcomes, customers, or clarity of product behavior.",
    ],
    copyRules: [
      "Avoid AI vapor language and empty platform clichés.",
      "Use outcomes, workflows, and constraints the buyer actually recognizes.",
    ],
    heroApproaches: [
      "split hero with workflow proof rail",
      "dashboard-closeup with outcome headline",
      "problem-to-product narrative hero",
    ],
    pageRules: [
      {
        test: /^home$/i,
        sections: ["navbar", "hero", "products", "integrations", "stats", "testimonial", "pricing", "cta", "footer"],
        arc: "Clarify the product, show what it does, prove that it works in real workflows, and reduce buying hesitation.",
        keyMoments: ["problem-solution clarity", "product workflow", "proof of outcomes", "pricing confidence"],
      },
      {
        test: /product|platform|feature/i,
        sections: ["navbar", "hero", "products", "process", "integrations", "testimonial", "cta", "footer"],
        arc: "Explain the product in a believable sequence from capability to workflow to proof.",
        keyMoments: ["core capability", "workflow steps", "integrations", "proof"],
      },
      {
        test: /pricing/i,
        sections: ["navbar", "hero", "pricing", "faq", "testimonial", "cta", "footer"],
        arc: "Frame the plan logic, remove pricing friction, and create a clear route into trial or demo.",
        keyMoments: ["plan comparison", "value framing", "objection handling", "trial or demo CTA"],
      },
    ],
    sectionOverrides: {
      hero: {
        variations: ["workflow-proof-split", "dashboard-command-center", "buyer-pain-bridge", "ai-outcome-hero"],
        compositionModes: [
          "product clarity split with a workflow screenshot and proof rail",
          "problem-to-dashboard bridge with compact outcome metrics and one primary CTA",
        ],
        spacingProfiles: [
          "tight opening with one large product plane and compact proof moments",
          "clear top section that prioritizes product comprehension over atmospheric whitespace",
        ],
        ctaPlacements: [
          "place the demo action immediately after the promise and keep proof adjacent to it",
          "use one primary demo CTA and one lower-friction product exploration path, not two equal buttons",
        ],
        contentKeys: [
          ["problem", "product promise", "primary CTA", "proof strip"],
          ["workflow outcome", "integration cue", "demo CTA", "social proof"],
        ],
        premiumDetails: [
          "Show one believable workflow or product state instead of a collage of many abstract UI fragments.",
          "Let proof feel operator-grade and specific, not like startup vanity metrics.",
        ],
      },
      products: {
        variations: ["workflow-sections", "feature-to-outcome-zigzag", "command-center-layout", "capability-bento"],
        compositionModes: [
          "workflow narrative with one dominant capability and supporting outcome modules",
          "product architecture layout that moves from command center to supporting automations",
        ],
        visualHooks: [
          "Anchor the section around workflow outcomes, not a wall of abstract features.",
          "Use a dominant capability with adjacent supporting capabilities.",
        ],
        premiumDetails: [
          "Group features by buyer logic or workflow stage, not by card symmetry.",
          "Use one proof checkpoint between product groups so the section keeps momentum.",
        ],
      },
      integrations: {
        layoutIdeas: [
          "Treat integrations as proof of fit and adoption, not just a logo cloud.",
          "Show the stack compatibility and how it changes the user's workflow.",
        ],
      },
    },
  },
  commerce: {
    label: "Retail / ecommerce",
    keywords: /shop|store|e-?commerce|retail|collection|product|fashion|beauty|jewelry/i,
    defaultPages: ["Home", "Shop", "About", "FAQ", "Contact"],
    homepageSections: ["navbar", "hero", "products", "gallery", "testimonial", "faq", "cta", "footer"],
    trustSignals: ["product quality", "shipping confidence", "social proof", "featured collections"],
    serviceSection: "products",
    designCues: [
      "Merchandising and desirability need to appear as structure, not just image decoration.",
      "Use collection hierarchy and tactile detail to guide choice.",
      "Balance editorial brand atmosphere with transactional clarity.",
    ],
    hierarchyRules: [
      "The first screen should present a collection promise or signature product, not only brand mood.",
      "Featured collection or flagship items should outrank generic supporting content.",
      "Trust signals like shipping, quality, or returns should appear before the final purchase CTA.",
    ],
    copyRules: [
      "Write with product desirability and specificity.",
      "Use materials, fit, craftsmanship, or use-case detail instead of empty luxury clichés.",
    ],
    heroApproaches: [
      "collection-led poster hero",
      "flagship product showcase",
      "editorial merchandising cover",
    ],
    pageRules: [
      {
        test: /^home$/i,
        sections: ["navbar", "hero", "products", "gallery", "testimonial", "cta", "footer"],
        arc: "Open with the collection point of view, spotlight what to shop first, reinforce desirability, then guide the purchase step.",
        keyMoments: ["collection promise", "featured products", "social proof", "shop CTA"],
      },
      {
        test: /shop|product|collection/i,
        sections: ["navbar", "hero", "products", "gallery", "faq", "cta", "footer"],
        arc: "Organize the collection clearly, support it with detail, then resolve buying questions.",
        keyMoments: ["featured collection", "product detail", "buying reassurance", "shop CTA"],
      },
    ],
    sectionOverrides: {
      products: {
        variations: ["merchandising-spotlight", "collection-ladder", "product-story-zigzag", "editorial-shop-grid"],
        emphases: ["flagship product", "collection curation", "purchase confidence"],
      },
      testimonial: {
        visualHooks: ["Use reviews or social proof like desirability markers, not corporate testimonials."],
      },
    },
  },
  agency: {
    label: "Agency / consulting / studio",
    keywords: /agency|studio|consult|consulting|branding|marketing|development|creative/i,
    defaultPages: ["Home", "Services", "Work", "About", "Contact"],
    homepageSections: ["navbar", "hero", "services", "case-studies", "process", "testimonial", "cta", "footer"],
    trustSignals: ["case studies", "process clarity", "team credibility", "CTA confidence"],
    serviceSection: "services",
    designCues: [
      "Lead with point of view and calibrated confidence, not generic capability claims.",
      "Case studies or proof of work should carry as much weight as the offer list.",
      "Use a sharper editorial rhythm so the agency does not look like every other consultancy site.",
    ],
    hierarchyRules: [
      "Open with the point of view, then move quickly into capability and proof of outcomes.",
      "Case studies should feel like evidence, not a gallery tucked away below the fold.",
      "Process should reduce risk and show operating maturity before the final CTA.",
    ],
    copyRules: [
      "Avoid empty growth jargon.",
      "Use conviction, specificity, and real operating language about strategy, craft, or outcomes.",
    ],
    heroApproaches: [
      "manifesto-led editorial hero",
      "proof-first split hero with case cue",
      "founder-perspective opening",
    ],
    pageRules: [
      {
        test: /^home$/i,
        sections: ["navbar", "hero", "services", "case-studies", "process", "testimonial", "cta", "footer"],
        arc: "Make the point of view clear, explain the capabilities, show work proof, reduce delivery risk, and invite the enquiry.",
        keyMoments: ["point of view", "capability structure", "proof of work", "process confidence"],
      },
      {
        test: /work|portfolio|case/i,
        sections: ["navbar", "hero", "case-studies", "testimonial", "cta", "footer"],
        arc: "Let the work and results do the talking, then bridge directly into contact.",
        keyMoments: ["featured cases", "results", "client trust", "enquiry CTA"],
      },
      {
        test: /service|capabilit/i,
        sections: ["navbar", "hero", "services", "process", "testimonial", "cta", "footer"],
        arc: "Clarify how the agency works, what it does best, and why it is a credible choice.",
        keyMoments: ["capability scope", "delivery model", "client proof", "CTA"],
      },
    ],
    sectionOverrides: {
      hero: {
        variations: ["manifesto-panel", "case-proof-split", "founder-letter-opening", "outcome-poster"],
        compositionModes: [
          "manifesto-first editorial spread with one case cue and restrained contact action",
          "founder-perspective split with oversized type, proof note, and selected work marker",
        ],
        spacingProfiles: [
          "chapter-opening rhythm with generous margins and one dense proof annotation",
          "editorial cover with open negative space and a compact enquiry cluster",
        ],
        ctaPlacements: [
          "keep the enquiry action secondary to the point of view until proof has earned it",
          "pair the CTA with a case cue or proof line instead of a generic button row",
        ],
        premiumDetails: [
          "Let typography carry more weight than interface chrome.",
          "Lead with conviction and point of view before capability detail.",
        ],
      },
      services: {
        compositionModes: [
          "editorial capabilities layout with one lead offer and alternating supporting depth",
          "strategy-to-execution narrative that lets one offer cluster clearly lead",
        ],
        premiumDetails: [
          "Organize offers by decision logic or engagement shape, not identical service cards.",
          "Use one proof or case cue inside the services section to keep it grounded.",
        ],
      },
      "case-studies": {
        variations: ["featured-case-rail", "result-led-projects", "editorial-case-wall", "before-after-story"],
        layoutIdeas: [
          "Lead with one flagship case before the supporting project field.",
          "Make results or transformation visible, not just visuals.",
        ],
        premiumDetails: [
          "Use one flagship case to set the standard before smaller supporting projects appear.",
          "Let outcome language and visual proof sit together so the work reads as evidence, not decoration.",
        ],
      },
      process: {
        emphases: ["operating clarity", "risk reduction", "working style"],
      },
      testimonial: {
        compositionModes: ["client quote with supporting delivery proof and compact engagement detail"],
        premiumDetails: [
          "Use testimony to reinforce operating confidence, not just subjective praise.",
        ],
      },
    },
  },
  portfolio: {
    label: "Portfolio / personal brand",
    keywords: /portfolio|creator|artist|photograph|designer|writer|speaker|personal brand/i,
    defaultPages: ["Home", "Work", "About", "Journal", "Contact"],
    homepageSections: ["navbar", "hero", "portfolio", "about", "testimonial", "cta", "footer"],
    trustSignals: ["selected work", "philosophy", "client praise", "direct contact"],
    serviceSection: "portfolio",
    designCues: [
      "Let the site feel authored and voice-led, with an obvious personal or creative signature.",
      "Work samples and philosophy should outweigh generic service marketing language.",
      "Use editorial pacing, asymmetry, and quieter negative space where it helps the work breathe.",
    ],
    hierarchyRules: [
      "The first screen should reveal both the creator's identity and the kind of work or voice they are known for.",
      "Selected work should have more weight than generalized bio copy on the homepage.",
      "Direct contact should feel personal and specific, not corporate.",
    ],
    copyRules: [
      "Write with a clear authored voice.",
      "Avoid agency-sounding capability copy if the brand is personal or maker-led.",
    ],
    heroApproaches: [
      "portrait or work-led editorial cover",
      "voice-first manifesto hero",
      "selected-work opening statement",
    ],
    pageRules: [
      {
        test: /^home$/i,
        sections: ["navbar", "hero", "portfolio", "about", "testimonial", "cta", "footer"],
        arc: "Introduce the voice or perspective, show selected work, explain the point of view, then make contact simple.",
        keyMoments: ["authored introduction", "selected work", "philosophy", "contact invite"],
      },
      {
        test: /work|portfolio|project/i,
        sections: ["navbar", "hero", "portfolio", "testimonial", "cta", "footer"],
        arc: "Let the work lead, then support it with just enough context and social proof.",
        keyMoments: ["featured work", "context or medium", "proof", "contact"],
      },
      {
        test: /journal|blog|insight/i,
        sections: ["navbar", "hero", "blog", "cta", "footer"],
        arc: "Frame the thinking, present selected writing or ideas, and guide readers into the next relationship step.",
        keyMoments: ["point of view", "selected essays or posts", "contact or subscribe CTA"],
      },
    ],
    sectionOverrides: {
      hero: {
        variations: ["voice-led-opening", "selected-work-cover", "portrait-and-manifesto", "editorial-cascade"],
      },
      portfolio: {
        emphases: ["authored curation", "signature work", "context"],
      },
      about: {
        layoutIdeas: [
          "Use a more intimate founder-letter or first-person structure than a corporate about section.",
          "Let personal philosophy and selected credibility cues coexist in the same section.",
        ],
      },
    },
  },
  local: {
    label: "Local service business",
    keywords: /real estate|law|clinic|dentist|salon|spa|gym|fitness|local|contractor|plumbing/i,
    defaultPages: ["Home", "Services", "About", "FAQ", "Contact"],
    homepageSections: ["navbar", "hero", "credentials", "services", "testimonial", "contact", "footer"],
    trustSignals: ["credentials", "service area", "reviews", "contact clarity"],
    serviceSection: "services",
    designCues: [
      "Lead with reassurance, service area clarity, and a direct next step.",
      "Trust markers, credentials, and reviews should appear early and feel concrete.",
      "Use visual hierarchy that helps local users scan fast for service fit and contact details.",
    ],
    hierarchyRules: [
      "The first screen should explain what the business does, where it serves, and how to make contact.",
      "Credentials or reviews should appear before long explanatory sections.",
      "Contact details and service area cues should reappear before the footer.",
    ],
    copyRules: [
      "Use reassuring, practical language.",
      "Talk about service area, process, and outcomes with specificity.",
    ],
    heroApproaches: [
      "trust-first local service hero",
      "service-area opening with phone CTA",
      "credentials-led reassurance hero",
    ],
    pageRules: [
      {
        test: /^home$/i,
        sections: ["navbar", "hero", "credentials", "services", "testimonial", "contact", "footer"],
        arc: "Reassure fast, show the core services, prove trust, and keep contact friction low.",
        keyMoments: ["service clarity", "service area", "credentials or reviews", "contact CTA"],
      },
      {
        test: /service|capabilit/i,
        sections: ["navbar", "hero", "services", "credentials", "faq", "contact", "footer"],
        arc: "Explain the services clearly, back them with qualifications, and remove hesitation with FAQs.",
        keyMoments: ["service scope", "qualifications", "common concerns", "contact"],
      },
      {
        test: /contact|book|visit/i,
        sections: ["navbar", "hero", "contact", "map", "credentials", "footer"],
        arc: "Keep the path short and reassuring with direct contact options and location proof.",
        keyMoments: ["contact method", "location", "trust cue"],
      },
    ],
    sectionOverrides: {
      hero: {
        variations: ["phone-led-reassurance", "service-area-split", "trust-proof-opening", "appointment-first"],
      },
      credentials: {
        emphases: ["service trust", "qualifications", "local reassurance"],
      },
      contact: {
        contentKeys: [
          ["phone", "service area", "hours", "booking or enquiry CTA"],
          ["form", "address", "trust note"],
        ],
      },
    },
  },
  education: {
    label: "Education / training",
    keywords: /course|academy|school|training|education|cohort|workshop|bootcamp/i,
    defaultPages: ["Home", "Programs", "About", "FAQ", "Contact"],
    homepageSections: ["navbar", "hero", "services", "process", "testimonial", "pricing", "faq", "footer"],
    trustSignals: ["curriculum clarity", "outcomes", "student reviews", "enrollment CTA"],
    serviceSection: "services",
    designCues: [
      "Make the learning outcome, program structure, and credibility visible early.",
      "Use syllabus or curriculum logic to organize the experience.",
      "Balance inspiration with enrollment clarity.",
    ],
    hierarchyRules: [
      "The hero should explain who the program is for and what outcome it drives.",
      "Curriculum or program structure should appear before long institution story.",
    ],
    copyRules: [
      "Use teaching and outcome language, not vague inspiration alone.",
      "Be concrete about program fit, format, and results.",
    ],
    heroApproaches: [
      "outcome-led program hero",
      "cohort invitation opening",
      "curriculum-first showcase",
    ],
    pageRules: [
      {
        test: /^home$/i,
        sections: ["navbar", "hero", "services", "process", "testimonial", "pricing", "faq", "footer"],
        arc: "Set the transformation promise, show how the program works, prove outcomes, and make enrollment understandable.",
        keyMoments: ["outcome promise", "program structure", "student proof", "enrollment CTA"],
      },
    ],
    sectionOverrides: {
      services: {
        visualHooks: ["Treat programs as tracks or learning paths instead of generic service cards."],
      },
    },
  },
  wellness: {
    label: "Wellness / coaching",
    keywords: /wellness|therapy|coach|coaching|mindfulness|yoga|nutrition|health/i,
    defaultPages: ["Home", "Services", "About", "Testimonials", "Contact"],
    homepageSections: ["navbar", "hero", "about", "services", "testimonial", "process", "contact", "footer"],
    trustSignals: ["approach", "credentials", "results", "gentle CTA"],
    serviceSection: "services",
    designCues: [
      "Use calm, emotionally intelligent pacing without becoming vague or overly soft.",
      "Balance reassurance with clear service structure and trust markers.",
      "Let the site feel grounded, warm, and specific.",
    ],
    hierarchyRules: [
      "Start by explaining who the work is for and what kind of change it supports.",
      "Approach and trust should appear before the strongest CTA, but the CTA still needs to be clear.",
    ],
    copyRules: [
      "Sound grounded, reassuring, and clear.",
      "Avoid airy wellness clichés without real substance.",
    ],
    heroApproaches: [
      "calm reassurance hero",
      "approach-led opening",
      "gentle invitation split hero",
    ],
    pageRules: [
      {
        test: /^home$/i,
        sections: ["navbar", "hero", "about", "services", "testimonial", "process", "contact", "footer"],
        arc: "Set the emotional tone, explain the approach, show what support looks like, and make contact feel safe.",
        keyMoments: ["emotional reassurance", "approach", "client proof", "contact invite"],
      },
    ],
    sectionOverrides: {
      hero: {
        variations: ["gentle-proof-opening", "approach-invitation", "quiet-assurance-cover", "support-first-split"],
      },
    },
  },
  general: {
    label: "General business",
    keywords: /.*/i,
    defaultPages: ["Home", "About", "Services", "Contact"],
    homepageSections: ["navbar", "hero", "about", "services", "testimonial", "cta", "footer"],
    trustSignals: ["clear offer", "social proof", "contact details", "CTA clarity"],
    serviceSection: "services",
    designCues: [
      "Use the business context to decide what should lead instead of defaulting to startup tropes.",
      "Create contrast between storytelling, offer detail, and proof sections.",
    ],
    hierarchyRules: [
      "The homepage should explain the offer, audience, and next step before decorative flourishes.",
      "Proof should support the offer before the strongest CTA appears.",
    ],
    copyRules: [
      "Prefer specifics over abstractions.",
      "Avoid generic filler like innovative, cutting-edge, or world-class unless backed by context.",
    ],
    heroApproaches: [
      "clarity-first hero with proof strip",
      "editorial promise opening",
      "offer-and-proof split hero",
    ],
    pageRules: [
      {
        test: /^home$/i,
        sections: ["navbar", "hero", "about", "services", "testimonial", "cta", "footer"],
        arc: "Open with clarity, explain the offer, support it with proof, and close with a confident call to action.",
        keyMoments: ["offer clarity", "differentiator", "proof", "CTA"],
      },
    ],
    sectionOverrides: {},
  },
};

const INDUSTRY_PAGE_SECTION_RULES: Partial<Record<IndustryKey, IndustryPageRule[]>> = Object.fromEntries(
  Object.entries(INDUSTRY_PROFILES).map(([key, profile]) => [key, profile.pageRules])
) as Partial<Record<IndustryKey, IndustryPageRule[]>>;

const SECTION_NAME_MAP: Record<string, string[]> = {
  navbar: ["Navigation", "Top Bar", "Primary Navigation", "Header Navigation"],
  hero: ["Hero", "Opening Statement", "First Impression", "Lead Story"],
  about: ["About", "Our Story", "Why We Exist", "Inside The Brand"],
  services: ["Services", "Capabilities", "What We Offer", "How We Help"],
  menu: ["Menu", "Signature Dishes", "What To Order", "Featured Plates"],
  products: ["Products", "Collections", "Featured Products", "What To Shop"],
  gallery: ["Gallery", "Visual Story", "In Focus", "Selected Images"],
  testimonial: ["Testimonials", "Client Praise", "Loved By Clients", "Guest Reviews"],
  portfolio: ["Portfolio", "Selected Work", "Projects", "Featured Work"],
  process: ["Process", "How It Works", "Our Method", "What Happens Next"],
  pricing: ["Pricing", "Packages", "Plans", "Investment"],
  faq: ["FAQ", "Questions", "Helpful Answers", "Need To Know"],
  contact: ["Contact", "Get In Touch", "Start The Conversation", "Visit Us"],
  reservation: ["Reservations", "Book A Table", "Reserve Your Spot", "Plan Your Visit"],
  credentials: ["Credentials", "Why Trust Us", "Qualifications", "Proof"],
  stats: ["Highlights", "By The Numbers", "Milestones", "Impact"],
  cta: ["Next Step", "Ready When You Are", "Let's Talk", "Make Your Move"],
  footer: ["Footer", "Closing", "Stay Connected", "Final Details"],
  team: ["Team", "Meet The Team", "People Behind It", "Faces Of The Brand"],
  blog: ["Journal", "Insights", "Latest Stories", "Resources"],
  map: ["Find Us", "Location", "Visit The Space", "Directions"],
  integrations: ["Integrations", "Works With", "Connected Stack", "Your Existing Tools"],
  "case-studies": ["Case Studies", "Success Stories", "Recent Wins", "Proof In Action"],
};

function mergePreset(
  base: SectionBlueprintPreset | undefined,
  override: SectionBlueprintPreset | undefined
): SectionBlueprintPreset {
  return {
    variations: dedupeStrings([...(override?.variations ?? []), ...(base?.variations ?? [])], 10),
    compositionModes: dedupeStrings([...(override?.compositionModes ?? []), ...(base?.compositionModes ?? [])], 10),
    spacingProfiles: dedupeStrings([...(override?.spacingProfiles ?? []), ...(base?.spacingProfiles ?? [])], 10),
    surfaceStyles: dedupeStrings([...(override?.surfaceStyles ?? []), ...(base?.surfaceStyles ?? [])], 10),
    ctaPlacements: dedupeStrings([...(override?.ctaPlacements ?? []), ...(base?.ctaPlacements ?? [])], 10),
    contrastWithPrevious: dedupeStrings([...(override?.contrastWithPrevious ?? []), ...(base?.contrastWithPrevious ?? [])], 10),
    purposes: dedupeStrings([...(override?.purposes ?? []), ...(base?.purposes ?? [])], 10),
    layoutIdeas: dedupeStrings([...(override?.layoutIdeas ?? []), ...(base?.layoutIdeas ?? [])], 10),
    emphases: dedupeStrings([...(override?.emphases ?? []), ...(base?.emphases ?? [])], 8),
    visualHooks: dedupeStrings([...(override?.visualHooks ?? []), ...(base?.visualHooks ?? [])], 10),
    interactionHints: dedupeStrings([...(override?.interactionHints ?? []), ...(base?.interactionHints ?? [])], 10),
    hierarchy: dedupeGroupStrings([...(override?.hierarchy ?? []), ...(base?.hierarchy ?? [])], 6),
    contentKeys: dedupeGroupStrings([...(override?.contentKeys ?? []), ...(base?.contentKeys ?? [])], 6),
    mediaBriefs: dedupeStrings([...(override?.mediaBriefs ?? []), ...(base?.mediaBriefs ?? [])], 8),
    premiumDetails: dedupeStrings([...(override?.premiumDetails ?? []), ...(base?.premiumDetails ?? [])], 10),
  };
}

function dedupeGroupStrings(values: string[][], limit = values.length): string[][] {
  const seen = new Set<string>();
  const next: string[][] = [];

  values.forEach((group) => {
    const cleaned = dedupeStrings(group);
    if (!cleaned.length) return;
    const key = cleaned.join("|").toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    next.push(cleaned);
  });

  return next.slice(0, limit);
}

function readBusinessName(input: BusinessBrief | SiteBrief): string {
  return "businessName" in input ? input.businessName : input.siteName;
}

function readOfferSummary(input: BusinessBrief | SiteBrief): string {
  return "businessName" in input
    ? input.offerSummary || input.businessDescription
    : input.features || input.description;
}

function readAudience(input: BusinessBrief | SiteBrief): string {
  return "businessName" in input ? input.audience : input.targetAudience || "";
}

function readPrimaryGoal(input: BusinessBrief | SiteBrief): string {
  return "businessName" in input
    ? input.websiteGoals[0] || input.contactInfo.cta || "take the next step"
    : input.features?.split(",")[0] || "take the next step";
}

function readDifferentiator(input: BusinessBrief | SiteBrief): string {
  return "businessName" in input
    ? input.differentiators[0] || input.socialProof[0] || input.testimonials[0] || ""
    : input.features || "";
}

function readLocation(input: BusinessBrief | SiteBrief): string {
  return "businessName" in input ? input.location || input.contactInfo.address || "" : "";
}

function pickSentence(values: string[] | undefined, seed: string, fallback: string): string {
  return values?.length ? pickByHash(values, seed) : fallback;
}

function pickGroup(values: string[][] | undefined, seed: string, fallback: string[]): string[] {
  return values?.length ? pickByHash(values, seed) : fallback;
}

export function getIndustryProfile(input: BusinessBrief | SiteBrief): IndustryProfile {
  return INDUSTRY_PROFILES[inferIndustryKey(input)];
}

export function inferIndustryKey(input: BusinessBrief | SiteBrief): IndustryKey {
  const haystack =
    "businessName" in input
      ? [
          input.businessName,
          input.industry,
          input.businessDescription,
          input.offerSummary,
          input.services.join(" "),
        ].join(" ")
      : [
          input.siteName,
          input.siteType,
          input.description,
          input.features,
          input.smartBrief?.offeringsText,
        ].join(" ");

  return (
    (Object.entries(INDUSTRY_PROFILES).find(([key, profile]) => (
      key !== "general" && profile.keywords.test(haystack)
    ))?.[0] as IndustryKey | undefined) ?? "general"
  );
}

export function inferDefaultPages(input: BusinessBrief | SiteBrief): string[] {
  const provided = "businessName" in input ? input.pages : input.pages;
  if (provided.length > 0) return dedupeStrings(provided, 8);
  return INDUSTRY_PROFILES[inferIndustryKey(input)].defaultPages;
}

export function inferOfferingsType(input: BusinessBrief | SiteBrief): string {
  const industry = inferIndustryKey(input);
  if (industry === "restaurant") return "menu";
  if (industry === "commerce") return "products";
  if (industry === "portfolio") return "portfolio";
  return INDUSTRY_PROFILES[industry].serviceSection;
}

export function getIndustryTrustSignals(input: BusinessBrief | SiteBrief): string[] {
  return INDUSTRY_PROFILES[inferIndustryKey(input)].trustSignals;
}

export function getIndustryDesignCues(input: BusinessBrief | SiteBrief): string[] {
  return INDUSTRY_PROFILES[inferIndustryKey(input)].designCues;
}

export function getIndustryHierarchyRules(input: BusinessBrief | SiteBrief): string[] {
  return INDUSTRY_PROFILES[inferIndustryKey(input)].hierarchyRules;
}

export function getIndustryCopyRules(input: BusinessBrief | SiteBrief): string[] {
  return INDUSTRY_PROFILES[inferIndustryKey(input)].copyRules;
}

export function getIndustryHeroApproaches(input: BusinessBrief | SiteBrief): string[] {
  return INDUSTRY_PROFILES[inferIndustryKey(input)].heroApproaches;
}

export function formatIndustryPlaybook(input: BusinessBrief | SiteBrief): string {
  const profile = getIndustryProfile(input);
  return [
    `Industry lens: ${profile.label}`,
    `Structural cues: ${summarizeList(profile.designCues)}`,
    `Hierarchy rules: ${summarizeList(profile.hierarchyRules)}`,
    `Copy rules: ${summarizeList(profile.copyRules)}`,
    `Trust signals: ${summarizeList(profile.trustSignals)}`,
  ].join("\n");
}

function resolvePageRule(input: BusinessBrief | SiteBrief, pageName: string): IndustryPageRule | null {
  const industry = inferIndustryKey(input);
  const lowered = pageName.trim().toLowerCase();
  const industryRule = INDUSTRY_PAGE_SECTION_RULES[industry]?.find((rule) => rule.test.test(lowered));
  if (industryRule) return industryRule;
  return BASE_PAGE_RULES.find((rule) => rule.test.test(lowered)) ?? null;
}

export function buildSuggestedSections(
  input: BusinessBrief | SiteBrief,
  pageName: string
): string[] {
  const lowered = pageName.trim().toLowerCase();
  const profile = INDUSTRY_PROFILES[inferIndustryKey(input)];
  const pageRule = resolvePageRule(input, pageName);

  const base =
    lowered === "home"
      ? profile.homepageSections
      : pageRule?.sections ?? ["navbar", "hero", profile.serviceSection, "cta", "footer"];

  const merged = dedupeStrings(base, 10);
  if (!merged.includes("navbar")) merged.unshift("navbar");
  if (!merged.includes("footer")) merged.push("footer");
  return merged;
}

export function buildPageStoryArc(
  input: BusinessBrief | SiteBrief,
  pageName: string,
  sectionTypes: string[]
): string {
  const rule = resolvePageRule(input, pageName);
  if (rule) {
    return `${rule.arc} Sequence: ${rule.sections.join(" -> ")}.`;
  }

  const offer = readOfferSummary(input) || "the main offer";
  const differentiator = readDifferentiator(input) || "what makes the business credible";
  const goal = readPrimaryGoal(input);
  const orderedSections = sectionTypes.length ? sectionTypes.join(" -> ") : "hero -> proof -> CTA";
  return `Open by clarifying ${offer}, build confidence around ${differentiator}, then guide the visitor toward ${goal}. Sequence: ${orderedSections}.`;
}

export function buildPageRhythmPlan(
  input: BusinessBrief | SiteBrief,
  pageName: string,
  sectionTypes: string[]
): string {
  const industry = inferIndustryKey(input);
  const sequence = sectionTypes.join(" -> ");

  if (/home/i.test(pageName)) {
    switch (industry) {
      case "automotive":
        return `Open cinematically, tighten into showroom clarity, compress the trust layer, then close with a decisive booking cue. Sequence: ${sequence}.`;
      case "restaurant":
      case "hospitality":
        return `Start with atmosphere, move into curated highlights, keep utility moments compact, and end with a refined booking close. Sequence: ${sequence}.`;
      case "saas":
        return `Move from immediate product clarity into workflow proof, compress evidence, then reopen the page for pricing and conversion. Sequence: ${sequence}.`;
      case "agency":
        return `Open with point of view, tighten into capabilities, expand again for case evidence, then compress the close into a confident enquiry moment. Sequence: ${sequence}.`;
      case "portfolio":
        return `Lead with authored voice, let selected work breathe, then move into a more intimate proof-and-contact close. Sequence: ${sequence}.`;
      case "local":
        return `Front-load reassurance and service clarity, keep descriptive sections shorter than proof or contact moments, and bring utility forward early. Sequence: ${sequence}.`;
      default:
        return `Alternate one expansive statement section with one tighter proof or decision section so the page never settles into a flat rhythm. Sequence: ${sequence}.`;
    }
  }

  return `Let the ${pageName} page move between expansive explanation and tighter utility moments instead of keeping every section at the same visual tempo. Sequence: ${sequence}.`;
}

export function buildPageCtaStrategy(
  input: BusinessBrief | SiteBrief,
  pageName: string,
  sectionTypes: string[]
): string {
  const goal = readPrimaryGoal(input);
  const industry = inferIndustryKey(input);
  const hasFinalCta = sectionTypes.includes("cta") || sectionTypes.includes("reservation") || sectionTypes.includes("contact");

  if (/contact|reservation|book|visit/i.test(pageName)) {
    return `Use one immediate action near the top, keep support details close by, and avoid repeating full CTA banners once the direct contact path is visible. Main goal: ${goal}.`;
  }

  if (/home/i.test(pageName)) {
    switch (industry) {
      case "automotive":
        return `Lead with availability or booking intent in the hero, keep any mid-page action attached to the fleet story or concierge reassurance, and reserve the strongest booking close for the final CTA after proof. Main goal: ${goal}.`;
      case "restaurant":
      case "hospitality":
        return `Open with a reservation or visit cue in the hero, bring the action back only after signature highlights or atmosphere proof, and let the final booking block close the page near hours or location details. Main goal: ${goal}.`;
      case "saas":
        return `Use the hero for the main demo action, let product and integration sections offer lower-friction exploration, and save the strongest conversion close for pricing or the final CTA after proof. Main goal: ${goal}.`;
      case "agency":
      case "portfolio":
        return `Keep the hero CTA present but restrained, use proof or selected work as the mid-page bridge, and ask for contact most directly only after the visitor has seen clear evidence of taste or results. Main goal: ${goal}.`;
      case "local":
        return `Use a direct call or enquiry action in the hero, repeat the contact path once trust is established, and avoid decorative CTA banners once the practical contact section is visible. Main goal: ${goal}.`;
      default:
        break;
    }
  }

  if (hasFinalCta) {
    return `Place the strongest CTA in the hero, use one lighter bridge action only after proof or offer clarity, and let the final ${sectionTypes.includes("cta") ? "CTA section" : sectionTypes.includes("reservation") ? "reservation section" : "contact section"} deliver the decisive close. Main goal: ${goal}.`;
  }

  return `Use one clear hero action and one quieter supporting action later in the page only if it helps the visitor commit to ${goal}.`;
}

export function buildPageKeyMoments(input: BusinessBrief | SiteBrief, pageName: string): string[] {
  const rule = resolvePageRule(input, pageName);
  if (rule) return dedupeStrings(rule.keyMoments, 6);

  const moments = [
    readOfferSummary(input),
    readDifferentiator(input),
    readLocation(input),
    readPrimaryGoal(input),
  ];

  return dedupeStrings(moments.filter(Boolean), 6);
}

export function buildSectionBlueprintSeed(
  input: BusinessBrief | SiteBrief,
  pageName: string,
  type: string,
  seed: string
): SectionBlueprintSeed {
  const industry = inferIndustryKey(input);
  const profile = INDUSTRY_PROFILES[industry];
  const overridePreset = profile.sectionOverrides[type];
  const mergedPreset = mergePreset(BASE_SECTION_PRESETS[type], overridePreset);
  const businessName = readBusinessName(input) || "the brand";
  const offer = readOfferSummary(input) || "the offer";
  const audience = readAudience(input) || "the audience";
  const primaryGoal = readPrimaryGoal(input);
  const contextSeed = `${industry}:${pageName}:${type}:${seed}`;

  const defaultPurpose =
    type === "hero"
      ? `Introduce ${businessName}, clarify ${offer}, and make ${primaryGoal.toLowerCase()} feel immediate.`
      : `Move the ${pageName} page forward by making the ${type} section specific and useful.`;

  const hierarchy = pickGroup(
    overridePreset?.hierarchy?.length ? overridePreset.hierarchy : mergedPreset.hierarchy,
    `${contextSeed}:hierarchy`,
    ["section label", "headline", "supporting copy", "primary action"]
  );
  const contentKeys = pickGroup(
    overridePreset?.contentKeys?.length ? overridePreset.contentKeys : mergedPreset.contentKeys,
    `${contextSeed}:content`,
    ["offer", "proof", "cta"]
  );

  const mediaBriefs = dedupeStrings([
    ...(mergedPreset.mediaBriefs ?? []),
    type === "hero" ? profile.heroApproaches[0] || "" : "",
    "businessName" in input && input.assets.logo.status !== "missing" && /navbar|hero|footer/i.test(type)
      ? "Use the supplied logo or wordmark as a real part of the section hierarchy."
      : "",
    "businessName" in input ? input.styleDirection[0] || input.brand.mood[0] || "" : "",
    audience ? `Design for ${audience}.` : "",
  ], 6);

  return {
    variation: pickSentence(
      overridePreset?.variations?.length
        ? overridePreset.variations
        : type === "hero"
        ? dedupeStrings([...profile.heroApproaches, ...(mergedPreset.variations ?? [])], 12)
        : mergedPreset.variations,
      `${contextSeed}:variation`,
      type === "hero"
        ? pickHeroVariation(contextSeed, input)
        : pickSectionVariation(type, contextSeed, input)
    ),
    compositionMode: pickSentence(
      overridePreset?.compositionModes?.length ? overridePreset.compositionModes : mergedPreset.compositionModes,
      `${contextSeed}:composition`,
      type === "hero"
        ? "editorial split composition with one dominant visual and one decisive message cluster"
        : `authored ${type} composition with one dominant content lane and one supporting lane`
    ),
    spacingProfile: pickSentence(
      overridePreset?.spacingProfiles?.length ? overridePreset.spacingProfiles : mergedPreset.spacingProfiles,
      `${contextSeed}:spacing`,
      type === "hero"
        ? "heroic opening with visibly more breathing room than the sections below"
        : type === "cta" || type === "footer"
        ? "chapter-close spacing with a quieter landing"
        : "measured spacing with one clear focal cluster and strong negative space around it"
    ),
    surfaceStyle: pickSentence(
      overridePreset?.surfaceStyles?.length ? overridePreset.surfaceStyles : mergedPreset.surfaceStyles,
      `${contextSeed}:surface`,
      type === "testimonial" || type === "cta"
        ? "contrast surface that isolates the section from the surrounding rhythm"
        : "refined tonal surface with minimal visual noise"
    ),
    ctaPlacement: pickSentence(
      overridePreset?.ctaPlacements?.length ? overridePreset.ctaPlacements : mergedPreset.ctaPlacements,
      `${contextSeed}:cta-placement`,
      type === "hero"
        ? "keep the primary action close to the headline and supporting copy"
        : type === "services" || type === "products"
        ? "place the action after the visitor understands the hierarchy of offers"
        : type === "testimonial"
        ? "use the CTA as a bridge at the end of the proof sequence"
        : type === "cta"
        ? "make the primary action the visual anchor of the whole block"
        : "use actions sparingly and only where they sharpen the section's job"
    ),
    contrastWithPrevious: pickSentence(
      overridePreset?.contrastWithPrevious?.length ? overridePreset.contrastWithPrevious : mergedPreset.contrastWithPrevious,
      `${contextSeed}:contrast`,
      type === "hero"
        ? "establish a stronger opening than anything that follows"
        : "shift the page rhythm so this section does not repeat the shell or density of the section above"
    ),
    purpose: pickSentence(
      overridePreset?.purposes?.length ? overridePreset.purposes : mergedPreset.purposes,
      `${contextSeed}:purpose`,
      defaultPurpose
    ),
    layoutIdea: pickSentence(
      overridePreset?.layoutIdeas?.length ? overridePreset.layoutIdeas : mergedPreset.layoutIdeas,
      `${contextSeed}:layout`,
      `Use a ${type} composition that feels authored and distinct from neighboring sections.`
    ),
    emphasis: pickSentence(
      overridePreset?.emphases?.length ? overridePreset.emphases : mergedPreset.emphases,
      `${contextSeed}:emphasis`,
      type === "cta" ? "conversion momentum" : "strong hierarchy"
    ),
    visualHook: pickSentence(
      overridePreset?.visualHooks?.length ? overridePreset.visualHooks : mergedPreset.visualHooks,
      `${contextSeed}:visual`,
      `Give the ${type} section one composition move that visitors can remember.`
    ),
    interactionHint: pickSentence(
      overridePreset?.interactionHints?.length ? overridePreset.interactionHints : mergedPreset.interactionHints,
      `${contextSeed}:interaction`,
      "Use motion only where it reinforces hierarchy or readability."
    ),
    hierarchy,
    contentKeys,
    mediaBriefs,
    premiumDetails: dedupeStrings([
      ...(mergedPreset.premiumDetails ?? []),
      "Use fewer, stronger visual ideas instead of stacking many small decorative moves.",
      "Let whitespace and scale do as much work as color or cards.",
    ], 5),
  };
}

export function buildSectionName(type: string, seed: string): string {
  const options = SECTION_NAME_MAP[type] ?? [type.charAt(0).toUpperCase() + type.slice(1)];
  return pickByHash(options, `${type}:${seed}`);
}

export function buildPageSeed(pageName: string, brief: BusinessBrief | SiteBrief): string {
  const source =
    "businessName" in brief
      ? `${brief.businessName}:${brief.industry}:${pageName}`
      : `${brief.siteName}:${brief.siteType}:${pageName}`;
  return slugifyText(source);
}

export function pickHeroVariation(seed: string, input?: BusinessBrief | SiteBrief): string {
  const industrySpecific = input ? getIndustryProfile(input).sectionOverrides.hero?.variations ?? [] : [];
  const pool = input ? dedupeStrings([
    ...industrySpecific,
    ...getIndustryHeroApproaches(input),
    ...(BASE_SECTION_PRESETS.hero.variations ?? []),
  ], 12) : (BASE_SECTION_PRESETS.hero.variations ?? ["immersive-brand-story"]);
  return pickByHash(pool, seed);
}

export function pickSectionVariation(type: string, seed: string, input?: BusinessBrief | SiteBrief): string {
  const industrySpecific =
    input ? getIndustryProfile(input).sectionOverrides[type]?.variations ?? [] : [];
  const generic = GENERIC_SECTION_VARIATIONS[type] ?? BASE_SECTION_PRESETS[type]?.variations ?? [];
  const options = dedupeStrings([...industrySpecific, ...generic], 10);
  if (!options.length) {
    return `${type}-signature`;
  }
  return pickByHash(options, seed);
}

export function inferStyleKeywords(input: BusinessBrief | SiteBrief): string[] {
  if ("businessName" in input) {
    return dedupeStrings([
      ...cleanList(input.styleDirection),
      ...cleanList(input.brand.mood),
      input.tone,
    ], 8);
  }

  return dedupeStrings([
    input.tone,
    ...cleanList(input.colorPreference),
    ...cleanList(input.smartBrief?.stylePreference),
  ], 8);
}

export function buildPageTitle(pageName: string): string {
  return pageName.trim() || "Home";
}

export function buildSectionNarrativeNote(
  input: BusinessBrief | SiteBrief,
  pageName: string,
  type: string
): string {
  const businessName = readBusinessName(input) || "the brand";
  const offer = readOfferSummary(input) || "the offer";
  const goal = readPrimaryGoal(input);
  const location = readLocation(input);

  switch (type) {
    case "hero":
      return `${businessName} should feel unmistakable within seconds, with ${offer} and ${goal.toLowerCase()} clear immediately${location ? ` for ${location}` : ""}.`;
    case "services":
    case "products":
    case "menu":
      return `This section should help visitors understand what to choose first and why ${businessName} is compelling.`;
    case "testimonial":
    case "credentials":
    case "stats":
      return `This section should convert belief into trust using concrete proof, not filler praise.`;
    case "contact":
    case "reservation":
    case "cta":
      return `This section should make ${goal.toLowerCase()} feel low-friction and timely.`;
    default:
      return `This section should deepen the ${pageName} narrative without repeating the previous section's job.`;
  }
}

export function buildPageNarrativeSummary(input: BusinessBrief | SiteBrief, pageName: string): string {
  const businessName = readBusinessName(input) || "the business";
  const offer = readOfferSummary(input) || "the offer";
  const audience = readAudience(input) || "the right audience";
  return `${businessName} should present ${offer} in a way that feels immediately relevant to ${audience} on the ${pageName} page.`;
}
