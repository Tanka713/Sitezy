"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectCard } from "./ProjectCard";
import {
  Code2,
  Download,
  Globe,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

export function Dashboard() {
  const projects = useAppStore((state) => state.projects);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  const filtered = projects.filter((project) => {
    const term = search.toLowerCase();
    return (
      project.name.toLowerCase().includes(term) ||
      project.brief?.description?.toLowerCase().includes(term)
    );
  });

  const readyCount = projects.filter((project) => {
    const donePages = project.pages?.filter((page) => page.status === "done").length ?? 0;
    return project.status === "ready" || donePages > 0;
  }).length;
  const totalPages = projects.reduce((count, project) => count + (project.pages?.length ?? 0), 0);
  const generatedCount = projects.filter((project) => Boolean(project.blueprint)).length;

  return (
    <div className="min-h-screen bg-[#050d14] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[12%] top-[-9rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(84,213,200,0.18),rgba(84,213,200,0)_68%)] blur-3xl" />
        <div className="absolute right-[-8rem] top-[10rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(130,184,255,0.16),rgba(130,184,255,0)_70%)] blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/2 h-[26rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,184,75,0.1),rgba(245,184,75,0)_68%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050d14]/76 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/12 bg-[linear-gradient(135deg,rgba(84,213,200,0.28),rgba(245,184,75,0.18))] text-base font-semibold text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
              S
            </div>
            <div className="leading-none">
              <p className="text-[1rem] font-semibold tracking-[-0.03em] text-white">Sitezy Studio</p>
              <p className="mt-1 text-[0.68rem] uppercase tracking-[0.28em] text-slate-300/42">
                Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {projects.length > 0 && (
              <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 md:flex">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                    viewMode === "grid"
                      ? "bg-white/[0.09] text-white"
                      : "text-slate-300/58 hover:text-white"
                  }`}
                >
                  <LayoutGrid size={15} />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-white/[0.09] text-white"
                      : "text-slate-300/58 hover:text-white"
                  }`}
                >
                  <List size={15} />
                  List
                </button>
              </div>
            )}

            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#54d5c833] bg-[linear-gradient(135deg,rgba(84,213,200,0.28),rgba(84,213,200,0.16))] px-5 text-sm font-medium text-white shadow-[0_18px_36px_rgba(84,213,200,0.16)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              <Plus size={16} />
              New Project
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-10">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,29,42,0.96),rgba(9,17,27,0.98))] p-6 shadow-[0_32px_90px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
          <div className="absolute left-[-6rem] top-[-8rem] h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(84,213,200,0.18),rgba(84,213,200,0)_70%)] blur-3xl" />
          <div className="absolute bottom-[-8rem] right-[-6rem] h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(245,184,75,0.14),rgba(245,184,75,0)_72%)] blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[0.96fr_1.04fr] lg:items-end">
            <div className="max-w-[40rem]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-200/64">
                <Sparkles size={13} className="text-[#54d5c8]" />
                Studio workspace
              </div>

              <h1 className="mt-6 text-[clamp(2.8rem,6vw,5.8rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-white">
                Build faster.
                <br />
                Keep the final site yours.
              </h1>

              <p className="mt-5 max-w-[34rem] text-sm leading-7 text-slate-300/66 sm:text-base">
                Create a project, let the AI shape the structure, then refine everything in the editor and export cleanly when the work is ready.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-[#54d5c833] bg-[linear-gradient(135deg,rgba(84,213,200,0.28),rgba(84,213,200,0.16))] px-6 text-sm font-medium text-white shadow-[0_18px_32px_rgba(84,213,200,0.14)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <Zap size={15} />
                  Create project
                </button>

                {projects.length > 0 && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200/66">
                    <Search size={14} className="text-slate-300/48" />
                    Search live across projects
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  "AI generation",
                  "Live editor",
                  "Page system",
                  "Export package",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-200/68"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {projects.length > 0 ? (
                <>
                  <div className="rounded-[28px] border border-white/10 bg-[#09131b]/94 p-4 sm:p-5">
                    <label className="mb-3 block text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-300/42">
                      Search projects
                    </label>
                    <div className="relative">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300/34"
                      />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by project name or brief"
                        className="h-12 w-full rounded-full border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white placeholder:text-slate-300/28 focus:border-[#54d5c844] focus:outline-none"
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 md:hidden">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm ${
                          viewMode === "grid"
                            ? "border-white/16 bg-white/[0.08] text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300/56"
                        }`}
                      >
                        <LayoutGrid size={14} />
                        Grid
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm ${
                          viewMode === "list"
                            ? "border-white/16 bg-white/[0.08] text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300/56"
                        }`}
                      >
                        <List size={14} />
                        List
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { label: "Projects", value: String(projects.length), Icon: Wand2, color: "#54d5c8" },
                      { label: "Pages", value: String(totalPages), Icon: Globe, color: "#82b8ff" },
                      { label: "Ready", value: String(readyCount), Icon: Download, color: "#f5b84b" },
                    ].map(({ label, value, Icon, color }) => (
                      <div
                        key={label}
                        className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,23,34,0.96),rgba(9,16,25,0.96))] p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-300/40">
                            {label}
                          </p>
                          <Icon size={16} style={{ color }} />
                        </div>
                        <p className="mt-5 text-[2.2rem] font-semibold leading-none tracking-[-0.06em] text-white">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#09131b]/94 p-5 shadow-[0_26px_70px_rgba(0,0,0,0.24)] sm:p-6">
                  <div className="absolute right-[-3rem] top-[-3rem] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(130,184,255,0.2),rgba(130,184,255,0)_70%)] blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-300/42">
                        First launch
                      </p>
                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200/64">
                        No projects yet
                      </div>
                    </div>

                    <div className="mt-5 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,47,0.96),rgba(11,20,30,0.96))] p-5">
                      <div className="flex items-center justify-between border-b border-white/8 pb-4">
                        <div className="flex gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-white/16" />
                          <div className="h-2.5 w-2.5 rounded-full bg-white/12" />
                          <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                        </div>
                        <span className="rounded-full border border-[#54d5c824] bg-[#54d5c814] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#54d5c8]">
                          Ready to generate
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        {[
                          "Name the project",
                          "Describe the business and mood",
                          "Generate the full site structure",
                          "Refine inside the editor",
                        ].map((item, index) => (
                          <div
                            key={item}
                            className="flex items-center gap-3 rounded-2xl border border-white/8 px-4 py-3"
                            style={{
                              background: index === 0 ? "rgba(84,213,200,0.12)" : "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-semibold text-white">
                              {index + 1}
                            </div>
                            <span className="text-sm text-slate-100/82">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {projects.length === 0 ? (
          <section className="mt-8 grid gap-5 lg:grid-cols-[1.04fr_0.96fr]">
            <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,29,42,0.96),rgba(9,17,27,0.96))] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.24)] sm:p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/12 bg-[linear-gradient(135deg,rgba(84,213,200,0.22),rgba(130,184,255,0.18))]">
                <Sparkles size={28} className="text-[#54d5c8]" />
              </div>
              <h2 className="mt-6 text-[clamp(2.2rem,4vw,3.8rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
                Create the first workspace.
              </h2>
              <p className="mt-4 max-w-[34rem] text-sm leading-7 text-slate-300/64 sm:text-base">
                Start with a brief, let Sitezy generate the structure, and then shape the final site visually before exporting it.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-8 inline-flex h-12 items-center gap-2 rounded-full border border-[#54d5c833] bg-[linear-gradient(135deg,rgba(84,213,200,0.28),rgba(84,213,200,0.16))] px-6 text-sm font-medium text-white shadow-[0_18px_32px_rgba(84,213,200,0.14)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                <Zap size={15} />
                Create your first project
              </button>
            </div>

            <div className="grid gap-5">
              {[
                {
                  icon: Globe,
                  label: "Multi-page generation",
                  body: "Generate structured sites with the key pages already connected.",
                  color: "#82b8ff",
                },
                {
                  icon: Code2,
                  label: "Live editor",
                  body: "Adjust content, spacing, and layout directly on the canvas.",
                  color: "#54d5c8",
                },
                {
                  icon: Download,
                  label: "Clean export",
                  body: "Take the final package with you when the site is ready to ship.",
                  color: "#f5b84b",
                },
              ].map(({ icon: Icon, label, body, color }) => (
                <div
                  key={label}
                  className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,29,42,0.96),rgba(9,17,27,0.96))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04]">
                    <Icon size={18} style={{ color }} />
                  </div>
                  <h3 className="mt-5 text-[1.35rem] font-semibold tracking-[-0.03em] text-white">
                    {label}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300/62">{body}</p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-300/42">
                  Project library
                </p>
                <h2 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
                  {filtered.length} project{filtered.length !== 1 ? "s" : ""} in motion
                </h2>
                <p className="mt-2 text-sm text-slate-300/56">
                  {generatedCount} with brand systems, {readyCount} ready for editing or export.
                </p>
              </div>
            </section>

            {filtered.length === 0 ? (
              <div className="mt-8 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,29,42,0.96),rgba(9,17,27,0.96))] px-6 py-12 text-center text-slate-300/60 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
                No projects match "{search}"
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                    : "mt-8 flex flex-col gap-4"
                }
              >
                {filtered.map((project) => (
                  <ProjectCard key={project.id} project={project} viewMode={viewMode} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
