"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectCard } from "./ProjectCard";
import { formatDate } from "@/lib/utils";
import {
  Zap, Plus, LayoutGrid, List, Sparkles, Globe, Code2, Download
} from "lucide-react";

export function Dashboard() {
  const projects = useAppStore((s) => s.projects);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brief?.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#080809] text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#080809]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-500/25">
              S
            </div>
            <span className="font-semibold text-[15px] tracking-tight">Sitezy</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase tracking-wider">
              Beta
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {projects.length > 0 && (
              <>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="h-8 px-3 text-[13px] bg-white/[0.04] border border-white/[0.08] rounded-lg text-white/70 placeholder-white/20 focus:outline-none focus:border-brand-500/50 w-48 transition-colors"
                />
                <button
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
                >
                  {viewMode === "grid" ? <List size={15} /> : <LayoutGrid size={15} />}
                </button>
              </>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 h-8 bg-brand-600 hover:bg-brand-500 text-white text-[13px] font-medium rounded-lg transition-colors shadow-lg shadow-brand-500/20"
            >
              <Plus size={14} />
              New Project
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {projects.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center text-center py-24 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-blue-600/20 border border-brand-500/20 flex items-center justify-center mb-8">
              <Sparkles size={36} className="text-brand-400" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-3 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              Build websites with AI
            </h1>
            <p className="text-white/40 text-lg mb-2 max-w-md">
              Describe your vision. Sitezy generates a unique, multi-page website in seconds.
            </p>
            <p className="text-white/25 text-sm mb-10">
              AI-generated · No templates · Fully editable
            </p>

            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-all shadow-xl shadow-brand-500/30 hover:shadow-brand-500/40 hover:scale-105 active:scale-100"
            >
              <Zap size={16} />
              Create your first project
            </button>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3 mt-16 justify-center">
              {[
                { icon: <Globe size={13} />, label: "Multi-page generation" },
                { icon: <Sparkles size={13} />, label: "Unique every time" },
                { icon: <Code2 size={13} />, label: "Live code editor" },
                { icon: <Download size={13} />, label: "Export as ZIP" },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.07] rounded-full text-white/40 text-[12px]"
                >
                  {icon}
                  {label}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Projects ── */
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Your Projects</h2>
                <p className="text-white/30 text-[13px] mt-0.5">
                  {filtered.length} project{filtered.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 text-white/30">
                No projects match "{search}"
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "flex flex-col gap-3"
                }
              >
                {filtered.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    viewMode={viewMode}
                  />
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
