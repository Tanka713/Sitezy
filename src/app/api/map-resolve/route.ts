import { NextRequest } from "next/server";
import {
  API_REQUEST_002,
  API_RESPONSE_001,
  API_UNKNOWN_001,
  assertFields,
  createAppError,
  handleRouteError,
  parseRequestBody,
} from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 20;

function looksLikeMapUrl(value: string): boolean {
  return /google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(value);
}

function isShortGoogleMapUrl(value: string): boolean {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(value);
}

function extractMapQuery(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const query = url.searchParams.get("q")
      || url.searchParams.get("query")
      || url.searchParams.get("destination")
      || url.searchParams.get("near");
    if (query) return query;

    const coordinateQuery = url.searchParams.get("ll") || url.searchParams.get("center");
    if (coordinateQuery) return coordinateQuery;

    const decodedPath = decodeURIComponent(url.pathname);
    const placeMatch = decodedPath.match(/\/place\/([^/]+)/i);
    if (placeMatch?.[1]) {
      return placeMatch[1].replace(/\+/g, " ").trim();
    }

    const atMatch = `${decodedPath}${url.search}${url.hash}`.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch?.[1] && atMatch?.[2]) {
      return `${atMatch[1]},${atMatch[2]}`;
    }

    const bangMatch = `${decodedPath}${url.search}${url.hash}`.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (bangMatch?.[1] && bangMatch?.[2]) {
      return `${bangMatch[1]},${bangMatch[2]}`;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeMapEmbedUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`;
  }

  try {
    const url = new URL(trimmed);
    if (/google\.[^/]+$/i.test(url.hostname) && /\/maps\/embed/i.test(url.pathname)) {
      return trimmed;
    }
    if (/google\.[^/]+$/i.test(url.hostname) && url.searchParams.get("output") === "embed") {
      return trimmed;
    }
  } catch {
    return trimmed;
  }

  const query = extractMapQuery(trimmed);
  if (query) {
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  }

  return trimmed;
}

function extractCanonicalMapUrl(html: string): string | null {
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /"canonicalUrl":"([^"]+)"/i,
    /"https:\\\/\\\/www\.google\.[^"]+\\\/maps[^"]+"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const raw = match?.[1] ?? match?.[0] ?? null;
    if (!raw) continue;
    const normalized = raw
      .replace(/^"|"$/g, "")
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/");
    if (looksLikeMapUrl(normalized)) return normalized;
  }

  return null;
}

async function resolveMapEmbedUrl(raw: string): Promise<string> {
  const local = normalizeMapEmbedUrl(raw);
  if (!isShortGoogleMapUrl(raw) || local !== raw) {
    return local;
  }

  const response = await fetch(raw, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent": "Mozilla/5.0 (compatible; SitezyMapResolver/1.0)",
    },
  });

  const finalUrl = response.url || raw;
  const normalizedFinalUrl = normalizeMapEmbedUrl(finalUrl);
  if (normalizedFinalUrl !== finalUrl || /output=embed/i.test(normalizedFinalUrl)) {
    return normalizedFinalUrl;
  }

  const html = await response.text().catch(() => "");
  const canonical = html ? extractCanonicalMapUrl(html) : null;
  if (canonical) {
    const normalizedCanonical = normalizeMapEmbedUrl(canonical);
    if (normalizedCanonical) return normalizedCanonical;
  }

  throw createAppError({
    code: API_RESPONSE_001,
    devMessage: `Could not resolve Google Maps share link: ${raw}`,
    severity: "warn",
    metadata: { raw, finalUrl },
  });
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? null;

  try {
    const body = await parseRequestBody<{ url?: string }>(req);
    assertFields(body as Record<string, unknown>, ["url"], API_REQUEST_002);

    const raw = body.url?.trim() ?? "";
    if (!raw) {
      throw createAppError({
        code: API_REQUEST_002,
        devMessage: "Missing map url",
        severity: "warn",
      });
    }

    const embedUrl = await resolveMapEmbedUrl(raw);

    return Response.json({ embedUrl });
  } catch (err) {
    return handleRouteError(err, requestId, API_UNKNOWN_001);
  }
}
