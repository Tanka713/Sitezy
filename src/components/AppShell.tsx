"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, History } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AppRouteLoading } from "@/components/app/AppRouteLoading";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Editor } from "@/components/editor/Editor";
import { DB_READ_001, logAppError, normalizeError } from "@/lib/errors";
import { SitezyButton } from "@/components/ui/sitezy";
import type { CurrentBetaAccess, UserAccountProfile } from "@/types";

export function AppShell({
  userId,
  currentAccess = null,
  initialAccount = null,
}: {
  userId: string;
  currentAccess?: CurrentBetaAccess | null;
  initialAccount?: UserAccountProfile | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isOpeningRequestedProject, setIsOpeningRequestedProject] = useState(false);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const openingProjectId = useAppStore((s) => s.openingProjectId);
  const resumeProjectId = useAppStore((s) => s.resumeProjectId);
  const generationStatus = useAppStore((s) => s.generationStatus);
  const projects = useAppStore((s) => s.projects);
  const openProject = useAppStore((s) => s.openProject);
  const hydrateProjects = useAppStore((s) => s.hydrateProjects);
  const hasHydratedProjects = useAppStore((s) => s.hasHydratedProjects);
  const setSessionUserId = useAppStore((s) => s.setSessionUserId);
  const restoreLocalProject = useAppStore((s) => s.restoreLocalProject);
  const resumeProjectEntry = useAppStore((s) => s.resumeProjectEntry);
  const dismissResumeProject = useAppStore((s) => s.dismissResumeProject);
  const syncProjectFromServer = useAppStore((s) => s.syncProjectFromServer);
  const requestedProjectId = useMemo(() => {
    const rawProjectId = searchParams.get("projectId");
    return rawProjectId && rawProjectId.trim() ? rawProjectId.trim() : null;
  }, [searchParams]);
  const requestedSurface = useMemo(() => {
    const rawSurface = searchParams.get("surface");
    return rawSurface && rawSurface.trim() ? rawSurface.trim() : null;
  }, [searchParams]);
  const forceWorkspaceSurface = requestedSurface === "workspace";
  const openingProjectName = useMemo(() => (
    openingProjectId
      ? projects.find((project) => project.id === openingProjectId)?.name ?? null
      : null
  ), [openingProjectId, projects]);
  const loadingTitle = openingProjectName
    ? `Opening ${openingProjectName}`
    : requestedProjectId || openingProjectId
    ? "Opening your editor"
    : "Opening your workspace";
  const isGenerationOverlayActive =
    generationStatus === "blueprint" ||
    generationStatus === "pages" ||
    generationStatus === "normalizing";

  useEffect(() => {
    setMounted(true);
    setSessionUserId(userId);
    restoreLocalProject(userId);
  }, [restoreLocalProject, setSessionUserId, userId]);

  useEffect(() => {
    if (!hasHydratedProjects) {
      void hydrateProjects();
    }
  }, [hasHydratedProjects, hydrateProjects]);

  useEffect(() => {
    if (!mounted || !hasHydratedProjects || !currentProjectId) return;

    void syncProjectFromServer(currentProjectId, {
      preserveEditor: true,
      preserveHistory: true,
    }).catch((error) => {
      logAppError(normalizeError(error, DB_READ_001, {
        action: "resyncCurrentProjectOnBoot",
        projectId: currentProjectId,
      }));
    });
  }, [currentProjectId, hasHydratedProjects, mounted, syncProjectFromServer]);

  useEffect(() => {
    if (!mounted || !hasHydratedProjects || !requestedProjectId) {
      setIsOpeningRequestedProject(false);
      return;
    }

    if (currentProjectId === requestedProjectId) {
      setIsOpeningRequestedProject(false);
      return;
    }

    if (!projects.some((project) => project.id === requestedProjectId)) {
      setIsOpeningRequestedProject(false);
      return;
    }

    let cancelled = false;
    setIsOpeningRequestedProject(true);

    void openProject(requestedProjectId)
      .catch((error) => {
        if (cancelled) return;
        logAppError(normalizeError(error, DB_READ_001, {
          action: "openRequestedProjectFromRoute",
          projectId: requestedProjectId,
        }));
      })
      .finally(() => {
        if (!cancelled) {
          setIsOpeningRequestedProject(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentProjectId, hasHydratedProjects, mounted, openProject, projects, requestedProjectId]);

  useEffect(() => {
    if (!requestedProjectId || currentProjectId !== requestedProjectId) return;
    router.replace("/studio", { scroll: false });
  }, [currentProjectId, requestedProjectId, router]);

  useEffect(() => {
    if (!forceWorkspaceSurface) return;
    dismissResumeProject();
    router.replace("/studio", { scroll: false });
  }, [dismissResumeProject, forceWorkspaceSurface, router]);

  const resumeProjectName = projects.find((project) => project.id === resumeProjectId)?.name ?? "your last project";

  if (!mounted || (!hasHydratedProjects && !currentProjectId) || isOpeningRequestedProject || Boolean(openingProjectId)) {
    return (
      <AppRouteLoading
        eyebrow={openingProjectId ? "Project" : "Loading"}
        title={loadingTitle}
      />
    );
  }

  if (!currentProjectId && resumeProjectId && !requestedProjectId && !forceWorkspaceSurface && !isGenerationOverlayActive) {
    return (
      <div className="sz-page-shell bg-[var(--surface-shell)]">
        <div className="sz-topbar sz-page-header">
          <div className="sz-grid-shell flex h-20 items-center">
            <span className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Sitezy</span>
          </div>
        </div>

        <div className="sz-page-scroll">
          <div className="sz-grid-shell flex min-h-full items-center justify-center py-16">
            <div className="w-full max-w-[560px] rounded-[32px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-8 shadow-[var(--shadow-lg)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[var(--border-default)] bg-[rgba(107,119,255,0.12)] text-[var(--text-accent)] shadow-[0_18px_44px_rgba(84,96,255,0.18)]">
                <History size={20} />
              </div>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Resume</p>
              <h1 className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                Pick up where you left off?
              </h1>
              <p className="mt-3 text-[15px] leading-7 text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{resumeProjectName}</span> is ready to reopen in the editor,
                or you can head to your workspace and browse projects first.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <SitezyButton variant="primary" size="lg" onClick={() => void resumeProjectEntry()} className="sm:flex-1">
                  Resume last project
                  <ArrowRight size={16} />
                </SitezyButton>
                <SitezyButton variant="secondary" size="lg" onClick={dismissResumeProject} className="sm:flex-1">
                  Go to workspace
                </SitezyButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return currentProjectId
    ? <Editor initialAccount={initialAccount} />
    : <Dashboard currentAccess={currentAccess} initialAccount={initialAccount} />;
}
