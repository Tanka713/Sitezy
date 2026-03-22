import type { AppError } from "./AppError";
import type { ErrorSeverity } from "./types";

const IS_DEV = process.env.NODE_ENV !== "production";

// ─── Styling for dev console output ──────────────────────────────────────────

const SEVERITY_STYLES: Record<ErrorSeverity, string> = {
  info:  "color: #60a5fa; font-weight: bold",   // blue
  warn:  "color: #fbbf24; font-weight: bold",   // amber
  error: "color: #f87171; font-weight: bold",   // red
  fatal: "color: #dc2626; font-weight: bold; text-decoration: underline", // bold red
};

const SEVERITY_PREFIX: Record<ErrorSeverity, string> = {
  info:  "ℹ",
  warn:  "⚠",
  error: "✖",
  fatal: "☠",
};

// ─── Core log function ────────────────────────────────────────────────────────

/**
 * Log a structured AppError to the console.
 *
 * In development: full structured output with metadata and cause chain.
 * In production: minimal output without sensitive metadata.
 *
 * Example dev output:
 *   ✖ [EDITOR_DELETE_001] Failed to delete node hero-1
 *     severity=error  timestamp=2025-01-15T10:32:00.000Z
 *     metadata={ nodeId: "hero-1", pageId: "home" }
 *     cause: Error: Node not in DOM
 */
export function logAppError(err: AppError): void {
  if (IS_DEV) {
    logDev(err);
  } else {
    logProd(err);
  }
}

function logDev(err: AppError): void {
  const prefix = SEVERITY_PREFIX[err.severity];
  const style  = SEVERITY_STYLES[err.severity];

  // eslint-disable-next-line no-console
  console.groupCollapsed(
    `%c${prefix} [${err.code}] ${err.devMessage}`,
    style
  );

  // eslint-disable-next-line no-console
  console.log(
    `severity=${err.severity}  timestamp=${err.timestamp}`
  );

  if (err.metadata && Object.keys(err.metadata).length > 0) {
    // eslint-disable-next-line no-console
    console.log("metadata=", err.metadata);
  }

  if (err.cause !== undefined) {
    // eslint-disable-next-line no-console
    console.log("cause:", err.cause);
  }

  // eslint-disable-next-line no-console
  console.groupEnd();
}

function logProd(err: AppError): void {
  // In production, log only the code + user message (no metadata, no cause)
  const method = err.severity === "fatal" || err.severity === "error"
    // eslint-disable-next-line no-console
    ? console.error
    // eslint-disable-next-line no-console
    : console.warn;

  method(`[${err.code}] ${err.severity}: ${err.userMessage}`);
}

// ─── Server-side structured log (API routes / Node.js) ───────────────────────

/**
 * Structured log for server-side API route errors.
 * Outputs a single-line JSON-friendly log suitable for log aggregation.
 */
export function logServerError(err: AppError, requestId?: string | null): void {
  const entry = {
    code:       err.code,
    severity:   err.severity,
    devMessage: err.devMessage,
    userMessage: err.userMessage,
    metadata:   err.metadata,
    requestId:  requestId ?? null,
    timestamp:  err.timestamp,
    ...(IS_DEV && err.cause instanceof Error
      ? { causeMessage: err.cause.message }
      : {}),
  };

  if (err.severity === "fatal" || err.severity === "error") {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(entry));
  } else {
    // eslint-disable-next-line no-console
    console.warn(JSON.stringify(entry));
  }
}

// ─── Safe action wrapper ──────────────────────────────────────────────────────

/**
 * Wrap a synchronous or async action and log any AppError it throws.
 * Returns undefined on failure — the caller decides what to do next.
 *
 * @example
 * const result = await safeAction(() => deleteNode(nodeId));
 * if (!result.ok) { showToast(result.error.userMessage); }
 */
export async function safeAction<T>(
  fn: () => T | Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; error: AppError }> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (err) {
    if (err instanceof Error && err.name === "AppError") {
      const appErr = err as AppError;
      logAppError(appErr);
      return { ok: false, error: appErr };
    }
    // Re-throw non-AppErrors — they should be normalized at a higher boundary
    throw err;
  }
}
