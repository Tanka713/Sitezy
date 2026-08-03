"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareReply, Send, ShieldEllipsis, ShieldPlus, Sparkles, Ticket } from "lucide-react";
import { UserAvatarMenu } from "@/components/ui/UserAvatarMenu";
import { SitezyBadge, SitezyButton, SitezyCard, SitezyInput, SitezyTextarea } from "@/components/ui/sitezy";
import { API_UNKNOWN_001, logAppError, normalizeError } from "@/lib/errors";
import { formatShortDateTime, formatSupportTicketNumber } from "@/lib/utils";
import type { CurrentBetaAccess, CustomerServiceSupportRequest, SupportRequestStatus } from "@/types";

type StatusTone = "success" | "error" | "muted";
type QueueFilter = "all" | SupportRequestStatus;

function requestKindTone(kind: CustomerServiceSupportRequest["kind"]) {
  return kind === "bug" ? "text-[var(--danger-fg)]" : kind === "feature" ? "text-[var(--text-accent)]" : "text-[var(--success-fg)]";
}

function requestKindLabel(kind: CustomerServiceSupportRequest["kind"]) {
  return kind === "bug" ? "Bug" : kind === "feature" ? "Feature" : "Support";
}

function replyAuthorLabel(
  reply: CustomerServiceSupportRequest["replies"][number],
  request: Pick<CustomerServiceSupportRequest, "userName" | "userEmail">
) {
  if (reply.authorRole === "customer") {
    return request.userName?.trim() || request.userEmail || "Customer";
  }
  if (typeof reply.authorName === "string" && reply.authorName.trim()) {
    return reply.authorName.trim();
  }
  return reply.authorRole === "admin"
    ? "Admin"
    : reply.authorRole === "customer_service"
      ? "Customer service"
      : "System";
}

function upsertRequest(current: CustomerServiceSupportRequest[], next: CustomerServiceSupportRequest) {
  const withoutCurrent = current.filter((request) => request.id !== next.id);
  return [next, ...withoutCurrent];
}

