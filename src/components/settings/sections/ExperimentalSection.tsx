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
    key: "aiAutoEditSuggestions" as const,
    title: "AI auto-edit suggestions",
    body: "Surface more aggressive style and content suggestions inside the editor when Sitezy spots opportunities.",
  },
  {
    key: "smartLayoutRegeneration" as const,
    title: "Smart layout regeneration",
    body: "Allow AI regeneration actions to reshape section structure more aggressively.",
  },
  {
    key: "advancedEditor" as const,
    title: "Advanced editor (beta)",
    body: "Expose deeper editor capabilities and slightly denser control surfaces when available.",
  },
  {
    key: "chatBasedEditing" as const,
    title: "Chat-based editing",
    body: "Keep conversational edit flows available wherever the AI panel supports them.",
  },
] satisfies Array<{
  key: keyof UserSettings["experimental"];
  title: string;
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
        <div className="space-y-4">
          {EXPERIMENTAL_ROWS.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4"
            >
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{row.title}</h3>
                <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">{row.body}</p>
              </div>
              <SettingsToggle
                checked={draft[row.key]}
                onChange={(checked) => setDraft((current) => ({ ...current, [row.key]: checked }))}
              />
            </div>
          ))}
        </div>
      </SettingsGroup>

      <SettingsResetRow onReset={() => setDraft(defaultUserSettings.experimental)} disabled={!canReset} />
    </SettingsStack>
  );
}
