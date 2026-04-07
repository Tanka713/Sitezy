"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, LogOut, MonitorSmartphone, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { resetSignedOutUserSettings } from "@/lib/settings";
import { isValidPhoneDigits, normalizePhoneForMfa, normalizePhoneForStorage, phoneCountryCodes, splitStoredPhoneNumber } from "@/lib/phone";
import { useAppStore } from "@/lib/store";
import type { PhoneOtpStatus, UserAccountProfile } from "@/types";
import {
  AUTH_MFA_001,
  AUTH_MFA_002,
  AUTH_MFA_003,
  AUTH_MFA_004,
  AUTH_REQUIRED_001,
  createAppError,
  logAppError,
  normalizeError,
} from "@/lib/errors";
import {
  SettingsActionRow,
  SettingsField,
  SettingsGrid,
  SettingsGroup,
  SettingsInput,
  SettingsPrimaryAction,
  SettingsRow,
  SettingsSecondaryAction,
  SettingsSelect,
  SettingsStack,
  SettingsStatus,
} from "../ui";

type AssuranceLevel = "aal1" | "aal2" | null;
type PendingIntent = "setup" | "session";

type MfaState = {
  loading: boolean;
  enabled: boolean;
  verifiedFactorId: string | null;
  unverifiedFactorId: string | null;
  currentLevel: AssuranceLevel;
  nextLevel: AssuranceLevel;
};

function browserLabel() {
  if (typeof navigator === "undefined") return "Current browser session";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("chrome")) return "Chrome session";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari session";
  if (ua.includes("firefox")) return "Firefox session";
  if (ua.includes("edg")) return "Edge session";
  return "Current browser session";
}

function mapMfaError(error: unknown, fallbackCode: typeof AUTH_MFA_001 | typeof AUTH_MFA_002 | typeof AUTH_MFA_003 | typeof AUTH_MFA_004, action: string) {
  const maybe = (error ?? {}) as { code?: string; message?: string };

  if (maybe.code === "mfa_phone_enroll_not_enabled" || maybe.code === "mfa_phone_verify_not_enabled" || maybe.code === "phone_provider_disabled") {
    return createAppError({
      code: fallbackCode,
      devMessage: `Phone MFA is not enabled in Supabase during ${action}: ${maybe.message ?? "unknown error"}`,
      userMessage: "Phone-based 2FA is not enabled in Supabase yet.",
      severity: "warn",
      metadata: { action, supabaseCode: maybe.code },
      cause: error,
    });
  }

  if (maybe.code === "sms_send_failed" || maybe.code === "over_sms_send_rate_limit") {
    return createAppError({
      code: AUTH_MFA_002,
      devMessage: `SMS delivery failed during ${action}: ${maybe.message ?? "unknown error"}`,
      userMessage: "We couldn't send the mobile verification code right now.",
      severity: "warn",
      metadata: { action, supabaseCode: maybe.code },
      cause: error,
    });
  }

  if (maybe.code === "mfa_verification_failed" || maybe.code === "mfa_verification_rejected" || maybe.code === "otp_expired") {
    return createAppError({
      code: AUTH_MFA_003,
      devMessage: `Phone MFA verification failed during ${action}: ${maybe.message ?? "unknown error"}`,
      userMessage: "That verification code was invalid or expired.",
      severity: "warn",
      metadata: { action, supabaseCode: maybe.code },
      cause: error,
    });
  }

  if (maybe.code === "insufficient_aal") {
    return createAppError({
      code: AUTH_MFA_004,
      devMessage: `Attempted MFA change without aal2 during ${action}: ${maybe.message ?? "unknown error"}`,
      userMessage: "Verify a mobile code in this session before turning 2FA off.",
      severity: "warn",
      metadata: { action, supabaseCode: maybe.code },
      cause: error,
    });
  }

  return normalizeError(error, fallbackCode, { action });
}

