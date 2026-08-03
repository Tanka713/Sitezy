"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import {
  normalizeProjectIntegrationSettings,
  resolveEffectiveProjectLeadCaptureSettings,
} from "@/lib/lead-capture";
import { defaultUserSettings } from "@/lib/settings";
import { SitezyButton } from "@/components/ui/sitezy";
import type { Project, ProjectIntegrationSettings, UserSettings } from "@/types";
import {
  SettingsField,
  SettingsGroup,
  SettingsInput,
  SettingsPlaceholder,
  SettingsResetRow,
  SettingsSegmented,
  SettingsStack,
  SettingsStatus,
} from "../ui";
import { useSettingsSectionAutosave } from "../useSettingsSectionAutosave";

type StatusTone = "success" | "error" | "muted";

function formatCaptureMode(value: "sitezy" | "disabled") {
  return value === "sitezy" ? "Sitezy" : "Disabled";
}

export function IntegrationsSection({
  value,
  onSave,
  project = null,
  ownerEmail = null,
  onSaveProjectLeadCapture,
}: {
  value: UserSettings["integrations"];
  onSave: (patch: Partial<UserSettings>) => Promise<void>;
  project?: Project | null;
  ownerEmail?: string | null;
  onSaveProjectLeadCapture?: (
    projectId: string,
    integrationSettings: Partial<ProjectIntegrationSettings>
  ) => Promise<ProjectIntegrationSettings | void>;
}) {
  const { draft, status, setDraft } = useSettingsSectionAutosave({
    sectionKey: "integrations",
    value,
    onSave,
    errorMessage: "We couldn't save integrations.",
  });
  const canReset = JSON.stringify(draft) !== JSON.stringify(defaultUserSettings.integrations);
  const normalizedProjectSettings = useMemo(
    () => normalizeProjectIntegrationSettings(project?.integrationSettings),
    [project?.integrationSettings]
  );
  const [projectDraft, setProjectDraft] = useState<ProjectIntegrationSettings>(normalizedProjectSettings);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectStatus, setProjectStatus] = useState<{ tone: StatusTone; message: string } | null>(null);
  const canSaveProject =
    Boolean(project && onSaveProjectLeadCapture) &&
    JSON.stringify(projectDraft) !== JSON.stringify(normalizedProjectSettings);
  const effectiveProjectSettings = useMemo(
    () =>
      project
        ? resolveEffectiveProjectLeadCaptureSettings(projectDraft, { integrations: draft }, ownerEmail)
        : null,
    [draft, ownerEmail, project, projectDraft]
  );

  useEffect(() => {
    setProjectDraft(normalizedProjectSettings);
  }, [normalizedProjectSettings]);

  useEffect(() => {
    setProjectStatus(null);
  }, [project?.id]);

  async function handleSaveProjectRules() {
    if (!project || !onSaveProjectLeadCapture) return;
    setProjectSaving(true);
    setProjectStatus(null);
    try {
      const savedSettings = await onSaveProjectLeadCapture(project.id, projectDraft);
      setProjectDraft(normalizeProjectIntegrationSettings(savedSettings ?? projectDraft));
      setProjectStatus({ tone: "success", message: `${project.name} lead rules saved.` });
    } catch (error) {
      setProjectStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "We couldn't save project lead capture.",
      });
    } finally {
      setProjectSaving(false);
    }
  }

  return (
    <SettingsStack>
      {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

      <SettingsGroup
        title="Analytics & lead capture"
        body="Set the account-level defaults new and existing projects should inherit for Sitezy-managed forms, newsletter signup, and owner notifications."
        data-settings-anchor="lead-capture"
      >
        <div className="space-y-5">
          <SettingsField label="GA4 measurement ID">
            <SettingsInput
              value={draft.analytics.ga4.measurementId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  analyticsId: event.target.value,
                  analytics: {
                    ...current.analytics,
                    ga4: {
                      ...current.analytics.ga4,
                      measurementId: event.target.value,
                      enabled: Boolean(event.target.value.trim()),
                    },
                  },
                }))
              }
              placeholder="G-XXXXXXXXXX"
            />
          </SettingsField>

          <SettingsField label="Meta Pixel ID">
            <SettingsInput
              value={draft.analytics.metaPixel.pixelId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  analytics: {
                    ...current.analytics,
                    metaPixel: {
                      ...current.analytics.metaPixel,
                      pixelId: event.target.value,
                      enabled: Boolean(event.target.value.trim()),
                    },
                  },
                }))
              }
              placeholder="123456789012345"
            />
          </SettingsField>

          <SettingsField label="Sitezy analytics">
            <SettingsSegmented
              value={draft.analytics.enableSitezyAnalytics ? "enabled" : "disabled"}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  analytics: {
                    ...current.analytics,
                    enableSitezyAnalytics: value === "enabled",
                  },
                }))
              }
              columns={2}
              options={[
                {
                  value: "enabled",
                  label: "Enabled",
                  description: "Track first-party sessions, page views, and lead conversions in Sitezy.",
                },
                {
                  value: "disabled",
                  label: "Disabled",
                  description: "Only inject external analytics tags you configure above.",
                },
              ]}
            />
          </SettingsField>

          <SettingsField label="Lead notification email">
            <SettingsInput
              type="email"
              value={draft.notificationEmail}
              onChange={(event) => setDraft((current) => ({ ...current, notificationEmail: event.target.value }))}
              placeholder="notifications@company.com"
            />
          </SettingsField>

          <SettingsField label="Contact capture default">
            <SettingsSegmented
              value={draft.contactCaptureDefault}
              onChange={(contactCaptureDefault) =>
                setDraft((current) => ({ ...current, contactCaptureDefault }))
              }
              columns={2}
              options={[
                {
                  value: "sitezy",
                  label: "Sitezy",
                  description: "Store submissions in Sitezy and notify the owner email.",
                },
                {
                  value: "disabled",
                  label: "Disabled",
                  description: "Keep Sitezy forms visible but block backend submission.",
                },
              ]}
            />
          </SettingsField>

          <SettingsField label="Newsletter capture default">
            <SettingsSegmented
              value={draft.newsletterCaptureDefault}
              onChange={(newsletterCaptureDefault) =>
                setDraft((current) => ({ ...current, newsletterCaptureDefault }))
              }
              columns={2}
              options={[
                {
                  value: "sitezy",
                  label: "Sitezy",
                  description: "Save subscribers in Sitezy and send owner notifications.",
                },
                {
                  value: "disabled",
                  label: "Disabled",
                  description: "Leave newsletter blocks visible without storing signups.",
                },
              ]}
            />
          </SettingsField>

          <SettingsField label="Primary domain">
            <SettingsInput
              value={draft.primaryDomain}
              onChange={(event) => setDraft((current) => ({ ...current, primaryDomain: event.target.value }))}
              placeholder="studio.yourdomain.com"
            />
          </SettingsField>

          <SettingsField label="Webhook delivery timeout">
            <SettingsInput
              type="number"
              min={3}
              max={60}
              value={String(draft.webhooks.deliveryTimeoutSeconds)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  webhooks: {
                    ...current.webhooks,
                    deliveryTimeoutSeconds: Number(event.target.value || current.webhooks.deliveryTimeoutSeconds),
                  },
                }))
              }
              placeholder="10"
            />
          </SettingsField>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="Project lead capture"
        body={
          project
            ? `These rules apply only to ${project.name} and override the account defaults above when needed.`
            : "Open a project from the editor or Leads workspace to adjust per-project lead capture rules here."
        }
        data-settings-anchor="project-lead-capture"
      >
        {project ? (
          <div className="space-y-5">
            <div className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Currently editing</p>
              <p className="mt-2 text-[16px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{project.name}</p>
              {effectiveProjectSettings ? (
                <p className="mt-2 text-[12.5px] leading-6 text-[var(--text-secondary)]">
                  Effective now: forms {formatCaptureMode(effectiveProjectSettings.contactCapture)}, newsletter {formatCaptureMode(effectiveProjectSettings.newsletterCapture)}, notifications to {effectiveProjectSettings.notificationEmail || "no recipient"}.
                </p>
              ) : null}
            </div>

            <SettingsField label="Notification email">
              <SettingsInput
                type="email"
                value={projectDraft.notificationEmail ?? ""}
                onChange={(event) =>
                  setProjectDraft((current) => ({
                    ...current,
                    notificationEmail: event.target.value.trim() ? event.target.value : null,
                  }))
                }
                placeholder={draft.notificationEmail || ownerEmail || "owner@company.com"}
              />
            </SettingsField>

            <SettingsField label="Contact capture">
              <SettingsSegmented
                value={projectDraft.contactCapture}
                onChange={(contactCapture) => setProjectDraft((current) => ({ ...current, contactCapture }))}
                columns={3}
                options={[
                  { value: "inherit", label: "Inherit", description: "Use the account default." },
                  { value: "sitezy", label: "Sitezy", description: "Store and notify in Sitezy." },
                  { value: "disabled", label: "Disabled", description: "Block backend submission." },
                ]}
              />
            </SettingsField>

            <SettingsField label="Newsletter capture">
              <SettingsSegmented
                value={projectDraft.newsletterCapture}
                onChange={(newsletterCapture) => setProjectDraft((current) => ({ ...current, newsletterCapture }))}
                columns={3}
                options={[
                  { value: "inherit", label: "Inherit", description: "Use the account default." },
                  { value: "sitezy", label: "Sitezy", description: "Store and notify in Sitezy." },
                  { value: "disabled", label: "Disabled", description: "Keep signup UI visible only." },
                ]}
              />
            </SettingsField>

            {projectStatus ? <SettingsStatus tone={projectStatus.tone}>{projectStatus.message}</SettingsStatus> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] leading-6 text-[var(--text-secondary)]">
                These rules update preview immediately and apply to the published site on the next submit.
              </p>
              <SitezyButton
                type="button"
                variant="primary"
                size="md"
                onClick={() => void handleSaveProjectRules()}
                disabled={!canSaveProject || projectSaving}
                className="sm:min-w-[190px] sm:justify-center"
              >
                {projectSaving ? <Save size={15} className="animate-pulse" /> : <Save size={15} />}
                Save project rules
              </SitezyButton>
            </div>
          </div>
        ) : (
          <SettingsPlaceholder
            title="No project in context"
            body="Open a project from the editor or Leads page, then come back here to set rules just for that project."
          />
        )}
      </SettingsGroup>

      <SettingsPlaceholder
        title="Live domains are managed in Export & Deployment"
        body="Use the Export & Deployment section to publish to sitezy.ai, connect custom domains, and manage live deployment targets."
      />

      <SettingsResetRow onReset={() => setDraft(defaultUserSettings.integrations)} disabled={!canReset} />
    </SettingsStack>
  );
}
