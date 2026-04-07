"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserAvatarMenu } from "@/components/ui/UserAvatarMenu";
import { getPrimaryAppLabelForRole, getPrimaryAppPathForRole } from "@/lib/app-routing";
import { useAppStore } from "@/lib/store";
import {
  applyUserSettingsToDocument,
  broadcastUserSettings,
  cacheUserSettings,
  mergeUserSettings,
  readCachedUserSettings,
} from "@/lib/settings";
import type { CurrentBetaAccess, Project, UserAccountProfile, UserSettings, UserSettingsPayload } from "@/types";
import { SettingsContentPanel } from "./SettingsContentPanel";
import { SettingsSidebarNav } from "./SettingsSidebarNav";
import { getSettingsSectionsForRole, SETTINGS_SECTION_COPY, type SettingsSectionKey } from "./constants";
import { SettingsSectionHeading } from "./ui";
import { AccountSection } from "./sections/AccountSection";
import { WorkspaceSection } from "./sections/WorkspaceSection";
import { AISettingsSection } from "./sections/AISettingsSection";
import { CreativeModeSection } from "./sections/CreativeModeSection";
import { ProjectDefaultsSection } from "./sections/ProjectDefaultsSection";
import { ExportDeploymentSection } from "./sections/ExportDeploymentSection";
import { IntegrationsSection } from "./sections/IntegrationsSection";
import { BillingSection } from "./sections/BillingSection";
import { ExperimentalSection } from "./sections/ExperimentalSection";
import { SecuritySection } from "./sections/SecuritySection";
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
  const setApiError = useAppStore((s) => s.setApiError);
  const availableSections = useMemo(() => getSettingsSectionsForRole(currentAccess.role), [currentAccess.role]);
  const primaryAppPath = useMemo(() => getPrimaryAppPathForRole(currentAccess.role), [currentAccess.role]);
  const primaryAppLabel = useMemo(() => getPrimaryAppLabelForRole(currentAccess.role), [currentAccess.role]);
  const needsProjectHydration = useMemo(
    () => availableSections.some((section) => section.key === "project-defaults" || section.key === "export" || section.key === "media"),
    [availableSections]
  );

  const [currentSection, setCurrentSection] = useState<SettingsSectionKey>(() =>
    resolveSettingsSection(null, availableSections)
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

  // Settings page is brand-locked to dark — never let workspace theme flip it.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = "dark";
    return () => {
      if (previous) root.dataset.theme = previous;
    };
  }, []);

  useEffect(() => {
    if (needsProjectHydration && !hasHydratedProjects && !isHydratingProjects) {
      void hydrateProjects();
    }
  }, [hasHydratedProjects, hydrateProjects, isHydratingProjects, needsProjectHydration]);

  const updateSectionRoute = useCallback(
    (nextSection: SettingsSectionKey) => {
      const params = new URLSearchParams(searchParams.toString());
      const defaultSection = availableSections[0]?.key ?? "account";
      if (nextSection === defaultSection) {
        params.delete("section");
      } else {
        params.set("section", nextSection);
      }
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [availableSections, pathname, router, searchParams]
  );

  const handleSelectSection = useCallback(
    (nextSection: SettingsSectionKey) => {
      setCurrentSection(nextSection);
      updateSectionRoute(nextSection);
    },
    [updateSectionRoute]
  );

  useEffect(() => {
    const requestedSection = searchParams.get("section");
    const nextSection = resolveSettingsSection(requestedSection, availableSections);
    setCurrentSection(nextSection);

    if (requestedSection && !availableSections.some((section) => section.key === requestedSection)) {
      updateSectionRoute(nextSection);
    }
  }, [availableSections, searchParams, updateSectionRoute]);

  useEffect(() => {
    const cached = readCachedUserSettings();
    const nextSettings = cached ?? initialPayload.settings;
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    setAccount(initialPayload.account);
    cacheUserSettings(nextSettings);
    broadcastUserSettings(nextSettings);
    document.documentElement.dataset.theme = "dark";
  }, [initialPayload.account, initialPayload.settings]);

  const orderedProjects = useMemo<Project[]>(() => {
    return [...projects].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [projects]);

  const previewPatch = useCallback((patch: Partial<UserSettings>) => {
    const next = mergeUserSettings(settingsRef.current, patch);
    settingsRef.current = next;
    setSettings(next);
    cacheUserSettings(next);
    // Skip applyUserSettingsToDocument here — settings page stays dark.
    broadcastUserSettings(next);
    document.documentElement.dataset.theme = "dark";
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
        broadcastUserSettings(payload.settings);
        document.documentElement.dataset.theme = "dark";
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

  const sidebarCopy = useMemo(() => {
    if (currentAccess.role === "admin") {
      return {
        title: "Admin Settings",
        body: "Keep your personal admin profile, workspace behavior, and account security separate from the control plane.",
      };
    }

    if (currentAccess.role === "customer_service") {
      return {
        title: "Customer Service Settings",
        body: "Adjust your workspace behavior and personal account security without pulling support operators through customer-only setup.",
      };
    }

    return {
      title: "Settings",
      body: "Manage your account, workspace defaults, AI behavior, and export preferences.",
    };
  }, [currentAccess.role]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#06080C] text-white">
      <header className="relative z-40 shrink-0 border-b border-white/[0.05] bg-[#0B0D12]/90 backdrop-blur-xl">
        <div className="sz-grid-shell flex h-16 items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="flex items-center">
              <span className="text-[15px] font-semibold tracking-[-0.03em] text-white">Sitezy</span>
            </Link>

            <div className="hidden h-5 w-px bg-white/10 md:block" />

            <button
              type="button"
              onClick={() => router.push(primaryAppPath)}
              className="group hidden items-center gap-2 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[12.5px] font-medium text-white/65 transition-all hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white md:flex"
            >
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
              {primaryAppLabel}
            </button>

            <div className="hidden h-5 w-px bg-white/10 md:block" />

            <p className="hidden text-[12.5px] font-medium tracking-[-0.005em] text-white/85 md:block">Settings</p>
          </div>

          <div className="flex items-center gap-3">
            <UserAvatarMenu initialAccount={account} showStudioShortcut={false} />
          </div>
        </div>
      </header>

      <main className="sz-grid-shell flex-1 min-h-0 py-5 md:py-6">
        <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[260px,minmax(0,1fr)] xl:gap-6">
          <div className="hidden min-h-0 xl:block xl:h-full">
            <SettingsSidebarNav
              sections={availableSections}
              current={currentSection}
              onSelect={handleSelectSection}
              title={sidebarCopy.title}
              body={sidebarCopy.body}
              className="h-full"
            />
          </div>

          <SettingsContentPanel
            className="h-full"
          >
            <div className="mb-7 xl:hidden">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5B8CFF]">
                {sidebarCopy.title}
              </p>
              <div className="sz-scroll-hidden -mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {availableSections.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => handleSelectSection(section.key)}
                    className={`whitespace-nowrap rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all ${
                      currentSection === section.key
                        ? "bg-white/[0.06] text-white"
                        : "bg-white/[0.02] text-white/55 hover:bg-white/[0.04] hover:text-white/85"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
              <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            </div>

            <SettingsSectionHeading
              title={SETTINGS_SECTION_COPY[currentSection].title}
              body={SETTINGS_SECTION_COPY[currentSection].body}
            />

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
              <AISettingsSection value={settings.ai} onSave={persistPatch} />
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
              <IntegrationsSection value={settings.integrations} onSave={persistPatch} />
            ) : null}

            {currentSection === "billing" ? (
              <BillingSection value={settings.billing} />
            ) : null}

            {currentSection === "experimental" ? (
              <ExperimentalSection value={settings.experimental} onSave={persistPatch} />
            ) : null}

            {currentSection === "security" ? <SecuritySection account={account} onAccountChange={setAccount} /> : null}

            {currentSection === "support" ? <SupportSection /> : null}
          </SettingsContentPanel>
        </div>
      </main>
    </div>
  );
}
