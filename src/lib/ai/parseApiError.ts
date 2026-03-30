/** Parse an Anthropic SDK error and return structured info for the client. */
export function parseApiError(err: unknown): {
  message: string;
  requestId: string | null;
  code: string;
  status: number;
} {
  const raw = err instanceof Error ? err.message : String(err);

  // Anthropic SDK throws errors whose message is a JSON string like:
  // 400 {"type":"error","error":{...},"request_id":"req_..."}
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        type?: string;
        error?: { type?: string; message?: string };
        request_id?: string;
      };
      const errorType = parsed.error?.type ?? "api_error";
      const errorMsg  = parsed.error?.message ?? raw;
      const requestId = parsed.request_id ?? null;

      let code = "API_UNKNOWN_001";
      if (errorType === "invalid_request_error" && errorMsg.toLowerCase().includes("credit")) {
        code = "API_BILLING_001";
      } else if (errorType === "authentication_error") {
        code = "API_AUTH_001";
      } else if (errorType === "rate_limit_error") {
        code = "API_RATE_LIMIT_001";
      } else if (errorType === "overloaded_error") {
        code = "API_UNKNOWN_001";
      } else if (errorType === "api_error") {
        code = "API_GENERATE_001";
      }

      const statusMatch = raw.match(/^(\d{3})\s/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 500;

      return { message: errorMsg, requestId, code, status };
    } catch {}
  }

  return { message: raw, requestId: null, code: "API_UNKNOWN_001", status: 500 };
}
