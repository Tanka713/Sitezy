import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LeadCaptureRuntimeConfig, ProjectPage, SiteBlueprint } from "@/types";
import { buildAnalyticsRuntimeMarkup, type PublicAnalyticsRuntimeConfig } from "@/lib/analytics-runtime";
import { buildCmsRuntimeScript, type CmsRuntimeConfig } from "@/lib/cms-runtime";
import { buildLeadCaptureRuntimeScript } from "@/lib/lead-capture-runtime";
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

export type ProjectNavigationLink = {
  label: string;
  href: string;
};

export function pageNavigationSlug(page: Pick<ProjectPage, "name" | "slug">): string {
  return slugify(page.slug || page.name || "page") || "page";
}

export function buildProjectPageNavigationLinks(
  pages: Array<Pick<ProjectPage, "id" | "name" | "slug">>,
  hrefForPage: (page: Pick<ProjectPage, "id" | "name" | "slug">, index: number, slug: string) => string
): ProjectNavigationLink[] {
  return pages
    .map((page, index) => {
      const slug = pageNavigationSlug(page);
      const label = String(page.name || page.slug || `Page ${index + 1}`).trim();
      const href = String(hrefForPage(page, index, slug) || "").trim();
      return label && href ? { label, href } : null;
    })
    .filter((link): link is ProjectNavigationLink => Boolean(link));
}

/**
 * Returns the start/end ranges of every element (any tag name) carrying
 * data-sz-section-type="<sectionType>", with the close tag resolved by
 * depth-counting that element's own tag name. The generation contract
 * guarantees chrome sections carry this marker, so it is the most reliable
 * way to capture the FULL navbar/footer block regardless of which tag the
 * model chose (<header>, <nav>, <section>, <div>, <footer>).
 */
function markedSectionRanges(html: string, sectionType: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const openMarkerRe = new RegExp(
    `<([a-z][a-z0-9]*)\\b[^>]*data-sz-section-type=["']${sectionType}["'][^>]*>`,
    "gi"
  );

  let searchFrom = 0;
  while (searchFrom < html.length) {
    openMarkerRe.lastIndex = searchFrom;
    const open = openMarkerRe.exec(html);
    if (!open) break;

    const tag = open[1].toLowerCase();
    const openRe = new RegExp(`<${tag}[\\s>]`, "gi");
    const closeRe = new RegExp(`<\\/${tag}>`, "gi");
    let depth = 1;
    let cur = open.index + open[0].length;

    while (depth > 0 && cur < html.length) {
      openRe.lastIndex = cur;
      closeRe.lastIndex = cur;
      const nextOpen = openRe.exec(html);
      const nextClose = closeRe.exec(html);
      if (!nextClose) { depth = -1; break; } // malformed HTML
      if (nextOpen && nextOpen.index < nextClose.index) {
        depth++;
        cur = nextOpen.index + nextOpen[0].length;
      } else {
        depth--;
        cur = nextClose.index + nextClose[0].length;
      }
    }

    if (depth !== 0) break; // unbalanced — stop scanning
    ranges.push({ start: open.index, end: cur });
    searchFrom = cur;
  }

  return ranges;
}

/**
 * Extracts the full outer HTML of the page's navbar block.
 *
 * Priority order matters: the data-sz-section-type="navbar" marker captures
 * the COMPLETE bar (brand + links + CTA + background wrapper). Falling back to
 * bare tags, <header> comes before <nav> — in generated markup <nav> is
 * usually just the inner link list of the real <header> bar, and extracting
 * it alone produced bare, inconsistent navbars on reused-chrome pages.
 * Depth-counting handles nested same-name tags (e.g. a mobile-menu <nav>).
 */
export function extractNavbarHtml(html: string): string | null {
  const marked = markedSectionRanges(html, "navbar")[0];
  if (marked) return html.slice(marked.start, marked.end);
  return extractTopLevelTag(html, "header") ?? extractTopLevelTag(html, "nav");
}

/**
 * Extracts the full outer HTML of the page's footer block, preferring the
 * data-sz-section-type="footer" marker (full block, any tag) and falling back
 * to the first top-level <footer> element.
 */
export function extractFooterHtml(html: string): string | null {
  const marked = markedSectionRanges(html, "footer")[0];
  if (marked) return html.slice(marked.start, marked.end);
  return extractTopLevelTag(html, "footer");
}

/**
 * Removes a leading element marked data-sz-section-type="<sectionType>" if the
 * HTML starts with it — covers models that emit their own navbar as a marked
 * <section>/<div> (which stripLeadingTag's nav/header passes miss).
 */
export function stripLeadingMarkedSection(html: string, sectionType: string): string {
  const first = markedSectionRanges(html, sectionType)[0];
  if (!first) return html;
  if (html.slice(0, first.start).trim() !== "") return html;
  return html.slice(first.end).replace(/^\s+/, "");
}

/**
 * Removes a trailing element marked data-sz-section-type="<sectionType>" if the
 * HTML ends with it — the footer counterpart of stripLeadingMarkedSection.
 */
export function stripTrailingMarkedSection(html: string, sectionType: string): string {
  const ranges = markedSectionRanges(html, sectionType);
  const last = ranges[ranges.length - 1];
  if (!last) return html;
  if (html.slice(last.end).trim() !== "") return html;
  return html.slice(0, last.start).replace(/\s+$/, "");
}

