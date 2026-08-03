"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserAvatarMenu } from "@/components/ui/UserAvatarMenu";
import { getAppReturnLabel, resolveAppReturnHref } from "@/lib/app-navigation";
import { getPrimaryAppLabelForRole, getPrimaryAppPathForRole } from "@/lib/app-routing";
import { useAppStore } from "@/lib/store";
import {
  applyUserSettingsToDocument,
  broadcastUserSettings,
  cacheUserSettings,
  mergeUserSettings,
  readCachedUserSettings,
} from "@/lib/settings";
import type {
  CurrentBetaAccess,
  Project,
  ProjectIntegrationSettings,
  UserAccountProfile,
  UserSettings,
  UserSettingsPayload,
} from "@/types";
import { SettingsContentPanel } from "./SettingsContentPanel";
import { SettingsSidebarNav } from "./SettingsSidebarNav";
import { getSettingsSectionsForRole, type SettingsSectionKey } from "./constants";
import { AccountSection } from "./sections/AccountSection";
import { WorkspaceSection } from "./sections/WorkspaceSection";
import { AISettingsSection } from "./sections/AISettingsSection";
import { CreativeModeSection } from "./sections/CreativeModeSection";
import { ProjectDefaultsSection } from "./sections/ProjectDefaultsSection";
import { ExportDeploymentSection } from "./sections/ExportDeploymentSection";
import { IntegrationsSection } from "./sections/IntegrationsSection";
import { BillingSection } from "./sections/BillingSection";
import { ExperimentalSection } from "./sections/ExperimentalSection";
import { SupportSection } from "./sections/SupportSection";
import { MediaLibrarySection } from "./sections/MediaLibrarySection";
import { normalizeError, logAppError, API_UNKNOWN_001 } from "@/lib/errors";

type StatusTone = "success" | "error" | "muted";

function resolveSettingsSection(
  requestedSection: string | null,
  availableSections: readonly { key: SettingsSectionKey; label: string }[]
): SettingsSectionKey {
  const matched = availableSections.find((section) => section.key === requestedSection);
  return matched?.key ?? availableSections[0]?.key ?? "account";
}

function resolveSettingsFocus(requestedFocus: string | null): string | null {
  return requestedFocus && requestedFocus.trim() ? requestedFocus.trim() : null;
}

