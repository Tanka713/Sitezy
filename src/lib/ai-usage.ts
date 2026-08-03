export type AIUsageAction =
  | "blueprint"
  | "generate-page"
  | "add-page"
  | "regenerate-section"
  | "insert-block"
  | "assist"
  | "intelligence";

export const AI_USAGE_COSTS: Record<AIUsageAction, number> = {
  blueprint: 8,
  "generate-page": 35,
  "add-page": 45,
  "regenerate-section": 24,
  "insert-block": 16,
  assist: 8,
  intelligence: 6,
};

export function getAIUsageCost(action: AIUsageAction): number {
  return AI_USAGE_COSTS[action];
}

export function estimateFullSiteGenerationCredits(pageCount: number): number {
  const safePageCount = Number.isFinite(pageCount) ? Math.max(0, Math.trunc(pageCount)) : 0;
  return getAIUsageCost("blueprint") + (safePageCount * getAIUsageCost("generate-page"));
}

export function getRemainingCredits(tokenUsage: number, tokenLimit: number): number {
  return Math.max(0, Math.max(0, tokenLimit) - Math.max(0, tokenUsage));
}

export function formatCreditAmount(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : 0;
  return `${safeAmount.toLocaleString("en-US")} credit${safeAmount === 1 ? "" : "s"}`;
}
