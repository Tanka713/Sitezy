"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0] ?? null;
  const currentIndex = pages.findIndex((p) => p.id === activePageId);

  // Build slug → pageId map for inter-page link interception
  const slugMap = useMemo(() => {
    const map: Record<string, string> = {};
    pages.forEach((p) => {
      const slug = p.slug || p.name.toLowerCase().replace(/\s+/g, "-");
      map[`/${slug}`] = p.id;
      map[slug] = p.id;
      map[`/${p.name.toLowerCase().replace(/\s+/g, "-")}`] = p.id;
    });
    const homePage = pages.find((p) => p.slug === "home" || p.name.toLowerCase() === "home");
    if (homePage) map["/"] = homePage.id;
    return map;
  }, [pages]);

  // Nav-intercept script injected into every preview page
  const navScript = useMemo(() => `<script>
(function(){
  document.addEventListener('click',function(e){
    var a=e.target.closest('a');
    if(!a)return;
    var href=a.getAttribute('href')||'';
    if(!href||href.startsWith('mailto:')||href.startsWith('tel:')||href.startsWith('http')||href.startsWith('//'))return;
    if(href.startsWith('#')){
      var id=href.slice(1);
      if(id){var el=document.getElementById(id)||document.querySelector('[data-sz-section-id="'+id+'"]');if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'});return;}}
      e.preventDefault();return;
    }
    e.preventDefault();
    window.parent.postMessage({source:'sitezy-preview',type:'navigate',href:href},'*');
  },true);
})();
<\/script>`, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeReady || !activePage?.html) return;
    const fullHtml = buildFullPageHtml(activePage.html, project?.blueprint ?? null, activePage.name, navScript);
    const doc = iframe.contentDocument;
    if (doc) { doc.open(); doc.write(fullHtml); doc.close(); }
  }, [activePage?.html, activePage?.id, iframeReady, project?.blueprint, navScript]);

  // Listen for inter-page navigation from within the iframe
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (!e.data || e.data.source !== "sitezy-preview" || e.data.type !== "navigate") return;
      const href = e.data.href as string;
      const targetId = slugMap[href] ?? slugMap[href.replace(/^\//, "")];
      if (targetId) setActivePageId(targetId);
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [slugMap]);

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
      <div className="editor-preview-modal fixed inset-0 z-50 flex items-center justify-center">
        <div className="text-white/30 text-sm">No pages to preview.</div>
        <button onClick={() => setFullPreview(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="editor-preview-modal fixed inset-0 z-50 flex flex-col">
      <div className="border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] px-4 py-3 flex-shrink-0">
        <div className="editor-panel flex items-center gap-3 rounded-[24px] px-4 py-3">
        <button
          onClick={() => setFullPreview(false)}
          className="editor-action-btn flex h-10 items-center gap-1.5 rounded-[16px] px-3 text-[12px] font-medium"
        >
          <X size={13} />
          Close
        </button>
        <div className="editor-ghost-divider h-8 w-px" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px]">
            <Globe size={12} className="text-white/36" />
            <span className="font-medium text-white/74">{project?.name ?? "Project"}</span>
            <span className="text-white/22">/</span>
            <span className="truncate text-white/48">{activePage.name}</span>
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/22">Full Preview</p>
        </div>

        <div className="flex-1" />

        {pages.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => currentIndex > 0 && setActivePageId(pages[currentIndex - 1].id)}
              disabled={currentIndex <= 0}
              className="editor-action-btn flex h-9 w-9 items-center justify-center rounded-2xl disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="editor-panel-soft flex items-center gap-1 rounded-full px-2 py-1">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setActivePageId(page.id)}
                  title={page.name}
                  className={`h-1.5 rounded-full transition-all ${
                    page.id === activePageId ? "bg-teal-200 w-5" : "bg-white/20 hover:bg-white/40 w-1.5"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => currentIndex < pages.length - 1 && setActivePageId(pages[currentIndex + 1].id)}
              disabled={currentIndex >= pages.length - 1}
              className="editor-action-btn flex h-9 w-9 items-center justify-center rounded-2xl disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        <div className="ml-2 flex items-center gap-1.5">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePageId(page.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${
                page.id === activePageId ? "editor-chip text-white" : "text-white/32 hover:text-white/62"
              }`}
            >
              {page.name}
            </button>
          ))}
        </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="editor-panel h-full overflow-hidden rounded-[30px]">
          <div className="editor-browser-chrome flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-200/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
              </div>
              <span className="truncate text-[12px] text-white/70">{activePage.name}</span>
            </div>
            <span className="editor-chip rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em]">Live Site Preview</span>
          </div>
          <div className="h-[calc(100%-57px)] overflow-hidden bg-white">
            <iframe
              ref={iframeRef}
              data-sitezy-preview-frame="full"
              aria-label={`Full preview frame for ${activePage.name}`}
              src="/api/preview-frame"
              onLoad={() => setIframeReady(true)}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      </div>

      {pages.length > 1 && (
        <div className="editor-panel absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full px-4 py-2 text-[11px] text-white/42">
          <span>← → Navigate pages</span>
          <span>·</span>
          <span>Esc Close</span>
        </div>
      )}
    </div>
  );
}
