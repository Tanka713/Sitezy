"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Loader2,
  MailPlus,
  RotateCcw,
  ShieldCheck,
  ShieldEllipsis,
  ShieldPlus,
  Users,
} from "lucide-react";
import { UserAvatarMenu } from "@/components/ui/UserAvatarMenu";
import { SitezyBadge, SitezyButton, SitezyCard, SitezyInput, SitezyTextarea } from "@/components/ui/sitezy";
import {
  API_AUTH_001,
  API_BILLING_001,
  API_RATE_LIMIT_001,
  API_RESPONSE_001,
  API_TIMEOUT_001,
  API_UNKNOWN_001,
  createAppError,
  logAppError,
  normalizeError,
  type ErrorCode,
} from "@/lib/errors";
import { formatShortDateTime } from "@/lib/utils";
import type {
  AdminMemberRecord,
  BetaAccessRecord,
  BetaAccessStatus,
  BetaInterestRequest,
  BetaRole,
  CurrentBetaAccess,
} from "@/types";

type StatusTone = "success" | "error" | "muted";
type MemberFilter = "all" | BetaAccessStatus;
type RoleFilter = "all" | BetaRole;
type JsonErrorPayload = { error?: string; code?: string; requestId?: string | null };
type AdminInvitePayload = {
  record?: BetaAccessRecord;
  inviteEmailSent?: boolean;
  inviteEmailCode?: string | null;
  inviteEmailError?: string | null;
  error?: string;
  code?: string;
  requestId?: string | null;
};
type AdminMemberPayload = {
  record?: AdminMemberRecord | BetaAccessRecord;
  error?: string;
  code?: string;
  requestId?: string | null;
};

function resolveApiErrorCode(status: number, code?: string): ErrorCode {
  if (code) return code as ErrorCode;
  switch (status) {
    case 401:
      return API_AUTH_001;
    case 402:
      return API_BILLING_001;
    case 429:
      return API_RATE_LIMIT_001;
    case 504:
      return API_TIMEOUT_001;
    default:
      return API_UNKNOWN_001;
  }
}

async function readJsonPayload<T>(response: Response, target: string): Promise<(T & JsonErrorPayload) | null> {
  try {
    return (await response.json()) as T & JsonErrorPayload;
  } catch (error) {
    if (response.ok) {
      throw createAppError({
        code: API_RESPONSE_001,
        devMessage: `Invalid JSON response from ${target} (${response.status})`,
        severity: "error",
        metadata: { target, status: response.status },
        cause: error,
      });
    }
    return null;
  }
}

function buildApiResponseError(
  response: Response,
  payload: JsonErrorPayload | null,
  fallbackMessage: string,
  target: string
) {
  const code = resolveApiErrorCode(response.status, payload?.code);
  return createAppError({
    code,
    devMessage: `Request to ${target} failed (${response.status}): ${payload?.error ?? fallbackMessage}`,
    userMessage: typeof payload?.error === "string" && payload.error.trim() ? payload.error.trim() : fallbackMessage,
    severity: response.status >= 500 ? "error" : "warn",
    metadata: {
      target,
      status: response.status,
      requestId: payload?.requestId ?? null,
    },
  });
}

function formatDate(value: string | null) {
  return value ? formatShortDateTime(value) : "Not yet";
}

function upsertMember(current: AdminMemberRecord[], next: AdminMemberRecord | BetaAccessRecord) {
  const existingIndex = current.findIndex((member) => member.id === next.id || member.email === next.email);
  const normalizedNext: AdminMemberRecord =
    "billing" in next
      ? next
      : {
          ...next,
          billing: existingIndex >= 0 ? current[existingIndex]?.billing ?? null : null,
        };
  if (existingIndex === -1) return [normalizedNext, ...current];
  const cloned = [...current];
  cloned[existingIndex] = {
    ...cloned[existingIndex],
    ...normalizedNext,
    billing: normalizedNext.billing ?? cloned[existingIndex].billing ?? null,
  };
  return cloned;
}

function formatRole(role: BetaRole) {
  return role === "customer_service" ? "Customer service" : role === "customer" ? "Customer" : "Admin";
}

