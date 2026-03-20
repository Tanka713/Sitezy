import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Project,
  ProjectPage,
  SiteBlueprint,
  VirtualFile,
  PageSection,
  GenerationStatus,
  GenerationLogEntry,
  EditorState,
  AIChatMessage,
  SiteBrief,
} from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Always returns a safe project with guaranteed arrays/objects — fixes stale localStorage data */
function normalizeProject(p: Partial<Project>): Project {
  return {
    id: p.id ?? uid(),
    name: p.name ?? "Untitled",
    brief: p.brief ?? { siteName: "", description: "", siteType: "", tone: "Professional", pages: [], features: "" },
    blueprint: p.blueprint ?? null,
    pages: Array.isArray(p.pages) ? p.pages.map(normalizePage) : [],
    files: p.files && typeof p.files === "object" ? p.files : {},
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
    status: p.status ?? "draft",
  };
}

function normalizePage(pg: Partial<ProjectPage>): ProjectPage {
  return {
    id: pg.id ?? uid(),
    name: pg.name ?? "Page",
    slug: pg.slug ?? "",
    sections: Array.isArray(pg.sections) ? pg.sections : [],
    purpose: pg.purpose ?? "",
    html: pg.html ?? "",
    status: pg.status ?? "pending",
  };
}

function updateProject(
  projects: Project[],
  projectId: string | null,
  updater: (p: Project) => Project
): Project[] {
  return projects.map((p) => (p.id === projectId ? updater(normalizeProject(p)) : p));
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  editor: EditorState;
  generationStatus: GenerationStatus;
  generationProgress: string;
  generationLog: GenerationLogEntry[];
  aiChats: Record<string, AIChatMessage[]>;
  undoStack: Array<{ pageId: string; html: string }>;
  redoStack: Array<{ pageId: string; html: string }>;
  isSaved: boolean;
}

