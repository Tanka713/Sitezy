import type {
  AIChatMessage,
  EditorState,
  Project,
  ProjectGenerationJob,
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
import {
  getActiveGenerationJobForProject,
  listLatestActiveGenerationJobs,
} from "@/lib/server/project-generation-jobs";
import {
  getPublishedSiteForProject,
  listPublishedSitesForProjects,
} from "@/lib/server/project-publishing";
import { normalizeProjectSeo } from "@/lib/seo";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DB_DELETE_001,
  DB_READ_001,
  DB_SCHEMA_001,
  DB_WRITE_001,
  DB_WRITE_002,
  DB_WRITE_003,
  createAppError,
  isAppError,
  type ErrorCode,
} from "@/lib/errors";

type ProjectRow = {
  id: string;
  user_id: string | null;
  name: string;
  brief_json: SiteBrief;
  blueprint_json: SiteBlueprint | null;
  seo_json: Project["seo"] | null;
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

function isSeoSchemaMissing(error: unknown) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  return (
    maybe.code === "42703" ||
    maybe.message?.includes("seo_json") ||
    maybe.details?.includes("seo_json") ||
    maybe.hint?.includes("seo_json")
  );
}

function getProjectDbClient(options?: { admin?: boolean }) {
  return options?.admin ? getSupabaseAdminClient() : getSupabaseServerClient();
}

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

async function safeListPublishedSitesForProjects(projectIds: string[], userId: string) {
  try {
    return await listPublishedSitesForProjects(projectIds, userId);
  } catch (error) {
    if (isAppError(error) && error.code === DB_SCHEMA_001) {
      return new Map();
    }
    throw error;
  }
}

async function safeGetPublishedSiteForProject(
  projectId: string,
  userId: string,
  options?: { admin?: boolean }
) {
  try {
    return await getPublishedSiteForProject(projectId, userId, options);
  } catch (error) {
    if (isAppError(error) && error.code === DB_SCHEMA_001) {
      return null;
    }
    throw error;
  }
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
  canvasZoom: 1,
  canvasPanX: 0,
  canvasPanY: 0,
  canvasGridVisible: false,
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
    seo: normalizeProjectSeo(project.seo, project),
    pages: Array.isArray(project.pages) ? project.pages : [],
    files: project.files && typeof project.files === "object" ? project.files : {},
    media: normalizeMediaAssets(project.media),
    createdAt: project.createdAt ?? new Date().toISOString(),
    updatedAt: project.updatedAt ?? new Date().toISOString(),
    status: project.status ?? "draft",
    generationJob: project.generationJob ?? null,
    publishedSite: project.publishedSite ?? null,
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

function canonicalizeProjectPages(projectId: string, pages: ProjectPage[]): ProjectPage[] {
  const usedIds = new Set<string>();
  const usedSlugs = new Set<string>();

  return pages.map((page, index) => {
    const normalized = normalizePage({
      id: page.id,
      project_id: "",
      name: page.name,
      slug: page.slug,
      purpose: page.purpose,
      html: page.html,
      sections_json: page.sections,
      status: page.status,
      error: page.error ?? null,
      sort_order: index,
      updated_at: new Date().toISOString(),
    });
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
        content: page.html || "",
        type: "html",
        language: "html",
      },
      page.id
    );
  }

  return files;
}

