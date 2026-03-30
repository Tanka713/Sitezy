"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectCard } from "./ProjectCard";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  ArrowDownAZ, Clock, LayoutGrid, List, LogOut, Plus,
} from "lucide-react";
import {
  SectionHeading, SitezyBadge, SitezyButton, SitezyCard, SitezyInput,
} from "@/components/ui/sitezy";

export function Dashboard() {
  const router   = useRouter();
  const projects = useAppStore((s) => s.projects);
  const [mounted, setMounted] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid");
  const [search, setSearch]         = useState("");
  const [sortBy, setSortBy]         = useState<"newest" | "oldest" | "name">("newest");

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleProjects = mounted ? projects : [];

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
    <div className="min-h-screen">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sz-topbar sticky top-0 z-40">
        <div className="sz-grid-shell flex h-20 items-center justify-between gap-5">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-[15px] font-semibold tracking-[-0.03em]">Sitezy</span>
          </Link>

          {/* Controls */}
          <div className="flex items-center gap-2.5">
            {visibleProjects.length > 0 && (
              <>
                {/* Search */}
                <div className="hidden w-[220px] md:block">
                  <SitezyInput
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search projects…"
                    className="px-4 text-[13px]"
                  />
                </div>

                {/* View toggle */}
                <div className="flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
                  {(["grid", "list"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      title={mode === "grid" ? "Grid view" : "List view"}
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                        viewMode === mode
                          ? "bg-[rgba(107,119,255,0.18)] text-white"
                          : "text-white/34 hover:text-white/72"
                      }`}
                    >
                      {mode === "grid" ? <LayoutGrid size={14} /> : <List size={14} />}
                    </button>
                  ))}
                </div>

                {/* Sort toggle */}
                <div className="flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
                  {([
                    { key: "newest" as const, icon: <Clock size={13} />,                           title: "Newest first" },
                    { key: "oldest" as const, icon: <Clock size={13} className="scale-x-[-1]" />,  title: "Oldest first" },
                    { key: "name"   as const, icon: <ArrowDownAZ size={13} />,                     title: "A → Z" },
                  ]).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      title={item.title}
                      onClick={() => setSortBy(item.key)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                        sortBy === item.key
                          ? "bg-[rgba(107,119,255,0.18)] text-white"
                          : "text-white/34 hover:text-white/72"
                      }`}
                    >
                      {item.icon}
                    </button>
                  ))}
                </div>
              </>
            )}

            <SitezyButton variant="secondary" size="sm" onClick={() => void handleSignOut()}>
              <LogOut size={14} />
              Sign out
            </SitezyButton>
            <SitezyButton variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              New project
            </SitezyButton>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="sz-grid-shell pb-28 pt-12">

        {/* Empty state */}
        {visibleProjects.length === 0 ? (
          <div className="grid min-h-[calc(100vh-160px)] items-center lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div className="space-y-8">
              <SectionHeading
                eyebrow="Start here"
                title="A calm workspace for every site you ship."
                body="Generate from a brief, refine visually, and keep every project in one connected studio."
              />
              <div className="flex flex-wrap gap-3">
                <SitezyButton variant="primary" size="lg" onClick={() => setShowCreate(true)}>
                  <Plus size={16} />
                  Create your first project
                </SitezyButton>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {["AI-generated", "Fully editable", "Clean export"].map((item) => (
                  <SitezyBadge key={item}>{item}</SitezyBadge>
                ))}
              </div>
            </div>

            <SitezyCard className="relative overflow-hidden p-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(107,119,255,0.18),transparent_30%)]" />
              <div className="relative p-6 md:p-8">
                <div className="rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(19,24,36,0.98),rgba(13,17,25,0.98))] p-6 shadow-[0_28px_70px_rgba(0,0,0,0.32)]">
                  <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
                    <div className="h-12 w-36 rounded-full bg-white/[0.07]" />
                    <div className="mt-8 h-[180px] rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))]" />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-4"
                      >
                        <div className="h-3 w-16 rounded-full bg-white/[0.08]" />
                        <div className="mt-6 h-28 rounded-[20px] bg-white/[0.07]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SitezyCard>
          </div>

        ) : (
          <div className="space-y-8">
            {/* Section heading row */}
            <div className="flex items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[42px] font-semibold leading-none tracking-[-0.055em] md:text-[56px]">
                    Projects
                  </h1>
                  <span className="mt-1 flex h-8 items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] font-medium text-white/50">
                    {filtered.length}
                  </span>
                </div>
                <p className="mt-3 text-[14px] leading-7 text-[var(--text-tertiary)]">
                  Generate, refine, and reopen your sites.
                </p>
              </div>

            </div>

            {/* No search results */}
            {filtered.length === 0 ? (
              <SitezyCard className="p-10 text-center">
                <p className="text-[15px] text-[var(--text-secondary)]">No projects match "{search}".</p>
              </SitezyCard>
            ) : viewMode === "grid" ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {/* Create card */}
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="group flex h-full min-h-[340px] flex-col items-center justify-center gap-5 rounded-[24px] border border-dashed border-white/[0.1] bg-transparent p-8 text-center transition-all hover:border-[rgba(107,119,255,0.4)] hover:bg-[rgba(107,119,255,0.05)] hover:-translate-y-1"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/[0.08] bg-[rgba(107,119,255,0.12)] text-[var(--text-accent)] transition-transform group-hover:scale-105">
                    <Plus size={22} />
                  </div>
                  <div>
                    <p className="text-[18px] font-semibold tracking-[-0.03em]">New project</p>
                    <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                      Start with a brief and let Sitezy build around it.
                    </p>
                  </div>
                </button>

                {filtered.map((project) => (
                  <ProjectCard key={project.id} project={project} viewMode="grid" />
                ))}
              </div>
            ) : (
              <div className="grid gap-2">
                <div className="grid grid-cols-[2.8fr_1fr_1.3fr_100px] gap-4 px-5 text-[10px] uppercase tracking-[0.2em] text-white/20">
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
      </main>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
