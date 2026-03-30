"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Lock, Mail, ShieldCheck } from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  AUTH_TOKEN_001,
  VALIDATION_INPUT_001,
  createAppError,
  logAppError,
  normalizeError,
} from "@/lib/errors";
import {
  SitezyBadge,
  SitezyButton,
  SitezyCard,
  SitezyInput,
} from "@/components/ui/sitezy";

type ScreenMode = "request" | "update";

export function ResetPasswordScreen({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();

  const [screenMode, setScreenMode] = useState<ScreenMode>("request");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const content = useMemo(
    () =>
      screenMode === "update"
        ? {
            eyebrow: "Password recovery",
            title: "Choose a new password.",
            subtitle: "Set a fresh password for your Sitezy account and continue back into the studio.",
            primary: "Update password",
          }
        : {
            eyebrow: "Reset access",
            title: "Reset your password.",
            subtitle: "Enter your account email and we’ll send a secure recovery link to your inbox.",
            primary: "Send reset link",
          },
    [screenMode]
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    async function checkSession() {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        setScreenMode(data.user ? "update" : "request");
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (cancelled) return;

      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setScreenMode(session?.user ? "update" : "request");
      }

      if (event === "SIGNED_OUT") {
        setScreenMode("request");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  function handleAuthError(authError: unknown) {
    const appErr = normalizeError(authError, AUTH_TOKEN_001, { screen: "reset-password", mode: screenMode });
    logAppError(appErr);
    setError(appErr.userMessage);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (screenMode === "request") {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
          throw createAppError({
            code: VALIDATION_INPUT_001,
            devMessage: "Reset password requested without an email address",
            userMessage: "Enter your email to receive a reset link.",
            severity: "warn",
          });
        }

        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?next=/reset-password`
            : undefined;

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo,
        });

        if (resetError) throw resetError;

        setMessage("Check your inbox for a secure password reset link.");
        return;
      }

      if (password.length < 8) {
        throw createAppError({
          code: VALIDATION_INPUT_001,
          devMessage: "Password reset submitted with a password shorter than 8 characters",
          userMessage: "Use at least 8 characters for your new password.",
          severity: "warn",
        });
      }

      if (password !== confirmPassword) {
        throw createAppError({
          code: VALIDATION_INPUT_001,
          devMessage: "Password reset submitted with mismatched passwords",
          userMessage: "Your passwords do not match.",
          severity: "warn",
        });
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      router.push("/studio");
      router.refresh();
    } catch (submitError) {
      handleAuthError(submitError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="sz-grid-shell flex min-h-screen items-center py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_0.85fr]">
          <div className="relative overflow-hidden rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(15,20,30,0.94),rgba(9,12,18,0.98))] p-8 shadow-[0_34px_90px_rgba(0,0,0,0.34)] md:p-12">
            <div className="absolute -right-20 top-10 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(107,119,255,0.2),transparent_72%)] blur-3xl" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-12">
              <div className="space-y-8">
                <Link href="/" className="flex w-fit items-center gap-3">
                  <div>
                    <p className="text-[15px] font-semibold tracking-[-0.03em]">Sitezy</p>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/28">Visual web builder</p>
                  </div>
                </Link>

                <div className="space-y-5">
                  <SitezyBadge>{content.eyebrow}</SitezyBadge>
                  <h1 className="max-w-[540px] text-[44px] font-semibold leading-[1.02] tracking-[-0.05em] md:text-[58px]">
                    {content.title}
                  </h1>
                  <p className="max-w-[520px] text-[16px] leading-8 text-[var(--text-secondary)]">
                    {content.subtitle}
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {[
                  "Secure recovery link sent to your email",
                  "Update your password without leaving the app",
                  "Continue back into the studio after reset",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 rounded-[22px] border border-white/[0.07] bg-white/[0.04] px-4 py-4"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(107,119,255,0.16)] text-[var(--text-accent)]">
                      <Check size={14} />
                    </div>
                    <span className="text-[14px] text-[var(--text-secondary)]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SitezyCard className="p-8 md:p-10">
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/28">
                  {screenMode === "update" ? "Choose password" : "Recover account"}
                </p>
                <div>
                  <h2 className="text-[32px] font-semibold tracking-[-0.04em]">
                    {screenMode === "update" ? "Set your new password." : "Email yourself a reset link."}
                  </h2>
                  <p className="mt-3 text-[15px] leading-7 text-[var(--text-secondary)]">
                    {checkingSession
                      ? "Checking your recovery session..."
                      : screenMode === "update"
                        ? "You can update your password now."
                        : "We’ll send a secure link to your inbox."}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {screenMode === "request" ? (
                  <Field label="Email" icon={<Mail size={16} className="text-white/28" />}>
                    <SitezyInput
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      required
                    />
                  </Field>
                ) : (
                  <>
                    <Field label="New password" icon={<Lock size={16} className="text-white/28" />}>
                      <SitezyInput
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        required
                        minLength={8}
                      />
                    </Field>

                    <Field label="Confirm password" icon={<ShieldCheck size={16} className="text-white/28" />}>
                      <SitezyInput
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                      />
                    </Field>
                  </>
                )}

                {error ? (
                  <div className="rounded-[18px] border border-[rgba(240,106,116,0.22)] bg-[rgba(240,106,116,0.08)] px-4 py-3 text-[13px] text-[#ffb7c0]">
                    {error}
                  </div>
                ) : null}

                {message ? (
                  <div className="rounded-[18px] border border-[rgba(49,196,141,0.22)] bg-[rgba(49,196,141,0.08)] px-4 py-3 text-[13px] text-[#9fe5c6]">
                    {message}
                  </div>
                ) : null}

                <SitezyButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={submitting || checkingSession}
                >
                  {submitting ? "Please wait..." : content.primary}
                  <ArrowRight size={16} />
                </SitezyButton>
              </form>

              <p className="text-center text-[13px] text-[var(--text-tertiary)]">
                Back to{" "}
                <Link href="/login" className="font-semibold text-[var(--text-primary)] transition-opacity hover:opacity-75">
                  Log in
                </Link>
              </p>
            </div>
          </SitezyCard>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
