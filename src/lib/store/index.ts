import { create } from "zustand";
import { getBlockDefinition, renderEditorElementHtml } from "@/lib/blocks/registry";
import { derivePageStateFromHtml, insertElementIntoPageHtml } from "@/lib/editor/structure";
import {
  extractMediaLibraryFromRecord,
  mergeMediaAssets,
  normalizeMediaAssets,
} from "@/lib/media/library";
import { normalizeProjectIntegrationSettings } from "@/lib/lead-capture";
import { normalizeProjectPageMeta } from "@/lib/project-pages";
import { normalizeProjectSeo } from "@/lib/seo";
import { projectHasActiveGeneration } from "@/lib/project-generation";
import type { LocalGenerationTimingKind } from "@/lib/generation-eta";
import {
  API_RESPONSE_001,
  API_UNKNOWN_001,
  AUTH_REQUIRED_001,
  DB_DELETE_001,
  DB_READ_001,
  DB_UPDATE_001,
  DB_WRITE_001,
  createAppError,
  logAppError,
  normalizeError,
  type ErrorCode,
} from "@/lib/errors";
import type {
  AIChatMessage,
  BlueprintPage,
  EditorState,
  GenerationLogEntry,
  GenerationStatus,
  PageSection,
  Project,
  ProjectMediaAsset,
  ProjectPage,
  ProjectPageMeta,
  ProjectSnapshot,
  SaveState,
  SiteBlueprint,
  SiteBrief,
  VirtualFile,
} from "@/types";

const LAST_PROJECT_KEY = "sitezy-last-project-id";
const LOCAL_PROJECT_SNAPSHOTS_KEY = "sitezy-local-project-snapshots-v1";

type ApiErrorPayload = {
  error?: string;
  code?: string;
  requestId?: string | null;
  severity?: string;
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function readLastProjectId(userId?: string | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_PROJECT_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === "string") return parsed;
      if (parsed && typeof parsed === "object" && userId) {
        const value = (parsed as Record<string, unknown>)[userId];
        return typeof value === "string" && value.trim() ? value : null;
      }
    } catch {
      return raw;
    }

    return null;
  } catch {
    return null;
  }
}

function writeLastProjectId(projectId: string | null, userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!userId) {
      if (projectId) window.localStorage.setItem(LAST_PROJECT_KEY, projectId);
      else window.localStorage.removeItem(LAST_PROJECT_KEY);
      return;
    }

    const raw = window.localStorage.getItem(LAST_PROJECT_KEY);
    let next: Record<string, string> = {};

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object") {
          next = Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0
            )
          );
        } else if (typeof parsed === "string" && parsed.trim()) {
          next[userId] = parsed;
        }
      } catch {
        next[userId] = raw;
      }
    }

    if (projectId) next[userId] = projectId;
    else delete next[userId];

    if (Object.keys(next).length === 0) window.localStorage.removeItem(LAST_PROJECT_KEY);
    else window.localStorage.setItem(LAST_PROJECT_KEY, JSON.stringify(next));
  } catch {}
}

function writeLocalProjectSnapshot(snapshot: ProjectSnapshot, userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_PROJECT_SNAPSHOTS_KEY);
    const snapshots = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

    if (userId) {
      const userSnapshots =
        snapshots[userId] && typeof snapshots[userId] === "object"
          ? (snapshots[userId] as Record<string, ProjectSnapshot | undefined>)
          : {};
      userSnapshots[snapshot.project.id] = snapshot;
      snapshots[userId] = userSnapshots;
    } else {
      snapshots[snapshot.project.id] = snapshot;
    }

    window.localStorage.setItem(LOCAL_PROJECT_SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch {}
}

function removeLocalProjectSnapshot(projectId: string, userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_PROJECT_SNAPSHOTS_KEY);
    if (!raw) return;
    const snapshots = JSON.parse(raw) as Record<string, unknown>;

    if (userId && snapshots[userId] && typeof snapshots[userId] === "object") {
      const userSnapshots = snapshots[userId] as Record<string, ProjectSnapshot | undefined>;
      delete userSnapshots[projectId];
      if (Object.keys(userSnapshots).length === 0) delete snapshots[userId];
      else snapshots[userId] = userSnapshots;
    } else {
      delete snapshots[projectId];
    }

    window.localStorage.setItem(LOCAL_PROJECT_SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch {}
}

function normalizeProject(project: Partial<Project>): Project {
  const visibleFiles = project.files && typeof project.files === "object" ? project.files : {};
  const extracted = extractMediaLibraryFromRecord(visibleFiles);
  return {
    id: project.id ?? uid(),
    name: project.name ?? "Untitled Project",
    brief: project.brief ?? { siteName: "", description: "", siteType: "", tone: "Professional", pages: [], features: "" },
    blueprint: project.blueprint ?? null,
    seo: normalizeProjectSeo(project.seo, project),
    integrationSettings: normalizeProjectIntegrationSettings(project.integrationSettings),
    pages: Array.isArray(project.pages) ? project.pages.map(normalizePage) : [],
    files: extracted.files,
    media: normalizeMediaAssets(project.media ?? extracted.media),
    createdAt: project.createdAt ?? new Date().toISOString(),
    updatedAt: project.updatedAt ?? new Date().toISOString(),
    status: project.status ?? "draft",
    generationJob: project.generationJob ?? null,
    publishedSite: project.publishedSite ?? null,
  };
}

function normalizePage(pg: Partial<ProjectPage>): ProjectPage {
  const derived = derivePageStateFromHtml(pg.html ?? "", Array.isArray(pg.sections) ? pg.sections : []);
  return {
    id: pg.id ?? uid(),
    name: pg.name ?? "Page",
    slug: pg.slug ?? "",
    sections: derived.sections,
    purpose: pg.purpose ?? "",
    html: derived.html,
    status: (["pending", "generating", "done", "error"].includes(pg.status ?? "")
      ? pg.status
      : undefined) ?? "pending",
    error: pg.error,
    revision: typeof pg.revision === "number" && Number.isFinite(pg.revision) ? Math.max(1, Math.trunc(pg.revision)) : 1,
    meta: normalizeProjectPageMeta(pg.meta, pg),
  };
}

