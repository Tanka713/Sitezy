import { create } from "zustand";
import { buildBlockHtml } from "@/lib/blocks/factory";
import { derivePageStateFromHtml, insertBlockIntoPageHtml } from "@/lib/editor/structure";
import type {
  AIChatMessage,
  EditorState,
  GenerationLogEntry,
  GenerationStatus,
  PageSection,
  Project,
  ProjectPage,
  ProjectSnapshot,
  SaveState,
  SiteBlueprint,
  SiteBrief,
  VirtualFile,
} from "@/types";

const LAST_PROJECT_KEY = "sitezy-last-project-id";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function readLastProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_PROJECT_KEY);
  } catch {
    return null;
  }
}

function writeLastProjectId(projectId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (projectId) window.localStorage.setItem(LAST_PROJECT_KEY, projectId);
    else window.localStorage.removeItem(LAST_PROJECT_KEY);
  } catch {}
}

function normalizeProject(project: Partial<Project>): Project {
  return {
    id: project.id ?? uid(),
    name: project.name ?? "Untitled Project",
    brief: project.brief ?? { siteName: "", description: "", siteType: "", tone: "Professional", pages: [], features: "" },
    blueprint: project.blueprint ?? null,
    pages: Array.isArray(project.pages) ? project.pages.map(normalizePage) : [],
    files: project.files && typeof project.files === "object" ? project.files : {},
    createdAt: project.createdAt ?? new Date().toISOString(),
    updatedAt: project.updatedAt ?? new Date().toISOString(),
    status: project.status ?? "draft",
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
    status: pg.status ?? "pending",
    error: pg.error,
  };
}

const defaultEditorState: EditorState = {
  selectedPageId: null,
  selectedFileId: null,
  selectedSectionId: null,
  selectedNode: null,
  isCanvasEditing: false,
  leftPanelTab: "pages",
  rightPanelTab: "blocks",
  previewMode: "preview",
  devicePreview: "desktop",
  isFullPreview: false,
  leftPanelWidth: 220,
  rightPanelWidth: 280,
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  visualEditMode: true,
};

function mergeEditorState(editorState?: Partial<EditorState> | null): EditorState {
  return { ...defaultEditorState, ...(editorState ?? {}) };
}

function replaceProject(projects: Project[], next: Project): Project[] {
  const normalized = normalizeProject(next);
  const idx = projects.findIndex((project) => project.id === normalized.id);
  if (idx === -1) return [normalized, ...projects];
  const copy = [...projects];
  copy[idx] = normalized;
  return copy;
}

async function apiJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const data = await response.json() as { error?: string };
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface ApiError {
  message: string;
  requestId: string | null;
  code: string;
}

interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  editor: EditorState;
  aiDraftPrompt: string | null;
  generationStatus: GenerationStatus;
  generationProgress: string;
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
  hydrateProjects: () => Promise<void>;
  createProject: (brief: SiteBrief) => Promise<Project>;
  openProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  closeProject: () => void;
  saveCurrentProject: (opts?: { manual?: boolean }) => Promise<boolean>;
  setBlueprint: (blueprint: SiteBlueprint, pages: ProjectPage[]) => void;
  setPageStatus: (pageId: string, status: ProjectPage["status"]) => void;
  setPageContent: (pageId: string, html: string, sections: PageSection[]) => void;
  setGenStatus: (status: GenerationStatus, progress?: string) => void;
  addGenLog: (msg: string, type?: GenerationLogEntry["type"]) => void;
  clearGenLog: () => void;
  selectPage: (pageId: string | null) => void;
  selectFile: (fileId: string | null) => void;
  selectSection: (sectionId: string | null) => void;
  setCanvasSelection: (node: EditorState["selectedNode"], isEditing?: boolean) => void;
  clearCanvasSelection: () => void;
  setLeftPanel: (tab: EditorState["leftPanelTab"]) => void;
  setRightPanel: (tab: EditorState["rightPanelTab"]) => void;
  setPreviewMode: (mode: EditorState["previewMode"]) => void;
  setDevicePreview: (device: EditorState["devicePreview"]) => void;
  setFullPreview: (full: boolean) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setVisualEditMode: (on: boolean) => void;
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
  addPage: (page: ProjectPage) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
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
  return {
    project,
    editorState: state.editor,
    aiChats: state.aiChats[project.id] ?? [],
  };
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
  const editorState = mergeEditorState(snapshot.editorState);
  const makeCurrent = options.makeCurrent ?? false;
  const preserveEditor = options.preserveEditor ?? false;
  const preserveHistory = options.preserveHistory ?? false;

  set({
    projects: replaceProject(get().projects, project),
    currentProjectId: makeCurrent ? project.id : get().currentProjectId,
    editor: preserveEditor ? get().editor : makeCurrent ? editorState : get().editor,
    aiChats: { ...get().aiChats, [project.id]: snapshot.aiChats ?? [] },
    undoStack: preserveHistory ? get().undoStack : [],
    redoStack: preserveHistory ? get().redoStack : [],
    isSaved: true,
    saveState: "idle",
    saveError: null,
    lastSavedAt: project.updatedAt,
  });
}

