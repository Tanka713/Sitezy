"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpenText, Database, FilePlus2, Globe2, Loader2, Plus, Save, ShieldAlert, Trash2 } from "lucide-react";
import {
  getAppReturnLabel,
  resolveAppReturnHref,
} from "@/lib/app-navigation";
import { CMS_PRESET_TEMPLATES } from "@/lib/cms/presets";
import { API_UNKNOWN_001, createAppError, normalizeError, type ErrorCode } from "@/lib/errors";
import { cn, formatDate } from "@/lib/utils";
import { resolvePublishedHref } from "@/lib/publishing";
import { SitezyBadge, SitezyButton, SitezyInput, SitezyTextarea } from "@/components/ui/sitezy";
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

function SectionHeader({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-5 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--fg-faint)]">{eyebrow}</p>
        <div className="space-y-1.5">
          <h2 className="text-[24px] font-semibold tracking-[-0.045em] text-[var(--text-primary)]">{title}</h2>
          {body ? <p className="max-w-[760px] text-[13px] leading-7 text-[var(--text-secondary)]">{body}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function EmptyStateBlock({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center py-12 text-center">
      <div className="text-[var(--text-accent)]">{icon}</div>
      <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{title}</h3>
      <p className="mt-3 max-w-[420px] text-[13px] leading-7 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}

function CmsSurface({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("sz-card relative overflow-hidden rounded-[28px]", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.04] to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

function CmsStatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <CmsSurface className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">{label}</p>
          <p className="mt-3 text-[26px] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">{value}</p>
          <p className="mt-2 text-[12px] leading-6 text-[var(--text-secondary)]">{detail}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-accent)]">
          {icon}
        </div>
      </div>
    </CmsSurface>
  );
}

function formatCollectionPresetLabel(preset: CmsCollectionPreset) {
  const template = CMS_PRESET_TEMPLATES.find((candidate) => candidate.preset === preset);
  return template?.label ?? preset.replaceAll("_", " ");
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collections, setCollections] = useState(initialCollections);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(initialCollections[0]?.id ?? null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(initialCollections[0]?.entries[0]?.id ?? null);
  const [banner, setBanner] = useState<BannerState>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [collectionFormError, setCollectionFormError] = useState<string | null>(null);
  const [collectionPreset, setCollectionPreset] = useState<CmsCollectionPreset>("blog_posts");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [fieldFormError, setFieldFormError] = useState<string | null>(null);
  const [newFieldType, setNewFieldType] = useState<CmsFieldType>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [collectionDraft, setCollectionDraft] = useState({ name: "", slug: "" });
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, FieldDraft>>({});
  const [entryDraft, setEntryDraft] = useState<EntryDraft | null>(null);
  const backHref = useMemo(
    () => resolveAppReturnHref(searchParams.get("returnTo"), "/studio"),
    [searchParams]
  );
  const backLabel = useMemo(() => getAppReturnLabel(backHref, "Workspace"), [backHref]);

  useEffect(() => {
    router.prefetch(backHref);
  }, [backHref, router]);

  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.id === selectedCollectionId) ?? null,
    [collections, selectedCollectionId]
  );
  const selectedEntry = useMemo(
    () => selectedCollection?.entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [selectedCollection, selectedEntryId]
  );
  const totalEntries = useMemo(
    () => collections.reduce((sum, collection) => sum + collection.entries.length, 0),
    [collections]
  );
  const totalFields = useMemo(
    () => collections.reduce((sum, collection) => sum + collection.fields.length, 0),
    [collections]
  );
  const publishedEntries = useMemo(
    () =>
      collections.reduce(
        (sum, collection) => sum + collection.entries.filter((entry) => entry.status === "published").length,
        0
      ),
    [collections]
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
      setFieldFormError(null);
      setEntryDraft(null);
      return;
    }
    setFieldFormError(null);
    setEntryDraft(buildEntryDraft(selectedCollection, selectedEntryId));
  }, [selectedCollection, selectedEntryId]);

  useEffect(() => {
    if (banner?.kind !== "success") return undefined;
    const timeoutId = window.setTimeout(() => {
      setBanner((current) => (current?.kind === "success" ? null : current));
    }, 2600);
    return () => window.clearTimeout(timeoutId);
  }, [banner]);

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
    router.push(backHref);
  }

  function handleOpenLive() {
    const subdomain = project.publishedSite?.subdomain;
    if (!subdomain) return;
    window.open(resolvePublishedHref(subdomain), "_blank", "noopener");
  }

  async function handleCreateCollection() {
    const name = collectionName.trim();
    if (!name) {
      setCollectionFormError("Add a collection name before creating it.");
      return;
    }
    setCollectionFormError(null);

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
        setCollectionFormError(null);
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
      setFieldFormError("Add a field label before creating it.");
      return;
    }
    setFieldFormError(null);

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
        setFieldFormError(null);
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
    <div className="sz-page-shell bg-[var(--surface-shell)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(circle_at_top_left,rgba(94,122,255,0.14),transparent_42%),radial-gradient(circle_at_82%_10%,rgba(99,215,173,0.1),transparent_30%)]" />

      <div className="sz-topbar sz-page-header px-4">
        <div className="mx-auto flex h-[60px] w-full max-w-[1480px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SitezyButton variant="ghost" size="sm" onClick={handleBackToWorkspace} className="h-9 min-h-[36px] px-3">
              <ArrowLeft size={14} />
              <span className="hidden md:inline">{backLabel}</span>
            </SitezyButton>
            <div className="hidden h-6 w-px bg-[var(--border-soft)] md:block" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.03em]">{project.name}</p>
              <p className="truncate text-[12px] text-[var(--fg-muted)]">CMS</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {project.publishedSite?.status === "published" ? (
              <SitezyButton variant="secondary" size="sm" onClick={handleOpenLive} className="h-9 min-h-[36px] px-3">
                <Globe2 size={14} />
                <span className="hidden md:inline">Live</span>
              </SitezyButton>
            ) : null}
          </div>
        </div>
      </div>

      <main className="sz-page-scroll">
        <div className="mx-auto w-full max-w-[1480px] px-4 pb-12 pt-6">
        {!storageReady || banner?.kind === "error" ? (
          <div className="space-y-3">
            {!storageReady ? (
              <div className="rounded-[22px] border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-[13px] leading-7 text-amber-100/90">
                CMS needs the latest migration before collections and entries can be stored in this environment.
              </div>
            ) : null}

            {banner?.kind === "error" ? (
              <div className="rounded-[22px] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-[13px] leading-7 text-rose-100/90">
                {banner.message}
                {banner.code ? ` (${banner.code})` : ""}
              </div>
            ) : null}
          </div>
        ) : null}

        <section className={cn(!storageReady || banner?.kind === "error" ? "mt-6" : "mt-0")}>
          <SectionHeader
            eyebrow="CMS"
            title="Structured content studio"
            body="Keep collections, schema, and entry content organized in a calmer workspace built for reusable site content."
            action={
              banner?.kind === "success" ? (
                <div className="inline-flex items-center rounded-full border border-emerald-300/16 bg-emerald-400/8 px-3 py-1.5 text-[12px] font-medium text-emerald-100/90">
                  {banner.message}
                </div>
              ) : null
            }
          />

          <div className="grid gap-3 pb-8 sm:grid-cols-2 xl:grid-cols-4">
            <CmsStatCard
              icon={<Database size={16} />}
              label="Collections"
              value={String(collections.length)}
              detail={selectedCollection ? `Focused on ${selectedCollection.name}.` : "Build reusable content groups."}
            />
            <CmsStatCard
              icon={<BookOpenText size={16} />}
              label="Entries"
              value={String(totalEntries)}
              detail={`${publishedEntries} published and ready to render into the site.`}
            />
            <CmsStatCard
              icon={<FilePlus2 size={16} />}
              label="Fields"
              value={String(totalFields)}
              detail="Schema fields define the structure every entry follows."
            />
            <CmsStatCard
              icon={storageReady ? <Globe2 size={16} /> : <ShieldAlert size={16} />}
              label="Environment"
              value={storageReady ? (project.publishedSite?.status === "published" ? "Live" : "Ready") : "Blocked"}
              detail={
                storageReady
                  ? project.publishedSite?.status === "published"
                    ? "Project is already published and can consume CMS data."
                    : "Collections can be edited now and wired into publishing later."
                  : "Apply the CMS migration before content can be stored."
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)] xl:items-start">
            <aside className="space-y-5 xl:sticky xl:top-[88px]">
              <CmsSurface className="p-0">
                <div className="border-b border-[var(--border-soft)] px-5 py-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Create collection</p>
                  <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Start a new content set
                  </h3>
                  <p className="mt-2 text-[13px] leading-7 text-[var(--text-secondary)]">
                    Spin up a reusable content model for posts, case studies, FAQs, or a custom data source.
                  </p>
                </div>

                <div className="space-y-3 px-5 py-5">
                  <SitezyInput
                    value={collectionName}
                    onChange={(event) => {
                      setCollectionName(event.target.value);
                      if (collectionFormError) setCollectionFormError(null);
                    }}
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

                  {collectionFormError ? (
                    <p className="text-[12px] leading-6 text-rose-200/90">{collectionFormError}</p>
                  ) : null}

                  <SitezyButton
                    variant="primary"
                    size="sm"
                    onClick={() => void handleCreateCollection()}
                    disabled={!storageReady || busyAction !== null}
                    className="w-full justify-center"
                  >
                    {busyAction === "createCmsCollection" ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                    Create collection
                  </SitezyButton>
                </div>
              </CmsSurface>

              <CmsSurface className="p-0">
                <div className="border-b border-[var(--border-soft)] px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Collection browser</p>
                      <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Switch context</h3>
                    </div>
                    <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                      {collections.length}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-7 text-[var(--text-secondary)]">
                    Keep content groups separate so schema and entries stay easy to scan.
                  </p>
                </div>

                <div className="sz-scroll-hidden max-h-[580px] space-y-3 overflow-y-auto px-4 py-4">
                  {collections.length ? (
                    collections.map((collection) => {
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
                          className="w-full text-left"
                        >
                          <div
                            className={cn(
                              "rounded-[22px] border px-4 py-4 transition-all",
                              active
                                ? "border-[var(--border-focus)] bg-[rgba(107,119,255,0.12)] shadow-[0_18px_40px_rgba(18,22,34,0.24)]"
                                : "border-[var(--border-soft)] bg-[var(--surface-3)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-4)]"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{collection.name}</p>
                                <p className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">
                                  {collection.slug}
                                </p>
                              </div>
                              <span className="text-[11px] leading-6 text-[var(--fg-muted)]">{collection.entries.length}</span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <SitezyBadge className="text-[10px]">{formatCollectionPresetLabel(collection.preset)}</SitezyBadge>
                              <span className="text-[11px] text-[var(--fg-muted)]">{collection.fields.length} fields</span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-1 py-2">
                      <EmptyStateBlock
                        icon={<Database size={18} />}
                        title="No collections yet"
                        body="Create your first collection to start organizing reusable site content."
                      />
                    </div>
                  )}
                </div>
              </CmsSurface>
            </aside>

            <div className="min-w-0 space-y-6">
              {selectedCollection ? (
                <>
                  <CmsSurface className="overflow-hidden p-0">
                    <div className="border-b border-[var(--border-soft)] px-6 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Selected collection</p>
                          <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                            {selectedCollection.name}
                          </h2>
                          <p className="max-w-[760px] text-[13px] leading-7 text-[var(--text-secondary)]">
                            Define the collection once, then use the entry editor below to fill it with structured content that can flow into your site.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <SitezyButton
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleSaveCollection()}
                            disabled={!storageReady || busyAction !== null}
                          >
                            {busyAction === "updateCmsCollection" ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                            Save collection
                          </SitezyButton>
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
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <SitezyBadge>{formatCollectionPresetLabel(selectedCollection.preset)}</SitezyBadge>
                        <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                          {selectedCollection.fields.length} fields
                        </span>
                        <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                          {selectedCollection.entries.length} entries
                        </span>
                        <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                          {selectedCollection.entries.filter((entry) => entry.status === "published").length} published
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 px-6 py-5 lg:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Collection name</p>
                        <SitezyInput
                          value={collectionDraft.name}
                          onChange={(event) => setCollectionDraft((draft) => ({ ...draft, name: event.target.value }))}
                          disabled={!storageReady || busyAction !== null}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Collection slug</p>
                        <SitezyInput
                          value={collectionDraft.slug}
                          onChange={(event) =>
                            setCollectionDraft((draft) => ({ ...draft, slug: slugifyToken(event.target.value, "collection") }))
                          }
                          disabled={!storageReady || busyAction !== null}
                        />
                      </div>
                    </div>
                  </CmsSurface>

                  <div className="grid gap-6 2xl:grid-cols-[360px,minmax(0,1fr)]">
                    <div className="space-y-6">
                      <CmsSurface className="overflow-hidden p-0">
                        <div className="border-b border-[var(--border-soft)] px-5 py-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Entries</p>
                              <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.045em] text-[var(--text-primary)]">Content rows</h3>
                              <p className="mt-2 text-[13px] leading-7 text-[var(--text-secondary)]">
                                Select an entry to edit it, or create a new row that follows this collection’s schema.
                              </p>
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
                        </div>

                        {selectedCollection.entries.length ? (
                          <div className="sz-scroll-hidden max-h-[720px] space-y-3 overflow-y-auto px-4 py-4">
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
                                  className="w-full text-left"
                                >
                                  <div
                                    className={cn(
                                      "rounded-[22px] border px-4 py-4 transition-all",
                                      active
                                        ? "border-[var(--border-focus)] bg-[rgba(107,119,255,0.12)] shadow-[0_18px_40px_rgba(18,22,34,0.24)]"
                                        : "border-[var(--border-soft)] bg-[var(--surface-3)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-4)]"
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{entry.title}</p>
                                        <p className="mt-1 truncate text-[12px] text-[var(--text-secondary)]">{entry.slug}</p>
                                      </div>
                                      <SitezyBadge className={entry.status === "published" ? "sz-status-success" : "sz-status-warning"}>
                                        {entry.status}
                                      </SitezyBadge>
                                    </div>
                                    <p className="mt-3 text-[11px] text-[var(--fg-muted)]">Updated {formatDate(entry.updatedAt)}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="px-6 py-6">
                            <EmptyStateBlock
                              icon={<BookOpenText size={20} />}
                              title="No entries yet"
                              body="Create the first entry for this collection to start filling the site with structured content."
                            />
                          </div>
                        )}
                      </CmsSurface>
                    </div>

                    <div className="space-y-6">
                      <CmsSurface className="overflow-hidden p-0">
                        <div className="border-b border-[var(--border-soft)] px-6 py-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Entry editor</p>
                              <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.045em] text-[var(--text-primary)]">
                                {selectedEntry ? selectedEntry.title : "Choose an entry"}
                              </h3>
                              <p className="mt-2 text-[13px] leading-7 text-[var(--text-secondary)]">
                                {selectedEntry
                                  ? "Edit the structured values that this entry sends into your site."
                                  : "Select an entry from the left to open its content form."}
                              </p>
                            </div>

                            {selectedEntry ? (
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
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {selectedCollection && selectedEntry && entryDraft ? (
                          <div className="space-y-6 px-6 py-6">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
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
                                  className="sz-input min-h-[44px]"
                                >
                                  <option value="draft">Draft</option>
                                  <option value="published">Published</option>
                                </select>
                              </div>
                            </div>

                            {selectedCollection.fields.length ? (
                              <div className="grid gap-4 lg:grid-cols-2">
                                {selectedCollection.fields.map((field) => {
                                  const value = entryDraft.values[field.key] ?? "";
                                  const expanded = field.type === "textarea" || field.type === "rich_text";

                                  return (
                                    <div key={field.id} className={cn("space-y-2", expanded && "lg:col-span-2")}>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">
                                          {field.label}
                                        </p>
                                        <SitezyBadge className="text-[10px]">{field.type.replaceAll("_", " ")}</SitezyBadge>
                                        {field.required ? <SitezyBadge className="text-[10px]">Required</SitezyBadge> : null}
                                      </div>

                                      {expanded ? (
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
                                      ) : (
                                        <SitezyInput
                                          type={field.type === "date" ? "date" : "text"}
                                          value={value}
                                          placeholder={
                                            field.type === "image"
                                              ? "https://image-url"
                                              : field.type === "url"
                                              ? "https://example.com"
                                              : ""
                                          }
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
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-[22px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-5 text-[13px] leading-7 text-[var(--text-secondary)]">
                                Add fields in the schema panel before editing entry content.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="px-6 py-6">
                            <EmptyStateBlock
                              icon={<BookOpenText size={20} />}
                              title="Choose an entry"
                              body="Select an entry from the left rail to edit its structured values."
                            />
                          </div>
                        )}
                      </CmsSurface>

                      <CmsSurface className="overflow-hidden p-0">
                        <div className="border-b border-[var(--border-soft)] px-6 py-5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Schema</p>
                          <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.045em] text-[var(--text-primary)]">Field structure</h3>
                          <p className="mt-2 text-[13px] leading-7 text-[var(--text-secondary)]">
                            Shape the fields every entry in this collection should contain, then save only the rows you actually changed.
                          </p>
                        </div>

                        <div className="space-y-5 px-6 py-6">
                          <div className="rounded-[24px] border border-[rgba(107,119,255,0.18)] bg-[rgba(107,119,255,0.07)] p-4">
                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_auto_auto] lg:items-center">
                              <SitezyInput
                                value={newFieldLabel}
                                onChange={(event) => {
                                  setNewFieldLabel(event.target.value);
                                  if (fieldFormError) setFieldFormError(null);
                                }}
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
                                Add field
                              </SitezyButton>
                            </div>

                            {fieldFormError ? (
                              <p className="mt-3 text-[12px] leading-6 text-rose-200/90">{fieldFormError}</p>
                            ) : null}
                          </div>

                          {selectedCollection.fields.length ? (
                            <div className="space-y-3">
                              {selectedCollection.fields.map((field) => {
                                const draft = fieldDrafts[field.id] ?? {
                                  label: field.label,
                                  type: field.type,
                                  required: field.required,
                                };

                                return (
                                  <div
                                    key={field.id}
                                    className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4"
                                  >
                                    <div className="flex flex-col gap-4">
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                          <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{field.key}</p>
                                          <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <SitezyBadge className="text-[10px]">{draft.type.replaceAll("_", " ")}</SitezyBadge>
                                            {draft.required ? <SitezyBadge className="text-[10px]">Required</SitezyBadge> : null}
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
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
                                      </div>

                                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_auto] lg:items-center">
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
                                        <label className="flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-4)] px-3 text-[12px] font-medium text-[var(--text-secondary)]">
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
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <EmptyStateBlock
                              icon={<Database size={20} />}
                              title="Schema is still empty"
                              body="Add the first field to define what every entry in this collection should contain."
                            />
                          )}
                        </div>
                      </CmsSurface>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <CmsSurface className="p-8">
                    <EmptyStateBlock
                      icon={<Database size={22} />}
                      title="Choose or create a collection"
                      body="Once a collection exists, this workspace will separate browsing, schema editing, and entry editing into cleaner zones."
                    />
                  </CmsSurface>

                  <CmsSurface className="p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Quick start</p>
                    <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.045em] text-[var(--text-primary)]">
                      Organize content in three steps
                    </h3>
                    <div className="mt-5 space-y-3">
                      {[
                        {
                          title: "Create a collection",
                          body: "Start with a preset or custom model for the kind of content you need.",
                        },
                        {
                          title: "Shape the schema",
                          body: "Add the fields every entry should follow so the content stays consistent.",
                        },
                        {
                          title: "Fill in entries",
                          body: "Write each row once, then reuse that content anywhere the site needs it.",
                        },
                      ].map((step, index) => (
                        <div
                          key={step.title}
                          className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-4)] text-[12px] font-semibold text-[var(--text-primary)]">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-[14px] font-semibold text-[var(--text-primary)]">{step.title}</p>
                              <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">{step.body}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CmsSurface>
                </div>
              )}
            </div>
          </div>
        </section>
        </div>
      </main>
    </div>
  );
}
