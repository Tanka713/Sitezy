const DEFAULT_PUBLISH_DOMAIN = "sitezy.ai";

export function normalizeHostname(value: string | null | undefined): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";

  let next = raw;
  if (next.includes("://")) {
    try {
      next = new URL(next).hostname;
    } catch {
      next = next.split("://").pop() ?? next;
    }
  }

  next = next.split("/")[0] ?? next;
  next = next.split("?")[0] ?? next;
  next = next.split("#")[0] ?? next;
  next = next.replace(/:\d+$/, "");
  next = next.replace(/^\.+|\.+$/g, "");
  return next;
}

export function getPublishDomain(): string {
  const configured = normalizeHostname(process.env.NEXT_PUBLIC_SITEZY_PUBLISH_DOMAIN);
  return configured || DEFAULT_PUBLISH_DOMAIN;
}

export function slugifySiteToken(value: string | null | undefined, fallback = "site"): string {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

export function normalizePublishedPath(pathname: string | null | undefined): string {
  const raw = String(pathname ?? "").trim();
  if (!raw || raw === "/") return "/";

  let next = raw;
  if (next.includes("://")) {
    try {
      const parsed = new URL(next, "https://sitezy.local");
      next = `${parsed.pathname || ""}${parsed.search || ""}${parsed.hash || ""}`;
    } catch {
      return "/";
    }
  }

  if (!next.startsWith("/")) next = `/${next}`;
  return next;
}

export function buildPublishedPagePath(slug: string | null | undefined): string {
  const normalized = slugifySiteToken(slug, "home");
  return normalized === "home" || normalized === "index" ? "/" : `/${normalized}`;
}

export function buildSitezyHostname(subdomain: string): string {
  return `${slugifySiteToken(subdomain)}.${getPublishDomain()}`;
}

export function buildSitezyPublishedUrl(subdomain: string, pathname = "/"): string {
  return `https://${buildSitezyHostname(subdomain)}${normalizePublishedPath(pathname)}`;
}

export function buildLocalPublishedPath(subdomain: string, pathname = "/"): string {
  const nextPath = normalizePublishedPath(pathname);
  return `/live/${encodeURIComponent(slugifySiteToken(subdomain))}${nextPath === "/" ? "" : nextPath}`;
}

export function isLocalDevHost(hostname: string | null | undefined): boolean {
  const normalized = normalizeHostname(hostname);
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "0.0.0.0";
}

export function isAppHost(hostname: string | null | undefined): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return true;

  const publishDomain = getPublishDomain();
  return (
    normalized === publishDomain ||
    normalized === `www.${publishDomain}` ||
    isLocalDevHost(normalized) ||
    normalized.endsWith(".vercel.app")
  );
}

export function isSitezySubdomainHost(hostname: string | null | undefined): boolean {
  const normalized = normalizeHostname(hostname);
  const publishDomain = getPublishDomain();
  return Boolean(normalized) && normalized.endsWith(`.${publishDomain}`) && !isAppHost(normalized);
}

export function extractSitezySubdomain(hostname: string | null | undefined): string | null {
  const normalized = normalizeHostname(hostname);
  if (!normalized || !isSitezySubdomainHost(normalized)) return null;
  const suffix = `.${getPublishDomain()}`;
  return normalized.slice(0, -suffix.length) || null;
}

export function isPotentialPublishedHost(hostname: string | null | undefined): boolean {
  const normalized = normalizeHostname(hostname);
  return Boolean(normalized) && !isAppHost(normalized);
}

export function resolvePublishedHref(subdomain: string, pathname = "/"): string {
  if (typeof window !== "undefined") {
    const host = normalizeHostname(window.location.hostname);
    if (isLocalDevHost(host) || host.endsWith(".vercel.app")) {
      return buildLocalPublishedPath(subdomain, pathname);
    }
  }
  return buildSitezyPublishedUrl(subdomain, pathname);
}