function markDirty(set: (partial: Partial<AppState>) => void) {
  set({ isSaved: false, saveState: "idle", saveError: null });
}

function syncProjectPage(
  project: Project,
  pageId: string,
  nextHtml: string,
  fallbackSections?: PageSection[]
): Project {
  const derived = derivePageStateFromHtml(nextHtml, fallbackSections);
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    status: "ready",
    pages: project.pages.map((page) =>
      page.id === pageId
        ? {
            ...page,
            html: derived.html,
            sections: derived.sections,
            status: "done",
          }
        : page
    ),
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
  currentProjectId: null,
  editor: defaultEditorState,
  aiDraftPrompt: null,
  generationStatus: "idle",
  generationProgress: "",
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

  setApiError: (err) => set({ apiError: err }),

  hydrateProjects: async () => {
    if (get().isHydratingProjects) return;
    set({ isHydratingProjects: true });
    try {
      const data = await apiJson<{ projects: Project[] }>("/api/projects");
      const projects = (data.projects ?? []).map(normalizeProject);
      set({
        projects,
        isHydratingProjects: false,
        hasHydratedProjects: true,
      });

      const lastProjectId = readLastProjectId();
      if (lastProjectId && projects.some((project) => project.id === lastProjectId)) {
        await get().openProject(lastProjectId);
      }
    } catch (error) {
      set({
        isHydratingProjects: false,
        hasHydratedProjects: true,
        saveError: error instanceof Error ? error.message : "Failed to hydrate projects",
      });
    }
  },

  createProject: async (brief) => {
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

    const snapshot = await apiJson<ProjectSnapshot>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ project: draft }),
    });

    applySnapshot(set, get, snapshot, { makeCurrent: true });
    writeLastProjectId(snapshot.project.id);
    return snapshot.project;
  },

  openProject: async (id) => {
    const snapshot = await apiJson<ProjectSnapshot>(`/api/projects/${id}`);
    applySnapshot(set, get, snapshot, { makeCurrent: true });
    writeLastProjectId(id);
  },

  deleteProject: async (id) => {
    await apiJson<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" });
    const isCurrent = get().currentProjectId === id;
    set({
      projects: get().projects.filter((project) => project.id !== id),
      ...(isCurrent ? { currentProjectId: null, editor: defaultEditorState } : {}),
    });
    if (isCurrent) writeLastProjectId(null);
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

    const snapshot = await apiJson<ProjectSnapshot>(`/api/projects/${id}`);
    snapshot.project.name = trimmed;
    snapshot.project.updatedAt = new Date().toISOString();
    const saved = await apiJson<ProjectSnapshot>(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(snapshot),
    });
    applySnapshot(set, get, saved);
  },

  closeProject: () => {
    writeLastProjectId(null);
    set({ currentProjectId: null, editor: defaultEditorState, undoStack: [], redoStack: [] });
  },

  saveCurrentProject: async () => {
    if (get().saveState === "saving") return false;
    const snapshot = buildProjectSnapshot(get());
    if (!snapshot) return false;

    set({ saveState: "saving", saveError: null });
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
      set({
        saveState: "error",
        saveError: error instanceof Error ? error.message : "Failed to save project",
      });
      return false;
    }
  },

  setBlueprint: (blueprint, pages) => {
    const currentProjectId = get().currentProjectId;
    if (!currentProjectId) return;
    const files: Record<string, VirtualFile> = {};

    pages.forEach((page) => {
      const slug = page.slug || page.name.toLowerCase().replace(/\s+/g, "-");
      files[page.id] = {
        id: page.id,
        name: `${slug}.html`,
        path: `/pages/${slug}.html`,
        content: page.html ?? "",
        type: "html",
        language: "html",
      };
    });

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
          ...getCurrentProjectState(get()),
          id: currentProjectId,
          blueprint,
          pages,
          files,
          status: "generating",
          updatedAt: new Date().toISOString(),
        })
      ),
      editor: { ...get().editor, selectedPageId: pages[0]?.id ?? null, selectedFileId: null },
    });
    markDirty(set);
  },

  setPageStatus: (pageId, status) => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    set({
      projects: replaceProject(get().projects, {
        ...currentProject,
        pages: currentProject.pages.map((page) => page.id === pageId ? { ...page, status } : page),
      }),
    });
    markDirty(set);
  },

  setPageContent: (pageId, html, sections) => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    const existingPage = currentProject.pages.find((page) => page.id === pageId);
    if (existingPage?.html) {
      const undoStack = [...get().undoStack, { pageId, html: existingPage.html }].slice(-50);
      set({ undoStack, redoStack: [] });
    }

    const nextProject = syncProjectPage(currentProject, pageId, html, sections);
    const nextSections = nextProject.pages.find((page) => page.id === pageId)?.sections ?? [];
    set({
      projects: replaceProject(get().projects, nextProject),
      editor: {
        ...get().editor,
        selectedSectionId: nextSections.some((section) => section.id === get().editor.selectedSectionId)
          ? get().editor.selectedSectionId
          : null,
      },
    });
    markDirty(set);
  },

  setGenStatus: (status, progress = "") => set({ generationStatus: status, generationProgress: progress }),

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
  setPreviewMode: (mode) => set({ editor: { ...get().editor, previewMode: mode } }),
  setDevicePreview: (device) => set({ editor: { ...get().editor, devicePreview: device } }),
  setFullPreview: (full) => set({ editor: { ...get().editor, isFullPreview: full } }),
  toggleLeftSidebar: () => set({ editor: { ...get().editor, leftSidebarOpen: !get().editor.leftSidebarOpen } }),
  toggleRightSidebar: () => set({ editor: { ...get().editor, rightSidebarOpen: !get().editor.rightSidebarOpen } }),
  setVisualEditMode: (on) => set({ editor: { ...get().editor, visualEditMode: on } }),

  updateFileContent: (fileId, content) => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    const file = currentProject.files[fileId];
    const existingPage = currentProject.pages.find((page) => page.id === fileId);
    if (existingPage?.html && existingPage.html !== content) {
      const undoStack = [...get().undoStack, { pageId: fileId, html: existingPage.html }].slice(-50);
      set({ undoStack, redoStack: [] });
    }

    if (file?.type === "html" || existingPage) {
      const nextProject = syncProjectPage(currentProject, fileId, content, existingPage?.sections);
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
    const page = currentProject.pages.find((entry) => entry.id === pageId);
    if (!page) return;

    const html = buildBlockHtml(blockId, currentProject);
    const inserted = insertBlockIntoPageHtml(page.html, html, get().editor.selectedSectionId);
    const nextProject = syncProjectPage(currentProject, pageId, inserted.html, inserted.sections);

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
    const currentPage = currentProject.pages.find((page) => page.id === last.pageId);
    if (!currentPage) return;

    set({
      undoStack: get().undoStack.slice(0, -1),
      redoStack: [...get().redoStack, { pageId: last.pageId, html: currentPage.html }].slice(-50),
      projects: replaceProject(get().projects, syncProjectPage(currentProject, last.pageId, last.html, currentPage.sections)),
    });
    markDirty(set);
  },

  redo: () => {
    const currentProject = getCurrentProjectState(get());
    const last = get().redoStack.at(-1);
    if (!currentProject || !last) return;
    const currentPage = currentProject.pages.find((page) => page.id === last.pageId);
    if (!currentPage) return;

    set({
      redoStack: get().redoStack.slice(0, -1),
      undoStack: [...get().undoStack, { pageId: last.pageId, html: currentPage.html }].slice(-50),
      projects: replaceProject(get().projects, syncProjectPage(currentProject, last.pageId, last.html, currentPage.sections)),
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

  addPage: (page) => {
    const currentProject = getCurrentProjectState(get());
    if (!currentProject) return;
    const normalized = normalizePage(page);
    const derived = derivePageStateFromHtml(normalized.html, normalized.sections);
    set({
      projects: replaceProject(get().projects, {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        pages: [...currentProject.pages, { ...normalized, html: derived.html, sections: derived.sections }],
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
      editor: { ...get().editor, selectedPageId: normalized.id, selectedFileId: normalized.id },
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
        updatedAt: new Date().toISOString(),
        pages: remaining,
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

    set({
      projects: replaceProject(get().projects, {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        pages: [...currentProject.pages, newPage],
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
    set({
      projects: replaceProject(get().projects, {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        pages: currentProject.pages.map((page) => page.id === pageId ? { ...page, name, slug } : page),
        files: currentProject.files[pageId]
          ? { ...currentProject.files, [pageId]: { ...currentProject.files[pageId], name: `${slug}.html`, path: `/pages/${slug}.html` } }
          : currentProject.files,
      }),
    });
    markDirty(set);
  },
}));

function savedPayload(snapshot: ProjectSnapshot): ProjectSnapshot {
  return {
    project: {
      ...snapshot.project,
      pages: snapshot.project.pages.map(normalizePage),
    },
    editorState: mergeEditorState(snapshot.editorState),
    aiChats: snapshot.aiChats ?? [],
  };
}

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
