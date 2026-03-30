import {
  API_GENERATE_001,
  API_GENERATE_002,
  API_RESPONSE_001,
  API_TIMEOUT_001,
  createAppError,
  type ErrorCode,
} from "@/lib/errors";
import type { PageSection } from "@/types";

interface JsonErrorPayload {
  error?: string;
  code?: string;
  requestId?: string | null;
}

function resolveCode(status: number, code?: string): ErrorCode {
  if (code) return code as ErrorCode;
  if (status === 401 || status === 403) return "API_AUTH_001" as ErrorCode;
  if (status === 429) return "API_RATE_LIMIT_001" as ErrorCode;
  if (status === 402) return "API_BILLING_001" as ErrorCode;
  return API_GENERATE_001;
}

/**
 * Consumes the SSE stream from /api/generate.
 * Calls onChars(totalCharCount) on each progress event so callers can show
 * a live character counter while the page generates.
 * Returns the final { html, sections } when the stream completes.
 */
export async function streamGeneratePage(
  body: Record<string, unknown>,
  onChars: (count: number) => void,
  timeoutMs = 120_000
): Promise<{ html: string; sections: PageSection[] }> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as JsonErrorPayload;
      throw createAppError({
        code: resolveCode(res.status, data.code),
        devMessage: `Generate stream failed (${res.status}): ${data.error ?? "unknown"}`,
        severity: res.status >= 500 ? "error" : "warn",
        metadata: { status: res.status, requestId: data.requestId ?? null },
      });
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw createAppError({ code: API_RESPONSE_001, devMessage: "Generate response had no readable stream", severity: "error" });
    }

    const dec = new TextDecoder();
    let buf = "";
    let result: { html: string; sections: PageSection[] } | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6)) as {
            type: string;
            count?: number;
            html?: string;
            sections?: PageSection[];
            error?: string;
            code?: string;
          };

          if (evt.type === "chars" && evt.count != null) {
            onChars(evt.count);
          } else if (evt.type === "done" && evt.html) {
            result = { html: evt.html, sections: evt.sections ?? [] };
          } else if (evt.type === "error") {
            throw createAppError({
              code: (evt.code as ErrorCode | undefined) ?? API_GENERATE_001,
              devMessage: `Generate stream error event: ${evt.error ?? "unknown"}`,
              severity: "error",
            });
          }
        } catch (parseErr) {
          // Re-throw AppErrors from the block above; ignore JSON parse failures
          if (parseErr != null && typeof parseErr === "object" && "code" in parseErr) throw parseErr;
        }
      }
    }

    if (!result) {
      throw createAppError({ code: API_GENERATE_002, devMessage: "Generate stream ended without a done event", severity: "error" });
    }
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw createAppError({
        code: API_TIMEOUT_001,
        devMessage: `Generate timed out after ${timeoutMs}ms`,
        severity: "error",
        metadata: { timeoutMs },
        cause: error,
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
