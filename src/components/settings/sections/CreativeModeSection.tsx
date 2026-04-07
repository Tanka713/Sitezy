"use client";

import type { UserSettings } from "@/types";
import { defaultUserSettings } from "@/lib/settings";
import {
  SettingsField,
  SettingsGroup,
  SettingsResetRow,
  SettingsSlider,
  SettingsStack,
  SettingsStatus,
  SettingsToggle,
} from "../ui";
import { useSettingsSectionAutosave } from "../useSettingsSectionAutosave";

export function CreativeModeSection({
  value,
  onSave,
}: {
  value: UserSettings["creativeMode"];
  onSave: (patch: Partial<UserSettings>) => Promise<void>;
}) {
  const { draft, status, setDraft } = useSettingsSectionAutosave({
    sectionKey: "creativeMode",
    value,
    onSave,
    errorMessage: "We couldn't save creative mode.",
  });
  const canReset = JSON.stringify(draft) !== JSON.stringify(defaultUserSettings.creativeMode);

  return (
    <SettingsStack>
      {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

      <SettingsGroup title="Creative bias" body="Bias generation toward more surprising, less restrained outputs when you want the AI to push harder.">
        <div className="space-y-4">
          <SettingsField label="Boldness">
            <SettingsSlider
              value={draft.boldness}
              onChange={(boldness) => setDraft((current) => ({ ...current, boldness }))}
              min={0}
              max={100}
              step={1}
            />
          </SettingsField>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4">
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Surprise me</h3>
                <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">
                  Let generation occasionally pick a more unexpected layout direction.
                </p>
              </div>
              <SettingsToggle
                checked={draft.surpriseMe}
                onChange={(surpriseMe) => setDraft((current) => ({ ...current, surpriseMe }))}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-3)] px-4 py-4">
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Break design rules</h3>
                <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">
                  Permit asymmetry, sharper contrast, and rule-bending composition when the prompt allows it.
                </p>
              </div>
              <SettingsToggle
                checked={draft.breakDesignRules}
                onChange={(breakDesignRules) => setDraft((current) => ({ ...current, breakDesignRules }))}
              />
            </div>
          </div>
        </div>
      </SettingsGroup>

      <SettingsResetRow onReset={() => setDraft(defaultUserSettings.creativeMode)} disabled={!canReset} />
    </SettingsStack>
  );
}
