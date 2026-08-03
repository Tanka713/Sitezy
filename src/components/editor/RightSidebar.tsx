"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  BLOCK_PICKER_DEFINITIONS,
  EDITOR_INSERTION_CATEGORIES,
  ICON_DEFINITIONS,
  getElementCategoryDefinition,
  getBlockDefinition,
  renderEditorElementHtml,
  type BlockElementDefinition,
  type ElementCategoryKey,
  type IconElementDefinition,
  type InsertionCategory,
} from "@/lib/blocks/registry";
import { formatCreditAmount, getAIUsageCost } from "@/lib/ai-usage";
import {
  buildDefaultProjectPageSeo,
  normalizeProjectPageMeta,
  normalizeProjectPageSeo,
} from "@/lib/project-pages";
import { projectHasActiveGeneration } from "@/lib/project-generation";
import { useAppStore } from "@/lib/store";
import { estimateSectionRegenerationDurationMs } from "@/lib/generation-eta";
import {
  API_GENERATE_001,
  API_RESPONSE_001,
  API_UNKNOWN_001,
  createAppError,
  logAppError,
  normalizeError,
  type ErrorCode,
} from "@/lib/errors";
import { cn, uid, extractNavbarHtml } from "@/lib/utils";
import {
  LayoutGrid, Send, Loader2,
  X, Wand2, ImageIcon, ChevronDown, ChevronUp, Sparkles,
  RefreshCw, Menu, Zap, HelpCircle, Users, Mail, Tag, BarChart2,
  Quote, Info, Building2, Type,
  Rows3, Columns3, Square, MousePointerClick, FormInput, Shapes, MoreHorizontal,
} from "lucide-react";
import { EditorSwitch } from "./EditorSwitch";
import { EditPanel } from "./EditPanel";
import type {
  AIChatMessage,
  CmsCollection,
  CmsField,
  EditorState,
  Project,
  ProjectPage,
  ProjectPageCmsBinding,
  ProjectPageKind,
  ProjectPageMeta,
  ProjectPageSeoSettings,
} from "@/types";

// Parse a streaming AI assistant reply that may contain a Sitezy edit block.
// Returns { message, edit } where edit is null if the block is missing/incomplete.
function parseAssistReply(full: string): {
  message: string;
  edit: { sectionId?: string; sectionType?: string; html: string } | null;
} {
  const editIdx = full.indexOf("---SITEZY-EDIT---");
  if (editIdx === -1) return { message: full.trim(), edit: null };
  const message = full.slice(0, editIdx).trim();
  const rest = full.slice(editIdx + "---SITEZY-EDIT---".length);
  const htmlIdx = rest.indexOf("---SITEZY-HTML---");
  if (htmlIdx === -1) return { message, edit: null };
  const metaStr = rest.slice(0, htmlIdx).trim();
  const afterHtml = rest.slice(htmlIdx + "---SITEZY-HTML---".length);
  const endIdx = afterHtml.indexOf("---SITEZY-END---");
  if (endIdx === -1) return { message, edit: null };
  const html = afterHtml.slice(0, endIdx).trim();
  let meta: { sectionId?: string; sectionType?: string } = {};
  try { meta = JSON.parse(metaStr); } catch {}
  if (!html) return { message, edit: null };
  return { message, edit: { ...meta, html } };
}

// Strip the edit block + any partial markers from a streaming reply for display.
function stripEditMarkers(full: string): string {
  const editIdx = full.indexOf("---SITEZY-EDIT---");
  if (editIdx !== -1) return full.slice(0, editIdx).trim();
  // Hide a trailing partial marker so the user never sees "---SITE…" mid-stream.
  const partial = full.match(/-{1,3}S?I?T?E?Z?Y?-?E?D?I?T?-{0,3}$/);
  if (partial && partial.index !== undefined) return full.slice(0, partial.index).trim();
  return full.trim();
}

// Replace a single section in pageHtml by data-sz-section-id, preserving the
// surrounding document. Returns null if the target id can't be found.
function replaceSectionById(pageHtml: string, sectionId: string, replacement: string): string | null {
  const marker = `data-sz-section-id="${sectionId}"`;
  const markerIdx = pageHtml.indexOf(marker);
  if (markerIdx === -1) return null;
  const start = pageHtml.lastIndexOf("<", markerIdx);
  if (start === -1) return null;
  const tagMatch = pageHtml.slice(start + 1).match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  if (!tagMatch) return null;
  const tag = tagMatch[1];
  const openEnd = pageHtml.indexOf(">", markerIdx);
  if (openEnd === -1) return null;
  const openRe = new RegExp(`<${tag}\\b`, "gi");
  const closeRe = new RegExp(`</${tag}\\s*>`, "gi");
  let depth = 1;
  let pos = openEnd + 1;
  while (depth > 0) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const o = openRe.exec(pageHtml);
    const c = closeRe.exec(pageHtml);
    if (!c) return null;
    if (o && o.index < c.index) {
      depth++;
      pos = o.index + o[0].length;
    } else {
      depth--;
      pos = c.index + c[0].length;
    }
  }
  return pageHtml.slice(0, start) + replacement.trim() + pageHtml.slice(pos);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_TYPE_ICONS: Record<string, any> = {
  navbar:      Menu,
  hero:        LayoutGrid,
  features:    LayoutGrid,
  testimonial: Quote,
  cta:         Zap,
  footer:      Menu,
  faq:         HelpCircle,
  pricing:     Tag,
  contact:     Mail,
  about:       Info,
  team:        Users,
  gallery:     ImageIcon,
  logos:       Building2,
  stats:       BarChart2,
};

function getSectionIcon(type: string) {
  const Icon = SECTION_TYPE_ICONS[type] ?? LayoutGrid;
  return <Icon size={11} />;
}

/** Parse all sections directly from page HTML — more reliable than page.sections. */
function getRequestId(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;

  if ("metadata" in error) {
    const metadata = (error as { metadata?: Record<string, unknown> }).metadata;
    const requestId = metadata?.requestId;
    if (typeof requestId === "string" && requestId.trim()) return requestId;
  }

  if ("requestId" in error) {
    const requestId = (error as { requestId?: unknown }).requestId;
    if (typeof requestId === "string" && requestId.trim()) return requestId;
  }

  return null;
}

function buildClientApiError(error: unknown, fallbackCode: ErrorCode, metadata?: Record<string, unknown>) {
  const requestId = getRequestId(error);
  const appErr = normalizeError(error, fallbackCode, {
    ...metadata,
    ...(requestId ? { requestId } : {}),
  });

  return {
    appErr,
    apiError: {
      message: appErr.userMessage,
      requestId,
      code: appErr.code,
    },
  };
}

interface Props {
  project: Project;
  edge?: "left" | "right";
}

function createPriorityMap(ids: string[]) {
  return new Map(ids.map((id, index) => [id, index]));
}

const DEFAULT_BLOCK_PRIORITY = createPriorityMap([
  "hero",
  "hero-split",
  "split-image",
  "features",
  "features-list",
  "stats",
  "cta",
  "cta-strip",
  "testimonials",
  "pricing",
  "faq",
  "contact-form",
  "newsletter",
  "team",
  "logo-wall",
  "logo-scroller",
  "video-section",
  "navbar",
  "navbar-center",
  "navbar-minimal",
  "footer",
  "gallery",
  "two-columns",
  "three-columns",
  "grid",
  "container",
  "flex-container",
  "heading",
  "paragraph",
  "button",
  "image",
  "social-links",
  "map-embed",
]);

const INLINE_BLOCK_PRIORITY = createPriorityMap([
  "heading",
  "paragraph",
  "button",
  "button-outline",
  "badge",
  "highlight-text",
  "blockquote",
  "image",
  "video",
  "youtube",
  "embed",
  "list",
  "icon-list",
  "pill-list",
  "divider",
  "icon-circle",
]);

const MEDIA_BLOCK_PRIORITY = createPriorityMap([
  "image",
  "video",
  "youtube",
  "embed",
  "gallery",
  "logo-wall",
  "logo-scroller",
  "map-embed",
]);

const FORM_BLOCK_PRIORITY = createPriorityMap([
  "text-input",
  "textarea-field",
  "select-field",
  "checkbox-field",
  "radio-group",
  "toggle-switch",
  "contact-form",
  "button",
]);

const TEXT_BLOCK_PRIORITY = createPriorityMap([
  "heading",
  "paragraph",
  "button",
  "button-outline",
  "badge",
  "highlight-text",
  "blockquote",
  "list",
  "icon-list",
  "pill-list",
  "divider",
]);

function priorityRank(map: Map<string, number>, blockId: string) {
  return map.get(blockId) ?? Number.MAX_SAFE_INTEGER;
}

