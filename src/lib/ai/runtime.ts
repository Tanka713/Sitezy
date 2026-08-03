import Anthropic from "@anthropic-ai/sdk";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages";
import { API_AUTH_001, API_GENERATE_002, createAppError } from "@/lib/errors";

const DEFAULT_JSON_RETRIES = 3;
const DEFAULT_JSON_TOKENS = 6_000;
const DEFAULT_STREAM_TOKENS = 16_000;
type AIProvider = "anthropic" | "deepseek";
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type DeepSeekChatResponse = {
  choices?: Array<{ message?: { content?: string | null }; delta?: { content?: string | null } }>;
  error?: { message?: string; type?: string; code?: string };
};

function readPositiveIntEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

function clampMaxTokens(requested: number, capEnv: string): number {
  return Math.min(requested, readPositiveIntEnv(capEnv, requested));
}

function getProvider(): AIProvider {
  return process.env.SITEZY_AI_PROVIDER === "deepseek" ? "deepseek" : "anthropic";
}

function getDeepSeekBaseUrl(): string {
  return (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
}

export function getClient(): Anthropic {
  const key = process.env.SITEZY_SPARK_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw createAppError({
      code: API_AUTH_001,
      devMessage: "Anthropic client initialization failed: missing SITEZY_SPARK_KEY / ANTHROPIC_API_KEY",
      severity: "fatal",
    });
  }

  // maxRetries lets the SDK auto-retry 429 (rate limit) and 5xx/overloaded
  // errors with exponential backoff, honoring retry-after — so a full-site
  // generation rides through per-minute token limits instead of failing.
  return new Anthropic({ apiKey: key, maxRetries: 5 });
}

export function getModel(): string {
  if (getProvider() === "deepseek") {
    return process.env.DEEPSEEK_MODEL || "deepseek-chat";
  }

  return (
    process.env.SITEZY_SPARK_MODEL ||
    process.env.ANTHROPIC_MODEL ||
    "claude-sonnet-4-6"
  );
}

function getDeepSeekKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw createAppError({
      code: API_AUTH_001,
      devMessage: "DeepSeek client initialization failed: missing DEEPSEEK_API_KEY",
      severity: "fatal",
      metadata: { provider: "deepseek" },
    });
  }
  return key;
}

export function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export async function streamCompletion(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string, full: string) => void,
  maxTokens = DEFAULT_STREAM_TOKENS
): Promise<string> {
  if (getProvider() === "deepseek") {
    return streamDeepSeekCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      onChunk,
      clampMaxTokens(maxTokens, "SITEZY_STREAM_MAX_TOKENS")
    );
  }

  const client = getClient();
  let full = "";

  const stream = await client.messages.create({
    model: getModel(),
    max_tokens: clampMaxTokens(maxTokens, "SITEZY_STREAM_MAX_TOKENS"),
    stream: true,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      full += event.delta.text;
      onChunk(event.delta.text, full);
    }
  }

  return full;
}

export async function streamCompletionMultiTurn(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  onChunk: (chunk: string, full: string) => void,
  maxTokens = DEFAULT_STREAM_TOKENS
): Promise<string> {
  if (getProvider() === "deepseek") {
    return streamDeepSeekCompletion(
      [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      onChunk,
      clampMaxTokens(maxTokens, "SITEZY_STREAM_MAX_TOKENS")
    );
  }

  const client = getClient();
  let full = "";

  const stream = await client.messages.create({
    model: getModel(),
    max_tokens: clampMaxTokens(maxTokens, "SITEZY_STREAM_MAX_TOKENS"),
    stream: true,
    system: systemPrompt,
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      full += event.delta.text;
      onChunk(event.delta.text, full);
    }
  }

  return full;
}

export async function jsonCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  maxRetries = DEFAULT_JSON_RETRIES,
  maxTokens = DEFAULT_JSON_TOKENS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2 ** (attempt - 1) * 400));
    }

    const raw =
      getProvider() === "deepseek"
        ? await deepSeekCompletion(
            [
              { role: "system", content: `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON. No markdown fences, no explanation.` },
              { role: "user", content: userPrompt },
            ],
            clampMaxTokens(maxTokens, "SITEZY_JSON_MAX_TOKENS")
          )
        : extractText(
            (
              await getClient().messages.create({
                model: getModel(),
                max_tokens: clampMaxTokens(maxTokens, "SITEZY_JSON_MAX_TOKENS"),
                system: `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid JSON. No markdown fences, no explanation.`,
                messages: [{ role: "user", content: userPrompt }],
              })
            ).content
          );

    try {
      const cleaned = raw
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```\s*$/m, "")
        .trim();
      return JSON.parse(cleaned) as T;
    } catch (error) {
      lastError = error as Error;
      const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!match) continue;

      try {
        return JSON.parse(match[0]) as T;
      } catch (matchError) {
        lastError = matchError as Error;
      }
    }
  }

  throw createAppError({
    code: API_GENERATE_002,
    devMessage: `JSON generation failed after ${maxRetries + 1} attempts: ${lastError?.message ?? "unknown parse error"}`,
    severity: "error",
    cause: lastError ?? undefined,
  });
}

async function deepSeekCompletion(messages: ChatMessage[], maxTokens: number): Promise<string> {
  const response = await fetch(`${getDeepSeekBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getDeepSeekKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      max_tokens: maxTokens,
      stream: false,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as DeepSeekChatResponse;

  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(payload)}`);
  }

  return payload.choices?.[0]?.message?.content ?? "";
}

async function streamDeepSeekCompletion(
  messages: ChatMessage[],
  onChunk: (chunk: string, full: string) => void,
  maxTokens: number
): Promise<string> {
  const response = await fetch(`${getDeepSeekBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getDeepSeekKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const payload = await response.text().catch(() => "");
    throw new Error(`${response.status} ${payload}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      const payload = JSON.parse(data) as DeepSeekChatResponse;
      const chunk = payload.choices?.[0]?.delta?.content ?? "";
      if (!chunk) continue;
      full += chunk;
      onChunk(chunk, full);
    }
  }

  return full;
}
