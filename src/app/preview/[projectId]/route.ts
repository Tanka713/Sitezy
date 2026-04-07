import { NextRequest, NextResponse } from "next/server";
import { derivePageStateFromHtml } from "@/lib/editor/structure";
import { getProjectSnapshot } from "@/lib/server/project-db";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { buildFullPageHtml } from "@/lib/utils";
import type { ProjectPage } from "@/types";

export const runtime = "nodejs";

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

function slugifyPageCandidate(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeInternalPageHref(href: string): string {
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

function buildPageAliasMap(pages: Array<{ id: string; name: string; slug: string }>): Record<string, string> {
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

function resolvePageIdFromHref(href: string, slugMap: Record<string, string>): string | null {
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

function buildPreviewHref(projectId: string, pageId: string): string {
  return `/preview/${projectId}?page=${encodeURIComponent(pageId)}`;
}

function rewriteInternalPreviewLinks(html: string, projectId: string, pages: ProjectPage[]): string {
  const slugMap = buildPageAliasMap(pages);
  const toPreviewHref = (rawHref: string) => {
    const pageId = resolvePageIdFromHref(rawHref, slugMap);
    return pageId ? buildPreviewHref(projectId, pageId) : null;
  };

  return html
    .replace(/\s(href|data-href)=(["'])(.*?)\2/gi, (full, attr, quote, rawHref) => {
      const previewHref = toPreviewHref(rawHref);
      return previewHref ? ` ${attr}=${quote}${previewHref}${quote}` : full;
    })
    .replace(/location\.href\s*=\s*(['"])([^'"]+)\1/gi, (full, quote, rawHref) => {
      const previewHref = toPreviewHref(rawHref);
      return previewHref ? `location.href=${quote}${previewHref}${quote}` : full;
    })
    .replace(/window\.location\.href\s*=\s*(['"])([^'"]+)\1/gi, (full, quote, rawHref) => {
      const previewHref = toPreviewHref(rawHref);
      return previewHref ? `window.location.href=${quote}${previewHref}${quote}` : full;
    })
    .replace(/location\.assign\(\s*(['"])([^'"]+)\1\s*\)/gi, (full, quote, rawHref) => {
      const previewHref = toPreviewHref(rawHref);
      return previewHref ? `location.assign(${quote}${previewHref}${quote})` : full;
    })
    .replace(/window\.location\.assign\(\s*(['"])([^'"]+)\1\s*\)/gi, (full, quote, rawHref) => {
      const previewHref = toPreviewHref(rawHref);
      return previewHref ? `window.location.assign(${quote}${previewHref}${quote})` : full;
    });
}

function buildPreviewNavScript(projectId: string, pages: Array<{ id: string; name: string; slug: string }>) {
  const slugMap = buildPageAliasMap(pages);

  const script = `
    (function(){
      var slugMap = ${JSON.stringify(slugMap)};
      var base = ${JSON.stringify(`/preview/${projectId}`)};

      function resolvePageId(href){
        var next = String(href || "").trim();
        if(!next || /^(mailto:|tel:|javascript:)/i.test(next)) return null;
        if(next.startsWith("//")) return null;
        if(next.indexOf("://") > -1){
          try{
            var parsed = new URL(next, window.location.origin);
            if(parsed.origin !== window.location.origin) return null;
            next = (parsed.pathname || "") + (parsed.search || "") + (parsed.hash || "");
          }catch(error){
            return null;
          }
        }
        if(next.startsWith("./")){
          next = next.slice(2);
        }
        var hashIndex = next.indexOf("#");
        if(hashIndex >= 0) next = next.slice(0, hashIndex);
        var queryIndex = next.indexOf("?");
        if(queryIndex >= 0) next = next.slice(0, queryIndex);
        next = next.trim();
        if(!next) next = "/";
        if(!next.startsWith("/")) next = "/" + next;
        if(next !== "/") next = next.replace(/\/+$/, "");
        if(/^\/pages\//i.test(next)) next = next.replace(/^\/pages\//i, "/");
        if(/\.html$/i.test(next)) next = next.replace(/\.html$/i, "");
        if(next === "/index") next = "/";

        var decoded = next;
        try { decoded = decodeURIComponent(next); } catch(error) {}
        var slugify = function(value){
          return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\\s-]/g, "")
            .replace(/\\s+/g, "-")
            .replace(/-+/g, "-");
        };
        var candidates = [
          next,
          decoded,
          next.toLowerCase(),
          decoded.toLowerCase(),
          next.startsWith("/") ? next.slice(1) : next,
          decoded.startsWith("/") ? decoded.slice(1) : decoded,
          slugify(next),
          slugify(decoded),
          "/" + slugify(next),
          "/" + slugify(decoded),
        ].filter(Boolean);

        for(var i = 0; i < candidates.length; i += 1){
          if(slugMap[candidates[i]]) return slugMap[candidates[i]];
        }
        return null;
      }

      function navigateTo(pageId){
        if(!pageId) return;
        window.location.assign(base + "?page=" + encodeURIComponent(pageId));
      }

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
          var pageId = resolvePageId(href);
          if(pageId){
            event.preventDefault();
            event.stopPropagation();
            if(event.stopImmediatePropagation) event.stopImmediatePropagation();
            navigateTo(pageId);
          }
          return;
        }

        var button = event.target && event.target.closest
          ? event.target.closest('button,[data-href]')
          : null;
        if(!button) return;

        var buttonHref = extractTargetHref(button);
        if(!buttonHref) return;

        var targetPageId = resolvePageId(buttonHref);
        if(targetPageId){
          event.preventDefault();
          event.stopPropagation();
          if(event.stopImmediatePropagation) event.stopImmediatePropagation();
          navigateTo(targetPageId);
        }
      }, true);
    })();
  `;

  return `<script>${script.replace(/<\/script>/gi, "<\\/script>")}<\/script>`;
}

function notFoundHtml(message: string) {
  return `<!doctype html><html><head><meta charset="utf-8" /><title>Preview unavailable</title><style>html,body{height:100%;margin:0;background:#05070b;color:#dce3ef;font:14px/1.5 Inter,system-ui,sans-serif}body{display:flex;align-items:center;justify-content:center;padding:24px}.card{max-width:520px;border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:rgba(255,255,255,0.03);padding:24px 26px}.eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.38)}h1{margin:12px 0 8px;font-size:26px;line-height:1.1}p{margin:0;color:rgba(255,255,255,0.58)}</style></head><body><div class="card"><div class="eyebrow">Preview</div><h1>Preview unavailable</h1><p>${message}</p></div></body></html>`;
}

export async function GET(request: NextRequest, { params }: { params: { projectId: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const snapshot = await getProjectSnapshot(params.projectId, user.id);
  if (!snapshot) {
    return htmlResponse(notFoundHtml("This project could not be found for your account."), 404);
  }

  const requestedPageId = request.nextUrl.searchParams.get("page");
  const pages = snapshot.project.pages ?? [];
  const activePage =
    pages.find((page) => page.id === requestedPageId) ??
    pages.find((page) => page.slug === "home" || page.name.toLowerCase() === "home") ??
    pages[0] ??
    null;

  if (!activePage) {
    return htmlResponse(notFoundHtml("This project does not have any pages yet."), 404);
  }

  const normalized = derivePageStateFromHtml(
    rewriteInternalPreviewLinks(activePage.html, snapshot.project.id, pages),
    activePage.sections
  );
  const html = buildFullPageHtml(
    normalized.html,
    snapshot.project.blueprint ?? null,
    activePage.name,
    buildPreviewNavScript(snapshot.project.id, pages)
  );

  return htmlResponse(html);
}