export function SecuritySection({
  account,
  onAccountChange,
}: {
  account: UserAccountProfile;
  onAccountChange: (next: UserAccountProfile) => void;
}) {
  const setApiError = useAppStore((state) => state.setApiError);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [workingAction, setWorkingAction] = useState<null | "refresh" | "send" | "verify" | "disable">(null);
  const [status, setStatus] = useState<{ tone: "success" | "error" | "muted"; message: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [pendingChallengeId, setPendingChallengeId] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
  const [pendingPhoneLabel, setPendingPhoneLabel] = useState<string | null>(null);

  const initialPhone = useMemo(() => splitStoredPhoneNumber(account.phoneNumber), [account.phoneNumber]);
  const [phoneCountryCode, setPhoneCountryCode] = useState(account.phoneCountryCode ?? initialPhone.countryCode);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone.localNumber);
  const [mfaState, setMfaState] = useState<MfaState>({
    loading: true,
    enabled: false,
    verifiedFactorId: null,
    unverifiedFactorId: null,
    currentLevel: null,
    nextLevel: null,
  });
  const sessionName = useMemo(() => browserLabel(), []);
  const storedPhone = normalizePhoneForStorage(phoneCountryCode, phoneNumber);

  useEffect(() => {
    const next = splitStoredPhoneNumber(account.phoneNumber);
    setPhoneCountryCode(account.phoneCountryCode ?? next.countryCode);
    setPhoneNumber(next.localNumber);
  }, [account.phoneCountryCode, account.phoneNumber]);

  useEffect(() => {
    void refreshMfaState();
  }, []);

  async function refreshMfaState() {
    setWorkingAction((current) => current ?? "refresh");
    try {
      const supabase = getSupabaseBrowserClient();
      const [
        { data: factorsData, error: factorsError },
        { data: assuranceData, error: assuranceError },
      ] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      if (factorsError) throw factorsError;
      if (assuranceError) throw assuranceError;

      const verifiedFactor = factorsData?.phone?.[0] ?? null;
      const unverifiedFactor =
        factorsData?.all.find(
          (factor: { factor_type: string; status: string }) =>
            factor.factor_type === "phone" && factor.status === "unverified"
        ) ?? null;

      setMfaState({
        loading: false,
        enabled: Boolean(verifiedFactor),
        verifiedFactorId: verifiedFactor?.id ?? null,
        unverifiedFactorId: unverifiedFactor?.id ?? null,
        currentLevel: assuranceData?.currentLevel ?? null,
        nextLevel: assuranceData?.nextLevel ?? null,
      });
    } catch (error) {
      const appErr = mapMfaError(error, AUTH_MFA_001, "loadPhoneMfaState");
      logAppError(appErr);
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({ tone: "error", message: appErr.userMessage });
      setMfaState({
        loading: false,
        enabled: false,
        verifiedFactorId: null,
        unverifiedFactorId: null,
        currentLevel: null,
        nextLevel: null,
      });
    } finally {
      setWorkingAction((current) => (current === "refresh" ? null : current));
    }
  }

  async function syncPhoneMetadata(phoneOtpStatus: PhoneOtpStatus) {
    const supabase = getSupabaseBrowserClient();
    const nextPhone = storedPhone ?? account.phoneNumber ?? null;
    const nextCountryCode = nextPhone ? phoneCountryCode : account.phoneCountryCode ?? null;

    const { error } = await supabase.auth.updateUser({
      data: {
        phone_country_code: nextCountryCode,
        phone_number: nextPhone,
        phone_otp_status: phoneOtpStatus,
      },
    });

    if (error) throw error;

    onAccountChange({
      ...account,
      phoneCountryCode: nextCountryCode,
      phoneNumber: nextPhone,
      phoneOtpStatus,
    });
  }

  async function createChallengeForFactor(factorId: string, intent: PendingIntent, phoneLabel: string, successMessage: string) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId,
      channel: "sms",
    });

    if (error || !data?.id) {
      throw error ?? createAppError({
        code: AUTH_MFA_002,
        devMessage: `Missing challenge response for factor ${factorId}`,
        severity: "error",
      });
    }

    setPendingFactorId(factorId);
    setPendingChallengeId(data.id);
    setPendingIntent(intent);
    setPendingPhoneLabel(phoneLabel);
    setOtpCode("");
    setStatus({ tone: "success", message: successMessage });
  }

  async function handleStartSetup() {
    setStatus(null);

    if (!storedPhone || !isValidPhoneDigits(phoneNumber)) {
      const appErr = createAppError({
        code: AUTH_MFA_001,
        devMessage: `Invalid phone MFA enrollment input: ${phoneCountryCode} ${phoneNumber}`,
        userMessage: "Enter a valid mobile number to enable 2FA.",
        severity: "warn",
      });
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({ tone: "error", message: appErr.userMessage });
      return;
    }

    const mfaPhone = normalizePhoneForMfa(phoneCountryCode, phoneNumber);
    if (!mfaPhone) return;

    setWorkingAction("send");
    try {
      const supabase = getSupabaseBrowserClient();

      if (mfaState.unverifiedFactorId) {
        await supabase.auth.mfa.unenroll({ factorId: mfaState.unverifiedFactorId });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "phone",
        friendlyName: "Sitezy mobile",
        phone: mfaPhone,
      });

      if (error || !data?.id) {
        throw error ?? createAppError({
          code: AUTH_MFA_001,
          devMessage: `Missing phone MFA enroll response for ${mfaPhone}`,
          severity: "error",
        });
      }

      await syncPhoneMetadata("pending_setup");
      await createChallengeForFactor(data.id, "setup", storedPhone, `We sent a verification code to ${storedPhone}.`);
      await refreshMfaState();
    } catch (error) {
      const appErr = mapMfaError(error, AUTH_MFA_002, "startPhoneMfaSetup");
      logAppError(appErr);
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({ tone: "error", message: appErr.userMessage });
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleVerifyCode() {
    setStatus(null);

    if (!pendingFactorId || !pendingChallengeId) {
      const appErr = createAppError({
        code: AUTH_MFA_003,
        devMessage: "Attempted phone MFA verify without pending factor/challenge",
        userMessage: "Send a verification code first.",
        severity: "warn",
      });
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({ tone: "error", message: appErr.userMessage });
      return;
    }

    if (!/^\d{6,8}$/.test(otpCode.trim())) {
      const appErr = createAppError({
        code: AUTH_MFA_003,
        devMessage: `Invalid phone MFA code length during verify: ${otpCode}`,
        userMessage: "Enter the verification code we sent to your phone.",
        severity: "warn",
      });
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({ tone: "error", message: appErr.userMessage });
      return;
    }

    setWorkingAction("verify");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.mfa.verify({
        factorId: pendingFactorId,
        challengeId: pendingChallengeId,
        code: otpCode.trim(),
      });

      if (error) throw error;

      if (pendingIntent === "setup") {
        await syncPhoneMetadata("enabled");
      } else if (account.phoneOtpStatus !== "enabled") {
        await syncPhoneMetadata("enabled");
      }

      setPendingFactorId(null);
      setPendingChallengeId(null);
      setPendingIntent(null);
      setPendingPhoneLabel(null);
      setOtpCode("");
      await refreshMfaState();
      setStatus({
        tone: "success",
        message:
          pendingIntent === "setup"
            ? "Mobile two-factor authentication is now enabled."
            : "This session is now verified with your mobile code.",
      });
    } catch (error) {
      const appErr = mapMfaError(error, AUTH_MFA_003, "verifyPhoneMfaCode");
      logAppError(appErr);
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({ tone: "error", message: appErr.userMessage });
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleVerifySession() {
    if (!mfaState.verifiedFactorId) return;
    setWorkingAction("send");
    setStatus(null);
    try {
      await createChallengeForFactor(
        mfaState.verifiedFactorId,
        "session",
        account.phoneNumber ?? "your phone",
        `We sent a verification code to ${account.phoneNumber ?? "your phone"}.`
      );
    } catch (error) {
      const appErr = mapMfaError(error, AUTH_MFA_002, "challengeExistingPhoneFactor");
      logAppError(appErr);
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({ tone: "error", message: appErr.userMessage });
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleDisable2fa() {
    if (!mfaState.verifiedFactorId || mfaState.currentLevel !== "aal2") return;
    setWorkingAction("disable");
    setStatus(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: mfaState.verifiedFactorId,
      });

      if (error) throw error;

      await syncPhoneMetadata("disabled");
      setPendingFactorId(null);
      setPendingChallengeId(null);
      setPendingIntent(null);
      setPendingPhoneLabel(null);
      setOtpCode("");
      await refreshMfaState();
      setStatus({ tone: "success", message: "Mobile two-factor authentication has been turned off." });
    } catch (error) {
      const appErr = mapMfaError(error, AUTH_MFA_004, "disablePhoneMfa");
      logAppError(appErr);
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({ tone: "error", message: appErr.userMessage });
    } finally {
      setWorkingAction(null);
    }
  }

  async function handleSignOutAll() {
    setSigningOutAll(true);
    setStatus(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      resetSignedOutUserSettings();
      window.location.assign("/login");
    } catch (error) {
      const appErr = normalizeError(error, AUTH_REQUIRED_001, { action: "signOutAllSessions" });
      logAppError(appErr);
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({
        tone: "error",
        message: appErr.userMessage,
      });
      setSigningOutAll(false);
    }
  }

  const hasPendingCode = Boolean(pendingFactorId && pendingChallengeId);
  const sessionNeedsStepUp = mfaState.enabled && mfaState.currentLevel !== "aal2";

  return (
    <SettingsStack>
      {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

      <SettingsGroup title="Active sessions" body="Keep control of your current browser session and sign every device out when needed.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-4)] text-[var(--fg-soft)]">
                <MonitorSmartphone size={16} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">{sessionName}</p>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{account.email}</p>
              </div>
            </div>
            <span className="rounded-full border border-[rgba(49,196,141,0.2)] bg-[rgba(49,196,141,0.1)] px-3 py-1.5 text-[12px] font-medium text-[var(--success-fg)]">
              Current session
            </span>
          </div>

          <SettingsActionRow>
            <SettingsSecondaryAction type="button" onClick={() => void handleSignOutAll()} disabled={signingOutAll}>
              {signingOutAll ? <Loader2 size={14} className="spin" /> : <LogOut size={14} />}
              Logout from all devices
            </SettingsSecondaryAction>
          </SettingsActionRow>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Mobile 2FA" body="Use a verification code sent to your phone as the second step for sensitive account access.">
        <div className="space-y-4">
          <SettingsRow
            title={mfaState.enabled ? "Mobile protection is on" : "Set up mobile verification"}
            body={
              mfaState.enabled
                ? sessionNeedsStepUp
                  ? "Two-factor authentication is enabled. Verify this session with a mobile code before making security changes."
                  : "This account is protected with a verified mobile factor."
                : "Add a mobile number and confirm the code from Supabase SMS to enable 2FA."
            }
            action={
              <span
                className={
                  mfaState.enabled
                    ? "rounded-full border border-[rgba(49,196,141,0.2)] bg-[rgba(49,196,141,0.1)] px-3 py-1.5 text-[12px] font-medium text-[var(--success-fg)]"
                    : "rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-1.5 text-[12px] font-medium text-[var(--fg-soft)]"
                }
              >
                {mfaState.loading ? "Checking..." : mfaState.enabled ? "Enabled" : "Not enabled"}
              </span>
            }
          >
            {mfaState.enabled ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-4)] px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-5)] text-[var(--fg-soft)]">
                    <ShieldCheck size={16} />
                  </div>
                <div className="space-y-1">
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                      {account.phoneNumber ?? pendingPhoneLabel ?? "Phone factor verified"}
                    </p>
                    <p className="text-[13px] leading-6 text-[var(--text-secondary)]">
                      {mfaState.currentLevel === "aal2"
                        ? "This session has already completed the second factor."
                        : "This account has a verified phone factor, but this session still needs a mobile code."}
                    </p>
                  </div>
                </div>

                <SettingsActionRow>
                  {sessionNeedsStepUp ? (
                    <SettingsPrimaryAction type="button" onClick={() => void handleVerifySession()} disabled={workingAction !== null}>
                      {workingAction === "send" ? <Loader2 size={14} className="spin" /> : <Smartphone size={14} />}
                      Verify this session
                    </SettingsPrimaryAction>
                  ) : null}
                  <SettingsSecondaryAction
                    type="button"
                    onClick={() => void handleDisable2fa()}
                    disabled={workingAction !== null || mfaState.currentLevel !== "aal2"}
                  >
                    {workingAction === "disable" ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                    Turn off 2FA
                  </SettingsSecondaryAction>
                </SettingsActionRow>

                {sessionNeedsStepUp ? (
                  <p className="text-[12px] leading-6 text-[var(--text-secondary)]">
                    Verify a code in this session before you can remove or replace the current phone factor.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <SettingsGrid>
                  <SettingsField label="Country code">
                    <SettingsSelect value={phoneCountryCode} onChange={(event) => setPhoneCountryCode(event.target.value)}>
                      {phoneCountryCodes.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SettingsSelect>
                  </SettingsField>

                  <SettingsField label="Mobile number" hint="SMS code delivery">
                    <SettingsInput
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="555 000 0000"
                    />
                  </SettingsField>
                </SettingsGrid>

                <SettingsActionRow>
                  <SettingsPrimaryAction type="button" onClick={() => void handleStartSetup()} disabled={workingAction !== null}>
                    {workingAction === "send" ? <Loader2 size={14} className="spin" /> : <Smartphone size={14} />}
                    Send verification code
                  </SettingsPrimaryAction>
                </SettingsActionRow>
              </div>
            )}
          </SettingsRow>

          {hasPendingCode ? (
            <SettingsRow
              title={pendingIntent === "setup" ? "Confirm your phone" : "Confirm this session"}
              body={
                pendingIntent === "setup"
                  ? `Enter the SMS code sent to ${pendingPhoneLabel ?? "your phone"} to finish enabling mobile 2FA.`
                  : `Enter the SMS code sent to ${pendingPhoneLabel ?? "your phone"} to elevate this session.`
              }
            >
              <div className="space-y-4">
                <SettingsField label="Verification code" hint="6 to 8 digits">
                  <SettingsInput
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                  />
                </SettingsField>

                <SettingsActionRow>
                  <SettingsPrimaryAction type="button" onClick={() => void handleVerifyCode()} disabled={workingAction !== null}>
                    {workingAction === "verify" ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />}
                    Verify code
                  </SettingsPrimaryAction>
                  <SettingsSecondaryAction
                    type="button"
                    onClick={() => void (pendingIntent === "setup" ? handleStartSetup() : handleVerifySession())}
                    disabled={workingAction !== null}
                  >
                    {workingAction === "send" ? <Loader2 size={14} className="spin" /> : <Smartphone size={14} />}
                    Resend code
                  </SettingsSecondaryAction>
                </SettingsActionRow>
              </div>
            </SettingsRow>
          ) : null}
        </div>
      </SettingsGroup>
    </SettingsStack>
  );
}
