import { API_RATE_LIMIT_001, createAppError } from "@/lib/errors";
import { readUserSettings, upsertUserSettings } from "@/lib/server/user-settings";
import { getSupportEmail } from "@/lib/server/launch";

export type AIUsageAction =
  | "blueprint"
  | "generate-page"
  | "add-page"
  | "regenerate-section"
  | "insert-block"
  | "assist"
  | "intelligence";

const ACTION_COSTS: Record<AIUsageAction, number> = {
  blueprint: 20,
  "generate-page": 80,
  "add-page": 45,
  "regenerate-section": 24,
  "insert-block": 16,
  assist: 8,
  intelligence: 6,
};

export async function consumeAIUsageCredits(
  userId: string,
  action: AIUsageAction,
  options?: { admin?: boolean }
) {
  const current = await readUserSettings(userId, options);
  const cost = ACTION_COSTS[action];
  const nextUsage = current.billing.tokenUsage + cost;

  if (nextUsage > current.billing.tokenLimit) {
    throw createAppError({
      code: API_RATE_LIMIT_001,
      devMessage: `AI usage limit reached for user ${userId} on action ${action}`,
      userMessage: `This beta account has reached its AI usage allowance. Contact ${getSupportEmail()} if you need more room.`,
      severity: "warn",
      metadata: {
        userId,
        action,
        cost,
        tokenUsage: current.billing.tokenUsage,
        tokenLimit: current.billing.tokenLimit,
      },
    });
  }

  const next = await upsertUserSettings(userId, {
    billing: {
      ...current.billing,
      tokenUsage: nextUsage,
    },
  }, options);

  return {
    cost,
    usage: next.billing.tokenUsage,
    limit: next.billing.tokenLimit,
    remaining: Math.max(0, next.billing.tokenLimit - next.billing.tokenUsage),
  };
}