interface AppActions {
  createProject: (brief: SiteBrief) => Project;
  openProject: (id: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  closeProject: () => void;
  setBlueprint: (blueprint: SiteBlueprint, pages: ProjectPage[]) => void;
  setPageStatus: (pageId: string, status: ProjectPage["status"]) => void;
  setPageContent: (pageId: string, html: string, sections: PageSection[]) => void;
  setGenStatus: (status: GenerationStatus, progress?: string) => void;
  addGenLog: (msg: string, type?: GenerationLogEntry["type"]) => void;
  clearGenLog: () => void;
  selectPage: (pageId: string | null) => void;
  selectFile: (fileId: string | null) => void;
  selectSection: (sectionId: string | null) => void;
  setLeftPanel: (tab: EditorState["leftPanelTab"]) => void;
  setRightPanel: (tab: EditorState["rightPanelTab"]) => void;
  setPreviewMode: (mode: EditorState["previewMode"]) => void;
  setDevicePreview: (device: EditorState["devicePreview"]) => void;
  setFullPreview: (full: boolean) => void;
  setVisualEditMode: (on: boolean) => void;
  updateFileContent: (fileId: string, content: string) => void;
  pushUndo: (pageId: string, html: string) => void;
  undo: () => void;
  redo: () => void;
  addChatMessage: (projectId: string, msg: AIChatMessage) => void;
  clearChat: (projectId: string) => void;
  getCurrentProject: () => Project | null;
  getSelectedPage: () => ProjectPage | null;

  // Page management
  addPage: (page: ProjectPage) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
}

// ─── Default editor state ─────────────────────────────────────────────────────
const defaultEditorState: EditorState = {
  selectedPageId: null,
  selectedFileId: null,
  selectedSectionId: null,
  leftPanelTab: "pages",
  rightPanelTab: "ai",
  previewMode: "preview",
  devicePreview: "desktop",
  isFullPreview: false,
  leftPanelWidth: 220,
  rightPanelWidth: 280,
  visualEditMode: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      editor: defaultEditorState,
      generationStatus: "idle",
      generationProgress: "",
      generationLog: [],
      aiChats: {},
      undoStack: [],
      redoStack: [],
      isSaved: true,

      createProject: (brief) => {
        const project: Project = normalizeProject({
          id: uid(),
          name: brief.siteName || "Untitled Project",
          brief,
          blueprint: null,
          pages: [],
          files: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "draft",
        });
        set({
          projects: [project, ...get().projects],
          currentProjectId: project.id,
          editor: { ...defaultEditorState },
          generationLog: [],
          generationStatus: "idle",
          isSaved: false,
        });
        return project;
      },

      openProject: (id) => {
        const raw = get().projects.find((p) => p.id === id);
        if (!raw) return;
        const project = normalizeProject(raw);
        set({
          currentProjectId: id,
          editor: { ...defaultEditorState, selectedPageId: project.pages[0]?.id ?? null },
        });
      },

      deleteProject: (id) => {
        const { currentProjectId } = get();
        set({
          projects: get().projects.filter((p) => p.id !== id),
          ...(currentProjectId === id ? { currentProjectId: null, editor: defaultEditorState } : {}),
        });
      },

      renameProject: (id, name) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id ? { ...normalizeProject(p), name, updatedAt: new Date().toISOString() } : p
          ),
          isSaved: false,
        });
      },

      closeProject: () => set({ currentProjectId: null, editor: defaultEditorState }),

      setBlueprint: (blueprint, pages) => {
        const { currentProjectId } = get();
        const files: Record<string, VirtualFile> = {};
        pages.forEach((page) => {
          const slug = page.slug || page.name.toLowerCase().replace(/\s+/g, "-");
          files[page.id] = {
            id: page.id,
            name: `${slug}.html`,
            path: `/pages/${slug}.html`,
            content: "",
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
          projects: updateProject(get().projects, currentProjectId, (p) => ({
            ...p, blueprint, pages, files, status: "generating", updatedAt: new Date().toISOString(),
          })),
          editor: { ...get().editor, selectedPageId: pages[0]?.id ?? null },
          isSaved: false,
        });
      },

      setPageStatus: (pageId, status) => {
        const { currentProjectId } = get();
        set({
          projects: updateProject(get().projects, currentProjectId, (p) => ({
            ...p,
            pages: p.pages.map((pg) => pg.id === pageId ? { ...pg, status } : pg),
          })),
        });
      },

      setPageContent: (pageId, html, sections) => {
        const { currentProjectId } = get();
        // Auto-snapshot current html into undo stack before overwriting
        const existing = get().projects.find((p) => p.id === currentProjectId);
        const existingPage = existing?.pages?.find((pg) => pg.id === pageId);
        if (existingPage?.html) {
          const stack = [...get().undoStack, { pageId, html: existingPage.html }];
          if (stack.length > 50) stack.shift();
          set({ undoStack: stack, redoStack: [] });
        }
        set({
          projects: updateProject(get().projects, currentProjectId, (p) => ({
            ...p,
            updatedAt: new Date().toISOString(),
            pages: p.pages.map((pg) => pg.id === pageId ? { ...pg, html, sections, status: "done" } : pg),
            files: p.files[pageId]
              ? { ...p.files, [pageId]: { ...p.files[pageId], content: html } }
              : p.files,
          })),
          isSaved: false,
        });
      },

      setGenStatus: (status, progress = "") => set({ generationStatus: status, generationProgress: progress }),

      addGenLog: (msg, type = "info") => {
        set({ generationLog: [...get().generationLog, { id: uid(), time: Date.now(), msg, type }] });
      },

      clearGenLog: () => set({ generationLog: [] }),

      selectPage: (pageId) => set({ editor: { ...get().editor, selectedPageId: pageId } }),
      selectFile: (fileId) => set({ editor: { ...get().editor, selectedFileId: fileId, leftPanelTab: "files" } }),
      selectSection: (sectionId) => set({ editor: { ...get().editor, selectedSectionId: sectionId } }),
      setLeftPanel: (tab) => set({ editor: { ...get().editor, leftPanelTab: tab } }),
      setRightPanel: (tab) => set({ editor: { ...get().editor, rightPanelTab: tab } }),
      setPreviewMode: (mode) => set({ editor: { ...get().editor, previewMode: mode } }),
      setDevicePreview: (device) => set({ editor: { ...get().editor, devicePreview: device } }),
      setFullPreview: (full) => set({ editor: { ...get().editor, isFullPreview: full } }),
      setVisualEditMode: (on) => set({ editor: { ...get().editor, visualEditMode: on } }),

      updateFileContent: (fileId, content) => {
        const { currentProjectId } = get();
        // Auto-snapshot for undo when editing code directly
        const existing = get().projects.find((p) => p.id === currentProjectId);
        const existingPage = existing?.pages?.find((pg) => pg.id === fileId);
        if (existingPage?.html && existingPage.html !== content) {
          const stack = [...get().undoStack, { pageId: fileId, html: existingPage.html }];
          if (stack.length > 50) stack.shift();
          set({ undoStack: stack, redoStack: [] });
        }
        set({
          projects: updateProject(get().projects, currentProjectId, (p) => ({
            ...p,
            files: p.files[fileId] ? { ...p.files, [fileId]: { ...p.files[fileId], content } } : p.files,
            pages: p.pages.map((pg) => pg.id === fileId ? { ...pg, html: content } : pg),
          })),
          isSaved: false,
        });
      },

      pushUndo: (pageId, html) => {
        const stack = [...get().undoStack, { pageId, html }];
        if (stack.length > 50) stack.shift();
        set({ undoStack: stack, redoStack: [] });
      },

      undo: () => {
        const { undoStack, currentProjectId } = get();
        if (!undoStack.length) return;
        const last = undoStack[undoStack.length - 1];
        const project = get().projects.find((p) => p.id === currentProjectId);
        const norm = project ? normalizeProject(project) : null;
        const page = norm?.pages.find((p) => p.id === last.pageId);
        if (!page) return;
        set({
          redoStack: [...get().redoStack, { pageId: last.pageId, html: page.html }],
          undoStack: undoStack.slice(0, -1),
          projects: updateProject(get().projects, currentProjectId, (p) => ({
            ...p,
            pages: p.pages.map((pg) => pg.id === last.pageId ? { ...pg, html: last.html } : pg),
            files: p.files[last.pageId]
              ? { ...p.files, [last.pageId]: { ...p.files[last.pageId], content: last.html } }
              : p.files,
          })),
        });
      },

      redo: () => {
        const { redoStack, currentProjectId } = get();
        if (!redoStack.length) return;
        const last = redoStack[redoStack.length - 1];
        const project = get().projects.find((p) => p.id === currentProjectId);
        const norm = project ? normalizeProject(project) : null;
        const page = norm?.pages.find((p) => p.id === last.pageId);
        if (!page) return;
        set({
          undoStack: [...get().undoStack, { pageId: last.pageId, html: page.html }],
          redoStack: redoStack.slice(0, -1),
          projects: updateProject(get().projects, currentProjectId, (p) => ({
            ...p,
            pages: p.pages.map((pg) => pg.id === last.pageId ? { ...pg, html: last.html } : pg),
            files: p.files[last.pageId]
              ? { ...p.files, [last.pageId]: { ...p.files[last.pageId], content: last.html } }
              : p.files,
          })),
        });
      },

      addChatMessage: (projectId, msg) => {
        const chats = get().aiChats;
        const existing = Array.isArray(chats[projectId]) ? chats[projectId] : [];
        const idx = existing.findIndex((m) => m.id === msg.id);
        const updated = idx >= 0
          ? existing.map((m, i) => (i === idx ? msg : m))
          : [...existing, msg];
        set({ aiChats: { ...chats, [projectId]: updated } });
      },

      clearChat: (projectId) => set({ aiChats: { ...get().aiChats, [projectId]: [] } }),

      // ── Page management ───────────────────────────────────────────────────────
      addPage: (page) => {
        const { currentProjectId } = get();
        set({
          projects: updateProject(get().projects, currentProjectId, (p) => ({
            ...p,
            pages: [...p.pages, normalizePage(page)],
            files: {
              ...p.files,
              [page.id]: {
                id: page.id,
                name: `${page.slug || page.name.toLowerCase().replace(/\s+/g, "-")}.html`,
                path: `/pages/${page.slug}.html`,
                content: page.html || "",
                type: "html",
                language: "html",
              },
            },
            updatedAt: new Date().toISOString(),
          })),
          editor: { ...get().editor, selectedPageId: page.id },
          isSaved: false,
        });
      },

      deletePage: (pageId) => {
        const { currentProjectId, editor } = get();
        const project = get().projects.find((p) => p.id === currentProjectId);
        const pages = project?.pages ?? [];
        const remaining = pages.filter((p) => p.id !== pageId);
        const newSelectedId =
          editor.selectedPageId === pageId
            ? (remaining[0]?.id ?? null)
            : editor.selectedPageId;
        set({
          projects: updateProject(get().projects, currentProjectId, (p) => {
            const newFiles = { ...p.files };
            delete newFiles[pageId];
            return { ...p, pages: remaining, files: newFiles, updatedAt: new Date().toISOString() };
          }),
          editor: { ...get().editor, selectedPageId: newSelectedId },
          isSaved: false,
        });
      },

      duplicatePage: (pageId) => {
        const { currentProjectId } = get();
        const project = get().projects.find((p) => p.id === currentProjectId);
        const page = project?.pages?.find((p) => p.id === pageId);
        if (!page) return;
        const newId = uid();
        const newSlug = `${page.slug || page.name.toLowerCase().replace(/\s+/g, "-")}-copy`;
        const newPage: ProjectPage = { ...page, id: newId, name: `${page.name} (Copy)`, slug: newSlug };
        set({
          projects: updateProject(get().projects, currentProjectId, (p) => ({
            ...p,
            pages: [...p.pages, newPage],
            files: {
              ...p.files,
              [newId]: { id: newId, name: `${newSlug}.html`, path: `/pages/${newSlug}.html`, content: page.html, type: "html", language: "html" },
            },
            updatedAt: new Date().toISOString(),
          })),
          editor: { ...get().editor, selectedPageId: newId },
          isSaved: false,
        });
      },

      renamePage: (pageId, name) => {
        const { currentProjectId } = get();
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        set({
          projects: updateProject(get().projects, currentProjectId, (p) => ({
            ...p,
            pages: p.pages.map((pg) => pg.id === pageId ? { ...pg, name, slug } : pg),
            files: p.files[pageId]
              ? { ...p.files, [pageId]: { ...p.files[pageId], name: `${slug}.html`, path: `/pages/${slug}.html` } }
              : p.files,
            updatedAt: new Date().toISOString(),
          })),
          isSaved: false,
        });
      },

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        const raw = projects.find((p) => p.id === currentProjectId);
        return raw ? normalizeProject(raw) : null;
      },

      getSelectedPage: () => {
        const { projects, currentProjectId, editor } = get();
        const raw = projects.find((p) => p.id === currentProjectId);
        if (!raw) return null;
        const project = normalizeProject(raw);
        return project.pages.find((p) => p.id === editor.selectedPageId) ?? null;
      },
    }),
    {
      name: "sitezy-store-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        aiChats: state.aiChats,
      }),
      // Normalize all projects on rehydration from localStorage
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.projects)) {
          state.projects = state.projects.map(normalizeProject);
        }
      },
    }
  )
);

// ─── CSS helper ───────────────────────────────────────────────────────────────
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
