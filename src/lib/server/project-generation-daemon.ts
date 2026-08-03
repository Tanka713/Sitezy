import os from "node:os";
import process from "node:process";
import { claimNextGenerationJob } from "@/lib/server/project-generation-jobs";
import { runProjectGenerationJobStep } from "@/lib/server/project-generation-runner";
import type { ProjectGenerationJob } from "@/types";

const POLL_MS = Number(process.env.SITEZY_GENERATION_WORKER_POLL_MS || 3000);
const STEP_BACKOFF_MS = Number(process.env.SITEZY_GENERATION_WORKER_STEP_BACKOFF_MS || 2000);
const ERROR_BACKOFF_MS = Number(process.env.SITEZY_GENERATION_WORKER_ERROR_BACKOFF_MS || 5000);
const STALE_AFTER_SECONDS = Number(process.env.SITEZY_GENERATION_JOB_STALE_SECONDS || 120);
const DEFAULT_WORKER_ID = process.env.SITEZY_GENERATION_WORKER_ID || `${os.hostname()}-${process.pid}-app-server`;

type ProjectGenerationDaemonState = {
  started: boolean;
  loopPromise: Promise<void> | null;
  workerId: string;
};

declare global {
  var __sitezyProjectGenerationDaemon: ProjectGenerationDaemonState | undefined;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function log(message: string, extra?: Record<string, unknown>) {
  const prefix = `[project-generation-daemon:${getDaemonState().workerId}]`;
  if (extra) {
    console.log(prefix, message, extra);
    return;
  }
  console.log(prefix, message);
}

function hasDaemonConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getDaemonState(): ProjectGenerationDaemonState {
  if (!globalThis.__sitezyProjectGenerationDaemon) {
    globalThis.__sitezyProjectGenerationDaemon = {
      started: false,
      loopPromise: null,
      workerId: DEFAULT_WORKER_ID,
    };
  }

  return globalThis.__sitezyProjectGenerationDaemon;
}

async function processJob(job: ProjectGenerationJob, workerId: string) {
  log(`claimed job ${job.id} for project ${job.projectId}`);

  while (true) {
    try {
      const result = await runProjectGenerationJobStep(job.id, workerId);
      const status = result.job.status;
      const progressMessage = result.job.progressMessage?.trim() || "";

      if (progressMessage) {
        log(`${job.id} -> ${status}: ${progressMessage}`);
      } else {
        log(`${job.id} -> ${status}`);
      }

      if (!result.shouldContinue || status === "completed" || status === "failed" || status === "canceled") {
        return;
      }

      await sleep(STEP_BACKOFF_MS);
    } catch (error) {
      log(`step retry for ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      await sleep(ERROR_BACKOFF_MS);
    }
  }
}

async function runDaemonLoop(state: ProjectGenerationDaemonState) {
  log("started");

  while (state.started) {
    try {
      const job = await claimNextGenerationJob(state.workerId, STALE_AFTER_SECONDS);
      if (!job) {
        await sleep(POLL_MS);
        continue;
      }

      await processJob(job, state.workerId);
    } catch (error) {
      log(`loop error: ${error instanceof Error ? error.message : String(error)}`);
      await sleep(ERROR_BACKOFF_MS);
    }
  }
}

export function ensureProjectGenerationDaemon(): boolean {
  if (!hasDaemonConfig()) {
    return false;
  }

  const state = getDaemonState();
  if (state.started && state.loopPromise) {
    return true;
  }

  state.started = true;
  state.loopPromise = runDaemonLoop(state)
    .catch((error) => {
      log(`fatal error: ${error instanceof Error ? error.message : String(error)}`);
    })
    .finally(() => {
      state.started = false;
      state.loopPromise = null;
    });

  return true;
}
