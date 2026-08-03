import type {
  ProjectPage,
  ProjectPageCmsBinding,
  ProjectPageMeta,
  ProjectPageSeoSettings,
} from "@/types";

function normalizeDescription(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 320);
}

function normalizeAbsoluteUrl(value: unknown) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).toString().replace(/\/+$/, "");
  } catch {
    return trimmed.slice(0, 500);
  }
}

export function buildDefaultProjectPageSeo(page?: Partial<ProjectPage>): ProjectPageSeoSettings {
  const title = String(page?.name ?? "").trim() || "Untitled Page";
  const description =
    normalizeDescription(page?.purpose) ||
    `Explore ${title}.`;

  return {
    title,
    description,
    ogImageUrl: "",
    canonicalUrl: "",
    noindex: false,
  };
}

export function normalizeProjectPageSeo(
  input: unknown,
  page?: Partial<ProjectPage>
): ProjectPageSeoSettings {
  const raw = typeof input === "object" && input ? (input as Partial<ProjectPageSeoSettings>) : {};
  const defaults = buildDefaultProjectPageSeo(page);

  return {
    title: String(raw.title ?? defaults.title).trim() || defaults.title,
    description: normalizeDescription(raw.description ?? defaults.description) || defaults.description,
    ogImageUrl: normalizeAbsoluteUrl(raw.ogImageUrl),
    canonicalUrl: normalizeAbsoluteUrl(raw.canonicalUrl),
    noindex: Boolean(raw.noindex),
  };
}

export function normalizeProjectPageCmsBinding(input: unknown): ProjectPageCmsBinding | null {
  const raw = typeof input === "object" && input ? (input as Partial<ProjectPageCmsBinding>) : null;
  const collectionId = String(raw?.collectionId ?? "").trim();
  if (!collectionId) return null;

  const fieldMapping =
    raw?.fieldMapping && typeof raw.fieldMapping === "object" && !Array.isArray(raw.fieldMapping)
      ? Object.fromEntries(
          Object.entries(raw.fieldMapping).map(([key, value]) => [key, String(value ?? "").trim()])
        )
      : {};

  return {
    collectionId,
    collectionSlug: typeof raw?.collectionSlug === "string" && raw.collectionSlug.trim()
      ? raw.collectionSlug.trim()
      : null,
    itemLimit:
      typeof raw?.itemLimit === "number" && Number.isFinite(raw.itemLimit) && raw.itemLimit > 0
        ? Math.trunc(raw.itemLimit)
        : null,
    targetNodeId:
      typeof raw?.targetNodeId === "string" && raw.targetNodeId.trim()
        ? raw.targetNodeId.trim()
        : null,
    detailPageId:
      typeof raw?.detailPageId === "string" && raw.detailPageId.trim()
        ? raw.detailPageId.trim()
        : null,
    detailSlugParam:
      typeof raw?.detailSlugParam === "string" && raw.detailSlugParam.trim()
        ? raw.detailSlugParam.trim()
        : "slug",
    fieldMapping,
    seoFieldMapping: {
      title:
        typeof raw?.seoFieldMapping?.title === "string" && raw.seoFieldMapping.title.trim()
          ? raw.seoFieldMapping.title.trim()
          : null,
      description:
        typeof raw?.seoFieldMapping?.description === "string" && raw.seoFieldMapping.description.trim()
          ? raw.seoFieldMapping.description.trim()
          : null,
      ogImageUrl:
        typeof raw?.seoFieldMapping?.ogImageUrl === "string" && raw.seoFieldMapping.ogImageUrl.trim()
          ? raw.seoFieldMapping.ogImageUrl.trim()
          : null,
    },
  };
}

export function normalizeProjectPageMeta(
  input: unknown,
  page?: Partial<ProjectPage>
): ProjectPageMeta {
  const raw = typeof input === "object" && input ? (input as Partial<ProjectPageMeta>) : {};
  return {
    pageKind:
      raw.pageKind === "cms_listing" || raw.pageKind === "cms_detail"
        ? raw.pageKind
        : "static",
    seo: raw.seo ? normalizeProjectPageSeo(raw.seo, page) : null,
    cmsBinding: normalizeProjectPageCmsBinding(raw.cmsBinding),
    approvalStatus:
      raw.approvalStatus === "in_review" || raw.approvalStatus === "approved"
        ? raw.approvalStatus
        : "draft",
    shareTitle:
      typeof raw.shareTitle === "string" && raw.shareTitle.trim()
        ? raw.shareTitle.trim()
        : null,
  };
}
