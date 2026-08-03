"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Circle, CheckCircle2, Loader2, LockKeyhole, UsersRound, WifiOff } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAppStore } from "@/lib/store";
import { API_UNKNOWN_001, DB_READ_001, logAppError, normalizeError } from "@/lib/errors";
import type {
  Project,
  ProjectCollaborationBootstrap,
  ProjectCollaborationPresence,
  ProjectComment,
  ProjectPageLock,
  UserAccountProfile,
} from "@/types";

type RealtimeChannel = ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]>;

type RealtimePostgresPayload = {
  new?: {
    id?: string;
    project_id?: string;
    page_id?: string;
    revision?: number;
    actor_user_id?: string;
  };
};

const PRESENCE_COLORS = ["#6b77ff", "#3dd6a3", "#f7b955", "#ff7a90", "#7dd3fc", "#c084fc"];

function colorForUser(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

function normalizePresence(value: unknown): ProjectCollaborationPresence | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ProjectCollaborationPresence>;
  const userId = typeof raw.userId === "string" && raw.userId.trim() ? raw.userId : null;
  if (!userId) return null;
  return {
    userId,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : "Collaborator",
    email: typeof raw.email === "string" && raw.email.trim() ? raw.email : null,
    color: typeof raw.color === "string" && raw.color.trim() ? raw.color : colorForUser(userId),
    pageId: typeof raw.pageId === "string" && raw.pageId.trim() ? raw.pageId : null,
    sectionId: typeof raw.sectionId === "string" && raw.sectionId.trim() ? raw.sectionId : null,
    nodeLabel: typeof raw.nodeLabel === "string" && raw.nodeLabel.trim() ? raw.nodeLabel : null,
    mode: raw.mode === "code" || raw.mode === "preview" || raw.mode === "visual" ? raw.mode : "visual",
    lastActiveAt: typeof raw.lastActiveAt === "string" ? raw.lastActiveAt : new Date().toISOString(),
  };
}

