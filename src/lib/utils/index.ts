import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SiteBlueprint } from "@/types";
import type { ResolvedSeoMeta } from "@/lib/seo";

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

/**
 * Extracts the full outer HTML of the first top-level <nav> or <header> element
 * from a page HTML string, correctly handling nested tags of the same type.
 * The lazy regex `/<nav[\s\S]*?<\/nav>/i` breaks when a navbar has a nested <nav>
 * (e.g. mobile menu) — it stops at the first closing tag.
 * This function counts open/close tags to find the true matching close tag.
 */
export function extractNavbarHtml(html: string): string | null {
  return extractTopLevelTag(html, "nav") ?? extractTopLevelTag(html, "header");
}

function extractTopLevelTag(html: string, tag: string): string | null {
  const openRe  = new RegExp(`<${tag}[\\s>]`, "gi");
  const closeRe = new RegExp(`<\\/${tag}>`, "gi");

  openRe.lastIndex  = 0;
  closeRe.lastIndex = 0;

  const firstOpen = openRe.exec(html);
  if (!firstOpen) return null;

  let depth = 1;
  let pos = firstOpen.index + firstOpen[0].length;

  while (depth > 0 && pos < html.length) {
    openRe.lastIndex  = pos;
    closeRe.lastIndex = pos;

    const nextOpen  = openRe.exec(html);
    const nextClose = closeRe.exec(html);

    if (!nextClose) break; // malformed HTML

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      pos = nextOpen.index + nextOpen[0].length;
    } else {
      depth--;
      pos = nextClose.index + nextClose[0].length;
    }
  }

  if (depth !== 0) return null; // unbalanced
  return html.slice(firstOpen.index, pos);
}

