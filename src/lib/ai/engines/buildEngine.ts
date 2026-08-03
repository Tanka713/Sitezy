import { getSiteImagePalette, formatPaletteForPrompt } from "@/lib/utils/images";
import type { BlueprintPage, SiteBlueprint, SiteBrief } from "@/types";
import { buildEditorCompatibleBlueprint, findCopyPagePlan, findLayoutPageBlueprint, findStrategyPagePlan } from "@/lib/ai/adapters/editorAdapter";
import { streamCompletion } from "@/lib/ai/runtime";
import { buildPageHtmlSystemPrompt, buildPageHtmlUserPrompt, type PageChromeReuse } from "@/lib/ai/prompts/build";
import type { SiteGenerationPlan } from "@/lib/ai/types";
import { dedupeStrings, logoUrlFromAsset } from "@/lib/ai/utils/normalize";
import {
  buildSubjectImageQuery,
  deriveImageSubject,
  fetchStockImage,
} from "@/lib/ai/utils/stock-images";

function shouldUseImages(brief: SiteBrief) {
  return !brief.imageStyle || brief.imageStyle === "photos" || brief.imageStyle === "illustrations";
}

async function buildImageGuide(plan: SiteGenerationPlan, pageId: string, brief: SiteBrief) {
  if (!shouldUseImages(brief)) {
    return "Do not use images. Build the page with typography, spacing, contrast, and layout alone.";
  }

  const paletteGuide = formatPaletteForPrompt(getSiteImagePalette(brief.siteType ?? plan.businessBrief.industry));
  const uploadedImages = plan.businessBrief.assets.images
    .filter((asset) => asset.url)
    .slice(0, 8);
  const uploadedImageGuide = uploadedImages.length
    ? [
        "Uploaded site images:",
        ...uploadedImages.map((asset, index) => {
          const label = asset.notes || asset.altText || asset.name || `Uploaded image ${index + 1}`;
          return `- ${label}: ${asset.url}`;
        }),
        "Use these uploaded image URLs first when imagery fits the section. Do not replace them with stock photos unless no uploaded image matches.",
      ].join("\n")
    : "";
  if (uploadedImageGuide) {
    return [
      paletteGuide,
      uploadedImageGuide,
      "Prioritize authentic uploaded imagery across hero, product, service, gallery, social proof, and about sections. Reuse images tastefully across pages when helpful.",
    ].join("\n\n");
  }

  const layoutPage = findLayoutPageBlueprint(plan, pageId);
  if (!layoutPage) {
    return [paletteGuide, uploadedImageGuide].filter(Boolean).join("\n\n");
  }

  // Queries lead with the business's actual subject (what it sells/does),
  // not the industry label — "insulated water bottle product close-up" finds
  // the product; "ecommerce product close-up" finds office clichés.
  const subject = deriveImageSubject({
    offering: plan.businessBrief.offerSummary,
    description: plan.businessBrief.businessDescription,
    industry: plan.businessBrief.industry,
    excludeName: plan.businessBrief.businessName,
  });
  const imageTasks = dedupeStrings(
    layoutPage.sections.flatMap((section) =>
      section.mediaBriefs.map((mediaBrief) => buildSubjectImageQuery(subject, mediaBrief))
    ),
    6
  );

  if (!imageTasks.length) {
    return [
      paletteGuide,
      uploadedImageGuide,
      "No stock image URLs are available. NEVER invent or guess external image URLs — compose imagery-free sections with color fields, sz-gradient-mesh backdrops, patterns and typography instead.",
    ].filter(Boolean).join("\n\n");
  }

  const resolved = await Promise.allSettled(imageTasks.map((query) => fetchStockImage(query)));
  const imageAssignments = resolved
    .map((result, index) => ({ query: imageTasks[index], url: result.status === "fulfilled" ? result.value : null }))
    .filter((entry): entry is { query: string; url: string } => !!entry.url)
    .slice(0, 6);

  if (!imageAssignments.length) {
    return [
      paletteGuide,
      uploadedImageGuide,
      "No stock image URLs are available. NEVER invent or guess external image URLs — compose imagery-free sections with color fields, sz-gradient-mesh backdrops, patterns and typography instead.",
    ].filter(Boolean).join("\n\n");
  }

  return [
    paletteGuide,
    uploadedImageGuide,
    "",
    "Image assignments (subject-matched to this business):",
    ...imageAssignments.map((entry) => `- ${entry.query}: ${entry.url}`),
    "Use these exact image URLs when imagery is needed. NEVER invent, modify, or substitute other external image URLs.",
  ].join("\n");
}

export function buildBlueprintFromPlan(brief: SiteBrief, plan: SiteGenerationPlan): SiteBlueprint {
  return buildEditorCompatibleBlueprint(brief, plan);
}

export async function buildPageHtmlFromPlan(
  plan: SiteGenerationPlan,
  page: BlueprintPage,
  brief: SiteBrief,
  onChunk?: (chunk: string, full: string) => void,
  instruction?: string | null,
  chrome?: PageChromeReuse | null
): Promise<string> {
  const strategyPage = findStrategyPagePlan(plan.strategy, page.id)
    ?? findStrategyPagePlan(plan.strategy, page.slug)
    ?? plan.strategy.pagePlans[0];
  const rawLayoutPage = findLayoutPageBlueprint(plan, page.id)
    ?? findLayoutPageBlueprint(plan, page.slug)
    ?? plan.layout.pages[0];
  const copyPage = findCopyPagePlan(plan, page.id)
    ?? findCopyPagePlan(plan, page.slug)
    ?? plan.copy.pages[0];
  const polishPage = plan.polish.pages.find((entry) => entry.pageId === rawLayoutPage.pageId) ?? null;

  // When reusing shared chrome, drop the navbar/footer sections from the layout
  // plan so the model doesn't plan or emit them — they're attached separately.
  const layoutPage = chrome && (chrome.reuseNavbar || chrome.reuseFooter)
    ? {
        ...rawLayoutPage,
        sections: rawLayoutPage.sections.filter((section) => {
          const type = (section.type || "").toLowerCase();
          if (chrome.reuseNavbar && (type === "navbar" || type === "nav" || type === "header")) return false;
          if (chrome.reuseFooter && type === "footer") return false;
          return true;
        }),
      }
    : rawLayoutPage;

  const imageGuide = await buildImageGuide(plan, layoutPage.pageId, brief);
  const system = buildPageHtmlSystemPrompt(plan, strategyPage, layoutPage, copyPage, polishPage, imageGuide, chrome);
  const user = `${buildPageHtmlUserPrompt(plan, strategyPage, layoutPage, copyPage)}${
    instruction ? `\n\nSpecial direction for this generation:\n${instruction}` : ""
  }`;

  return streamCompletion(system, user, (chunk, full) => {
    if (onChunk) onChunk(chunk, full);
  }, 9_000);
}

export function resolveLogoReference(brief: SiteBrief): string {
  return logoUrlFromAsset(brief.businessBrief?.assets.logo)
    || logoUrlFromAsset(brief.smartBrief?.logo)
    || brief.smartBrief?.logoUrl
    || "";
}
