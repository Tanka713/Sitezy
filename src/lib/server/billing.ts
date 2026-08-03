import { createHmac } from "node:crypto";
import type {
  BillingAccount,
  BillingCreditGrant,
  BillingHistoryEntry,
  BillingInvoiceRecord,
  BillingInvoiceStatus,
  BillingPreferences,
  BillingSubscriptionStatus,
  BillingSummary,
} from "@/types";
import { defaultUserSettings } from "@/lib/settings";
import { readUserSettings, updateUserBillingSnapshot } from "@/lib/server/user-settings";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  API_BILLING_001,
  DB_READ_001,
  DB_READ_002,
  DB_UPDATE_001,
  DB_WRITE_001,
  STATE_INIT_001,
  VALIDATION_INPUT_001,
  createAppError,
} from "@/lib/errors";

type BillingClient = ReturnType<typeof getSupabaseServerClient>;
type BillingClientOptions = { admin?: boolean };

type BillingAccountRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_name: string;
  plan_status: BillingSubscriptionStatus;
  allowance_credits: number;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_method_label: string | null;
  created_at: string;
  updated_at: string;
};

type BillingInvoiceRow = {
  id: string;
  user_id: string;
  stripe_invoice_id: string | null;
  status: BillingInvoiceStatus;
  amount_cents: number;
  currency: string;
  invoice_url: string | null;
  hosted_invoice_url: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

type BillingCreditGrantRow = {
  id: string;
  user_id: string;
  granted_by: string | null;
  credits: number;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

function getBillingClient(options?: BillingClientOptions) {
  return options?.admin ? getSupabaseAdminClient() : getSupabaseServerClient();
}

function getStripeSecretKey() {
  const value = process.env.SITEZY_STRIPE_SECRET_KEY?.trim() ?? "";
  if (!value) {
    throw createAppError({
      code: STATE_INIT_001,
      devMessage: "Missing SITEZY_STRIPE_SECRET_KEY",
      severity: "fatal",
      metadata: { envVar: "SITEZY_STRIPE_SECRET_KEY" },
    });
  }
  return value;
}

function getStripeWebhookSecret() {
  const value = process.env.SITEZY_STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  if (!value) {
    throw createAppError({
      code: STATE_INIT_001,
      devMessage: "Missing SITEZY_STRIPE_WEBHOOK_SECRET",
      severity: "fatal",
      metadata: { envVar: "SITEZY_STRIPE_WEBHOOK_SECRET" },
    });
  }
  return value;
}

function getStripePriceId() {
  const value = process.env.SITEZY_STRIPE_PRICE_ID?.trim() ?? "";
  if (!value) {
    throw createAppError({
      code: STATE_INIT_001,
      devMessage: "Missing SITEZY_STRIPE_PRICE_ID",
      severity: "fatal",
      metadata: { envVar: "SITEZY_STRIPE_PRICE_ID" },
    });
  }
  return value;
}

function getStripeApiBaseUrl() {
  return process.env.SITEZY_STRIPE_API_BASE_URL?.trim() || "https://api.stripe.com/v1";
}

export function isStripeBillingConfigured() {
  return Boolean(
    process.env.SITEZY_STRIPE_SECRET_KEY?.trim() &&
      process.env.SITEZY_STRIPE_PRICE_ID?.trim()
  );
}

function normalizeSubscriptionStatus(value: unknown): BillingSubscriptionStatus {
  return value === "trialing" ||
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "unpaid"
    ? value
    : "inactive";
}

function normalizeInvoiceStatus(value: unknown): BillingInvoiceStatus {
  return value === "draft" ||
    value === "open" ||
    value === "paid" ||
    value === "void" ||
    value === "uncollectible"
    ? value
    : "pending";
}

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format((amountCents || 0) / 100);
}

function mapBillingAccount(row: BillingAccountRow): BillingAccount {
  return {
    userId: row.user_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePriceId: row.stripe_price_id,
    planName: row.plan_name,
    planStatus: normalizeSubscriptionStatus(row.plan_status),
    allowanceCredits: row.allowance_credits,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    paymentMethodLabel: row.payment_method_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBillingInvoice(row: BillingInvoiceRow): BillingInvoiceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    stripeInvoiceId: row.stripe_invoice_id,
    status: normalizeInvoiceStatus(row.status),
    amountCents: row.amount_cents,
    currency: row.currency,
    invoiceUrl: row.invoice_url,
    hostedInvoiceUrl: row.hosted_invoice_url,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCreditGrant(row: BillingCreditGrantRow): BillingCreditGrant {
  return {
    id: row.id,
    userId: row.user_id,
    grantedBy: row.granted_by,
    credits: row.credits,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildHistoryEntry(invoice: BillingInvoiceRecord): BillingHistoryEntry {
  return {
    id: invoice.id,
    label: invoice.status === "paid" ? "Subscription payment" : "Billing update",
    date: invoice.paidAt ?? invoice.createdAt,
    amount: formatAmount(invoice.amountCents, invoice.currency),
    status: invoice.status,
    invoiceUrl: invoice.hostedInvoiceUrl ?? invoice.invoiceUrl,
  };
}

function computeAllowanceCredits(account: BillingAccount | null, grants: BillingCreditGrant[]) {
  const manualGrantCredits = Math.max(0, grants.reduce((sum, grant) => sum + grant.credits, 0));
  const allowanceCredits = Math.max(0, account?.allowanceCredits ?? defaultUserSettings.billing.allowanceCredits);
  const tokenLimit = Math.max(1, allowanceCredits + manualGrantCredits);
  return {
    allowanceCredits,
    manualGrantCredits,
    tokenLimit,
  };
}

function getDefaultAllowanceCredits() {
  const parsed = Number(process.env.SITEZY_STRIPE_DEFAULT_ALLOWANCE_CREDITS ?? defaultUserSettings.billing.allowanceCredits);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.trunc(parsed)
    : defaultUserSettings.billing.allowanceCredits;
}

async function stripeFormRequest(
  path: string,
  params: Record<string, string | number | boolean | null | undefined>
) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    body.set(key, String(value));
  }

  const response = await fetch(`${getStripeApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createAppError({
      code: API_BILLING_001,
      devMessage: `Stripe request failed for ${path}`,
      severity: "error",
      metadata: { path, responseStatus: response.status, data },
    });
  }

  return data as Record<string, unknown>;
}

async function readBillingAccountRow(userId: string) {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("billing_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to read billing account for ${userId}`,
      severity: "error",
      metadata: { userId },
      cause: error,
    });
  }

  return (data as BillingAccountRow | null) ?? null;
}

async function listInvoiceRows(userId: string) {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("billing_invoices")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to read billing invoices for ${userId}`,
      severity: "error",
      metadata: { userId },
      cause: error,
    });
  }

  return (data ?? []) as BillingInvoiceRow[];
}

async function listGrantRows(userId: string) {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("billing_credit_grants")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to read billing credit grants for ${userId}`,
      severity: "error",
      metadata: { userId },
      cause: error,
    });
  }

  return (data ?? []) as BillingCreditGrantRow[];
}

