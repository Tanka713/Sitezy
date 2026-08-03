"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, ExternalLink, Inbox, LifeBuoy, MessageSquareMore, Sparkles, Ticket } from "lucide-react";
import { buildSupportInboxHref } from "@/lib/app-navigation";
import type { SupportRequest, SupportRequestKind } from "@/types";
import { API_UNKNOWN_001, logAppError, normalizeError } from "@/lib/errors";
import { formatSupportTicketNumber } from "@/lib/utils";
import {
  SettingsActionRow,
  SettingsField,
  SettingsGroup,
  SettingsInput,
  SettingsModal,
  SettingsPlaceholder,
  SettingsPrimaryAction,
  SettingsSecondaryAction,
  SettingsStack,
  SettingsStatus,
  SettingsTextarea,
} from "../ui";

type StatusTone = "success" | "error" | "muted";

const FORM_COPY: Record<
  SupportRequestKind,
  { title: string; cta: string; defaultSubject: string; defaultMessage: string }
> = {
  bug: {
    title: "Report a bug",
    cta: "Submit bug report",
    defaultSubject: "Issue in Sitezy",
    defaultMessage: "What happened?\n\nSteps to reproduce:\n\nExpected behavior:\n\n",
  },
  feature: {
    title: "Request a feature",
    cta: "Submit feature request",
    defaultSubject: "Feature request for Sitezy",
    defaultMessage: "What should change?\n\nWhy it matters:\n\nWhat you expect:\n\n",
  },
  support: {
    title: "Contact support",
    cta: "Send support request",
    defaultSubject: "Need help with Sitezy",
    defaultMessage: "What do you need help with?\n\nRelevant context:\n\n",
  },
};

