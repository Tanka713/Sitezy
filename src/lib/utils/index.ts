import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SiteBlueprint } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function buildResponsiveOverrideScript(): string {
  return `<script>
    (function(){
      var KEY_ATTR = "data-sz-key";
      var TABLET_ATTR = "data-sz-rwd-tablet";
      var MOBILE_ATTR = "data-sz-rwd-mobile";
      var STYLE_ATTR = "data-sz-responsive-overrides";

      function decodeMap(value){
        if(!value) return null;
        try{
          var parsed = JSON.parse(decodeURIComponent(value));
          return parsed && typeof parsed === "object" ? parsed : null;
        }catch(error){
          return null;
        }
      }

      function toCssProp(prop){
        return String(prop || "")
          .replace(/[A-Z]/g, function(match){ return "-" + match.toLowerCase(); })
          .replace(/^webkit-/, "-webkit-");
      }

      function esc(value){
        if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
        return String(value).replace(/["\\\\]/g, "\\\\$&");
      }

      function ruleFor(key, map){
        if(!key || !map) return "";
        var css = "";
        Object.entries(map).forEach(function(entry){
          var prop = toCssProp(entry[0]);
          var value = entry[1];
          if(!prop || value === null || value === undefined || value === "") return;
          css += prop + ":" + String(value) + " !important;";
        });
        return css ? '[data-sz-key="' + esc(key) + '"]{' + css + '}' : "";
      }

      function collect(attrName){
        return Array.from(document.querySelectorAll("[" + KEY_ATTR + "][" + attrName + "]")).map(function(el){
          var key = el.getAttribute(KEY_ATTR);
          var map = decodeMap(el.getAttribute(attrName));
          return ruleFor(key, map);
        }).join("");
      }

      function refresh(){
        if(!document.head) return;
        var style = document.head.querySelector("style[" + STYLE_ATTR + "]");
        if(!style){
          style = document.createElement("style");
          style.setAttribute(STYLE_ATTR, "1");
          document.head.appendChild(style);
        }
        var tabletCss = collect(TABLET_ATTR);
        var mobileCss = collect(MOBILE_ATTR);
        style.textContent =
          (tabletCss ? "@media (max-width: 991px){" + tabletCss + "}" : "") +
          (mobileCss ? "@media (max-width: 767px){" + mobileCss + "}" : "");
      }

      window.__sitezyResponsive = { refresh: refresh };

      if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", refresh, { once: true });
      }else{
        refresh();
      }
    })();
  <\/script>`;
}

