"use client";

import { useState } from "react";
import Link from "next/link";
import { MailPlus, Loader2, LogOut, Sparkles } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { API_UNKNOWN_001, logAppError, normalizeError } from "@/lib/errors";
import { resetSignedOutUserSettings } from "@/lib/settings";
import { SitezyBadge, SitezyButton, SitezyCard, SitezyTextarea } from "@/components/ui/sitezy";
import { formatShortDateTime } from "@/lib/utils";
import type { BetaInterestRequest } from "@/types";

type StatusTone = "success" | "error" | "muted";

export function BetaInterestPage({
  email,
  supportEmail,
  initialInterest,
  revoked = false,
}: {
  email: string;
  supportEmail: string;
  initialInterest: BetaInterestRequest;
  revoked?: boolean;
}) {
  const [interest, setInterest] = useState(initialInterest);
  const [note, setNote] = useState(initialInterest.note ?? "");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);
  const storageReady = interest.persisted !== false;

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/beta/interest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        interest?: BetaInterestRequest;
        error?: string;
      };

      if (!response.ok || !payload.interest) {
        throw new Error(payload.error || "We couldn't update your beta interest.");
      }

      setInterest(payload.interest);
      setNote(payload.interest.note ?? "");
      setStatus({ tone: "success", message: "Your beta interest is registered." });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "updateBetaInterest" });
      logAppError(appErr);
      setStatus({ tone: "error", message: appErr.userMessage });
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      resetSignedOutUserSettings();
      window.location.assign("/login");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="sz-page-shell">
      <header className="sz-topbar sz-page-header">
        <div className="sz-grid-shell flex h-20 items-center justify-between gap-5">
          <Link href="/" className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Sitezy
          </Link>
          <SitezyButton variant="ghost" size="sm" onClick={() => void handleSignOut()} disabled={signingOut}>
            {signingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Log out
          </SitezyButton>
        </div>
      </header>

      <main className="sz-page-scroll">
        <div className="sz-grid-shell py-4 md:py-5">
          <div className="mx-auto flex min-h-full w-full max-w-[1040px] flex-col gap-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SitezyBadge>Private beta</SitezyBadge>
              <SitezyBadge>{revoked ? "Access unavailable" : storageReady ? "Interest registered" : "Migration required"}</SitezyBadge>
            </div>
            <div className="space-y-2">
              <h1 className="text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] text-[var(--text-primary)] md:text-[46px]">
                {revoked ? "This account no longer has beta access." : "Thanks for your interest in Sitezy."}
              </h1>
              <p className="max-w-[760px] text-[15px] leading-7 text-[var(--text-secondary)]">
                {revoked
                  ? "Your account is still recognized, but beta access is not currently active. We kept your email on file so the team can follow up if access changes."
                  : "Your account was created successfully. We have your email on file, and you can leave a short note so the team knows what you want to build when reviewing access."}
              </p>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[0.88fr_1.12fr]">
            <SitezyCard className="flex h-full min-h-0 flex-col p-5 md:p-6">
              <div className="flex h-full flex-col gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-[var(--border-default)] bg-[var(--surface-4)] text-[var(--text-accent)]">
                  <Sparkles size={18} />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">Registered email</p>
                  <p className="text-[18px] font-semibold text-[var(--text-primary)]">{email}</p>
                </div>
                <div className="rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-3.5 text-[14px] leading-6 text-[var(--text-secondary)]">
                  Need direct help instead? Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
                </div>
                {!storageReady ? (
                  <div className="rounded-[18px] border border-[rgba(240,178,52,0.22)] bg-[rgba(240,178,52,0.08)] px-4 py-3.5 text-[13px] leading-6 text-[var(--text-secondary)]">
                    This environment still needs the latest beta-interest migration before your note can be stored.
                  </div>
                ) : null}
                <div className="mt-auto rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-3 text-[12px] leading-6 text-[var(--fg-faint)]">
                  Interest first registered on {formatShortDateTime(interest.createdAt)}.
                </div>
              </div>
            </SitezyCard>

            <SitezyCard className="flex h-full min-h-0 flex-col p-5 md:p-6">
              <div className="flex h-full flex-col gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">Tell us what you need</p>
                  <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Add context for the beta team
                  </h2>
                  <p className="text-[14px] leading-6 text-[var(--text-secondary)]">
                    Share what you are trying to build, what kind of work you do, or why you want access. This is optional, but it helps with invite review.
                  </p>
                </div>

                <SitezyTextarea
                  className="min-h-[168px] lg:min-h-[200px]"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={5}
                  placeholder="I want to use Sitezy for client landing pages, internal prototypes, restaurant sites, or other launch work."
                />

                {status ? (
                  <div
                    className={`rounded-[18px] px-4 py-3 text-[13px] ${
                      status.tone === "error"
                        ? "border border-[rgba(240,106,116,0.22)] bg-[rgba(240,106,116,0.08)] text-[var(--danger-fg)]"
                        : status.tone === "success"
                          ? "border border-[rgba(49,196,141,0.22)] bg-[rgba(49,196,141,0.08)] text-[var(--success-fg)]"
                          : "border border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {status.message}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <SitezyButton
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={() => void handleSave()}
                    disabled={saving || !storageReady}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <MailPlus size={16} />}
                    {saving ? "Saving..." : storageReady ? "Register interest" : "Migration required"}
                  </SitezyButton>
                  <Link href="/support">
                    <SitezyButton type="button" variant="secondary" size="lg">
                      Contact support
                    </SitezyButton>
                  </Link>
                </div>
              </div>
            </SitezyCard>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
