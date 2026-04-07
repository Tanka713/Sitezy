"use client";

import { CreditCard, Sparkles } from "lucide-react";
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
  const usagePercent = Math.min(100, Math.round((value.tokenUsage / Math.max(1, value.tokenLimit)) * 100));

  return (
    <SettingsStack>
      <SettingsGroup title="Current plan" body="Plan and usage are presented here so the rest of the studio can stay focused on editing.">
        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-faint)]">Plan</p>
            <h3 className="mt-3 text-[26px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{value.planName}</h3>
            <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
              During the private beta, this space tracks your AI usage allowance and leaves upgrades as a manual support flow.
            </p>
            <SettingsActionRow className="mt-5">
              <SettingsPrimaryAction type="button" onClick={() => window.location.assign("/support?topic=billing")}>
                <Sparkles size={14} />
                Request more credits
              </SettingsPrimaryAction>
            </SettingsActionRow>
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

      <SettingsGroup title="Payment method" body="Billing method controls will plug in here once payment collection is connected.">
        {value.paymentMethodLabel ? (
          <div className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-4)]">
                <CreditCard size={16} className="text-[var(--fg-soft)]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">{value.paymentMethodLabel}</p>
                <p className="text-[13px] text-[var(--text-secondary)]">Stored for future billing support.</p>
              </div>
            </div>
            <SettingsSecondaryAction type="button" disabled>
              Update later
            </SettingsSecondaryAction>
          </div>
        ) : (
          <SettingsPlaceholder
            title="Payment method placeholder"
            body="No live billing method is connected yet. This space is ready for future Stripe or invoice-backed billing support."
          />
        )}
      </SettingsGroup>

      <SettingsGroup title="Billing history" body="Recent invoices and credit changes will appear here once billing is live.">
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
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">{entry.amount}</p>
                  <p className="mt-1 text-[12px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">{entry.status}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SettingsPlaceholder
            title="Billing history placeholder"
            body="Invoices, receipts, and usage changes will populate here once billing automation is connected."
          />
        )}
      </SettingsGroup>
    </SettingsStack>
  );
}
