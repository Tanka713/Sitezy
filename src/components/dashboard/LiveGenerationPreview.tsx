"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  html: string;
  isGenerating: boolean;
  sectionCount?: number;
  pageName?: string;
}

/**
 * Progressive live preview that renders completed section HTML in an iframe.
 * Sections fade in with entrance animations as they appear during generation.
 */
export function LiveGenerationPreview({ html, isGenerating, sectionCount = 0, pageName }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const prevSectionCountRef = useRef(0);
  const [iframeReady, setIframeReady] = useState(false);

  // Track when new sections appear for scroll behavior
  useEffect(() => {
    if (sectionCount > prevSectionCountRef.current && iframeRef.current?.contentWindow) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        // Scroll to the latest section
        const sections = doc.querySelectorAll("[data-sz-section-id]");
        const latest = sections[sections.length - 1];
        if (latest) {
          latest.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
    prevSectionCountRef.current = sectionCount;
  }, [sectionCount]);

  const srcDoc = html ? buildLivePreviewDocument(html) : "";

  return (
    <div className="relative h-full w-full">
      {html ? (
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          className="block h-full w-full rounded-[24px] border-none bg-white shadow-[0_24px_54px_rgba(0,0,0,0.3)]"
          style={{
            pointerEvents: "none",
            transition: "filter 0.5s ease",
          }}
          sandbox="allow-scripts"
          onLoad={() => setIframeReady(true)}
        />
      ) : null}

      {isGenerating ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[rgba(91,140,255,0.3)] bg-[rgba(10,12,18,0.9)] px-4 py-2 backdrop-blur-sm">
          <Loader2 size={12} className="spin text-[#8faeff]" />
          <span className="text-[11px] font-medium text-[#c3d0ff]">
            {sectionCount > 0
              ? `Rendering section ${sectionCount}...`
              : "Generating content..."}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function buildLivePreviewDocument(html: string): string {
  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<script src="https://cdn.tailwindcss.com"><\/script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{overflow-y:auto;pointer-events:none}
  img{max-width:100%;height:auto}

  /* Entrance animation for sections appearing progressively */
  [data-sz-section-id] {
    animation: sz-section-entrance 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes sz-section-entrance {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Stagger animations for sections */
  [data-sz-section-id]:nth-child(1) { animation-delay: 0s; }
  [data-sz-section-id]:nth-child(2) { animation-delay: 0.08s; }
  [data-sz-section-id]:nth-child(3) { animation-delay: 0.16s; }
  [data-sz-section-id]:nth-child(4) { animation-delay: 0.24s; }
  [data-sz-section-id]:nth-child(5) { animation-delay: 0.32s; }
  [data-sz-section-id]:nth-child(6) { animation-delay: 0.4s; }
  [data-sz-section-id]:nth-child(7) { animation-delay: 0.48s; }
  [data-sz-section-id]:nth-child(8) { animation-delay: 0.56s; }
  [data-sz-section-id]:nth-child(9) { animation-delay: 0.64s; }
  [data-sz-section-id]:nth-child(10) { animation-delay: 0.72s; }
</style>
</head><body>${html}</body></html>`;
}
