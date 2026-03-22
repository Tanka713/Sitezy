/**
 * API error helpers — used in Next.js API routes to produce consistent
 * error responses with structured codes and safe messages.
 */

import { NextResponse } from "next/server";
import { createAppError, isAppError, normalizeError } from "./AppError";
import { logServerError } from "./logger";
import type { AppError } from "./AppError";
import type { ApiErrorResponse } from "./types";
import type { ErrorCode } from "./codes";
import {
  API_REQUEST_002,
  API_REQUEST_003,
  API_UNKNOWN_001,
  API_BILLING_001,
  API_AUTH_001,
  API_RATE_LIMIT_001,
  UNKNOWN_001,
} from "./codes";
import { getUserMessage } from "./messages";

// ─── HTTP status mapping ──────────────────────────────────────────────────────

const CODE_TO_HTTP: Partial<Record<ErrorCode, number>> = {
  API_REQUEST_001: 400,
  API_REQUEST_002: 400,
  API_REQUEST_003: 400,
  VALIDATION_PROJECT_001: 400,
  VALIDATION_PROJECT_002: 400,
  VALIDATION_PAGE_001: 400,
  VALIDATION_PAGE_002: 400,
  VALIDATION_NODE_001: 400,
  VALIDATION_NODE_002: 400,
  VALIDATION_INPUT_001: 400,
  AUTH_REQUIRED_001: 401,
  AUTH_SESSION_001: 401,
  AUTH_TOKEN_001: 401,
  AUTH_PERMISSION_001: 403,
  DB_READ_002: 404,
  STATE_PAGE_002: 404,
  API_RATE_LIMIT_001: 429,
  API_BILLING_001: 402,
  API_TIMEOUT_001: 504,
  DB_CONNECTION_001: 503,
  DB_CONNECTION_002: 503,
};

function httpStatusFor(code: ErrorCode): number {
  return CODE_TO_HTTP[code] ?? 500;
}

// ─── Standard API error response ─────────────────────────────────────────────

/**
 * Convert an AppError to a NextResponse JSON error.
 * Always safe — never leaks devMessage or metadata to clients.
 */
export function errorResponse(
  err: AppError,
  requestId?: string | null
): NextResponse<ApiErrorResponse> {
  logServerError(err, requestId);
  const status = httpStatusFor(err.code);
  return NextResponse.json(
    {
      error: err.userMessage,
      code: err.code,
      requestId: requestId ?? null,
      severity: err.severity,
    },
    { status }
  );
}

// ─── Normalize then respond ───────────────────────────────────────────────────

/**
 * Normalize any caught value (AppError or raw Error) and return an error response.
 * Use at the top-level catch of every API route.
 *
 * @example
 * } catch (err) {
 *   return handleRouteError(err, req.headers.get("x-request-id"));
 * }
 */
export function handleRouteError(
  err: unknown,
  requestId?: string | null,
  fallbackCode: ErrorCode = API_UNKNOWN_001
): NextResponse<ApiErrorResponse> {
  if (isAppError(err)) {
    return errorResponse(err, requestId);
  }

  // Try to map well-known Anthropic/external API error patterns
  const mapped = mapExternalError(err, requestId);
  if (mapped) return mapped;

  // Generic fallback
  const appErr = normalizeError(err, fallbackCode);
  return errorResponse(appErr, requestId);
}

// ─── External API error mapping (Anthropic SDK etc.) ─────────────────────────

function mapExternalError(
  err: unknown,
  requestId?: string | null
): NextResponse<ApiErrorResponse> | null {
  if (!(err instanceof Error)) return null;

  const msg = err.message;

  // Parse embedded JSON from Anthropic SDK error messages
  const jsonMatch = msg.match(/\{[\s\S]*\}/);
  let parsed: { type?: string; error?: { type?: string; message?: string }; request_id?: string } | null = null;
  if (jsonMatch) {
    try { parsed = JSON.parse(jsonMatch[0]); } catch {}
  }

  const anthropicRequestId = parsed?.request_id ?? requestId ?? null;
  const errorType = parsed?.error?.type ?? "";
  const errorMsg  = parsed?.error?.message ?? msg;

  // Credit / billing error
  if (
    errorType === "invalid_request_error" &&
    (errorMsg.toLowerCase().includes("credit") || errorMsg.toLowerCase().includes("balance"))
  ) {
    const appErr = createAppError({
      code: API_BILLING_001,
      devMessage: errorMsg,
      severity: "fatal",
      metadata: { requestId: anthropicRequestId },
      cause: err,
    });
    logServerError(appErr, anthropicRequestId);
    return NextResponse.json(
      { error: appErr.userMessage, code: appErr.code, requestId: anthropicRequestId, severity: appErr.severity },
      { status: 402 }
    );
  }

  // Auth error
  if (errorType === "authentication_error") {
    const appErr = createAppError({
      code: API_AUTH_001,
      devMessage: errorMsg,
      severity: "fatal",
      cause: err,
    });
    logServerError(appErr, anthropicRequestId);
    return NextResponse.json(
      { error: appErr.userMessage, code: appErr.code, requestId: anthropicRequestId, severity: appErr.severity },
      { status: 401 }
    );
  }

  // Rate limit
  if (errorType === "rate_limit_error") {
    const appErr = createAppError({
      code: API_RATE_LIMIT_001,
      devMessage: errorMsg,
      severity: "warn",
      cause: err,
    });
    logServerError(appErr, anthropicRequestId);
    return NextResponse.json(
      { error: appErr.userMessage, code: appErr.code, requestId: anthropicRequestId, severity: appErr.severity },
      { status: 429 }
    );
  }

  return null;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

/**
 * Assert required fields exist in a request body.
 * Throws an AppError if any are missing.
 *
 * @example
 * assertFields(body, ["blueprint", "page", "brief"], API_REQUEST_002);
 */
export function assertFields(
  body: Record<string, unknown>,
  required: string[],
  code: ErrorCode = API_REQUEST_002
): void {
  const missing = required.filter((k) => body[k] == null);
  if (missing.length > 0) {
    throw createAppError({
      code,
      devMessage: `Missing required fields: ${missing.join(", ")}`,
      severity: "warn",
      metadata: { missingFields: missing },
    });
  }
}

/**
 * Safely parse a JSON request body.
 * Throws an AppError with API_REQUEST_003 on parse failure.
 */
export async function parseRequestBody<T = Record<string, unknown>>(
  req: Request
): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch (err) {
    throw createAppError({
      code: API_REQUEST_003,
      devMessage: `Failed to parse request body: ${err instanceof Error ? err.message : String(err)}`,
      severity: "warn",
      cause: err,
    });
  }
}

// ─── Generic user message lookup (for SSE / streaming routes) ────────────────

export { getUserMessage };
export type { ApiErrorResponse };
