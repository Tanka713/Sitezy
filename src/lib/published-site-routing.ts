import type { ProjectPage } from "@/types";
import { buildPublishedPagePath } from "@/lib/publishing";

export function slugifyPageCandidate(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function normalizeInternalPageHref(href: string): string {
  let next = String(href || "").trim();
  if (!next) return "";
  if (/^(mailto:|tel:|javascript:)/i.test(next)) return "";
  if (next.startsWith("//")) return "";

  if (next.includes("://")) {
    try {
      const parsed = new URL(next, "http://sitezy.local");
      if (parsed.origin !== "http://sitezy.local") return "";
      next = `${parsed.pathname || ""}${parsed.search || ""}${parsed.hash || ""}`;
    } catch {
      return "";
    }
  }

  if (next.startsWith("./")) next = next.slice(2);

  const hashIndex = next.indexOf("#");
  if (hashIndex >= 0) next = next.slice(0, hashIndex);
  const queryIndex = next.indexOf("?");
  if (queryIndex >= 0) next = next.slice(0, queryIndex);

  next = next.trim();
  if (!next) return "/";

  if (!next.startsWith("/")) next = `/${next}`;
  if (next !== "/") next = next.replace(/\/+$/, "");

  if (/^\/pages\//i.test(next)) next = next.replace(/^\/pages\//i, "/");
  if (/\.html$/i.test(next)) next = next.replace(/\.html$/i, "");
  if (next === "/index") return "/";

  return next || "/";
}

export function buildPageAliasMap(pages: Array<{ id: string; name: string; slug: string }>): Record<string, string> {
  const slugMap: Record<string, string> = {};

  for (const page of pages) {
    const pageName = page.name.trim();
    const nameSlug = slugifyPageCandidate(pageName);
    if (page.slug) {
      const slug = slugifyPageCandidate(page.slug);
      slugMap[`/${slug}`] = page.id;
      slugMap[slug] = page.id;
      slugMap[`/${slug.toLowerCase()}`] = page.id;
      slugMap[slug.toLowerCase()] = page.id;
      slugMap[`/${slug}.html`] = page.id;
      slugMap[`${slug}.html`] = page.id;
      slugMap[`/pages/${slug}.html`] = page.id;
      slugMap[`/pages/${slug.toLowerCase()}.html`] = page.id;
    }
    slugMap[`/${nameSlug}`] = page.id;
    slugMap[nameSlug] = page.id;
    slugMap[pageName] = page.id;
    slugMap[pageName.toLowerCase()] = page.id;
    slugMap[`/${pageName}`] = page.id;
    slugMap[`/${pageName.toLowerCase()}`] = page.id;
  }

  const homePage = pages.find((page) => page.slug === "home" || page.name.toLowerCase() === "home");
  if (homePage) {
    slugMap["/"] = homePage.id;
    slugMap["index"] = homePage.id;
    slugMap["/index"] = homePage.id;
    slugMap["index.html"] = homePage.id;
    slugMap["/index.html"] = homePage.id;
    slugMap["/pages/index.html"] = homePage.id;
  }

  return slugMap;
}

export function resolvePageIdFromHref(href: string, slugMap: Record<string, string>): string | null {
  const normalized = normalizeInternalPageHref(href);
  if (!normalized) return null;
  let decoded = normalized;
  try {
    decoded = decodeURIComponent(normalized);
  } catch {}

  const candidates = [
    normalized,
    decoded,
    normalized.toLowerCase(),
    decoded.toLowerCase(),
    normalized.startsWith("/") ? normalized.slice(1) : normalized,
    decoded.startsWith("/") ? decoded.slice(1) : decoded,
    slugifyPageCandidate(normalized),
    slugifyPageCandidate(decoded),
    `/${slugifyPageCandidate(normalized)}`,
    `/${slugifyPageCandidate(decoded)}`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (slugMap[candidate]) return slugMap[candidate];
  }

  return null;
}

export function resolvePublishedPage(
  pages: ProjectPage[],
  pathname: string
): ProjectPage | null {
  if (!pages.length) return null;
  const slugMap = buildPageAliasMap(pages);
  const pageId = resolvePageIdFromHref(pathname || "/", slugMap);
  return (
    pages.find((page) => page.id === pageId) ??
    pages.find((page) => page.slug === "home" || page.name.toLowerCase() === "home") ??
    pages[0] ??
    null
  );
}

export function rewriteInternalPublishedLinks(html: string, pages: ProjectPage[]): string {
  const slugMap = buildPageAliasMap(pages);
  const pagePathForHref = (rawHref: string) => {
    const pageId = resolvePageIdFromHref(rawHref, slugMap);
    const page = pages.find((candidate) => candidate.id === pageId) ?? null;
    return page ? buildPublishedPagePath(page.slug || page.name) : null;
  };

  return html
    .replace(/\s(href|data-href)=(["'])(.*?)\2/gi, (full, attr, quote, rawHref) => {
      const nextPath = pagePathForHref(rawHref);
      return nextPath ? ` ${attr}=${quote}${nextPath}${quote}` : full;
    })
    .replace(/location\.href\s*=\s*(['"])([^'"]+)\1/gi, (full, quote, rawHref) => {
      const nextPath = pagePathForHref(rawHref);
      return nextPath ? `location.href=${quote}${nextPath}${quote}` : full;
    })
    .replace(/window\.location\.href\s*=\s*(['"])([^'"]+)\1/gi, (full, quote, rawHref) => {
      const nextPath = pagePathForHref(rawHref);
      return nextPath ? `window.location.href=${quote}${nextPath}${quote}` : full;
    })
    .replace(/location\.assign\(\s*(['"])([^'"]+)\1\s*\)/gi, (full, quote, rawHref) => {
      const nextPath = pagePathForHref(rawHref);
      return nextPath ? `location.assign(${quote}${nextPath}${quote})` : full;
    })
    .replace(/window\.location\.assign\(\s*(['"])([^'"]+)\1\s*\)/gi, (full, quote, rawHref) => {
      const nextPath = pagePathForHref(rawHref);
      return nextPath ? `window.location.assign(${quote}${nextPath}${quote})` : full;
    });
}

export function buildPublishedNavigationScript() {
  return `<script>
    (function(){
      function extractTargetHref(el){
        if(!el || !el.getAttribute) return "";
        var raw = el.getAttribute("data-href") || el.getAttribute("href") || "";
        if(raw) return raw;
        var onclick = el.getAttribute("onclick") || "";
        var match = onclick.match(/location\\.href\\s*=\\s*['"]([^'"]+)['"]/);
        if(match) return match[1];
        return "";
      }

      document.addEventListener("click", function(event){
        var anchor = event.target && event.target.closest ? event.target.closest("a") : null;
        if(anchor){
          var href = extractTargetHref(anchor);
          if(!href) return;
          if(/^(mailto:|tel:|javascript:)/i.test(href)) return;

          if(href.startsWith("#")){
            var id = href.slice(1);
            if(!id){
              event.preventDefault();
              return;
            }
            var target = document.getElementById(id) || document.querySelector('[data-sz-section-id="' + id + '"]');
            if(target){
              event.preventDefault();
              target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            return;
          }
          return;
        }

        var target = event.target && event.target.closest
          ? event.target.closest("button,[data-href]")
          : null;
        if(!target) return;

        var nextHref = extractTargetHref(target);
        if(!nextHref || /^(mailto:|tel:|javascript:)/i.test(nextHref)) return;
        if(nextHref.startsWith("#")){
          var nextId = nextHref.slice(1);
          var section = document.getElementById(nextId) || document.querySelector('[data-sz-section-id="' + nextId + '"]');
          if(section){
            event.preventDefault();
            section.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          return;
        }

        event.preventDefault();
        window.location.assign(nextHref);
      }, true);
    })();
  <\/script>`;
}