export function formatDate(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return "Unknown";

  const month = MONTH_LABELS[parsed.getMonth()] ?? "";
  const day = parsed.getDate();
  const year = parsed.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function formatShortDateTime(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  const month = MONTH_LABELS[parsed.getMonth()] ?? "";
  const day = parsed.getDate();
  const hours24 = parsed.getHours();
  const minutes = parsed.getMinutes().toString().padStart(2, "0");
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${month} ${day}, ${hours12}:${minutes} ${meridiem}`;
}

export function formatSupportTicketNumber(ticketNumber?: number | null): string {
  return typeof ticketNumber === "number" && Number.isFinite(ticketNumber)
    ? `ST-${ticketNumber}`
    : "Ticket pending";
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

function buildNavbarFlowGuardScript(): string {
  return `<script>
    (function(){
      function firstNavbar(){
        return document.querySelector('body > nav[data-sz-section-type="navbar"], body > header[data-sz-section-type="navbar"], body > nav, body > header');
      }

      function firstContentSibling(nav){
        var el = nav ? nav.nextElementSibling : null;
        while(el && (el.tagName === "SCRIPT" || el.tagName === "STYLE")) el = el.nextElementSibling;
        return el;
      }

      function adjust(){
        var nav = firstNavbar();
        var next = firstContentSibling(nav);
        if(!nav || !next) return;

        var nextStyle = window.getComputedStyle(next);
        if(!next.hasAttribute("data-sitezy-base-padding-top")){
          next.setAttribute("data-sitezy-base-padding-top", nextStyle.paddingTop || "0px");
        }
        if(!next.hasAttribute("data-sitezy-base-scroll-margin-top")){
          next.setAttribute("data-sitezy-base-scroll-margin-top", nextStyle.scrollMarginTop || "0px");
        }

        var basePaddingTop = parseFloat(next.getAttribute("data-sitezy-base-padding-top") || "0") || 0;
        var baseScrollMarginTop = parseFloat(next.getAttribute("data-sitezy-base-scroll-margin-top") || "0") || 0;

        next.style.paddingTop = basePaddingTop + "px";
        next.style.scrollMarginTop = baseScrollMarginTop > 0 ? baseScrollMarginTop + "px" : "";

        var navStyle = window.getComputedStyle(nav);
        var navRect = nav.getBoundingClientRect();
        var nextRect = next.getBoundingClientRect();
        var navHeight = Math.ceil(navRect.height);
        var overlap = Math.ceil(navRect.bottom - nextRect.top);

        if(navHeight <= 0) return;

        var scrollPadding = Math.max(baseScrollMarginTop, navHeight + 16);
        document.documentElement.style.scrollPaddingTop = scrollPadding + "px";
        next.style.scrollMarginTop = scrollPadding + "px";

        if(navStyle.position === "fixed" || overlap > 0){
          var requiredOffset = Math.max(navHeight, overlap, 0);
          if(requiredOffset > 0){
            next.style.paddingTop = basePaddingTop + requiredOffset + "px";
          }
        }
      }

      if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", adjust, { once: true });
      }else{
        adjust();
      }

      window.addEventListener("load", adjust);
      window.addEventListener("resize", adjust);
      if(document.fonts && document.fonts.ready){
        document.fonts.ready.then(adjust).catch(function(){});
      }
    })();
  <\/script>`;
}

function buildWidgetRuntimeScript(): string {
  return `<script>
    (function(){
      function widgetMeta(root){
        if(!root || !root.getAttribute) return null;
        var kind = root.getAttribute("data-sz-widget-kind");
        if(!kind) return null;
        var state = {};
        try {
          var parsed = JSON.parse(root.getAttribute("data-sz-widget-state") || "{}");
          if(parsed && typeof parsed === "object" && !Array.isArray(parsed)){
            Object.keys(parsed).forEach(function(key){
              state[key] = String(parsed[key] ?? "");
            });
          }
        } catch (error) {}
        return { root: root, kind: kind, state: state };
      }

      function widgetPart(root, key){
        if(!root || !root.querySelectorAll) return null;
        var matches = root.querySelectorAll('[data-sz-widget-part="' + key + '"]');
        for(var i = 0; i < matches.length; i += 1){
          var match = matches[i];
          if(match && match.closest && match.closest("[data-sz-widget-kind]") === root) return match;
        }
        return null;
      }

      function widgetText(root, key, value){
        var node = widgetPart(root, key);
        if(node) node.textContent = String(value ?? "");
      }

      function widgetNumber(value, fallback, min, max){
        var parsed = parseFloat(String(value ?? ""));
        if(!isFinite(parsed)) parsed = fallback;
        if(typeof min === "number") parsed = Math.max(min, parsed);
        if(typeof max === "number") parsed = Math.min(max, parsed);
        return parsed;
      }

      function syncCountdown(root, state){
        widgetText(root, "days-label", state.labelDays || "Days");
        widgetText(root, "hours-label", state.labelHours || "Hours");
        widgetText(root, "minutes-label", state.labelMinutes || "Mins");
        widgetText(root, "seconds-label", state.labelSeconds || "Secs");

        var targetRaw = String(state.targetDate || "").trim();
        var target = targetRaw ? new Date(targetRaw) : null;
        var targetMs = target && isFinite(target.getTime()) ? target.getTime() : NaN;
        var diff = isFinite(targetMs) ? Math.max(0, targetMs - Date.now()) : 0;
        var totalSeconds = Math.floor(diff / 1000);
        var days = Math.floor(totalSeconds / 86400);
        var hours = Math.floor((totalSeconds % 86400) / 3600);
        var minutes = Math.floor((totalSeconds % 3600) / 60);
        var seconds = totalSeconds % 60;

        widgetText(root, "days-value", String(days).padStart(2, "0"));
        widgetText(root, "hours-value", String(hours).padStart(2, "0"));
        widgetText(root, "minutes-value", String(minutes).padStart(2, "0"));
        widgetText(root, "seconds-value", String(seconds).padStart(2, "0"));
      }

      function syncWidget(root){
        var meta = widgetMeta(root);
        if(!meta) return;
        var state = meta.state || {};

        if(meta.kind === "progress-bar"){
          var percent = Math.round(widgetNumber(state.percent, 75, 0, 100));
          widgetText(root, "label", state.label || "Progress");
          widgetText(root, "value", state.value || String(percent) + "%");
          var fill = widgetPart(root, "fill");
          if(fill && fill.style) fill.style.width = percent + "%";
          return;
        }

        if(meta.kind === "counter-stat"){
          widgetText(root, "value", state.value || "99%");
          widgetText(root, "label", state.label || "Customer satisfaction");
          return;
        }

        if(meta.kind === "notification"){
          widgetText(root, "title", state.title || "New message");
          widgetText(root, "message", state.message || "You have 3 unread messages");
          widgetText(root, "time", state.time || "now");
          return;
        }

        if(meta.kind === "rating"){
          var stars = Math.round(widgetNumber(state.stars, 5, 1, 5));
          var starsEl = widgetPart(root, "stars");
          if(starsEl){
            var existingStar = starsEl.querySelector && starsEl.querySelector("svg");
            var starColor = existingStar ? window.getComputedStyle(existingStar).fill : window.getComputedStyle(starsEl).color;
            starsEl.innerHTML = Array.from({ length: 5 }).map(function(_, index){
              return '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="' + (index < stars ? "1" : "0.22") + '" stroke="none" style="width:18px;height:18px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
            }).join("");
            starsEl.style.color = starColor || "currentColor";
          }
          widgetText(root, "score", state.score || "4.9");
          widgetText(root, "reviews", state.reviews || "2,400 reviews");
          return;
        }

        if(meta.kind === "countdown"){
          syncCountdown(root, state);
          return;
        }

        if(meta.kind === "avatar-group"){
          widgetText(root, "extra", state.extra || "+9");
          widgetText(root, "label", state.label || "Join 200+ happy customers");
          return;
        }

        if(meta.kind === "navbar" || meta.kind === "navbar-center" || meta.kind === "navbar-minimal"){
          widgetText(root, "brand", state.brand || "Brand");
          widgetText(root, "cta-label", state.ctaLabel || (meta.kind === "navbar-center" ? "Get started" : "Book a call"));
          return;
        }

        if(meta.kind === "hero"){
          widgetText(root, "eyebrow", state.eyebrow || "New launch");
          widgetText(root, "title", state.title || "Built for clarity.");
          widgetText(root, "accent", state.accent || "Designed to convert.");
          widgetText(root, "body", state.body || "Describe what makes this project stand out.");
          widgetText(root, "primary-label", state.primaryLabel || "Get started");
          widgetText(root, "secondary-label", state.secondaryLabel || "View work");
          return;
        }

        if(meta.kind === "hero-split"){
          widgetText(root, "title", state.title || "Brand");
          widgetText(root, "accent", state.accent || "for bold brands.");
          widgetText(root, "body", state.body || "Describe what makes this project stand out.");
          widgetText(root, "primary-label", state.primaryLabel || "Get started");
          widgetText(root, "secondary-label", state.secondaryLabel || "Learn more");
          return;
        }

        if(meta.kind === "section"){
          widgetText(root, "title", state.title || "New section title");
          widgetText(root, "body", state.body || "A flexible section for a focused message, feature, or proof point.");
          return;
        }

        if(meta.kind === "container"){
          widgetText(root, "body", state.body || "Flexible container for grouped content.");
          return;
        }

        if(meta.kind === "columns"){
          widgetText(root, "title", state.title || "Two-column layout");
          widgetText(root, "body", state.body || "Use this for content paired with supporting detail, stats, or a call to action.");
          widgetText(root, "aside-eyebrow", state.asideEyebrow || "Quick note");
          widgetText(root, "aside-body", state.asideBody || "Ideal for a short highlight, metric, or supporting takeaway.");
          return;
        }

        if(meta.kind === "split-image"){
          widgetText(root, "eyebrow", state.eyebrow || "Feature");
          widgetText(root, "title", state.title || "Content that converts on sight");
          widgetText(root, "body", state.body || "Pair a strong visual with a focused message and a clear next step.");
          widgetText(root, "cta-label", state.ctaLabel || "Learn more →");
          return;
        }

        if(meta.kind === "footer"){
          widgetText(root, "brand", state.brand || "Brand");
          widgetText(root, "tagline", state.tagline || "Describe what makes this project stand out.");
          return;
        }

        if(meta.kind === "footer-columns"){
          widgetText(root, "brand", state.brand || "Brand");
          widgetText(root, "tagline", state.tagline || "Describe what makes this project stand out.");
          widgetText(root, "copyright", state.copyright || "© 2026 Brand. All rights reserved.");
          return;
        }

        if(meta.kind === "contact"){
          widgetText(root, "title", state.title || "Get in touch");
          widgetText(root, "body", state.body || "We'd love to hear from you. Fill out the form or reach us directly.");
          widgetText(root, "button-label", state.buttonLabel || "Send message");
          return;
        }

        if(meta.kind === "features"){
          widgetText(root, "title", state.title || "Core features");
          widgetText(root, "subtitle", state.subtitle || "Highlight the capabilities or differentiators that matter most.");
          return;
        }

        if(meta.kind === "testimonial"){
          var personName = String(state.name || "Sarah Johnson").trim();
          var derivedInitials = String(state.initial || "").trim() || personName.split(/\s+/).filter(Boolean).slice(0, 2).map(function(part){
            return part.charAt(0).toUpperCase();
          }).join("") || "SJ";
          widgetText(root, "quote", state.quote || "Working with Sitezy brought clarity, speed, and a stronger presence across every touchpoint.");
          widgetText(root, "name", personName || "Sarah Johnson");
          widgetText(root, "role", state.role || "Founder, Sitezy");
          widgetText(root, "initial", derivedInitials);
          return;
        }

        if(meta.kind === "gallery"){
          widgetText(root, "eyebrow", state.eyebrow || "Gallery");
          widgetText(root, "title", state.title || "Show the work visually");
          widgetText(root, "body", state.body || "Images inherit the site framing, radius, and shadow system.");
          return;
        }

        if(meta.kind === "features-list"){
          widgetText(root, "title", state.title || "Everything you need");
          widgetText(root, "subtitle", state.subtitle || "A complete toolkit built to help you move fast and look great.");
          return;
        }

        if(meta.kind === "cta-strip"){
          widgetText(root, "title", state.title || "Ready to get started?");
          widgetText(root, "body", state.body || "Join thousands of teams already using Sitezy.");
          widgetText(root, "button-label", state.buttonLabel || "Start free →");
          return;
        }

        if(meta.kind === "newsletter"){
          widgetText(root, "title", state.title || "Stay in the loop");
          widgetText(root, "body", state.body || "Get insights, product updates, and resources delivered to your inbox.");
          var input = widgetPart(root, "placeholder");
          if(input && input.setAttribute) input.setAttribute("placeholder", String(state.placeholder || "Your email address"));
          widgetText(root, "button-label", state.buttonLabel || "Subscribe");
          widgetText(root, "note", state.note || "No spam. Unsubscribe any time.");
          return;
        }

        if(meta.kind === "comparison"){
          widgetText(root, "title", state.title || "How we compare");
          widgetText(root, "subtitle", state.subtitle || "See how Sitezy stacks up against the alternatives.");
          widgetText(root, "feature-label", state.featureLabel || "Feature");
          widgetText(root, "primary-label", state.primaryLabel || "Sitezy");
          widgetText(root, "secondary-label", state.secondaryLabel || "Competitor A");
          widgetText(root, "tertiary-label", state.tertiaryLabel || "Competitor B");
          return;
        }

        if(meta.kind === "blog-grid"){
          widgetText(root, "title", state.title || "From the blog");
          widgetText(root, "subtitle", state.subtitle || "Insights, guides, and updates from the team.");
          return;
        }

        if(meta.kind === "gallery-masonry"){
          widgetText(root, "title", state.title || "Our work");
          widgetText(root, "subtitle", state.subtitle || "A flexible masonry wall for project imagery, case-study screenshots, or editorial moments.");
          return;
        }

        if(meta.kind === "pricing-toggle"){
          widgetText(root, "title", state.title || "Choose your pace");
          widgetText(root, "subtitle", state.subtitle || "Give visitors a clearer choice between monthly flexibility and yearly savings.");
          widgetText(root, "monthly-label", state.monthlyLabel || "Monthly");
          widgetText(root, "yearly-label", state.yearlyLabel || "Yearly");
          return;
        }

        if(meta.kind === "modal-popup"){
          widgetText(root, "button-label", state.buttonLabel || "Open modal");
          widgetText(root, "eyebrow", state.eyebrow || "Popup");
          widgetText(root, "title", state.title || "Quick announcement");
          widgetText(root, "body", state.body || "Use this modal for gated updates, promo messages, feature announcements, or a focused call to action without leaving the page.");
          widgetText(root, "primary-label", state.primaryLabel || "Primary action");
          widgetText(root, "secondary-label", state.secondaryLabel || "Dismiss");
        }
      }

      function syncAll(){
        document.querySelectorAll("[data-sz-widget-kind]").forEach(function(node){
          syncWidget(node);
        });
      }

      function start(){
        syncAll();
        window.setInterval(function(){
          document.querySelectorAll('[data-sz-widget-kind="countdown"]').forEach(function(node){
            syncWidget(node);
          });
        }, 1000);
      }

      if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", start, { once: true });
      }else{
        start();
      }
    })();
  <\/script>`;
}

export function buildFullPageHtml(
  pageHtml: string,
  blueprint: SiteBlueprint | null,
  pageName: string,
  editorScript = "",
  globalCss = "",
  seo: ResolvedSeoMeta | null = null
): string {
  const headingFont = blueprint?.typography?.headingFont || "Inter";
  const bodyFont    = blueprint?.typography?.bodyFont    || "Inter";
  const colors = blueprint?.colorScheme;

  const googleFonts = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;500;600;700;800;900&family=${encodeURIComponent(bodyFont)}:wght@300;400;500;600&display=swap`;
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const resolvedTitle = seo?.title?.trim() || `${pageName}${blueprint?.siteName ? ` — ${blueprint.siteName}` : ""}`;
  const descriptionMeta = seo?.description?.trim()
    ? `<meta name="description" content="${escapeHtml(seo.description.trim())}" />`
    : "";
  const canonicalMeta = seo?.canonicalUrl?.trim()
    ? `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl.trim())}" />`
    : "";
  const robotsMeta = seo?.noindex ? `<meta name="robots" content="noindex, nofollow" />` : "";
  const openGraphMeta = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(resolvedTitle)}" />`,
    seo?.description?.trim() ? `<meta property="og:description" content="${escapeHtml(seo.description.trim())}" />` : "",
    seo?.canonicalUrl?.trim() ? `<meta property="og:url" content="${escapeHtml(seo.canonicalUrl.trim())}" />` : "",
    seo?.ogImageUrl?.trim() ? `<meta property="og:image" content="${escapeHtml(seo.ogImageUrl.trim())}" />` : "",
    `<meta name="twitter:card" content="${seo?.ogImageUrl?.trim() ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(resolvedTitle)}" />`,
    seo?.description?.trim() ? `<meta name="twitter:description" content="${escapeHtml(seo.description.trim())}" />` : "",
    seo?.ogImageUrl?.trim() ? `<meta name="twitter:image" content="${escapeHtml(seo.ogImageUrl.trim())}" />` : "",
  ]
    .filter(Boolean)
    .join("\n  ");
  const responsiveOverrideScript = buildResponsiveOverrideScript();
  const navbarFlowGuardScript = buildNavbarFlowGuardScript();
  const widgetRuntimeScript = buildWidgetRuntimeScript();
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
  <title>${escapeHtml(resolvedTitle)}</title>
  ${descriptionMeta}
  ${canonicalMeta}
  ${robotsMeta}
  ${openGraphMeta}
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
    [data-sz-hover-lock="1"] {
      animation: none !important;
    }
    [data-sz-hover-lock="1"] * {
      animation: none !important;
      transition: none !important;
      transform: none !important;
      box-shadow: none !important;
      filter: none !important;
    }
    [data-sz-motion-lock="1"] * {
      animation: none !important;
      transition: none !important;
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
    [data-sz-logo-scroller="1"],
    [class^="mq-"],
    [class*=" mq-"] {
      position: relative;
      overflow: hidden;
    }
    [data-sz-logo-track="1"],
    [class^="mq-"] .track,
    [class*=" mq-"] .track {
      display: flex;
      align-items: center;
      gap: 18px;
      width: max-content;
      animation: sitezy-logo-marquee 22s linear infinite;
    }
    [data-sz-logo-track="1"] > *,
    [class^="mq-"] .track > *,
    [class*=" mq-"] .track > * {
      flex: 0 0 auto;
    }
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
    @keyframes sitezy-logo-marquee {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
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
      [data-sz-logo-track="1"],
      [class^="mq-"] .track,
      [class*=" mq-"] .track {
        animation: none !important;
      }
    }
  </style>
  ${globalCss ? `<style data-sitezy-global-css>\n${globalCss}\n  </style>` : ""}
</head>
<body>
${pageHtml}
${responsiveOverrideScript}
${navbarFlowGuardScript}
${widgetRuntimeScript}
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