async function upsertBillingAccountRow(userId: string, patch: Partial<BillingAccountRow>) {
  const client = getSupabaseAdminClient();
  const current = await readBillingAccountRow(userId);
  const now = new Date().toISOString();
  const next: BillingAccountRow = {
    user_id: userId,
    stripe_customer_id: patch.stripe_customer_id ?? current?.stripe_customer_id ?? null,
    stripe_subscription_id: patch.stripe_subscription_id ?? current?.stripe_subscription_id ?? null,
    stripe_price_id: patch.stripe_price_id ?? current?.stripe_price_id ?? null,
    plan_name: patch.plan_name ?? current?.plan_name ?? defaultUserSettings.billing.planName,
    plan_status: patch.plan_status ?? current?.plan_status ?? defaultUserSettings.billing.planStatus,
    allowance_credits: patch.allowance_credits ?? current?.allowance_credits ?? getDefaultAllowanceCredits(),
    current_period_start: patch.current_period_start ?? current?.current_period_start ?? null,
    current_period_end: patch.current_period_end ?? current?.current_period_end ?? null,
    cancel_at_period_end: patch.cancel_at_period_end ?? current?.cancel_at_period_end ?? false,
    payment_method_label: patch.payment_method_label ?? current?.payment_method_label ?? null,
    created_at: current?.created_at ?? now,
    updated_at: now,
  };

  const { error } = await client.from("billing_accounts").upsert(next, { onConflict: "user_id" });
  if (error) {
    throw createAppError({
      code: DB_WRITE_001,
      devMessage: `Failed to upsert billing account for ${userId}`,
      severity: "error",
      metadata: { userId },
      cause: error,
    });
  }

  return mapBillingAccount(next);
}

