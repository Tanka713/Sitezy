"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { X, Copy, Check, AlertTriangle } from "lucide-react";

export function ErrorToast() {
  const apiError    = useAppStore((s) => s.apiError);
  const setApiError = useAppStore((s) => s.setApiError);
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (apiError) {
      setVisible(true);
      setCopied(false);
    }
  }, [apiError]);

  if (!apiError || !visible) return null;

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

  // Map both legacy ERR_BILLING (from parseApiError) and new API_BILLING_001 code
  const isBilling = apiError.code === "ERR_BILLING" || apiError.code === "API_BILLING_001";
  const isAuth    = apiError.code === "ERR_AUTH" || apiError.code === "API_AUTH_001";

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
      <div className="rounded-2xl border border-red-500/20 bg-[#0e0a0a] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          <div className="w-8 h-8 rounded-xl bg-red-500/12 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle size={14} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/80 leading-snug">
              {isBilling ? "Billing limit reached" : isAuth ? "Authentication failed" : "Something went wrong"}
            </p>
            <p className="text-[12px] text-white/40 mt-0.5 leading-relaxed line-clamp-2">
              {isBilling
                ? "API credit balance is too low. Please upgrade or add credits to continue."
                : isAuth
                ? "Your API key is invalid or expired. Please check your settings."
                : apiError.message}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/50 transition-colors flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>

        {/* Reference strip */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white/[0.025] border-t border-white/[0.04]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] font-bold tracking-widest uppercase text-white/20 flex-shrink-0">Ref</span>
            <code className="text-[11px] font-mono text-white/35 truncate">{refId}</code>
          </div>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-white/40 hover:text-white/65 transition-all flex-shrink-0"
          >
            {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
