/** Approximate char-level diff between two strings. Fast for HTML comparison. */
export function charEditDistance(a: string, b: string): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  // For large strings use a cheaper approximation: length diff + changed chars sample
  if (la > 5000 || lb > 5000) {
    return Math.abs(la - lb) + approximateDiff(a, b);
  }
  // Standard DP Levenshtein on chars
  const prev = new Uint32Array(lb + 1);
  const curr = new Uint32Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev.set(curr);
  }
  return prev[lb];
}

function approximateDiff(a: string, b: string): number {
  const sampleSize = 500;
  const aChunk = a.slice(0, sampleSize);
  const bChunk = b.slice(0, sampleSize);
  let diff = 0;
  const len = Math.min(aChunk.length, bChunk.length);
  for (let i = 0; i < len; i++) {
    if (aChunk[i] !== bChunk[i]) diff++;
  }
  const scale = Math.max(a.length, b.length) / sampleSize;
  return Math.round(diff * scale);
}

/** Strip HTML tags and normalise whitespace for content-only comparison. */
export function stripHtmlForDiff(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Edit distance on content only (ignoring markup changes). */
export function contentEditDistance(originalHtml: string, modifiedHtml: string): number {
  return charEditDistance(stripHtmlForDiff(originalHtml), stripHtmlForDiff(modifiedHtml));
}