export async function syncUserBillingProjection(userId: string) {
  const [settings, accountRow, invoiceRows, grantRows] = await Promise.all([
    readUserSettings(userId, { admin: true }),
    readBillingAccountRow(userId),
    listInvoiceRows(userId),
    listGrantRows(userId),
  ]);

  const account = accountRow ? mapBillingAccount(accountRow) : null;
  const invoices = invoiceRows.map(mapBillingInvoice);
  const grants = grantRows.map(mapCreditGrant);
  const { allowanceCredits, manualGrantCredits, tokenLimit } = computeAllowanceCredits(account, grants);
  const nextSnapshot: BillingPreferences = {
    planName: account?.planName ?? settings.billing.planName,
    planId: account?.stripePriceId ?? settings.billing.planId,
    planStatus: account?.planStatus ?? settings.billing.planStatus,
    tokenUsage: settings.billing.tokenUsage,
    tokenLimit,
    allowanceCredits,
    manualGrantCredits,
    remainingCredits: Math.max(0, tokenLimit - settings.billing.tokenUsage),
    paymentMethodLabel: account?.paymentMethodLabel ?? settings.billing.paymentMethodLabel,
    customerId: account?.stripeCustomerId ?? settings.billing.customerId,
    subscriptionId: account?.stripeSubscriptionId ?? settings.billing.subscriptionId,
    periodStart: account?.currentPeriodStart ?? settings.billing.periodStart,
    periodEnd: account?.currentPeriodEnd ?? settings.billing.periodEnd,
    checkoutEnabled: isStripeBillingConfigured(),
    portalEnabled: Boolean(isStripeBillingConfigured() && account?.stripeCustomerId),
    billingHistory: invoices.map(buildHistoryEntry),
  };

  await updateUserBillingSnapshot(userId, nextSnapshot, { admin: true });
  return {
    account,
    invoices,
    manualGrants: grants,
    snapshot: nextSnapshot,
  } satisfies BillingSummary;
}

export async function readBillingSummary(userId: string) {
  return syncUserBillingProjection(userId);
}

async function ensureStripeCustomerId(userId: string, email: string) {
  const current = await readBillingAccountRow(userId);
  if (current?.stripe_customer_id) return current.stripe_customer_id;

  const customer = await stripeFormRequest("/customers", {
    email,
    "metadata[user_id]": userId,
  });

  const customerId = String(customer.id ?? "").trim();
  if (!customerId) {
    throw createAppError({
      code: API_BILLING_001,
      devMessage: `Stripe customer creation returned no id for ${userId}`,
      severity: "error",
      metadata: { userId, email },
    });
  }

  await upsertBillingAccountRow(userId, {
    stripe_customer_id: customerId,
  });

  return customerId;
}

function resolveCheckoutSuccessUrl(origin?: string | null) {
  return `${String(origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "")}/settings?section=billing&checkout=success`;
}

function resolveCheckoutCancelUrl(origin?: string | null) {
  return `${String(origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "")}/settings?section=billing&checkout=cancelled`;
}

export async function createBillingCheckoutSession(input: {
  userId: string;
  email: string;
  origin?: string | null;
}) {
  if (!isStripeBillingConfigured()) {
    throw createAppError({
      code: API_BILLING_001,
      devMessage: `Checkout requested without Stripe configuration for ${input.userId}`,
      severity: "warn",
      metadata: { userId: input.userId },
    });
  }

  const customerId = await ensureStripeCustomerId(input.userId, input.email);
  const session = await stripeFormRequest("/checkout/sessions", {
    mode: "subscription",
    customer: customerId,
    success_url: resolveCheckoutSuccessUrl(input.origin),
    cancel_url: resolveCheckoutCancelUrl(input.origin),
    "line_items[0][price]": getStripePriceId(),
    "line_items[0][quantity]": 1,
    allow_promotion_codes: true,
    client_reference_id: input.userId,
    "metadata[user_id]": input.userId,
    "subscription_data[metadata][user_id]": input.userId,
  });

  const url = String(session.url ?? "").trim();
  if (!url) {
    throw createAppError({
      code: API_BILLING_001,
      devMessage: `Stripe checkout session did not return a URL for ${input.userId}`,
      severity: "error",
      metadata: { userId: input.userId, session },
    });
  }

  return url;
}

