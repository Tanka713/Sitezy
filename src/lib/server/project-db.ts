import type {
  AIChatMessage,
  EditorState,
  Project,
  ProjectPage,
  ProjectSnapshot,
  SiteBrief,
  SiteBlueprint,
  VirtualFile,
} from "@/types";
import {
  createMediaLibraryFile,
  extractMediaLibraryFromFileList,
  normalizeMediaAssets,
} from "@/lib/media/library";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DB_DELETE_001,
  DB_READ_001,
  DB_SCHEMA_001,
  DB_WRITE_001,
  DB_WRITE_002,
  DB_WRITE_003,
  createAppError,
  type ErrorCode,
} from "@/lib/errors";

type ProjectRow = {
  id: string;
  user_id: string | null;
  name: string;
  brief_json: SiteBrief;
  blueprint_json: SiteBlueprint | null;
  status: Project["status"];
  created_at: string;
  updated_at: string;
  editor_state_json: Partial<EditorState> | null;
  ai_chats_json: AIChatMessage[] | null;
};

type PageRow = {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  purpose: string;
  html: string;
  sections_json: ProjectPage["sections"];
  status: ProjectPage["status"];
  error: string | null;
  sort_order: number;
  updated_at: string;
};

type FileRow = {
  id: string;
  project_id: string;
  linked_page_id: string | null;
  name: string;
  path: string;
  content: string;
  type: VirtualFile["type"];
  language: string;
  sort_order: number;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

const CONSTRAINT_CODES = new Set(["23502", "23503", "23505", "23514"]);

function buildDbError(
  error: unknown,
  fallbackCode: ErrorCode,
  devMessage: string,
  metadata?: Record<string, unknown>
) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  let code = fallbackCode;

  if (typeof maybe.code === "string" && CONSTRAINT_CODES.has(maybe.code)) {
    code = DB_WRITE_002;
  } else if (maybe.code === "PGRST202" || maybe.message?.includes("save_project_snapshot")) {
    code = DB_SCHEMA_001;
  }

  return createAppError({
    code,
    devMessage,
    severity: "error",
    metadata: {
      ...metadata,
      ...(maybe.code ? { dbCode: maybe.code } : {}),
      ...(maybe.details ? { dbDetails: maybe.details } : {}),
      ...(maybe.hint ? { dbHint: maybe.hint } : {}),
    },
    cause: error,
  });
}

const defaultEditorState: EditorState = {
  selectedPageId: null,
  selectedFileId: null,
  selectedSectionId: null,
  selectedNode: null,
  isCanvasEditing: false,
  leftPanelTab: "pages",
  rightPanelTab: "ai",
  previewMode: "preview",
  devicePreview: "desktop",
  isFullPreview: false,
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  leftPanelWidth: 220,
  rightPanelWidth: 280,
  visualEditMode: true,
};

function normalizeProject(project: Partial<Project>): Project {
  return {
    id: project.id ?? crypto.randomUUID(),
    name: project.name ?? "Untitled Project",
    brief: project.brief ?? {
      siteName: "",
      description: "",
      siteType: "",
      tone: "Professional",
      pages: [],
      features: "",
    },
    blueprint: project.blueprint ?? null,
    pages: Array.isArray(project.pages) ? project.pages : [],
    files: project.files && typeof project.files === "object" ? project.files : {},
    media: normalizeMediaAssets(project.media),
    createdAt: project.createdAt ?? new Date().toISOString(),
    updatedAt: project.updatedAt ?? new Date().toISOString(),
    status: project.status ?? "draft",
  };
}

function normalizePage(row: PageRow): ProjectPage {
  const name = row.name || "Page";
  const slug = row.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    id: row.id,
    name,
    slug,
    purpose: row.purpose || "",
    html: row.html || "",
    sections: Array.isArray(row.sections_json) ? row.sections_json : [],
    status: (["pending", "generating", "done", "error"].includes(row.status) ? row.status : "done") as ProjectPage["status"],
    error: row.error ?? undefined,
  };
}