function formatStatusCodeLabel(code?: string | null) {
  return code ? `Code: ${code}` : null;
}

function metricCard(label: string, value: number, icon: ReactNode) {
  return (
    <div className="rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">{label}</p>
          <p className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-4)] text-[var(--text-accent)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard({
  currentAccess,
  initialMembers,
  canEmailInvites,
  initialInterestRequests,
  betaInterestStorageReady,
}: {
  currentAccess: CurrentBetaAccess;
  initialMembers: AdminMemberRecord[];
  canEmailInvites: boolean;
  initialInterestRequests: BetaInterestRequest[];
  betaInterestStorageReady: boolean;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<BetaRole>("customer");
  const [inviteNote, setInviteNote] = useState("");
  const [sendEmail, setSendEmail] = useState(canEmailInvites);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [busyInterestId, setBusyInterestId] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [interestQuery, setInterestQuery] = useState("");
  const [creditDrafts, setCreditDrafts] = useState<Record<string, string>>({});
  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: StatusTone; message: string; code?: string | null } | null>(null);

  const summary = useMemo(
    () => ({
      total: members.length,
      invited: members.filter((member) => member.status === "invited").length,
      active: members.filter((member) => member.status === "active").length,
      customerService: members.filter((member) => member.role === "customer_service").length,
      interest: initialInterestRequests.length,
    }),
    [initialInterestRequests.length, members]
  );

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return members.filter((member) => {
      if (memberFilter !== "all" && member.status !== memberFilter) return false;
      if (roleFilter !== "all" && member.role !== roleFilter) return false;
      if (!query) return true;
      return [member.email, member.note ?? "", member.role, member.status].join(" ").toLowerCase().includes(query);
    });
  }, [memberFilter, members, roleFilter, searchQuery]);

  const membersByEmail = useMemo(
    () =>
      new Map(
        members.map((member) => [member.email.trim().toLowerCase(), member] as const)
      ),
    [members]
  );

  const filteredInterestRequests = useMemo(() => {
    const query = interestQuery.trim().toLowerCase();
    if (!query) return initialInterestRequests;
    return initialInterestRequests.filter((interest) =>
      [interest.email, interest.userName ?? "", interest.note ?? ""].join(" ").toLowerCase().includes(query)
    );
  }, [initialInterestRequests, interestQuery]);

  function handleUseInterest(interest: BetaInterestRequest) {
    setInviteEmail(interest.email);
    setInviteRole("customer");
    setInviteNote(interest.note ?? "");
    setStatus({
      tone: "muted",
      message: `Invite composer filled for ${interest.email}.`,
      code: null,
    });
  }

  function getInterestAccessSummary(interest: BetaInterestRequest) {
    const member = membersByEmail.get(interest.email.trim().toLowerCase());
    if (!member) {
      return {
        label: "Not invited",
        detail: "No beta access record yet.",
      };
    }

    return {
      label: member.status === "active" ? "Active" : member.status === "invited" ? "Invited" : "Revoked",
      detail: `${formatRole(member.role)} account`,
    };
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingInvite(true);
    setStatus(null);

    try {
      const target = "/api/admin/invites";
      const response = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          note: inviteNote,
          sendEmail,
        }),
      });

      const payload = await readJsonPayload<AdminInvitePayload>(response, target);

      if (!response.ok || !payload?.record) {
        throw buildApiResponseError(response, payload, "We couldn't create that beta invite.", target);
      }

      const record = payload.record;
      setMembers((current) => upsertMember(current, record));
      setInviteEmail("");
      setInviteRole("customer");
      setInviteNote("");
      setStatus({
        tone: payload.inviteEmailSent ? "success" : "muted",
        message: payload.inviteEmailSent
          ? "Invite sent."
          : payload.inviteEmailError
            ? `Invite saved, but email delivery failed: ${payload.inviteEmailError}`
            : "Invite saved.",
        code: payload.inviteEmailError ? payload.inviteEmailCode ?? null : null,
      });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "createBetaInvite" });
      logAppError(appErr);
      setStatus({ tone: "error", message: appErr.userMessage, code: appErr.code });
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function handleMemberUpdate(id: string, patch: { role?: BetaRole; status?: BetaAccessStatus }) {
    setBusyMemberId(id);
    setStatus(null);
    try {
      const target = `/api/admin/invites/${id}`;
      const response = await fetch(target, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await readJsonPayload<AdminMemberPayload>(response, target);

      if (!response.ok || !payload?.record) {
        throw buildApiResponseError(response, payload, "We couldn't update that beta member.", target);
      }

      const record = payload.record;
      setMembers((current) => upsertMember(current, record));
      setStatus({ tone: "success", message: "Member access updated.", code: null });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "updateBetaMember", memberId: id });
      logAppError(appErr);
      setStatus({ tone: "error", message: appErr.userMessage, code: appErr.code });
    } finally {
      setBusyMemberId(null);
    }
  }

  async function handleResendInvite(member: BetaAccessRecord) {
    setBusyMemberId(member.id);
    setStatus(null);
    try {
      const target = "/api/admin/invites";
      const response = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: member.email,
          role: member.role,
          note: member.note,
          sendEmail: true,
        }),
      });

      const payload = await readJsonPayload<AdminInvitePayload>(response, target);

      if (!response.ok || !payload?.record) {
        throw buildApiResponseError(response, payload, "We couldn't resend that invite.", target);
      }

      const record = payload.record;
      setMembers((current) => upsertMember(current, record));
      setStatus({
        tone: payload.inviteEmailSent ? "success" : "muted",
        message: payload.inviteEmailSent
          ? "Invite email sent."
          : payload.inviteEmailError || "Invite record refreshed, but no email was sent.",
        code: payload.inviteEmailError ? payload.inviteEmailCode ?? null : null,
      });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "resendInvite", memberId: member.id });
      logAppError(appErr);
      setStatus({ tone: "error", message: appErr.userMessage, code: appErr.code });
    } finally {
      setBusyMemberId(null);
    }
  }

  async function handleApproveInterest(interest: BetaInterestRequest) {
    setBusyInterestId(interest.id);
    setStatus(null);

    try {
      const target = "/api/admin/invites";
      const response = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: interest.email,
          role: "customer",
          note: interest.note,
          sendEmail: true,
        }),
      });

      const payload = await readJsonPayload<AdminInvitePayload>(response, target);

      if (!response.ok || !payload?.record) {
        throw buildApiResponseError(response, payload, "We couldn't approve that beta request.", target);
      }

      const record = payload.record;
      setMembers((current) => upsertMember(current, record));
      setInviteEmail(record.email);
      setInviteRole(record.role);
      setInviteNote(record.note ?? "");
      setStatus({
        tone: payload.inviteEmailSent ? "success" : "muted",
        message: payload.inviteEmailSent
          ? `Invite sent to ${record.email}.`
          : payload.inviteEmailError
            ? `Access approved for ${record.email}, but email delivery failed: ${payload.inviteEmailError}`
            : `Access approved for ${record.email}.`,
        code: payload.inviteEmailError ? payload.inviteEmailCode ?? null : null,
      });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "approveInterest", email: interest.email });
      logAppError(appErr);
      setStatus({ tone: "error", message: appErr.userMessage, code: appErr.code });
    } finally {
      setBusyInterestId(null);
    }
  }

  async function handleBillingUpdate(
    member: AdminMemberRecord,
    patch: { creditDelta?: number; setTokenLimit?: number; resetUsage?: boolean }
  ) {
    setBusyMemberId(member.id);
    setStatus(null);

    try {
      const target = `/api/admin/members/${member.id}/credits`;
      const response = await fetch(target, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await readJsonPayload<AdminMemberPayload>(response, target);

      if (!response.ok || !payload?.record) {
        throw buildApiResponseError(response, payload, "We couldn't update that credit balance.", target);
      }

      const nextMember = "billing" in payload.record
        ? (payload.record as AdminMemberRecord)
        : ({
            ...payload.record,
            billing: member.billing,
          } satisfies AdminMemberRecord);

      setMembers((current) => upsertMember(current, nextMember));

      if (patch.creditDelta) {
        setCreditDrafts((current) => ({ ...current, [member.id]: "" }));
        setStatus({
          tone: "success",
          message: `${patch.creditDelta} credits added to ${member.email}.`,
          code: null,
        });
      } else if (patch.resetUsage) {
        setStatus({
          tone: "success",
          message: `Usage reset for ${member.email}.`,
          code: null,
        });
      } else if (typeof patch.setTokenLimit === "number") {
        setLimitDrafts((current) => ({ ...current, [member.id]: String(patch.setTokenLimit) }));
        setStatus({
          tone: "success",
          message: `Credit limit updated for ${member.email}.`,
          code: null,
        });
      }
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "updateCredits", memberId: member.id });
      logAppError(appErr);
      setStatus({ tone: "error", message: appErr.userMessage, code: appErr.code });
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sz-topbar sticky top-0 z-40">
        <div className="sz-grid-shell flex h-20 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex items-center">
              <span className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Sitezy</span>
            </Link>
            <div className="hidden h-6 w-px bg-[var(--border-soft)] md:block" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Admin control</p>
              <p className="truncate text-[13px] text-[var(--text-secondary)]">Invites, roles, and platform access</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/customer-service">
              <SitezyButton variant="secondary" size="sm">
                <ShieldEllipsis size={14} />
                Customer service
              </SitezyButton>
            </Link>
            <UserAvatarMenu showStudioShortcut={false} />
          </div>
        </div>
      </header>

      <main className="sz-grid-shell py-6 md:py-8">
        <div className="space-y-6">
          <SitezyCard className="p-5 md:p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {metricCard("Members", summary.total, <Users size={15} />)}
              {metricCard("Invited", summary.invited, <MailPlus size={15} />)}
              {metricCard("Active", summary.active, <ShieldCheck size={15} />)}
              {metricCard("Customer service", summary.customerService, <ShieldEllipsis size={15} />)}
              {metricCard("Interest inbox", summary.interest, <ShieldPlus size={15} />)}
            </div>
          </SitezyCard>

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
              <div>{status.message}</div>
              {status.code ? (
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
                  {formatStatusCodeLabel(status.code)}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <SitezyCard className="p-5 xl:sticky xl:top-[104px] xl:self-start">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">Invite composer</p>
                  <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Send beta access
                  </h2>
                  <p className="text-[13px] leading-6 text-[var(--text-secondary)]">
                    Create or refresh access records and optionally dispatch the invite email immediately.
                  </p>
                </div>

                {!canEmailInvites ? (
                  <div className="rounded-[16px] border border-[rgba(240,178,52,0.22)] bg-[rgba(240,178,52,0.08)] px-4 py-3 text-[12px] leading-6 text-[var(--text-secondary)]">
                    Invite records can still be created, but email delivery is not configured in this environment.
                  </div>
                ) : null}

                <form className="space-y-4" onSubmit={handleInvite}>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--fg-faint)]">Email</label>
                    <SitezyInput
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="name@company.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--fg-faint)]">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(event) => setInviteRole(event.target.value as BetaRole)}
                      className="sz-input"
                    >
                      <option value="customer">Customer</option>
                      <option value="customer_service">Customer service</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--fg-faint)]">Internal note</label>
                    <SitezyTextarea
                      value={inviteNote}
                      onChange={(event) => setInviteNote(event.target.value)}
                      placeholder="Pilot account, agency tester, founder friend, internal staff, or other context."
                      rows={5}
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4 text-[12px] leading-6 text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(event) => setSendEmail(event.target.checked)}
                      disabled={!canEmailInvites}
                      className="mt-1 h-4 w-4 rounded border-[var(--border-softer)] bg-transparent accent-[var(--accent-default)]"
                    />
                    <span>
                      {canEmailInvites
                        ? "Send the Supabase invite email after saving the access record."
                        : "Email delivery is disabled here, so this only saves the access record."}
                    </span>
                  </label>

                  <SitezyButton type="submit" variant="primary" size="lg" className="w-full" disabled={submittingInvite}>
                    {submittingInvite ? <Loader2 size={16} className="animate-spin" /> : <MailPlus size={16} />}
                    {submittingInvite ? "Saving invite..." : "Save invite"}
                  </SitezyButton>
                </form>
              </div>
            </SitezyCard>

            <SitezyCard className="p-5 md:p-6">
              <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">Access roster</p>
                    <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                      Current members
                    </h2>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,260px)_140px_160px]">
                    <label className="block">
                      <SitezyInput
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search email or note"
                      />
                    </label>

                    <select
                      value={memberFilter}
                      onChange={(event) => setMemberFilter(event.target.value as MemberFilter)}
                      className="sz-input"
                    >
                      <option value="all">All statuses</option>
                      <option value="invited">Invited</option>
                      <option value="active">Active</option>
                      <option value="revoked">Revoked</option>
                    </select>

                    <select
                      value={roleFilter}
                      onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                      className="sz-input"
                    >
                      <option value="all">All roles</option>
                      <option value="customer">Customer</option>
                      <option value="customer_service">Customer service</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredMembers.length ? (
                    filteredMembers.map((member) => {
                      const busy = busyMemberId === member.id;
                      return (
                        <div
                          key={member.id}
                          className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{member.email}</p>
                                <SitezyBadge>{member.status}</SitezyBadge>
                                <SitezyBadge>{formatRole(member.role)}</SitezyBadge>
                              </div>
                              {member.note ? (
                                <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">{member.note}</p>
                              ) : null}
                              <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[var(--fg-faint)]">
                                <span>Invited {formatDate(member.createdAt)}</span>
                                <span>Accepted {formatDate(member.acceptedAt)}</span>
                              </div>

                              <div className="mt-4 rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-4)] px-4 py-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">Beta credits</p>
                                    {member.billing ? (
                                      <p className="mt-2 text-[14px] font-semibold text-[var(--text-primary)]">
                                        {member.billing.tokenUsage} used of {member.billing.tokenLimit}
                                      </p>
                                    ) : (
                                      <p className="mt-2 text-[14px] font-semibold text-[var(--text-primary)]">
                                        No linked account yet
                                      </p>
                                    )}
                                  </div>
                                  {member.billing ? (
                                    <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-1.5 text-[12px] font-medium text-[var(--fg-soft)]">
                                      {member.billing.remainingCredits} remaining
                                    </div>
                                  ) : null}
                                </div>

                                {member.billing ? (
                                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,120px)_auto_minmax(0,120px)_auto_auto]">
                                    <SitezyInput
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={creditDrafts[member.id] ?? ""}
                                      onChange={(event) =>
                                        setCreditDrafts((current) => ({
                                          ...current,
                                          [member.id]: event.target.value,
                                        }))
                                      }
                                      placeholder="100"
                                      disabled={busy}
                                    />
                                    <SitezyButton
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      disabled={busy || !creditDrafts[member.id]?.trim()}
                                      onClick={() => {
                                        const value = Number.parseInt(creditDrafts[member.id] ?? "", 10);
                                        if (Number.isFinite(value) && value > 0) {
                                          void handleBillingUpdate(member, { creditDelta: value });
                                        }
                                      }}
                                    >
                                      Add credits
                                    </SitezyButton>

                                    <SitezyInput
                                      type="number"
                                      min={member.billing.tokenUsage}
                                      step="1"
                                      value={limitDrafts[member.id] ?? String(member.billing.tokenLimit)}
                                      onChange={(event) =>
                                        setLimitDrafts((current) => ({
                                          ...current,
                                          [member.id]: event.target.value,
                                        }))
                                      }
                                      placeholder={String(member.billing.tokenLimit)}
                                      disabled={busy}
                                    />
                                    <SitezyButton
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      disabled={busy || !(limitDrafts[member.id] ?? "").trim()}
                                      onClick={() => {
                                        const value = Number.parseInt(limitDrafts[member.id] ?? "", 10);
                                        if (Number.isFinite(value) && value > 0) {
                                          void handleBillingUpdate(member, { setTokenLimit: value });
                                        }
                                      }}
                                    >
                                      Set limit
                                    </SitezyButton>

                                    <SitezyButton
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      disabled={busy || member.billing.tokenUsage === 0}
                                      onClick={() => void handleBillingUpdate(member, { resetUsage: true })}
                                    >
                                      <RotateCcw size={14} />
                                      Reset usage
                                    </SitezyButton>
                                  </div>
                                ) : (
                                  <p className="mt-3 text-[12px] leading-6 text-[var(--text-secondary)]">
                                    Credit controls unlock after the invited user signs in and links this access record to an account.
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              {canEmailInvites ? (
                                <SitezyButton
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => void handleResendInvite(member)}
                                >
                                  {busy ? <Loader2 size={14} className="animate-spin" /> : <MailPlus size={14} />}
                                  Resend
                                </SitezyButton>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">Role</label>
                              <select
                                value={member.role}
                                onChange={(event) => void handleMemberUpdate(member.id, { role: event.target.value as BetaRole })}
                                className="sz-input"
                                disabled={busy}
                              >
                                <option value="customer">Customer</option>
                                <option value="customer_service">Customer service</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">Status</label>
                              <select
                                value={member.status}
                                onChange={(event) => void handleMemberUpdate(member.id, { status: event.target.value as BetaAccessStatus })}
                                className="sz-input"
                                disabled={busy}
                              >
                                <option value="invited">Invited</option>
                                <option value="active">Active</option>
                                <option value="revoked">Revoked</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-8 text-[14px] text-[var(--text-secondary)]">
                      No members match the current filters.
                    </div>
                  )}
                </div>
              </div>
            </SitezyCard>
          </div>

          <SitezyCard className="p-5 md:p-6">
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">Beta interest inbox</p>
                  <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Accounts waiting for access
                  </h2>
                  <p className="text-[13px] leading-6 text-[var(--text-secondary)]">
                    Review who signed up without access yet, then approve them directly or hand off the details to the invite composer.
                  </p>
                </div>

                <label className="block md:min-w-[280px]">
                  <SitezyInput
                    value={interestQuery}
                    onChange={(event) => setInterestQuery(event.target.value)}
                    placeholder="Search email, name, or note"
                  />
                </label>
              </div>

              {!betaInterestStorageReady ? (
                <div className="rounded-[18px] border border-[rgba(240,178,52,0.22)] bg-[rgba(240,178,52,0.08)] px-4 py-3 text-[13px] leading-6 text-[var(--text-secondary)]">
                  The beta-interest inbox will appear here after the latest database migration is applied.
                </div>
              ) : filteredInterestRequests.length ? (
                <div className="space-y-3">
                  {filteredInterestRequests.map((interest) => {
                    const accessSummary = getInterestAccessSummary(interest);
                    const interestBusy = busyInterestId === interest.id;
                    const approveDisabled = interestBusy || !canEmailInvites || accessSummary.label === "Active";
                    const approveLabel =
                      accessSummary.label === "Invited" ? "Resend invite" : "Approve and send invite";
                    return (
                      <div
                        key={interest.id}
                        className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{interest.email}</p>
                              <SitezyBadge>{accessSummary.label}</SitezyBadge>
                              {interest.userName ? <SitezyBadge>{interest.userName}</SitezyBadge> : null}
                            </div>
                            <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                              {interest.note || "No note provided yet."}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[var(--fg-faint)]">
                              <span>Registered {formatDate(interest.createdAt)}</span>
                              <span>{accessSummary.detail}</span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <SitezyButton
                              type="button"
                              variant="primary"
                              size="sm"
                              disabled={approveDisabled}
                              onClick={() => void handleApproveInterest(interest)}
                            >
                              {interestBusy ? <Loader2 size={14} className="animate-spin" /> : <MailPlus size={14} />}
                              {accessSummary.label === "Active" ? "Already active" : approveLabel}
                            </SitezyButton>
                            <SitezyButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={interestBusy}
                              onClick={() => handleUseInterest(interest)}
                            >
                              <MailPlus size={14} />
                              Use in invite
                            </SitezyButton>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-8 text-[14px] text-[var(--text-secondary)]">
                  No beta-interest submissions yet.
                </div>
              )}
            </div>
          </SitezyCard>
        </div>
      </main>
    </div>
  );
}
