import type { Project, ProjectPage, ProjectSeoSettings } from "@/types";

export interface ResolvedSeoMeta {
  title: string;
  description: string;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
}

function slugifyToken(value: string | null | undefined, fallback: string): string {
  const normalized = (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeAbsoluteUrl(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  try {
    return stripTrailingSlash(new URL(trimmed).toString());
  } catch {
    return "";
  }
}

function normalizeDescription(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 320);
}

export function buildDefaultProjectSeo(project?: Partial<Project>): ProjectSeoSettings {
  const fallbackTitle =
    String(project?.brief?.siteName ?? "").trim() ||
    String(project?.name ?? "").trim() ||
    "Untitled Project";
  const fallbackDescription =
    normalizeDescription(project?.brief?.description) || "Generated with Sitezy.";

  return {
    siteTitle: fallbackTitle,
    siteDescription: fallbackDescription,
    ogImageUrl: "",
    canonicalUrl: "",
    noindex: false,
  };
}

export function normalizeProjectSeo(input: unknown, project?: Partial<Project>): ProjectSeoSettings {
  const raw = typeof input === "object" && input ? (input as Partial<ProjectSeoSettings>) : {};
  const defaults = buildDefaultProjectSeo(project);

  return {
    siteTitle: String(raw.siteTitle ?? defaults.siteTitle).trim() || defaults.siteTitle,
    siteDescription: normalizeDescription(raw.siteDescription ?? defaults.siteDescription) || defaults.siteDescription,
    ogImageUrl: normalizeAbsoluteUrl(raw.ogImageUrl),
    canonicalUrl: normalizeAbsoluteUrl(raw.canonicalUrl),
    noindex: Boolean(raw.noindex),
  };
}

export function buildSeoBaseUrl(project: Project, liveUrl?: string | null): string {
  const explicitCanonical = normalizeAbsoluteUrl(project.seo?.canonicalUrl);
  if (explicitCanonical) {
    return explicitCanonical;
  }

  const explicitLive = normalizeAbsoluteUrl(liveUrl);
  if (explicitLive) {
    return explicitLive;
  }

  const publishedLive = normalizeAbsoluteUrl(project.publishedSite?.liveUrl);
  if (publishedLive) {
    return publishedLive;
  }

  return `https://${slugifyToken(project.name || project.brief.siteName, "site")}.sitezy.ai`;
}

export function buildProjectPagePath(page: ProjectPage): string {
  const slug = String(page.slug ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (!slug || slug === "home" || slug === "index") return "/";
  return `/${slug}`;
}

export function resolveProjectPageSeo(
  project: Project,
  page: ProjectPage,
  liveUrl?: string | null
): ResolvedSeoMeta {
  const siteTitle = String(project.seo?.siteTitle ?? "").trim() || project.name || project.brief.siteName || "Sitezy Site";
  const pageTitle =
    page.name.trim().toLowerCase() === "home" || buildProjectPagePath(page) === "/"
      ? siteTitle
      : `${page.name} — ${siteTitle}`;
  const description =
    normalizeDescription(project.seo?.siteDescription) ||
    normalizeDescription(project.brief.description) ||
    `Explore ${siteTitle}.`;
  const baseUrl = buildSeoBaseUrl(project, liveUrl);
  const canonicalUrl = `${baseUrl}${buildProjectPagePath(page) === "/" ? "" : buildProjectPagePath(page)}`;

  return {
    title: pageTitle,
    description,
    canonicalUrl,
    ogImageUrl: normalizeAbsoluteUrl(project.seo?.ogImageUrl) || null,
    noindex: Boolean(project.seo?.noindex),
  };
}

