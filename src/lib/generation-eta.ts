import type { ProjectGenerationJob } from "@/types";

export type LocalGenerationTimingKind =
  | "full-site"
  | "site-regeneration"
  | "page"
  | "section";

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;

export function estimateFullSiteDurationMs(pageCount: number): number {
  const pages = Math.max(1, pageCount);
  return 35_000 + pages * 42_000;
}

export function estimateSiteRegenerationDurationMs(pageCount: number): number {
  const pages = Math.max(1, pageCount);
  return 18_000 + pages * 30_000;
}

export function estimateAddPageDurationMs(): number {
  return 42_000;
}

export function estimateSectionRegenerationDurationMs(): number {
  return 24_000;
}

export function getRemainingMsFromTiming(
  startedAt: number | null,
  estimateMs: number | null,
  now = Date.now()
): number | null {
  if (!startedAt || !estimateMs || estimateMs <= 0) return null;
  const elapsed = Math.max(0, now - startedAt);
  return Math.max(0, estimateMs - elapsed);
}

export function formatGenerationEtaLabel(remainingMs: number | null): string | null {
  if (remainingMs == null) return null;
  if (remainingMs <= 0) return "Wrapping up…";

  const totalSeconds = Math.max(5, Math.ceil(remainingMs / SECOND_MS));
  if (totalSeconds < 90) {
    return `~${totalSeconds}s left`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 10 || seconds === 0) {
    return `~${minutes}m left`;
  }
  return `~${minutes}m ${seconds}s left`;
}

export function getTimingEtaLabel(
  startedAt: number | null,
  estimateMs: number | null,
  now = Date.now()
): string | null {
  return formatGenerationEtaLabel(getRemainingMsFromTiming(startedAt, estimateMs, now));
}

function parseIsoToMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getJobGenerationEstimateMs(job: ProjectGenerationJob | null, now = Date.now()): number | null {
  if (!job) return null;
  const totalPages = Math.max(1, job.totalPages || 1);
  const startedAt = parseIsoToMs(job.startedAt);

  if (startedAt && job.completedPages > 0) {
    const completed = Math.max(1, Math.min(job.completedPages, totalPages));
    const elapsed = Math.max(0, now - startedAt);
    const averagePerPage = Math.max(18_000, elapsed / completed);
    return Math.round(averagePerPage * totalPages);
  }

  return estimateFullSiteDurationMs(totalPages);
}

export function getJobGenerationEtaLabel(job: ProjectGenerationJob | null, now = Date.now()): string | null {
  if (!job || (job.status !== "queued" && job.status !== "running")) return null;

  const estimateMs = getJobGenerationEstimateMs(job, now);
  const startedAt = parseIsoToMs(job.startedAt) ?? parseIsoToMs(job.createdAt);
  return getTimingEtaLabel(startedAt, estimateMs, now);
}