export function RightSidebar({ project, edge = "right" }: Props) {
  const rawRightPanelTab = useAppStore((s) => s.editor.rightPanelTab) as EditorState["rightPanelTab"] | "properties";
  const selectedNode  = useAppStore((s) => s.editor.selectedNode);
  const setRightPanel = useAppStore((s) => s.setRightPanel);
  const generationLocked = projectHasActiveGeneration(project);
  const previousSelectedNodeIdRef = useRef<string | null>(null);
  const activeRightPanelTab = rawRightPanelTab === "properties" ? "style" : rawRightPanelTab;

  // Stable iframe ref via MutationObserver
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    function find() {
      const el = document.querySelector('iframe[data-sitezy-preview-frame="1"]') as HTMLIFrameElement | null;
      if (el) iframeRef.current = el;
    }
    find();
    const obs = new MutationObserver(find);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // New selection can hand off to the inspector, but do not lock the user there.
  useEffect(() => {
    if (rawRightPanelTab !== "properties") return;
    setRightPanel("style");
  }, [rawRightPanelTab, setRightPanel]);

  useEffect(() => {
    const nextId = selectedNode?.nodeId ?? null;
    const prevId = previousSelectedNodeIdRef.current;
    previousSelectedNodeIdRef.current = nextId;

    if (!nextId || nextId === prevId) return;
    if (activeRightPanelTab === "style") return;
    setRightPanel("style");
  }, [activeRightPanelTab, selectedNode?.nodeId, setRightPanel]);

  const tabs = [
    { key: "style"  as const, label: "Style" },
    { key: "page"   as const, label: "Page" },
    { key: "blocks" as const, label: "Blocks" },
    { key: "ai"     as const, label: "AI" },
  ];

  const visualEditMode = useAppStore((s) => s.editor.visualEditMode);

  const tabMeta: Record<EditorState["rightPanelTab"], { title: string; subtitle: string }> = {
    style: {
      title: "Inspector",
      subtitle: !visualEditMode
        ? "Enable edit mode to start editing."
        : selectedNode
        ? "Style and settings for the current selection."
        : "Select something on the canvas to start editing.",
    },
    theme: {
      title: "Design System",
      subtitle: "Site-wide design archetype, typography, spacing, and color direction.",
    },
    page: {
      title: "Page settings",
      subtitle: "Configure routing, CMS binding, SEO overrides, and approval state for the selected page.",
    },
    blocks: {
      title: "Elements",
      subtitle: "Insert layout, content, media, and interaction blocks into the current page.",
    },
    ai: {
      title: "AI assistant",
      subtitle: "Generate refinements, copy changes, and structural ideas without leaving the editor.",
    },
  };

  return (
    <aside
      className={cn(
        "sz-editor-dock editor-sidebar flex h-full w-full flex-col overflow-hidden",
        edge === "right" ? "rounded-l-[22px] rounded-r-none border-r-0" : "rounded-r-[22px] rounded-l-none border-l-0"
      )}
    >
      <div className="flex flex-shrink-0 flex-col gap-2.5 px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-center justify-center gap-6 px-1 pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setRightPanel(t.key)}
              className={cn(
                "relative flex h-8 items-center justify-center px-1.5 text-center transition-colors duration-200",
                activeRightPanelTab === t.key
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <span className="text-[11.5px] font-medium tracking-wide">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3">
        {generationLocked ? (
          <GenerationLockedPanel tab={activeRightPanelTab} />
        ) : (
          <>
            {activeRightPanelTab === "style"  && <EditPanel iframeRef={iframeRef as React.RefObject<HTMLIFrameElement>} onClose={() => setRightPanel("ai")} project={project} />}
            {activeRightPanelTab === "page"   && <PageMetaPanel project={project} />}
            {activeRightPanelTab === "ai"     && <AIPanel project={project} />}
            {activeRightPanelTab === "blocks" && <BlocksPanel project={project} />}
          </>
        )}
      </div>
    </aside>
  );
}

function GenerationLockedPanel({ tab }: { tab: EditorState["rightPanelTab"] }) {
  const title =
    tab === "blocks"
      ? "Block insertion is paused"
      : tab === "ai"
      ? "AI edits are paused"
      : "Editing is paused";

  const body =
    tab === "blocks"
      ? "Finish the current generation first. We pause block insertion so the generator doesn’t get overwritten mid-run."
      : tab === "ai"
      ? "Finish the current generation first. This avoids AI edits landing on stale page state."
      : "Finish the current generation first. The editor stays read-only while pages are still being built.";

  return (
    <div className="flex h-full items-center justify-center px-3">
      <div className="w-full rounded-2xl bg-[var(--surface-3)] px-4 py-4 text-center shadow-[inset_0_0_0_1px_var(--border-soft)]">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B8CFF]/10 text-[#5B8CFF]">
          <Loader2 size={15} className="animate-spin" />
        </div>
        <p className="mt-3 text-[12.5px] font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-1.5 text-[11.5px] leading-5 text-[var(--text-secondary)]">{body}</p>
      </div>
    </div>
  );
}

const PAGE_PANEL_CARD = "rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-3)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]";
const PAGE_PANEL_INPUT = "min-h-9 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-4)] px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-disabled)] focus:border-[var(--border-focus)]";
const PAGE_PANEL_LABEL = "text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]";

const PAGE_KIND_OPTIONS: Array<{ key: ProjectPageKind; label: string; body: string }> = [
  { key: "static", label: "Static", body: "A normal page with fixed sections." },
  { key: "cms_listing", label: "CMS list", body: "Repeats entries from a collection." },
  { key: "cms_detail", label: "CMS detail", body: "Renders one published entry per URL." },
];

const CMS_TEMPLATE_FIELDS = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "image", label: "Image" },
  { key: "url", label: "URL" },
  { key: "date", label: "Date" },
  { key: "category", label: "Category" },
];

function firstFieldByPreference(
  fields: CmsField[],
  preferredKeys: string[],
  preferredTypes: CmsField["type"][]
) {
  const keyMatch = fields.find((field) => preferredKeys.includes(field.key));
  if (keyMatch) return keyMatch.key;
  return fields.find((field) => preferredTypes.includes(field.type))?.key ?? null;
}

function buildDefaultCmsBinding(
  collection: CmsCollection,
  existing?: ProjectPageCmsBinding | null
): ProjectPageCmsBinding {
  const descriptionField = firstFieldByPreference(
    collection.fields,
    ["description", "excerpt", "summary", "body", "content"],
    ["textarea", "rich_text", "text"]
  );
  const imageField = firstFieldByPreference(collection.fields, ["image", "cover", "photo", "avatar"], ["image"]);
  const urlField = firstFieldByPreference(collection.fields, ["url", "link", "website"], ["url"]);
  const dateField = firstFieldByPreference(collection.fields, ["date", "published_at", "event_date"], ["date"]);

  return {
    collectionId: collection.id,
    collectionSlug: collection.slug,
    itemLimit: existing?.itemLimit ?? 6,
    targetNodeId: existing?.targetNodeId ?? null,
    detailPageId: existing?.detailPageId ?? null,
    detailSlugParam: existing?.detailSlugParam ?? "slug",
    fieldMapping: {
      ...(descriptionField ? { description: descriptionField } : {}),
      ...(imageField ? { image: imageField } : {}),
      ...(urlField ? { url: urlField } : {}),
      ...(dateField ? { date: dateField } : {}),
      ...(existing?.fieldMapping ?? {}),
    },
    seoFieldMapping: {
      title: existing?.seoFieldMapping?.title ?? "title",
      description: existing?.seoFieldMapping?.description ?? descriptionField,
      ogImageUrl: existing?.seoFieldMapping?.ogImageUrl ?? imageField,
    },
  };
}

function publicPathForPage(page: ProjectPage, collection?: CmsCollection | null) {
  if ((page.meta?.pageKind === "cms_listing" || page.meta?.pageKind === "cms_detail") && collection) {
    return `/${(page.meta.cmsBinding?.collectionSlug || collection.slug || page.slug || page.name)
      .replace(/^\/+|\/+$/g, "")
      .replace(/\s+/g, "-")}`;
  }
  const slug = (page.slug || page.name).replace(/^\/+|\/+$/g, "").replace(/\s+/g, "-");
  return slug === "home" || !slug ? "/" : `/${slug}`;
}

function PagePanelField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={PAGE_PANEL_LABEL}>{label}</span>
      {children}
      {hint ? <span className="block text-[11px] leading-5 text-[var(--text-tertiary)]">{hint}</span> : null}
    </label>
  );
}

