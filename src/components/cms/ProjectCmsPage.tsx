"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenText, Database, FilePlus2, Globe2, Loader2, PencilLine, Plus, Save, ShieldAlert, Trash2 } from "lucide-react";
import { CMS_PRESET_TEMPLATES } from "@/lib/cms/presets";
import { API_UNKNOWN_001, createAppError, normalizeError, type ErrorCode } from "@/lib/errors";
import { formatDate } from "@/lib/utils";
import { resolvePublishedHref } from "@/lib/publishing";
import { SitezyBadge, SitezyButton, SitezyCard, SitezyInput, SitezyPanel, SitezyTextarea } from "@/components/ui/sitezy";
import type {
  CmsCollection,
  CmsCollectionPreset,
  CmsEntryStatus,
  CmsFieldType,
  Project,
} from "@/types";

type BannerState =
  | {
      kind: "success";
      message: string;
      code?: null;
    }
  | {
      kind: "error";
      message: string;
      code: string;
    }
  | null;

type FieldDraft = {
  label: string;
  type: CmsFieldType;
  required: boolean;
};

type EntryDraft = {
  title: string;
  slug: string;
  status: CmsEntryStatus;
  values: Record<string, string>;
};

function slugifyToken(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function buildEntryDraft(collection: CmsCollection | null, entryId: string | null): EntryDraft | null {
  if (!collection || !entryId) return null;
  const entry = collection.entries.find((candidate) => candidate.id === entryId);
  if (!entry) return null;

  return {
    title: entry.title,
    slug: entry.slug,
    status: entry.status,
    values: Object.fromEntries(
      collection.fields.map((field) => [field.key, entry.values[field.key] ?? ""])
    ),
  };
}

async function cmsJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    requestId?: string | null;
  } & T;

  if (!res.ok) {
    throw createAppError({
      code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
      devMessage: `CMS request failed (${res.status}) for ${url}`,
      userMessage: data.error ?? "We couldn't complete that CMS action right now.",
      severity: "error",
      metadata: {
        path: url,
        status: res.status,
        requestId: data.requestId ?? null,
      },
    });
  }

  return data;
}