export function buildFullPageHtml(
  pageHtml: string,
  blueprint: SiteBlueprint | null,
  pageName: string,
  editorScript = "",
  globalCss = ""
): string {
  const headingFont = blueprint?.typography?.headingFont || "Inter";
  const bodyFont    = blueprint?.typography?.bodyFont    || "Inter";
  const colors = blueprint?.colorScheme;

  const googleFonts = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;500;600;700;800;900&family=${encodeURIComponent(bodyFont)}:wght@300;400;500;600&display=swap`;
  const responsiveOverrideScript = buildResponsiveOverrideScript();
  const embedFixScript = `<script>
    (function(){
      function fixYoutubeEmbeds(){
        var origin = "";
        try {
          origin = window.location.origin && window.location.origin !== "null"
            ? window.location.origin
            : (window.parent && window.parent.location ? window.parent.location.origin : "");
        } catch (error) {}

        document.querySelectorAll('iframe[src*="youtube.com/embed/"],iframe[src*="youtube-nocookie.com/embed/"]').forEach(function(frame){
          frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
          try {
            var src = frame.getAttribute("src") || "";
            var url = new URL(src, window.location.href);
            if (!url.searchParams.has("playsinline")) url.searchParams.set("playsinline", "1");
            if (!url.searchParams.has("rel")) url.searchParams.set("rel", "0");
            if (!url.searchParams.has("modestbranding")) url.searchParams.set("modestbranding", "1");
            if (origin && !url.searchParams.has("origin")) url.searchParams.set("origin", origin);
            var next = url.toString();
            if (next !== src) frame.setAttribute("src", next);
          } catch (error) {}
        });
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fixYoutubeEmbeds, { once: true });
      } else {
        fixYoutubeEmbeds();
      }
    })();
  <\/script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageName}${blueprint?.siteName ? ` — ${blueprint.siteName}` : ""}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${googleFonts}" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --primary:   ${colors?.primary   || "#7c3aed"};
      --secondary: ${colors?.secondary || "#2563eb"};
      --accent:    ${colors?.accent    || "#f59e0b"};
      --bg:        ${colors?.bg        || "#ffffff"};
      --text:      ${colors?.text      || "#111111"};
      --muted:     ${colors?.muted     || "#6b7280"};
      --border:    ${colors?.border    || "#e5e7eb"};
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: '${bodyFont}', system-ui, -apple-system, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: '${headingFont}', system-ui, sans-serif;
      line-height: 1.2;
    }
    a { color: var(--primary); }
    img { max-width: 100%; height: auto; display: block; }
    ::selection { background: var(--primary); color: white; }
    [data-sz-anim-in]:not([data-sz-anim-in="none"]) {
      animation-duration: var(--sz-anim-duration, 600ms);
      animation-delay: var(--sz-anim-delay, 0ms);
      animation-timing-function: var(--sz-anim-ease, cubic-bezier(0.22,1,0.36,1));
      animation-fill-mode: both;
      will-change: transform, opacity;
    }
    [data-sz-anim-in="fade-up"] { animation-name: sitezy-fade-up; }
    [data-sz-anim-in="fade-down"] { animation-name: sitezy-fade-down; }
    [data-sz-anim-in="fade-left"] { animation-name: sitezy-fade-left; }
    [data-sz-anim-in="fade-right"] { animation-name: sitezy-fade-right; }
    [data-sz-anim-in="zoom-in"] { animation-name: sitezy-zoom-in; }
    [data-sz-anim-in="zoom-out"] { animation-name: sitezy-zoom-out; }
    [data-sz-hover-fx]:not([data-sz-hover-fx="none"]) {
      transition:
        transform var(--sz-anim-duration, 280ms) var(--sz-anim-ease, cubic-bezier(0.22,1,0.36,1)),
        box-shadow var(--sz-anim-duration, 280ms) var(--sz-anim-ease, cubic-bezier(0.22,1,0.36,1)),
        filter var(--sz-anim-duration, 280ms) var(--sz-anim-ease, cubic-bezier(0.22,1,0.36,1)),
        opacity var(--sz-anim-duration, 280ms) var(--sz-anim-ease, cubic-bezier(0.22,1,0.36,1));
      will-change: transform, box-shadow, filter, opacity;
    }
    [data-sz-hover-fx="lift"]:hover {
      transform: var(--sz-hover-base-transform, translateZ(0px)) translateY(-6px);
      box-shadow: var(--sz-hover-base-shadow, none), 0 18px 36px rgba(0,0,0,0.14);
    }
    [data-sz-hover-fx="grow"]:hover {
      transform: var(--sz-hover-base-transform, translateZ(0px)) scale(1.03);
    }
    [data-sz-hover-fx="tilt"]:hover {
      transform: var(--sz-hover-base-transform, translateZ(0px)) rotate(-1.5deg) translateY(-3px);
    }
    [data-sz-hover-fx="glow"]:hover {
      box-shadow:
        var(--sz-hover-base-shadow, none),
        0 0 0 1px rgba(124,58,237,0.16),
        0 0 26px rgba(124,58,237,0.28);
    }
    [data-sz-hover-fx="soften"]:hover {
      filter: brightness(1.03) saturate(1.05);
    }
    .animate-fade-in { animation: sitezy-fade-in 700ms cubic-bezier(0.22,1,0.36,1) both; }
    .animate-fade-up { animation: sitezy-fade-up 700ms cubic-bezier(0.22,1,0.36,1) both; }
    .animate-fade-down { animation: sitezy-fade-down 700ms cubic-bezier(0.22,1,0.36,1) both; }
    .animate-fade-left { animation: sitezy-fade-left 700ms cubic-bezier(0.22,1,0.36,1) both; }
    .animate-fade-right { animation: sitezy-fade-right 700ms cubic-bezier(0.22,1,0.36,1) both; }
    .animate-zoom-in { animation: sitezy-zoom-in 700ms cubic-bezier(0.22,1,0.36,1) both; }
    .animate-zoom-out { animation: sitezy-zoom-out 700ms cubic-bezier(0.22,1,0.36,1) both; }
    .animate-float { animation: sitezy-float 5.6s ease-in-out infinite; }
    .animate-pulse-soft { animation: sitezy-pulse-soft 2.8s ease-in-out infinite; }
    .hover-lift { transition: transform 260ms cubic-bezier(0.22,1,0.36,1), box-shadow 260ms cubic-bezier(0.22,1,0.36,1); }
    .hover-lift:hover { transform: translateY(-6px); box-shadow: 0 18px 36px rgba(0,0,0,0.14); }
    .hover-grow { transition: transform 240ms cubic-bezier(0.22,1,0.36,1); }
    .hover-grow:hover { transform: scale(1.03); }
    @keyframes sitezy-fade-up {
      from { opacity: 0; transform: translate3d(0, 20px, 0); }
      to { opacity: 1; transform: translate3d(0, 0, 0); }
    }
    @keyframes sitezy-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes sitezy-fade-down {
      from { opacity: 0; transform: translate3d(0, -20px, 0); }
      to { opacity: 1; transform: translate3d(0, 0, 0); }
    }
    @keyframes sitezy-fade-left {
      from { opacity: 0; transform: translate3d(20px, 0, 0); }
      to { opacity: 1; transform: translate3d(0, 0, 0); }
    }
    @keyframes sitezy-fade-right {
      from { opacity: 0; transform: translate3d(-20px, 0, 0); }
      to { opacity: 1; transform: translate3d(0, 0, 0); }
    }
    @keyframes sitezy-zoom-in {
      from { opacity: 0; transform: scale(0.94); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes sitezy-zoom-out {
      from { opacity: 0; transform: scale(1.06); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes sitezy-float {
      0%,100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes sitezy-pulse-soft {
      0%,100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.84; transform: scale(0.985); }
    }
    @media (prefers-reduced-motion: reduce) {
      [data-sz-anim-in]:not([data-sz-anim-in="none"]) {
        animation: none !important;
      }
      [data-sz-hover-fx]:not([data-sz-hover-fx="none"]) {
        transition: none !important;
      }
      [data-sz-hover-fx]:not([data-sz-hover-fx="none"]):hover {
        transform: var(--sz-hover-base-transform, none) !important;
        box-shadow: var(--sz-hover-base-shadow, none) !important;
        filter: none !important;
      }
    }
  </style>
  ${globalCss ? `<style data-sitezy-global-css>\n${globalCss}\n  </style>` : ""}
</head>
<body>
${pageHtml}
${responsiveOverrideScript}
${embedFixScript}
${editorScript}
</body>
</html>`;
}

export function downloadBlob(
  content: string | Blob,
  filename: string,
  mimeType = "application/octet-stream"
) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export * from "./images";