function PagePanelSourceSelect({
  value,
  fields,
  onChange,
  allowEntryUrl = true,
  placeholder = "Use matching field key",
}: {
  value: string;
  fields: CmsField[];
  onChange: (value: string) => void;
  allowEntryUrl?: boolean;
  placeholder?: string;
}) {
  return (
    <select className={PAGE_PANEL_INPUT} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      <option value="title">Entry title</option>
      <option value="slug">Entry slug</option>
      {allowEntryUrl ? <option value="url">Entry URL</option> : null}
      {fields.length ? (
        <optgroup label="Collection fields">
          {fields.map((field) => (
            <option key={field.id} value={field.key}>
              {field.label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}

function PageMetaPanel({ project }: Props) {
  const selectedPageId = useAppStore((s) => s.editor.selectedPageId);
  const setPageMeta = useAppStore((s) => s.setPageMeta);
  const setApiError = useAppStore((s) => s.setApiError);
  const page = project.pages.find((candidate) => candidate.id === selectedPageId) ?? null;
  const [collections, setCollections] = useState<CmsCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCollectionsLoading(true);

    void fetch(`/api/projects/${project.id}/cms/collections`, { credentials: "same-origin" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          collections?: CmsCollection[];
          error?: string;
          code?: string;
          requestId?: string | null;
        };
        if (!response.ok) {
          throw createAppError({
            code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
            devMessage: `Failed to load CMS collections for page settings (${response.status})`,
            userMessage: data.error ?? "We couldn't load CMS collections for this project.",
            severity: "warn",
            metadata: { projectId: project.id, status: response.status, requestId: data.requestId ?? null },
          });
        }
        if (!cancelled) setCollections(Array.isArray(data.collections) ? data.collections : []);
      })
      .catch((error) => {
        if (cancelled) return;
        const appErr = normalizeError(error, API_UNKNOWN_001, { action: "loadPageMetaCollections", projectId: project.id });
        logAppError(appErr);
        setApiError({
          message: appErr.userMessage,
          requestId: typeof appErr.metadata?.requestId === "string" ? appErr.metadata.requestId : null,
          code: appErr.code,
        });
      })
      .finally(() => {
        if (!cancelled) setCollectionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [project.id, setApiError]);

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center px-3 text-center">
        <div className={PAGE_PANEL_CARD}>
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">No page selected</p>
          <p className="mt-1.5 text-[11.5px] leading-5 text-[var(--text-secondary)]">
            Pick a page from the structure panel to configure routing, CMS, and SEO.
          </p>
        </div>
      </div>
    );
  }

  const activePage = page;
  const meta = normalizeProjectPageMeta(activePage.meta, activePage);
  const defaultSeo = buildDefaultProjectPageSeo(activePage);
  const seo = meta.seo ?? defaultSeo;
  const boundCollection =
    collections.find((collection) => collection.id === meta.cmsBinding?.collectionId) ??
    collections.find((collection) => collection.slug === meta.cmsBinding?.collectionSlug) ??
    null;
  const effectiveBinding = boundCollection
    ? buildDefaultCmsBinding(boundCollection, meta.cmsBinding)
    : meta.cmsBinding;
  const cmsEnabled = meta.pageKind !== "static";
  const publicPath = publicPathForPage(activePage, boundCollection);

  function commit(nextMeta: ProjectPageMeta) {
    setPageMeta(activePage.id, normalizeProjectPageMeta(nextMeta, activePage));
  }

  function patchMeta(patch: Partial<ProjectPageMeta>) {
    commit({ ...meta, ...patch });
  }

  function setPageKind(pageKind: ProjectPageKind) {
    if (pageKind === "static") {
      patchMeta({ pageKind, cmsBinding: null });
      return;
    }

    const collection = boundCollection ?? collections[0] ?? null;
    patchMeta({
      pageKind,
      cmsBinding: collection ? buildDefaultCmsBinding(collection, meta.cmsBinding) : null,
    });
  }

  function updateSeo(patch: Partial<ProjectPageSeoSettings>) {
    patchMeta({
      seo: normalizeProjectPageSeo({ ...(meta.seo ?? defaultSeo), ...patch }, activePage),
    });
  }

  function updateBinding(patch: Partial<ProjectPageCmsBinding>) {
    const collection =
      collections.find((candidate) => candidate.id === patch.collectionId) ??
      boundCollection ??
      collections[0] ??
      null;
    if (!collection) return;
    const base = buildDefaultCmsBinding(collection, effectiveBinding);
    patchMeta({
      pageKind: meta.pageKind === "static" ? "cms_listing" : meta.pageKind,
      cmsBinding: {
        ...base,
        ...patch,
        collectionId: collection.id,
        collectionSlug: patch.collectionSlug ?? collection.slug,
      },
    });
  }

  function updateFieldMapping(slot: string, sourceKey: string) {
    if (!effectiveBinding) return;
    const nextMapping = { ...(effectiveBinding.fieldMapping ?? {}) };
    if (sourceKey.trim()) nextMapping[slot] = sourceKey.trim();
    else delete nextMapping[slot];
    updateBinding({ fieldMapping: nextMapping });
  }

  function updateSeoFieldMapping(slot: keyof ProjectPageCmsBinding["seoFieldMapping"], sourceKey: string) {
    if (!effectiveBinding) return;
    updateBinding({
      seoFieldMapping: {
        ...effectiveBinding.seoFieldMapping,
        [slot]: sourceKey.trim() || null,
      },
    });
  }

  return (
    <div className="sz-scroll-hidden flex h-full min-h-0 flex-col overflow-y-auto pr-1">
      <div className="space-y-3 pb-3">
        <div className={PAGE_PANEL_CARD}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={PAGE_PANEL_LABEL}>Selected page</p>
              <h3 className="mt-1 truncate text-[16px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{page.name}</h3>
              <p className="mt-1 text-[11.5px] text-[var(--text-tertiary)]">{publicPath}</p>
            </div>
            <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-4)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
              rev {page.revision ?? 1}
            </span>
          </div>
        </div>

        <div className={PAGE_PANEL_CARD}>
          <p className={PAGE_PANEL_LABEL}>Page kind</p>
          <div className="mt-3 grid gap-2">
            {PAGE_KIND_OPTIONS.map((option) => {
              const disabled = option.key !== "static" && !collections.length;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setPageKind(option.key)}
                  disabled={disabled}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45",
                    meta.pageKind === option.key
                      ? "border-[var(--border-focus)] bg-[rgba(107,119,255,0.14)] text-[var(--text-primary)]"
                      : "border-[var(--border-soft)] bg-[var(--surface-4)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  )}
                >
                  <span className="block text-[12.5px] font-semibold">{option.label}</span>
                  <span className="mt-1 block text-[11px] leading-5 text-[var(--text-tertiary)]">{option.body}</span>
                </button>
              );
            })}
          </div>
          {!collections.length ? (
            <p className="mt-3 text-[11px] leading-5 text-[var(--text-tertiary)]">
              {collectionsLoading ? "Loading CMS collections..." : "Create a CMS collection before binding list or detail pages."}
            </p>
          ) : null}
        </div>

        <div className={PAGE_PANEL_CARD}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={PAGE_PANEL_LABEL}>Approval</p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)]">Track review state for shared previews.</p>
            </div>
            <select
              className="min-h-9 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-4)] px-2.5 text-[12px] text-[var(--text-primary)] outline-none"
              value={meta.approvalStatus}
              onChange={(event) => patchMeta({ approvalStatus: event.target.value as ProjectPageMeta["approvalStatus"] })}
            >
              <option value="draft">Draft</option>
              <option value="in_review">In review</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          <div className="mt-3">
            <PagePanelField label="Share title" hint="Optional label used by collaboration and preview-share surfaces.">
              <input
                className={PAGE_PANEL_INPUT}
                value={meta.shareTitle ?? ""}
                onChange={(event) => patchMeta({ shareTitle: event.target.value })}
                placeholder={`${page.name} review`}
              />
            </PagePanelField>
          </div>
        </div>

        {cmsEnabled ? (
          <div className={PAGE_PANEL_CARD}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={PAGE_PANEL_LABEL}>CMS binding</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)]">
                  Bind repeatable blocks with <code className="text-[var(--text-secondary)]">data-sz-field</code> attributes to collection fields.
                </p>
              </div>
              {collectionsLoading ? <Loader2 size={13} className="mt-0.5 animate-spin text-[var(--text-accent)]" /> : null}
            </div>

            <div className="mt-3 space-y-3">
              <PagePanelField label="Collection">
                <select
                  className={PAGE_PANEL_INPUT}
                  value={effectiveBinding?.collectionId ?? ""}
                  onChange={(event) => {
                    const collection = collections.find((candidate) => candidate.id === event.target.value) ?? null;
                    if (collection) updateBinding(buildDefaultCmsBinding(collection, effectiveBinding));
                  }}
                >
                  <option value="">Select collection</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </PagePanelField>

              {effectiveBinding && boundCollection ? (
                <>
                  <PagePanelField label="Public base path" hint="Listing and detail routes use this collection slug as their public base.">
                    <input
                      className={PAGE_PANEL_INPUT}
                      value={effectiveBinding.collectionSlug ?? boundCollection.slug}
                      onChange={(event) => updateBinding({ collectionSlug: event.target.value })}
                      placeholder={boundCollection.slug}
                    />
                  </PagePanelField>

                  {meta.pageKind === "cms_listing" ? (
                    <div className="grid grid-cols-[1fr_1fr] gap-2">
                      <PagePanelField label="Item limit">
                        <input
                          className={PAGE_PANEL_INPUT}
                          type="number"
                          min={1}
                          max={100}
                          value={effectiveBinding.itemLimit ?? ""}
                          onChange={(event) =>
                            updateBinding({
                              itemLimit: event.target.value ? Math.max(1, Number(event.target.value)) : null,
                            })
                          }
                          placeholder="All"
                        />
                      </PagePanelField>
                      <PagePanelField label="Detail page">
                        <select
                          className={PAGE_PANEL_INPUT}
                          value={effectiveBinding.detailPageId ?? ""}
                          onChange={(event) => updateBinding({ detailPageId: event.target.value || null })}
                        >
                          <option value="">Use /{effectiveBinding.collectionSlug ?? boundCollection.slug}/:slug</option>
                          {project.pages
                            .filter((candidate) => candidate.id !== page.id)
                            .map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name}
                              </option>
                            ))}
                        </select>
                      </PagePanelField>
                    </div>
                  ) : (
                    <PagePanelField label="Slug param" hint="Reserved for future route params; v1 resolves published entries by slug.">
                      <input
                        className={PAGE_PANEL_INPUT}
                        value={effectiveBinding.detailSlugParam}
                        onChange={(event) => updateBinding({ detailSlugParam: event.target.value || "slug" })}
                        placeholder="slug"
                      />
                    </PagePanelField>
                  )}

                  <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-4)] p-3">
                    <p className={PAGE_PANEL_LABEL}>Field mapping</p>
                    <div className="mt-3 space-y-2">
                      {CMS_TEMPLATE_FIELDS.map((slot) => (
                        <div key={slot.key} className="grid grid-cols-[84px_1fr] items-center gap-2">
                          <span className="text-[11px] font-medium text-[var(--text-secondary)]">{slot.label}</span>
                          <PagePanelSourceSelect
                            value={effectiveBinding.fieldMapping?.[slot.key] ?? ""}
                            fields={boundCollection.fields}
                            onChange={(value) => updateFieldMapping(slot.key, value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-4)] p-3">
                    <p className={PAGE_PANEL_LABEL}>CMS SEO mapping</p>
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-[84px_1fr] items-center gap-2">
                        <span className="text-[11px] font-medium text-[var(--text-secondary)]">Title</span>
                        <PagePanelSourceSelect
                          value={effectiveBinding.seoFieldMapping.title ?? ""}
                          fields={boundCollection.fields}
                          allowEntryUrl={false}
                          placeholder="Entry title"
                          onChange={(value) => updateSeoFieldMapping("title", value)}
                        />
                      </div>
                      <div className="grid grid-cols-[84px_1fr] items-center gap-2">
                        <span className="text-[11px] font-medium text-[var(--text-secondary)]">Summary</span>
                        <PagePanelSourceSelect
                          value={effectiveBinding.seoFieldMapping.description ?? ""}
                          fields={boundCollection.fields}
                          allowEntryUrl={false}
                          placeholder="Project/page description"
                          onChange={(value) => updateSeoFieldMapping("description", value)}
                        />
                      </div>
                      <div className="grid grid-cols-[84px_1fr] items-center gap-2">
                        <span className="text-[11px] font-medium text-[var(--text-secondary)]">OG image</span>
                        <PagePanelSourceSelect
                          value={effectiveBinding.seoFieldMapping.ogImageUrl ?? ""}
                          fields={boundCollection.fields}
                          allowEntryUrl={false}
                          placeholder="Project/page OG image"
                          onChange={(value) => updateSeoFieldMapping("ogImageUrl", value)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-4)] px-3 py-3 text-[11.5px] leading-5 text-[var(--text-secondary)]">
                  Select a collection to enable field mapping for this CMS page.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <div className={PAGE_PANEL_CARD}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={PAGE_PANEL_LABEL}>Page SEO</p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)]">
                Override project defaults for title, description, canonical, social image, and noindex.
              </p>
            </div>
            <EditorSwitch
              checked={Boolean(meta.seo)}
              onChange={() => patchMeta({ seo: meta.seo ? null : defaultSeo })}
              title={meta.seo ? "Disable page SEO override" : "Enable page SEO override"}
              className="scale-[0.86]"
            />
          </div>

          <div className={cn("mt-3 space-y-3", !meta.seo && "pointer-events-none opacity-45")}>
            <PagePanelField label="Title">
              <input
                className={PAGE_PANEL_INPUT}
                value={seo.title}
                onChange={(event) => updateSeo({ title: event.target.value })}
                placeholder={defaultSeo.title}
              />
            </PagePanelField>
            <PagePanelField label="Description">
              <textarea
                className={`${PAGE_PANEL_INPUT} min-h-[82px] resize-none`}
                value={seo.description}
                onChange={(event) => updateSeo({ description: event.target.value })}
                placeholder={defaultSeo.description}
              />
            </PagePanelField>
            <PagePanelField label="Canonical URL">
              <input
                className={PAGE_PANEL_INPUT}
                value={seo.canonicalUrl}
                onChange={(event) => updateSeo({ canonicalUrl: event.target.value })}
                placeholder={`https://example.com${publicPath}`}
              />
            </PagePanelField>
            <PagePanelField label="OG image URL">
              <input
                className={PAGE_PANEL_INPUT}
                value={seo.ogImageUrl}
                onChange={(event) => updateSeo({ ogImageUrl: event.target.value })}
                placeholder="https://images.example.com/social-card.jpg"
              />
            </PagePanelField>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-4)] px-3 py-2.5">
              <div>
                <p className="text-[12px] font-semibold text-[var(--text-primary)]">Noindex this page</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)]">Prevent this page from appearing in search results.</p>
              </div>
              <EditorSwitch
                checked={seo.noindex}
                onChange={() => updateSeo({ noindex: !seo.noindex })}
                disabled={!meta.seo}
                className="scale-[0.82]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Panel ──────────────────────────────────────────────────────────────────

