"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, Lock, Mail, Phone, UserRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isValidPhoneDigits, normalizePhoneForStorage, phoneCountryCodes } from "@/lib/phone";
import {
  AUTH_VERIFY_001,
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

export function AuthScreen({
  mode,
  inviteOnlyBeta = false,
  supportEmail = "support@sitezy.app",
  initialReason = null,
}: {
  mode: Mode;
  inviteOnlyBeta?: boolean;
  supportEmail?: string;
  initialReason?: string | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const content = useMemo(
    () =>
      mode === "login"
        ? {
            title: "Welcome back.",
            subtitle: "Log in with email and password, or continue with Google or GitHub.",
            primary: "Enter workspace",
            altLabel: "No account yet?",
            altHref: "/signup",
            altCta: "Create one",
          }
        : {
            title: "Open your workspace.",
            subtitle: "Create an account with email and password, or continue with Google or GitHub.",
            primary: inviteOnlyBeta ? "Join beta" : "Create account",
            altLabel: "Already have access?",
            altHref: "/login",
            altCta: "Log in",
          },
    [inviteOnlyBeta, mode]
  );
  const resetPasswordHref = email.trim()
    ? `/reset-password?email=${encodeURIComponent(email.trim())}`
    : "/reset-password";
  const betaReasonMessage =
    initialReason === "beta"
      ? `This private beta is currently limited to invited accounts. Contact ${supportEmail} if you need access.`
      : null;
  const verificationMessage =
    initialReason === "verified"
      ? "Your email has been verified. You can log in now."
      : initialReason === "verify-email"
        ? "Check your inbox and verify your email before logging in."
        : initialReason === "auth-failed"
          ? "We could not finish that sign-in. Try again, or check your Supabase auth keys and redirect URL."
        : null;

  function handleAuthError(error: unknown, fallbackCode = AUTH_TOKEN_001) {
    const appErr = normalizeError(error, fallbackCode, { mode });
    logAppError(appErr);
    setError(appErr.userMessage);
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setMessage(null);

    try {
      if (mode === "signup" && !acceptedTerms) {
        throw createAppError({
          code: VALIDATION_INPUT_001,
          devMessage: `OAuth signup attempted without accepting terms via ${provider}`,
          userMessage: "You need to accept the terms to continue.",
          severity: "warn",
        });
      }

      setSubmitting(true);
      const supabase = getSupabaseBrowserClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/app`
          : undefined;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(email.trim() ? { queryParams: { login_hint: email.trim() } } : {}),
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
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) throw signInError;
        if (!signInData.user?.email_confirmed_at) {
          await supabase.auth.signOut();
          throw createAppError({
            code: AUTH_VERIFY_001,
            devMessage: `Unverified email login attempt for ${email.trim()}`,
            userMessage: "Please verify your email before logging in.",
            severity: "warn",
          });
        }

        router.push("/app");
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

      const trimmedPhone = phoneNumber.trim();
      const fullPhoneNumber = normalizePhoneForStorage(phoneCountryCode, trimmedPhone);

      if (password !== confirmPassword) {
        throw createAppError({
          code: VALIDATION_INPUT_001,
          devMessage: "Signup was submitted with mismatched passwords",
          userMessage: "Your password confirmation does not match.",
          severity: "warn",
        });
      }

      if (trimmedPhone && !isValidPhoneDigits(trimmedPhone)) {
        throw createAppError({
          code: VALIDATION_INPUT_001,
          devMessage: `Signup was submitted with an invalid phone number: ${phoneCountryCode} ${trimmedPhone}`,
          userMessage: "Enter a valid phone number or leave it empty for now.",
          severity: "warn",
        });
      }

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/login&flow=verify-email`
          : undefined;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName.trim(),
            phone_country_code: fullPhoneNumber ? phoneCountryCode : null,
            phone_number: fullPhoneNumber,
            phone_otp_status: fullPhoneNumber ? "pending_setup" : "not_provided",
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        await supabase.auth.signOut();
      }

      setMessage(
        inviteOnlyBeta
          ? "Account created. Verify your email first, then log in. If access is not active yet, we will register your beta interest after login."
          : "Account created. Verify your email first, then log in."
      );
    } catch (submitError) {
      handleAuthError(submitError, AUTH_TOKEN_001);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh]">
      <div className="sz-grid-shell flex min-h-[100dvh] items-center py-4 md:py-5">
        <div className="grid w-full items-stretch gap-5 lg:min-h-[calc(100dvh-40px)] lg:grid-cols-[0.95fr_0.85fr] lg:gap-6">
          <div className="relative hidden min-h-0 overflow-hidden rounded-[36px] border border-[var(--border-softer)] bg-[linear-gradient(160deg,rgba(14,18,28,0.97),rgba(8,10,17,0.99))] p-8 shadow-[var(--shadow-xl)] lg:block lg:min-h-[calc(100dvh-40px)] lg:p-10 xl:p-12">
            {/* Background depth layers */}
            <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(91,140,255,0.18),transparent_65%)] blur-2xl" />
            <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(122,92,255,0.14),transparent_65%)] blur-2xl" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(91,140,255,0.3)] to-transparent" />

            <div className="relative z-10 flex h-full min-h-0 flex-col gap-8">
              <div className="space-y-7">
                <Link href="/" className="flex w-fit items-center gap-3">
                  <div>
                    <p className="sz-wordmark text-white">Sitezy</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/30">AI Web Builder</p>
                  </div>
                </Link>

                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <SitezyBadge className="sz-status-info">
                      {inviteOnlyBeta && mode === "signup"
                        ? "Invite-only beta"
                        : mode === "login"
                          ? "Workspace access"
                          : "New workspace"}
                    </SitezyBadge>
                  </div>
                  <h1 className="max-w-[480px] text-[40px] font-bold leading-[1.0] tracking-[-0.055em] xl:text-[52px]">
                    {content.title}
                  </h1>
                  <p className="max-w-[440px] text-[15px] leading-[1.8] text-white/52 tracking-[-0.01em]">
                    {content.subtitle}
                  </p>
                </div>
              </div>

              <div className="mt-auto space-y-2.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/28 mb-3">What you get</p>
                {[
                  "AI-generated multi-page sites from a brief",
                  "Visual canvas editing with full structure control",
                  "Clean HTML export — own your output forever",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3.5 rounded-[20px] border border-white/[0.07] bg-white/[0.04] px-4 py-3.5"
                    style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(91,140,255,0.18)]">
                      <Check size={13} className="text-[#aab4ff]" />
                    </div>
                    <span className="text-[13.5px] text-white/65 tracking-[-0.01em]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SitezyCard className="mx-auto flex w-full max-w-[720px] flex-col p-5 md:p-6 lg:max-w-none lg:min-h-[calc(100dvh-40px)] lg:overflow-hidden">
            <div className="flex flex-1 flex-col gap-4 md:gap-5 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
              <div className="space-y-3 lg:hidden">
                <div className="flex flex-wrap items-center gap-3">
                  {inviteOnlyBeta && mode === "signup" ? <SitezyBadge>Invite-only beta</SitezyBadge> : null}
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--fg-faint)]">
                    {mode === "login" ? "Log in" : "Sign up"}
                  </p>
                </div>
                <div>
                  <h2 className="text-[30px] font-bold tracking-[-0.05em]">
                    {content.title}
                  </h2>
                  <p className="mt-2 text-[14px] leading-[1.75] text-[var(--text-secondary)] tracking-[-0.01em]">
                    {content.subtitle}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">
                  {mode === "login" ? "Sign in with" : "Continue with"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                {oauthProviders.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleOAuth(id)}
                    className="flex min-h-[46px] items-center justify-center gap-3 rounded-[16px] border border-[var(--border-softer)] bg-[var(--surface-4)] px-4 text-[13px] font-semibold text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-5)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <Icon />
                    {label}
                  </button>
                ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="sz-divider flex-1" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">
                  or
                </span>
                <div className="sz-divider flex-1" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">
                  Continue with email
                </p>

                {mode === "signup" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Full name"
                      htmlFor="signup-full-name"
                      icon={<UserRound size={16} className="text-[var(--fg-faint)]" />}
                    >
                      <SitezyInput
                        id="signup-full-name"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Name"
                        autoComplete="name"
                      />
                    </Field>

                    <Field
                      label="Phone"
                      htmlFor="signup-phone"
                      icon={<Phone size={16} className="text-[var(--fg-faint)]" />}
                    >
                      <div className="flex gap-3">
                        <select
                          value={phoneCountryCode}
                          onChange={(event) => setPhoneCountryCode(event.target.value)}
                          className="sz-select w-[116px] shrink-0 bg-[var(--surface-4)] pr-8"
                          aria-label="Country code"
                        >
                          {phoneCountryCodes.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <SitezyInput
                          id="signup-phone"
                          type="tel"
                          value={phoneNumber}
                          onChange={(event) => setPhoneNumber(event.target.value)}
                          placeholder="555 000 0000"
                          autoComplete="tel-national"
                          inputMode="tel"
                        />
                      </div>
                    </Field>
                  </div>
                ) : null}

                <Field
                  label="Email"
                  htmlFor={mode === "signup" ? "signup-email" : "login-email"}
                  icon={<Mail size={16} className="text-[var(--fg-faint)]" />}
                >
                  <SitezyInput
                    id={mode === "signup" ? "signup-email" : "login-email"}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </Field>

                {mode === "signup" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Password"
                      htmlFor="signup-password"
                      icon={<Lock size={16} className="text-[var(--fg-faint)]" />}
                    >
                      <SitezyInput
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                      />
                    </Field>

                    <Field
                      label="Confirm password"
                      htmlFor="signup-confirm-password"
                      icon={<Lock size={16} className="text-[var(--fg-faint)]" />}
                    >
                      <SitezyInput
                        id="signup-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                      />
                    </Field>
                  </div>
                ) : (
                  <Field
                    label="Password"
                    htmlFor="login-password"
                    icon={<Lock size={16} className="text-[var(--fg-faint)]" />}
                  >
                    <SitezyInput
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      autoComplete="current-password"
                      required
                      minLength={8}
                    />
                  </Field>
                )}

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
                      className="text-[12px] font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      Forgot password?
                    </a>
                  </div>
                ) : null}

                {mode === "signup" ? (
                  <label className="flex items-start gap-3 rounded-[18px] border border-[var(--border-softer)] bg-[var(--surface-3)] px-4 py-3 text-[13px] leading-5.5 text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => setAcceptedTerms(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[var(--border-softer)] bg-transparent accent-[var(--accent-default)]"
                    />
                    <span>
                      I agree to the{" "}
                      <Link href="/terms" className="font-semibold text-[var(--text-primary)] underline decoration-[rgba(255,255,255,0.2)] underline-offset-4">
                        terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="font-semibold text-[var(--text-primary)] underline decoration-[rgba(255,255,255,0.2)] underline-offset-4">
                        privacy policy
                      </Link>
                      , and understand this account will be used to store my projects and workspace data.
                    </span>
                  </label>
                ) : null}

                {betaReasonMessage ? (
                  <div className="rounded-[18px] border border-[rgba(240,106,116,0.22)] bg-[rgba(240,106,116,0.08)] px-4 py-3 text-[13px] text-[var(--danger-fg)]">
                    {betaReasonMessage}
                  </div>
                ) : null}

                {verificationMessage ? (
                  <div className="rounded-[18px] border border-[rgba(49,196,141,0.22)] bg-[rgba(49,196,141,0.08)] px-4 py-3 text-[13px] text-[var(--success-fg)]">
                    {verificationMessage}
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-[18px] border border-[rgba(240,106,116,0.22)] bg-[rgba(240,106,116,0.08)] px-4 py-3 text-[13px] text-[var(--danger-fg)]">
                    {error}
                  </div>
                ) : null}

                {message ? (
                  <div className="rounded-[18px] border border-[rgba(49,196,141,0.22)] bg-[rgba(49,196,141,0.08)] px-4 py-3 text-[13px] text-[var(--success-fg)]">
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

              <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--fg-faint)]">
                <p className="text-[13px] text-[var(--text-tertiary)]">
                  {content.altLabel}{" "}
                  <Link href={content.altHref} className="font-semibold text-[var(--text-primary)] transition-opacity hover:opacity-75">
                    {content.altCta}
                  </Link>
                </p>
                <p>
                  Need help? <Link href="/support" className="font-semibold text-[var(--text-primary)]">Support</Link>
                </p>
              </div>
            </div>
          </SitezyCard>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--fg-faint)]"
        >
          {icon}
          <span>{label}</span>
        </label>
        {hint ? <span className="text-[11px] text-[var(--fg-subtle)]">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
