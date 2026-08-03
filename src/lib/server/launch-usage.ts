import { API_BILLING_001, createAppError } from "@/lib/errors";
import { getAIUsageCost, getRemainingCredits, type AIUsageAction } from "@/lib/ai-usage";
import { readUserSettings, upsertUserSettings } from "@/lib/server/user-settings";
import { getSupportEmail } from "@/lib/server/launch";

export async function consumeAIUsageCredits(
  userId: string,
  action: AIUsageAction,
  options?: { admin?: boolean }
) {
  const current = await readUserSettings(userId, options);
  const cost = getAIUsageCost(action);
  const nextUsage = current.billing.tokenUsage + cost;

  if (nextUsage > current.billing.tokenLimit) {
    throw createAppError({
      code: API_BILLING_001,
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
    remaining: getRemainingCredits(next.billing.tokenUsage, next.billing.tokenLimit),
  };
}
