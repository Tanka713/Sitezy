import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type { AIChatMessage, EditorState, Project, ProjectPage, VirtualFile, SiteBrief } from "@/types";

type Statement = {
  run: (...params: unknown[]) => unknown;
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
};

type DatabaseSyncLike = {
  exec: (sql: string) => void;
  prepare: (sql: string) => Statement;
};

type DatabaseSyncCtor = new (path: string) => DatabaseSyncLike;

const require = createRequire(import.meta.url);
const DatabaseSync = (require("node:sqlite") as { DatabaseSync: DatabaseSyncCtor }).DatabaseSync;

export interface ProjectSnapshot {
  project: Project;
  editorState: EditorState;
  aiChats: AIChatMessage[];
}

type ProjectRow = {
  id: string;
  name: string;
  brief_json: string;
  blueprint_json: string | null;
  status: Project["status"];
  created_at: string;
  updated_at: string;
  editor_state_json: string | null;
  ai_chats_json: string | null;
};

type PageRow = {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  purpose: string;
  html: string;
  sections_json: string;
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

const DB_DIR = path.join(process.cwd(), ".sitezy");
const DB_PATH = path.join(DB_DIR, "sitezy.db");

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

// ─── Schema Migration Framework ───────────────────────────────────────────────
// Each migration has a unique integer version. Migrations are idempotent —
// adding a migration for a column that already exists will simply be skipped.
// New fields in EditorState / JSON blobs do NOT require a DB migration because
// they are stored as JSON and are merged with defaults on read.

type MigrationEntry = { version: number; up: (db: DatabaseSyncLike) => void };

const MIGRATIONS: MigrationEntry[] = [
  // v1: initial schema — no ALTER needed, handled in ensureDb CREATE TABLE.
  // Add future migrations here as the schema evolves, e.g.:
  // { version: 2, up: (db) => db.exec("ALTER TABLE projects ADD COLUMN thumbnail TEXT") },
];

function runMigrations(db: DatabaseSyncLike): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  type MigRow = { version: number };
  const applied = new Set(
    (db.prepare("SELECT version FROM schema_migrations").all() as MigRow[]).map((r) => r.version)
  );

  for (const mig of MIGRATIONS) {
    if (applied.has(mig.version)) continue;
    try {
      db.exec("BEGIN");
      mig.up(db);
      db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(mig.version);
      db.exec("COMMIT");
    } catch (err) {
      try { db.exec("ROLLBACK"); } catch {}
      console.warn(`[sitezy-db] Migration v${mig.version} failed:`, err);
    }
  }
}

