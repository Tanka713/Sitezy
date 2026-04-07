import type { BetaAccessRecord, BetaRole, CurrentBetaAccess } from "@/types";
import { AUTH_PERMISSION_001, createAppError } from "@/lib/errors";

const ROLE_ORDER: Record<BetaRole, number> = {
  customer: 1,
  customer_service: 2,
  admin: 3,
};

export function normalizeLaunchEmail(email?: string | null) {
  return String(email ?? "").trim().toLowerCase();
}

function parseEmailList(raw?: string | null) {
  return new Set(
    String(raw ?? "")
      .split(/[\n,]/)
      .map((value) => normalizeLaunchEmail(value))
      .filter(Boolean)
  );
}

export function isInviteOnlyBetaEnabled() {
  return String(process.env.SITEZY_BETA_MODE ?? "")
    .trim()
    .toLowerCase() === "invite-only";
}

export function getSupportEmail() {
  return String(process.env.SITEZY_SUPPORT_EMAIL ?? "support@sitezy.app").trim() || "support@sitezy.app";
}

export function getBetaDeniedMessage() {
  const base =
    String(process.env.SITEZY_BETA_DENIED_MESSAGE ?? "").trim() ||
    "This private beta is currently limited to invited accounts.";
  return `${base} Contact ${getSupportEmail()} if you need access.`;
}

export function getBootstrapAdminEmails() {
  return parseEmailList(process.env.SITEZY_ADMIN_EMAILS);
}

export function getBootstrapAllowedBetaEmails() {
  return parseEmailList(process.env.SITEZY_BETA_ALLOWLIST);
}

export function hasMinimumBetaRole(actual: BetaRole | null | undefined, minimum: BetaRole) {
  if (!actual) return false;
  return ROLE_ORDER[actual] >= ROLE_ORDER[minimum];
}

export function resolveLaunchAccess(
  email?: string | null,
  record?: BetaAccessRecord | null
): CurrentBetaAccess {
  const normalizedEmail = normalizeLaunchEmail(email);
  const inviteOnlyBeta = isInviteOnlyBetaEnabled();

  if (normalizedEmail && getBootstrapAdminEmails().has(normalizedEmail)) {
    return {
      allowed: true,
      email: normalizedEmail,
      inviteOnlyBeta,
      role: "admin",
      status: "active",
      source: "bootstrap-admin",
    };
  }

  if (record) {
    if (record.status === "revoked") {
      return {
        allowed: false,
        email: normalizedEmail,
        inviteOnlyBeta,
        role: record.role,
        status: record.status,
        source: "beta-access",
      };
    }

    return {
      allowed: true,
      email: normalizedEmail,
      inviteOnlyBeta,
      role: record.role,
      status: record.status,
      source: "beta-access",
    };
  }

  if (normalizedEmail && getBootstrapAllowedBetaEmails().has(normalizedEmail)) {
    return {
      allowed: true,
      email: normalizedEmail,
      inviteOnlyBeta,
      role: "customer",
      status: "active",
      source: "bootstrap-allowlist",
    };
  }

  if (!inviteOnlyBeta) {
    return {
      allowed: true,
      email: normalizedEmail,
      inviteOnlyBeta,
      role: "customer",
      status: "active",
      source: "open",
    };
  }

  return {
    allowed: false,
    email: normalizedEmail,
    inviteOnlyBeta,
    role: null,
    status: null,
    source: "none",
  };
}

export function assertLaunchAccess(email?: string | null, record?: BetaAccessRecord | null, context = "launch access") {
  const access = resolveLaunchAccess(email, record);
  if (access.allowed) return access;
  throw createAppError({
    code: AUTH_PERMISSION_001,
    devMessage: `Invite-only beta blocked "${normalizeLaunchEmail(email)}" during ${context}`,
    userMessage: getBetaDeniedMessage(),
    severity: "warn",
    metadata: {
      email: normalizeLaunchEmail(email),
      context,
      inviteOnlyBeta: access.inviteOnlyBeta,
      source: access.source,
    },
  });
}

export function getPublicLaunchConfig() {
  return {
    inviteOnlyBeta: isInviteOnlyBetaEnabled(),
    supportEmail: getSupportEmail(),
    betaDeniedMessage: getBetaDeniedMessage(),
  };
}
