"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, Lock, Mail, UserRound } from "lucide-react";
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

type Mode = "login" | "signup";
type OAuthProvider = "github" | "google";

const oauthProviders: Array<{ id: OAuthProvider; label: string; Icon: () => JSX.Element }> = [
  {
    id: "google",
    label: "Google",
    Icon: () => (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-.8 2.4-1.8 3.2l2.9 2.2c1.7-1.5 2.6-3.8 2.6-6.6 0-.6-.1-1.2-.2-1.7H12Z" />
        <path fill="#34A853" d="M12 21c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.9.9-3.1.9-2.4 0-4.5-1.6-5.2-3.9l-3 .2v2.3C5.3 18.9 8.4 21 12 21Z" />
        <path fill="#4A90E2" d="M6.8 13.6c-.2-.5-.3-1.1-.3-1.6s.1-1.1.3-1.6V8.1l-3-.2C3.3 9.1 3 10.5 3 12s.3 2.9.8 4.1l3-.2v-2.3Z" />
        <path fill="#FBBC05" d="M12 6.5c1.3 0 2.5.5 3.4 1.3l2.5-2.5C16.5 3.9 14.4 3 12 3 8.4 3 5.3 5.1 3.8 8l3 2.4c.7-2.3 2.8-3.9 5.2-3.9Z" />
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    Icon: () => (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.94-2.33 4.8-4.56 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.15 10.15 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
      </svg>
    ),
  },
];

export function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const content = useMemo(
    () =>
      mode === "login"
        ? {
            title: "Welcome back to the studio.",
            subtitle: "Sign in to continue building and refining your sites.",
            primary: "Enter studio",
            altLabel: "No account yet?",
            altHref: "/signup",
            altCta: "Create one",
          }
        : {
            title: "Create your Sitezy account.",
            subtitle: "Start with AI generation, then refine visually with full control.",
            primary: "Create account",
            altLabel: "Already have access?",
            altHref: "/login",
            altCta: "Log in",
          },
    [mode]
  );
  const resetPasswordHref = email.trim()
    ? `/reset-password?email=${encodeURIComponent(email.trim())}`
    : "/reset-password";

  function handleAuthError(error: unknown, fallbackCode = AUTH_TOKEN_001) {
    const appErr = normalizeError(error, fallbackCode, { mode });
    logAppError(appErr);
    setError(appErr.userMessage);
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/studio`
          : undefined;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(provider === "github" ? { scopes: "read:user user:email" } : {}),
        },
      });

      if (oauthError) throw oauthError;
    } catch (oauthSubmitError) {
      handleAuthError(oauthSubmitError, AUTH_TOKEN_001);
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) throw signInError;
        router.push("/studio");
        router.refresh();
        return;
      }

      if (!acceptedTerms) {
        throw createAppError({
          code: VALIDATION_INPUT_001,
          devMessage: "Signup was submitted without accepting terms",
          userMessage: "You need to accept the terms to continue.",
          severity: "warn",
        });
      }

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/studio`
          : undefined;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        router.push("/studio");
        router.refresh();
        return;
      }

      setMessage("Account created. Check your email to confirm your account, then continue to the studio.");
    } catch (submitError) {
      handleAuthError(submitError, AUTH_TOKEN_001);
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
                  <SitezyBadge>{mode === "login" ? "Studio access" : "New workspace"}</SitezyBadge>
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
                  "AI-generated multi-page sites",
                  "Visual editing with professional structure",
                  "Clean export when you need ownership",
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
                  {mode === "login" ? "Log in" : "Sign up"}
                </p>
                <div>
                  <h2 className="text-[32px] font-semibold tracking-[-0.04em]">
                    {mode === "login" ? "Continue to your projects." : "Open your workspace."}
                  </h2>
                  <p className="mt-3 text-[15px] leading-7 text-[var(--text-secondary)]">
                    Use email and password or continue with Google or GitHub.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {oauthProviders.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleOAuth(id)}
                    className="flex min-h-[50px] items-center justify-center gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-4 text-[13px] font-semibold text-[var(--text-primary)] transition-all hover:border-white/[0.16] hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <Icon />
                    {label}
                  </button>
                ))}
              </div>

              <div className="sz-divider" />

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "signup" ? (
                  <Field label="Full name" icon={<UserRound size={16} className="text-white/28" />}>
                    <SitezyInput
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Name"
                      autoComplete="name"
                    />
                  </Field>
                ) : null}

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

                <Field
                  label="Password"
                  icon={<Lock size={16} className="text-white/28" />}
                >
                  <SitezyInput
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={8}
                  />
                </Field>

                {mode === "login" ? (
                  <div className="flex justify-end">
                    <a
                      href={resetPasswordHref}
                      onClick={(event) => {
                        event.preventDefault();
                        if (typeof window !== "undefined") {
                          window.location.assign(resetPasswordHref);
                        } else {
                          router.push(resetPasswordHref);
                        }
                      }}
                      className="text-[12px] font-medium text-white/44 transition-colors hover:text-white/78"
                    >
                      Forgot password?
                    </a>
                  </div>
                ) : null}

                {mode === "signup" ? (
                  <label className="flex items-start gap-3 rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-4 py-4 text-[13px] leading-6 text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => setAcceptedTerms(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-accent-500"
                    />
                    <span>
                      I agree to the terms and understand this account will be used to store my projects and workspace data.
                    </span>
                  </label>
                ) : null}

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
                  disabled={submitting}
                >
                  {submitting ? "Please wait..." : content.primary}
                  <ArrowRight size={16} />
                </SitezyButton>
              </form>

              <p className="text-center text-[13px] text-[var(--text-tertiary)]">
                {content.altLabel}{" "}
                <Link href={content.altHref} className="font-semibold text-[var(--text-primary)] transition-opacity hover:opacity-75">
                  {content.altCta}
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