/**
 * Removes a leading top-level tag block (e.g. a reused <nav>) only if the HTML
 * actually starts with it (ignoring leading whitespace). Used to avoid emitting
 * a duplicate navbar when the shared chrome is attached separately.
 */
export function stripLeadingTag(html: string, tag: string): string {
  const ranges = topLevelTagRanges(html, tag);
  const first = ranges[0];
  if (!first) return html;
  if (html.slice(0, first.start).trim() !== "") return html;
  return html.slice(first.end).replace(/^\s+/, "");
}

/**
 * Removes a trailing top-level tag block (e.g. a reused <footer>) only if the
 * HTML actually ends with it (ignoring trailing whitespace).
 */
export function stripTrailingTag(html: string, tag: string): string {
  const ranges = topLevelTagRanges(html, tag);
  const last = ranges[ranges.length - 1];
  if (!last) return html;
  if (html.slice(last.end).trim() !== "") return html;
  return html.slice(0, last.start).replace(/\s+$/, "");
}

/**
 * Returns the start/end character ranges of every top-level (non-nested) tag of
 * the given name, correctly handling nested same-name tags via depth counting.
 */
function topLevelTagRanges(html: string, tag: string): Array<{ start: number; end: number }> {
  const openRe = new RegExp(`<${tag}[\\s>]`, "gi");
  const closeRe = new RegExp(`<\\/${tag}>`, "gi");
  const ranges: Array<{ start: number; end: number }> = [];

  let pos = 0;
  while (pos < html.length) {
    openRe.lastIndex = pos;
    const firstOpen = openRe.exec(html);
    if (!firstOpen) break;

    let depth = 1;
    let cur = firstOpen.index + firstOpen[0].length;

    while (depth > 0 && cur < html.length) {
      openRe.lastIndex = cur;
      closeRe.lastIndex = cur;
      const nextOpen = openRe.exec(html);
      const nextClose = closeRe.exec(html);
      if (!nextClose) break; // malformed HTML

      if (nextOpen && nextOpen.index < nextClose.index) {
        depth++;
        cur = nextOpen.index + nextOpen[0].length;
      } else {
        depth--;
        cur = nextClose.index + nextClose[0].length;
      }
    }

    if (depth !== 0) break; // unbalanced
    ranges.push({ start: firstOpen.index, end: cur });
    pos = cur;
  }

  return ranges;
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

function buildProjectNavigationRuntimeScript(links: ProjectNavigationLink[]): string {
  const normalizedLinks = links
    .map((link) => ({
      label: String(link.label || "").trim(),
      href: String(link.href || "").trim(),
    }))
    .filter((link) => link.label && link.href);

  if (normalizedLinks.length === 0) return "";

  const serializedLinks = JSON.stringify(normalizedLinks).replace(/</g, "\\u003c");

  return `<script>
    (function(){
      var pageLinks = ${serializedLinks};
      if(!pageLinks.length) return;

      function ready(fn){
        if(document.readyState === "loading"){
          document.addEventListener("DOMContentLoaded", fn, { once: true });
        }else{
          fn();
        }
      }

      function textOf(node){
        return String((node && (node.innerText || node.textContent)) || "").trim().replace(/\\s+/g, " ");
      }

      function normalizedText(value){
        return String(value || "").trim().toLowerCase().replace(/\\s+/g, " ");
      }

      var knownLabels = pageLinks.reduce(function(set, link){
        set[normalizedText(link.label)] = true;
        return set;
      }, {});

      function isExternalHref(href){
        var value = String(href || "").trim();
        return /^(mailto:|tel:|javascript:)/i.test(value) || value.indexOf("://") > -1 || value.indexOf("//") === 0;
      }

      function isExcludedInteractive(node){
        if(!node || !node.closest) return true;
        if(node.closest('[data-sz-navbar-cta="1"],[data-sz-nav-action="1"],[data-sz-widget-part="cta-url"],[data-sz-widget-part="cta-label"],[data-sz-widget-part="brand"],[data-sz-widget-brand-image="1"],[data-sz-ui]')) return true;
        var label = textOf(node);
        if(label.length > 48 && !node.hasAttribute("data-sz-nav-link")) return true;
        if(knownLabels[normalizedText(label)]) return false;
        return /^(book|reserve|get started|start|shop|buy|order|request|schedule|talk|call|demo|quote)(\\b|\\s)/i.test(label);
      }

      function isPageInteractive(node){
        if(!node || !node.getAttribute || isExcludedInteractive(node)) return false;
        var href = node.getAttribute("href") || node.getAttribute("data-href") || "";
        if(isExternalHref(href)) return false;
        return true;
      }

      function itemForTarget(target, root){
        var item = target.closest && target.closest('[data-sz-item="1"],li');
        if(item && root.contains(item)) return item;
        return target;
      }

      function uniqueItems(targets, root){
        var seen = [];
        var items = [];
        targets.forEach(function(target){
          var item = itemForTarget(target, root);
          if(!item || seen.indexOf(item) >= 0) return;
          seen.push(item);
          items.push({ item: item, target: target });
        });
        return items;
      }

      function collectFromContainer(container, root){
        if(!container || !container.querySelectorAll) return null;
        var targets = Array.from(container.querySelectorAll('[data-sz-nav-link="1"],a,button,[data-href]'))
          .filter(isPageInteractive);
        var items = uniqueItems(targets, root);
        if(!items.length) return null;
        return {
          parent: items[0].item.parentElement || container,
          items: items,
          explicit: true,
        };
      }

      function findExplicitNavItems(root){
        var containerSelectors = [
          '[data-sz-collection-kind="nav-links"]',
          '[data-sz-nav-links]',
          '.sz-nav-links',
          '.nav-links',
          '[data-sitezy-nav-links]'
        ];
        for(var i = 0; i < containerSelectors.length; i += 1){
          var containers = Array.from(root.querySelectorAll(containerSelectors[i]));
          for(var j = 0; j < containers.length; j += 1){
            var collected = collectFromContainer(containers[j], root);
            if(collected) return collected;
          }
        }

        var targets = Array.from(root.querySelectorAll('[data-sz-nav-link="1"]')).filter(isPageInteractive);
        var items = uniqueItems(targets, root);
        if(!items.length) return null;
        return {
          parent: items[0].item.parentElement || root,
          items: items,
          explicit: true,
        };
      }

      function depth(node){
        var count = 0;
        var cur = node;
        while(cur && cur.parentElement){
          count += 1;
          cur = cur.parentElement;
        }
        return count;
      }

      function findFallbackNavItems(root){
        var targets = Array.from(root.querySelectorAll('a,button,[data-href]')).filter(isPageInteractive);
        if(targets.length < 2) return null;

        var groups = [];
        targets.forEach(function(target){
          var parent = target.parentElement;
          if(!parent) return;
          var group = groups.find(function(entry){ return entry.parent === parent; });
          if(!group){
            group = { parent: parent, targets: [] };
            groups.push(group);
          }
          group.targets.push(target);
        });

        groups = groups
          .filter(function(group){ return group.targets.length >= 2; })
          .sort(function(a, b){
            return b.targets.length - a.targets.length || depth(b.parent) - depth(a.parent);
          });

        if(!groups.length) return null;
        var groupTargets = groups[0].targets.filter(function(target){
          return !isExcludedInteractive(target);
        });
        var items = uniqueItems(groupTargets, root);
        if(!items.length) return null;
        return {
          parent: items[0].item.parentElement || groups[0].parent,
          items: items,
          explicit: false,
        };
      }

      function findNavItems(root){
        return findExplicitNavItems(root) || findFallbackNavItems(root);
      }

      function ensureTarget(item){
        if(!item || !item.querySelector) return null;
        if(item.matches && item.matches('a,button,[data-href]')) return item;
        var target = item.querySelector('[data-sz-nav-link="1"],a,button,[data-href]');
        if(target) return target;
        target = document.createElement("a");
        item.appendChild(target);
        return target;
      }

      function setHref(target, href){
        if(!target || !target.setAttribute) return;
        if(target.tagName && target.tagName.toLowerCase() === "a"){
          target.setAttribute("href", href);
        }else{
          target.setAttribute("data-href", href);
        }
        target.removeAttribute("onclick");
        target.setAttribute("data-sz-nav-link", "1");
      }

      function setLabel(item, target, label){
        var field = item && item.querySelector ? item.querySelector('[data-sz-field="label"]') : null;
        if(field){
          field.textContent = label;
          return;
        }
        target.textContent = label;
      }

      function syncUrlField(item, href){
        var field = item && item.querySelector ? item.querySelector('[data-sz-field="url"]') : null;
        if(field) field.textContent = href;
      }

      function normalizeRoot(root){
        var nav = findNavItems(root);
        if(!nav || !nav.parent || !nav.items.length) return;
        var template = nav.items[0].item;
        var marker = document.createComment("sitezy-project-nav");
        if(template && template.parentNode === nav.parent){
          nav.parent.insertBefore(marker, template);
        }else{
          nav.parent.appendChild(marker);
        }
        var nextItems = [];

        pageLinks.forEach(function(link, index){
          var existing = nav.items[index] && nav.items[index].item;
          var item = existing || (template && template.cloneNode ? template.cloneNode(true) : document.createElement("a"));
          if(item.setAttribute){
            item.setAttribute("data-sz-item-key", "project-page-" + (index + 1));
          }
          var target = ensureTarget(item);
          if(target){
            setHref(target, link.href);
            setLabel(item, target, link.label);
            syncUrlField(item, link.href);
          }
          nextItems.push(item);
        });

        nav.items.forEach(function(entry){
          if(nextItems.indexOf(entry.item) >= 0) return;
          if(entry.item.parentNode === nav.parent) entry.item.parentNode.removeChild(entry.item);
        });
        nextItems.forEach(function(item){
          nav.parent.insertBefore(item, marker);
        });
        if(marker.parentNode) marker.parentNode.removeChild(marker);
      }

      function normalizeAll(){
        var roots = Array.from(document.querySelectorAll('[data-sz-section-type="navbar"],nav,header[data-sz-section-type="navbar"]'))
          .filter(function(root){
            return root && root.querySelector && root.querySelector('a,button,[data-href]');
          });
        var seen = [];
        roots.forEach(function(root){
          if(seen.some(function(existing){ return existing.contains(root); })) return;
          seen.push(root);
          normalizeRoot(root);
        });
      }

      ready(normalizeAll);
      window.addEventListener("load", normalizeAll);
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

      function syncNavbarBrand(root, state){
        var brandNode = widgetPart(root, "brand");
        if(!(brandNode && brandNode.tagName)) return;
        var fallbackText = String(state.brand || "Brand");
        var imageSrc = String(state.brandImage || "").trim();
        var altText = String(typeof state.brandAlt === "string" ? state.brandAlt : (state.brand || "Brand"));
        var tag = brandNode.tagName.toLowerCase();

        if(tag === "img"){
          if(imageSrc) brandNode.setAttribute("src", imageSrc);
          brandNode.setAttribute("alt", altText || fallbackText || "Brand");
          return;
        }

        var existingImg = brandNode.querySelector && brandNode.querySelector('img[data-sz-widget-brand-image="1"]');
        var textWrap = brandNode.querySelector && brandNode.querySelector('[data-sz-widget-brand-text="1"]');

        if(imageSrc){
          if(!textWrap){
            textWrap = document.createElement("span");
            textWrap.setAttribute("data-sz-widget-brand-text", "1");
            while(brandNode.firstChild){
              textWrap.appendChild(brandNode.firstChild);
            }
            brandNode.appendChild(textWrap);
          }
          textWrap.textContent = fallbackText;
          textWrap.style.display = "none";

          var img = existingImg;
          if(!img){
            img = document.createElement("img");
            img.setAttribute("data-sz-widget-brand-image", "1");
            brandNode.insertBefore(img, textWrap);
          }
          img.setAttribute("src", imageSrc);
          img.setAttribute("alt", altText || fallbackText || "Brand");
          img.style.display = "inline-block";
          img.style.maxWidth = "100%";
          img.style.width = "auto";
          img.style.height = "auto";
          img.style.maxHeight = "48px";
          img.style.objectFit = "contain";
          img.style.verticalAlign = "middle";
          return;
        }

        if(existingImg && existingImg.parentNode) existingImg.parentNode.removeChild(existingImg);
        if(textWrap){
          textWrap.textContent = fallbackText;
          textWrap.style.display = "";
          return;
        }
        widgetText(root, "brand", fallbackText);
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
          syncNavbarBrand(root, state);
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

// Resolves data-sz-icon="name" hosts into themed inline SVG (Lucide-style,
// stroke=currentColor). Runs in preview, publish, export AND the editor iframe,
// so icons render everywhere. Idempotent via data-sz-icon-done.
function buildIconRuntimeScript(): string {
  return `<script>
  (function(){
    var I = {
      "arrow-right":'<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
      "arrow-up-right":'<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>',
      "arrow-down":'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
      "check":'<polyline points="20 6 9 17 4 12"/>',
      "check-circle":'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      "star":'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
      "heart":'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
      "zap":'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
      "shield":'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
      "shield-check":'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
      "sparkles":'<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/><path d="M19 14l.6 1.8L21 16.5l-1.4.5L19 19l-.6-2-1.4-.5 1.4-.7z"/>',
      "rocket":'<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.79-.79.78-2.06 0-2.85a2 2 0 0 0-3 -.15z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
      "lightbulb":'<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
      "settings":'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      "search":'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
      "menu":'<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
      "x":'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      "chevron-right":'<polyline points="9 18 15 12 9 6"/>',
      "chevron-down":'<polyline points="6 9 12 15 18 9"/>',
      "play":'<polygon points="6 3 20 12 6 21 6 3"/>',
      "mail":'<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
      "phone":'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
      "map-pin":'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
      "clock":'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      "calendar":'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
      "user":'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      "users":'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      "globe":'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
      "lock":'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      "credit-card":'<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
      "trending-up":'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
      "bar-chart":'<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
      "layers":'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
      "code":'<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
      "image":'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
      "award":'<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
      "gift":'<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
      "leaf":'<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
      "coffee":'<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>',
      "utensils":'<path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2"/><path d="M5 11v11"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M19 15v7"/>',
      "shopping-bag":'<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
      "truck":'<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
      "headphones":'<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
      "smartphone":'<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
      "monitor":'<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
      "cloud":'<path d="M17.5 19H9a7 7 0 1 1 6.71-9H17.5a4.5 4.5 0 1 1 0 9z"/>',
      "database":'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
      "cpu":'<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
      "briefcase":'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
      "dollar-sign":'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
      "target":'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
      "gem":'<polygon points="6 3 18 3 22 9 12 22 2 9"/><path d="M11 3 8 9l4 13 4-13-3-6"/><line x1="2" y1="9" x2="22" y2="9"/>',
      "crown":'<path d="M2 6l4 4 6-7 6 7 4-4-2 13H4z"/><line x1="4" y1="22" x2="20" y2="22"/>',
      "flame":'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
      "sun":'<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="6.3" y1="17.7" x2="4.9" y2="19.1"/><line x1="19.1" y1="4.9" x2="17.7" y2="6.3"/>',
      "moon":'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
      "instagram":'<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
      "twitter":'<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>',
      "linkedin":'<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
      "facebook":'<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
      "youtube":'<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.4 19.5c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2.02A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>',
      "send":'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
      "download":'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
      "external-link":'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
      "plus":'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      "minus":'<line x1="5" y1="12" x2="19" y2="12"/>',
      "info":'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
      "home":'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      "message-circle":'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>',
      "quote":'<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 0-1 1v1c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v1c0 1 0 1 1 1z"/>'
    };
    function render(host){
      var name = host.getAttribute("data-sz-icon");
      if(!name || host.getAttribute("data-sz-icon-done")==="1") return;
      var inner = I[name];
      if(!inner) return;
      host.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;display:block" aria-hidden="true">'+inner+'</svg>';
      host.setAttribute("data-sz-icon-done","1");
    }
    function run(){ var hosts=document.querySelectorAll("[data-sz-icon]"); for(var i=0;i<hosts.length;i++) render(hosts[i]); }
    if(document.readyState==="loading"){ document.addEventListener("DOMContentLoaded", run, { once:true }); } else { run(); }
    var scheduled=false;
    function schedule(){ if(scheduled) return; scheduled=true; (window.requestAnimationFrame||window.setTimeout)(function(){ scheduled=false; run(); },0); }
    try { new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true }); } catch(e){}
  })();
  <\/script>`;
}

// Scroll-triggered reveal / stagger / parallax + pointer spotlight runtime.
// Scroll motion is intentionally DISABLED inside the editor (about:blank iframe)
// and under prefers-reduced-motion: content is always revealed immediately there,
// so editing never hides content and a11y is honored. Real motion plays on the
// /preview route, published sites, and exports.
/**
 * Marks the current page's navbar link as active. The shared-chrome system
 * copies page 1's navbar verbatim onto every page, so any baked-in "current
 * page" styling would always point at Home — instead, this runtime resolves
 * each navbar anchor's URL against the live location (pathname plus the
 * preview runtime's ?page= param) and applies aria-current="page" +
 * .sz-nav-active. Falls back to the home link when nothing matches (site
 * roots: "/", "/preview/{id}", "/live/{slug}"). Skipped inside the editor.
 */
function buildActiveNavRuntimeScript(): string {
  return `<script>
  (function(){
    var inEditor = false;
    try { inEditor = window.location.protocol === "about:" || window.location.href === "about:blank"; } catch(e){}
    if (inEditor) return;

    function apply(){
      var scopes = [].slice.call(document.querySelectorAll('[data-sz-section-type="navbar"], header, nav'));
      if (!scopes.length) return;
      var current;
      try { current = new URL(window.location.href); } catch(e){ return; }
      var currentPage = (current.searchParams.get("page") || "").toLowerCase();
      var currentPath = current.pathname.replace(/\\/+$/, "").toLowerCase();

      var anchors = [];
      scopes.forEach(function(scope){
        [].slice.call(scope.querySelectorAll("a[href]")).forEach(function(a){
          if (anchors.indexOf(a) < 0) anchors.push(a);
        });
      });

      var matched = null;
      var homeAnchor = null;
      anchors.forEach(function(a){
        a.removeAttribute("aria-current");
        a.classList.remove("sz-nav-active");
        var href = a.getAttribute("href") || "";
        if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return;
        var url;
        try { url = new URL(href, window.location.href); } catch(e){ return; }
        if (url.origin !== current.origin) return;
        var linkPage = (url.searchParams.get("page") || "").toLowerCase();
        var linkPath = url.pathname.replace(/\\/+$/, "").toLowerCase();
        if (!linkPage && (linkPath === currentPath || linkPath === "")) {
          // Path-equal without a page param = home in every environment.
          if (!homeAnchor) homeAnchor = a;
        }
        if (linkPath === currentPath && linkPage === currentPage) {
          if (!matched) matched = a;
        }
      });

      var active = matched || (currentPage === "" ? homeAnchor : null);
      if (!active) return;
      active.setAttribute("aria-current", "page");
      active.classList.add("sz-nav-active");
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", apply, { once: true });
    } else {
      apply();
    }
  })();
  <\/script>`;
}

function buildMotionRuntimeScript(): string {
  return `<script>
  (function(){
    var docEl = document.documentElement;
    var inEditor = false;
    try { inEditor = window.location.protocol === "about:" || window.location.href === "about:blank"; } catch(e){}
    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch(e){}
    function qsa(sel, root){ return [].slice.call((root||document).querySelectorAll(sel)); }
    function locked(el){ return !!(el.closest && el.closest('[data-sz-motion-lock="1"],[data-sz-hover-lock="1"]')); }
    function play(el){ el.setAttribute("data-sz-anim-play",""); }

    var revealEls = qsa("[data-sz-reveal]");
    // Guarantee a motion variant so the CSS reveal gate applies.
    revealEls.forEach(function(el){ if(!el.hasAttribute("data-sz-anim-in")) el.setAttribute("data-sz-anim-in","fade-up"); });

    if (inEditor || reduce || !("IntersectionObserver" in window)) {
      // Never leave content hidden: reveal everything immediately.
      revealEls.forEach(play);
    } else {
      docEl.classList.add("sz-reveal-on");
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(!entry.isIntersecting) return;
          var t = entry.target;
          io.unobserve(t);
          if(t.hasAttribute("data-sz-stagger")){
            var step = parseInt(t.getAttribute("data-sz-stagger-step")||"90",10);
            qsa("[data-sz-reveal]", t).forEach(function(kid, i){
              kid.style.setProperty("--sz-anim-delay", (i*step)+"ms");
              play(kid);
            });
          } else {
            play(t);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

      qsa("[data-sz-stagger]").forEach(function(p){ io.observe(p); });
      revealEls.forEach(function(el){
        if(locked(el)){ play(el); return; }
        if(el.hasAttribute("data-sz-stagger")) return;   // observed as a stagger container
        if(el.closest("[data-sz-stagger]")) return;      // revealed by its stagger container
        io.observe(el);
      });
    }

    if (!inEditor && !reduce) {
      var px = qsa("[data-sz-parallax]").filter(function(el){ return !locked(el); });
      if (px.length) {
        var ticking = false;
        var run = function(){
          ticking = false;
          var vh = window.innerHeight || docEl.clientHeight;
          px.forEach(function(el){
            var r = el.getBoundingClientRect();
            var speed = parseFloat(el.getAttribute("data-sz-parallax-speed")||"0.12");
            var off = ((r.top + r.height/2) - vh/2) * -speed;
            el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
          });
        };
        var onScroll = function(){ if(!ticking){ ticking = true; window.requestAnimationFrame(run); } };
        window.addEventListener("scroll", onScroll, { passive:true });
        window.addEventListener("resize", onScroll, { passive:true });
        run();
      }
    }

    // Word-cascade reveal for display headlines ([data-sz-words]).
    // Splitting happens only in the live DOM at runtime, so stored HTML,
    // the editor, SEO and no-JS rendering all keep the intact headline.
    var wordEls = qsa("[data-sz-words]");
    if (wordEls.length && !inEditor && !reduce && "IntersectionObserver" in window) {
      var splitWords = function(el){
        var nodes = [].slice.call(el.childNodes);
        nodes.forEach(function(node){
          if (node.nodeType === 3) {
            var parts = node.textContent.split(/(\\s+)/);
            var frag = document.createDocumentFragment();
            parts.forEach(function(part){
              if (!part) return;
              if (/^\\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var w = document.createElement("span");
              w.className = "sz-word";
              w.textContent = part;
              frag.appendChild(w);
            });
            el.replaceChild(frag, node);
          } else if (node.nodeType === 1) {
            // Keep gradient-clipped phrases as a single animated unit so
            // background-clip:text is never broken by transformed children.
            if (node.classList && node.classList.contains("sz-gradient-text")) {
              node.classList.add("sz-word");
            } else {
              splitWords(node);
            }
          }
        });
      };
      var wio = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting) return;
          var t = entry.target;
          wio.unobserve(t);
          qsa(".sz-word", t).forEach(function(w, i){
            w.style.transitionDelay = (i * 70) + "ms";
          });
          t.setAttribute("data-sz-words-play","");
        });
      }, { threshold: 0.2 });
      wordEls.forEach(function(el){
        if (locked(el)) return;
        el.removeAttribute("data-sz-reveal"); // never double-animate
        splitWords(el);
        el.setAttribute("data-sz-words-ready","");
        wio.observe(el);
      });
    }

    // Count-up stats ([data-sz-count]): animates the first number in the
    // element's text from 0 to its authored value when scrolled into view,
    // preserving prefix/suffix/grouping, then restores the exact original text.
    var countEls = qsa("[data-sz-count]");
    if (countEls.length && !inEditor && !reduce && "IntersectionObserver" in window) {
      var animateCount = function(el){
        var text = el.textContent || "";
        var match = text.match(/[\\d][\\d,.]*/);
        if (!match) return;
        var raw = match[0];
        var prefix = text.slice(0, match.index);
        var suffix = text.slice(match.index + raw.length);
        var clean = raw.replace(/,/g, "");
        var target = parseFloat(clean);
        if (!isFinite(target)) return;
        var decimals = (clean.split(".")[1] || "").length;
        var grouped = raw.indexOf(",") !== -1;
        var dur = Math.min(2400, Math.max(700, parseInt(el.getAttribute("data-sz-count-duration") || "1400", 10) || 1400));
        var start = null;
        var fmt = function(value){
          var s = value.toFixed(decimals);
          if (grouped) {
            var pieces = s.split(".");
            pieces[0] = pieces[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
            s = pieces.join(".");
          }
          return prefix + s + suffix;
        };
        var step = function(ts){
          if (start === null) start = ts;
          var p = Math.min(1, (ts - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          if (p < 1) {
            el.textContent = fmt(target * eased);
            window.requestAnimationFrame(step);
          } else {
            el.textContent = prefix + raw + suffix;
          }
        };
        window.requestAnimationFrame(step);
      };
      var cio = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting) return;
          cio.unobserve(entry.target);
          animateCount(entry.target);
        });
      }, { threshold: 0.4 });
      countEls.forEach(function(el){ if (!locked(el)) cio.observe(el); });
    }

    // Pointer-tracked spotlight glow (cheap, safe everywhere).
    if (qsa(".sz-spotlight").length) {
      document.addEventListener("pointermove", function(e){
        var el = e.target && e.target.closest ? e.target.closest(".sz-spotlight") : null;
        if(!el) return;
        var r = el.getBoundingClientRect();
        el.style.setProperty("--sz-mx", ((e.clientX - r.left)/r.width*100) + "%");
        el.style.setProperty("--sz-my", ((e.clientY - r.top)/r.height*100) + "%");
      }, { passive:true });
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
  seo: ResolvedSeoMeta | null = null,
  leadCaptureConfig: Partial<LeadCaptureRuntimeConfig> | null = null,
  analyticsConfig: PublicAnalyticsRuntimeConfig | null = null,
  cmsRuntimeConfig: CmsRuntimeConfig | null = null,
  navigationLinks: ProjectNavigationLink[] = []
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
  const projectNavigationRuntimeScript = buildProjectNavigationRuntimeScript(navigationLinks);
  const activeNavRuntimeScript = buildActiveNavRuntimeScript();
  const widgetRuntimeScript = buildWidgetRuntimeScript();
  const iconRuntimeScript = buildIconRuntimeScript();
  const motionRuntimeScript = buildMotionRuntimeScript();
  const leadCaptureRuntimeScript = leadCaptureConfig ? buildLeadCaptureRuntimeScript(leadCaptureConfig) : "";
  const analyticsRuntimeMarkup = buildAnalyticsRuntimeMarkup(analyticsConfig);
  const cmsRuntimeScript = buildCmsRuntimeScript(cmsRuntimeConfig);
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
  ${analyticsRuntimeMarkup}
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
    .sz-generated-section--navbar {
      position: sticky !important;
      top: 0;
      z-index: 60;
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
    /* Scroll-triggered reveal: hidden + paused until the runtime adds data-sz-anim-play.
       Gated by html.sz-reveal-on (added by JS) so content is always visible if JS is
       disabled, in the editor, or under reduced motion. Non-reveal data-sz-anim-in
       elements keep their on-load behavior for backward compatibility. */
    html.sz-reveal-on [data-sz-reveal][data-sz-anim-in]:not([data-sz-anim-in="none"]):not([data-sz-anim-play]) {
      opacity: 0;
      animation-play-state: paused;
    }
    [data-sz-reveal][data-sz-anim-play] {
      animation-play-state: running;
    }
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
      box-shadow: var(--sz-hover-base-shadow, none), 0 18px 36px rgba(0,0,0,0.14);
    }
    [data-sz-hover-fx="grow"]:hover {
      transform: var(--sz-hover-base-transform, translateZ(0px)) scale(1.03);
    }
    [data-sz-hover-fx="tilt"]:hover {
      transform: var(--sz-hover-base-transform, translateZ(0px)) rotate(-1.5deg);
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
    .hover-lift { transition: box-shadow 260ms cubic-bezier(0.22,1,0.36,1); }
    .hover-lift:hover { box-shadow: 0 18px 36px rgba(0,0,0,0.14); }
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

    /* ── Premium primitives (theme-derived; opt-in via class) ── */
    .sz-glass {
      background: color-mix(in srgb, var(--bg) 64%, transparent);
      backdrop-filter: blur(16px) saturate(1.4);
      -webkit-backdrop-filter: blur(16px) saturate(1.4);
      border: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
    }
    .sz-glass-dark {
      background: color-mix(in srgb, #05070b 58%, transparent);
      backdrop-filter: blur(18px) saturate(1.3);
      -webkit-backdrop-filter: blur(18px) saturate(1.3);
      border: 1px solid rgba(255,255,255,0.12);
      color: #f5f7fb;
    }
    .sz-gradient-mesh {
      background-color: var(--bg);
      background-image:
        radial-gradient(at 16% 12%, color-mix(in srgb, var(--primary) 26%, transparent) 0px, transparent 48%),
        radial-gradient(at 84% 6%, color-mix(in srgb, var(--accent) 22%, transparent) 0px, transparent 46%),
        radial-gradient(at 72% 90%, color-mix(in srgb, var(--secondary) 24%, transparent) 0px, transparent 50%);
    }
    /* Slow ambient drift for mesh backdrops — sub-perceptual background motion. */
    .sz-mesh-drift {
      background-size: 150% 150%, 140% 140%, 160% 160%;
      animation: sitezy-mesh-drift 26s ease-in-out infinite alternate;
    }
    @keyframes sitezy-mesh-drift {
      from { background-position: 0% 0%, 100% 0%, 50% 100%; }
      to { background-position: 100% 100%, 0% 100%, 50% 0%; }
    }
    .sz-gradient-text {
      background-image: linear-gradient(120deg, var(--primary), var(--accent));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .sz-grain { position: relative; }
    .sz-grain::after {
      content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 1;
      opacity: 0.4; mix-blend-mode: soft-light;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }
    .sz-spotlight { position: relative; isolation: isolate; }
    .sz-spotlight::before {
      content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
      opacity: 0; transition: opacity 0.35s ease; border-radius: inherit;
      background: radial-gradient(420px circle at var(--sz-mx,50%) var(--sz-my,50%), color-mix(in srgb, var(--primary) 20%, transparent), transparent 55%);
    }
    .sz-spotlight:hover::before { opacity: 1; }
    .sz-elev-1 { box-shadow: 0 1px 2px rgba(8,11,20,.06), 0 4px 12px rgba(8,11,20,.06); }
    .sz-elev-2 { box-shadow: 0 6px 16px rgba(8,11,20,.10), 0 18px 40px rgba(8,11,20,.10); }
    .sz-elev-3 { box-shadow: 0 12px 30px rgba(8,11,20,.14), 0 30px 70px rgba(8,11,20,.16); }
    .sz-rule { height: 1px; border: 0; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--text) 16%, transparent), transparent); }
    /* Micro-interactions: animated link underline, form focus polish, button press feedback. */
    .sz-link-underline { position: relative; }
    .sz-link-underline::after {
      content: ""; position: absolute; left: 0; bottom: -3px; height: 2px; width: 100%;
      background: currentColor; transform: scaleX(0); transform-origin: right center;
      transition: transform 320ms cubic-bezier(0.22,1,0.36,1);
    }
    .sz-link-underline:hover::after,
    .sz-link-underline:focus-visible::after { transform: scaleX(1); transform-origin: left center; }
    /* Current-page nav link — applied at runtime via aria-current, never baked into HTML. */
    .sz-nav-active { position: relative; font-weight: 600; }
    .sz-nav-active:not(.sz-link-underline)::after {
      content: ""; position: absolute; left: 0; right: 0; bottom: -3px; height: 2px;
      background: currentColor; opacity: 0.85; border-radius: 1px;
    }
    .sz-link-underline.sz-nav-active::after { transform: scaleX(1); transform-origin: left center; }
    .sz-field { transition: border-color 220ms ease, box-shadow 220ms ease, background-color 220ms ease; }
    .sz-field:focus {
      outline: none;
      border-color: color-mix(in srgb, var(--primary) 55%, transparent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
    }
    a[data-sz-hover-fx]:not([data-sz-hover-fx="none"]):active,
    button[data-sz-hover-fx]:not([data-sz-hover-fx="none"]):active {
      transform: var(--sz-hover-base-transform, translateZ(0)) scale(0.97);
      transition-duration: 120ms;
    }
    /* Word-cascade reveal: the hidden state only exists after the runtime marks
       the element ready, so no-JS / editor / reduced-motion always see full text. */
    [data-sz-words-ready] .sz-word {
      display: inline-block;
      opacity: 0;
      transform: translateY(0.55em);
      transition: opacity 640ms cubic-bezier(0.22,1,0.36,1), transform 640ms cubic-bezier(0.22,1,0.36,1);
    }
    [data-sz-words-play] .sz-word { opacity: 1; transform: none; }
    /* Fluid type scale (clamp = inherently responsive) */
    .sz-display  { font-family: '${headingFont}', system-ui, sans-serif; font-size: clamp(44px, 7vw, 104px); line-height: .98; letter-spacing: -.03em; font-weight: 800; }
    .sz-fluid-h1 { font-family: '${headingFont}', system-ui, sans-serif; font-size: clamp(34px, 5vw, 68px);  line-height: 1.04; letter-spacing: -.02em; font-weight: 800; }
    .sz-fluid-h2 { font-family: '${headingFont}', system-ui, sans-serif; font-size: clamp(26px, 3.4vw, 46px); line-height: 1.08; letter-spacing: -.015em; font-weight: 700; }
    .sz-fluid-h3 { font-family: '${headingFont}', system-ui, sans-serif; font-size: clamp(20px, 2vw, 28px);   line-height: 1.2;  letter-spacing: -.01em; font-weight: 600; }
    .sz-eyebrow  { font-size: clamp(11px, .9vw, 13px); letter-spacing: .2em; text-transform: uppercase; font-weight: 600; }
    .sz-lead     { font-size: clamp(17px, 1.5vw, 22px); line-height: 1.55; }
    [data-sz-icon] { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
    [data-sz-icon] > svg { width: 1em; height: 1em; }

    /* ── Responsive: Tablet ── */
    @media (max-width: 991px) {
      .sz-hero-grid,
      .sz-split-grid,
      .sz-product-lead,
      .sz-about-split,
      .sz-portfolio-row,
      .sz-contact-split {
        grid-template-columns: 1fr !important;
      }
      .sz-stat-grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
      .sz-card-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important;
      }
      .sz-footer-grid {
        grid-template-columns: 1fr !important;
        gap: 24px !important;
      }
      .sz-hero-title {
        font-size: clamp(36px, 7vw, 64px) !important;
      }
      .sz-diner-hero-side {
        order: -1;
      }
    }

    /* ── Responsive: Mobile ── */
    @media (max-width: 767px) {
      .sz-generated-section {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
      .sz-hero-grid,
      .sz-split-grid,
      .sz-product-lead,
      .sz-about-split,
      .sz-portfolio-row,
      .sz-contact-split {
        grid-template-columns: 1fr !important;
        gap: 20px !important;
      }
      .sz-card-grid {
        grid-template-columns: 1fr !important;
      }
      .sz-stat-grid {
        grid-template-columns: 1fr !important;
      }
      .sz-nav-links {
        display: none !important;
      }
      .sz-nav-cta {
        display: none !important;
      }
      .sz-mobile-menu-btn {
        display: flex !important;
      }
      .sz-hero-title {
        font-size: clamp(28px, 8vw, 48px) !important;
      }
      .sz-footer-grid {
        grid-template-columns: 1fr !important;
        gap: 20px !important;
      }
      .sz-bento-grid {
        grid-template-columns: 1fr !important;
      }
      .sz-bento-grid > * {
        grid-column: span 1 !important;
      }
      .sz-timeline-grid {
        grid-template-columns: 1fr !important;
      }
      .sz-team-grid {
        grid-template-columns: 1fr !important;
      }
      .sz-pricing-grid {
        grid-template-columns: 1fr !important;
      }
      .sz-comparison-grid {
        grid-template-columns: 1fr !important;
      }
      .sz-gallery-grid {
        grid-template-columns: 1fr !important;
        columns: 1 !important;
        -webkit-columns: 1 !important;
      }
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
      .sz-mesh-drift {
        animation: none !important;
      }
      [data-sz-words-ready] .sz-word {
        opacity: 1 !important;
        transform: none !important;
        transition: none !important;
      }
      .sz-link-underline::after {
        transition: none !important;
      }
    }
  </style>
  ${globalCss ? `<style data-sitezy-global-css>\n${globalCss}\n  </style>` : ""}
</head>
<body>
${pageHtml}
${projectNavigationRuntimeScript}
${activeNavRuntimeScript}
${iconRuntimeScript}
${motionRuntimeScript}
${responsiveOverrideScript}
${navbarFlowGuardScript}
  ${widgetRuntimeScript}
  ${cmsRuntimeScript}
  ${leadCaptureRuntimeScript}
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
