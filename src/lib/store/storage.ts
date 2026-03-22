/**
 * Sitezy IndexedDB storage for Zustand persist.
 *
 * Projects, chats, metadata, and page HTML all live in IndexedDB so project
 * data no longer depends on localStorage quotas. A legacy localStorage snapshot
 * is still read once for migration.
 */
import { StateStorage } from "zustand/middleware";

const DB_NAME = "sitezy-db";
const DB_VERSION = 2;
const APP_STORE = "app";
const PAGE_STORE = "pages";
const LEGACY_STORAGE_KEY = "sitezy-store-v3";
const BACKUP_SUFFIX = "__backup";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(APP_STORE)) db.createObjectStore(APP_STORE);
      if (!db.objectStoreNames.contains(PAGE_STORE)) db.createObjectStore(PAGE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(storeName: string, key: string): Promise<unknown> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAllKeys(storeName: string): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAllKeys();
    req.onsuccess = () => resolve((req.result ?? []).map(String));
    req.onerror = () => reject(req.error);
  });
}

function stripHtml(state: unknown): unknown {
  if (!state || typeof state !== "object") return state;
  const s = state as Record<string, unknown>;
  if (!Array.isArray(s.projects)) return state;

  return {
    ...s,
    projects: (s.projects as Array<Record<string, unknown>>).map((project) => {
      const files =
        project.files && typeof project.files === "object"
          ? Object.fromEntries(
              Object.entries(project.files as Record<string, Record<string, unknown>>).map(([fileId, file]) => [
                fileId,
                file?.type === "html"
                  ? { ...file, content: "" }
                  : file,
              ])
            )
          : {};

      return {
        ...project,
        pages: Array.isArray(project.pages)
          ? (project.pages as Array<Record<string, unknown>>).map((page) => ({
              ...page,
              html: "",
            }))
          : project.pages,
        files,
      };
    }),
  };
}

async function persistHtml(state: unknown): Promise<void> {
  if (!state || typeof state !== "object") return;
  const s = state as Record<string, unknown>;
  if (!Array.isArray(s.projects)) return;

  const activeKeys = new Set<string>();

  for (const project of s.projects as Array<Record<string, unknown>>) {
    const projectId = String(project.id ?? "");
    if (!projectId || !Array.isArray(project.pages)) continue;

    for (const page of project.pages as Array<Record<string, unknown>>) {
      const pageId = String(page.id ?? "");
      if (!pageId) continue;
      const key = `${projectId}:${pageId}`;
      activeKeys.add(key);
      await idbPut(PAGE_STORE, key, String(page.html ?? ""));
    }
  }

  const existingKeys = await idbGetAllKeys(PAGE_STORE);
  await Promise.all(
    existingKeys
      .filter((key) => !activeKeys.has(key))
      .map((key) => idbDelete(PAGE_STORE, key))
  );
}

async function restoreHtml(state: unknown): Promise<unknown> {
  if (!state || typeof state !== "object") return state;
  const s = state as Record<string, unknown>;
  if (!Array.isArray(s.projects)) return state;

  const projects = await Promise.all(
    (s.projects as Array<Record<string, unknown>>).map(async (project) => {
      const projectId = String(project.id ?? "");
      const pages = Array.isArray(project.pages) ? (project.pages as Array<Record<string, unknown>>) : [];
      const files =
        project.files && typeof project.files === "object"
          ? { ...(project.files as Record<string, Record<string, unknown>>) }
          : {};

      const hydratedPages = await Promise.all(
        pages.map(async (page) => {
          const pageId = String(page.id ?? "");
          if (!projectId || !pageId) return page;
          const html = await idbGet(PAGE_STORE, `${projectId}:${pageId}`).catch(() => null);
          const restoredHtml = typeof html === "string" ? html : String(page.html ?? "");

          if (files[pageId]) {
            files[pageId] = { ...files[pageId], content: restoredHtml };
          }

          return { ...page, html: restoredHtml };
        })
      );

      return { ...project, pages: hydratedPages, files };
    })
  );

  return { ...s, projects };
}

function readLegacySnapshot(name: string): unknown | null {
  try {
    const raw = localStorage.getItem(name);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalSnapshot(name: string, value: unknown): void {
  try {
    localStorage.setItem(name, JSON.stringify(value));
  } catch {}
}

function removeLocalSnapshot(name: string): void {
  try {
    localStorage.removeItem(name);
  } catch {}
}

function getBackupKey(name: string): string {
  return `${name}${BACKUP_SUFFIX}`;
}

export const sitezyStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const stored = await idbGet(APP_STORE, name);
      if (stored && typeof stored === "object") {
        const parsed = stored as Record<string, unknown>;
        if (parsed.state) parsed.state = await restoreHtml(parsed.state);
        return JSON.stringify(parsed);
      }

      const legacy =
        readLegacySnapshot(getBackupKey(name)) ??
        readLegacySnapshot(name) ??
        (name === LEGACY_STORAGE_KEY ? readLegacySnapshot("sitezy-store-v2") : null);
      if (!legacy || typeof legacy !== "object") return null;

      const parsed = legacy as Record<string, unknown>;
      if (parsed.state) {
        parsed.state = await restoreHtml(parsed.state);
        await idbPut(APP_STORE, name, stripHtml(parsed));
        writeLocalSnapshot(getBackupKey(name), stripHtml(parsed));
      }
      return JSON.stringify(parsed);
    } catch {
      const backup = readLegacySnapshot(getBackupKey(name)) ?? readLegacySnapshot(name);
      if (!backup || typeof backup !== "object") return null;
      const parsed = backup as Record<string, unknown>;
      if (parsed.state) {
        parsed.state = await restoreHtml(parsed.state);
      }
      return JSON.stringify(parsed);
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value);
      if (parsed?.state) {
        await persistHtml(parsed.state);
        const stripped = stripHtml(parsed);
        await idbPut(APP_STORE, name, stripped);
        writeLocalSnapshot(getBackupKey(name), stripped);
      } else {
        await idbPut(APP_STORE, name, parsed);
        writeLocalSnapshot(getBackupKey(name), parsed);
      }
    } catch {
      try {
        const parsed = JSON.parse(value);
        writeLocalSnapshot(getBackupKey(name), parsed?.state ? stripHtml(parsed) : parsed);
      } catch {}
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await idbDelete(APP_STORE, name);
      removeLocalSnapshot(name);
      removeLocalSnapshot(getBackupKey(name));
    } catch {}
  },
};
