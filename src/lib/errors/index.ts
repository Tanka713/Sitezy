/**
 * ============================================================
 * SITEZY — CENTRALIZED ERROR SYSTEM
 * ============================================================
 *
 * Barrel export. Import everything from "@/lib/errors".
 *
 * Quick usage guide:
 *
 * 1. Import what you need:
 *    import { createAppError, logAppError, EDITOR_DELETE_001 } from "@/lib/errors";
 *
 * 2. Create a structured error:
 *    const err = createAppError({
 *      code: EDITOR_DELETE_001,
 *      devMessage: `Cannot delete node ${nodeId}: not found`,
 *      metadata: { nodeId, pageId },
 *      cause: originalError,
 *    });
 *
 * 3. Log it (dev only shows full detail; prod is minimal):
 *    logAppError(err);
 *
 * 4. In API routes, use handleRouteError at the catch:
 *    } catch (err) {
 *      return handleRouteError(err, requestId);
 *    }
 *
 * 5. In React components, use normalizeError + logAppError in catch blocks.
 *
 * 6. To add a new error code:
 *    - Add the constant + type in codes.ts
 *    - Add the user message in messages.ts
 *    - Use createAppError({ code: NEW_CODE, ... }) at the call site
 * ============================================================
 */

// Error codes
export * from "./codes";

// Types
export type { AppErrorData, ApiErrorResponse, CreateAppErrorParams, ErrorSeverity } from "./types";

// AppError class + factory + guards
export { AppError, createAppError, isAppError, normalizeError } from "./AppError";

// Logging
export { logAppError, logServerError, safeAction } from "./logger";

// User messages
export { getUserMessage } from "./messages";

// API helpers (server-side)
export { errorResponse, handleRouteError, assertFields, parseRequestBody } from "./api";