export function CustomerServiceDashboard({
  currentAccess,
  initialRequests,
  canEmailReplies,
}: {
  currentAccess: CurrentBetaAccess;
  initialRequests: CustomerServiceSupportRequest[];
  canEmailReplies: boolean;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRequestId, setActiveRequestId] = useState(initialRequests[0]?.id ?? null);
  const [replyBody, setReplyBody] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);

  const summary = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((request) => request.status === "pending").length,
      open: requests.filter((request) => request.status === "open").length,
      closed: requests.filter((request) => request.status === "closed").length,
      awaitingReply: requests.filter((request) => !request.replies.length).length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return requests.filter((request) => {
      if (queueFilter !== "all" && request.status !== queueFilter) return false;
      if (!query) return true;
      const haystack = [
        formatSupportTicketNumber(request.ticketNumber),
        request.subject,
        request.message,
        request.userEmail,
        request.userName ?? "",
        request.kind,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [queueFilter, requests, searchQuery]);

  const activeRequest = useMemo(
    () => filteredRequests.find((request) => request.id === activeRequestId) ?? filteredRequests[0] ?? null,
    [activeRequestId, filteredRequests]
  );

  useEffect(() => {
    if (!activeRequest && filteredRequests.length) {
      setActiveRequestId(filteredRequests[0].id);
    }
  }, [activeRequest, filteredRequests]);

  useEffect(() => {
    setReplyBody("");
  }, [activeRequest?.id]);

  async function handleStatusChange(id: string, nextStatus: SupportRequestStatus) {
    setBusyId(id);
    setStatus(null);
    try {
      const response = await fetch(`/api/customer-service/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        request?: CustomerServiceSupportRequest;
        error?: string;
      };

      if (!response.ok || !payload.request) {
        throw new Error(payload.error || "We couldn't update that support request.");
      }

      setRequests((current) => upsertRequest(current, payload.request!));
      setActiveRequestId(payload.request.id);
      setStatus({
        tone: "success",
        message:
          nextStatus === "closed"
            ? "Support request closed."
            : nextStatus === "pending"
              ? "Support request marked pending."
              : "Support request marked open.",
      });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "customerServiceSupportRequest", requestId: id });
      logAppError(appErr);
      setStatus({ tone: "error", message: appErr.userMessage });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReplySubmit(closeRequest: boolean) {
    if (!activeRequest || !replyBody.trim()) return;

    setReplySubmitting(true);
    setBusyId(activeRequest.id);
    setStatus(null);
    try {
      const response = await fetch(`/api/customer-service/support/${activeRequest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: replyBody,
          closeRequest,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        request?: CustomerServiceSupportRequest;
        emailDelivered?: boolean;
        emailError?: string | null;
        error?: string;
      };

      if (!response.ok || !payload.request) {
        throw new Error(payload.error || "We couldn't send that reply.");
      }

      setRequests((current) => upsertRequest(current, payload.request!));
      setActiveRequestId(payload.request.id);
      setReplyBody("");
      setStatus({
        tone: payload.emailDelivered ? "success" : "muted",
        message: payload.emailDelivered
          ? closeRequest
            ? "Reply sent and request closed."
            : "Reply sent and emailed to the customer."
          : payload.emailError
            ? `Reply saved, but email delivery failed: ${payload.emailError}`
            : "Reply saved.",
      });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, {
        action: "customerServiceReply",
        requestId: activeRequest.id,
      });
      logAppError(appErr);
      setStatus({ tone: "error", message: appErr.userMessage });
    } finally {
      setBusyId(null);
      setReplySubmitting(false);
    }
  }

  return (
    <div className="sz-page-shell">
      <header className="sz-topbar sz-page-header">
        <div className="sz-grid-shell flex h-20 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex items-center">
              <span className="text-[15px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Sitezy</span>
            </Link>
            <div className="hidden h-6 w-px bg-[var(--border-soft)] md:block" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Customer service</p>
              <p className="truncate text-[13px] text-[var(--text-secondary)]">Queue, reply, and ticket resolution</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentAccess.role === "admin" ? (
              <Link href="/admin">
                <SitezyButton variant="secondary" size="sm">
                  <ShieldPlus size={14} />
                  Admin
                </SitezyButton>
              </Link>
            ) : null}
            <UserAvatarMenu showStudioShortcut={false} />
          </div>
        </div>
      </header>

      <main className="sz-page-scroll">
        <div className="sz-grid-shell py-6 md:py-8">
        <div className="space-y-6">
          <SitezyCard className="p-5 md:p-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: "Queue", value: summary.total, icon: <Ticket size={15} /> },
                  { label: "Pending", value: summary.pending, icon: <Sparkles size={15} /> },
                  { label: "Open", value: summary.open, icon: <ShieldEllipsis size={15} /> },
                  { label: "Closed", value: summary.closed, icon: <CheckCircle2 size={15} /> },
                  { label: "Awaiting first reply", value: summary.awaitingReply, icon: <ShieldPlus size={15} /> },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="min-w-[150px] rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">{item.label}</p>
                        <p className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{item.value}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-4)] text-[var(--text-accent)]">
                        {item.icon}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </SitezyCard>

          {!canEmailReplies ? (
            <div className="rounded-[18px] border border-[rgba(240,178,52,0.22)] bg-[rgba(240,178,52,0.08)] px-4 py-3 text-[13px] leading-6 text-[var(--text-secondary)]">
              Support replies will still be saved in-app, but outbound email is not configured in this environment yet.
            </div>
          ) : null}

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

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <SitezyCard className="p-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">Queue</p>
                  <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Support requests
                  </h2>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <SitezyInput
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search ticket, subject, email, or message"
                    />
                  </label>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: "pending", label: "Pending" },
                      { value: "open", label: "Open" },
                      { value: "all", label: "All" },
                      { value: "closed", label: "Closed" },
                    ].map((option) => {
                      const active = queueFilter === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setQueueFilter(option.value as QueueFilter)}
                          className={`rounded-[14px] border px-3 py-2 text-[12px] font-medium transition-all ${
                            active
                              ? "border-[rgba(120,138,255,0.34)] bg-[rgba(107,119,255,0.12)] text-[var(--text-primary)]"
                              : "border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredRequests.length ? (
                    filteredRequests.map((request) => {
                      const active = activeRequest?.id === request.id;
                      return (
                        <button
                          key={request.id}
                          type="button"
                          onClick={() => setActiveRequestId(request.id)}
                          className={`w-full rounded-[18px] border px-4 py-4 text-left transition-all ${
                            active
                              ? "border-[rgba(120,138,255,0.36)] bg-[rgba(107,119,255,0.12)] shadow-[0_12px_28px_rgba(83,97,255,0.12)]"
                              : "border-[var(--border-soft)] bg-[var(--surface-3)] hover:border-[var(--border-default)] hover:bg-[var(--surface-4)]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${requestKindTone(request.kind)}`}>
                                  {requestKindLabel(request.kind)}
                                </span>
                                <SitezyBadge>{request.status}</SitezyBadge>
                                <SitezyBadge>{formatSupportTicketNumber(request.ticketNumber)}</SitezyBadge>
                              </div>
                              <p className="mt-2 truncate text-[14px] font-semibold text-[var(--text-primary)]">
                                {request.subject}
                              </p>
                              <p className="mt-1 max-h-[3rem] overflow-hidden text-[12px] leading-6 text-[var(--text-secondary)]">
                                {request.message}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--fg-faint)]">
                                <span>{request.userName ? `${request.userName} · ${request.userEmail}` : request.userEmail}</span>
                                <span>{formatShortDateTime(request.updatedAt)}</span>
                                <span>{request.replies.length} replies</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-8 text-[13px] leading-6 text-[var(--text-secondary)]">
                      No requests match this filter right now.
                    </div>
                  )}
                </div>
              </div>
            </SitezyCard>

            <SitezyCard className="p-5 md:p-6">
              {activeRequest ? (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${requestKindTone(activeRequest.kind)}`}>
                          {requestKindLabel(activeRequest.kind)}
                        </span>
                        <SitezyBadge>{activeRequest.status}</SitezyBadge>
                        <SitezyBadge>{formatSupportTicketNumber(activeRequest.ticketNumber)}</SitezyBadge>
                      </div>
                      <div>
                        <h2 className="text-[26px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                          {activeRequest.subject}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-[var(--fg-faint)]">
                          <span>{activeRequest.userName ? `${activeRequest.userName} · ${activeRequest.userEmail}` : activeRequest.userEmail}</span>
                          <span>Opened {formatShortDateTime(activeRequest.createdAt)}</span>
                          <span>Updated {formatShortDateTime(activeRequest.updatedAt)}</span>
                          {activeRequest.metadata.route ? <span>{activeRequest.metadata.route}</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: "pending", label: "Pending" },
                        { value: "open", label: "Open" },
                        { value: "closed", label: "Closed" },
                      ] as const).map((option) => (
                        <SitezyButton
                          key={option.value}
                          type="button"
                          variant={activeRequest.status === option.value ? "secondary" : "ghost"}
                          size="sm"
                          disabled={busyId === activeRequest.id}
                          onClick={() => void handleStatusChange(activeRequest.id, option.value)}
                        >
                          {busyId === activeRequest.id && activeRequest.status !== option.value ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : option.value === "closed" ? (
                            <CheckCircle2 size={14} />
                          ) : option.value === "pending" ? (
                            <Sparkles size={14} />
                          ) : (
                            <ShieldEllipsis size={14} />
                          )}
                          {option.label}
                        </SitezyButton>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Original request</p>
                      <p className="mt-3 whitespace-pre-wrap text-[14px] leading-7 text-[var(--text-secondary)]">
                        {activeRequest.message}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Conversation</p>
                        <p className="text-[12px] text-[var(--fg-faint)]">{activeRequest.replies.length} replies</p>
                      </div>

                      {activeRequest.replies.length ? (
                        activeRequest.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <SitezyBadge>{replyAuthorLabel(reply, activeRequest)}</SitezyBadge>
                              {reply.emailDeliveryStatus ? (
                                <SitezyBadge>
                                  {reply.emailDeliveryStatus === "sent"
                                    ? "Email sent"
                                    : reply.emailDeliveryStatus === "failed"
                                      ? "Email failed"
                                      : "Saved"}
                                </SitezyBadge>
                              ) : null}
                              <span className="text-[11px] text-[var(--fg-faint)]">{formatShortDateTime(reply.createdAt)}</span>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-7 text-[var(--text-secondary)]">
                              {reply.body}
                            </p>
                            {reply.emailDeliveryStatus === "failed" && reply.emailError ? (
                              <p className="mt-3 text-[12px] leading-6 text-[var(--danger-fg)]">{reply.emailError}</p>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[20px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-8 text-[13px] text-[var(--text-secondary)]">
                          No replies yet. Send the first response from the composer below.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-4 md:p-5">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MessageSquareReply size={16} className="text-[var(--text-accent)]" />
                        <div>
                          <p className="text-[15px] font-semibold text-[var(--text-primary)]">Reply to customer</p>
                          <p className="text-[12px] text-[var(--text-secondary)]">This reply is saved in Sitezy and emailed to the customer when delivery is configured.</p>
                        </div>
                      </div>

                      <SitezyTextarea
                        value={replyBody}
                        onChange={(event) => setReplyBody(event.target.value)}
                        placeholder="Write a clear update, request for more context, or resolution message."
                        rows={7}
                      />

                      <div className="flex flex-wrap gap-2">
                        <SitezyButton
                          type="button"
                          variant="primary"
                          size="md"
                          disabled={replySubmitting || !replyBody.trim()}
                          onClick={() => void handleReplySubmit(false)}
                        >
                          {replySubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                          Send reply
                        </SitezyButton>
                        <SitezyButton
                          type="button"
                          variant="secondary"
                          size="md"
                          disabled={replySubmitting || !replyBody.trim()}
                          onClick={() => void handleReplySubmit(true)}
                        >
                          {replySubmitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                          Send and close
                        </SitezyButton>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-[22px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-6 text-center">
                  <div className="max-w-[420px] space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">No active request</p>
                    <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                      Pick a support request from the queue.
                    </h2>
                    <p className="text-[14px] leading-7 text-[var(--text-secondary)]">
                      Once a request is selected, the full conversation and reply composer will appear here.
                    </p>
                  </div>
                </div>
              )}
            </SitezyCard>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
