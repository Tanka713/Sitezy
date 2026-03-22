import type { ErrorCode } from "./codes";

// ─── Core error shape ─────────────────────────────────────────────────────────

export type ErrorSeverity = "info" | "warn" | "error" | "fatal";

export interface AppErrorData {
  /** Structured error code — always traceable (e.g. EDITOR_DELETE_001) */
  code: ErrorCode;
  /** Developer-facing message with technical detail — never shown to users */
  devMessage: string;
  /** Safe, calm user-facing message — never expose internals */
  userMessage: string;
  /** Severity level controlling logging and UI behavior */
  severity: ErrorSeverity;
  /** Optional structured metadata for debugging (nodeId, pageId, etc.) */
  metadata?: Record<string, unknown>;
  /** ISO timestamp of when the error occurred */
  timestamp: string;
  /** Original cause — captured for debugging but never surfaced to users */
  cause?: unknown;
}

// ─── API error response shape (used by all API routes) ───────────────────────

export interface ApiErrorResponse {
  error: string;           // user-safe message
  code: string;            // structured error code
  requestId?: string | null;
  severity?: ErrorSeverity;
}

// ─── Parameters for createAppError ───────────────────────────────────────────

export interface CreateAppErrorParams {
  code: ErrorCode;
  devMessage: string;
  userMessage?: string;    // defaults to the code's mapped message
  severity?: ErrorSeverity;
  metadata?: Record<string, unknown>;
  cause?: unknown;
}