// ── AI Panel ──────────────────────────────────────────────────────────────────
function AIPanel({ project }: Props) {
  const selectedPageId   = useAppStore((s) => s.editor.selectedPageId);
  const selectedNode     = useAppStore((s) => s.editor.selectedNode);
  const selectedSectionId = useAppStore((s) => s.editor.selectedSectionId);
  const aiChats          = useAppStore((s) => s.aiChats);
  const aiDraftPrompt    = useAppStore((s) => s.aiDraftPrompt);
  const addChatMessage   = useAppStore((s) => s.addChatMessage);
  const setAiDraftPrompt = useAppStore((s) => s.setAiDraftPrompt);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const clearChat        = useAppStore((s) => s.clearChat);
  const setApiError      = useAppStore((s) => s.setApiError);
  const setPageContent   = useAppStore((s) => s.setPageContent);
  const addGenLog        = useAppStore((s) => s.addGenLog);

  const pages    = project?.pages ?? [];
  const page     = pages.find((p) => p.id === selectedPageId) ?? null;
  const msgs: AIChatMessage[] = aiChats[currentProjectId ?? ""] ?? [];
  const assistCostLabel = formatCreditAmount(getAIUsageCost("assist"));

  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => {
    if (!aiDraftPrompt) return;
    setAiDraftPrompt(null);
    send(aiDraftPrompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiDraftPrompt]);

  const suggestions = selectedNode && selectedNode.sectionName
    ? [`Improve ${selectedNode.sectionName}`, `Rewrite ${selectedNode.sectionName} copy`, "Change layout variant", "Make it bolder"]
    : selectedSectionId
    ? ["Rewrite this section", "Change layout", "Make it more premium", "Stronger CTA"]
    : page
    ? [`Improve ${page.name} copy`, "Make it more premium", "Stronger CTA", "Bolder headings", "Layout improvements"]
    : ["Improve hero copy", "Make it minimal", "Add a CTA", "Better tagline"];

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput(""); setLoading(true);
    const uid1 = uid();
    addChatMessage(currentProjectId ?? "", { id: uid1, role: "user", content: text, timestamp: Date.now(), pageId: selectedPageId ?? undefined });
    const aid = uid(); let full = "";
    try {
      // Build conversation history from existing messages (strip edit markers)
      const chatHistory = msgs
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      // Determine edit scope from selection state
      const scope = selectedNode ? "element" as const
        : selectedSectionId ? "section" as const
        : "page" as const;

      const res = await fetch("/api/assist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: text,
          context: {
            projectName: project.name,
            blueprint: project.blueprint,
            brief: project.brief,
            pageName: page?.name,
            pageHtml: page?.html,
            siteType: project.brief?.siteType,
            selectedSectionId: selectedSectionId ?? null,
            selectedElement: selectedNode ? {
              nodeId: selectedNode.nodeId,
              tagName: selectedNode.tag ?? "div",
              textContent: selectedNode.label?.slice(0, 200) ?? undefined,
              sectionId: selectedNode.sectionId ?? selectedSectionId ?? undefined,
            } : null,
            history: chatHistory,
            scope,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; code?: string; requestId?: string | null };
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `AI assist request failed (${res.status}): ${data.error ?? "unknown error"}`,
          userMessage: data.error,
          severity: res.status >= 500 ? "error" : "warn",
          metadata: { pageId: page?.id ?? null, pageName: page?.name ?? null, requestId: data.requestId ?? null, status: res.status },
        });
      }
      addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: "▌", timestamp: Date.now() });
      const reader = res.body?.getReader(); const dec = new TextDecoder();
      if (!reader) {
        throw createAppError({
          code: API_RESPONSE_001,
          devMessage: "AI assist response body was missing a stream reader",
          severity: "error",
          metadata: { pageId: page?.id ?? null, pageName: page?.name ?? null },
        });
      }
      let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(l.slice(6)) as { type: string; chunk?: string; error?: string; requestId?: string; code?: string };
            if (d.type === "chunk") {
              full += d.chunk;
              const display = stripEditMarkers(full) || "▌";
              addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: display, timestamp: Date.now() });
            }
            if (d.type === "error") {
              if (d.requestId || d.code) setApiError({ message: d.error ?? "AI error", requestId: d.requestId ?? null, code: d.code ?? API_UNKNOWN_001 });
              addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: `⚠️ ${d.error ?? "Something went wrong"}`, timestamp: Date.now() });
            }
          } catch {}
        }
      }

      // Stream complete — parse the reply, finalise the visible message, apply any edit.
      const parsed = parseAssistReply(full);
      const finalMessage = parsed.message || (parsed.edit ? "Done." : full.trim());
      addChatMessage(currentProjectId ?? "", { id: aid, role: "assistant", content: finalMessage, timestamp: Date.now() });

      if (parsed.edit && page && parsed.edit.html) {
        const sectionId = parsed.edit.sectionId?.trim();
        let nextHtml: string | null = null;
        if (sectionId) {
          nextHtml = replaceSectionById(page.html ?? "", sectionId, parsed.edit.html);
        }
        if (nextHtml) {
          setPageContent(page.id, nextHtml, page.sections);
          addGenLog(`✅ ${parsed.edit.sectionType ?? "Section"} updated`, "success");
        } else {
          addChatMessage(currentProjectId ?? "", {
            id: uid(),
            role: "assistant",
            content: "⚠️ I couldn't locate that section to update. Try selecting it first or rephrasing the request.",
            timestamp: Date.now(),
          });
        }
      }
    } catch (err) {
      const { appErr, apiError } = buildClientApiError(err, API_UNKNOWN_001, {
        pageId: page?.id ?? null,
        pageName: page?.name ?? null,
      });
      logAppError(appErr);
      setApiError(apiError);
      addChatMessage(currentProjectId ?? "", { id: uid(), role: "assistant", content: `⚠️ ${appErr.userMessage}`, timestamp: Date.now() });
    } finally { setLoading(false); }
  }

  const deduped = msgs.reduce<AIChatMessage[]>((acc, m) => {
    const i = acc.findIndex((x) => x.id === m.id);
    if (i >= 0) { acc[i] = m; return acc; }
    return [...acc, m];
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-auto p-3 space-y-2 min-h-0">
        {deduped.length === 0 ? (
          <div className="py-6 px-3 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B8CFF]/10">
              <Sparkles size={15} className="text-[#5B8CFF]/70"/>
            </div>
            <p className="text-[12px] text-[var(--text-secondary)]">{page ? `AI for ${page.name}` : "Ask about your site"}</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">{assistCostLabel} per prompt</p>
            <div className="space-y-1.5 text-left">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="block w-full rounded-xl bg-[var(--surface-3)] px-3 py-2.5 text-left text-[12px] text-[var(--text-secondary)] transition-all duration-150 shadow-[inset_0_0_0_1px_var(--border-soft)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)] hover:shadow-[inset_0_0_0_1px_var(--border-strong)]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => clearChat(currentProjectId ?? "")}
              className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-4)] hover:text-[var(--text-secondary)]">
              <X size={9}/> Clear
            </button>
            {deduped.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] px-3.5 py-2.5 text-[11.5px] leading-relaxed rounded-2xl ${
                  m.role === "user"
                    ? "bg-[#5B8CFF]/15 text-[var(--text-primary)] rounded-br-sm"
                    : "bg-[var(--surface-3)] text-[var(--text-secondary)] rounded-bl-sm shadow-[inset_0_0_0_1px_var(--border-soft)]"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-[var(--surface-3)] px-3 py-2 shadow-[inset_0_0_0_1px_var(--border-soft)]">
                  <Loader2 size={11} className="text-[#5B8CFF] animate-spin"/>
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </>
        )}
      </div>
      <div className="border-t border-[var(--border-soft)] p-3 flex-shrink-0">
        <div className="mb-2 text-[11px] text-[var(--text-tertiary)]">
          {assistCostLabel} per prompt
        </div>
        <div className="flex items-end gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask AI to improve your site…" rows={2}
            className="flex-1 resize-none rounded-xl border border-[var(--border-soft)] bg-[var(--surface-4)] px-3 py-2.5 text-[11.5px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none transition-colors focus:border-[var(--border-focus)]"/>
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="w-8 h-8 flex items-center justify-center bg-[#5B8CFF] hover:bg-[#6B99FF] disabled:opacity-20 rounded-xl transition-colors flex-shrink-0 shadow-[0_2px_8px_rgba(91,140,255,0.2)]">
            {loading ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Blocks Panel ──────────────────────────────────────────────────────────────
function BlocksPanel({ project }: Props) {
  const [cat,    setCat]    = useState<"all" | ElementCategoryKey>("all");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string|null>(null);
  const [aiStatus, setAiStatus] = useState<{ msg: string; type: "loading"|"success"|"error" } | null>(null);
  const [useAI,  setUseAI]  = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [showAllCats, setShowAllCats] = useState(false);
  const insertBlock   = useAppStore((s) => s.insertBlock);
  const setPageContent= useAppStore((s) => s.setPageContent);
  const addGenLog     = useAppStore((s) => s.addGenLog);
  const setApiError   = useAppStore((s) => s.setApiError);
  const selectedPageId= useAppStore((s) => s.editor.selectedPageId);
  const selectedSectionId = useAppStore((s) => s.editor.selectedSectionId);
  const selectedNode = useAppStore((s) => s.editor.selectedNode);
  const page = (project?.pages ?? []).find((p) => p.id === selectedPageId) ?? null;
  const selectedSection = page?.sections.find((sec) => sec.id === selectedSectionId) ?? null;
  const searchQuery = search.trim().toLowerCase();
  const aiInsertCostLabel = formatCreditAmount(getAIUsageCost("insert-block"));

  const dragOverlayRef = useRef<HTMLDivElement | null>(null);
  const dropLineRef    = useRef<HTMLDivElement | null>(null);
  const dropHintRef    = useRef<HTMLDivElement | null>(null);
  const categoryTabs = useMemo(() => EDITOR_INSERTION_CATEGORIES, []);
  const CATEGORY_ICON_MAP: Record<string, typeof LayoutGrid> = {
    all: LayoutGrid,
    sections: Rows3,
    layout: Columns3,
    basic: Square,
    media: ImageIcon,
    navigation: Menu,
    typography: Type,
    interactive: MousePointerClick,
    forms: FormInput,
    advanced: Sparkles,
    icons: Shapes,
  };
  const categoryOrder = useMemo(
    () =>
      ["all", "sections", "layout", "basic", "media", "navigation", "typography", "interactive", "forms", "advanced", "icons"]
        .map((key) => categoryTabs.find((tab) => tab.key === key))
        .filter((tab): tab is InsertionCategory => !!tab),
    [categoryTabs]
  );

  function blockScore(block: BlockElementDefinition) {
    let score = 0;

    if (!selectedNode && !selectedSectionId) {
      if (block.placement === "section") score += 3;
      if (block.placement === "top" || block.placement === "bottom") score += 1;
    }

    if (selectedSectionId) {
      if (block.placement === "inline") score += 3;
      if (block.placement === "section") score += 1;
    }

    if (selectedNode?.isText || selectedNode?.isBtn) {
      if (block.placement === "inline") score += 4;
      if (["heading", "paragraph", "button", "button-outline", "badge", "blockquote", "divider"].includes(block.id)) score += 3;
    }

    if (selectedNode?.isImg || selectedNode?.isVideo || selectedNode?.isIframe) {
      if (block.category === "media") score += 4;
      if (block.placement === "inline") score += 2;
    }

    if (selectedNode?.isInput || selectedNode?.tag === "form") {
      if (block.category === "forms") score += 5;
      if (block.placement === "inline") score += 2;
      if (block.placement === "section") score -= 1;
    }

    if (selectedNode && (block.placement === "top" || block.placement === "bottom")) score -= 1;
    return score;
  }

  function blockPriority(block: BlockElementDefinition) {
    let priority = priorityRank(DEFAULT_BLOCK_PRIORITY, block.id);

    if (!selectedNode && !selectedSectionId) {
      if (priority === Number.MAX_SAFE_INTEGER) {
        priority =
          block.placement === "section"
            ? 400
            : block.placement === "top" || block.placement === "bottom"
            ? 520
            : 640;
      }
      return priority;
    }

    if (selectedSectionId) {
      priority = Math.min(priority, priorityRank(INLINE_BLOCK_PRIORITY, block.id));
      if (priority === Number.MAX_SAFE_INTEGER) {
        priority =
          block.placement === "inline"
            ? 260
            : block.placement === "section"
            ? 360
            : 560;
      }
      return priority;
    }

    if (selectedNode?.isInput || selectedNode?.tag === "form") {
      priority = Math.min(priority, priorityRank(FORM_BLOCK_PRIORITY, block.id));
    }

    if (selectedNode?.isImg || selectedNode?.isVideo || selectedNode?.isIframe) {
      priority = Math.min(priority, priorityRank(MEDIA_BLOCK_PRIORITY, block.id));
    }

    if (selectedNode?.isText || selectedNode?.isBtn) {
      priority = Math.min(priority, priorityRank(TEXT_BLOCK_PRIORITY, block.id));
    }

    if (priority === Number.MAX_SAFE_INTEGER) {
      priority =
        block.placement === "inline"
          ? 280
          : block.category === "media"
          ? 340
          : block.category === "forms"
          ? 360
          : 460;
    }

    return priority;
  }

  function placementText(block: BlockElementDefinition) {
    if (block.placement === "top") return "Top of page";
    if (block.placement === "bottom") return "Bottom of page";
    if (block.placement === "section") return selectedSection?.name ? `After ${selectedSection.name}` : "Next section";
    if (selectedNode?.isInput || selectedNode?.tag === "form") return "Current form";
    if (selectedNode?.label) return `Near ${selectedNode.label}`;
    if (selectedSection?.name) return `Inside ${selectedSection.name}`;
    return "Current page";
  }

  const filtered = useMemo(() => {
    return BLOCK_PICKER_DEFINITIONS
      .filter((block) => cat === "all" || block.category === cat)
      .filter((block) => {
        if (!searchQuery) return true;
        return (
          block.label.toLowerCase().includes(searchQuery) ||
          block.preview.toLowerCase().includes(searchQuery) ||
          block.id.toLowerCase().includes(searchQuery) ||
          block.keywords.some((keyword) => keyword.includes(searchQuery))
        );
      })
      .map((block) => ({
        block,
        score: blockScore(block),
        priority: blockPriority(block),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.block.label.localeCompare(b.block.label);
      });
  }, [cat, searchQuery, selectedNode, selectedSectionId, selectedSection?.name]);

  function canReplaceSelectedTextWithIcon() {
    if (!selectedNode || !selectedNode.hasEditableText || selectedNode.isInput) return false;
    const text = String(selectedNode.editableText ?? selectedNode.text ?? "").trim();
    if (!text) return false;
    const compact = text.replace(/\s+/g, "");
    if (!compact) return false;
    if (!/[A-Za-z0-9]/.test(compact) && compact.length <= 8) return true;
    const decorativeChars = new Set(Array.from("★☆✦✧•◦▪▫■□◆◇◎◉○●◌⬤⬥⚡🔥💡🚀📍🎯✨⭐🌟❖❋❂❈❉❊✳✴✶✹✺✸✚➜➤➔→←↑↓"));
    return Array.from(compact).every((ch) => decorativeChars.has(ch) || ch.codePointAt(0)! > 0x1f000);
  }

  function getIframe() {
    return document.querySelector('iframe[data-sitezy-preview-frame="1"]') as HTMLIFrameElement | null;
  }

  function getSections(iframe: HTMLIFrameElement): HTMLElement[] {
    const doc = iframe.contentDocument;
    if (!doc) return [];
    return Array.from(doc.body.children).filter(
      (el) => !["SCRIPT","STYLE","NOSCRIPT"].includes(el.tagName)
    ) as HTMLElement[];
  }

  function sectionLabel(section: HTMLElement | null) {
    return section?.getAttribute("data-sz-section-name") || section?.getAttribute("data-sz-section-type") || "section";
  }

  function ensureDropHint() {
    if (dropHintRef.current) return dropHintRef.current;
    const hint = document.createElement("div");
    hint.style.cssText = [
      "position:fixed",
      "z-index:100001",
      "pointer-events:none",
      "display:none",
      "max-width:240px",
      "padding:10px 12px",
      "border-radius:14px",
      "border:1px solid rgba(255,255,255,0.08)",
      "background:linear-gradient(180deg,rgba(18,22,31,0.96),rgba(10,13,20,0.98))",
      "box-shadow:0 16px 40px rgba(0,0,0,0.28)",
      "backdrop-filter:blur(12px)",
      "color:rgba(255,255,255,0.86)",
      "font-size:11px",
      "font-weight:600",
      "line-height:1.4",
      "text-align:center",
      "transform:translate(-50%,-50%)",
    ].join(";");
    document.body.appendChild(hint);
    dropHintRef.current = hint;
    return hint;
  }

  function showDropHint(text: string, left: number, top: number) {
    const hint = ensureDropHint();
    hint.textContent = text;
    hint.style.left = `${left}px`;
    hint.style.top = `${top}px`;
    hint.style.display = "";
  }

  // Show an overlay that detects section boundaries (for "section" placement blocks).
  // Calls onDrop(afterSectionId) where null = before first / before footer.
  function showSectionOverlay(onDrop: (afterSectionId: string | null) => void) {
    const iframe = getIframe();
    if (!iframe) { onDrop(null); return; }
    const r = iframe.getBoundingClientRect();

    const line = document.createElement("div");
    line.style.cssText = `position:fixed;left:${r.left}px;width:${r.width}px;height:3px;background:#4f7eff;border-radius:2px;z-index:100000;display:none;pointer-events:none;box-shadow:0 0 8px rgba(79,126,255,.55);`;
    document.body.appendChild(line);
    dropLineRef.current = line;

    let afterSectionId: string | null = null;

    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:linear-gradient(180deg,rgba(79,126,255,0.04),rgba(79,126,255,0.02));border:1px dashed rgba(79,126,255,.34);border-radius:16px;box-sizing:border-box;pointer-events:all;`;

    overlay.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      const sections = getSections(iframe);
      if (!sections.length) {
        afterSectionId = null;
        line.style.display = "none";
        showDropHint("Drop to add the first section", r.left + r.width / 2, r.top + r.height / 2);
        return;
      }
      const mouseY = e.clientY;
      let placed = false;
      for (let i = 0; i < sections.length; i++) {
        const sr = sections[i].getBoundingClientRect();
        const midY = r.top + (sr.top + sr.bottom) / 2;
        if (mouseY < midY) {
          afterSectionId = i > 0 ? (sections[i-1].getAttribute("data-sz-section-id") ?? null) : null;
          line.style.top = `${r.top + sr.top}px`;
          line.style.display = "";
          showDropHint(
            i > 0 ? `Drop after ${sectionLabel(sections[i - 1])}` : "Drop at the top of the page",
            r.left + r.width / 2,
            r.top + sr.top - 20
          );
          placed = true;
          break;
        }
      }
      if (!placed) {
        const last = sections[sections.length-1];
        afterSectionId = last.getAttribute("data-sz-section-id") ?? null;
        line.style.top = `${r.top + last.getBoundingClientRect().bottom}px`;
        line.style.display = "";
        showDropHint(`Drop after ${sectionLabel(last)}`, r.left + r.width / 2, r.top + last.getBoundingClientRect().bottom + 20);
      }
    });
    overlay.addEventListener("dragleave", () => {
      line.style.display = "none";
      if (dropHintRef.current) dropHintRef.current.style.display = "none";
    });
    overlay.addEventListener("drop", (e) => { e.preventDefault(); onDrop(afterSectionId); hideDropOverlay(); });
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;
  }

  // Show an overlay that highlights the hovered section (for "inline" placement blocks).
  // Calls onDrop(sectionId) with the section the mouse was over.
  function showInlineOverlay(onDrop: (sectionId: string | null) => void) {
    const iframe = getIframe();
    if (!iframe) { onDrop(null); return; }
    const r = iframe.getBoundingClientRect();

    const highlight = document.createElement("div");
    highlight.style.cssText = `position:fixed;background:rgba(79,126,255,.10);border:2px solid rgba(79,126,255,.5);border-radius:4px;z-index:100000;pointer-events:none;display:none;transition:top .08s,height .08s;`;
    document.body.appendChild(highlight);
    dropLineRef.current = highlight;

    let hoveredSectionId: string | null = null;

    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:linear-gradient(180deg,rgba(79,126,255,0.035),rgba(79,126,255,0.015));border:1px dashed rgba(79,126,255,.28);border-radius:16px;box-sizing:border-box;pointer-events:all;`;

    overlay.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      const sections = getSections(iframe);
      const mouseY = e.clientY;
      for (const sec of sections) {
        const sr = sec.getBoundingClientRect();
        if (mouseY >= r.top + sr.top && mouseY <= r.top + sr.bottom) {
          hoveredSectionId = sec.getAttribute("data-sz-section-id") ?? null;
          highlight.style.left = `${r.left}px`;
          highlight.style.top = `${r.top + sr.top}px`;
          highlight.style.width = `${r.width}px`;
          highlight.style.height = `${sr.height}px`;
          highlight.style.display = "";
          showDropHint(`Insert into ${sectionLabel(sec)}`, r.left + r.width / 2, r.top + sr.top + Math.min(sr.height * 0.18, 42));
          return;
        }
      }
      hoveredSectionId = null;
      highlight.style.display = "none";
      if (dropHintRef.current) dropHintRef.current.style.display = "none";
    });
    overlay.addEventListener("dragleave", () => {
      highlight.style.display = "none";
      if (dropHintRef.current) dropHintRef.current.style.display = "none";
    });
    overlay.addEventListener("drop", (e) => { e.preventDefault(); onDrop(hoveredSectionId); hideDropOverlay(); });
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;
  }

  // Simple overlay for top/bottom blocks — any drop calls onDrop(null).
  function showSimpleOverlay(onDrop: () => void) {
    const iframe = getIframe();
    if (!iframe) { onDrop(); return; }
    const r = iframe.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99999;background:rgba(79,126,255,.06);border:1px dashed rgba(79,126,255,.34);border-radius:16px;box-sizing:border-box;pointer-events:all;`;
    overlay.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      showDropHint("Drop to place this block on the page", r.left + r.width / 2, r.top + r.height / 2);
    });
    overlay.addEventListener("drop", (e) => { e.preventDefault(); onDrop(); hideDropOverlay(); });
    document.body.appendChild(overlay);
    dragOverlayRef.current = overlay;
  }

  function hideDropOverlay() {
    dropLineRef.current?.remove();
    dropLineRef.current = null;
    dropHintRef.current?.remove();
    dropHintRef.current = null;
    dragOverlayRef.current?.remove();
    dragOverlayRef.current = null;
  }

  useEffect(() => () => hideDropOverlay(), []);

  function sendToIframe(type: string, html: string, sectionId?: string | null, extra?: Record<string, unknown>) {
    const iframe = getIframe();
    if (!iframe?.contentWindow) {
      const blockId = typeof extra?.blockId === "string" ? extra.blockId : null;
      if (blockId && getBlockDefinition(blockId)) insertBlock(blockId);
      return;
    }
    iframe.contentWindow.postMessage({ target: "sitezy-iframe", type, html, sectionId: sectionId ?? null, ...(extra ?? {}) }, "*");
  }

  function addIcon(icon: IconElementDefinition, targetId?: string | null) {
    const html = renderEditorElementHtml(icon.id, project, page, {
      placementHint: icon.placement,
    });
    const canReplace = targetId === undefined && canReplaceSelectedTextWithIcon();
    sendToIframe(canReplace ? "replace-text-with-icon" : "insert-smart", html, targetId ?? selectedSectionId ?? selectedNode?.sectionId ?? null, {
      blockId: icon.id,
      placement: "inline",
      nodeId: (selectedNode?.textTargetNodeId ?? selectedNode?.nodeId) ?? null,
    });
  }

  async function add(block: BlockElementDefinition, targetId?: string | null) {
    if (adding) return;
    setAdding(block.id);
    if (!useAI) {
      const html = renderEditorElementHtml(block.id, project, page, {
        placementHint: block.placement,
      });

      if (targetId === undefined) {
        sendToIframe("insert-smart", html, selectedSectionId ?? selectedNode?.sectionId ?? null, {
          blockId: block.id,
          placement: block.placement,
          nodeId: selectedNode?.nodeId ?? null,
        });
      } else {
        switch (block.placement) {
          case "top":
            sendToIframe("insert-top", html, null, { blockId: block.id });
            break;
          case "bottom":
            sendToIframe("insert-bottom", html, null, { blockId: block.id });
            break;
          case "inline":
            sendToIframe("insert-in-section", html, targetId ?? null, { blockId: block.id });
            break;
          case "section":
          default:
            sendToIframe("insert-after-section", html, targetId ?? null, { blockId: block.id });
            break;
        }
      }
      addGenLog(`✅ ${block.label} added`, "success");
      setAdding(null);
      return;
    }
    if (!page) { setAdding(null); setAiStatus({ msg: "No page selected.", type: "error" }); setTimeout(() => setAiStatus(null), 3000); return; }
    if (!project.blueprint) { setAdding(null); setAiStatus({ msg: "Project blueprint missing — regenerate the site first.", type: "error" }); setTimeout(() => setAiStatus(null), 4000); return; }
    setAiStatus({ msg: `Generating ${block.label}…`, type: "loading" });
    addGenLog(`🤖 Generating ${block.label}…`, "progress");
    try {
      // ── Determine insertion context ──────────────────────────────────────────
      const existingSections = page.sections.map((s) => s.name);
      let previousSectionName: string | null = null;
      let nextSectionName: string | null = null;
      let afterSectionId: string | null = null;
      let targetSectionId: string | null = null;

      if (block.placement === "section") {
        // targetId (from drag-drop) takes priority
        if (targetId !== undefined && targetId !== null) {
          afterSectionId = targetId;
          const afterIdx = page.sections.findIndex((s) => s.id === targetId);
          if (afterIdx >= 0) {
            previousSectionName = page.sections[afterIdx].name;
            nextSectionName = page.sections[afterIdx + 1]?.name ?? null;
          }
        } else if (selectedSectionId) {
          afterSectionId = selectedSectionId;
          const afterIdx = page.sections.findIndex((s) => s.id === selectedSectionId);
          if (afterIdx >= 0) {
            previousSectionName = page.sections[afterIdx].name;
            nextSectionName = page.sections[afterIdx + 1]?.name ?? null;
          }
        } else {
          // Default: insert before footer / last section
          const footerIdx = page.sections.findIndex((s) =>
            s.type === "footer" || s.name.toLowerCase().includes("footer")
          );
          const beforeIdx = footerIdx > 0 ? footerIdx - 1 : page.sections.length - 1;
          if (beforeIdx >= 0) {
            afterSectionId = page.sections[beforeIdx].id;
            previousSectionName = page.sections[beforeIdx].name;
            nextSectionName = page.sections[beforeIdx + 1]?.name ?? null;
          }
        }
      } else if (block.placement === "inline") {
        targetSectionId = targetId ?? selectedSectionId ?? selectedNode?.sectionId ?? null;
        if (selectedSection) {
          previousSectionName = selectedSection.name;
          const selIdx = page.sections.findIndex((s) => s.id === selectedSectionId);
          nextSectionName = selIdx >= 0 ? (page.sections[selIdx + 1]?.name ?? null) : null;
        }
      }

      // ── Extract existing navbar HTML so AI-inserted navbars stay consistent ──
      const existingNavbarHtml = block.id.startsWith("navbar") && page.html
        ? extractNavbarHtml(page.html)
        : null;

      // ── Call the dedicated insert-block API ──────────────────────────────────
      const res = await fetch("/api/insert-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: project.blueprint,
          brief: project.brief,
          page: { name: page.name, purpose: page.purpose || page.name },
          block: { type: block.id, label: block.label, placement: block.placement },
          context: {
            existingSections,
            previousSectionName,
            nextSectionName,
            selectedSectionName: selectedSection?.name ?? null,
            selectedNodeLabel: selectedNode?.label ?? null,
            navbarHtml: existingNavbarHtml,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({})) as { error?: string; code?: string; requestId?: string | null; message?: string; errorCode?: string };
        const errorCode = errJson.code ?? errJson.errorCode;
        throw createAppError({
          code: (errorCode as ErrorCode | undefined) ?? API_GENERATE_001,
          devMessage: `Insert block failed for ${block.id} (${res.status}): ${errJson.error ?? errJson.message ?? "unknown error"}`,
          userMessage: errJson.error ?? errJson.message,
          severity: res.status >= 500 ? "error" : "warn",
          metadata: {
            pageId: page.id,
            pageName: page.name,
            blockId: block.id,
            blockLabel: block.label,
            requestId: errJson.requestId ?? null,
            status: res.status,
          },
        });
      }

      const data = await res.json() as { html?: string };
      const newBlockHtml = data.html ?? "";

      if (!newBlockHtml || !newBlockHtml.includes("<")) {
        throw createAppError({
          code: API_RESPONSE_001,
          devMessage: `Insert block response for ${block.id} did not include valid HTML`,
          severity: "error",
          metadata: { pageId: page.id, pageName: page.name, blockId: block.id, blockLabel: block.label },
        });
      }

      // ── Insert HTML into the iframe ──────────────────────────────────────────
      if (block.placement === "section") {
        sendToIframe("insert-after-section", newBlockHtml, afterSectionId, { blockId: block.id });
      } else if (block.placement === "inline") {
        sendToIframe("insert-in-section", newBlockHtml, targetSectionId, { blockId: block.id });
      } else if (block.placement === "top") {
        sendToIframe("insert-top", newBlockHtml, null, { blockId: block.id });
      } else {
        sendToIframe("insert-bottom", newBlockHtml, null, { blockId: block.id });
      }

      // ── Append to page sections in state ─────────────────────────────────────
      setPageContent(page.id, page.html, [...page.sections, { id: uid(), type: block.id, name: block.label }]);

      addGenLog(`✅ ${block.label} added`, "success");
      setAiStatus({ msg: `${block.label} added!`, type: "success" });
      setTimeout(() => setAiStatus(null), 2500);
    } catch(err) {
      const { appErr, apiError } = buildClientApiError(err, API_GENERATE_001, {
        pageId: page.id,
        pageName: page.name,
        blockId: block.id,
        blockLabel: block.label,
      });
      logAppError(appErr);
      setApiError(apiError);
      addGenLog(`❌ ${appErr.userMessage}`, "error");
      setAiStatus({ msg: appErr.userMessage, type: "error" });
      setTimeout(() => setAiStatus(null), 4000);
    }
    finally { setAdding(null); }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-0 pb-2.5 pt-1">
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-4)] px-3 py-2 shadow-[var(--shadow-soft-inset)]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={cat === "icons" ? "Search elements and icons…" : "Search elements…"}
              className="editor-plain-input w-full appearance-none border-0 bg-transparent text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none ring-0 shadow-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[var(--text-disabled)] transition-colors hover:text-[var(--text-secondary)]"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-[var(--border-soft)]" />

          <div className="flex shrink-0 items-center gap-1.5">
            <p className="text-[9.5px] font-medium text-[var(--text-tertiary)]">{useAI ? "AI" : "Direct"}</p>
            <EditorSwitch checked={useAI} onChange={() => setUseAI(!useAI)} title={useAI ? "AI insert on" : "AI insert off"} className="scale-[0.85]" />
            {useAI ? (
              <span className="rounded-full border border-[rgba(91,140,255,0.18)] bg-[#5B8CFF]/10 px-2 py-0.5 text-[8.5px] font-medium text-[#8fb2ff]">
                {aiInsertCostLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="px-0 pb-2 flex-shrink-0">
        {(() => {
          const PRIMARY_KEYS = ["all", "sections", "layout", "basic", "media"];
          const primary = PRIMARY_KEYS
            .map((k) => categoryOrder.find((c) => c.key === k))
            .filter((c): c is InsertionCategory => !!c);
          const overflow = categoryOrder.filter((c) => !PRIMARY_KEYS.includes(c.key));
          const activeInOverflow = overflow.some((c) => c.key === cat);
          const expanded = showAllCats || activeInOverflow;

          const renderPill = (c: InsertionCategory) => {
            const Icon = CATEGORY_ICON_MAP[c.key] ?? LayoutGrid;
            const active = cat === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                title={`${c.label} — ${c.description}`}
                aria-label={c.label}
                aria-pressed={active}
                className={cn(
                  "group relative flex h-7 items-center justify-center rounded-lg transition-all duration-150",
                  active
                    ? "bg-[var(--surface-1)] text-[var(--text-primary)] shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_0_0_1px_var(--border-strong)]"
                    : "text-[var(--text-disabled)] hover:bg-[var(--surface-4)]/60 hover:text-[var(--text-secondary)]"
                )}
              >
                <Icon
                  size={12}
                  strokeWidth={active ? 2 : 1.6}
                  className={cn("transition-colors", active && "text-[var(--text-accent)]")}
                />
              </button>
            );
          };

          const activeMeta = categoryOrder.find((c) => c.key === cat) ?? categoryOrder[0];
          return (
            <>
            <div className="flex items-center justify-between px-0.5 pb-1.5">
              <span className="text-[10px] font-semibold tracking-tight text-[var(--text-primary)]">
                {activeMeta?.label}
              </span>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-3)]/40 p-0.5">
              <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-0.5">
                {primary.map(renderPill)}
              </div>
              <div
                className={cn(
                  "grid transition-[grid-template-rows,margin-top,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  expanded ? "mt-0.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <div className="grid grid-cols-[repeat(6,minmax(0,1fr))] gap-0.5">
                    {overflow.map(renderPill)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAllCats((v) => !v)}
                title={expanded ? "Show less" : "More categories"}
                aria-label="Toggle more categories"
                aria-expanded={expanded}
                className="-mx-0.5 -mb-0.5 mt-0.5 flex h-6 w-[calc(100%+4px)] items-center justify-center rounded-b-lg bg-[var(--surface-4)]/60 text-white/70 transition-colors hover:bg-[var(--surface-4)] hover:text-white"
              >
                <ChevronDown
                  size={12}
                  strokeWidth={2}
                  className={cn(
                    "transition-transform duration-200 ease-out",
                    expanded && "rotate-180"
                  )}
                />
              </button>
            </div>
            </>
          );
        })()}
      </div>
      {aiStatus && (
        <div className={`mx-1 mt-1.5 mb-0 px-3 py-2 rounded-lg flex items-center gap-2 text-[10.5px] font-medium flex-shrink-0 ${
          aiStatus.type === "loading" ? "bg-[#5B8CFF]/8 text-[#5B8CFF]/80 shadow-[inset_0_0_0_1px_rgba(91,140,255,0.15)]" :
          aiStatus.type === "success" ? "bg-emerald-500/8 text-emerald-400/80 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.15)]" :
          "bg-red-500/8 text-red-400/80 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.15)]"
        }`}>
          {aiStatus.type === "loading" && <Loader2 size={10} className="animate-spin flex-shrink-0" />}
          {aiStatus.type === "success" && <span className="flex-shrink-0">✓</span>}
          {aiStatus.type === "error"   && <span className="flex-shrink-0">✕</span>}
          <span className="truncate">{aiStatus.msg}</span>
        </div>
      )}
      {/* ── Icon picker — flat grid ── */}
      {cat === "icons" && (
        <div className="flex-1 overflow-auto px-3 py-2 grid grid-cols-5 gap-1 content-start">
          {ICON_DEFINITIONS
            .filter((icon) =>
              !searchQuery ||
              icon.label.toLowerCase().includes(searchQuery) ||
              icon.id.includes(searchQuery) ||
              icon.keywords.some((keyword) => keyword.includes(searchQuery))
            )
            .map((icon) => (
            <button
              key={icon.id}
              title={icon.label}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData("text/plain", icon.id);
                setTimeout(() => showInlineOverlay((sectionId) => addIcon(icon, sectionId)), 0);
              }}
              onDragEnd={() => hideDropOverlay()}
              onClick={() => addIcon(icon)}
              className="group flex cursor-grab flex-col items-center gap-1.5 rounded-md p-2 transition-colors duration-100 active:cursor-grabbing hover:bg-[var(--surface-5)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
                className="h-[18px] w-[18px] flex-shrink-0 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--text-primary)]"
                dangerouslySetInnerHTML={{ __html: icon.paths }}></svg>
              <span className="w-full truncate text-center text-[7.5px] leading-tight text-[var(--text-disabled)] transition-colors group-hover:text-[var(--text-secondary)]">{icon.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Blocks list — flat rows ── */}
      {cat !== "icons" && (
      <div className="flex-1 overflow-auto px-3.5 py-2">
        {filtered.length === 0 && (
          <div className="pt-8 text-center">
            <LayoutGrid size={15} className="mx-auto text-[var(--text-disabled)]" />
            <p className="mt-3 text-[11px] font-medium text-[var(--text-secondary)]">No matching elements</p>
            <p className="mt-1 text-[10px] text-[var(--text-disabled)]">
              {search ? "Try a broader search or switch categories." : "This category has no available elements."}
            </p>
          </div>
        )}

        <div className="space-y-0.5">
          {filtered.map(({ block: b, score }) => {
            const BlockIcon = CATEGORY_ICON_MAP[b.category] ?? LayoutGrid;
            return (
              <div
                key={b.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("text/plain", b.id);
                  setTimeout(() => {
                    if (b.placement === "top" || b.placement === "bottom") {
                      showSimpleOverlay(() => add({ ...b }));
                    } else if (b.placement === "inline") {
                      showInlineOverlay((sectionId) => add({ ...b }, sectionId));
                    } else {
                      showSectionOverlay((afterId) => add({ ...b }, afterId));
                    }
                  }, 0);
                }}
                onDragEnd={() => hideDropOverlay()}
                onClick={() => add(b)}
                className={cn(
                  "group flex cursor-grab select-none items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors duration-100 active:cursor-grabbing hover:bg-[var(--surface-5)]",
                  adding === b.id && "opacity-30"
                )}
              >
                <BlockIcon
                  size={12}
                  strokeWidth={1.6}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    score >= 4
                      ? "text-[var(--text-accent)] opacity-70"
                      : "text-[var(--text-disabled)] group-hover:text-[var(--text-secondary)]"
                  )}
                />
                <span className="min-w-0 truncate text-[11.5px] font-medium text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]">
                  {b.label}
                </span>
                {score >= 4 && (
                  <span className="ml-auto flex-shrink-0 text-[8px] font-semibold uppercase tracking-wider text-[var(--text-accent)] opacity-50">
                    Smart
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
