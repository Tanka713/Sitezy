"use client";

import type { UserSettings } from "@/types";
import { defaultUserSettings } from "@/lib/settings";
import {
  SettingsGroup,
  SettingsResetRow,
  SettingsStack,
  SettingsStatus,
  SettingsToggle,
} from "../ui";
import { useSettingsSectionAutosave } from "../useSettingsSectionAutosave";

const EXPERIMENTAL_ROWS = [
  {
    key: "selfLearningGenerator" as const,
    title: "Self-learning AI generator",
    badge: "New",
    body: "The AI quietly studies your design choices — style, layout, section types — and adapts future generation to match your taste. Gets smarter the more you build and publish.",
  },
  {
    key: "trainingMode" as const,
    title: "Training mode",
    badge: "Lab",
    body: "Captures richer signals from every edit — section deletes, reorders, and style changes — to accelerate the AI's learning. Only active when Self-learning generator is enabled.",
  },
  {
    key: "aiAutoEditSuggestions" as const,
    title: "AI auto-edit suggestions",
    badge: null,
    body: "Surface more aggressive style and content suggestions inside the editor when Sitezy spots opportunities.",
  },
  {
    key: "smartLayoutRegeneration" as const,
    title: "Smart layout regeneration",
    badge: null,
    body: "Allow AI regeneration actions to reshape section structure more aggressively.",
  },
  {
    key: "advancedEditor" as const,
    title: "Advanced editor (beta)",
    badge: null,
    body: "Expose deeper editor capabilities and slightly denser control surfaces when available.",
  },
  {
    key: "chatBasedEditing" as const,
    title: "Chat-based editing",
    badge: null,
    body: "Keep conversational edit flows available wherever the AI panel supports them.",
  },
] satisfies Array<{
  key: keyof UserSettings["experimental"];
  title: string;
  badge: string | null;
  body: string;
}>;

export function ExperimentalSection({
  value,
  onSave,
}: {
  value: UserSettings["experimental"];
  onSave: (patch: Partial<UserSettings>) => Promise<void>;
}) {
  const { draft, status, setDraft } = useSettingsSectionAutosave({
    sectionKey: "experimental",
    value,
    onSave,
    errorMessage: "We couldn't save the feature flags.",
  });
  const canReset = JSON.stringify(draft) !== JSON.stringify(defaultUserSettings.experimental);

  return (
    <SettingsStack>
      {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

      <SettingsGroup title="Feature flags" body="Use these to opt into in-progress Sitezy behaviors without changing the rest of the product shell.">
        <div className="space-y-3">
          {EXPERIMENTAL_ROWS.map((row) => {
            const isTrainingMode = row.key === "trainingMode";
            const trainModeDisabled = isTrainingMode && !draft.selfLearningGenerator;
            const isSelfLearning = row.key === "selfLearningGenerator";
            return (
              <div
                key={row.key}
                className={`flex items-center justify-between gap-4 rounded-[20px] border px-4 py-4 transition-colors ${
                  trainModeDisabled
                    ? "border-[var(--border-soft)] bg-[var(--surface-3)] opacity-40"
                    : isSelfLearning
                    ? draft[row.key]
                      ? "border-[rgba(107,119,255,0.35)] bg-[rgba(107,119,255,0.07)]"
                      : "border-[rgba(107,119,255,0.18)] bg-[var(--surface-3)]"
                    : "border-[var(--border-soft)] bg-[var(--surface-3)]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{row.title}</h3>
                    {row.badge ? (
                      <span className="inline-flex items-center rounded-full bg-[rgba(107,119,255,0.18)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-accent)]">
                        {row.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">{row.body}</p>
                </div>
                <SettingsToggle
                  checked={draft[row.key]}
                  onChange={(checked) => {
                    if (trainModeDisabled) return;
                    setDraft((current) => ({ ...current, [row.key]: checked }));
                  }}
                />
              </div>
            );
          })}
        </div>
      </SettingsGroup>

      <SettingsResetRow onReset={() => setDraft(defaultUserSettings.experimental)} disabled={!canReset} />
    </SettingsStack>
  );
}
