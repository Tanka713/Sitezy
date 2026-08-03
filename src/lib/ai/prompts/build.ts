import type {
  CopyPagePlan,
  DesignPlan,
  LayoutPageBlueprint,
  PolishedPagePlan,
  SiteGenerationPlan,
  StrategyPagePlan,
} from "@/lib/ai/types";
import { formatCopyPage, formatDesignPlan, formatLayoutPage } from "@/lib/ai/prompts/shared";
import { formatIndustryPlaybook } from "@/lib/ai/utils/sectionRules";
import { logoUrlFromAsset, summarizeList } from "@/lib/ai/utils/normalize";
import { formatCreativeDnaForPrompt } from "@/lib/ai/creative-dna";
import { formatExamplesForPrompt } from "@/lib/server/generation-knowledge";
import { formatPatternForPrompt } from "@/lib/server/pattern-extractor";
import { formatWebInspirationForPrompt } from "@/lib/ai/web-inspiration";

export interface PageChromeReuse {
  reuseNavbar: boolean;
  reuseFooter: boolean;
  reference: string | null;
}

function buildChromeReuseInstructions(chrome: PageChromeReuse | null | undefined): string {
  if (!chrome || (!chrome.reuseNavbar && !chrome.reuseFooter)) return "";

  const lines: string[] = [
    "── Shared chrome reuse ──",
  ];
  if (chrome.reuseNavbar) {
    lines.push(
      "DO NOT generate a navbar/header — the site's existing navbar is attached automatically. Begin the page at the first real content section (e.g. the hero)."
    );
  }
  if (chrome.reuseFooter) {
    lines.push(
      "DO NOT generate a footer — the site's existing footer is attached automatically. End the page at the last content section before any footer."
    );
  }
  if (chrome.reference) {
    lines.push(
      "",
      "SHARED CHROME STYLE REFERENCE — MATCH IT EXACTLY:",
      "The new sections must visually belong to the same site as the chrome below. Match its button shape, border-radius, color usage, spacing scale, and typography precisely so the page feels seamless.",
      chrome.reference
    );
  }
  return lines.join("\n");
}