function rowToSnapshot(
  projectRow: ProjectRow,
  pageRows: PageRow[],
  fileRows: FileRow[],
  generationJob: ProjectGenerationJob | null = null,
  publishedSite: Project["publishedSite"] = null
): ProjectSnapshot {
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
      seo: projectRow.seo_json ?? undefined,
      pages,
      files,
      media: extracted.media,
      createdAt: projectRow.created_at,
      updatedAt: projectRow.updated_at,
      status: projectRow.status,
      generationJob,
      publishedSite,
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
  const projectPayload = {
    id: project.id,
    user_id: userId,
    name: project.name,
    brief_json: project.brief,
    blueprint_json: project.blueprint,
    seo_json: project.seo,
    status: project.status,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    editor_state_json: editorState,
    ai_chats_json: aiChats,
  };
  let { error: projectError } = await supabase.from("projects").upsert(projectPayload);

  if (projectError && isSeoSchemaMissing(projectError)) {
    const { seo_json: _seoJson, ...legacyPayload } = projectPayload;
    ({ error: projectError } = await supabase.from("projects").upsert(legacyPayload));
  }

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
  const { data: pageRows, error: pagesError } = await supabase
    .from("pages")
    .select("id, project_id, name, slug, purpose, status")
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true });

  if (pagesError) {
    throw buildDbError(pagesError, DB_READ_001, `Failed to load pages for listed projects`, { userId, projectIds });
  }

  const pages = (pageRows ?? []) as Array<Pick<PageRow, "id" | "project_id" | "name" | "slug" | "purpose" | "status">>;
  const activeJobs = await listLatestActiveGenerationJobs(projectIds);
  const publishedSites = await safeListPublishedSitesForProjects(projectIds, userId);

  return projects.map((projectRow) =>
    normalizeProject({
      id: projectRow.id,
      name: projectRow.name,
      brief: projectRow.brief_json,
      blueprint: projectRow.blueprint_json,
      seo: projectRow.seo_json ?? undefined,
      pages: pages
        .filter((page) => page.project_id === projectRow.id)
        .map((page) => ({
          id: page.id,
          name: page.name || "Page",
          slug: page.slug || "",
          purpose: page.purpose || "",
          html: "",
          sections: [],
          status: (["pending", "generating", "done", "error"].includes(page.status) ? page.status : "done") as ProjectPage["status"],
          error: undefined,
        })),
      files: {},
      media: [],
      createdAt: projectRow.created_at,
      updatedAt: projectRow.updated_at,
      status: projectRow.status,
      generationJob: activeJobs.get(projectRow.id) ?? null,
      publishedSite: publishedSites.get(projectRow.id) ?? null,
    })
  );
}

export async function getProjectSnapshot(
  projectId: string,
  userId: string,
  options?: { admin?: boolean }
): Promise<ProjectSnapshot | null> {
  const supabase = getProjectDbClient(options);

  const projectQuery = supabase.from("projects").select("*").eq("id", projectId);
  if (!options?.admin) {
    projectQuery.eq("user_id", userId);
  }

  const { data: projectRow, error } = await projectQuery.maybeSingle();

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
  const [generationJob, publishedSite] = await Promise.all([
    getActiveGenerationJobForProject(projectId, options),
    safeGetPublishedSiteForProject(projectId, userId, options),
  ]);
  return rowToSnapshot(
    projectRow as ProjectRow,
    (pageRows ?? []) as PageRow[],
    (fileRows ?? []) as FileRow[],
    generationJob,
    publishedSite
  );
}

export async function createDraftProject(
  project: Project,
  userId: string,
  options?: { admin?: boolean }
): Promise<ProjectSnapshot> {
  const supabase = getProjectDbClient(options);
  const normalized = normalizeProject(project);

  const projectPayload = {
    id: normalized.id,
    user_id: userId,
    name: normalized.name,
    brief_json: normalized.brief,
    blueprint_json: normalized.blueprint,
    seo_json: normalized.seo,
    status: normalized.status,
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
    editor_state_json: defaultEditorState,
    ai_chats_json: [],
  };
  let { error } = await supabase.from("projects").insert(projectPayload);

  if (error && isSeoSchemaMissing(error)) {
    const { seo_json: _seoJson, ...legacyPayload } = projectPayload;
    ({ error } = await supabase.from("projects").insert(legacyPayload));
  }

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

export async function saveProjectSnapshot(
  snapshot: ProjectSnapshot,
  userId: string,
  options?: { admin?: boolean }
): Promise<ProjectSnapshot> {
  const supabase = getProjectDbClient(options);
  const baseProject = normalizeProject(snapshot.project);
  const pages = canonicalizeProjectPages(baseProject.id, baseProject.pages);
  const project = normalizeProject({
    ...baseProject,
    pages,
    files: canonicalizeProjectFiles(baseProject, pages),
  });
  const editorState = { ...defaultEditorState, ...snapshot.editorState };
  const aiChats = Array.isArray(snapshot.aiChats) ? snapshot.aiChats : [];
  const mediaFile = createMediaLibraryFile(project.media);

  if (options?.admin) {
    await saveProjectSnapshotLegacy(supabase, project, editorState, aiChats, userId);
    return {
      project,
      editorState,
      aiChats,
    };
  }

  const { error } = await supabase.rpc("save_project_snapshot", {
    p_project: {
      id: project.id,
      name: project.name,
      brief_json: project.brief,
      blueprint_json: project.blueprint,
      seo_json: project.seo,
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
