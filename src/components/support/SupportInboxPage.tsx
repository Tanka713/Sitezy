"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, LifeBuoy, MessageSquareMore, Search, Sparkles, Ticket } from "lucide-react";
import { UserAvatarMenu } from "@/components/ui/UserAvatarMenu";
import { SitezyBadge, SitezyButton, SitezyCard, SitezyInput } from "@/components/ui/sitezy";
import { formatShortDateTime, formatSupportTicketNumber } from "@/lib/utils";
import type { SupportRequest, SupportRequestKind, SupportRequestStatus } from "@/types";

type InboxFilter = "all" | SupportRequestStatus;

function requestKindLabel(kind: SupportRequestKind) {
  return kind === "bug" ? "Bug" : kind === "feature" ? "Feature" : "Support";
}

function requestKindTone(kind: SupportRequestKind) {
  return kind === "bug" ? "text-[var(--danger-fg)]" : kind === "feature" ? "text-[var(--text-accent)]" : "text-[var(--success-fg)]";
}

function replyAuthorLabel(reply: SupportRequest["replies"][number]) {
  if (reply.authorRole === "customer") return "You";
  if (typeof reply.authorName === "string" && reply.authorName.trim()) return reply.authorName.trim();
  return reply.authorRole === "admin"
    ? "Admin"
    : reply.authorRole === "customer_service"
      ? "Customer service"
      : "System";
}

export function SupportInboxPage({ initialRequests }: { initialRequests: SupportRequest[] }) {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const summary = useMemo(
    () => ({
      total: initialRequests.length,
      pending: initialRequests.filter((request) => request.status === "pending").length,
      open: initialRequests.filter((request) => request.status === "open").length,
      closed: initialRequests.filter((request) => request.status === "closed").length,
    }),
    [initialRequests]
  );

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return initialRequests.filter((request) => {
      if (filter !== "all" && request.status !== filter) return false;
      if (!query) return true;

      const haystack = [
        formatSupportTicketNumber(request.ticketNumber),
        request.subject,
        request.message,
        request.kind,
        request.status,
        request.metadata.route ?? "",
        ...request.replies.flatMap((reply) => [reply.authorName ?? "", reply.body]),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [filter, initialRequests, searchQuery]);

  return (
    <div className="min-h-screen">
      <header className="sz-topbar sticky top-0 z-40">
        <div className="sz-grid-shell flex h-20 items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex items-center">
              <span className="text-[15px] font-semibold tracking-[-0.03em]">Sitezy</span>
            </Link>
            <div className="hidden h-6 w-px bg-[var(--border-soft)] md:block" />
            <Link href="/settings" className="inline-flex">
              <SitezyButton variant="secondary" size="sm">
                <ArrowLeft size={14} />
                Settings
              </SitezyButton>
            </Link>
            <div className="hidden h-6 w-px bg-[var(--border-soft)] md:block" />
            <p className="hidden text-[13px] font-medium text-[var(--fg-soft)] md:block">Support inbox</p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/settings">
              <SitezyButton variant="secondary" size="sm">
                <MessageSquareMore size={14} />
                New request
              </SitezyButton>
            </Link>
            <UserAvatarMenu />
          </div>
        </div>
      </header>

      <main className="sz-grid-shell py-8">
        <div className="space-y-6">
          <SitezyCard className="p-6 md:p-7">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <SitezyBadge>Support inbox</SitezyBadge>
                <SitezyBadge>Customer view</SitezyBadge>
              </div>
              <div className="space-y-3">
                <h1 className="text-[32px] font-semibold tracking-[-0.05em] text-[var(--text-primary)] md:text-[42px]">
                  Every request in one place.
                </h1>
                <p className="max-w-[760px] text-[15px] leading-8 text-[var(--text-secondary)]">
                  Track pending, open, and closed tickets, then read every reply from customer service without going back through settings.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                {[
                  { label: "All", value: summary.total, icon: <LifeBuoy size={15} /> },
                  { label: "Pending", value: summary.pending, icon: <Sparkles size={15} /> },
                  { label: "Open", value: summary.open, icon: <MessageSquareMore size={15} /> },
                  { label: "Closed", value: summary.closed, icon: <Ticket size={15} /> },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4"
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
            </div>
          </SitezyCard>

          <SitezyCard className="p-6">
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">Requests</p>
                  <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    Support requests and replies
                  </h2>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,280px)_1fr]">
                  <label className="relative block">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-faint)]" />
                    <SitezyInput
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search ticket, subject, message, or reply"
                      className="pl-10"
                    />
                  </label>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: "all", label: "All" },
                      { value: "pending", label: "Pending" },
                      { value: "open", label: "Open" },
                      { value: "closed", label: "Closed" },
                    ].map((option) => {
                      const active = filter === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFilter(option.value as InboxFilter)}
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
              </div>

              {filteredRequests.length ? (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${requestKindTone(request.kind)}`}>
                              {requestKindLabel(request.kind)}
                            </span>
                            <SitezyBadge>{request.status}</SitezyBadge>
                            <SitezyBadge>{formatSupportTicketNumber(request.ticketNumber)}</SitezyBadge>
                          </div>
                          <p className="mt-2 text-[16px] font-semibold text-[var(--text-primary)]">{request.subject}</p>
                          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-[var(--text-secondary)]">
                            {request.message}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-[var(--fg-faint)]">
                            <span>Opened {formatShortDateTime(request.createdAt)}</span>
                            <span>Updated {formatShortDateTime(request.updatedAt)}</span>
                            {request.metadata.route ? <span>{request.metadata.route}</span> : null}
                          </div>
                        </div>
                      </div>

                      {request.replies.length ? (
                        <div className="mt-5 space-y-3 border-t border-[var(--border-soft)] pt-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">
                            Replies
                          </p>
                          {request.replies.map((reply) => (
                            <div
                              key={reply.id}
                              className="rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-4)] px-4 py-4"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <SitezyBadge>{replyAuthorLabel(reply)}</SitezyBadge>
                                <span className="text-[11px] text-[var(--fg-faint)]">{formatShortDateTime(reply.createdAt)}</span>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-[var(--text-secondary)]">
                                {reply.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-10 text-[14px] text-[var(--text-secondary)]">
                  No support requests match the current filter.
                </div>
              )}
            </div>
          </SitezyCard>
        </div>
      </main>
    </div>
  );
}
