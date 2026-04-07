"use client";
import { useEffect, useState } from "react";
import { ArrowRight, History, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
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
  const [mounted, setMounted] = useState(false);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const resumeProjectId = useAppStore((s) => s.resumeProjectId);
  const projects = useAppStore((s) => s.projects);
  const hydrateProjects = useAppStore((s) => s.hydrateProjects);
  const hasHydratedProjects = useAppStore((s) => s.hasHydratedProjects);
  const isHydratingProjects = useAppStore((s) => s.isHydratingProjects);
  const setSessionUserId = useAppStore((s) => s.setSessionUserId);
  const restoreLocalProject = useAppStore((s) => s.restoreLocalProject);
  const resumeProjectEntry = useAppStore((s) => s.resumeProjectEntry);
  const dismissResumeProject = useAppStore((s) => s.dismissResumeProject);
  const syncProjectFromServer = useAppStore((s) => s.syncProjectFromServer);

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

  const resumeProjectName = projects.find((project) => project.id === resumeProjectId)?.name ?? "your last project";

  if (!mounted || (!hasHydratedProjects && !currentProjectId)) {
    return (
      <div className="min-h-screen bg-[var(--surface-shell)]">
        <div className="sz-topbar">
          <div className="sz-grid-shell flex h-20 items-center">
            <span className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Sitezy</span>
          </div>
        </div>

        <div className="sz-grid-shell flex min-h-[calc(100vh-80px)] items-center justify-center py-16">
          <div className="w-full max-w-[420px] rounded-[30px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-8 text-center shadow-[var(--shadow-lg)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-[var(--border-default)] bg-[rgba(107,119,255,0.12)] text-[var(--text-accent)] shadow-[0_18px_44px_rgba(84,96,255,0.18)]">
              <Loader2 size={20} className="animate-spin" />
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Loading</p>
            <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              Opening your workspace
            </h1>
            <p className="mt-3 text-[14px] leading-7 text-[var(--text-secondary)]">
              Fetching your projects and checking your recent work.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentProjectId && resumeProjectId) {
    return (
      <div className="min-h-screen bg-[var(--surface-shell)]">
        <div className="sz-topbar">
          <div className="sz-grid-shell flex h-20 items-center">
            <span className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Sitezy</span>
          </div>
        </div>

        <div className="sz-grid-shell flex min-h-[calc(100vh-80px)] items-center justify-center py-16">
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
    );
  }

  return currentProjectId
    ? <Editor initialAccount={initialAccount} />
    : <Dashboard currentAccess={currentAccess} initialAccount={initialAccount} />;
}
