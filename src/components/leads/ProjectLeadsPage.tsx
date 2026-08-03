"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Globe2,
  Loader2,
  Mail,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { buildStudioEditorHref } from "@/lib/app-navigation";
import { getLeadSubmissionDisplayLabel, getLeadSubmissionSourceLabel } from "@/lib/lead-capture";
import { API_UNKNOWN_001, createAppError, normalizeError, type ErrorCode } from "@/lib/errors";
import { resolvePublishedHref } from "@/lib/publishing";
import { useAppStore } from "@/lib/store";
import { cn, formatShortDateTime } from "@/lib/utils";
import { SitezyBadge, SitezyButton } from "@/components/ui/sitezy";
import type { LeadSubmission, Project, ProjectLeadSummary } from "@/types";

type BannerState =
  | {
      kind: "success";
      message: string;
      code?: null;
    }
  | {
      kind: "error";
      message: string;
      code: string;
    }
  | null;

type SubmissionFilter = "all" | "contact" | "newsletter";

async function leadsJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    requestId?: string | null;
  } & T;

  if (!response.ok) {
    throw createAppError({
      code: (data.code as ErrorCode | undefined) ?? API_UNKNOWN_001,
      devMessage: `Lead request failed (${response.status}) for ${url}`,
      userMessage: data.error ?? "We couldn't complete that leads action right now.",
      severity: "error",
      metadata: {
        path: url,
        status: response.status,
        requestId: data.requestId ?? null,
      },
    });
  }

  return data;
}