function rowToSnapshot(projectRow: ProjectRow, pageRows: PageRow[], fileRows: FileRow[]): ProjectSnapshot {
  const extracted = extractMediaLibraryFromFileList(fileRows);
  const pages = [...pageRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(normalizePage);

  const files = Object.fromEntries(
    [...extracted.files]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => [
        row.id,
        {
          id: row.id,
          name: row.name,
          path: row.path,
          content: row.content,
          type: row.type,
          language: row.language,
        } satisfies VirtualFile,
      ])
  );

  return {
    project: normalizeProject({
      id: projectRow.id,
      name: projectRow.name,
      brief: projectRow.brief_json,
      blueprint: projectRow.blueprint_json,
      pages,
      files,
      media: extracted.media,
      createdAt: projectRow.created_at,
      updatedAt: projectRow.updated_at,
      status: projectRow.status,
    }),
    editorState: {
      ...defaultEditorState,
      ...(projectRow.editor_state_json ?? {}),
      visualEditMode: true,
    },
    aiChats: Array.isArray(projectRow.ai_chats_json) ? projectRow.ai_chats_json : [],
  };
}

async function saveProjectSnapshotLegacy(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  project: Project,
  editorState: EditorState,
  aiChats: AIChatMessage[],
  userId: string
) {
  const mediaFile = createMediaLibraryFile(project.media);
  const { error: projectError } = await supabase.from("projects").upsert({
    id: project.id,
    user_id: userId,
    name: project.name,
    brief_json: project.brief,
    blueprint_json: project.blueprint,
    status: project.status,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    editor_state_json: editorState,
    ai_chats_json: aiChats,
  });

  if (projectError) {
    throw buildDbError(projectError, DB_WRITE_001, `Legacy save failed while upserting project ${project.id}`, {
      projectId: project.id,
      userId,
      stage: "project-upsert",
    });
  }

  const { error: deletePagesError } = await supabase.from("pages").delete().eq("project_id", project.id);
  if (deletePagesError) {
    throw buildDbError(deletePagesError, DB_WRITE_003, `Legacy save failed while clearing pages for ${project.id}`, {
      projectId: project.id,
      userId,
      stage: "pages-delete",
    });
  }

  const { error: deleteFilesError } = await supabase.from("files").delete().eq("project_id", project.id);
  if (deleteFilesError) {
    throw buildDbError(deleteFilesError, DB_WRITE_003, `Legacy save failed while clearing files for ${project.id}`, {
      projectId: project.id,
      userId,
      stage: "files-delete",
    });
  }

  if (project.pages.length) {
    const { error: pagesError } = await supabase.from("pages").insert(
      project.pages.map((page, index) => ({
        id: page.id,
        project_id: project.id,
        name: page.name,
        slug: page.slug,
        purpose: page.purpose,
        html: page.html,
        sections_json: page.sections ?? [],
        status: page.status,
        error: page.error ?? null,
        sort_order: index,
        updated_at: project.updatedAt,
      }))
    );

    if (pagesError) {
      throw buildDbError(pagesError, DB_WRITE_003, `Legacy save failed while inserting pages for ${project.id}`, {
        projectId: project.id,
        userId,
        stage: "pages-insert",
        pageCount: project.pages.length,
      });
    }
  }

  const fileValues = [...Object.values(project.files), ...(mediaFile ? [mediaFile] : [])];
  if (fileValues.length) {
    const { error: filesError } = await supabase.from("files").insert(
      fileValues.map((file, index) => ({
        id: file.id,
        project_id: project.id,
        linked_page_id: project.pages.some((page) => page.id === file.id) ? file.id : null,
        name: file.name,
        path: file.path,
        content: file.content,
        type: file.type,
        language: file.language,
        sort_order: index,
      }))
    );

    if (filesError) {
      throw buildDbError(filesError, DB_WRITE_003, `Legacy save failed while inserting files for ${project.id}`, {
        projectId: project.id,
        userId,
        stage: "files-insert",
        fileCount: fileValues.length,
      });
    }
  }
}

