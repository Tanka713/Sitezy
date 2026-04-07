"use client";

import type { UserSettings } from "@/types";
import { defaultUserSettings } from "@/lib/settings";
import {
  SettingsField,
  SettingsGroup,
  SettingsResetRow,
  SettingsSegmented,
  SettingsSlider,
  SettingsStack,
  SettingsStatus,
} from "../ui";
import { useSettingsSectionAutosave } from "../useSettingsSectionAutosave";

export function AISettingsSection({
  value,
  onSave,
}: {
  value: UserSettings["ai"];
  onSave: (patch: Partial<UserSettings>) => Promise<void>;
}) {
  const { draft, status, setDraft } = useSettingsSectionAutosave({
    sectionKey: "ai",
    value,
    onSave,
    errorMessage: "We couldn't save your AI defaults.",
  });
  const canReset = JSON.stringify(draft) !== JSON.stringify(defaultUserSettings.ai);

  return (
    <SettingsStack>
      {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

      <SettingsGroup title="Generation direction" body="Set the visual and structural tone Sitezy should prefer before you start refining manually.">
        <div className="space-y-5">
          <SettingsField label="Default design style">
            <SettingsSegmented
              value={draft.designStyle}
              onChange={(designStyle) => setDraft((current) => ({ ...current, designStyle }))}
              options={[
                { value: "minimal", label: "Minimal" },
                { value: "luxury", label: "Luxury" },
                { value: "playful", label: "Playful" },
                { value: "brutalist", label: "Brutalist" },
                { value: "editorial", label: "Editorial" },
                { value: "futuristic", label: "Futuristic" },
              ]}
            />
          </SettingsField>

          <SettingsField label="Structure preference">
            <SettingsSegmented
              value={draft.structurePreference}
              onChange={(structurePreference) => setDraft((current) => ({ ...current, structurePreference }))}
              options={[
                { value: "clean", label: "Clean", description: "Stable hierarchy and classic flow." },
                { value: "grid-heavy", label: "Grid-heavy", description: "Modular sections and card rhythm." },
                { value: "asymmetric", label: "Asymmetric", description: "More offset layouts and contrast." },
              ]}
            />
          </SettingsField>

          <SettingsField label="Content density">
            <SettingsSegmented
              value={draft.contentDensity}
              onChange={(contentDensity) => setDraft((current) => ({ ...current, contentDensity }))}
              options={[
                { value: "short", label: "Short" },
                { value: "balanced", label: "Balanced" },
                { value: "detailed", label: "Detailed" },
              ]}
            />
          </SettingsField>

          <SettingsField label="Creativity level">
            <SettingsSlider
              value={draft.creativityLevel}
              onChange={(creativityLevel) => setDraft((current) => ({ ...current, creativityLevel }))}
              min={0}
              max={100}
              step={1}
            />
          </SettingsField>
        </div>
      </SettingsGroup>

      <SettingsResetRow onReset={() => setDraft(defaultUserSettings.ai)} disabled={!canReset} />
    </SettingsStack>
  );
}