function shortMessage(text: string | null | undefined) {
  if (!text) return "";
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function SectionHeader({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-5 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--fg-faint)]">{eyebrow}</p>
        <div className="space-y-1.5">
          <h2 className="text-[24px] font-semibold tracking-[-0.045em] text-[var(--text-primary)]">{title}</h2>
          {body ? <p className="max-w-[760px] text-[13px] leading-7 text-[var(--text-secondary)]">{body}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-medium transition-all",
        active
          ? "border-[rgba(126,146,255,0.3)] bg-[rgba(107,119,255,0.12)] text-[var(--text-primary)]"
          : "border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
          active ? "bg-[rgba(255,255,255,0.08)] text-[var(--text-primary)]" : "bg-[var(--surface-4)] text-[var(--fg-faint)]"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyStateBlock({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center py-12 text-center">
      <div className="text-[var(--text-accent)]">{icon}</div>
      <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{title}</h3>
      <p className="mt-3 max-w-[560px] text-[13px] leading-7 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}

export function ProjectLeadsPage({
  project,
  initialSummary,
  initialSubmissions,
  storageReady,
}: {
  project: Project;
  initialSummary: ProjectLeadSummary;
  initialSubmissions: LeadSubmission[];
  storageReady: boolean;
}) {
  const router = useRouter();
  const openProject = useAppStore((state) => state.openProject);
  const [summary, setSummary] = useState(initialSummary);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [banner, setBanner] = useState<BannerState>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>("all");
  const editorHref = useMemo(() => buildStudioEditorHref(project.id), [project.id]);
  const settingsHref = useMemo(() => {
    const params = new URLSearchParams({
      section: "integrations",
      focus: "project-lead-capture",
      projectId: project.id,
      returnTo: `/studio/leads/${project.id}`,
    });
    return `/settings?${params.toString()}`;
  }, [project.id]);

  useEffect(() => {
    router.prefetch(editorHref);
    router.prefetch(settingsHref);
  }, [editorHref, router, settingsHref]);

  const submissionCounts = useMemo(
    () => ({
      all: submissions.length,
      contact: submissions.filter((submission) => submission.kind === "contact").length,
      newsletter: submissions.filter((submission) => submission.kind === "newsletter").length,
    }),
    [submissions]
  );

  const filteredSubmissions = useMemo(() => {
    if (submissionFilter === "all") return submissions;
    return submissions.filter((submission) => submission.kind === submissionFilter);
  }, [submissionFilter, submissions]);

  const emptySubmissionState = useMemo(() => {
    if (submissionFilter === "contact") {
      return {
        title: "No form submissions yet",
        body: "Contact inquiries will appear here once visitors start submitting live or preview forms.",
      };
    }

    if (submissionFilter === "newsletter") {
      return {
        title: "No newsletter signups yet",
        body: "Newsletter and CTA email signups will appear here once the first capture-ready signup goes through.",
      };
    }

    return {
      title: "No submissions yet",
      body: "Once visitors submit a contact or newsletter form, it will show up here with source and notification status.",
    };
  }, [submissionFilter]);

  const isPublished = project.publishedSite?.status === "published";
  const latestSubmissionLabel = summary.latestSubmissionAt
    ? formatShortDateTime(summary.latestSubmissionAt)
    : "No captures yet";

  async function refreshLeadData() {
    setBusyAction("refresh");
    setBanner(null);
    try {
      const leadsData = await leadsJson<{ summary: ProjectLeadSummary; submissions: LeadSubmission[] }>(
        `/api/projects/${project.id}/leads`
      );
      setSummary(leadsData.summary);
      setSubmissions(leadsData.submissions ?? []);
      setBanner({ kind: "success", message: "Lead data refreshed.", code: null });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "refreshLeads", projectId: project.id });
      setBanner({ kind: "error", message: appErr.userMessage, code: appErr.code });
    } finally {
      setBusyAction(null);
    }
  }

  function downloadExport(kind: "submissions" | "subscribers") {
    window.location.assign(`/api/projects/${project.id}/leads/export?kind=${kind}`);
  }

  async function handleOpenEditor(targetHref = editorHref) {
    setBusyAction("editor");
    setBanner(null);
    try {
      await openProject(project.id);
      router.push(targetHref);
      return;
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, {
        action: "openProjectFromLeads",
        projectId: project.id,
      });
      setBanner({ kind: "error", message: appErr.userMessage, code: appErr.code });
    }
    setBusyAction(null);
  }

  function handleOpenLive() {
    const subdomain = project.publishedSite?.subdomain;
    if (!subdomain) return;
    window.open(resolvePublishedHref(subdomain), "_blank", "noopener");
  }

  return (
    <div className="sz-page-shell bg-[var(--surface-shell)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(circle_at_top_left,rgba(94,122,255,0.14),transparent_42%),radial-gradient(circle_at_82%_10%,rgba(99,215,173,0.1),transparent_30%)]" />

      <div className="sz-topbar sz-page-header px-4">
        <div className="mx-auto flex h-[60px] w-full max-w-[1480px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SitezyButton
              variant="ghost"
              size="sm"
              onClick={() => void handleOpenEditor(editorHref)}
              className="h-9 min-h-[36px] px-3"
              disabled={busyAction === "editor"}
            >
              {busyAction === "editor" ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeft size={14} />}
              <span className="hidden md:inline">Editor</span>
            </SitezyButton>
            <div className="hidden h-6 w-px bg-[var(--border-soft)] md:block" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.03em]">{project.name}</p>
              <p className="truncate text-[12px] text-[var(--fg-muted)]">Lead inbox</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SitezyButton
              variant="secondary"
              size="sm"
              onClick={() => void refreshLeadData()}
              className="h-9 min-h-[36px] px-3"
              disabled={!storageReady || busyAction === "refresh"}
            >
              {busyAction === "refresh" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span className="hidden md:inline">Refresh</span>
            </SitezyButton>
            <SitezyButton
              variant="secondary"
              size="sm"
              onClick={() => router.push(settingsHref)}
              className="h-9 min-h-[36px] px-3"
            >
              <Settings2 size={14} />
              <span className="hidden lg:inline">Lead settings</span>
            </SitezyButton>
            <SitezyButton
              variant="secondary"
              size="sm"
              onClick={() => downloadExport("submissions")}
              disabled={!storageReady}
              className="h-9 min-h-[36px] px-3"
            >
              <Download size={14} />
              <span className="hidden xl:inline">Submissions CSV</span>
            </SitezyButton>
            <SitezyButton
              variant="secondary"
              size="sm"
              onClick={() => downloadExport("subscribers")}
              disabled={!storageReady}
              className="h-9 min-h-[36px] px-3"
            >
              <Download size={14} />
              <span className="hidden xl:inline">Subscribers CSV</span>
            </SitezyButton>
            {isPublished ? (
              <SitezyButton variant="secondary" size="sm" onClick={handleOpenLive} className="h-9 min-h-[36px] px-3">
                <Globe2 size={14} />
                <span className="hidden lg:inline">Live</span>
              </SitezyButton>
            ) : null}
          </div>
        </div>
      </div>

      <main className="sz-page-scroll">
        <div className="mx-auto w-full max-w-[1480px] px-4 pb-10 pt-6">
        {!storageReady || banner ? (
          <div className="border-t border-[var(--border-soft)]">
            {!storageReady ? (
              <div className="border-b border-amber-300/20 py-3 text-[13px] leading-7 text-amber-100/90">
                Lead capture needs the latest database migration before submissions and subscribers can be stored.
              </div>
            ) : null}

            {banner ? (
              <div
                className={`border-b py-3 text-[13px] leading-7 ${
                  banner.kind === "success"
                    ? "border-emerald-300/20 text-emerald-100/90"
                    : "border-rose-300/20 text-rose-100/90"
                }`}
              >
                {banner.message}
              </div>
            ) : null}
          </div>
        ) : null}

        <section className={cn(storageReady || banner ? "mt-3" : "mt-0")}>
          <SectionHeader
            eyebrow="Lead inbox"
            title="Forms and newsletter"
            body="Review submissions, filter the stream, and export the project's captured data from the top bar."
          />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-4 text-[12px] leading-6 text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">{summary.totalSubmissions} total</span>
            <span>{summary.totalContactSubmissions} forms</span>
            <span>{summary.totalNewsletterSubmissions} newsletter</span>
            <span>{summary.totalSubscribers} subscribers</span>
            <span>Latest {latestSubmissionLabel}</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 pb-4">
            <FilterPill
              label="All"
              count={submissionCounts.all}
              active={submissionFilter === "all"}
              onClick={() => setSubmissionFilter("all")}
            />
            <FilterPill
              label="Forms"
              count={submissionCounts.contact}
              active={submissionFilter === "contact"}
              onClick={() => setSubmissionFilter("contact")}
            />
            <FilterPill
              label="Newsletter"
              count={submissionCounts.newsletter}
              active={submissionFilter === "newsletter"}
              onClick={() => setSubmissionFilter("newsletter")}
            />
          </div>

          {filteredSubmissions.length ? (
            <div className="divide-y divide-[var(--border-soft)]">
              {filteredSubmissions.map((submission) => (
                <article
                  key={submission.id}
                  className="grid gap-5 py-5 xl:grid-cols-[minmax(0,1fr)_220px_170px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SitezyBadge className={submission.kind === "newsletter" ? "sz-status-info" : "sz-status-success"}>
                        {getLeadSubmissionDisplayLabel(submission.kind, submission.formId)}
                      </SitezyBadge>
                      <span className="text-[12px] text-[var(--fg-muted)]">{formatShortDateTime(submission.createdAt)}</span>
                    </div>

                    <p className="mt-3 text-[18px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      {submission.name || submission.email || "New submission"}
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">
                      {submission.pagePath}
                      {(getLeadSubmissionSourceLabel(submission.kind, submission.formId) || submission.formId)
                        ? ` • ${getLeadSubmissionSourceLabel(submission.kind, submission.formId) || submission.formId}`
                        : ""}
                    </p>

                    {submission.message ? (
                      <p className="mt-4 max-w-[760px] text-[13px] leading-7 text-[var(--text-secondary)]">{shortMessage(submission.message)}</p>
                    ) : null}
                  </div>

                  <div className="space-y-3 border-t border-[var(--border-soft)] pt-4 xl:border-t-0 xl:pl-6 xl:pt-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Contact</p>
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--fg-faint)]">Email</p>
                      <p className="mt-1 text-[13px] leading-6 text-[var(--text-primary)]">{submission.email || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--fg-faint)]">Recipient</p>
                      <p className="mt-1 text-[13px] leading-6 text-[var(--text-primary)]">{submission.notificationEmail || "No notification email"}</p>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-[var(--border-soft)] pt-4 xl:border-t-0 xl:pl-6 xl:pt-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">Delivery</p>
                    <SitezyBadge className={submission.notificationDeliveryStatus === "sent" ? "sz-status-success" : "sz-status-warning"}>
                      {submission.notificationDeliveryStatus === "sent"
                        ? "Notification sent"
                        : submission.notificationDeliveryStatus === "failed"
                        ? "Notification failed"
                        : "Stored only"}
                    </SitezyBadge>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border-t border-[var(--border-soft)]">
              <EmptyStateBlock
                icon={<Mail size={20} />}
                title={emptySubmissionState.title}
                body={emptySubmissionState.body}
              />
            </div>
          )}
        </section>
        </div>
      </main>
    </div>
  );
}