export function SupportSection() {
  const router = useRouter();
  const supportInboxHref = buildSupportInboxHref();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeKind, setActiveKind] = useState<SupportRequestKind | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);

  const activeCopy = useMemo(() => (activeKind ? FORM_COPY[activeKind] : null), [activeKind]);
  const summary = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((request) => request.status === "pending").length,
      open: requests.filter((request) => request.status === "open").length,
      closed: requests.filter((request) => request.status === "closed").length,
      latestTicket: requests[0]?.ticketNumber ?? null,
    }),
    [requests]
  );

  useEffect(() => {
    router.prefetch(supportInboxHref);
  }, [router, supportInboxHref]);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      try {
        const response = await fetch("/api/support", { credentials: "same-origin" });
        const payload = (await response.json().catch(() => ({}))) as { requests?: SupportRequest[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "We couldn't load your support requests.");
        }

        if (!cancelled) {
          setRequests(Array.isArray(payload.requests) ? payload.requests : []);
        }
      } catch (error) {
        if (!cancelled) {
          const appErr = normalizeError(error, API_UNKNOWN_001, { action: "loadSupportRequests" });
          logAppError(appErr);
          setStatus({ tone: "error", message: appErr.userMessage });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRequests();
    return () => {
      cancelled = true;
    };
  }, []);

  function openDocs() {
    window.open("https://github.com/Tanka713/Sitezy-V2#readme", "_blank", "noopener,noreferrer");
  }

  function openForm(kind: SupportRequestKind) {
    setActiveKind(kind);
    setSubject(FORM_COPY[kind].defaultSubject);
    setMessage(FORM_COPY[kind].defaultMessage);
    setStatus(null);
  }

  function closeForm() {
    setActiveKind(null);
    setSubject("");
    setMessage("");
  }

  async function handleSubmit() {
    if (!activeKind) return;
    setSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: activeKind,
          subject,
          message,
          metadata: {
            route: typeof window !== "undefined" ? window.location.pathname : null,
            browser: typeof navigator !== "undefined" ? navigator.userAgent : null,
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { request?: SupportRequest; error?: string };
      if (!response.ok || !payload.request) {
        throw new Error(payload.error || "We couldn't submit your request.");
      }

      setRequests((current) => [payload.request!, ...current]);
      setStatus({
        tone: "success",
        message: `Your request was submitted as ${formatSupportTicketNumber(payload.request.ticketNumber)}.`,
      });
      closeForm();
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "submitSupportRequest", kind: activeKind });
      logAppError(appErr);
      setStatus({ tone: "error", message: appErr.userMessage });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsStack>
      {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

      <SettingsGroup title="Get help" body="Create support requests inside Sitezy instead of relying on email-only support.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-5">
            <p className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Report a bug</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
              Capture what broke, what you expected, and the route you were on, then keep the ticket in your inbox.
            </p>
            <SettingsActionRow className="mt-5 static mx-0 border-0 bg-transparent px-0 py-0">
              <SettingsPrimaryAction type="button" onClick={() => openForm("bug")}>
                <Bug size={14} />
                Report a bug
              </SettingsPrimaryAction>
            </SettingsActionRow>
          </div>

          <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-5">
            <p className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Request a feature</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
              Send product ideas and workflow gaps directly into a server-backed queue tied to your account.
            </p>
            <SettingsActionRow className="mt-5 static mx-0 border-0 bg-transparent px-0 py-0">
              <SettingsPrimaryAction type="button" onClick={() => openForm("feature")}>
                <Sparkles size={14} />
                Request a feature
              </SettingsPrimaryAction>
            </SettingsActionRow>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Support channels" body="Use the dedicated inbox page to review every support ticket and every reply from customer service.">
        {loading ? (
          <SettingsPlaceholder
            title="Loading inbox summary"
            body="Fetching your support requests so the inbox summary stays in sync."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                { label: "All", value: summary.total, icon: <LifeBuoy size={14} /> },
                { label: "Pending", value: summary.pending, icon: <Sparkles size={14} /> },
                { label: "Open", value: summary.open, icon: <MessageSquareMore size={14} /> },
                { label: "Closed", value: summary.closed, icon: <Ticket size={14} /> },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">{item.label}</p>
                      <p className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{item.value}</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-4)] text-[var(--text-accent)]">
                      {item.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-5">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">Support inbox</p>
              <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                Open the dedicated inbox page to filter pending, open, and closed tickets and read every reply from customer service in one place.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <SettingsPrimaryAction type="button" onClick={() => router.push(supportInboxHref)}>
                  <Inbox size={14} />
                  Open inbox
                </SettingsPrimaryAction>
                <SettingsSecondaryAction type="button" onClick={() => openForm("support")}>
                  <LifeBuoy size={14} />
                  Contact support
                </SettingsSecondaryAction>
                <SettingsSecondaryAction type="button" onClick={openDocs}>
                  <ExternalLink size={14} />
                  Documentation
                </SettingsSecondaryAction>
              </div>
              {summary.latestTicket ? (
                <p className="mt-3 text-[11px] text-[var(--fg-faint)]">
                  Latest ticket: {formatSupportTicketNumber(summary.latestTicket)}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </SettingsGroup>

      <SettingsModal
        open={Boolean(activeKind && activeCopy)}
        title={activeCopy?.title ?? "Submit request"}
        onClose={closeForm}
        body={
          <div className="space-y-5">
            <p className="text-[13px] leading-6 text-[var(--text-secondary)]">
              This request will be saved to your Sitezy account and appear in your dedicated support inbox.
            </p>
            <SettingsField label="Subject">
              <SettingsInput
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Short summary"
                maxLength={160}
              />
            </SettingsField>
            <SettingsField label="Message" hint="Stored with your current route">
              <SettingsTextarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe the issue or request"
                maxLength={4000}
              />
            </SettingsField>
          </div>
        }
        actions={
          <>
            <SettingsSecondaryAction type="button" onClick={closeForm} disabled={submitting}>
              Cancel
            </SettingsSecondaryAction>
            <SettingsPrimaryAction
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !subject.trim() || !message.trim()}
            >
              {submitting ? "Submitting..." : activeCopy?.cta ?? "Submit"}
            </SettingsPrimaryAction>
          </>
        }
      />
    </SettingsStack>
  );
}
