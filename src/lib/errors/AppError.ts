import type { ErrorCode } from "./codes";
import { UNKNOWN_001 } from "./codes";
import type { AppErrorData, CreateAppErrorParams, ErrorSeverity } from "./types";
import { getUserMessage } from "./messages";

/**
 * AppError — the central error class for Sitezy.
 *
 * All application errors should be instances of AppError so they are:
 * - Traceable via structured error codes
 * - Safe to display (no raw internals exposed)
 * - Easy to log with full dev context
 *
 * Usage:
 *   throw new AppError({
 *     code: EDITOR_DELETE_001,
 *     devMessage: `Node ${nodeId} not found during delete`,
 *     metadata: { nodeId },
 *     severity: "error",
 *   });
 */
export class AppError extends Error implements AppErrorData {
  readonly code: ErrorCode;
  readonly devMessage: string;
  readonly userMessage: string;
  readonly severity: ErrorSeverity;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: string;
  readonly cause?: unknown;

  constructor(params: CreateAppErrorParams) {
    const userMessage = params.userMessage ?? getUserMessage(params.code);
    super(params.devMessage);

    this.name = "AppError";
    this.code = params.code;
    this.devMessage = params.devMessage;
    this.userMessage = userMessage;
    this.severity = params.severity ?? "error";
    this.metadata = params.metadata;
    this.timestamp = new Date().toISOString();
    this.cause = params.cause;

    // Preserve proper prototype chain in transpiled envs
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /** Serialize to a plain object (safe for JSON transmission — no stack) */
  toJSON(): AppErrorData {
    return {
      code: this.code,
      devMessage: this.devMessage,
      userMessage: this.userMessage,
      severity: this.severity,
      metadata: this.metadata,
      timestamp: this.timestamp,
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a structured AppError.
 *
 * @example
 * const err = createAppError({
 *   code: SAVE_PROJECT_001,
 *   devMessage: `Save failed for project ${id}: ${cause.message}`,
 *   metadata: { projectId: id },
 *   cause,
 * });
 */
export function createAppError(params: CreateAppErrorParams): AppError {
  return new AppError(params);
}

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

// ─── Normalize any thrown value ───────────────────────────────────────────────

/**
 * Normalize any thrown value into an AppError.
 * Use this at catch boundaries where you don't know what was thrown.
 *
 * @example
 * try { ... }
 * catch (err) {
 *   const appErr = normalizeError(err, UNKNOWN_001);
 *   logAppError(appErr);
 * }
 */
export function normalizeError(
  err: unknown,
  fallbackCode: ErrorCode = UNKNOWN_001,
  metadata?: Record<string, unknown>
): AppError {
  if (isAppError(err)) return err;

  if (err instanceof Error) {
    return new AppError({
      code: fallbackCode,
      devMessage: err.message,
      severity: "error",
      metadata,
      cause: err,
    });
  }

  // Non-Error values thrown (strings, numbers, objects, etc.)
  return new AppError({
    code: fallbackCode,
    devMessage: typeof err === "string" ? err : JSON.stringify(err),
    severity: "error",
    metadata,
    cause: err,
  });
}