function readPresenceState(channel: RealtimeChannel, selfUserId: string) {
  const state = channel.presenceState() as Record<string, unknown[]>;
  return Object.values(state)
    .flat()
    .map(normalizePresence)
    .filter((presence): presence is ProjectCollaborationPresence => Boolean(presence))
    .filter((presence) => presence.userId !== selfUserId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function mergeComment(list: ProjectComment[], comment: ProjectComment) {
  const next = [comment, ...list.filter((item) => item.id !== comment.id)];
  return next.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function activeLocks(locks: ProjectPageLock[], pageId: string | null, selfUserId: string) {
  if (!pageId) return [];
  const now = Date.now();
  return locks.filter(
    (lock) =>
      lock.pageId === pageId &&
      lock.userId !== selfUserId &&
      Date.parse(lock.expiresAt) > now
  );
}

function mergeLock(list: ProjectPageLock[], lock: ProjectPageLock) {
  return [lock, ...list.filter((item) => item.id !== lock.id)];
}

export function EditorCollaborationLayer({
  project,
  initialAccount = null,
}: {
  project: Project;
  initialAccount?: UserAccountProfile | null;
}) {
  const selectedPageId = useAppStore((s) => s.editor.selectedPageId);
  const selectedSectionId = useAppStore((s) => s.editor.selectedSectionId);
  const selectedNode = useAppStore((s) => s.editor.selectedNode);
  const previewMode = useAppStore((s) => s.editor.previewMode);
  const visualEditMode = useAppStore((s) => s.editor.visualEditMode);
  const syncProjectFromServer = useAppStore((s) => s.syncProjectFromServer);
  const setApiError = useAppStore((s) => s.setApiError);

  const userId = initialAccount?.id ?? "local-editor";
  const userName = initialAccount?.name?.trim() || initialAccount?.email || "You";
  const activePageId = selectedPageId ?? project.pages[0]?.id ?? null;
  const activePage = activePageId ? project.pages.find((page) => page.id === activePageId) ?? null : null;
  const selfColor = useMemo(() => colorForUser(userId), [userId]);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [locks, setLocks] = useState<ProjectPageLock[]>([]);
  const [online, setOnline] = useState<ProjectCollaborationPresence[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingComment, setSavingComment] = useState(false);
  const [connectionState, setConnectionState] = useState<"connecting" | "online" | "offline">("connecting");
  const lastSeenRevisionRef = useRef<Record<string, number>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  const pageComments = comments.filter((comment) => !activePageId || comment.pageId === activePageId);
  const unresolvedComments = pageComments.filter((comment) => comment.status === "open");
  const pageLocks = activeLocks(locks, activePageId, userId);

  useEffect(() => {
    let cancelled = false;

    async function loadBootstrap() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${project.id}/collab/bootstrap`, {
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as Partial<ProjectCollaborationBootstrap> & {
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Collaboration bootstrap failed");
        }
        if (cancelled) return;
        setComments(Array.isArray(data.comments) ? data.comments : []);
        setLocks(Array.isArray(data.locks) ? data.locks : []);
      } catch (error) {
        const appErr = normalizeError(error, DB_READ_001, {
          action: "loadCollaborationBootstrap",
          projectId: project.id,
        });
        logAppError(appErr);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadBootstrap();
    const interval = window.setInterval(() => void loadBootstrap(), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [project.id]);

  useEffect(() => {
    let cancelled = false;

    try {
      const supabase = getSupabaseBrowserClient();
      const channel = supabase.channel(`project:${project.id}:collaboration`, {
        config: { presence: { key: userId } },
      });
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => {
          if (cancelled) return;
          setOnline(readPresenceState(channel, userId));
        })
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "project_comments", filter: `project_id=eq.${project.id}` },
          () => {
            void refreshComments(project.id);
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "project_page_operations", filter: `project_id=eq.${project.id}` },
          (payload: RealtimePostgresPayload) => {
            const op = payload.new;
            if (!op?.page_id || op.actor_user_id === userId) return;
            lastSeenRevisionRef.current[op.page_id] = Math.max(
              lastSeenRevisionRef.current[op.page_id] ?? 0,
              typeof op.revision === "number" ? op.revision : 0
            );
            void syncRemoteProject("remote-page-operation");
          }
        )
        .subscribe((status: string) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") {
            setConnectionState("online");
            void trackPresence();
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setConnectionState("offline");
          }
        });

      return () => {
        cancelled = true;
        channelRef.current = null;
        setOnline([]);
        void supabase.removeChannel(channel);
      };
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, {
        action: "connectCollaborationRealtime",
        projectId: project.id,
      });
      logAppError(appErr);
      setConnectionState("offline");
      return () => {
        cancelled = true;
      };
    }
  }, [project.id, syncProjectFromServer, userId]);

  useEffect(() => {
    void trackPresence();
  }, [activePageId, previewMode, selectedNode?.widgetLabel, selectedNode?.textTargetTag, selectedSectionId, visualEditMode]);

  useEffect(() => {
    if (!activePageId || !activePage) return;
    const activeRevision = activePage.revision ?? 1;
    lastSeenRevisionRef.current[activePageId] = Math.max(
      lastSeenRevisionRef.current[activePageId] ?? 0,
      activeRevision
    );

    let cancelled = false;
    async function pollOperations() {
      if (!activePageId || cancelled) return;
      const sinceRevision = lastSeenRevisionRef.current[activePageId] ?? activeRevision;
      try {
        const res = await fetch(
          `/api/projects/${project.id}/pages/${activePageId}/ops?sinceRevision=${encodeURIComponent(String(sinceRevision))}`,
          { credentials: "same-origin" }
        );
        const data = (await res.json().catch(() => ({}))) as {
          operations?: Array<{ revision?: number; actorUserId?: string }>;
        };
        if (!res.ok || !Array.isArray(data.operations) || data.operations.length === 0) return;
        const nextRevision = data.operations.reduce(
          (max, op) => Math.max(max, typeof op.revision === "number" ? op.revision : 0),
          sinceRevision
        );
        lastSeenRevisionRef.current[activePageId] = nextRevision;
        if (data.operations.some((op) => op.actorUserId !== userId)) {
          await syncRemoteProject("poll-page-operations");
        }
      } catch (error) {
        logAppError(normalizeError(error, DB_READ_001, {
          action: "pollPageOperations",
          projectId: project.id,
          pageId: activePageId,
        }));
      }
    }

    const interval = window.setInterval(() => void pollOperations(), 6000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activePage?.revision, activePageId, project.id, userId]);

  useEffect(() => {
    if (!activePageId || previewMode !== "code") return;
    let cancelled = false;

    async function acquireCodeLock() {
      try {
        const res = await fetch(`/api/projects/${project.id}/pages/${activePageId}/ops`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "lock",
            lockMode: "code",
            ttlSeconds: 180,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { lock?: ProjectPageLock };
        if (!cancelled && res.ok && data.lock) {
          setLocks((current) => mergeLock(current, data.lock as ProjectPageLock));
        }
      } catch (error) {
        logAppError(normalizeError(error, API_UNKNOWN_001, {
          action: "acquireCodeModeLock",
          projectId: project.id,
          pageId: activePageId,
        }));
      }
    }

    void acquireCodeLock();
    const interval = window.setInterval(() => void acquireCodeLock(), 120000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activePageId, previewMode, project.id]);

  async function syncRemoteProject(action: string) {
    try {
      await syncProjectFromServer(project.id, {
        preserveEditor: true,
        preserveHistory: true,
      });
    } catch (error) {
      const appErr = normalizeError(error, DB_READ_001, {
        action,
        projectId: project.id,
      });
      logAppError(appErr);
      setApiError({
        message: appErr.userMessage,
        requestId: typeof appErr.metadata?.requestId === "string" ? appErr.metadata.requestId : null,
        code: appErr.code,
      });
    }
  }

  async function refreshComments(projectId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { comments?: ProjectComment[] };
      if (res.ok && Array.isArray(data.comments)) setComments(data.comments);
    } catch (error) {
      logAppError(normalizeError(error, DB_READ_001, { action: "refreshCollaborationComments", projectId }));
    }
  }

  async function trackPresence() {
    const channel = channelRef.current;
    if (!channel || connectionState === "offline") return;
    const nodeLabel =
      selectedNode?.widgetLabel ||
      selectedNode?.textTargetTag ||
      selectedNode?.collectionLabel ||
      null;
    await channel.track({
      userId,
      name: userName,
      email: initialAccount?.email ?? null,
      color: selfColor,
      pageId: activePageId,
      sectionId: selectedSectionId,
      nodeLabel,
      mode: previewMode === "code" ? "code" : visualEditMode ? "visual" : "preview",
      lastActiveAt: new Date().toISOString(),
    } satisfies ProjectCollaborationPresence);
  }

  async function createComment() {
    const body = draft.trim();
    if (!body || savingComment) return;
    setSavingComment(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/comments`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          pageId: activePageId,
          sectionId: selectedSectionId,
          authorName: userName,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { comment?: ProjectComment; error?: string };
      if (!res.ok || !data.comment) throw new Error(data.error ?? "Comment could not be saved");
      setComments((current) => mergeComment(current, data.comment as ProjectComment));
      setDraft("");
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, {
        action: "createProjectComment",
        projectId: project.id,
        pageId: activePageId,
      });
      logAppError(appErr);
      setApiError({
        message: appErr.userMessage,
        requestId: typeof appErr.metadata?.requestId === "string" ? appErr.metadata.requestId : null,
        code: appErr.code,
      });
    } finally {
      setSavingComment(false);
    }
  }

  async function setCommentStatus(commentId: string, status: "open" | "resolved") {
    const previous = comments;
    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? { ...comment, status, resolvedAt: status === "resolved" ? new Date().toISOString() : null }
          : comment
      )
    );
    try {
      const res = await fetch(`/api/projects/${project.id}/comments`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, status }),
      });
      const data = (await res.json().catch(() => ({}))) as { comment?: ProjectComment };
      if (res.ok && data.comment) {
        setComments((current) => mergeComment(current.filter((comment) => comment.id !== commentId), data.comment as ProjectComment));
      }
    } catch (error) {
      setComments(previous);
      logAppError(normalizeError(error, API_UNKNOWN_001, { action: "setProjectCommentStatus", projectId: project.id, commentId }));
    }
  }

  return (
    <div className="pointer-events-none absolute right-4 top-[72px] z-[135] flex max-w-[calc(100vw-32px)] flex-col items-end gap-2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)]/95 px-2 py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-[12px] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-4)]"
        >
          <UsersRound size={13} />
          <span>{online.length + 1}</span>
          {connectionState === "offline" ? <WifiOff size={12} className="text-amber-300" /> : <Circle size={7} className="fill-emerald-300 text-emerald-300" />}
        </button>
        <div className="flex -space-x-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--surface-2)] text-[10px] font-bold text-white"
            style={{ backgroundColor: selfColor }}
            title={userName}
          >
            {initials(userName)}
          </span>
          {online.slice(0, 4).map((presence) => (
            <span
              key={`${presence.userId}:${presence.pageId ?? "project"}`}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--surface-2)] text-[10px] font-bold text-white"
              style={{ backgroundColor: presence.color }}
              title={`${presence.name}${presence.nodeLabel ? ` · ${presence.nodeLabel}` : ""}`}
            >
              {initials(presence.name)}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12px] font-semibold text-[var(--fg-muted)] transition hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
        >
          <MessageSquare size={13} />
          <span>{unresolvedComments.length}</span>
        </button>
      </div>

      {pageLocks.length > 0 ? (
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-[12px] font-semibold text-amber-100">
          <LockKeyhole size={13} />
          Page locked by another editor
        </div>
      ) : null}

      {open ? (
        <div className="pointer-events-auto w-[360px] max-w-full overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-2)]/98 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="border-b border-[var(--border-soft)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-[var(--text-primary)]">Collaboration</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {activePage?.name ?? "Project"} · {connectionState === "online" ? "live" : connectionState}
                </p>
              </div>
              {loading ? <Loader2 size={14} className="spin text-[var(--fg-muted)]" /> : null}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-4">
            <div className="mb-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Online now</p>
              <div className="space-y-2">
                {[{ userId, name: `${userName} (you)`, color: selfColor, nodeLabel: null, mode: previewMode === "code" ? "code" : visualEditMode ? "visual" : "preview" } as ProjectCollaborationPresence, ...online].map((presence) => (
                  <div key={`${presence.userId}:${presence.name}`} className="flex items-center gap-2 rounded-[14px] bg-[var(--surface-3)] px-2.5 py-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: presence.color }} />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--text-primary)]">{presence.name}</span>
                    <span className="rounded-full bg-[var(--surface-4)] px-2 py-0.5 text-[10px] text-[var(--text-tertiary)]">{presence.mode}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Add note</p>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={selectedSectionId ? "Comment on this section..." : "Comment on this page..."}
                className="sz-textarea min-h-[84px] w-full resize-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!draft.trim() || savingComment}
                  onClick={() => void createComment()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--button-primary-bg)] px-3 text-[12px] font-bold text-[var(--button-primary-fg)] transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingComment ? <Loader2 size={12} className="spin" /> : <MessageSquare size={12} />}
                  Comment
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Page comments</p>
              {pageComments.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[var(--border-soft)] px-4 py-5 text-center text-[12px] text-[var(--text-tertiary)]">
                  No comments on this page yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {pageComments.slice(0, 8).map((comment) => (
                    <article key={comment.id} className="rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-3)] p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="truncate text-[12px] font-bold text-[var(--text-primary)]">{comment.authorName || "Collaborator"}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${comment.status === "open" ? "bg-amber-400/10 text-amber-200" : "bg-emerald-400/10 text-emerald-200"}`}>
                          {comment.status}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-[12px] leading-5 text-[var(--text-secondary)]">{comment.body}</p>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void setCommentStatus(comment.id, comment.status === "open" ? "resolved" : "open")}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-[var(--fg-muted)] transition hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
                        >
                          <CheckCircle2 size={12} />
                          {comment.status === "open" ? "Resolve" : "Reopen"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
