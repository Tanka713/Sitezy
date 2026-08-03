"use client";

import type { UserSettings } from "@/types";
import { defaultUserSettings } from "@/lib/settings";
import {
  SettingsField,
  SettingsGroup,
  SettingsResetRow,
  SettingsRow,
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

      <SettingsGroup title="Creative mode">
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

          <div className="space-y-3">
            <SettingsRow
              title="Surprise me"
              action={
                <SettingsToggle
                  checked={draft.surpriseMe}
                  onChange={(surpriseMe) => setDraft((current) => ({ ...current, surpriseMe }))}
                />
              }
            />

            <SettingsRow
              title="Break rules"
              action={
                <SettingsToggle
                  checked={draft.breakDesignRules}
                  onChange={(breakDesignRules) => setDraft((current) => ({ ...current, breakDesignRules }))}
                />
              }
            />
          </div>
        </div>
      </SettingsGroup>

      <SettingsResetRow onReset={() => setDraft(defaultUserSettings.creativeMode)} disabled={!canReset} />
    </SettingsStack>
  );
}
