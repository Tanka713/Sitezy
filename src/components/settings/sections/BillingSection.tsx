"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Sparkles } from "lucide-react";
import { buildSupportHref } from "@/lib/app-navigation";
import type { UserSettings } from "@/types";
import {
  SettingsActionRow,
  SettingsGroup,
  SettingsPlaceholder,
  SettingsPrimaryAction,
  SettingsSecondaryAction,
  SettingsStack,
} from "../ui";

export function BillingSection({
  value,
}: {
  value: UserSettings["billing"];
}) {
  const router = useRouter();
  const billingSupportHref = buildSupportHref("billing");
  const usagePercent = Math.min(100, Math.round((value.tokenUsage / Math.max(1, value.tokenLimit)) * 100));
  const [busyAction, setBusyAction] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const planStatusLabel = useMemo(
    () => value.planStatus.replace(/_/g, " "),
    [value.planStatus]
  );

  useEffect(() => {
    router.prefetch(billingSupportHref);
  }, [billingSupportHref, router]);

  async function openBillingFlow(kind: "checkout" | "portal") {
    setBusyAction(kind);
    setError(null);
    try {
      const response = await fetch(kind === "checkout" ? "/api/billing/checkout" : "/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") {
        throw new Error(typeof data.error === "string" ? data.error : "We couldn't open billing right now.");
      }
      window.location.assign(data.url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We couldn't open billing right now.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <SettingsStack>
      <SettingsGroup title="Current plan" body="Plan and usage are presented here so the rest of the studio can stay focused on editing.">
        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Plan</p>
            <h3 className="mt-3 text-[26px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{value.planName}</h3>
            <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
              Subscription status: <span className="capitalize text-[var(--text-primary)]">{planStatusLabel}</span>
              {value.periodEnd ? ` • renews ${new Date(value.periodEnd).toLocaleDateString()}` : ""}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
              Plan allowance {value.allowanceCredits} credits, manual grants {value.manualGrantCredits}, remaining {value.remainingCredits}.
            </p>
            <SettingsActionRow className="mt-5">
              {value.portalEnabled ? (
                <SettingsPrimaryAction type="button" onClick={() => openBillingFlow("portal")} disabled={busyAction !== null}>
                  <CreditCard size={14} />
                  {busyAction === "portal" ? "Opening billing..." : "Manage billing"}
                </SettingsPrimaryAction>
              ) : value.checkoutEnabled ? (
                <SettingsPrimaryAction type="button" onClick={() => openBillingFlow("checkout")} disabled={busyAction !== null}>
                  <Sparkles size={14} />
                  {busyAction === "checkout" ? "Preparing checkout..." : "Start subscription"}
                </SettingsPrimaryAction>
              ) : (
                <SettingsPrimaryAction type="button" onClick={() => router.push(billingSupportHref)}>
                  <Sparkles size={14} />
                  Request more credits
                </SettingsPrimaryAction>
              )}
              <SettingsSecondaryAction type="button" onClick={() => router.push(billingSupportHref)}>
                Contact support
              </SettingsSecondaryAction>
            </SettingsActionRow>
            {error ? (
              <p className="mt-3 text-[12px] text-[#f59e0b]">{error}</p>
            ) : null}
          </div>

          <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Usage</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{value.tokenUsage}</p>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">of {value.tokenLimit} beta credits used</p>
              </div>
              <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-4)] px-3 py-1.5 text-[12px] font-medium text-[var(--fg-soft)]">
                {usagePercent}%
              </span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-[var(--border-soft)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#6b77ff_0%,#8790ff_100%)]"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Payment method" body="Billing method syncs from the live subscription account when Stripe is connected.">
        {value.paymentMethodLabel ? (
          <div className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-4)]">
                <CreditCard size={16} className="text-[var(--fg-soft)]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">{value.paymentMethodLabel}</p>
                <p className="text-[13px] text-[var(--text-secondary)]">Synced from your active billing account.</p>
              </div>
            </div>
            <SettingsSecondaryAction
              type="button"
              onClick={() => openBillingFlow(value.portalEnabled ? "portal" : "checkout")}
              disabled={busyAction !== null}
            >
              {value.portalEnabled ? "Manage" : "Set up"}
            </SettingsSecondaryAction>
          </div>
        ) : (
          <SettingsPlaceholder
            title="No payment method on file"
            body={value.checkoutEnabled ? "Start a subscription to add a live payment method and billing history." : "Billing checkout is not configured in this environment yet."}
          />
        )}
      </SettingsGroup>

      <SettingsGroup title="Billing history" body="Recent invoices and credit changes are projected from the billing account snapshot.">
        {value.billingHistory.length ? (
          <div className="space-y-3">
            {value.billingHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4"
                >
                <div>
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">{entry.label}</p>
                  <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{entry.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {entry.invoiceUrl ? <a href={entry.invoiceUrl} target="_blank" rel="noreferrer">{entry.amount}</a> : entry.amount}
                  </p>
                  <p className="mt-1 text-[12px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">{entry.status.replace(/_/g, " ")}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SettingsPlaceholder
            title="Billing history pending"
            body="Invoices, receipts, and usage changes will populate here after the first live billing cycle."
          />
        )}
      </SettingsGroup>
    </SettingsStack>
  );
}