function slugifyToken(value: string | null | undefined, fallback: string): string {
  const normalized = (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function scopeProjectToken(
  projectId: string,
  rawValue: string | null | undefined,
  fallback: string,
  kind: "page" | "file"
): string {
  const current = (rawValue ?? "").trim();
  const prefix = `${projectId}__${kind}__`;
  if (current.startsWith(prefix)) {
    return current;
  }
  return `${prefix}${slugifyToken(current, fallback)}`;
}

function makeUniqueToken(base: string, used: Set<string>, fallback: string): string {
  const seed = base.trim() || fallback;
  let candidate = seed;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${seed}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function makeUniqueFilePath(path: string, used: Set<string>): string {
  const trimmed = path.trim() || "/file";
  const lastSlash = trimmed.lastIndexOf("/");
  const dir = lastSlash >= 0 ? trimmed.slice(0, lastSlash) || "/" : "";
  const rawName = lastSlash >= 0 ? trimmed.slice(lastSlash + 1) : trimmed;
  const dotIndex = rawName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
  const extension = dotIndex > 0 ? rawName.slice(dotIndex) : "";
  let candidate = `${dir === "/" ? "" : dir}/${baseName}${extension}` || `/${baseName}${extension}`;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${dir === "/" ? "" : dir}/${baseName}-${suffix}${extension}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function canonicalizeProjectPages(projectId: string, pages: ProjectPage[]): ProjectPage[] {
  const usedIds = new Set<string>();
  const usedSlugs = new Set<string>();

  return pages.map((page, index) => {
    const normalized = normalizePage(page);
    const fallback = `page-${index + 1}`;
    const name = normalized.name?.trim() || `Page ${index + 1}`;
    const slug = makeUniqueToken(slugifyToken(normalized.slug || name, fallback), usedSlugs, fallback);
    const id = makeUniqueToken(
      scopeProjectToken(projectId, normalized.id || slug, fallback, "page"),
      usedIds,
      scopeProjectToken(projectId, fallback, fallback, "page")
    );

    return {
      ...normalized,
      id,
      name,
      slug,
      purpose: normalized.purpose || "",
    };
  });
}

function matchBlueprintPage(pages: BlueprintPage[], page: ProjectPage): BlueprintPage | undefined {
  const normalizedName = page.name.trim().toLowerCase();
  return pages.find(
    (candidate) =>
      candidate.id === page.id ||
      candidate.slug === page.slug ||
      candidate.name.trim().toLowerCase() === normalizedName
  );
}

function deriveBlueprintSectionsFromProjectPage(
  page: ProjectPage,
  fallbackSections: string[] = []
): string[] {
  const derivedSections = page.sections
    .map((section) => slugifyToken(section.type || section.name, "section"))
    .filter(Boolean);

  if (derivedSections.length > 0) return derivedSections;
  if (fallbackSections.length > 0) return fallbackSections;
  return ["hero", "content", "cta"];
}

function syncBlueprintPagesWithProjectPages(
  blueprint: SiteBlueprint | null | undefined,
  pages: ProjectPage[]
): SiteBlueprint | null {
  if (!blueprint) return null;

  return {
    ...blueprint,
    pages: pages.map((page, index) => {
      const existing = matchBlueprintPage(blueprint.pages, page);
      const fallback = `page-${index + 1}`;
      const name = page.name.trim() || existing?.name || `Page ${index + 1}`;
      const slug = page.slug || existing?.slug || slugifyToken(name, fallback);

      return {
        id: page.id || existing?.id || slug,
        name,
        slug,
        purpose: page.purpose || existing?.purpose || name,
        sections: deriveBlueprintSectionsFromProjectPage(page, existing?.sections ?? []),
        priority: existing?.priority,
      };
    }),
  };
}

function canonicalizeProjectFiles(project: Project, pages: ProjectPage[]): Record<string, VirtualFile> {
  const originalPageIds = new Set(project.pages.map((page) => page.id));
  const usedIds = new Set<string>();
  const usedPaths = new Set<string>();
  const files: Record<string, VirtualFile> = {};

  function upsertFile(file: VirtualFile, preferredId?: string) {
    const fallbackId = preferredId || slugifyToken(file.name || file.path || file.id, `file-${Object.keys(files).length + 1}`);
    const kind = preferredId ? "page" : "file";
    const id = makeUniqueToken(
      preferredId
        ? preferredId
        : scopeProjectToken(project.id, file.id || fallbackId, fallbackId, kind),
      usedIds,
      preferredId || scopeProjectToken(project.id, fallbackId, fallbackId, kind)
    );
    const path = makeUniqueFilePath(file.path || `/${file.name || id}`, usedPaths);
    files[id] = {
      ...file,
      id,
      path,
      name: file.name?.trim() || path.split("/").filter(Boolean).pop() || id,
    };
  }

  for (const file of Object.values(project.files)) {
    const isPageHtmlFile = file.type === "html" && originalPageIds.has(file.id);
    if (isPageHtmlFile) continue;
    upsertFile(file);
  }

  for (const page of pages) {
    upsertFile(
      {
        id: page.id,
        name: `${page.slug}.html`,
        path: `/pages/${page.slug}.html`,
        content: page.html ?? "",
        type: "html",
        language: "html",
      },
      page.id
    );
  }

  return files;
}

function recoverPersistedProject(project: Project): Project {
  const hasActiveGenerationJob =
    project.generationJob?.status === "queued" || project.generationJob?.status === "running";
  const pages = hasActiveGenerationJob
    ? project.pages
    : project.pages.map((page) =>
        page.status === "pending" || page.status === "generating"
          ? {
              ...page,
              status: page.html?.trim() ? "done" as const : "error" as const,
              error: page.html?.trim()
                ? undefined
                : page.error ?? "Generation stopped before this page could be created.",
            }
          : page
      );

  const hasDonePages = pages.some((page) => page.status === "done" || page.html?.trim());
  const hasPendingPages = pages.some((page) => page.status === "pending");
  const hasErrorPages = pages.some((page) => page.status === "error");

  let status = project.status;
  if (hasActiveGenerationJob) {
    status = "generating";
  } else if (status === "generating") {
    status = hasDonePages ? "ready" : "draft";
  } else if (status === "error" && !hasErrorPages) {
    status = hasDonePages ? "ready" : hasPendingPages ? "draft" : project.status;
  }

  return {
    ...project,
    status,
    pages,
  };
}

function recoverPersistedSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  const project = recoverPersistedProject(normalizeProject(snapshot.project));
  return {
    project,
    editorState: normalizeEditorStateForProject(project, snapshot.editorState),
    aiChats: snapshot.aiChats ?? [],
  };
}

function deriveProjectStatusFromPages(pages: ProjectPage[]): Project["status"] {
  const hasGeneratingPages = pages.some((page) => page.status === "generating");
  const hasDonePages = pages.some((page) => page.status === "done" || page.html?.trim());
  const hasErrorPages = pages.some((page) => page.status === "error");

  if (hasGeneratingPages) return "generating";
  if (hasErrorPages && !hasDonePages) return "error";
  if (hasDonePages) return "ready";
  return "draft";
}

const defaultEditorState: EditorState = {
  selectedPageId: null,
  selectedFileId: null,
  selectedSectionId: null,
  selectedNode: null,
  isCanvasEditing: false,
  leftPanelTab: "pages",
  rightPanelTab: "style",
  previewMode: "preview",
  devicePreview: "desktop",
  isFullPreview: false,
  leftPanelWidth: 248,
  rightPanelWidth: 292,
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  visualEditMode: true,
  canvasZoom: 1,
  canvasPanX: 0,
  canvasPanY: 0,
  canvasGridVisible: false,
};

function clampLeftPanelWidth(width: number) {
  return Math.round(Math.min(420, Math.max(220, width)));
}

function clampRightPanelWidth(width: number) {
  return Math.round(Math.min(520, Math.max(260, width)));
}

function normalizeRightPanelTab(tab: EditorState["rightPanelTab"] | "properties" | undefined): EditorState["rightPanelTab"] {
  if (tab === "properties") return "style";
  if (tab === "ai" || tab === "blocks" || tab === "style" || tab === "theme" || tab === "page") return tab;
  return defaultEditorState.rightPanelTab;
}

function mergeEditorState(editorState?: Partial<EditorState> | null): EditorState {
  const merged = { ...defaultEditorState, ...(editorState ?? {}) };
  return {
    ...merged,
    leftPanelWidth: clampLeftPanelWidth(
      typeof merged.leftPanelWidth === "number" && Number.isFinite(merged.leftPanelWidth)
        ? merged.leftPanelWidth
        : defaultEditorState.leftPanelWidth
    ),
    rightPanelWidth: clampRightPanelWidth(
      typeof merged.rightPanelWidth === "number" && Number.isFinite(merged.rightPanelWidth)
        ? merged.rightPanelWidth
        : defaultEditorState.rightPanelWidth
    ),
    rightPanelTab: normalizeRightPanelTab((editorState as { rightPanelTab?: EditorState["rightPanelTab"] | "properties" } | null | undefined)?.rightPanelTab),
  };
}

function normalizeEditorStateForProject(
  project: Project,
  editorState?: Partial<EditorState> | null,
  options: { clearCanvasSelection?: boolean } = {}
): EditorState {
  const merged = mergeEditorState(editorState);
  const pageIds = new Set(project.pages.map((page) => page.id));
  const fileIds = new Set(Object.keys(project.files));
  const firstPageId = project.pages[0]?.id ?? null;

  const selectedPageId = merged.selectedPageId && pageIds.has(merged.selectedPageId)
    ? merged.selectedPageId
    : firstPageId;

  const selectedPage = project.pages.find((page) => page.id === selectedPageId) ?? null;

  const selectedFileId = merged.selectedFileId && fileIds.has(merged.selectedFileId)
    ? merged.selectedFileId
    : selectedPageId && fileIds.has(selectedPageId)
    ? selectedPageId
    : null;

  const selectedSectionId = merged.selectedSectionId && selectedPage?.sections.some((section) => section.id === merged.selectedSectionId)
    ? merged.selectedSectionId
    : null;

  const nextLeftPanelTab = merged.leftPanelTab === "files" && !selectedFileId
    ? "pages"
    : merged.leftPanelTab;

  return {
    ...merged,
    selectedPageId,
    selectedFileId,
    selectedSectionId,
    leftPanelTab: nextLeftPanelTab,
    selectedNode: options.clearCanvasSelection === false ? merged.selectedNode : null,
    isCanvasEditing: options.clearCanvasSelection === false ? merged.isCanvasEditing : false,
  };
}

function replaceProject(projects: Project[], next: Project): Project[] {
  const normalized = normalizeProject(next);
  const idx = projects.findIndex((project) => project.id === normalized.id);
  if (idx === -1) return [normalized, ...projects];
  const copy = [...projects];
  copy[idx] = normalized;
  return copy;
}

function collectLegacyProjectMedia(projects: Project[]): ProjectMediaAsset[] {
  return mergeMediaAssets(
    [],
    projects.flatMap((project) => normalizeMediaAssets(project.media))
  );
}

function findMissingMediaByUrl(
  existing: ProjectMediaAsset[],
  candidate: ProjectMediaAsset[]
): ProjectMediaAsset[] {
  const existingUrls = new Set(normalizeMediaAssets(existing).map((asset) => asset.url));
  return normalizeMediaAssets(candidate).filter((asset) => !existingUrls.has(asset.url));
}

async function apiJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const target = typeof input === "string"
    ? input
    : input instanceof URL
    ? input.toString()
    : "url" in input && typeof input.url === "string"
    ? input.url
    : "request";

  let payload: ApiErrorPayload | null = null;
  if (response.status !== 204) {
    try {
      payload = await response.json() as ApiErrorPayload;
    } catch (error) {
      if (response.ok) {
        throw createAppError({
          code: API_RESPONSE_001,
          devMessage: `Invalid JSON response from ${target} (${response.status})`,
          severity: "error",
          metadata: { target, status: response.status },
          cause: error,
        });
      }
    }
  }

  if (!response.ok) {
    const code = (
      typeof payload?.code === "string"
        ? payload.code
        : response.status === 401
        ? AUTH_REQUIRED_001
        : API_UNKNOWN_001
    ) as ErrorCode;

    throw createAppError({
      code,
      devMessage: `Request to ${target} failed (${response.status}): ${payload?.error ?? "unknown error"}`,
      userMessage: payload?.error ?? `Request failed with ${response.status}`,
      severity: response.status >= 500 ? "error" : "warn",
      metadata: {
        target,
        status: response.status,
        requestId: payload?.requestId ?? null,
      },
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return payload as T;
}

function getRequestIdFromError(error: unknown): string | null {
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

function buildStoreApiError(error: unknown, fallbackCode: ErrorCode, metadata?: Record<string, unknown>) {
  const requestId = getRequestIdFromError(error);
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

async function waitForNextFrame(): Promise<void> {
  if (typeof window === "undefined") return;

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export interface ApiError {
  message: string;
  requestId: string | null;
  code: string;
}

interface AppState {
  projects: Project[];
  mediaLibrary: ProjectMediaAsset[];
  sessionUserId: string | null;
  currentProjectId: string | null;
  openingProjectId: string | null;
  resumeProjectId: string | null;
  resumeProjectSnapshot: ProjectSnapshot | null;
  editor: EditorState;
  aiDraftPrompt: string | null;
  generationStatus: GenerationStatus;
  generationProgress: string;
  generationTimingKind: LocalGenerationTimingKind | null;
  generationStartedAt: number | null;
  generationEstimateMs: number | null;
  generationLog: GenerationLogEntry[];
  aiChats: Record<string, AIChatMessage[]>;
  undoStack: Array<{ pageId: string; html: string }>;
  redoStack: Array<{ pageId: string; html: string }>;
  isSaved: boolean;
  saveState: SaveState;
  saveError: string | null;
  lastSavedAt: string | null;
  isHydratingProjects: boolean;
  hasHydratedProjects: boolean;
  apiError: ApiError | null;
}

interface AppActions {
  setSessionUserId: (userId: string | null) => void;
  restoreLocalProject: (userId: string) => boolean;
  resumeProjectEntry: () => Promise<void>;
  dismissResumeProject: () => void;
  hydrateProjects: () => Promise<void>;
  createProject: (brief: SiteBrief, options?: { open?: boolean }) => Promise<Project>;
  openProject: (id: string) => Promise<void>;
  syncProjectFromServer: (id: string, options?: { preserveEditor?: boolean; preserveHistory?: boolean }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  closeProject: () => void;
  saveCurrentProject: (opts?: { manual?: boolean }) => Promise<boolean>;
  setBlueprint: (blueprint: SiteBlueprint, pages: ProjectPage[]) => void;
  setPageStatus: (pageId: string, status: ProjectPage["status"]) => void;
  setPageContent: (
    pageId: string,
    html: string,
    sections: PageSection[],
    options?: { completeGeneration?: boolean }
  ) => void;
  setPageMeta: (pageId: string, meta: ProjectPageMeta) => void;
  setGenStatus: (status: GenerationStatus, progress?: string) => void;
  setGenerationTiming: (timing: {
    kind: LocalGenerationTimingKind;
    estimateMs: number;
    startedAt?: number | null;
  }) => void;
  addGenLog: (msg: string, type?: GenerationLogEntry["type"]) => void;
  clearGenLog: () => void;
  selectPage: (pageId: string | null) => void;
  selectFile: (fileId: string | null) => void;
  selectSection: (sectionId: string | null) => void;
  setCanvasSelection: (node: EditorState["selectedNode"], isEditing?: boolean) => void;
  clearCanvasSelection: () => void;
  setLeftPanel: (tab: EditorState["leftPanelTab"]) => void;
  setRightPanel: (tab: EditorState["rightPanelTab"]) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setPreviewMode: (mode: EditorState["previewMode"]) => void;
  setDevicePreview: (device: EditorState["devicePreview"]) => void;
  setFullPreview: (full: boolean) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setVisualEditMode: (on: boolean) => void;
  setCanvasZoom: (zoom: number) => void;
  setCanvasPan: (x: number, y: number) => void;
  resetCanvasView: () => void;
  toggleCanvasGrid: () => void;
  updateFileContent: (fileId: string, content: string) => void;
  insertBlock: (blockId: string) => void;
  pushUndo: (pageId: string, html: string) => void;
  undo: () => void;
  redo: () => void;
  addChatMessage: (projectId: string, msg: AIChatMessage) => void;
  clearChat: (projectId: string) => void;
  setAiDraftPrompt: (prompt: string | null) => void;
  getCurrentProject: () => Project | null;
  getSelectedPage: () => ProjectPage | null;
  addPage: (page: ProjectPage, options?: { select?: boolean }) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  upsertMediaAssets: (assets: ProjectMediaAsset[]) => Promise<void>;
  removeMediaAsset: (assetId: string) => Promise<void>;
  renameMediaAsset: (assetId: string, name: string) => Promise<void>;
  setApiError: (err: ApiError | null) => void;
}

type Store = AppState & AppActions;

function getCurrentProjectState(state: AppState): Project | null {
  const raw = state.projects.find((project) => project.id === state.currentProjectId);
  return raw ? normalizeProject(raw) : null;
}

function buildProjectSnapshot(state: AppState): ProjectSnapshot | null {
  const project = getCurrentProjectState(state);
  if (!project) return null;
  const pages = canonicalizeProjectPages(project.id, project.pages);
  const canonicalProject = normalizeProject({
    ...project,
    pages,
    files: canonicalizeProjectFiles(project, pages),
  });
  return {
    project: canonicalProject,
    editorState: normalizeEditorStateForProject(canonicalProject, state.editor, {
      clearCanvasSelection: false,
    }),
    aiChats: state.aiChats[canonicalProject.id] ?? [],
  };
}

function canOfferResumeProject(project?: Project | null): boolean {
  return Boolean(project && !projectHasActiveGeneration(project));
}

function canShowResumePrompt(state: AppState): boolean {
  return !projectHasActiveGeneration(null, state.generationStatus);
}

function getLocalProjectSnapshot(projectId: string, userId?: string | null): ProjectSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_PROJECT_SNAPSHOTS_KEY);
    if (!raw) return null;
    const snapshots = JSON.parse(raw) as Record<string, unknown>;

    if (userId && snapshots[userId] && typeof snapshots[userId] === "object") {
      const snapshot = (snapshots[userId] as Record<string, ProjectSnapshot | undefined>)?.[projectId];
      if (snapshot) return snapshot;
    }

    const legacySnapshot = snapshots?.[projectId];
    return legacySnapshot && typeof legacySnapshot === "object" ? (legacySnapshot as ProjectSnapshot) : null;
  } catch {
    return null;
  }
}

function applySnapshot(
  set: (partial: Partial<AppState>) => void,
  get: () => Store,
  snapshot: ProjectSnapshot,
  options: {
    makeCurrent?: boolean;
    preserveEditor?: boolean;
    preserveHistory?: boolean;
  } = {}
) {
  const project = normalizeProject(snapshot.project);
  const editorState = normalizeEditorStateForProject(project, snapshot.editorState);
  const normalizedSnapshot: ProjectSnapshot = {
    project,
    editorState,
    aiChats: snapshot.aiChats ?? [],
  };
  const makeCurrent = options.makeCurrent ?? false;
  const preserveEditor = options.preserveEditor ?? false;
  const preserveHistory = options.preserveHistory ?? false;

  set({
    projects: replaceProject(get().projects, project),
    currentProjectId: makeCurrent ? project.id : get().currentProjectId,
    resumeProjectId: makeCurrent ? null : get().resumeProjectId,
    resumeProjectSnapshot: makeCurrent ? null : get().resumeProjectSnapshot,
    editor: preserveEditor
      ? normalizeEditorStateForProject(project, get().editor, { clearCanvasSelection: false })
      : makeCurrent
      ? editorState
      : get().editor,
    aiChats: { ...get().aiChats, [project.id]: normalizedSnapshot.aiChats },
    undoStack: preserveHistory ? get().undoStack : [],
    redoStack: preserveHistory ? get().redoStack : [],
    isSaved: true,
    saveState: "idle",
    saveError: null,
    lastSavedAt: project.updatedAt,
  });

  writeLocalProjectSnapshot(normalizedSnapshot, get().sessionUserId);
}

function markDirty(set: (partial: Partial<AppState>) => void) {
  set({ isSaved: false, saveState: "idle", saveError: null });
}

function syncProjectPage(
  project: Project,
  pageId: string,
  nextHtml: string,
  fallbackSections?: PageSection[],
  options: {
    pageStatus?: ProjectPage["status"];
    preserveGenerating?: boolean;
  } = {}
): Project {
  const currentPage = project.pages.find((page) => page.id === pageId) ?? null;
  const derived = derivePageStateFromHtml(nextHtml, fallbackSections);
  const nextPageStatus =
    options.pageStatus ??
    (options.preserveGenerating && currentPage?.status === "generating"
      ? "generating"
      : derived.html.trim()
        ? "done"
        : currentPage?.status ?? "pending");

    const nextPages = project.pages.map((page) =>
      page.id === pageId
      ? {
          ...page,
          html: derived.html,
          sections: derived.sections,
          status: nextPageStatus,
          revision:
            typeof page.revision === "number" && Number.isFinite(page.revision)
              ? Math.max(1, Math.trunc(page.revision)) + 1
              : 2,
        }
      : page
  );
  return {
    ...project,
    blueprint: syncBlueprintPagesWithProjectPages(project.blueprint, nextPages),
    updatedAt: new Date().toISOString(),
    status: deriveProjectStatusFromPages(nextPages),
    pages: nextPages,
    files: project.files[pageId]
      ? {
          ...project.files,
          [pageId]: {
            ...project.files[pageId],
            content: derived.html,
          },
        }
      : project.files,
  };
}

export const useAppStore = create<Store>()((set, get) => ({
  projects: [],
  mediaLibrary: [],
  sessionUserId: null,
  currentProjectId: null,
  openingProjectId: null,
  resumeProjectId: null,
  resumeProjectSnapshot: null,
  editor: defaultEditorState,
  aiDraftPrompt: null,
  generationStatus: "idle",
  generationProgress: "",
  generationTimingKind: null,
  generationStartedAt: null,
  generationEstimateMs: null,
  generationLog: [],
  aiChats: {},
  undoStack: [],
  redoStack: [],
  isSaved: true,
  saveState: "idle",
  saveError: null,
  lastSavedAt: null,
  isHydratingProjects: false,
  hasHydratedProjects: false,
  apiError: null,

  setSessionUserId: (userId) => set({ sessionUserId: userId }),

  restoreLocalProject: (userId) => {
    if (!canShowResumePrompt(get())) return false;
    const lastProjectId = readLastProjectId(userId);
    if (!lastProjectId) return false;
    const snapshot = getLocalProjectSnapshot(lastProjectId, userId);
    if (!snapshot) return false;
    const recoveredSnapshot = recoverPersistedSnapshot(snapshot);
    if (!canOfferResumeProject(recoveredSnapshot.project)) return false;
    applySnapshot(set, get, recoveredSnapshot);
    set({
      resumeProjectId: recoveredSnapshot.project.id,
      resumeProjectSnapshot: recoveredSnapshot,
    });
    return true;
  },

  resumeProjectEntry: async () => {
    const { resumeProjectId, resumeProjectSnapshot } = get();
    if (!resumeProjectId) return;

    if (resumeProjectSnapshot) {
      applySnapshot(set, get, resumeProjectSnapshot, { makeCurrent: true });
      return;
    }

    await get().openProject(resumeProjectId);
  },

  dismissResumeProject: () => {
    set({
      currentProjectId: null,
      openingProjectId: null,
      resumeProjectId: null,
      resumeProjectSnapshot: null,
      editor: defaultEditorState,
      undoStack: [],
      redoStack: [],
    });
  },

  setApiError: (err) => set({ apiError: err }),

  hydrateProjects: async () => {
    if (get().isHydratingProjects) return;
    set({ isHydratingProjects: true });
    let projects: Project[] = [];
    try {
      const data = await apiJson<{ projects: Project[] }>("/api/projects");
      projects = (data.projects ?? []).map((project) => recoverPersistedProject(normalizeProject(project)));
      const currentProject = getCurrentProjectState(get());
      if (currentProject) {
        projects = replaceProject(projects, currentProject);
      }
      const legacyMedia = collectLegacyProjectMedia(projects);

      set({
        projects,
        mediaLibrary: legacyMedia,
        isHydratingProjects: false,
        hasHydratedProjects: true,
        saveError: null,
        apiError: null,
      });

      void (async () => {
        let mediaLibrary: ProjectMediaAsset[] = [];

        try {
          const mediaData = await apiJson<{ media: ProjectMediaAsset[] }>("/api/media");
          mediaLibrary = normalizeMediaAssets(mediaData.media);
        } catch (error) {
          const appErr = normalizeError(error, DB_READ_001, { action: "hydrateMediaLibrary" });
          logAppError(appErr);
        }

        const missingLegacy = findMissingMediaByUrl(mediaLibrary, legacyMedia);
        const mergedLibrary = mergeMediaAssets(mediaLibrary, legacyMedia);

        set({ mediaLibrary: mergedLibrary });

        if (!missingLegacy.length) return;

        try {
          const response = await apiJson<{ media: ProjectMediaAsset[] }>("/api/media", {
            method: "POST",
            body: JSON.stringify({ assets: missingLegacy }),
          });
          set({ mediaLibrary: normalizeMediaAssets(response.media) });
        } catch (error) {
          const appErr = normalizeError(error, DB_WRITE_001, {
            action: "migrateLegacyProjectMedia",
            assetCount: missingLegacy.length,
          });
          logAppError(appErr);
        }
      })();

      const lastProjectId = readLastProjectId(get().sessionUserId);
      if (
        !get().currentProjectId
        && !get().resumeProjectId
        && canShowResumePrompt(get())
        && lastProjectId
        && projects.some((project) => project.id === lastProjectId)
      ) {
        const lastProject = projects.find((project) => project.id === lastProjectId) ?? null;
        if (!canOfferResumeProject(lastProject)) return;
        const localSnapshot = getLocalProjectSnapshot(lastProjectId, get().sessionUserId);
        if (localSnapshot) {
          const recoveredSnapshot = recoverPersistedSnapshot(localSnapshot);
          if (!canOfferResumeProject(recoveredSnapshot.project)) return;
          applySnapshot(set, get, recoveredSnapshot);
          set({
            resumeProjectId: recoveredSnapshot.project.id,
            resumeProjectSnapshot: recoveredSnapshot,
          });
        } else {
          set({ resumeProjectId: lastProjectId, resumeProjectSnapshot: null });
        }
      }
    } catch (error) {
      const { appErr, apiError } = buildStoreApiError(error, API_UNKNOWN_001, { action: "hydrateProjects" });
      logAppError(appErr);
      set({
        projects,
        isHydratingProjects: false,
        hasHydratedProjects: true,
        saveError: appErr.userMessage,
        apiError,
      });

      const lastProjectId = readLastProjectId(get().sessionUserId);
      if (
        !get().currentProjectId
        && !get().resumeProjectId
        && canShowResumePrompt(get())
        && lastProjectId
        && projects.some((project) => project.id === lastProjectId)
      ) {
        const snapshot = getLocalProjectSnapshot(lastProjectId, get().sessionUserId);
        if (snapshot) {
          const recoveredSnapshot = recoverPersistedSnapshot(snapshot);
          if (!canOfferResumeProject(recoveredSnapshot.project)) return;
          applySnapshot(set, get, recoveredSnapshot);
          set({
            resumeProjectId: recoveredSnapshot.project.id,
            resumeProjectSnapshot: recoveredSnapshot,
          });
        }
      }
    }
  },

  createProject: async (brief, options) => {
    const now = new Date().toISOString();
    const draft: Project = normalizeProject({
      id: crypto.randomUUID(),
      name: brief.siteName || "Untitled Project",
      brief,
      blueprint: null,
      pages: [],
      files: {},
      createdAt: now,
      updatedAt: now,
      status: "draft",
    });

    try {
      const snapshot = await apiJson<ProjectSnapshot>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ project: draft }),
      });

      applySnapshot(set, get, snapshot, { makeCurrent: options?.open ?? true });
      if (options?.open ?? true) {
        writeLastProjectId(snapshot.project.id, get().sessionUserId);
      } else {
        set({ resumeProjectId: null, resumeProjectSnapshot: null });
      }
      return snapshot.project;
    } catch (error) {
      const { appErr, apiError } = buildStoreApiError(error, DB_WRITE_001, {
        action: "createProject",
        draftProjectId: draft.id,
        projectName: draft.name,
      });
      logAppError(appErr);
      set({ apiError, saveError: appErr.userMessage });
      throw appErr;
    }
  },

  openProject: async (id) => {
    set({
      openingProjectId: id,
      apiError: null,
      saveError: null,
    });

    try {
      await waitForNextFrame();
      const snapshot = await apiJson<ProjectSnapshot>(`/api/projects/${id}`);
      if (get().openingProjectId !== id) return;

      const recoveredSnapshot = recoverPersistedSnapshot(snapshot);
      const legacyMedia = normalizeMediaAssets(recoveredSnapshot.project.media);
      const missingLegacy = findMissingMediaByUrl(get().mediaLibrary, legacyMedia);
      applySnapshot(set, get, recoveredSnapshot, { makeCurrent: true });
      if (legacyMedia.length) {
        set({ mediaLibrary: mergeMediaAssets(get().mediaLibrary, legacyMedia) });
      }
      if (missingLegacy.length) {
        void apiJson<{ media: ProjectMediaAsset[] }>("/api/media", {
          method: "POST",
          body: JSON.stringify({ assets: missingLegacy }),
        })
          .then((response) => {
            set({ mediaLibrary: normalizeMediaAssets(response.media) });
          })
          .catch((error) => {
            const appErr = normalizeError(error, DB_WRITE_001, {
              action: "migrateOpenedProjectMedia",
              projectId: id,
              assetCount: missingLegacy.length,
            });
            logAppError(appErr);
          });
      }
      writeLastProjectId(id, get().sessionUserId);
      await waitForNextFrame();
    } catch (error) {
      const { appErr, apiError } = buildStoreApiError(error, DB_READ_001, {
        action: "openProject",
        projectId: id,
      });
      logAppError(appErr);
      set({ apiError, saveError: appErr.userMessage });
      throw appErr;
    } finally {
      if (get().openingProjectId === id) {
        set({ openingProjectId: null });
      }
    }
  },

  syncProjectFromServer: async (id, options) => {
    try {
      const snapshot = await apiJson<ProjectSnapshot>(`/api/projects/${id}`);
      const recoveredSnapshot = recoverPersistedSnapshot(snapshot);
      const legacyMedia = normalizeMediaAssets(recoveredSnapshot.project.media);
      const missingLegacy = findMissingMediaByUrl(get().mediaLibrary, legacyMedia);
      applySnapshot(set, get, recoveredSnapshot, {
        makeCurrent: get().currentProjectId === id,
        preserveEditor: options?.preserveEditor ?? true,
        preserveHistory: options?.preserveHistory ?? true,
      });
      if (legacyMedia.length) {
        set({ mediaLibrary: mergeMediaAssets(get().mediaLibrary, legacyMedia) });
      }
      if (missingLegacy.length) {
        void apiJson<{ media: ProjectMediaAsset[] }>("/api/media", {
          method: "POST",
          body: JSON.stringify({ assets: missingLegacy }),
        })
          .then((response) => {
            set({ mediaLibrary: normalizeMediaAssets(response.media) });
          })
          .catch((error) => {
            const appErr = normalizeError(error, DB_WRITE_001, {
              action: "migrateSyncedProjectMedia",
              projectId: id,
              assetCount: missingLegacy.length,
            });
            logAppError(appErr);
          });
      }
    } catch (error) {
      const { appErr, apiError } = buildStoreApiError(error, DB_READ_001, {
        action: "syncProjectFromServer",
        projectId: id,
      });
      logAppError(appErr);
      set({ apiError, saveError: appErr.userMessage });
      throw appErr;
    }
  },

  deleteProject: async (id) => {
    try {
      await apiJson<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" });
      const isCurrent = get().currentProjectId === id;
      set({
        projects: get().projects.filter((project) => project.id !== id),
        ...(get().resumeProjectId === id ? { resumeProjectId: null, resumeProjectSnapshot: null } : {}),
        ...(isCurrent ? { currentProjectId: null, editor: defaultEditorState } : {}),
      });
      if (isCurrent) writeLastProjectId(null, get().sessionUserId);
      removeLocalProjectSnapshot(id, get().sessionUserId);
    } catch (error) {
      const { appErr, apiError } = buildStoreApiError(error, DB_DELETE_001, {
        action: "deleteProject",
        projectId: id,
      });
      logAppError(appErr);
      set({ apiError, saveError: appErr.userMessage });
      throw appErr;
    }
  },

  duplicateProject: async (id) => {
    const source = get().projects.find((p) => p.id === id);
    if (!source) return;
    const now = new Date().toISOString();
    const clone = normalizeProject({
      ...source,
      id: crypto.randomUUID(),
      name: `Copy of ${source.name}`,
      createdAt: now,
      updatedAt: now,
      status: source.status === "generating" ? "draft" : source.status,
      pages: source.pages.map((page) => ({
        ...page,
        id: crypto.randomUUID(),
        status: page.status === "generating" ? "done" : page.status,
      })),
    });
    try {
      const snapshot = await apiJson<ProjectSnapshot>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ project: clone }),
      });
      // Save pages by immediately saving the cloned snapshot via PUT
      snapshot.project.pages = clone.pages;
      snapshot.project.blueprint = clone.blueprint;
      snapshot.project.brief = clone.brief;
      const saved = await apiJson<ProjectSnapshot>(`/api/projects/${snapshot.project.id}`, {
        method: "PUT",
        body: JSON.stringify({
          project: { ...clone, id: snapshot.project.id },
          editorState: snapshot.editorState,
          aiChats: [],
        }),
      });
      set({ projects: [normalizeProject(saved.project), ...get().projects] });
    } catch (error) {
      const { appErr, apiError } = buildStoreApiError(error, DB_WRITE_001, {
        action: "duplicateProject",
        sourceProjectId: id,
        cloneProjectId: clone.id,
      });
      logAppError(appErr);
      set({ apiError, saveError: appErr.userMessage });
      throw appErr;
    }
  },

  renameProject: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set({
      projects: get().projects.map((project) =>
        project.id === id
          ? { ...normalizeProject(project), name: trimmed, updatedAt: new Date().toISOString() }
          : project
      ),
    });

    if (get().currentProjectId === id) {
      markDirty(set);
      return;
    }

    try {
      const snapshot = await apiJson<ProjectSnapshot>(`/api/projects/${id}`);
      snapshot.project.name = trimmed;
      snapshot.project.updatedAt = new Date().toISOString();
      const saved = await apiJson<ProjectSnapshot>(`/api/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(snapshot),
      });
      applySnapshot(set, get, saved);
    } catch (error) {
      const { appErr, apiError } = buildStoreApiError(error, DB_UPDATE_001, {
        action: "renameProject",
        projectId: id,
        nextName: trimmed,
      });
      logAppError(appErr);
      set({ apiError, saveError: appErr.userMessage });
      throw appErr;
    }
  },

  closeProject: () => {
    set({
      currentProjectId: null,
      openingProjectId: null,
      editor: defaultEditorState,
      undoStack: [],
      redoStack: [],
    });
  },

  saveCurrentProject: async (_opts) => {
    if (inFlightSavePromise) {
      pendingSave = true;
      return inFlightSavePromise;
    }
    const snapshot = buildProjectSnapshot(get());
    if (!snapshot) return false;

    set({ saveState: "saving", saveError: null });
    inFlightSavePromise = (async () => {
      try {
        snapshot.project.updatedAt = new Date().toISOString();
        const saved = await apiJson<ProjectSnapshot>(`/api/projects/${snapshot.project.id}`, {
          method: "PUT",
          body: JSON.stringify(savedPayload(snapshot)),
        });
        applySnapshot(set, get, saved, {
          makeCurrent: true,
          preserveEditor: true,
          preserveHistory: true,
        });
        set({ saveState: "saved", saveError: null, lastSavedAt: saved.project.updatedAt, isSaved: true });
        return true;
      } catch (error) {
        const { appErr, apiError } = buildStoreApiError(error, API_UNKNOWN_001, {
          action: "saveCurrentProject",
          projectId: snapshot.project.id,
        });
        logAppError(appErr);
        set({
          saveState: "error",
          saveError: appErr.userMessage,
          apiError,
        });
        return false;
      } finally {
        inFlightSavePromise = null;
        if (pendingSave) {
          pendingSave = false;
          void get().saveCurrentProject();
        }
      }
    })();
    return inFlightSavePromise;
  },

  setBlueprint: (blueprint, pages) => {
    const currentProjectId = get().currentProjectId;
    if (!currentProjectId) return;
    const normalizedPages = canonicalizeProjectPages(currentProjectId, pages);
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    const files = canonicalizeProjectFiles(
      normalizeProject({ ...currentProject, pages: normalizedPages, files: {} }),
      normalizedPages
    );

    const cssId = uid();
    files[cssId] = {
      id: cssId,
      name: "styles.css",
      path: "/styles/global.css",
      content: generateGlobalCSS(blueprint),
      type: "css",
      language: "css",
    };

    set({
      projects: replaceProject(
        get().projects,
        normalizeProject({
          ...currentProject,
          id: currentProjectId,
          blueprint,
          pages: normalizedPages,
          files,
          status: "generating",
          updatedAt: new Date().toISOString(),
        })
      ),
      editor: { ...get().editor, selectedPageId: normalizedPages[0]?.id ?? null, selectedFileId: null },
    });
    markDirty(set);
  },

  setPageStatus: (pageId, status) => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    const nextPages = currentProject.pages.map((page) => page.id === pageId ? { ...page, status } : page);
    set({
      projects: replaceProject(get().projects, {
        ...currentProject,
        status: deriveProjectStatusFromPages(nextPages),
        pages: nextPages,
      }),
    });
    markDirty(set);
  },

  setPageContent: (pageId: string, html: string, sections: PageSection[], options?: { completeGeneration?: boolean }) => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    const existingPage = currentProject.pages.find((page) => page.id === pageId);
    if (existingPage?.html) {
      const undoStack = [...get().undoStack, { pageId, html: existingPage.html }].slice(-50);
      set({ undoStack, redoStack: [] });
    }

    const nextProject = syncProjectPage(currentProject, pageId, html, sections, {
      pageStatus: options?.completeGeneration
        ? "done"
        : existingPage?.status === "generating"
          ? "generating"
          : undefined,
      preserveGenerating: !options?.completeGeneration,
    });
    const nextSections = nextProject.pages.find((page) => page.id === pageId)?.sections ?? [];
    const sectionStillExists = nextSections.some((section) => section.id === get().editor.selectedSectionId);
    set({
      projects: replaceProject(get().projects, nextProject),
      editor: {
        ...get().editor,
        selectedSectionId: sectionStillExists ? get().editor.selectedSectionId : null,
        // Clear canvas selection when the selected section is gone to avoid stale DOM references
        selectedNode: sectionStillExists ? get().editor.selectedNode : null,
        isCanvasEditing: sectionStillExists ? get().editor.isCanvasEditing : false,
      },
    });
    markDirty(set);
  },

  setPageMeta: (pageId, meta) => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    if (projectHasActiveGeneration(currentProject)) return;

    const nextPages = currentProject.pages.map((page) => {
      if (page.id !== pageId) return page;
      const revision =
        typeof page.revision === "number" && Number.isFinite(page.revision)
          ? Math.max(1, Math.trunc(page.revision)) + 1
          : 2;
      return {
        ...page,
        meta: normalizeProjectPageMeta(meta, page),
        revision,
      };
    });

    set({
      projects: replaceProject(get().projects, {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        pages: nextPages,
      }),
    });
    markDirty(set);
  },

  setGenStatus: (status, progress = "") =>
    set((state) => {
      const shouldResetTiming = status === "idle" || status === "done" || status === "error";
      return {
        generationStatus: status,
        generationProgress: progress,
        ...(shouldResetTiming
          ? {
              generationTimingKind: null,
              generationStartedAt: null,
              generationEstimateMs: null,
            }
          : {
              generationTimingKind: state.generationTimingKind,
              generationStartedAt: state.generationStartedAt,
              generationEstimateMs: state.generationEstimateMs,
            }),
      };
    }),

  setGenerationTiming: (timing) =>
    set({
      generationTimingKind: timing.kind,
      generationStartedAt: timing.startedAt ?? Date.now(),
      generationEstimateMs: timing.estimateMs,
    }),

  addGenLog: (msg, type = "info") =>
    set({ generationLog: [...get().generationLog, { id: uid(), time: Date.now(), msg, type }] }),

  clearGenLog: () => set({ generationLog: [] }),

  selectPage: (pageId) => {
    const cur = get().editor.leftPanelTab;
    set({
      editor: {
        ...get().editor,
        selectedPageId: pageId,
        selectedFileId: pageId,
        selectedSectionId: null,
        selectedNode: null,
        isCanvasEditing: false,
        // Only force the pages tab when NOT in the layers/navigator view
        leftPanelTab: cur === "navigator" ? "navigator" : "pages",
      },
    });
  },

  selectFile: (fileId) => {
    const currentProject = getCurrentProjectState(get());
    const file = currentProject?.files[fileId ?? ""];
    set({
      editor: {
        ...get().editor,
        selectedFileId: fileId,
        selectedPageId: file?.type === "html" && fileId ? fileId : get().editor.selectedPageId,
        selectedSectionId: null,
        selectedNode: null,
        isCanvasEditing: false,
        leftPanelTab: "files",
        previewMode: "split",
      },
    });
  },

  selectSection: (sectionId) =>
    set({
      editor: {
        ...get().editor,
        selectedSectionId: sectionId,
      },
    }),
  setCanvasSelection: (node, isEditing = false) =>
    set({
      editor: {
        ...get().editor,
        selectedNode: node,
        selectedSectionId: node?.sectionId ?? get().editor.selectedSectionId,
        isCanvasEditing: isEditing,
      },
    }),
  clearCanvasSelection: () =>
    set({
      editor: {
        ...get().editor,
        selectedNode: null,
        isCanvasEditing: false,
      },
    }),
  setLeftPanel: (tab) => set({ editor: { ...get().editor, leftPanelTab: tab } }),
  setRightPanel: (tab) => set({ editor: { ...get().editor, rightPanelTab: tab } }),
  setLeftPanelWidth: (width) =>
    set({ editor: { ...get().editor, leftPanelWidth: clampLeftPanelWidth(width) } }),
  setRightPanelWidth: (width) =>
    set({ editor: { ...get().editor, rightPanelWidth: clampRightPanelWidth(width) } }),
  setPreviewMode: (mode) => set({ editor: { ...get().editor, previewMode: mode } }),
  setDevicePreview: (device) => set({ editor: { ...get().editor, devicePreview: device } }),
  setFullPreview: (full) => set({ editor: { ...get().editor, isFullPreview: full } }),
  toggleLeftSidebar: () => set({ editor: { ...get().editor, leftSidebarOpen: !get().editor.leftSidebarOpen } }),
  toggleRightSidebar: () => set({ editor: { ...get().editor, rightSidebarOpen: !get().editor.rightSidebarOpen } }),
  setVisualEditMode: (on) => set({ editor: { ...get().editor, visualEditMode: on } }),
  setCanvasZoom: (zoom) => set({ editor: { ...get().editor, canvasZoom: Math.min(4, Math.max(0.1, zoom)) } }),
  setCanvasPan: (x, y) => set({ editor: { ...get().editor, canvasPanX: x, canvasPanY: y } }),
  resetCanvasView: () => set({ editor: { ...get().editor, canvasZoom: 1, canvasPanX: 0, canvasPanY: 0 } }),
  toggleCanvasGrid: () => set({ editor: { ...get().editor, canvasGridVisible: !get().editor.canvasGridVisible } }),

  updateFileContent: (fileId, content) => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    if (projectHasActiveGeneration(currentProject)) return;
    const file = currentProject.files[fileId];
    const existingPage = currentProject.pages.find((page) => page.id === fileId);
    if (existingPage?.html && existingPage.html !== content) {
      const undoStack = [...get().undoStack, { pageId: fileId, html: existingPage.html }].slice(-50);
      set({ undoStack, redoStack: [] });
    }

    if (file?.type === "html" || existingPage) {
      const nextProject = syncProjectPage(currentProject, fileId, content, existingPage?.sections, {
        preserveGenerating: true,
      });
      set({
        projects: replaceProject(get().projects, nextProject),
        editor: {
          ...get().editor,
          selectedSectionId: nextProject.pages
            .find((page) => page.id === fileId)
            ?.sections.some((section) => section.id === get().editor.selectedSectionId)
            ? get().editor.selectedSectionId
            : null,
        },
      });
    } else {
      set({
        projects: replaceProject(get().projects, {
          ...currentProject,
          updatedAt: new Date().toISOString(),
          files: file ? { ...currentProject.files, [fileId]: { ...file, content } } : currentProject.files,
        }),
      });
    }
    markDirty(set);
  },

  insertBlock: (blockId) => {
    const currentProject = getCurrentProjectState(get());
    const pageId = get().editor.selectedPageId;
    if (!currentProject || !pageId) return;
    if (projectHasActiveGeneration(currentProject)) return;
    const page = currentProject.pages.find((entry) => entry.id === pageId);
    if (!page) return;
    const definition = getBlockDefinition(blockId);
    if (!definition) return;

    const html = renderEditorElementHtml(definition.id, currentProject, page, {
      placementHint: definition.placement,
    });
    if (!html) return;
    const inserted = insertElementIntoPageHtml(
      page.html,
      html,
      definition.placement,
      get().editor.selectedSectionId
    );
    const nextProject = syncProjectPage(currentProject, pageId, inserted.html, inserted.sections, {
      preserveGenerating: true,
    });

    set({
      projects: replaceProject(get().projects, nextProject),
      editor: {
        ...get().editor,
        selectedSectionId: inserted.insertedSectionId,
      },
    });
    markDirty(set);
  },

  pushUndo: (pageId, html) => set({ undoStack: [...get().undoStack, { pageId, html }].slice(-50), redoStack: [] }),

  undo: () => {
    const currentProject = getCurrentProjectState(get());
    const last = get().undoStack.at(-1);
    if (!currentProject || !last) return;
    if (projectHasActiveGeneration(currentProject)) return;
    const currentPage = currentProject.pages.find((page) => page.id === last.pageId);
    if (!currentPage) return;

    set({
      undoStack: get().undoStack.slice(0, -1),
      redoStack: [...get().redoStack, { pageId: last.pageId, html: currentPage.html }].slice(-50),
      projects: replaceProject(get().projects, syncProjectPage(currentProject, last.pageId, last.html, currentPage.sections, {
        preserveGenerating: true,
      })),
    });
    markDirty(set);
  },

  redo: () => {
    const currentProject = getCurrentProjectState(get());
    const last = get().redoStack.at(-1);
    if (!currentProject || !last) return;
    if (projectHasActiveGeneration(currentProject)) return;
    const currentPage = currentProject.pages.find((page) => page.id === last.pageId);
    if (!currentPage) return;

    set({
      redoStack: get().redoStack.slice(0, -1),
      undoStack: [...get().undoStack, { pageId: last.pageId, html: currentPage.html }].slice(-50),
      projects: replaceProject(get().projects, syncProjectPage(currentProject, last.pageId, last.html, currentPage.sections, {
        preserveGenerating: true,
      })),
    });
    markDirty(set);
  },

  addChatMessage: (projectId, msg) => {
    const existing = get().aiChats[projectId] ?? [];
    const idx = existing.findIndex((entry) => entry.id === msg.id);
    const next = idx >= 0 ? existing.map((entry, i) => (i === idx ? msg : entry)) : [...existing, msg];
    set({ aiChats: { ...get().aiChats, [projectId]: next } });
    if (projectId === get().currentProjectId) markDirty(set);
  },

  clearChat: (projectId) => {
    set({ aiChats: { ...get().aiChats, [projectId]: [] } });
    if (projectId === get().currentProjectId) markDirty(set);
  },

  setAiDraftPrompt: (prompt) => set({ aiDraftPrompt: prompt }),

  getCurrentProject: () => getCurrentProjectState(get()),
  getSelectedPage: () => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return null;
    return currentProject.pages.find((page) => page.id === get().editor.selectedPageId) ?? null;
  },

  addPage: (page, options) => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    const normalized = normalizePage(page);
    const derived = derivePageStateFromHtml(normalized.html, normalized.sections);
    const nextPage = { ...normalized, html: derived.html, sections: derived.sections };
    const nextPages = [...currentProject.pages, nextPage];
    const shouldSelect = options?.select ?? currentProject.pages.length === 0;
    set({
      projects: replaceProject(get().projects, {
        ...currentProject,
        blueprint: syncBlueprintPagesWithProjectPages(currentProject.blueprint, nextPages),
        updatedAt: new Date().toISOString(),
        pages: nextPages,
        status: deriveProjectStatusFromPages(nextPages),
        files: {
          ...currentProject.files,
          [normalized.id]: {
            id: normalized.id,
            name: `${normalized.slug || normalized.name.toLowerCase().replace(/\s+/g, "-")}.html`,
            path: `/pages/${normalized.slug}.html`,
            content: derived.html,
            type: "html",
            language: "html",
          },
        },
      }),
      editor: shouldSelect
        ? { ...get().editor, selectedPageId: normalized.id, selectedFileId: normalized.id }
        : get().editor,
    });
    markDirty(set);
  },

  deletePage: (pageId) => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    const remaining = currentProject.pages.filter((page) => page.id !== pageId);
    const files = { ...currentProject.files };
    delete files[pageId];

    set({
      projects: replaceProject(get().projects, {
        ...currentProject,
        blueprint: syncBlueprintPagesWithProjectPages(currentProject.blueprint, remaining),
        updatedAt: new Date().toISOString(),
        pages: remaining,
        status: deriveProjectStatusFromPages(remaining),
        files,
      }),
      editor: {
        ...get().editor,
        selectedPageId: get().editor.selectedPageId === pageId ? (remaining[0]?.id ?? null) : get().editor.selectedPageId,
        selectedFileId: get().editor.selectedFileId === pageId ? (remaining[0]?.id ?? null) : get().editor.selectedFileId,
      },
    });
    markDirty(set);
  },

  duplicatePage: (pageId) => {
    const currentProject = getCurrentProjectState(get());
    const page = currentProject?.pages.find((entry) => entry.id === pageId);
    if (!currentProject || !page) return;
    const newId = uid();
    const newSlug = `${page.slug || page.name.toLowerCase().replace(/\s+/g, "-")}-copy`;
    const newPage: ProjectPage = { ...page, id: newId, name: `${page.name} (Copy)`, slug: newSlug };
    const nextPages = [...currentProject.pages, newPage];

    set({
      projects: replaceProject(get().projects, {
        ...currentProject,
        blueprint: syncBlueprintPagesWithProjectPages(currentProject.blueprint, nextPages),
        updatedAt: new Date().toISOString(),
        pages: nextPages,
        files: {
          ...currentProject.files,
          [newId]: {
            id: newId,
            name: `${newSlug}.html`,
            path: `/pages/${newSlug}.html`,
            content: page.html,
            type: "html",
            language: "html",
          },
        },
      }),
      editor: { ...get().editor, selectedPageId: newId, selectedFileId: newId },
    });
    markDirty(set);
  },

  renamePage: (pageId, name) => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const nextPages = currentProject.pages.map((page) => page.id === pageId ? { ...page, name, slug } : page);
    set({
      projects: replaceProject(get().projects, {
        ...currentProject,
        blueprint: syncBlueprintPagesWithProjectPages(currentProject.blueprint, nextPages),
        updatedAt: new Date().toISOString(),
        pages: nextPages,
        files: currentProject.files[pageId]
          ? { ...currentProject.files, [pageId]: { ...currentProject.files[pageId], name: `${slug}.html`, path: `/pages/${slug}.html` } }
          : currentProject.files,
      }),
    });
    markDirty(set);
  },

  upsertMediaAssets: async (assets) => {
    const normalized = normalizeMediaAssets(assets);
    if (!normalized.length) return;

    const previous = get().mediaLibrary;
    set({ mediaLibrary: mergeMediaAssets(previous, normalized) });

    try {
      const response = await apiJson<{ media: ProjectMediaAsset[] }>("/api/media", {
        method: "POST",
        body: JSON.stringify({ assets: normalized }),
      });
      set({ mediaLibrary: normalizeMediaAssets(response.media) });
    } catch (error) {
      const { appErr, apiError } = buildStoreApiError(error, DB_WRITE_001, {
        action: "upsertMediaAssets",
        assetCount: normalized.length,
      });
      logAppError(appErr);
      set({ mediaLibrary: previous, apiError, saveError: appErr.userMessage });
      throw appErr;
    }
  },

  removeMediaAsset: async (assetId) => {
    const previous = get().mediaLibrary;
    set({ mediaLibrary: previous.filter((asset) => asset.id !== assetId) });

    try {
      await apiJson<{ ok: true }>(`/api/media/${assetId}`, { method: "DELETE" });
    } catch (error) {
      const { appErr, apiError } = buildStoreApiError(error, DB_DELETE_001, {
        action: "removeMediaAsset",
        assetId,
      });
      logAppError(appErr);
      set({ mediaLibrary: previous, apiError, saveError: appErr.userMessage });
      throw appErr;
    }
  },

  renameMediaAsset: async (assetId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const previous = get().mediaLibrary;
    set({
      mediaLibrary: previous.map((asset) => asset.id === assetId ? { ...asset, name: trimmed } : asset),
    });

    try {
      const response = await apiJson<{ media: ProjectMediaAsset[] }>(`/api/media/${assetId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
      set({ mediaLibrary: normalizeMediaAssets(response.media) });
    } catch (error) {
      const { appErr, apiError } = buildStoreApiError(error, DB_UPDATE_001, {
        action: "renameMediaAsset",
        assetId,
        nextName: trimmed,
      });
      logAppError(appErr);
      set({ mediaLibrary: previous, apiError, saveError: appErr.userMessage });
      throw appErr;
    }
  },
}));

