"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Globe2, Loader2, Rocket, RotateCcw, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Project, ProjectDeployment, ProjectDomain, UserSettings } from "@/types";
import { buildDefaultProjectSeo, buildSeoBaseUrl, normalizeProjectSeo } from "@/lib/seo";
import { downloadBlob } from "@/lib/utils";
import { buildSitezyHostname, resolvePublishedHref } from "@/lib/publishing";
import { defaultUserSettings } from "@/lib/settings";
import { API_UNKNOWN_001, createAppError, normalizeError, type ErrorCode } from "@/lib/errors";
import {
  SettingsActionRow,
  SettingsField,
  SettingsGrid,
  SettingsGroup,
  SettingsInput,
  SettingsPlaceholder,
  SettingsPrimaryAction,
  SettingsResetRow,
  SettingsSecondaryAction,
  SettingsSegmented,
  SettingsSelect,
  SettingsStack,
  SettingsStatus,
  SettingsTextarea,
  SettingsToggle,
} from "../ui";
import { useSettingsSectionAutosave } from "../useSettingsSectionAutosave";

function deploymentTone(status: ProjectDeployment["status"]): "success" | "error" | "muted" {
  if (status === "published") return "success";
  if (status === "failed") return "error";
  return "muted";
}

function domainTone(status: ProjectDomain["status"]): "success" | "error" | "muted" {
  if (status === "active") return "success";
  if (status === "failed") return "error";
  return "muted";
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "Not yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not yet";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ExportDeploymentSection({
  value,
  projects,
  onSave,
}: {
  value: UserSettings["exportDeployment"];
  projects: Project[];
  onSave: (patch: Partial<UserSettings>) => Promise<void>;
}) {
  const hydrateProjects = useAppStore((state) => state.hydrateProjects);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const syncProjectFromServer = useAppStore((state) => state.syncProjectFromServer);
  const { draft, status, setDraft, setStatus } = useSettingsSectionAutosave({
    sectionKey: "exportDeployment",
    value,
    onSave,
    errorMessage: "We couldn't save your export defaults.",
  });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deployments, setDeployments] = useState<ProjectDeployment[]>([]);
  const [deploymentsLoading, setDeploymentsLoading] = useState(false);
  const [deploymentActionId, setDeploymentActionId] = useState<string | null>(null);
  const [domainDraft, setDomainDraft] = useState("");
  const [domainSubmitting, setDomainSubmitting] = useState(false);
  const [domainActionId, setDomainActionId] = useState<string | null>(null);
  const [seoDraft, setSeoDraft] = useState(() => buildDefaultProjectSeo());
  const [seoSaving, setSeoSaving] = useState(false);
  const canReset = JSON.stringify(draft) !== JSON.stringify(defaultUserSettings.exportDeployment);
  const seoSerialized = JSON.stringify(seoDraft);
  const seoLastSavedRef = useRef(seoSerialized);
  const seoLatestDraftRef = useRef(seoDraft);
  const seoMountedRef = useRef(false);

  useEffect(() => {
    seoLatestDraftRef.current = seoDraft;
  }, [seoDraft]);

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId("");
      return;
    }
    setSelectedProjectId((current) => (current && projects.some((project) => project.id === current) ? current : projects[0]!.id));
  }, [projects]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const selectedProjectName = selectedProject?.name ?? null;
  const publishedSite = selectedProject?.publishedSite ?? null;
  const canOpenLive = publishedSite?.status === "published";
  const sitezyTarget = publishedSite ? buildSitezyHostname(publishedSite.subdomain) : "";
  const effectiveSeoBaseUrl = selectedProject ? buildSeoBaseUrl(selectedProject, publishedSite?.liveUrl ?? null) : "";

  useEffect(() => {
    const nextSeo = normalizeProjectSeo(selectedProject?.seo, selectedProject ?? undefined);
    seoLastSavedRef.current = JSON.stringify(nextSeo);
    setSeoDraft(nextSeo);
  }, [selectedProjectId, selectedProject]);

  useEffect(() => {
    if (!selectedProjectId || !selectedProject) return;

    if (!seoMountedRef.current) {
      seoMountedRef.current = true;
      return;
    }

    if (seoSerialized === seoLastSavedRef.current) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setSeoSaving(true);
      try {
        const res = await fetch(`/api/projects/${selectedProjectId}/seo`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seo: seoLatestDraftRef.current }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        if (!res.ok) {
          throw createAppError({
            code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
            devMessage: `Failed to save SEO for project ${selectedProjectId} (${res.status})`,
            userMessage: data.error ?? "We couldn't save this project's SEO settings.",
            severity: "error",
            metadata: { projectId: selectedProjectId, status: res.status, code: data.code ?? null },
          });
        }

        seoLastSavedRef.current = JSON.stringify(seoLatestDraftRef.current);
        await hydrateProjects();
        if (currentProjectId === selectedProjectId) {
          await syncProjectFromServer(selectedProjectId, { preserveEditor: true, preserveHistory: true });
        }
      } catch (error) {
        const appErr = normalizeError(error, API_UNKNOWN_001, { action: "saveProjectSeo", projectId: selectedProjectId });
        setStatus({ tone: "error", message: `${appErr.userMessage} REF ${appErr.code}` });
      } finally {
        setSeoSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [currentProjectId, hydrateProjects, selectedProject, selectedProjectId, seoSerialized, setStatus, syncProjectFromServer]);

  async function loadDeployments(projectId: string) {
    if (!projectId) {
      setDeployments([]);
      return;
    }

    setDeploymentsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/deployments`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        deployments?: ProjectDeployment[];
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Failed to load deployments for project ${projectId} (${res.status})`,
          userMessage: data.error ?? "We couldn't load the deployment history right now.",
          severity: "error",
          metadata: { projectId, status: res.status, code: data.code ?? null },
        });
      }

      setDeployments(Array.isArray(data.deployments) ? data.deployments : []);
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "loadProjectDeployments", projectId });
      setStatus({ tone: "error", message: `${appErr.userMessage} REF ${appErr.code}` });
      setDeployments([]);
    } finally {
      setDeploymentsLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedProjectId || !publishedSite) {
      setDeployments([]);
      return;
    }
    void loadDeployments(selectedProjectId);
  }, [selectedProjectId, publishedSite?.id, publishedSite?.activeDeploymentId]);

  async function refreshProjectState(projectId: string, options?: { reloadDeployments?: boolean }) {
    await hydrateProjects();
    if (currentProjectId === projectId) {
      await syncProjectFromServer(projectId, { preserveEditor: false, preserveHistory: true });
    }
    if (options?.reloadDeployments) {
      await loadDeployments(projectId);
    }
  }

  async function handleExport() {
    if (!selectedProjectId) return;
    setExporting(true);
    setStatus(null);

    try {
      const snapshotResponse = await fetch(`/api/projects/${selectedProjectId}`, { credentials: "same-origin" });
      const snapshotPayload = (await snapshotResponse.json().catch(() => ({}))) as { project?: Project; error?: string };
      if (!snapshotResponse.ok || !snapshotPayload.project) {
        throw new Error(snapshotPayload.error || "We couldn't load that project for export.");
      }

      const exportResponse = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: snapshotPayload.project,
          options: draft,
        }),
      });

      if (!exportResponse.ok) {
        const payload = (await exportResponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "We couldn't export the selected project.");
      }

      const blob = await exportResponse.blob();
      const fileBase = (selectedProjectName || "sitezy-project").replace(/[^a-z0-9]/gi, "-").toLowerCase();
      downloadBlob(blob, `${fileBase}.zip`);
      setStatus({ tone: "success", message: `Export started for ${selectedProjectName || "your project"}.` });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "We couldn't export your project.",
      });
    } finally {
      setExporting(false);
    }
  }

  async function handlePublish() {
    if (!selectedProjectId || publishing) return;
    setPublishing(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/publish`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        publishedSite?: { liveUrl?: string | null };
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.publishedSite) {
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Settings publish failed for project ${selectedProjectId} (${res.status})`,
          userMessage: data.error ?? "We couldn't publish this project right now.",
          severity: "error",
          metadata: { projectId: selectedProjectId, status: res.status, code: data.code ?? null },
        });
      }

      await refreshProjectState(selectedProjectId, { reloadDeployments: true });
      setStatus({
        tone: "success",
        message: `Published ${selectedProjectName || "project"} to ${data.publishedSite.liveUrl ?? "its live URL"}.`,
      });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "settingsPublishProject", projectId: selectedProjectId });
      setStatus({ tone: "error", message: `${appErr.userMessage} REF ${appErr.code}` });
    } finally {
      setPublishing(false);
    }
  }

  async function handleAddDomain() {
    if (!selectedProjectId || !domainDraft.trim() || domainSubmitting) return;
    setDomainSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/domains`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: domainDraft.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Failed to add domain for project ${selectedProjectId} (${res.status})`,
          userMessage: data.error ?? "We couldn't add that domain right now.",
          severity: "error",
          metadata: { projectId: selectedProjectId, status: res.status, code: data.code ?? null },
        });
      }

      setDomainDraft("");
      await refreshProjectState(selectedProjectId);
      setStatus({ tone: "success", message: "Domain added. Complete DNS and then verify it here." });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "addProjectDomain", projectId: selectedProjectId });
      setStatus({ tone: "error", message: `${appErr.userMessage} REF ${appErr.code}` });
    } finally {
      setDomainSubmitting(false);
    }
  }

  async function handleDomainAction(domainId: string, action: "verify" | "set_primary" | "remove") {
    if (!selectedProjectId || domainActionId) return;
    setDomainActionId(domainId);
    setStatus(null);

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/domains/${domainId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Failed to ${action} domain ${domainId} (${res.status})`,
          userMessage: data.error ?? "We couldn't update that domain right now.",
          severity: "error",
          metadata: { projectId: selectedProjectId, domainId, action, status: res.status, code: data.code ?? null },
        });
      }

      await refreshProjectState(selectedProjectId);
      setStatus({
        tone: "success",
        message:
          action === "verify"
            ? "Domain verified and activated."
            : action === "set_primary"
            ? "Primary domain updated."
            : "Domain removed.",
      });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "updateProjectDomain", projectId: selectedProjectId, domainId });
      setStatus({ tone: "error", message: `${appErr.userMessage} REF ${appErr.code}` });
    } finally {
      setDomainActionId(null);
    }
  }

  function handleOpenLive() {
    if (!publishedSite?.subdomain) return;
    window.open(resolvePublishedHref(publishedSite.subdomain), "_blank", "noopener");
  }

  async function handleRestoreDeployment(
    deploymentId: string,
    mode: "draft" | "republish",
    versionNumber: number
  ) {
    if (!selectedProjectId || deploymentActionId) return;
    const actionId = `${deploymentId}:${mode}`;
    setDeploymentActionId(actionId);
    setStatus(null);

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/deployments/${deploymentId}/restore`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        throw createAppError({
          code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
          devMessage: `Failed to ${mode} deployment ${deploymentId} (${res.status})`,
          userMessage:
            data.error ??
            (mode === "draft"
              ? "We couldn't restore that deployment into the current draft."
              : "We couldn't republish that deployment right now."),
          severity: "error",
          metadata: { projectId: selectedProjectId, deploymentId, mode, status: res.status, code: data.code ?? null },
        });
      }

      await refreshProjectState(selectedProjectId, { reloadDeployments: true });
      setStatus({
        tone: "success",
        message:
          mode === "draft"
            ? `Restored version ${versionNumber} into the current draft.`
            : `Republished version ${versionNumber} as a new live deployment.`,
      });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, {
        action: mode === "draft" ? "restoreDeploymentToDraft" : "republishDeployment",
        projectId: selectedProjectId,
        deploymentId,
      });
      setStatus({ tone: "error", message: `${appErr.userMessage} REF ${appErr.code}` });
    } finally {
      setDeploymentActionId(null);
    }
  }

  return (
    <SettingsStack>
      {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

      <SettingsGroup title="Export defaults" body="Set the package shape Sitezy should prefer when you export from settings.">
        <div className="space-y-5">
          <SettingsField label="Export format">
            <SettingsSegmented
              value={draft.exportFormat}
              onChange={(exportFormat) => setDraft((current) => ({ ...current, exportFormat }))}
              options={[
                { value: "sitezy-zip", label: "Sitezy ZIP", description: "Current default package." },
                { value: "html-package", label: "HTML Package", description: "Lighter output without app scaffolding." },
                { value: "full-package", label: "Full Package", description: "Include extra scaffolding and placeholders." },
              ]}
            />
          </SettingsField>

          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4">
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Include assets</h3>
                <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">
                  Add the asset directory and keep media placeholders in the exported package.
                </p>
              </div>
              <SettingsToggle
                checked={draft.includeAssets}
                onChange={(includeAssets) => setDraft((current) => ({ ...current, includeAssets }))}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4">
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Include SEO files</h3>
                <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">
                  Generate `robots.txt` and `sitemap.xml` from the current page structure.
                </p>
              </div>
              <SettingsToggle
                checked={draft.includeSeoFiles}
                onChange={(includeSeoFiles) => setDraft((current) => ({ ...current, includeSeoFiles }))}
              />
            </div>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Download package" body="Use the same export pipeline that already powers the editor, but with the defaults above.">
        <div className="space-y-4">
          <SettingsField label="Project">
            <SettingsSelect
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              disabled={!projects.length}
            >
              {!projects.length ? <option value="">No projects available</option> : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </SettingsSelect>
          </SettingsField>

          <SettingsActionRow>
            <SettingsPrimaryAction type="button" onClick={() => void handleExport()} disabled={!selectedProjectId || exporting}>
              {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              Download ZIP
            </SettingsPrimaryAction>
            <span className="text-[12px] leading-6 text-[var(--text-tertiary)]">
              {selectedProjectName ? `Ready to export ${selectedProjectName}.` : "Select a project to export."}
            </span>
          </SettingsActionRow>

          <div className="rounded-[20px] border border-amber-300/35 bg-amber-500/10 px-4 py-3 text-[13px] leading-6 text-amber-100">
            Lead capture stays static in ZIP exports. Contact forms and newsletter signup only store data and send notifications when the project is published on Sitezy.
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Hosted publish" body="Push the current saved project to a live Sitezy-owned subdomain on sitezy.ai.">
        <div className="space-y-4">
          <SettingsActionRow>
            <SettingsPrimaryAction type="button" onClick={() => void handlePublish()} disabled={!selectedProjectId || publishing}>
              {publishing ? <Loader2 size={14} className="spin" /> : <Rocket size={14} />}
              {publishedSite ? "Republish live site" : "Publish to sitezy.ai"}
            </SettingsPrimaryAction>
            {canOpenLive ? (
              <SettingsSecondaryAction type="button" onClick={handleOpenLive}>
                <ExternalLink size={14} />
                Open live site
              </SettingsSecondaryAction>
            ) : null}
            <span className="text-[12px] leading-6 text-[var(--text-tertiary)]">
              {publishedSite
                ? `${publishedSite.liveUrl} · ${publishedSite.deploymentCount} deployment${publishedSite.deploymentCount === 1 ? "" : "s"}`
                : "No live deployment yet."}
            </span>
          </SettingsActionRow>

          {publishedSite ? (
            <SettingsGrid>
              <div className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">
                  <Globe2 size={13} />
                  Sitezy URL
                </div>
                <p className="mt-3 text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{publishedSite.siteUrl}</p>
                <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                  Default live hostname: {publishedSite.subdomain}.sitezy.ai
                </p>
              </div>

              <div className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">
                  <CheckCircle2 size={13} />
                  Current live target
                </div>
                <p className="mt-3 text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {publishedSite.primaryDomain || publishedSite.siteUrl}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                  Last published {formatTimestamp(publishedSite.lastPublishedAt)}
                </p>
              </div>
            </SettingsGrid>
          ) : (
            <SettingsPlaceholder
              title="No live site yet"
              body="Publish the selected project once to create its permanent sitezy.ai URL and its deployment history."
            />
          )}
        </div>
      </SettingsGroup>

      <SettingsGroup title="SEO" body="Control the default search and share metadata used by exports and published sites for the selected project.">
        {!selectedProject ? (
          <SettingsPlaceholder title="Select a project" body="Choose a project above to edit its SEO settings." />
        ) : (
          <div className="space-y-5">
            <SettingsGrid>
              <SettingsField label="Site title" hint="Home uses this directly. Other pages publish as `Page — Site title`.">
                <SettingsInput
                  value={seoDraft.siteTitle}
                  onChange={(event) =>
                    setSeoDraft((current) => ({ ...current, siteTitle: event.target.value }))
                  }
                  placeholder={selectedProject.name}
                />
              </SettingsField>

              <SettingsField label="Canonical base URL" hint="Used for canonical tags and sitemap generation.">
                <SettingsInput
                  value={seoDraft.canonicalUrl}
                  onChange={(event) =>
                    setSeoDraft((current) => ({ ...current, canonicalUrl: event.target.value }))
                  }
                  placeholder={effectiveSeoBaseUrl || "https://www.yourdomain.com"}
                />
              </SettingsField>
            </SettingsGrid>

            <SettingsField label="Site description" hint="Used as the default page description and social description.">
              <SettingsTextarea
                value={seoDraft.siteDescription}
                onChange={(event) =>
                  setSeoDraft((current) => ({ ...current, siteDescription: event.target.value }))
                }
                placeholder="Write the default description search engines and link previews should use."
                className="min-h-[112px]"
              />
            </SettingsField>

            <SettingsGrid>
              <SettingsField label="Open Graph image URL" hint="Shown when pages are shared in social apps.">
                <SettingsInput
                  value={seoDraft.ogImageUrl}
                  onChange={(event) =>
                    setSeoDraft((current) => ({ ...current, ogImageUrl: event.target.value }))
                  }
                  placeholder="https://images.yourdomain.com/social-card.jpg"
                />
              </SettingsField>

              <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4">
                <div>
                  <h3 className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Noindex published site</h3>
                  <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">
                    Prevent search engines from indexing this project while it is private or in review.
                  </p>
                </div>
                <SettingsToggle
                  checked={seoDraft.noindex}
                  onChange={(noindex) => setSeoDraft((current) => ({ ...current, noindex }))}
                />
              </div>
            </SettingsGrid>

            <div className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4 text-[13px] leading-6 text-[var(--text-secondary)]">
              <p>
                Effective base URL: <span className="font-medium text-[var(--text-primary)]">{seoDraft.canonicalUrl.trim() || effectiveSeoBaseUrl}</span>
              </p>
              <p className="mt-2">
                {seoSaving ? "Saving project SEO…" : "Project SEO autosaves and is used by both hosted publish and ZIP export."}
              </p>
            </div>
          </div>
        )}
      </SettingsGroup>

      <SettingsGroup title="Custom domains" body="Attach your own hostname after publishing. Start by pointing a CNAME to the Sitezy host below.">
        {!publishedSite ? (
          <SettingsPlaceholder
            title="Publish before connecting a domain"
            body="A project needs a live sitezy.ai URL before it can accept a custom hostname."
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">DNS target</p>
              <p className="mt-2 text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{sitezyTarget}</p>
              <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                Create a CNAME record for your chosen host, point it to {sitezyTarget}, then come back here and verify DNS.
              </p>
            </div>

            <SettingsField label="Add domain" hint="Example: www.yourbrand.com">
              <div className="flex flex-col gap-3 md:flex-row">
                <SettingsInput
                  value={domainDraft}
                  onChange={(event) => setDomainDraft(event.target.value)}
                  placeholder="www.yourbrand.com"
                  className="flex-1"
                />
                <SettingsPrimaryAction type="button" onClick={() => void handleAddDomain()} disabled={!domainDraft.trim() || domainSubmitting}>
                  {domainSubmitting ? <Loader2 size={14} className="spin" /> : <Globe2 size={14} />}
                  Add domain
                </SettingsPrimaryAction>
              </div>
            </SettingsField>

            {publishedSite.domains.length ? (
              <div className="space-y-3">
                {publishedSite.domains.map((domain) => {
                  const busy = domainActionId === domain.id;
                  return (
                    <div
                      key={domain.id}
                      className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{domain.hostname}</p>
                            <SettingsStatus tone={domainTone(domain.status)}>
                              {domain.status === "active"
                                ? "Active"
                                : domain.status === "verifying"
                                ? "Verifying"
                                : domain.status === "failed"
                                ? "Failed verification"
                                : "Pending DNS"}
                            </SettingsStatus>
                            {domain.isPrimary ? <SettingsStatus tone="muted">Primary</SettingsStatus> : null}
                          </div>
                          <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                            {domain.status === "active"
                              ? `Verified ${formatTimestamp(domain.verifiedAt)} · SSL will follow the verified hostname automatically.`
                              : `Expected CNAME target: ${sitezyTarget}`}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {domain.status !== "active" ? (
                            <SettingsSecondaryAction type="button" onClick={() => void handleDomainAction(domain.id, "verify")} disabled={busy}>
                              {busy ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                              Verify DNS
                            </SettingsSecondaryAction>
                          ) : null}
                          {!domain.isPrimary && domain.status === "active" ? (
                            <SettingsSecondaryAction type="button" onClick={() => void handleDomainAction(domain.id, "set_primary")} disabled={busy}>
                              {busy ? <Loader2 size={14} className="spin" /> : <Globe2 size={14} />}
                              Set primary
                            </SettingsSecondaryAction>
                          ) : null}
                          <SettingsSecondaryAction type="button" onClick={() => void handleDomainAction(domain.id, "remove")} disabled={busy}>
                            {busy ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                            Remove
                          </SettingsSecondaryAction>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </SettingsGroup>

      <SettingsGroup title="Deployments" body="Each publish stores a versioned production snapshot so you can see what is currently live.">
        {!publishedSite ? (
          <SettingsPlaceholder
            title="No deployments yet"
            body="Once a project is published, its deployment history will appear here."
          />
        ) : deploymentsLoading ? (
          <div className="flex items-center gap-3 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4 text-[13px] text-[var(--text-secondary)]">
            <Loader2 size={14} className="spin" />
            Loading deployment history…
          </div>
        ) : deployments.length ? (
          <div className="space-y-3">
            {deployments.map((deployment) => (
              <div
                key={deployment.id}
                className="flex flex-col gap-4 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Version {deployment.versionNumber}</p>
                      <SettingsStatus tone={deploymentTone(deployment.status)}>
                        {deployment.status === "published" ? "Published" : deployment.status === "failed" ? "Failed" : "Publishing"}
                      </SettingsStatus>
                      {deployment.sourceDeploymentId ? <SettingsStatus tone="muted">Republished snapshot</SettingsStatus> : null}
                    </div>
                    <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                      {deployment.pageCount} pages · {formatTimestamp(deployment.publishedAt || deployment.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[var(--fg-muted)]">
                    <span className="truncate">{deployment.publishedUrl}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <SettingsSecondaryAction
                    type="button"
                    onClick={() => void handleRestoreDeployment(deployment.id, "draft", deployment.versionNumber)}
                    disabled={Boolean(deploymentActionId) || deployment.status !== "published"}
                  >
                    {deploymentActionId === `${deployment.id}:draft` ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
                    Restore to draft
                  </SettingsSecondaryAction>
                  <SettingsSecondaryAction
                    type="button"
                    onClick={() => void handleRestoreDeployment(deployment.id, "republish", deployment.versionNumber)}
                    disabled={Boolean(deploymentActionId) || deployment.status !== "published"}
                  >
                    {deploymentActionId === `${deployment.id}:republish` ? <Loader2 size={14} className="spin" /> : <Rocket size={14} />}
                    Republish version
                  </SettingsSecondaryAction>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SettingsPlaceholder
            title="No deployments yet"
            body="Publish the selected project to create the first versioned deployment."
          />
        )}
      </SettingsGroup>

      <SettingsResetRow onReset={() => setDraft(defaultUserSettings.exportDeployment)} disabled={!canReset} />
    </SettingsStack>
  );
}