function ensureDb(): DatabaseSyncLike {
  fs.mkdirSync(DB_DIR, { recursive: true });

  const globalDb = globalThis as typeof globalThis & { __sitezyDb?: DatabaseSyncLike };
  if (globalDb.__sitezyDb) return globalDb.__sitezyDb;

  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brief_json TEXT NOT NULL,
      blueprint_json TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      editor_state_json TEXT,
      ai_chats_json TEXT
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      purpose TEXT NOT NULL,
      html TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      sort_order INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pages_project_id ON pages(project_id, sort_order);

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      linked_page_id TEXT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      language TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id, sort_order);
  `);

  // Run any pending schema migrations
  runMigrations(db);

  globalDb.__sitezyDb = db;
  return db;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeProject(project: Partial<Project>): Project {
  return {
    id: project.id ?? crypto.randomUUID(),
    name: project.name ?? "Untitled Project",
    brief: project.brief ?? { siteName: "", description: "", siteType: "", tone: "Professional", pages: [], features: "" },
    blueprint: project.blueprint ?? null,
    pages: Array.isArray(project.pages) ? project.pages : [],
    files: project.files && typeof project.files === "object" ? project.files : {},
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
    sections: parseJson(row.sections_json, []),
    status: (["pending","generating","done","error"].includes(row.status) ? row.status : "done") as ProjectPage["status"],
    error: row.error ?? undefined,
  };
}

function rowToSnapshot(projectRow: ProjectRow, pageRows: PageRow[], fileRows: FileRow[]): ProjectSnapshot {
  const pages: ProjectPage[] = pageRows
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(normalizePage);

  const files = Object.fromEntries(
    fileRows
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
      brief: parseJson(projectRow.brief_json, {
        siteName: "",
        description: "",
        siteType: "",
        tone: "Professional",
        pages: [],
        features: "",
      } as SiteBrief),
      blueprint: parseJson(projectRow.blueprint_json, null),
      pages,
      files,
      createdAt: projectRow.created_at,
      updatedAt: projectRow.updated_at,
      status: projectRow.status,
    }),
    editorState: {
      ...defaultEditorState,
      ...parseJson(projectRow.editor_state_json, {}),
      visualEditMode: true, // always on — canvas is always editable
    },
    aiChats: parseJson(projectRow.ai_chats_json, []),
  };
}

export function listProjects(): Project[] {
  const db = ensureDb();
  const projectRows = db.prepare(`
    SELECT id, name, brief_json, blueprint_json, status, created_at, updated_at, editor_state_json, ai_chats_json
    FROM projects
    ORDER BY updated_at DESC
  `).all() as ProjectRow[];

  const pageStmt = db.prepare(`
    SELECT id, project_id, name, slug, purpose, html, sections_json, status, error, sort_order, updated_at
    FROM pages
    WHERE project_id = ?
    ORDER BY sort_order ASC
  `);

  const fileStmt = db.prepare(`
    SELECT id, project_id, linked_page_id, name, path, content, type, language, sort_order
    FROM files
    WHERE project_id = ?
    ORDER BY sort_order ASC
  `);

  return projectRows.map((projectRow) =>
    rowToSnapshot(
      projectRow,
      pageStmt.all(projectRow.id) as PageRow[],
      fileStmt.all(projectRow.id) as FileRow[]
    ).project
  );
}

export function getProjectSnapshot(projectId: string): ProjectSnapshot | null {
  const db = ensureDb();
  const projectRow = db.prepare(`
    SELECT id, name, brief_json, blueprint_json, status, created_at, updated_at, editor_state_json, ai_chats_json
    FROM projects
    WHERE id = ?
  `).get(projectId) as ProjectRow | undefined;

  if (!projectRow) return null;

  const pageRows = db.prepare(`
    SELECT id, project_id, name, slug, purpose, html, sections_json, status, error, sort_order, updated_at
    FROM pages
    WHERE project_id = ?
    ORDER BY sort_order ASC
  `).all(projectId) as PageRow[];

  const fileRows = db.prepare(`
    SELECT id, project_id, linked_page_id, name, path, content, type, language, sort_order
    FROM files
    WHERE project_id = ?
    ORDER BY sort_order ASC
  `).all(projectId) as FileRow[];

  return rowToSnapshot(projectRow, pageRows, fileRows);
}

export function createDraftProject(project: Project): ProjectSnapshot {
  const db = ensureDb();
  const normalized = normalizeProject(project);

  db.prepare(`
    INSERT INTO projects (
      id, name, brief_json, blueprint_json, status, created_at, updated_at, editor_state_json, ai_chats_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    normalized.id,
    normalized.name,
    JSON.stringify(normalized.brief),
    normalized.blueprint ? JSON.stringify(normalized.blueprint) : null,
    normalized.status,
    normalized.createdAt,
    normalized.updatedAt,
    JSON.stringify(defaultEditorState),
    JSON.stringify([])
  );

  return {
    project: normalized,
    editorState: defaultEditorState,
    aiChats: [],
  };
}

export function saveProjectSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  const db = ensureDb();
  const project = normalizeProject(snapshot.project);
  const editorState = { ...defaultEditorState, ...snapshot.editorState };
  const aiChats = Array.isArray(snapshot.aiChats) ? snapshot.aiChats : [];

  db.exec("BEGIN");
  try {
    db.prepare(`
      INSERT INTO projects (
        id, name, brief_json, blueprint_json, status, created_at, updated_at, editor_state_json, ai_chats_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        brief_json = excluded.brief_json,
        blueprint_json = excluded.blueprint_json,
        status = excluded.status,
        updated_at = excluded.updated_at,
        editor_state_json = excluded.editor_state_json,
        ai_chats_json = excluded.ai_chats_json
    `).run(
      project.id,
      project.name,
      JSON.stringify(project.brief),
      project.blueprint ? JSON.stringify(project.blueprint) : null,
      project.status,
      project.createdAt,
      project.updatedAt,
      JSON.stringify(editorState),
      JSON.stringify(aiChats)
    );

    db.prepare(`DELETE FROM pages WHERE project_id = ?`).run(project.id);
    db.prepare(`DELETE FROM files WHERE project_id = ?`).run(project.id);

    const insertPage = db.prepare(`
      INSERT INTO pages (
        id, project_id, name, slug, purpose, html, sections_json, status, error, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertFile = db.prepare(`
      INSERT INTO files (
        id, project_id, linked_page_id, name, path, content, type, language, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    project.pages.forEach((page, index) => {
      insertPage.run(
        page.id,
        project.id,
        page.name,
        page.slug,
        page.purpose,
        page.html,
        JSON.stringify(page.sections ?? []),
        page.status,
        page.error ?? null,
        index,
        project.updatedAt
      );
    });

    Object.values(project.files).forEach((file, index) => {
      insertFile.run(
        file.id,
        project.id,
        project.pages.some((page) => page.id === file.id) ? file.id : null,
        file.name,
        file.path,
        file.content,
        file.type,
        file.language,
        index
      );
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    project,
    editorState,
    aiChats,
  };
}

export function deleteProject(projectId: string): void {
  const db = ensureDb();
  db.prepare(`DELETE FROM projects WHERE id = ?`).run(projectId);
}