export async function createBillingPortalSession(input: {
  userId: string;
  returnUrl?: string | null;
}) {
  if (!isStripeBillingConfigured()) {
    throw createAppError({
      code: API_BILLING_001,
      devMessage: `Portal requested without Stripe configuration for ${input.userId}`,
      severity: "warn",
      metadata: { userId: input.userId },
    });
  }

  const account = await readBillingAccountRow(input.userId);
  if (!account?.stripe_customer_id) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Billing portal requested without a Stripe customer for ${input.userId}`,
      severity: "warn",
      metadata: { userId: input.userId },
    });
  }

  const session = await stripeFormRequest("/billing_portal/sessions", {
    customer: account.stripe_customer_id,
    return_url: String(input.returnUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "") + "/settings?section=billing",
  });

  const url = String(session.url ?? "").trim();
  if (!url) {
    throw createAppError({
      code: API_BILLING_001,
      devMessage: `Stripe portal session did not return a URL for ${input.userId}`,
      severity: "error",
      metadata: { userId: input.userId, session },
    });
  }

  return url;
}

function parsePeriodTimestamp(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return new Date(numberValue * 1000).toISOString();
}

function readStripeAllowanceCredits(subscription: Record<string, unknown>) {
  const metadataValue = Number(
    (subscription.metadata as Record<string, unknown> | undefined)?.sitezy_allowance_credits ??
      (((subscription.items as { data?: Array<Record<string, unknown>> } | undefined)?.data?.[0]?.price as Record<string, unknown> | undefined)?.metadata as Record<string, unknown> | undefined)?.sitezy_allowance_credits ??
      getDefaultAllowanceCredits()
  );
  return Number.isFinite(metadataValue) && metadataValue > 0 ? Math.trunc(metadataValue) : getDefaultAllowanceCredits();
}

function readSubscriptionPriceId(subscription: Record<string, unknown>) {
  const priceId = ((subscription.items as { data?: Array<Record<string, unknown>> } | undefined)?.data?.[0]?.price as Record<string, unknown> | undefined)?.id;
  return typeof priceId === "string" && priceId.trim() ? priceId.trim() : null;
}

function readSubscriptionPlanName(subscription: Record<string, unknown>) {
  const price = ((subscription.items as { data?: Array<Record<string, unknown>> } | undefined)?.data?.[0]?.price as Record<string, unknown> | undefined) ?? {};
  const nickname = typeof price.nickname === "string" && price.nickname.trim() ? price.nickname.trim() : null;
  const lookupKey = typeof price.lookup_key === "string" && price.lookup_key.trim() ? price.lookup_key.trim() : null;
  return nickname ?? lookupKey ?? "Sitezy Pro";
}

async function upsertBillingInvoiceFromStripe(userId: string, invoice: Record<string, unknown>) {
  const client = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const row: BillingInvoiceRow = {
    id: String(invoice.id ?? crypto.randomUUID()),
    user_id: userId,
    stripe_invoice_id: typeof invoice.id === "string" ? invoice.id : null,
    status: normalizeInvoiceStatus(invoice.status),
    amount_cents: Number(invoice.amount_paid ?? invoice.amount_due ?? 0) || 0,
    currency: String(invoice.currency ?? "usd"),
    invoice_url: typeof invoice.invoice_pdf === "string" ? invoice.invoice_pdf : null,
    hosted_invoice_url: typeof invoice.hosted_invoice_url === "string" ? invoice.hosted_invoice_url : null,
    period_start: parsePeriodTimestamp((invoice.period_start as number | undefined) ?? ((invoice.lines as { data?: Array<Record<string, unknown>> } | undefined)?.data?.[0]?.period as Record<string, unknown> | undefined)?.start),
    period_end: parsePeriodTimestamp((invoice.period_end as number | undefined) ?? ((invoice.lines as { data?: Array<Record<string, unknown>> } | undefined)?.data?.[0]?.period as Record<string, unknown> | undefined)?.end),
    paid_at: parsePeriodTimestamp((invoice.status_transitions as Record<string, unknown> | undefined)?.paid_at),
    created_at: parsePeriodTimestamp(invoice.created) ?? now,
    updated_at: now,
  };

  const { error } = await client.from("billing_invoices").upsert(row, { onConflict: "id" });
  if (error) {
    throw createAppError({
      code: DB_WRITE_001,
      devMessage: `Failed to upsert billing invoice ${row.id}`,
      severity: "error",
      metadata: { userId, invoiceId: row.id },
      cause: error,
    });
  }
}

async function upsertBillingAccountFromSubscription(userId: string, subscription: Record<string, unknown>) {
  await upsertBillingAccountRow(userId, {
    stripe_subscription_id: typeof subscription.id === "string" ? subscription.id : null,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
    stripe_price_id: readSubscriptionPriceId(subscription),
    plan_name: readSubscriptionPlanName(subscription),
    plan_status: normalizeSubscriptionStatus(subscription.status),
    allowance_credits: readStripeAllowanceCredits(subscription),
    current_period_start: parsePeriodTimestamp(subscription.current_period_start),
    current_period_end: parsePeriodTimestamp(subscription.current_period_end),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
  });
}

async function resolveUserIdForStripeCustomer(customerId: string) {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("billing_accounts")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw createAppError({
      code: DB_READ_001,
      devMessage: `Failed to resolve user by Stripe customer ${customerId}`,
      severity: "error",
      metadata: { customerId },
      cause: error,
    });
  }

  return data ? String((data as { user_id: string }).user_id) : null;
}

function parseStripeSignatureHeader(value: string) {
  const parts = value.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2) ?? "";
  const signature = parts.find((part) => part.startsWith("v1="))?.slice(3) ?? "";
  return { timestamp, signature };
}

export function verifyStripeWebhook(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader) return false;
  const { timestamp, signature } = parseStripeSignatureHeader(signatureHeader);
  if (!timestamp || !signature) return false;
  const expected = createHmac("sha256", getStripeWebhookSecret())
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return expected === signature;
}

export async function handleStripeWebhook(rawBody: string, signatureHeader: string | null) {
  if (!verifyStripeWebhook(rawBody, signatureHeader)) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: "Stripe webhook signature verification failed",
      severity: "warn",
    });
  }

  const event = JSON.parse(rawBody) as {
    type?: string;
    data?: { object?: Record<string, unknown> };
  };
  const eventType = String(event.type ?? "");
  const object = (event.data?.object ?? {}) as Record<string, unknown>;
  let userId =
    typeof object.client_reference_id === "string" && object.client_reference_id.trim()
      ? object.client_reference_id.trim()
      : typeof (object.metadata as Record<string, unknown> | undefined)?.user_id === "string"
      ? String((object.metadata as Record<string, unknown>).user_id).trim()
      : null;

  if (!userId && typeof object.customer === "string") {
    userId = await resolveUserIdForStripeCustomer(object.customer);
  }

  if (!userId) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Stripe webhook ${eventType} could not resolve a user`,
      severity: "warn",
      metadata: { eventType, object },
    });
  }

  if (eventType === "checkout.session.completed") {
    await upsertBillingAccountRow(userId, {
      stripe_customer_id: typeof object.customer === "string" ? object.customer : null,
      stripe_subscription_id: typeof object.subscription === "string" ? object.subscription : null,
      plan_status: "active",
    });
  }

  if (eventType.startsWith("customer.subscription.")) {
    await upsertBillingAccountFromSubscription(userId, object);
  }

  if (eventType.startsWith("invoice.")) {
    await upsertBillingInvoiceFromStripe(userId, object);
  }

  return syncUserBillingProjection(userId);
}

