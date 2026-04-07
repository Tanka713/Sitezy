"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, LogOut, Settings2, Sparkles } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { resetSignedOutUserSettings } from "@/lib/settings";
import type { UserAccountProfile } from "@/types";
import { cn } from "@/lib/utils";

function deriveInitials(account: UserAccountProfile | null) {
  if (!account) return "S";
  const label = account.name?.trim() || account.email.split("@")[0] || "Sitezy";
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

function MenuAction({
  icon,
  label,
  hint,
  tone = "default",
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-all hover:bg-[var(--bg-soft)]",
        tone === "danger" && "hover:bg-[rgba(240,106,116,0.08)]"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[var(--border-soft)] bg-[var(--bg-soft)] text-[var(--fg-soft)] transition-all group-hover:border-[var(--border-default)] group-hover:bg-[var(--bg-subtle)] group-hover:text-[var(--text-primary)]",
          tone === "danger" &&
            "text-[var(--danger-fg)] group-hover:border-[rgba(240,106,116,0.22)] group-hover:bg-[rgba(240,106,116,0.1)] group-hover:text-[var(--danger-fg)]"
        )}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[13px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]",
            tone === "danger" && "text-[var(--danger-fg)]"
          )}
        >
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[var(--fg-faint)]">{hint}</span>
      </span>

      <ChevronRight
        size={14}
        className={cn(
          "shrink-0 text-[var(--fg-faint)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--fg-soft)]",
          tone === "danger" && "group-hover:text-[var(--danger-fg)]"
        )}
      />
    </button>
  );
}

export function UserAvatarMenu({
  initialAccount = null,
  className,
  compact = false,
  showStudioShortcut = true,
}: {
  initialAccount?: UserAccountProfile | null;
  className?: string;
  compact?: boolean;
  showStudioShortcut?: boolean;
}) {
  const router = useRouter();
  const [account, setAccount] = useState<UserAccountProfile | null>(initialAccount);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAccount(initialAccount);
  }, [initialAccount]);

  useEffect(() => {
    let cancelled = false;
    if (initialAccount) return;

    void fetch("/api/settings", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = (await response.json()) as { account?: UserAccountProfile };
        return payload.account ?? null;
      })
      .then((next) => {
        if (!cancelled && next) setAccount(next);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initialAccount]);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  const initials = useMemo(() => deriveInitials(account), [account]);
  const displayName = useMemo(
    () => (account ? account.name?.trim() || account.email.split("@")[0] || "Sitezy" : "Sitezy"),
    [account]
  );

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    resetSignedOutUserSettings();
    window.location.assign("/login");
  }

  if (!account) return null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "group inline-flex items-center gap-2.5 rounded-full border border-[var(--border-softer)] bg-[var(--bg-soft)] px-1.5 py-1.5 transition-all hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]",
          compact && "h-10 px-1.5"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {account.profileImageUrl ? (
          <img
            src={account.profileImageUrl}
            alt={displayName}
            className="h-8 w-8 rounded-full border border-[var(--border-softer)] object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--accent-default)] bg-[var(--accent-default)] text-[12px] font-semibold text-[var(--text-inverse)]">
            {initials}
          </span>
        )}
        {!compact ? (
          <div className="hidden min-w-0 text-left xl:block">
            <p className="truncate text-[12px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              {displayName}
            </p>
            <p className="truncate text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)]">Account</p>
          </div>
        ) : null}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--fg-faint)] transition-all group-hover:text-[var(--fg-soft)]">
          <ChevronDown
            size={14}
            className={cn("transition-all", open && "rotate-180 text-[var(--fg-soft)]")}
          />
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[220] w-[316px] overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-xl)]">
          <div className="m-3 rounded-[22px] border border-[var(--border-soft)] bg-[var(--bg-soft)] px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-1 shrink-0 rounded-full bg-[var(--accent-default)]" />
              <div className="min-w-0 flex-1 py-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">
                  Account
                </p>
                <p className="mt-1 truncate text-[18px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {displayName}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 p-2.5 pt-0">
            {showStudioShortcut ? (
              <MenuAction
                icon={<Sparkles size={15} className="text-[var(--text-accent)]" />}
                label="Open workspace"
                hint="Return to your projects and editor"
                onClick={() => {
                  setOpen(false);
                  router.push("/app");
                }}
              />
            ) : null}

            <MenuAction
              icon={<Settings2 size={15} />}
              label="Settings"
              hint="Profile, theme, and account preferences"
              onClick={() => {
                setOpen(false);
                router.push("/settings");
              }}
            />

            <MenuAction
              icon={<LogOut size={15} />}
              label="Sign out"
              hint="End this session on this device"
              tone="danger"
              onClick={() => {
                setOpen(false);
                void handleSignOut();
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
