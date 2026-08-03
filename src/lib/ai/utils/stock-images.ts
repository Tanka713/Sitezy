/**
 * Stock image resolution for generated sites.
 *
 * Goals:
 * 1. Images must relate to the actual business — queries are built from the
 *    business's own subject words (what it sells/does), not just the industry
 *    label. "ecommerce" finds office clichés; "insulated water bottle" finds
 *    the product.
 * 2. Relevance over randomness — Unsplash is queried via /search/photos
 *    (relevance-ordered), not /photos/random.
 * 3. Never hallucinate — when no API key is configured, a keyless
 *    keyword-matched provider (LoremFlickr) still returns a real, on-topic
 *    image URL, so the model never has a reason to invent stock URLs.
 */

const STOCK_IMAGE_CACHE = new Map<string, string>();

const QUERY_STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "our", "their",
  "into", "out", "are", "was", "were", "has", "have", "had", "will", "can",
  "all", "any", "every", "more", "most", "other", "some", "such", "than",
  "too", "very", "you", "they", "them", "its", "it's", "his", "her", "we",
  "who", "what", "when", "where", "how", "why", "of", "in", "on", "at", "to",
  "a", "an", "is", "be", "as", "by", "or", "not", "no", "so", "if", "but",
  "based", "focused", "driven", "leading", "premium", "quality", "best",
  "top", "great", "new", "offering", "offers", "providing", "provides",
  "services", "service", "business", "company", "brand", "website",
]);

/** Significant, search-friendly words from a free-text phrase. */
function significantWords(text: string, limit: number): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !QUERY_STOPWORDS.has(word))
    .slice(0, limit);
}

/**
 * Derives the concrete photographic subject of a business — the words a stock
 * search needs to find imagery of what the business actually is.
 */
export function deriveImageSubject(parts: {
  offering?: string;
  description?: string;
  industry?: string;
  /** Business/site name — its words are excluded; brand names pollute stock search. */
  excludeName?: string;
}): string {
  const nameWords = new Set(significantWords(parts.excludeName ?? "", 6));
  const fromOffering = significantWords(parts.offering ?? "", 4);
  const fromDescription = significantWords(parts.description ?? "", 4);
  const fromIndustry = significantWords(parts.industry ?? "", 2);

  const combined: string[] = [];
  for (const word of [...fromOffering, ...fromDescription, ...fromIndustry]) {
    if (nameWords.has(word)) continue;
    if (!combined.includes(word)) combined.push(word);
    if (combined.length >= 4) break;
  }
  return combined.join(" ") || (parts.industry ?? "business").toLowerCase();
}

/** Combines the business subject with a concise scene hint into one query. */
export function buildSubjectImageQuery(subject: string, sceneHint: string): string {
  const hintWords = significantWords(sceneHint, 4);
  const subjectWords = subject.split(/\s+/).filter(Boolean);
  const merged: string[] = [];
  for (const word of [...subjectWords, ...hintWords]) {
    if (!merged.includes(word)) merged.push(word);
  }
  return merged.slice(0, 7).join(" ");
}

function tinyHash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Keyless fallback: LoremFlickr serves real Flickr photos matched by tag.
 * Uses at most two keywords (comma = AND on tags — more keywords means no
 * match) and a deterministic lock so the same query renders the same image
 * while different queries get different ones.
 */
export function keylessImageUrl(query: string, width = 1280, height = 800): string {
  const keywords = significantWords(query, 2);
  const path = keywords.length ? keywords.join(",") : "business";
  const lock = tinyHash(query) % 1000;
  return `https://loremflickr.com/${width}/${height}/${encodeURIComponent(path)}?lock=${lock}`;
}

/**
 * Resolves a stock image URL for a query. Provider order: Unsplash search
 * (relevance-ranked, needs UNSPLASH_ACCESS_KEY) → Pexels search (needs
 * PEXELS_API_KEY) → keyless LoremFlickr. Always returns a URL.
 */
export async function fetchStockImage(query: string): Promise<string> {
  const key = query.toLowerCase().trim();
  const cached = STOCK_IMAGE_CACHE.get(key);
  if (cached) return cached;

  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsplashKey) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high&order_by=relevant`,
        { headers: { Authorization: `Client-ID ${unsplashKey}` } }
      );
      if (res.ok) {
        const data = await res.json();
        // Rotate within the top relevance hits so similar queries on one site
        // don't all collapse to the same photo.
        const results: Array<{ urls?: { regular?: string } }> = data?.results ?? [];
        const pick = results[tinyHash(key) % Math.max(1, Math.min(results.length, 3))];
        const url = pick?.urls?.regular ?? results[0]?.urls?.regular;
        if (url) {
          STOCK_IMAGE_CACHE.set(key, url);
          return url;
        }
      }
    } catch {
      // fall through to Pexels
    }
  }

  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
        { headers: { Authorization: pexelsKey } }
      );
      if (res.ok) {
        const data = await res.json();
        const url: string | undefined =
          data?.photos?.[0]?.src?.large2x ?? data?.photos?.[0]?.src?.large;
        if (url) {
          STOCK_IMAGE_CACHE.set(key, url);
          return url;
        }
      }
    } catch {
      // fall through to keyless
    }
  }

  const fallback = keylessImageUrl(query);
  STOCK_IMAGE_CACHE.set(key, fallback);
  return fallback;
}