export async function listProjects(userId: string): Promise<Project[]> {
  const supabase = getSupabaseServerClient();

  const { data: projectRows, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw buildDbError(error, DB_READ_001, `Failed to list projects for user ${userId}`, { userId });
  }

  const projects = (projectRows ?? []) as ProjectRow[];
  if (!projects.length) return [];

  const projectIds = projects.map((project) => project.id);

  const [{ data: pageRows, error: pagesError }, { data: fileRows, error: filesError }] = await Promise.all([
    supabase
      .from("pages")
      .select("*")
      .in("project_id", projectIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("files")
      .select("*")
      .in("project_id", projectIds)
      .order("sort_order", { ascending: true }),
  ]);

  if (pagesError) {
    throw buildDbError(pagesError, DB_READ_001, `Failed to load pages for listed projects`, { userId, projectIds });
  }
  if (filesError) {
    throw buildDbError(filesError, DB_READ_001, `Failed to load files for listed projects`, { userId, projectIds });
  }

  const pages = (pageRows ?? []) as PageRow[];
  const files = (fileRows ?? []) as FileRow[];

  return projects.map((projectRow) =>
    rowToSnapshot(
      projectRow,
      pages.filter((page) => page.project_id === projectRow.id),
      files.filter((file) => file.project_id === projectRow.id)
    ).project
  );
}

export async function getProjectSnapshot(projectId: string, userId: string): Promise<ProjectSnapshot | null> {
  const supabase = getSupabaseServerClient();

  const { data: projectRow, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw buildDbError(error, DB_READ_001, `Failed to load project ${projectId}`, { projectId, userId });
  }
  if (!projectRow) return null;

  const [{ data: pageRows, error: pagesError }, { data: fileRows, error: filesError }] = await Promise.all([
    supabase
      .from("pages")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("files")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
  ]);

  if (pagesError) {
    throw buildDbError(pagesError, DB_READ_001, `Failed to load pages for project ${projectId}`, { projectId, userId });
  }
  if (filesError) {
    throw buildDbError(filesError, DB_READ_001, `Failed to load files for project ${projectId}`, { projectId, userId });
  }
  return rowToSnapshot(projectRow as ProjectRow, (pageRows ?? []) as PageRow[], (fileRows ?? []) as FileRow[]);
}

export async function createDraftProject(project: Project, userId: string): Promise<ProjectSnapshot> {
  const supabase = getSupabaseServerClient();
  const normalized = normalizeProject(project);

  const { error } = await supabase.from("projects").insert({
    id: normalized.id,
    user_id: userId,
    name: normalized.name,
    brief_json: normalized.brief,
    blueprint_json: normalized.blueprint,
    status: normalized.status,
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
    editor_state_json: defaultEditorState,
    ai_chats_json: [],
  });

  if (error) {
    throw buildDbError(error, DB_WRITE_001, `Failed to create draft project ${normalized.id}`, {
      projectId: normalized.id,
      userId,
    });
  }

  return {
    project: normalized,
    editorState: defaultEditorState,
    aiChats: [],
  };
}

export async function saveProjectSnapshot(snapshot: ProjectSnapshot, userId: string): Promise<ProjectSnapshot> {
  const supabase = getSupabaseServerClient();
  const project = normalizeProject(snapshot.project);
  const editorState = { ...defaultEditorState, ...snapshot.editorState };
  const aiChats = Array.isArray(snapshot.aiChats) ? snapshot.aiChats : [];
  const mediaFile = createMediaLibraryFile(project.media);
  const { error } = await supabase.rpc("save_project_snapshot", {
    p_project: {
      id: project.id,
      name: project.name,
      brief_json: project.brief,
      blueprint_json: project.blueprint,
      status: project.status,
      created_at: project.createdAt,
      updated_at: project.updatedAt,
    },
    p_editor_state: editorState,
    p_ai_chats: aiChats,
    p_pages: project.pages.map((page, index) => ({
      id: page.id,
      name: page.name,
      slug: page.slug,
      purpose: page.purpose,
      html: page.html,
      sections_json: page.sections ?? [],
      status: page.status,
      error: page.error ?? null,
      sort_order: index,
      updated_at: project.updatedAt,
    })),
    p_files: [...Object.values(project.files), ...(mediaFile ? [mediaFile] : [])].map((file, index) => ({
      id: file.id,
      linked_page_id: project.pages.some((page) => page.id === file.id) ? file.id : null,
      name: file.name,
      path: file.path,
      content: file.content,
      type: file.type,
      language: file.language,
      sort_order: index,
    })),
  });

  if (error) {
    const maybe = error as SupabaseErrorLike;
    const schemaMissing = maybe.code === "PGRST202" || maybe.message?.includes("save_project_snapshot");

    if (!schemaMissing) {
      throw buildDbError(error, DB_WRITE_003, `Transactional save failed for project ${project.id}`, {
        projectId: project.id,
        userId,
        pageCount: project.pages.length,
        fileCount: Object.keys(project.files).length,
      });
    }

    await saveProjectSnapshotLegacy(supabase, project, editorState, aiChats, userId);
  }

  return {
    project,
    editorState,
    aiChats,
  };
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId).eq("user_id", userId);
  if (error) {
    throw buildDbError(error, DB_DELETE_001, `Failed to delete project ${projectId}`, { projectId, userId });
  }
}