export function ProjectCmsPage({
  project,
  initialCollections,
  storageReady,
}: {
  project: Project;
  initialCollections: CmsCollection[];
  storageReady: boolean;
}) {
  const [collections, setCollections] = useState(initialCollections);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(initialCollections[0]?.id ?? null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(initialCollections[0]?.entries[0]?.id ?? null);
  const [banner, setBanner] = useState<BannerState>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [collectionPreset, setCollectionPreset] = useState<CmsCollectionPreset>("blog_posts");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CmsFieldType>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [collectionDraft, setCollectionDraft] = useState({ name: "", slug: "" });
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, FieldDraft>>({});
  const [entryDraft, setEntryDraft] = useState<EntryDraft | null>(null);

  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.id === selectedCollectionId) ?? null,
    [collections, selectedCollectionId]
  );
  const selectedEntry = useMemo(
    () => selectedCollection?.entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [selectedCollection, selectedEntryId]
  );

  useEffect(() => {
    if (!collections.length) {
      setSelectedCollectionId(null);
      setSelectedEntryId(null);
      return;
    }

    if (!selectedCollectionId || !collections.some((collection) => collection.id === selectedCollectionId)) {
      setSelectedCollectionId(collections[0].id);
      setSelectedEntryId(collections[0].entries[0]?.id ?? null);
    }
  }, [collections, selectedCollectionId]);

  useEffect(() => {
    if (!selectedCollection) {
      setCollectionDraft({ name: "", slug: "" });
      setFieldDrafts({});
      setEntryDraft(null);
      return;
    }

    setCollectionDraft({
      name: selectedCollection.name,
      slug: selectedCollection.slug,
    });
    setFieldDrafts(
      Object.fromEntries(
        selectedCollection.fields.map((field) => [
          field.id,
          {
            label: field.label,
            type: field.type,
            required: field.required,
          },
        ])
      )
    );

    if (!selectedEntryId || !selectedCollection.entries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(selectedCollection.entries[0]?.id ?? null);
      return;
    }

    setEntryDraft(buildEntryDraft(selectedCollection, selectedEntryId));
  }, [selectedCollection, selectedEntryId]);

  useEffect(() => {
    if (!selectedCollection) {
      setEntryDraft(null);
      return;
    }
    setEntryDraft(buildEntryDraft(selectedCollection, selectedEntryId));
  }, [selectedCollection, selectedEntryId]);

  async function reloadCollections(preferredCollectionId?: string | null, preferredEntryId?: string | null) {
    const data = await cmsJson<{ collections: CmsCollection[]; storageReady: boolean }>(
      `/api/projects/${project.id}/cms/collections`
    );
    setCollections(data.collections ?? []);

    const nextCollectionId =
      preferredCollectionId && data.collections.some((collection) => collection.id === preferredCollectionId)
        ? preferredCollectionId
        : data.collections[0]?.id ?? null;
    const nextCollection =
      data.collections.find((collection) => collection.id === nextCollectionId) ?? null;
    const nextEntryId =
      preferredEntryId && nextCollection?.entries.some((entry) => entry.id === preferredEntryId)
        ? preferredEntryId
        : nextCollection?.entries[0]?.id ?? null;

    setSelectedCollectionId(nextCollectionId);
    setSelectedEntryId(nextEntryId);
  }

  async function runAction(
    actionKey: string,
    work: () => Promise<void>,
    successMessage: string
  ) {
    setBusyAction(actionKey);
    setBanner(null);
    try {
      await work();
      setBanner({ kind: "success", message: successMessage, code: null });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: actionKey, projectId: project.id });
      setBanner({
        kind: "error",
        message: appErr.userMessage,
        code: appErr.code,
      });
    } finally {
      setBusyAction(null);
    }
  }

  function handleBackToWorkspace() {
    window.location.assign("/studio");
  }

  function handleOpenLive() {
    const subdomain = project.publishedSite?.subdomain;
    if (!subdomain) return;
    window.open(resolvePublishedHref(subdomain), "_blank", "noopener");
  }

  async function handleCreateCollection() {
    const name = collectionName.trim();
    if (!name) {
      setBanner({
        kind: "error",
        message: "Add a collection name before creating it.",
        code: "VALIDATION_INPUT_001",
      });
      return;
    }

    await runAction(
      "createCmsCollection",
      async () => {
        const data = await cmsJson<{ collection?: CmsCollection | null }>(`/api/projects/${project.id}/cms/collections`, {
          method: "POST",
          body: JSON.stringify({
            name,
            preset: collectionPreset,
          }),
        });
        setCollectionName("");
        const nextCollectionId = data.collection?.id ?? null;
        await reloadCollections(nextCollectionId);
      },
      "Collection created."
    );
  }

  async function handleSaveCollection() {
    if (!selectedCollection) return;
    await runAction(
      "updateCmsCollection",
      async () => {
        await cmsJson(`/api/projects/${project.id}/cms/collections/${selectedCollection.id}`, {
          method: "PATCH",
          body: JSON.stringify(collectionDraft),
        });
        await reloadCollections(selectedCollection.id, selectedEntryId);
      },
      "Collection updated."
    );
  }

  async function handleDeleteCollection() {
    if (!selectedCollection) return;
    const confirmed = window.confirm(`Delete "${selectedCollection.name}" and all of its entries?`);
    if (!confirmed) return;

    await runAction(
      "deleteCmsCollection",
      async () => {
        await cmsJson(`/api/projects/${project.id}/cms/collections/${selectedCollection.id}`, {
          method: "DELETE",
        });
        await reloadCollections();
      },
      "Collection deleted."
    );
  }

  async function handleAddField() {
    if (!selectedCollection) return;
    const label = newFieldLabel.trim();
    if (!label) {
      setBanner({
        kind: "error",
        message: "Add a field label before creating it.",
        code: "VALIDATION_INPUT_001",
      });
      return;
    }

    await runAction(
      "createCmsField",
      async () => {
        await cmsJson(`/api/projects/${project.id}/cms/collections/${selectedCollection.id}/fields`, {
          method: "POST",
          body: JSON.stringify({
            label,
            type: newFieldType,
            required: newFieldRequired,
          }),
        });
        setNewFieldLabel("");
        setNewFieldType("text");
        setNewFieldRequired(false);
        await reloadCollections(selectedCollection.id, selectedEntryId);
      },
      "Field added."
    );
  }

  async function handleSaveField(fieldId: string) {
    const draft = fieldDrafts[fieldId];
    if (!draft) return;

    await runAction(
      `updateCmsField:${fieldId}`,
      async () => {
        await cmsJson(`/api/projects/${project.id}/cms/fields/${fieldId}`, {
          method: "PATCH",
          body: JSON.stringify(draft),
        });
        await reloadCollections(selectedCollectionId, selectedEntryId);
      },
      "Field updated."
    );
  }

  async function handleDeleteField(fieldId: string) {
    const confirmed = window.confirm("Delete this field from the collection?");
    if (!confirmed) return;

    await runAction(
      `deleteCmsField:${fieldId}`,
      async () => {
        await cmsJson(`/api/projects/${project.id}/cms/fields/${fieldId}`, {
          method: "DELETE",
        });
        await reloadCollections(selectedCollectionId, selectedEntryId);
      },
      "Field removed."
    );
  }

  async function handleCreateEntry() {
    if (!selectedCollection) return;

    await runAction(
      "createCmsEntry",
      async () => {
        const baseTitle = selectedCollection.preset === "faq_items" ? "New question" : "New entry";
        const data = await cmsJson<{ entry?: { id: string } | null }>(
          `/api/projects/${project.id}/cms/collections/${selectedCollection.id}/entries`,
          {
            method: "POST",
            body: JSON.stringify({
              title: baseTitle,
              status: "draft",
            }),
          }
        );
        await reloadCollections(selectedCollection.id, data.entry?.id ?? null);
      },
      "Entry created."
    );
  }

  async function handleSaveEntry() {
    if (!selectedCollection || !selectedEntry || !entryDraft) return;

    await runAction(
      "updateCmsEntry",
      async () => {
        await cmsJson(`/api/projects/${project.id}/cms/entries/${selectedEntry.id}`, {
          method: "PATCH",
          body: JSON.stringify(entryDraft),
        });
        await reloadCollections(selectedCollection.id, selectedEntry.id);
      },
      "Entry updated."
    );
  }

  async function handleDeleteEntry() {
    if (!selectedCollection || !selectedEntry) return;
    const confirmed = window.confirm(`Delete "${selectedEntry.title}"?`);
    if (!confirmed) return;

    await runAction(
      "deleteCmsEntry",
      async () => {
        await cmsJson(`/api/projects/${project.id}/cms/entries/${selectedEntry.id}`, {
          method: "DELETE",
        });
        await reloadCollections(selectedCollection.id, null);
      },
      "Entry deleted."
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-shell)] text-[var(--text-primary)]">
      <div className="sz-topbar px-4">
        <div className="mx-auto flex h-[60px] w-full max-w-[1480px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SitezyButton variant="ghost" size="sm" onClick={handleBackToWorkspace} className="h-9 min-h-[36px] px-3">
              <ArrowLeft size={14} />
              <span className="hidden md:inline">Workspace</span>
            </SitezyButton>
            <div className="hidden h-6 w-px bg-[var(--border-soft)] md:block" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.03em]">{project.name}</p>
              <p className="truncate text-[12px] text-[var(--fg-muted)]">CMS foundation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {project.publishedSite?.status === "published" ? (
              <SitezyButton variant="secondary" size="sm" onClick={handleOpenLive} className="h-9 min-h-[36px] px-3">
                <Globe2 size={14} />
                <span className="hidden md:inline">Live</span>
              </SitezyButton>
            ) : null}
            <SitezyButton variant="secondary" size="sm" onClick={handleBackToWorkspace} className="h-9 min-h-[36px] px-3">
              <PencilLine size={14} />
              <span className="hidden md:inline">Editor</span>
            </SitezyButton>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1480px] gap-5 px-4 py-5 xl:grid-cols-[300px_320px_minmax(0,1fr)]">
        <SitezyPanel className="space-y-4 p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-4)] text-[var(--text-accent)]">
                <Database size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Collections</p>
                <h1 className="truncate text-[22px] font-semibold tracking-[-0.04em]">Project CMS</h1>
              </div>
            </div>
            <p className="text-[14px] leading-7 text-[var(--text-secondary)]">
              Build reusable content collections for blog posts, case studies, team profiles, and FAQs.
            </p>
          </div>

          {!storageReady ? (
            <div className="rounded-[20px] border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-[13px] leading-6 text-rose-200">
              CMS needs the latest migration before collections and entries can be stored.
            </div>
          ) : null}

          <SitezyCard className="space-y-3 rounded-[22px] p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--fg-faint)]">New collection</p>
              <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">Start from a preset or create a custom collection.</p>
            </div>
            <SitezyInput
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              placeholder="Collection name"
              disabled={!storageReady || busyAction !== null}
            />
            <select
              value={collectionPreset}
              onChange={(event) => setCollectionPreset(event.target.value as CmsCollectionPreset)}
              disabled={!storageReady || busyAction !== null}
              className="sz-input min-h-[44px]"
            >
              {CMS_PRESET_TEMPLATES.map((template) => (
                <option key={template.preset} value={template.preset}>
                  {template.label}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
            <SitezyButton
              variant="primary"
              size="sm"
              onClick={() => void handleCreateCollection()}
              disabled={!storageReady || busyAction !== null}
              className="w-full"
            >
              {busyAction === "createCmsCollection" ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
              Create collection
            </SitezyButton>
          </SitezyCard>

          <div className="space-y-2">
            {collections.map((collection) => {
              const active = collection.id === selectedCollectionId;
              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => {
                    setSelectedCollectionId(collection.id);
                    setSelectedEntryId(collection.entries[0]?.id ?? null);
                    setBanner(null);
                  }}
                  className={`w-full rounded-[20px] border px-4 py-3 text-left transition-all ${
                    active
                      ? "border-[rgba(107,119,255,0.42)] bg-[rgba(107,119,255,0.12)]"
                      : "border-[var(--border-soft)] bg-[var(--surface-3)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-4)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{collection.name}</p>
                      <p className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">
                        {collection.slug}
                      </p>
                    </div>
                    <SitezyBadge className="sz-badge text-[10px]">{collection.entries.length} entries</SitezyBadge>
                  </div>
                </button>
              );
            })}

            {!collections.length ? (
              <div className="rounded-[20px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-5 text-[13px] leading-6 text-[var(--text-secondary)]">
                Create your first collection to start managing structured site content.
              </div>
            ) : null}
          </div>
        </SitezyPanel>

        <SitezyPanel className="flex min-h-[720px] flex-col p-4">
          {selectedCollection ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Entries</p>
                  <h2 className="truncate text-[24px] font-semibold tracking-[-0.04em]">{selectedCollection.name}</h2>
                </div>
                <SitezyButton
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleCreateEntry()}
                  disabled={!storageReady || busyAction !== null}
                >
                  {busyAction === "createCmsEntry" ? <Loader2 size={14} className="spin" /> : <FilePlus2 size={14} />}
                  Add entry
                </SitezyButton>
              </div>

              <div className="mt-4 space-y-2 overflow-y-auto pr-1">
                {selectedCollection.entries.map((entry) => {
                  const active = entry.id === selectedEntryId;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setSelectedEntryId(entry.id);
                        setBanner(null);
                      }}
                      className={`w-full rounded-[20px] border px-4 py-3 text-left transition-all ${
                        active
                          ? "border-[rgba(107,119,255,0.42)] bg-[rgba(107,119,255,0.12)]"
                          : "border-[var(--border-soft)] bg-[var(--surface-3)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-4)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold">{entry.title}</p>
                          <p className="mt-1 truncate text-[12px] text-[var(--text-secondary)]">{entry.slug}</p>
                        </div>
                        <SitezyBadge className={entry.status === "published" ? "sz-status-success" : "sz-status-warning"}>
                          {entry.status}
                        </SitezyBadge>
                      </div>
                      <p className="mt-2 text-[11px] text-[var(--fg-muted)]">Updated {formatDate(entry.updatedAt)}</p>
                    </button>
                  );
                })}

                {!selectedCollection.entries.length ? (
                  <div className="rounded-[20px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-5 text-[13px] leading-6 text-[var(--text-secondary)]">
                    This collection does not have any entries yet.
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-4)] text-[var(--text-accent)]">
                <BookOpenText size={20} />
              </div>
              <h2 className="mt-5 text-[24px] font-semibold tracking-[-0.04em]">Choose a collection</h2>
              <p className="mt-3 max-w-[280px] text-[14px] leading-7 text-[var(--text-secondary)]">
                Select a collection to manage its fields and content entries.
              </p>
            </div>
          )}
        </SitezyPanel>

        <div className="space-y-5">
          {banner ? (
            <SitezyPanel
              className={`p-4 ${
                banner.kind === "error"
                  ? "border-rose-300/40 bg-rose-500/10"
                  : "border-emerald-300/30 bg-emerald-500/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold">
                    {banner.kind === "error" ? "Something went wrong" : "CMS updated"}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">{banner.message}</p>
                </div>
                {banner.kind === "error" ? (
                  <SitezyBadge className="border border-rose-300/30 bg-transparent text-[11px]">{banner.code}</SitezyBadge>
                ) : null}
              </div>
            </SitezyPanel>
          ) : null}

          <SitezyPanel className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Collection settings</p>
                <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em]">
                  {selectedCollection ? selectedCollection.name : "No collection selected"}
                </h2>
              </div>
              {selectedCollection ? (
                <SitezyButton
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDeleteCollection()}
                  disabled={!storageReady || busyAction !== null}
                  className="text-rose-300 hover:text-rose-200"
                >
                  <Trash2 size={14} />
                  Delete
                </SitezyButton>
              ) : null}
            </div>

            {selectedCollection ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Name</p>
                    <SitezyInput
                      value={collectionDraft.name}
                      onChange={(event) => setCollectionDraft((draft) => ({ ...draft, name: event.target.value }))}
                      disabled={!storageReady || busyAction !== null}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Slug</p>
                    <SitezyInput
                      value={collectionDraft.slug}
                      onChange={(event) => setCollectionDraft((draft) => ({ ...draft, slug: slugifyToken(event.target.value, "collection") }))}
                      disabled={!storageReady || busyAction !== null}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <SitezyBadge className="sz-badge">{selectedCollection.preset.replaceAll("_", " ")}</SitezyBadge>
                  <SitezyBadge className="sz-badge">{selectedCollection.fields.length} fields</SitezyBadge>
                  <SitezyBadge className="sz-badge">{selectedCollection.entries.length} entries</SitezyBadge>
                </div>

                <SitezyButton
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleSaveCollection()}
                  disabled={!storageReady || busyAction !== null}
                >
                  {busyAction === "updateCmsCollection" ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                  Save collection
                </SitezyButton>

                <div className="space-y-3 border-t border-[var(--border-soft)] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Fields</p>
                      <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                        Fields define the structured values available on each entry.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_auto_auto]">
                    <SitezyInput
                      value={newFieldLabel}
                      onChange={(event) => setNewFieldLabel(event.target.value)}
                      placeholder="Field label"
                      disabled={!storageReady || busyAction !== null}
                    />
                    <select
                      value={newFieldType}
                      onChange={(event) => setNewFieldType(event.target.value as CmsFieldType)}
                      disabled={!storageReady || busyAction !== null}
                      className="sz-input min-h-[44px]"
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="rich_text">Rich text</option>
                      <option value="image">Image</option>
                      <option value="url">URL</option>
                      <option value="date">Date</option>
                    </select>
                    <label className="flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 text-[12px] font-medium text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={newFieldRequired}
                        onChange={(event) => setNewFieldRequired(event.target.checked)}
                        disabled={!storageReady || busyAction !== null}
                        className="h-4 w-4 accent-[var(--text-accent)]"
                      />
                      Required
                    </label>
                    <SitezyButton
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleAddField()}
                      disabled={!storageReady || busyAction !== null}
                    >
                      {busyAction === "createCmsField" ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                      Add
                    </SitezyButton>
                  </div>

                  <div className="space-y-2">
                    {selectedCollection.fields.map((field) => {
                      const draft = fieldDrafts[field.id] ?? {
                        label: field.label,
                        type: field.type,
                        required: field.required,
                      };

                      return (
                        <SitezyCard key={field.id} className="rounded-[20px] p-3">
                          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_160px_auto_auto_auto]">
                            <SitezyInput
                              value={draft.label}
                              onChange={(event) =>
                                setFieldDrafts((current) => ({
                                  ...current,
                                  [field.id]: {
                                    ...draft,
                                    label: event.target.value,
                                  },
                                }))
                              }
                              disabled={!storageReady || busyAction !== null}
                            />
                            <select
                              value={draft.type}
                              onChange={(event) =>
                                setFieldDrafts((current) => ({
                                  ...current,
                                  [field.id]: {
                                    ...draft,
                                    type: event.target.value as CmsFieldType,
                                  },
                                }))
                              }
                              disabled={!storageReady || busyAction !== null}
                              className="sz-input min-h-[44px]"
                            >
                              <option value="text">Text</option>
                              <option value="textarea">Textarea</option>
                              <option value="rich_text">Rich text</option>
                              <option value="image">Image</option>
                              <option value="url">URL</option>
                              <option value="date">Date</option>
                            </select>
                            <label className="flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 text-[12px] font-medium text-[var(--text-secondary)]">
                              <input
                                type="checkbox"
                                checked={draft.required}
                                onChange={(event) =>
                                  setFieldDrafts((current) => ({
                                    ...current,
                                    [field.id]: {
                                      ...draft,
                                      required: event.target.checked,
                                    },
                                  }))
                                }
                                disabled={!storageReady || busyAction !== null}
                                className="h-4 w-4 accent-[var(--text-accent)]"
                              />
                              Required
                            </label>
                            <SitezyButton
                              variant="secondary"
                              size="sm"
                              onClick={() => void handleSaveField(field.id)}
                              disabled={!storageReady || busyAction !== null}
                            >
                              {busyAction === `updateCmsField:${field.id}` ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                              Save
                            </SitezyButton>
                            <SitezyButton
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleDeleteField(field.id)}
                              disabled={!storageReady || busyAction !== null}
                              className="text-rose-300 hover:text-rose-200"
                            >
                              <Trash2 size={14} />
                              Delete
                            </SitezyButton>
                          </div>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">{field.key}</p>
                        </SitezyCard>
                      );
                    })}

                    {!selectedCollection.fields.length ? (
                      <div className="rounded-[20px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-5 text-[13px] leading-6 text-[var(--text-secondary)]">
                        This collection does not have any custom fields yet.
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[20px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-5 text-[13px] leading-6 text-[var(--text-secondary)]">
                Select a collection to manage its fields and metadata.
              </div>
            )}
          </SitezyPanel>

          <SitezyPanel className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Entry editor</p>
                <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em]">
                  {selectedEntry ? selectedEntry.title : "No entry selected"}
                </h2>
              </div>
              {selectedEntry ? (
                <SitezyButton
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDeleteEntry()}
                  disabled={!storageReady || busyAction !== null}
                  className="text-rose-300 hover:text-rose-200"
                >
                  <Trash2 size={14} />
                  Delete
                </SitezyButton>
              ) : null}
            </div>

            {selectedCollection && selectedEntry && entryDraft ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Title</p>
                    <SitezyInput
                      value={entryDraft.title}
                      onChange={(event) =>
                        setEntryDraft((draft) =>
                          draft
                            ? {
                                ...draft,
                                title: event.target.value,
                              }
                            : draft
                        )
                      }
                      disabled={!storageReady || busyAction !== null}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Slug</p>
                    <SitezyInput
                      value={entryDraft.slug}
                      onChange={(event) =>
                        setEntryDraft((draft) =>
                          draft
                            ? {
                                ...draft,
                                slug: slugifyToken(event.target.value, "entry"),
                              }
                            : draft
                        )
                      }
                      disabled={!storageReady || busyAction !== null}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Status</p>
                  <select
                    value={entryDraft.status}
                    onChange={(event) =>
                      setEntryDraft((draft) =>
                        draft
                          ? {
                              ...draft,
                              status: event.target.value as CmsEntryStatus,
                            }
                          : draft
                      )
                    }
                    disabled={!storageReady || busyAction !== null}
                    className="sz-input min-h-[44px] max-w-[220px]"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div className="grid gap-3">
                  {selectedCollection.fields.map((field) => {
                    const value = entryDraft.values[field.key] ?? "";
                    const label = (
                      <div className="mb-2 flex items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">{field.label}</p>
                        {field.required ? <SitezyBadge className="sz-badge text-[10px]">Required</SitezyBadge> : null}
                      </div>
                    );

                    if (field.type === "textarea" || field.type === "rich_text") {
                      return (
                        <div key={field.id}>
                          {label}
                          <SitezyTextarea
                            value={value}
                            onChange={(event) =>
                              setEntryDraft((draft) =>
                                draft
                                  ? {
                                      ...draft,
                                      values: {
                                        ...draft.values,
                                        [field.key]: event.target.value,
                                      },
                                    }
                                  : draft
                              )
                            }
                            rows={field.type === "rich_text" ? 8 : 5}
                            disabled={!storageReady || busyAction !== null}
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={field.id}>
                        {label}
                        <SitezyInput
                          type={field.type === "date" ? "date" : "text"}
                          value={value}
                          placeholder={field.type === "image" ? "https://..." : field.type === "url" ? "https://..." : ""}
                          onChange={(event) =>
                            setEntryDraft((draft) =>
                              draft
                                ? {
                                    ...draft,
                                    values: {
                                      ...draft.values,
                                      [field.key]: event.target.value,
                                    },
                                  }
                                : draft
                            )
                          }
                          disabled={!storageReady || busyAction !== null}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  <SitezyButton
                    variant="primary"
                    size="sm"
                    onClick={() => void handleSaveEntry()}
                    disabled={!storageReady || busyAction !== null}
                  >
                    {busyAction === "updateCmsEntry" ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                    Save entry
                  </SitezyButton>
                </div>
              </>
            ) : (
              <div className="rounded-[20px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-5 text-[13px] leading-6 text-[var(--text-secondary)]">
                {selectedCollection
                  ? "Select an entry to edit its structured values."
                  : "Choose a collection first, then create or select an entry."}
              </div>
            )}
          </SitezyPanel>

          {!storageReady ? (
            <SitezyPanel className="border border-amber-300/40 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[16px] border border-amber-300/30 bg-amber-500/10 text-amber-200">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold">Migration required</p>
                  <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">
                    Apply the CMS migration before using collections and entries in this environment.
                  </p>
                </div>
              </div>
            </SitezyPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