export async function grantBillingCredits(input: {
  userId: string;
  credits: number;
  grantedBy?: string | null;
  reason?: string | null;
}) {
  const credits = Math.trunc(input.credits);
  if (!Number.isFinite(credits)) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: `Invalid billing credit grant ${input.credits} for ${input.userId}`,
      severity: "warn",
      metadata: { userId: input.userId, credits: input.credits },
    });
  }

  const client = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await client.from("billing_credit_grants").insert({
    id: crypto.randomUUID(),
    user_id: input.userId,
    granted_by: input.grantedBy ?? null,
    credits,
    reason: input.reason ?? null,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw createAppError({
      code: DB_WRITE_001,
      devMessage: `Failed to create billing credit grant for ${input.userId}`,
      severity: "error",
      metadata: { userId: input.userId, credits },
      cause: error,
    });
  }

  return syncUserBillingProjection(input.userId);
}

export async function setBillingManualCreditTotal(input: {
  userId: string;
  totalCredits: number;
  grantedBy?: string | null;
  reason?: string | null;
}) {
  const totalCredits = Math.max(0, Math.trunc(input.totalCredits));
  const summary = await readBillingSummary(input.userId);
  const currentTotal = Math.max(0, summary.manualGrants.reduce((sum, grant) => sum + grant.credits, 0));
  const delta = totalCredits - currentTotal;
  if (delta === 0) {
    return syncUserBillingProjection(input.userId);
  }
  return grantBillingCredits({
    userId: input.userId,
    credits: delta,
    grantedBy: input.grantedBy,
    reason: input.reason,
  });
}
