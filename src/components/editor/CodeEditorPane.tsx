"use client";

import { useEffect, useState } from "react";
import { FileCode2, Save } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { VirtualFile } from "@/types";

interface Props {
  file: VirtualFile | null;
}

export function CodeEditorPane({ file }: Props) {
  const updateFileContent = useAppStore((s) => s.updateFileContent);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(file?.content ?? "");
  }, [file?.id, file?.content]);

  useEffect(() => {
    if (!file) return;
    if (draft === file.content) return;

    const timer = window.setTimeout(() => {
      updateFileContent(file.id, draft);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [draft, file, updateFileContent]);

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0f1014] text-white/25 text-[12px] px-6 text-center">
        Select a file to edit its code
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#0f1014] border-l border-white/[0.06]">
      <div className="h-10 px-3 border-b border-white/[0.06] flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 size={12} className="text-[#7aa2ff] flex-shrink-0" />
          <span className="text-[11px] text-white/70 font-medium truncate">{file.name}</span>
          <span className="text-[10px] uppercase tracking-wide text-white/25">{file.language}</span>
        </div>
        <span className="text-[10px] text-emerald-400/70 flex items-center gap-1 flex-shrink-0">
          <Save size={10} />
          Live
        </span>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        className="flex-1 min-h-0 w-full resize-none border-0 bg-[#0f1014] px-4 py-3 text-[12px] leading-6 text-white/88 font-mono focus:outline-none"
      />
    </div>
  );
}
