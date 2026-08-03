import type { CmsCollection, CmsEntry, Project, ProjectPage } from "@/types";
import type { CmsRuntimeConfig } from "@/lib/cms-runtime";
import { resolvePublishedPage } from "@/lib/published-site-routing";
import { buildPublishedPagePath } from "@/lib/publishing";
import type { ResolvedSeoMeta } from "@/lib/seo";

function normalizePathname(pathname: string) {
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  const normalized = base.startsWith("/") ? base : `/${base}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
}

function buildCmsPublicBasePath(page: ProjectPage, collection: CmsCollection) {
  const rawBase =
    page.meta?.cmsBinding?.collectionSlug ||
    collection.slug ||
    page.slug ||
    page.name;
  return buildPublishedPagePath(rawBase);
}

function buildCmsDetailPath(basePath: string, slug: string) {
  const normalizedBase = normalizePathname(basePath);
  return `${normalizedBase === "/" ? "" : normalizedBase}/${String(slug || "").replace(/^\/+|\/+$/g, "")}`;
}

function mapRuntimeEntries(entries: CmsEntry[]) {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    slug: entry.slug,
    values: entry.values,
  }));
}

export function findBoundCollection(page: ProjectPage, collections: CmsCollection[]) {
  const binding = page.meta?.cmsBinding;
  if (!binding) return null;
  return (
    collections.find((collection) => collection.id === binding.collectionId) ??
    collections.find((collection) => collection.slug === binding.collectionSlug) ??
    null
  );
}

export function publishedEntries(collection: CmsCollection) {
  return collection.entries.filter((entry) => entry.status === "published");
}

function buildCmsSeoOverrides(page: ProjectPage, entry: CmsEntry): Partial<ResolvedSeoMeta> | null {
  const mapping = page.meta?.cmsBinding?.seoFieldMapping;
  if (!mapping) return null;

  const title = mapping.title ? entry.values[mapping.title] || entry.title : undefined;
  const description = mapping.description ? entry.values[mapping.description] || "" : undefined;
  const ogImageUrl = mapping.ogImageUrl ? entry.values[mapping.ogImageUrl] || "" : undefined;

  return {
    title: title || undefined,
    description: description || undefined,
    ogImageUrl: ogImageUrl || undefined,
  };
}

export function resolveProjectPagePublicPath(
  _project: Project,
  page: ProjectPage,
  collections: CmsCollection[]
) {
  if (page.meta?.pageKind === "cms_listing" || page.meta?.pageKind === "cms_detail") {
    const collection = findBoundCollection(page, collections);
    if (collection) {
      return buildCmsPublicBasePath(page, collection);
    }
  }
  return buildPublishedPagePath(page.slug || page.name);
}

function resolveCmsDetailPathTemplate(
  project: Project,
  page: ProjectPage,
  collection: CmsCollection,
  collections: CmsCollection[]
) {
  const detailPageId = page.meta?.cmsBinding?.detailPageId;
  if (detailPageId) {
    const detailPage = project.pages.find((candidate) => candidate.id === detailPageId) ?? null;
    if (detailPage) {
      const detailBasePath = resolveProjectPagePublicPath(project, detailPage, collections);
      return buildCmsDetailPath(detailBasePath, ":slug");
    }
  }

  return buildCmsDetailPath(buildCmsPublicBasePath(page, collection), ":slug");
}

function buildListingRuntimeConfig(
  project: Project,
  page: ProjectPage,
  collection: CmsCollection,
  collections: CmsCollection[]
): CmsRuntimeConfig {
  const basePath = buildCmsPublicBasePath(page, collection);

  return {
    mode: "listing",
    collectionId: collection.id,
    collectionSlug: collection.slug,
    publicBasePath: basePath,
    detailPathTemplate: resolveCmsDetailPathTemplate(project, page, collection, collections),
    fieldMapping: page.meta?.cmsBinding?.fieldMapping ?? {},
    itemLimit: page.meta?.cmsBinding?.itemLimit ?? null,
    entries: mapRuntimeEntries(publishedEntries(collection)),
    detailEntry: null,
  };
}

function buildDetailRuntimeConfig(page: ProjectPage, collection: CmsCollection, entry: CmsEntry): CmsRuntimeConfig {
  const basePath = buildCmsPublicBasePath(page, collection);
  return {
    mode: "detail",
    collectionId: collection.id,
    collectionSlug: collection.slug,
    publicBasePath: basePath,
    detailPathTemplate: buildCmsDetailPath(basePath, ":slug"),
    fieldMapping: page.meta?.cmsBinding?.fieldMapping ?? {},
    itemLimit: 1,
    entries: mapRuntimeEntries([entry]),
    detailEntry: {
      id: entry.id,
      title: entry.title,
      slug: entry.slug,
      values: entry.values,
    },
  };
}

export function resolveProjectRuntimePage(
  project: Project,
  pathname: string,
  collections: CmsCollection[]
): {
  page: ProjectPage | null;
  cmsRuntimeConfig: CmsRuntimeConfig | null;
  seoOverrides: Partial<ResolvedSeoMeta> | null;
} {
  const normalizedPath = normalizePathname(pathname || "/");

  for (const page of project.pages) {
    if (page.meta?.pageKind !== "cms_detail") continue;
    const collection = findBoundCollection(page, collections);
    if (!collection) continue;
    const basePath = buildCmsPublicBasePath(page, collection);
    if (normalizedPath === basePath || !normalizedPath.startsWith(`${basePath}/`)) continue;
    const slug = normalizedPath.slice(`${basePath}/`.length).split("/")[0] || "";
    const entry = publishedEntries(collection).find((candidate) => candidate.slug === slug);
    if (!entry) continue;
    return {
      page,
      cmsRuntimeConfig: buildDetailRuntimeConfig(page, collection, entry),
      seoOverrides: buildCmsSeoOverrides(page, entry),
    };
  }

  const directPage =
    project.pages.find((page) => resolveProjectPagePublicPath(project, page, collections) === normalizedPath) ??
    (normalizedPath === "/" ? resolvePublishedPage(project.pages ?? [], pathname) : null);
  if (!directPage) {
    return {
      page: null,
      cmsRuntimeConfig: null,
      seoOverrides: null,
    };
  }

  if (directPage.meta?.pageKind === "cms_listing") {
    const collection = findBoundCollection(directPage, collections);
    if (collection) {
      return {
        page: directPage,
        cmsRuntimeConfig: buildListingRuntimeConfig(project, directPage, collection, collections),
        seoOverrides: null,
      };
    }
  }

  if (directPage.meta?.pageKind === "cms_detail") {
    const collection = findBoundCollection(directPage, collections);
    const entry = collection ? publishedEntries(collection)[0] ?? null : null;
    if (collection && entry) {
      return {
        page: directPage,
        cmsRuntimeConfig: buildDetailRuntimeConfig(directPage, collection, entry),
        seoOverrides: buildCmsSeoOverrides(directPage, entry),
      };
    }
  }

  return {
    page: directPage,
    cmsRuntimeConfig: null,
    seoOverrides: null,
  };
}

export function buildPreviewPageRuntime(
  project: Project,
  page: ProjectPage,
  collections: CmsCollection[],
  preferredEntrySlug?: string | null
) {
  const collection = findBoundCollection(page, collections);
  if (!collection) {
    return {
      cmsRuntimeConfig: null,
      seoOverrides: null,
    };
  }

  if (page.meta?.pageKind === "cms_listing") {
    return {
      cmsRuntimeConfig: buildListingRuntimeConfig(project, page, collection, collections),
      seoOverrides: null,
    };
  }

  if (page.meta?.pageKind === "cms_detail") {
    const entry =
      publishedEntries(collection).find((candidate) => candidate.slug === preferredEntrySlug) ??
      publishedEntries(collection)[0] ??
      null;
    if (!entry) {
      return {
        cmsRuntimeConfig: null,
        seoOverrides: null,
      };
    }
    return {
      cmsRuntimeConfig: buildDetailRuntimeConfig(page, collection, entry),
      seoOverrides: buildCmsSeoOverrides(page, entry),
    };
  }

  return {
    cmsRuntimeConfig: null,
    seoOverrides: null,
  };
}
