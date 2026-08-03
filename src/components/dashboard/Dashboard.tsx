"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CurrentBetaAccess, UserAccountProfile } from "@/types";
import { buildStudioWorkspaceHref } from "@/lib/app-navigation";
import { useAppStore } from "@/lib/store";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectCard } from "./ProjectCard";
import {
  ArrowDownAZ, Clock, LayoutGrid, List, Plus, ShieldEllipsis, ShieldPlus,
} from "lucide-react";
import {
  SitezyBadge, SitezyButton, SitezyCard, SitezyInput,
} from "@/components/ui/sitezy";
import { UserAvatarMenu } from "@/components/ui/UserAvatarMenu";

const VIEW_OPTIONS = [
  { key: "grid" as const, label: "Grid", icon: <LayoutGrid size={14} /> },
  { key: "list" as const, label: "List", icon: <List size={14} /> },
];

const SORT_OPTIONS = [
  { key: "newest" as const, label: "Newest", icon: <Clock size={13} /> },
  { key: "oldest" as const, label: "Oldest", icon: <Clock size={13} className="scale-x-[-1]" /> },
  { key: "name" as const, label: "A-Z", icon: <ArrowDownAZ size={13} /> },
];

export function Dashboard({
  currentAccess = null,
  initialAccount = null,
}: {
  currentAccess?: CurrentBetaAccess | null;
  initialAccount?: UserAccountProfile | null;
}) {
  const projects = useAppStore((s) => s.projects);
  const hydrateProjects = useAppStore((s) => s.hydrateProjects);
  const [mounted, setMounted] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid");
  const [search, setSearch]         = useState("");
  const [sortBy, setSortBy]         = useState<"newest" | "oldest" | "name">("newest");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const hasActiveGeneration = projects.some(
      (project) =>
        project.status === "generating" ||
        project.generationJob?.status === "queued" ||
        project.generationJob?.status === "running"
    );

    if (!hasActiveGeneration) return;

    void hydrateProjects();
    const interval = window.setInterval(() => {
      void hydrateProjects();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [hydrateProjects, mounted, projects]);

  const visibleProjects = mounted ? projects : [];
  const isEmptyWorkspace = visibleProjects.length === 0;
  const filtered = visibleProjects
    .filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brief?.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name")   return a.name.localeCompare(b.name);
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="sz-page-shell">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sz-topbar sz-page-header">
        <div className="sz-grid-shell flex h-20 items-center justify-between gap-5">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="sz-wordmark">Sitezy</span>
          </Link>

          {/* Controls */}
          <div className="flex items-center gap-2.5">
            {currentAccess?.role === "admin" ? (
              <Link href="/admin">
                <SitezyButton variant="secondary" size="sm">
                  <ShieldPlus size={14} />
                  Admin
                </SitezyButton>
              </Link>
            ) : null}

            {currentAccess?.role === "admin" || currentAccess?.role === "customer_service" ? (
              <Link href="/customer-service">
                <SitezyButton variant="ghost" size="sm">
                  <ShieldEllipsis size={14} />
                  Customer service
                </SitezyButton>
              </Link>
            ) : null}

            <UserAvatarMenu
              initialAccount={initialAccount}
              showStudioShortcut={false}
              settingsReturnHref={buildStudioWorkspaceHref()}
            />
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className={isEmptyWorkspace ? "sz-page-body" : "sz-page-scroll"}>
        <div className={isEmptyWorkspace ? "sz-grid-shell h-full py-4 lg:py-6" : "sz-grid-shell pb-28 pt-6"}>

        {/* Empty state */}
        {isEmptyWorkspace ? (
          <div className="grid h-full min-h-0 items-center gap-6 lg:grid-cols-[1fr_1fr] lg:gap-12">
            <div className="space-y-6">
              <div className="space-y-4">
                <SitezyBadge className="sz-status-info">Your workspace</SitezyBadge>
                <h1 className="text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.055em] text-[var(--text-primary)]">
                  A calm workspace for every site you ship.
                </h1>
                <p className="max-w-[460px] text-[15px] leading-[1.85] text-[var(--text-secondary)] tracking-[-0.01em]">
                  Describe your idea, watch Sitezy generate the structure and content, then refine every detail in the visual editor.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <SitezyButton variant="primary" size="lg" onClick={() => setShowCreate(true)}>
                  <Plus size={16} />
                  Create your first project
                </SitezyButton>
              </div>

              <SitezyCard className="max-w-[520px] p-5">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--fg-faint)]">How it works</p>
                <div className="mt-3 space-y-2">
                  {[
                    { step: "01", text: "Write a business brief and choose your site type" },
                    { step: "02", text: "Sitezy generates structure, copy, and sections" },
                    { step: "03", text: "Refine visually in the editor, then export when ready" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-4 rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-2.5">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[10px] font-bold text-[var(--text-accent)] tracking-[-0.02em]">{item.step}</span>
                      <span className="text-[13.5px] text-[var(--text-secondary)] tracking-[-0.01em]">{item.text}</span>
                    </div>
                  ))}
                </div>
              </SitezyCard>
            </div>

            {/* Visual showcase panel */}
            <div className="relative hidden min-h-0 lg:block">
              <div className="absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_30%_20%,rgba(91,140,255,0.2),transparent_55%)]" />
              <div className="sz-card-featured relative overflow-hidden rounded-[32px] p-5">
                {/* Editor preview mock */}
                <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(160deg,rgba(14,18,28,0.98),rgba(9,12,19,0.99))] shadow-[0_28px_80px_rgba(0,0,0,0.4)]">
                  {/* Topbar */}
                  <div className="flex h-11 items-center justify-between border-b border-white/[0.05] px-4">
                    <div className="flex gap-1.5">
                      {[0,1,2].map(i => <div key={i} className="h-2.5 w-2.5 rounded-full bg-white/10" />)}
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-pulse" />
                      <span className="text-[9px] uppercase tracking-[0.16em] text-white/30">My Project</span>
                    </div>
                    <div className="h-6 w-16 rounded-full bg-[rgba(91,140,255,0.28)] border border-[rgba(91,140,255,0.35)]" />
                  </div>

                  {/* Three-panel editor body */}
                  <div className="grid h-[min(320px,calc(100dvh-290px))] min-h-[260px] grid-cols-[140px_1fr_140px]">
                    {/* Left nav */}
                    <div className="border-r border-white/[0.04] p-3 space-y-1">
                      {["Pages","Layers","Media"].map((t,i) => (
                        <div key={t} className={`rounded-lg px-2.5 py-1.5 text-[10px] ${i===1 ? "bg-[rgba(91,140,255,0.18)] text-white/90" : "text-white/28"}`}>{t}</div>
                      ))}
                      <div className="mt-3 space-y-1">
                        {["→ Hero","→ Headline","→ CTA","Features"].map((t,i) => (
                          <div key={t} className={`rounded-lg px-2.5 py-1.5 text-[9px] ${i===1 ? "text-[#aab4ff]" : "text-white/20"}`}>{t}</div>
                        ))}
                      </div>
                    </div>

                    {/* Canvas */}
                    <div className="bg-[rgba(255,255,255,0.015)] p-3">
                      <div className="h-full rounded-[14px] border border-white/[0.07] bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
                        <div className="p-4 space-y-2.5">
                          <div className="h-3 w-32 rounded-full bg-white/[0.12]" />
                          <div className="h-[100px] rounded-[10px] bg-[linear-gradient(160deg,rgba(91,140,255,0.14),rgba(122,92,255,0.08))]" />
                          <div className="h-2.5 w-full rounded-full bg-white/[0.07]" />
                          <div className="h-2.5 w-3/4 rounded-full bg-white/[0.05]" />
                          <div className="flex gap-2 pt-1">
                            <div className="h-7 w-20 rounded-full bg-[rgba(91,140,255,0.3)]" />
                            <div className="h-7 w-16 rounded-full bg-white/[0.06]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right panel */}
                    <div className="border-l border-white/[0.04] p-3 space-y-2">
                      <div className="h-2 w-12 rounded-full bg-white/[0.14]" />
                      <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.03] p-2.5 space-y-1.5">
                        {Array.from({length:4}).map((_,i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="h-2 rounded-full bg-white/[0.1]" style={{width:`${28+i*10}%`}} />
                            <div className="h-5 w-12 rounded-lg bg-white/[0.07]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status indicators below */}
                <div className="mt-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                    <span className="text-[10px] text-white/30 font-medium">Ready to edit</span>
                  </div>
                  <div className="flex gap-2">
                    {["Pages","Sections","Blocks"].map((t) => (
                      <span key={t} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[9px] text-white/24">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        ) : (
            <div className="space-y-6">
              {/* Title + count */}
              <div className="flex items-end gap-3">
                <h1 className="text-[36px] font-bold leading-none tracking-[-0.06em] md:text-[44px]">
                  Projects
                </h1>
                <span
                  className="mb-1 text-[18px] font-semibold leading-none tracking-[-0.04em] text-white/48 tabular-nums md:text-[21px]"
                  aria-live="polite"
                >
                  {filtered.length}
                </span>
              </div>

              {/* Search + view / sort — one toolbar, responsive */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                <SitezyInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search projects"
                  className="min-w-0 flex-1 px-4 text-[13px] lg:max-w-xl"
                />
                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap lg:ml-auto lg:shrink-0">
                  {VIEW_OPTIONS.map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setViewMode(mode.key)}
                      title={`${mode.label} view`}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                        viewMode === mode.key
                          ? "border-[var(--border-focus)] bg-[rgba(107,119,255,0.18)] text-[var(--text-primary)]"
                          : "border-[var(--border-soft)] text-[var(--fg-muted)] hover:border-[var(--border-default)] hover:text-[var(--fg-soft)]"
                      }`}
                    >
                      {mode.icon}
                    </button>
                  ))}
                  {SORT_OPTIONS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      title={item.label}
                      onClick={() => setSortBy(item.key)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                        sortBy === item.key
                          ? "border-[var(--border-focus)] bg-[rgba(107,119,255,0.18)] text-[var(--text-primary)]"
                          : "border-[var(--border-soft)] text-[var(--fg-muted)] hover:border-[var(--border-default)] hover:text-[var(--fg-soft)]"
                      }`}
                    >
                      {item.icon}
                    </button>
                  ))}
                  <SitezyButton
                    variant="primary"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus size={14} />
                    New project
                  </SitezyButton>
                </div>
              </div>

            {/* No search results */}
            {filtered.length === 0 ? (
              <SitezyCard className="p-10 text-center">
                <p className="text-[15px] text-[var(--text-secondary)]">No projects match "{search}".</p>
              </SitezyCard>
            ) : viewMode === "grid" ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((project) => (
                  <ProjectCard key={project.id} project={project} viewMode="grid" />
                ))}
              </div>
            ) : (
              <div className="grid gap-2">
                <div className="grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] gap-4 px-5 text-[10px] uppercase tracking-[0.2em] text-[var(--text-disabled)]">
                  <span>Name</span>
                  <span>Status</span>
                  <span>Updated</span>
                  <span />
                </div>
                {filtered.map((project) => (
                  <ProjectCard key={project.id} project={project} viewMode="list" />
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </main>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
