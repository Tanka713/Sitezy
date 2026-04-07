"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { derivePageStateFromHtml } from "@/lib/editor/structure";
import { useAppStore } from "@/lib/store";
import { buildFullPageHtml } from "@/lib/utils";
import { X, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { OverlayDialog } from "@/components/ui/OverlayDialog";
import type { Project } from "@/types";

interface Props { project: Project; }

export function FullPreviewModal({ project }: Props) {
  const setFullPreview = useAppStore((s) => s.setFullPreview);
  const selectedPageId = useAppStore((s) => s.editor.selectedPageId);
  const previewTitleId = useId();

  // Defensive: pages may be undefined
  const pages = project?.pages ?? [];
  const firstPageId = pages[0]?.id ?? null;

  const [activePageId, setActivePageId] = useState(selectedPageId ?? firstPageId);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0] ?? null;
  const currentIndex = pages.findIndex((p) => p.id === activePageId);

  useEffect(() => {
    if (activePageId && pages.some((page) => page.id === activePageId)) return;
    setActivePageId(selectedPageId ?? firstPageId);
  }, [activePageId, firstPageId, pages, selectedPageId]);

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
    const normalized = derivePageStateFromHtml(activePage.html, activePage.sections);
    const fullHtml = buildFullPageHtml(normalized.html, project?.blueprint ?? null, activePage.name, navScript);
    const doc = iframe.contentDocument;
    if (doc) { doc.open(); doc.write(fullHtml); doc.close(); }
  }, [activePage?.html, activePage?.id, activePage?.sections, iframeReady, project?.blueprint, navScript]);

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
      <OverlayDialog
        open
        onClose={() => setFullPreview(false)}
        titleId={previewTitleId}
        containerClassName="p-0"
        panelClassName="editor-preview-modal flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#050608_0%,#080a0f_100%)]"
        closeOnBackdrop={false}
      >
        <h2 id={previewTitleId} className="sr-only">Preview</h2>
        <div className="text-sm text-white/30">No pages to preview.</div>
        <button onClick={() => setFullPreview(false)} className="absolute right-4 top-4 text-white/40 hover:text-white">
          <X size={18} />
        </button>
      </OverlayDialog>
    );
  }

  return (
    <OverlayDialog
      open
      onClose={() => setFullPreview(false)}
      titleId={previewTitleId}
      containerClassName="p-0"
      panelClassName="flex h-full w-full flex-col bg-[linear-gradient(180deg,#050608_0%,#080a0f_100%)]"
      closeOnBackdrop={false}
    >
      {/* Top bar */}
      <div className="sz-topbar flex h-16 flex-shrink-0 items-center gap-4 px-5">
        <button
          onClick={() => setFullPreview(false)}
          className="flex items-center gap-2 rounded-full px-3 py-2 text-[12px] text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/80"
        >
          <X size={14} />
          Close
        </button>
        <div className="h-6 w-px bg-white/[0.08]" />
        <Globe size={13} className="text-white/30" />
        <h2 id={previewTitleId} className="text-[13px] font-medium text-white/70">{project?.name ?? "Project"}</h2>
        <span className="text-white/20">•</span>
        <span className="text-[13px] text-white/48">{activePage.name}</span>

        <div className="flex-1" />

        {pages.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => currentIndex > 0 && setActivePageId(pages[currentIndex - 1].id)}
              disabled={currentIndex <= 0}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/[0.04] hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-1">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setActivePageId(page.id)}
                  className={`h-1.5 rounded-full transition-all ${
                    page.id === activePageId ? "bg-accent-500 w-4" : "bg-white/20 hover:bg-white/40 w-1.5"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => currentIndex < pages.length - 1 && setActivePageId(pages[currentIndex + 1].id)}
              disabled={currentIndex >= pages.length - 1}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/[0.04] hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

      </div>

      {/* Iframe */}
      <div className="flex-1 overflow-hidden p-5">
        <iframe
          ref={iframeRef}
          src="/api/preview-frame"
          onLoad={() => setIframeReady(true)}
          className="h-full w-full rounded-[28px] border-none shadow-[0_28px_70px_rgba(0,0,0,0.3)]"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </OverlayDialog>
  );
}
