#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const cwd = process.cwd();
const port = process.env.PORT || "3000";
const nextBin = path.join(cwd, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
const workerScript = path.join(cwd, "scripts", "project-generation-worker.mjs");
const internalBaseUrl = process.env.SITEZY_INTERNAL_BASE_URL || `http://127.0.0.1:${port}`;
const shouldStartWorker = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const children = [];
let shuttingDown = false;

function stopChildren(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function spawnProcess(label, command, args, env) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    stopChildren();

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error(`[dev-with-worker] ${label} failed:`, error);
    stopChildren();
    process.exit(1);
  });

  children.push(child);
  return child;
}

process.on("SIGINT", () => stopChildren("SIGINT"));
process.on("SIGTERM", () => stopChildren("SIGTERM"));

spawnProcess("next-dev", nextBin, ["dev", "--port", port], process.env);

if (shouldStartWorker) {
  spawnProcess("project-generation-worker", process.execPath, [workerScript], {
    ...process.env,
    SITEZY_INTERNAL_BASE_URL: internalBaseUrl,
  });
} else {
  console.warn("[dev-with-worker] SUPABASE_SERVICE_ROLE_KEY is missing. Background generation worker was not started.");
}
