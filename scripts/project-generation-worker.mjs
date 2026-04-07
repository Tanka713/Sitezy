#!/usr/bin/env node

import os from "node:os";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INTERNAL_BASE_URL = (process.env.SITEZY_INTERNAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const WORKER_SECRET = process.env.SITEZY_WORKER_SECRET || SUPABASE_SERVICE_ROLE_KEY;
const WORKER_ID = process.env.SITEZY_GENERATION_WORKER_ID || `${os.hostname()}-${process.pid}`;
const POLL_MS = Number(process.env.SITEZY_GENERATION_WORKER_POLL_MS || 3000);
const STEP_BACKOFF_MS = Number(process.env.SITEZY_GENERATION_WORKER_STEP_BACKOFF_MS || 2000);
const ERROR_BACKOFF_MS = Number(process.env.SITEZY_GENERATION_WORKER_ERROR_BACKOFF_MS || 5000);
const STALE_AFTER_SECONDS = Number(process.env.SITEZY_GENERATION_JOB_STALE_SECONDS || 120);

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for project generation worker.");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for project generation worker.");
}

if (!WORKER_SECRET) {
  throw new Error("Missing SITEZY_WORKER_SECRET or SUPABASE_SERVICE_ROLE_KEY for project generation worker.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

let active = true;

process.on("SIGINT", () => {
  active = false;
});

process.on("SIGTERM", () => {
  active = false;
});

function log(message, extra) {
  const prefix = `[project-generation-worker:${WORKER_ID}]`;
  if (extra !== undefined) {
    console.log(prefix, message, extra);
    return;
  }
  console.log(prefix, message);
}

async function claimNextJob() {
  const { data, error } = await supabase.rpc("claim_project_generation_job", {
    p_worker_id: WORKER_ID,
    p_stale_after_seconds: STALE_AFTER_SECONDS,
  });

  if (error) {
    throw new Error(`Failed to claim generation job: ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0];
}

async function runStep(jobId) {
  const response = await fetch(`${INTERNAL_BASE_URL}/api/internal/project-generation/step`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sitezy-worker-secret": WORKER_SECRET,
    },
    body: JSON.stringify({
      jobId,
      workerId: WORKER_ID,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = typeof payload?.code === "string" ? payload.code : "UNKNOWN";
    const message = typeof payload?.error === "string" ? payload.error : `HTTP ${response.status}`;

    if (response.status === 401 || response.status === 403) {
      throw new Error(`Worker authentication failed (${code}): ${message}`);
    }

    throw new Error(`Generation step failed (${code}): ${message}`);
  }

  return payload;
}

async function processJob(job) {
  log(`claimed job ${job.id} for project ${job.project_id}`);

  while (active) {
    try {
      const result = await runStep(job.id);
      const status = result?.job?.status ?? "unknown";
      const progressMessage = result?.job?.progressMessage || result?.job?.progress_message || "";
      if (progressMessage) {
        log(`${job.id} -> ${status}: ${progressMessage}`);
      } else {
        log(`${job.id} -> ${status}`);
      }

      if (!result?.continue || status === "completed" || status === "failed" || status === "canceled") {
        return;
      }

      await sleep(STEP_BACKOFF_MS);
    } catch (error) {
      log(`step retry for ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      await sleep(ERROR_BACKOFF_MS);
    }
  }
}

async function main() {
  log(`starting against ${INTERNAL_BASE_URL}`);

  while (active) {
    try {
      const job = await claimNextJob();
      if (!job) {
        await sleep(POLL_MS);
        continue;
      }

      await processJob(job);
    } catch (error) {
      log(`worker loop error: ${error instanceof Error ? error.message : String(error)}`);
      await sleep(ERROR_BACKOFF_MS);
    }
  }

  log("stopped");
}

await main();
