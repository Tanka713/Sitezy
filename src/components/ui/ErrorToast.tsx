"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { X, Copy, Check, AlertTriangle } from "lucide-react";

export function ErrorToast() {
  const apiError    = useAppStore((s) => s.apiError);
  const setApiError = useAppStore((s) => s.setApiError);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (apiError) {
      setVisible(true);
      setCopied(false);
    }
  }, [apiError]);

  if (!mounted || !apiError || !visible) return null;

  const refId = apiError.requestId ?? apiError.code;

  function dismiss() {
    setVisible(false);
    setTimeout(() => setApiError(null), 300);
  }

  function copy() {
    const text = [
      `Error: ${apiError!.message}`,
      `Code: ${apiError!.code}`,
      apiError!.requestId ? `Reference: ${apiError!.requestId}` : "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard permission denied — fall back to silent failure
      // (user can manually copy the ref code shown on screen)
    });
  }

  const isBilling = apiError.code === "API_BILLING_001";
  const isAuth    = apiError.code === "API_AUTH_001" || apiError.code === "AUTH_REQUIRED_001";

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[99999] w-[480px] max-w-[calc(100vw-32px)]"
      style={{ animation: "sz-toast-in 0.2s ease" }}
    >
      <style>{`
        @keyframes sz-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div className="isolate overflow-hidden rounded-2xl border border-red-500/20 bg-[var(--bg-elevated)] shadow-[var(--shadow-xl)]">
        {/* Header */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-[rgba(240,106,116,0.12)]">
            <AlertTriangle size={14} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold leading-snug text-[var(--text-primary)]">
              {isBilling ? "Billing limit reached" : isAuth ? "Sign-in required" : "Something went wrong"}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-[var(--fg-muted)]">
              {isBilling
                ? "API credit balance is too low. Please upgrade or add credits to continue."
                : isAuth
                ? apiError.message || "Your session expired. Please sign in again to continue."
                : apiError.message}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[var(--fg-faint)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--fg-soft)]"
          >
            <X size={12} />
          </button>
        </div>

        {/* Reference strip */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-soft)] bg-[var(--bg-soft)] px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-widest text-[var(--fg-subtle)]">Ref</span>
            <code className="truncate font-mono text-[11px] text-[var(--fg-muted)]">{refId}</code>
          </div>
          <button
            onClick={copy}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] text-[var(--fg-muted)] transition-all hover:bg-[var(--bg-subtle)] hover:text-[var(--fg-soft)]"
          >
            {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