function savedPayload(snapshot: ProjectSnapshot): ProjectSnapshot {
  const normalizedProject = normalizeProject(snapshot.project);
  const pages = canonicalizeProjectPages(normalizedProject.id, normalizedProject.pages);
  const canonicalProject = normalizeProject({
    ...normalizedProject,
    pages,
    files: canonicalizeProjectFiles(normalizedProject, pages),
  });
  return {
    project: {
      ...canonicalProject,
      pages: canonicalProject.pages.map(normalizePage),
      media: [],
    },
    editorState: normalizeEditorStateForProject(canonicalProject, snapshot.editorState, {
      clearCanvasSelection: false,
    }),
    aiChats: snapshot.aiChats ?? [],
  };
}

let inFlightSavePromise: Promise<boolean> | null = null;
let pendingSave = false;

function generateGlobalCSS(blueprint: SiteBlueprint): string {
  const { colorScheme, typography } = blueprint;
  return `/* Generated by Sitezy */
:root {
  --color-primary: ${colorScheme.primary};
  --color-secondary: ${colorScheme.secondary};
  --color-accent: ${colorScheme.accent};
  --color-bg: ${colorScheme.bg};
  --color-text: ${colorScheme.text};
  --color-muted: ${colorScheme.muted || "#6b7280"};
  --font-heading: '${typography.headingFont}', sans-serif;
  --font-body: '${typography.bodyFont}', system-ui, sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-body); background: var(--color-bg); color: var(--color-text); line-height: 1.6; }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); line-height: 1.2; }
a { color: var(--color-primary); text-decoration: none; }
img { max-width: 100%; height: auto; }
`;
}