export function buildPageHtmlSystemPrompt(
  plan: SiteGenerationPlan,
  strategyPage: StrategyPagePlan,
  layoutPage: LayoutPageBlueprint,
  copyPage: CopyPagePlan,
  polishPage: PolishedPagePlan | null,
  imageGuide: string,
  chrome?: PageChromeReuse | null
): string {
  const logoUrl = logoUrlFromAsset(plan.businessBrief.assets.logo);
  const logoInstruction = logoUrl
    ? `Logo asset is available at ${logoUrl}. Use it meaningfully in navigation, hero, or footer branding when it strengthens the composition.`
    : plan.businessBrief.assets.logo.status === "missing"
    ? "No logo exists yet. Use a strong text-based brand treatment instead of an empty image."
    : "Logo status is unresolved. Prefer text branding unless an explicit logo URL is provided.";

  return [
    "You are Sitezy's build engine.",
    "Generate production-ready HTML for a single page body that works inside Sitezy's editor.",
    "Output ONLY raw HTML body content. No markdown, no explanation, no JSON.",
    "Every direct child section must include data-sz-section-id, data-sz-section-type, and data-sz-section-name.",
    'Use section ids in the form data-sz-section-id="sec-xxxxxxxx" with a unique 8 character suffix.',
    "data-sz-section-type must reflect the real section type such as navbar, hero, about, services, menu, products, testimonial, gallery, pricing, faq, contact, cta, or footer.",
    "data-sz-section-name must stay short and human-readable.",
    'The navbar must be ONE self-contained top-level element (e.g. <header data-sz-section-id="…" data-sz-section-type="navbar" …>) that contains the brand/logo, the page links and the CTA together — never split branding and links into separate top-level siblings, and never place the navbar inside the hero section. Same rule for the footer: one self-contained top-level element marked data-sz-section-type="footer".',
    "Never style any nav link as the active/current page (no underline, bold, or color treatment on the current page's link) — the same navbar is reused on every page, and the runtime marks the live page automatically via aria-current and the sz-nav-active class. Style all nav links identically at rest.",
    "Use semantic HTML, Tailwind utility classes, and editor-friendly text nodes.",
    "Never break page navigation, editor editability, or logo fallback handling.",
    "Do not use placeholder logos or broken images.",
    "Never use emojis or unicode icon glyphs — use the data-sz-icon system described under Premium execution.",
    "Make hierarchy obvious: one dominant idea per section, one clear supporting layer, then action or detail.",
    "Avoid back-to-back sections with the same shell, background treatment, or card rhythm.",
    "Favor editorial, premium composition over generic SaaS-template symmetry.",
    "Let spacing and negative space create cadence. Do not keep every section equally padded or equally dense.",
    "If one section uses cards or tiles heavily, the next section should change the composition language materially.",
    "Primary CTAs should feel intentionally placed, not sprayed through every section.",
    "Avoid obvious AI phrasing such as 'innovative solutions', 'cutting-edge', 'unlock', 'world-class', 'seamless', 'redefine', or 'tailored solutions'.",
    "About sections should feel authored and narrative-led, not like a centered paragraph stack.",
    "Services sections should express hierarchy between offers instead of repeating identical cards.",
    "Testimonial sections should use one lead proof moment plus supporting evidence rather than equal-weight quotes only.",
    "Do not default heroes to a centered headline, two buttons, and a generic image mockup.",
    "",
    "── Premium execution — Sitezy's render runtime ships these; opt in via classes and data-attributes. NEVER write <style> or <script> tags (they are stripped); use Tailwind utilities plus the sz-* classes and data-sz-* hooks below. ──",
    'Scroll motion: add data-sz-reveal to eyebrows, headings, lead text, cards, stats and media so they animate in on scroll. Pair with data-sz-anim-in="fade-up" | "fade-left" | "fade-right" | "zoom-in". Wrap grids/lists in a parent with data-sz-stagger (optional data-sz-stagger-step="90") so children cascade in sequence. On split layouts make the halves enter toward each other (fade-right on the left column, fade-left on the right).',
    'Hero entrance: when the design calls for a kinetic hero, put data-sz-words on the hero headline so its words cascade in on load (at most ONE element per page; do not combine with data-sz-reveal on the same element), and orchestrate eyebrow → lead → CTA below it with one data-sz-stagger sequence.',
    'Live numbers: wrap each key stat value in <span data-sz-count>1,250+</span> so it counts up from zero when scrolled into view. Keep the prefix/suffix (+, %, $) inside the span; reserve for 3–4 genuinely impressive metrics.',
    'Ambient motion: add sz-mesh-drift next to sz-gradient-mesh for a slowly drifting backdrop; float decorative blobs with animate-float; build infinite logo/keyword tickers as <div data-sz-logo-scroller="1"><div data-sz-logo-track="1">…content duplicated twice…</div></div>.',
    'Depth: use data-sz-parallax with data-sz-parallax-speed="0.15" ONLY on decorative hero/background media or gradient blobs — never on body text or on data-sz-reveal elements.',
    'Microinteractions: add data-sz-hover-fx="lift" | "grow" | "tilt" | "glow" to cards, tiles and buttons (buttons get press feedback automatically). Add the sz-spotlight class to feature cards for a pointer-tracked glow. Give navbar and inline text links the sz-link-underline class. Give every input/textarea the sz-field class for a soft brand-colored focus ring. Build FAQs as native <details>/<summary> with a data-sz-icon="arrow-down" chevron rotated via group-open:rotate-180.',
    'Icons: render every icon as <span data-sz-icon="name"></span>, sized via font-size (e.g. style="font-size:24px") or placed inside a sized rounded tile. Available names: arrow-right, arrow-up-right, arrow-down, check, check-circle, star, sparkles, zap, shield-check, rocket, lightbulb, target, trending-up, bar-chart, layers, code, cpu, globe, lock, gem, crown, flame, heart, users, user, briefcase, dollar-sign, credit-card, gift, leaf, coffee, utensils, shopping-bag, truck, headphones, smartphone, monitor, cloud, database, mail, phone, map-pin, clock, calendar, send, message-circle, quote, award, play, search, menu, settings, instagram, twitter, linkedin, facebook, youtube. For anything outside this set, inline a clean stroke SVG with stroke="currentColor".',
    'Surfaces: use sz-glass / sz-glass-dark for floating panels, sticky navbars and overlays; sz-gradient-mesh for atmospheric section backgrounds; sz-grain for tasteful film texture; sz-elev-1 / sz-elev-2 / sz-elev-3 for layered shadow depth; sz-gradient-text on a single accent phrase inside a headline.',
    'Typography: use sz-display for the hero headline, sz-fluid-h1 / sz-fluid-h2 / sz-fluid-h3 for section headings (fluid clamp scale), sz-eyebrow for kickers/labels, sz-lead for intro paragraphs. Headlines should be large and confident with tight leading.',
    "Composition: build depth through layering and overlap, lead with generous whitespace, favor asymmetric and editorial layouts over centered symmetry, and make the hero deliver its message plus primary action within the first 3 seconds — one dominant headline, one clear action, one striking visual.",
    "Readability: always keep text contrast high enough over glass, gradients, grain and imagery (add overlays or solid text panels where needed).",
    "",
    formatIndustryPlaybook(plan.businessBrief),
    "",
    formatCreativeDnaForPrompt(plan.businessBrief),
    "The design plan below executes this DNA. Where the plan is generic or ambiguous, the DNA wins — it is this brand's identity and the reason this site will not look like any other site.",
    "",
    formatDesignPlan(plan.design),
    "",
    // Research + self-learning context (always on): live industry research,
    // plus patterns and examples distilled from previously published,
    // user-accepted sites in this industry. In efficient mode this build
    // prompt is the only LLM call, so this is where research must land.
    plan.webInspiration ? formatWebInspirationForPrompt(plan.webInspiration) : "",
    plan.learnedPatterns ? formatPatternForPrompt(plan.learnedPatterns) : "",
    plan.retrievedExamples?.length ? formatExamplesForPrompt(plan.retrievedExamples) : "",
    "",
    `Business voice: ${summarizeList(plan.copy.voiceNotes)}`,
    `Business goals: ${summarizeList(plan.businessBrief.websiteGoals)}`,
    `Anti-repetition rules: ${summarizeList(plan.layout.antiRepetitionRules)}`,
    `Site-wide patterns: ${summarizeList(plan.layout.siteWidePatterns)}`,
    logoInstruction,
    polishPage
      ? `SEO direction: ${polishPage.seoTitle} / ${polishPage.seoDescription}`
      : "",
    polishPage
      ? `Accessibility: ${summarizeList(polishPage.accessibilityNotes)}`
      : "",
    polishPage
      ? `Motion: ${summarizeList(polishPage.animationHints)}`
      : "",
    strategyPage ? `Page conversion goal: ${strategyPage.conversionGoal}` : "",
    buildChromeReuseInstructions(chrome),
    imageGuide,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPageHtmlUserPrompt(
  plan: SiteGenerationPlan,
  strategyPage: StrategyPagePlan,
  layoutPage: LayoutPageBlueprint,
  copyPage: CopyPagePlan
): string {
  const sitePages = plan.layout.pages
    .map((page) => `${page.name} (${page.slug ? `/${page.slug}` : `/${page.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`})`)
    .join(", ");

  return [
    `Build the "${layoutPage.name}" page for ${plan.businessBrief.businessName}.`,
    `Site pages for navigation: ${sitePages || layoutPage.name}.`,
    "",
    strategyPage ? `Strategy:\n${summarizeList(strategyPage.keyMoments)}` : "",
    `Page rhythm plan: ${layoutPage.rhythmPlan}`,
    `CTA strategy: ${layoutPage.ctaStrategy}`,
    "",
    formatLayoutPage(layoutPage),
    "",
    formatCopyPage(copyPage),
    "",
    "Rules:",
    "- Use the exact section order from the layout page blueprint.",
    "- Make each section feel distinct in structure and pacing.",
    "- Apply the premium runtime vocabulary to execute each section: data-sz-reveal/-stagger for scroll motion, data-sz-words for the signature headline, data-sz-count for live stats, data-sz-hover-fx / sz-spotlight / sz-link-underline / sz-field for interactions, sz-glass / sz-gradient-mesh / sz-mesh-drift / sz-grain / sz-elev for surfaces and depth, sz-display / sz-fluid-* for type, and data-sz-icon for icons.",
    "- Vary the premium treatments per section so no two adjacent sections share the same surface, motion pattern and card rhythm.",
    "- Preserve a strong, edit-friendly text hierarchy.",
    "- Execute each section variation literally enough that the page layout changes, not just the copy.",
    "- Honor each section's composition mode, spacing profile, surface style, CTA placement, and contrast note.",
    "- Use the page rhythm plan to alternate expansive and compressed moments intentionally.",
    "- Keep CTA cadence disciplined: hero action, one mid-page bridge only when earned, then a final close.",
    "- If a logo exists, use it in the places where the layout concept calls for branding. If not, use text branding gracefully.",
    "- If you generate a navbar/header, its page navigation must use only the exact Site pages listed above. Do not invent About, Services, Work, Pricing, Blog, or Contact links unless those pages are in the Site pages list.",
    "- Include real href paths matching the Site pages list instead of hash anchors for page navigation.",
  ]
    .filter(Boolean)
    .join("\n");
}