export function SettingsPage({
  userId,
  initialPayload,
  currentAccess,
}: {
  userId: string;
  initialPayload: UserSettingsPayload;
  currentAccess: CurrentBetaAccess;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSessionUserId = useAppStore((s) => s.setSessionUserId);
  const hydrateProjects = useAppStore((s) => s.hydrateProjects);
  const hasHydratedProjects = useAppStore((s) => s.hasHydratedProjects);
  const isHydratingProjects = useAppStore((s) => s.isHydratingProjects);
  const projects = useAppStore((s) => s.projects);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const syncProjectFromServer = useAppStore((s) => s.syncProjectFromServer);
  const setApiError = useAppStore((s) => s.setApiError);
  const availableSections = useMemo(() => getSettingsSectionsForRole(currentAccess.role), [currentAccess.role]);
  const primaryAppPath = useMemo(() => getPrimaryAppPathForRole(currentAccess.role), [currentAccess.role]);
  const primaryAppLabel = useMemo(() => getPrimaryAppLabelForRole(currentAccess.role), [currentAccess.role]);
  const requestedReturnTo = searchParams.get("returnTo");
  const requestedProjectId = useMemo(() => {
    const rawProjectId = searchParams.get("projectId");
    return rawProjectId && rawProjectId.trim() ? rawProjectId.trim() : null;
  }, [searchParams]);
  const settingsProjectId = requestedProjectId ?? currentProjectId;
  const needsIntegrationProjectHydration = Boolean(settingsProjectId);
  const backHref = useMemo(
    () => resolveAppReturnHref(requestedReturnTo, primaryAppPath),
    [primaryAppPath, requestedReturnTo]
  );
  const backLabel = useMemo(
    () => getAppReturnLabel(backHref, primaryAppLabel),
    [backHref, primaryAppLabel]
  );
  const needsProjectHydration = useMemo(
    () =>
      availableSections.some(
        (section) =>
          section.key === "project-defaults" ||
          section.key === "export" ||
          section.key === "media" ||
          (section.key === "integrations" && needsIntegrationProjectHydration)
      ),
    [availableSections, needsIntegrationProjectHydration]
  );

  const [currentSection, setCurrentSection] = useState<SettingsSectionKey>(() =>
    resolveSettingsSection(searchParams.get("section"), availableSections)
  );
  const [focusTarget, setFocusTarget] = useState<string | null>(() =>
    resolveSettingsFocus(searchParams.get("focus"))
  );
  const [account, setAccount] = useState<UserAccountProfile>(initialPayload.account);
  const [settings, setSettings] = useState<UserSettings>(initialPayload.settings);
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    setSessionUserId(userId);
  }, [setSessionUserId, userId]);

  useEffect(() => {
    if (needsProjectHydration && !hasHydratedProjects && !isHydratingProjects) {
      void hydrateProjects();
    }
  }, [hasHydratedProjects, hydrateProjects, isHydratingProjects, needsProjectHydration]);

  useEffect(() => {
    router.prefetch(backHref);
  }, [backHref, router]);

  const updateSectionRoute = useCallback(
    (nextSection: SettingsSectionKey, focusId?: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      const defaultSection = availableSections[0]?.key ?? "account";
      if (nextSection === defaultSection) {
        params.delete("section");
      } else {
        params.set("section", nextSection);
      }
      if (focusId) params.set("focus", focusId);
      else params.delete("focus");
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [availableSections, pathname, router, searchParams]
  );

  const handleSelectSection = useCallback(
    (nextSection: SettingsSectionKey) => {
      setCurrentSection(nextSection);
      setFocusTarget(null);
      updateSectionRoute(nextSection, null);
    },
    [updateSectionRoute]
  );

  const handleNavigateToTarget = useCallback(
    ({ section, focusId }: { section: SettingsSectionKey; focusId?: string | null }) => {
      setCurrentSection(section);
      setFocusTarget(focusId ?? null);
      updateSectionRoute(section, focusId ?? null);
    },
    [updateSectionRoute]
  );

  useEffect(() => {
    const requestedSection = searchParams.get("section");
    const requestedFocus = searchParams.get("focus");
    const nextSection = resolveSettingsSection(requestedSection, availableSections);
    const nextFocus = resolveSettingsFocus(requestedFocus);
    setCurrentSection(nextSection);
    setFocusTarget(nextFocus);

    if (requestedSection && !availableSections.some((section) => section.key === requestedSection)) {
      updateSectionRoute(nextSection, nextFocus);
    }
  }, [availableSections, searchParams, updateSectionRoute]);

  useEffect(() => {
    if (!focusTarget) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-settings-anchor="${focusTarget}"]`);
      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "center" });

      const focusable = target.querySelector<HTMLElement>(
        "input, button, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      focusable?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [currentSection, focusTarget]);

  useEffect(() => {
    const cached = readCachedUserSettings();
    const nextSettings = cached
      ? mergeUserSettings(initialPayload.settings, { workspace: cached.workspace })
      : initialPayload.settings;
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    setAccount(initialPayload.account);
    cacheUserSettings(nextSettings);
    applyUserSettingsToDocument(nextSettings);
    broadcastUserSettings(nextSettings);
  }, [initialPayload.account, initialPayload.settings]);

  const orderedProjects = useMemo<Project[]>(() => {
    return [...projects].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [projects]);
  const integrationProject = useMemo(
    () => (settingsProjectId ? projects.find((project) => project.id === settingsProjectId) ?? null : null),
    [projects, settingsProjectId]
  );

  const previewPatch = useCallback((patch: Partial<UserSettings>) => {
    const next = mergeUserSettings(settingsRef.current, patch);
    settingsRef.current = next;
    setSettings(next);
    cacheUserSettings(next);
    applyUserSettingsToDocument(next);
    broadcastUserSettings(next);
  }, []);

  const persistPatch = useCallback(
    async (patch: Partial<UserSettings>) => {
      try {
        const response = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({ settings: patch }),
        });

        const payload = (await response.json().catch(() => ({}))) as Partial<UserSettingsPayload> & {
          error?: string;
          code?: string;
        };

        if (!response.ok || !payload.settings || !payload.account) {
          throw new Error(payload.error || "We couldn't save your settings.");
        }

        settingsRef.current = payload.settings;
        setSettings(payload.settings);
        setAccount(payload.account);
        cacheUserSettings(payload.settings);
        applyUserSettingsToDocument(payload.settings);
        broadcastUserSettings(payload.settings);
        setStatus(null);
      } catch (error) {
        const appErr = normalizeError(error, API_UNKNOWN_001, { action: "saveSettingsPatch" });
        logAppError(appErr);
        setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
        setStatus({ tone: "error", message: appErr.userMessage });
        throw appErr;
      }
    },
    [setApiError]
  );
  const persistProjectLeadCapture = useCallback(
    async (projectId: string, integrationSettings: Partial<ProjectIntegrationSettings>) => {
      try {
        const response = await fetch(`/api/projects/${projectId}/lead-capture`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(integrationSettings),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          integrationSettings?: ProjectIntegrationSettings;
          error?: string;
          code?: string;
        };

        if (!response.ok || !payload.integrationSettings) {
          throw new Error(payload.error || "We couldn't save project lead capture.");
        }

        await syncProjectFromServer(projectId, { preserveEditor: true, preserveHistory: true });
        return payload.integrationSettings;
      } catch (error) {
        const appErr = normalizeError(error, API_UNKNOWN_001, {
          action: "saveProjectLeadCaptureSettings",
          projectId,
        });
        logAppError(appErr);
        setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
        throw appErr;
      }
    },
    [setApiError, syncProjectFromServer]
  );

  const sidebarCopy = useMemo(() => {
    if (currentAccess.role === "admin") {
      return {
        title: "Admin Settings",
      };
    }

    if (currentAccess.role === "customer_service") {
      return {
        title: "Customer Service Settings",
      };
    }

    return {
      title: "Settings",
    };
  }, [currentAccess.role]);

      return (
    <div className="sz-page-shell text-[var(--text-primary)]">
      <header className="sz-topbar sz-page-header">
        <div className="sz-grid-shell grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="group hidden items-center gap-2 px-1 py-1 text-[12.5px] font-medium text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] md:flex"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              {backLabel}
            </button>
          </div>

          <Link href="/" className="flex items-center justify-self-center">
            <span className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Sitezy</span>
          </Link>

          <div className="flex items-center justify-self-end gap-3">
            <UserAvatarMenu initialAccount={account} showStudioShortcut={false} />
          </div>
        </div>
      </header>

      <main className="sz-page-body">
        <div className="sz-grid-shell grid h-full min-h-0 gap-5 py-5 md:py-6 xl:grid-cols-[260px,minmax(0,1fr)] xl:gap-6">
          <div className="hidden min-h-0 xl:block xl:h-full">
            <SettingsSidebarNav
              sections={availableSections}
              current={currentSection}
              onSelect={handleSelectSection}
              onNavigate={handleNavigateToTarget}
              title={sidebarCopy.title}
              className="h-full"
            />
          </div>

          <SettingsContentPanel
            className="h-full"
          >
            <div className="mb-7 xl:hidden">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--text-accent)]">
                {sidebarCopy.title}
              </p>
              <div className="sz-scroll-hidden -mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {availableSections.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => handleSelectSection(section.key)}
                    className={`whitespace-nowrap rounded-[10px] border px-3 py-1.5 text-[12px] font-medium transition-all ${
                      currentSection === section.key
                        ? "border-[var(--border-focus)] bg-[var(--accent-subtle)] text-[var(--text-primary)]"
                        : "border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
              <div className="sz-divider mt-6 w-full" />
            </div>

            {currentSection === "account" ? (
              <AccountSection account={account} onAccountChange={setAccount} />
            ) : null}

            {currentSection === "media" ? <MediaLibrarySection /> : null}

            {currentSection === "workspace" ? (
              <WorkspaceSection
                value={settings.workspace}
                onPreview={previewPatch}
                onSave={persistPatch}
              />
            ) : null}

            {currentSection === "ai" ? (
              <AISettingsSection
                value={settings.ai}
                onSave={persistPatch}
                experimental={settings.experimental}
              />
            ) : null}

            {currentSection === "creative" ? (
              <CreativeModeSection value={settings.creativeMode} onSave={persistPatch} />
            ) : null}

            {currentSection === "project-defaults" ? (
              <ProjectDefaultsSection value={settings.projectDefaults} onSave={persistPatch} />
            ) : null}

            {currentSection === "export" ? (
              <ExportDeploymentSection
                value={settings.exportDeployment}
                projects={orderedProjects}
                onSave={persistPatch}
              />
            ) : null}

            {currentSection === "integrations" ? (
              <IntegrationsSection
                value={settings.integrations}
                onSave={persistPatch}
                project={integrationProject}
                ownerEmail={account.email}
                onSaveProjectLeadCapture={persistProjectLeadCapture}
              />
            ) : null}

            {currentSection === "billing" ? (
              <BillingSection value={settings.billing} />
            ) : null}

            {currentSection === "experimental" ? (
              <ExperimentalSection value={settings.experimental} onSave={persistPatch} />
            ) : null}

            {currentSection === "support" ? <SupportSection /> : null}
          </SettingsContentPanel>
        </div>
      </main>
    </div>
  );
}
