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
      <div className="flex h-full items-center justify-center bg-[var(--surface-code)] px-6 text-center text-[12px] text-[var(--fg-subtle)]">
        Select a file to edit its code
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-[var(--border-soft)] bg-[var(--surface-code)]">
      <div className="flex h-10 flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--border-soft)] px-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 size={12} className="text-[#7aa2ff] flex-shrink-0" />
          <span className="truncate text-[11px] font-medium text-[var(--fg-soft)]">{file.name}</span>
          <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{file.language}</span>
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
        className="flex-1 min-h-0 w-full resize-none border-0 bg-[var(--surface-code)] px-4 py-3 font-mono text-[12px] leading-6 text-[var(--text-primary)] focus:outline-none"
      />
    </div>
  );
}
