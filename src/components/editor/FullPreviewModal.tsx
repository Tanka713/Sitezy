"use client";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { buildFullPageHtml } from "@/lib/utils";
import { X, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import type { Project } from "@/types";

interface Props { project: Project; }

export function FullPreviewModal({ project }: Props) {
  const setFullPreview = useAppStore((s) => s.setFullPreview);
  const selectedPageId = useAppStore((s) => s.editor.selectedPageId);

  // Defensive: pages may be undefined
  const pages = project?.pages ?? [];
  const firstPageId = pages[0]?.id ?? null;

  const [activePageId, setActivePageId] = useState(selectedPageId ?? firstPageId);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0] ?? null;
  const currentIndex = pages.findIndex((p) => p.id === activePageId);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !activePage?.html) return;
    const fullHtml = buildFullPageHtml(activePage.html, project?.blueprint ?? null, activePage.name);
    const doc = iframe.contentDocument;
    if (doc) { doc.open(); doc.write(fullHtml); doc.close(); }
  }, [activePage?.html, activePage?.id, project?.blueprint]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setFullPreview(false);
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        setActivePageId(pages[currentIndex - 1].id);
      }
      if (e.key === "ArrowRight" && currentIndex < pages.length - 1) {
        setActivePageId(pages[currentIndex + 1].id);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, pages, setFullPreview]);

  if (!activePage) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-white/30 text-sm">No pages to preview.</div>
        <button onClick={() => setFullPreview(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="h-11 bg-[#111116] border-b border-white/[0.08] flex items-center gap-3 px-4 flex-shrink-0">
        <button
          onClick={() => setFullPreview(false)}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-[12px]"
        >
          <X size={13} />
          Close
        </button>
        <div className="w-px h-4 bg-white/[0.08]" />
        <Globe size={12} className="text-white/30" />
        <span className="text-[13px] font-medium text-white/70">{project?.name ?? "Project"}</span>
        <span className="text-white/25">—</span>
        <span className="text-[13px] text-white/50">{activePage.name}</span>

        <div className="flex-1" />

        {/* Dot pagination */}
        {pages.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => currentIndex > 0 && setActivePageId(pages[currentIndex - 1].id)}
              disabled={currentIndex <= 0}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex items-center gap-1 px-1">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setActivePageId(page.id)}
                  title={page.name}
                  className={`h-1.5 rounded-full transition-all ${
                    page.id === activePageId ? "bg-brand-500 w-4" : "bg-white/20 hover:bg-white/40 w-1.5"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => currentIndex < pages.length - 1 && setActivePageId(pages[currentIndex + 1].id)}
              disabled={currentIndex >= pages.length - 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Page name pills */}
        <div className="flex items-center gap-1 ml-2">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePageId(page.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                page.id === activePageId ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"
              }`}
            >
              {page.name}
            </button>
          ))}
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 bg-white overflow-hidden">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none"
          title={`Full Preview: ${activePage.name}`}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Keyboard hint */}
      {pages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-[11px] text-white/30">
          <span>← → Navigate pages</span>
          <span>·</span>
          <span>Esc Close</span>
        </div>
      )}
    </div>
  );
}
