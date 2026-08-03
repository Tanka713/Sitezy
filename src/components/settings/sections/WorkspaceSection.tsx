"use client";

import type { UserSettings } from "@/types";
import { defaultUserSettings } from "@/lib/settings";
import {
  SettingsField,
  SettingsGroup,
  SettingsResetRow,
  SettingsRow,
  SettingsSegmented,
  SettingsSlider,
  SettingsStack,
  SettingsStatus,
  SettingsToggle,
} from "../ui";
import { useSettingsSectionAutosave } from "../useSettingsSectionAutosave";

export function WorkspaceSection({
  value,
  onPreview,
  onSave,
}: {
  value: UserSettings["workspace"];
  onPreview: (patch: Partial<UserSettings>) => void;
  onSave: (patch: Partial<UserSettings>) => Promise<void>;
}) {
  const { draft, status, setDraft } = useSettingsSectionAutosave({
    sectionKey: "workspace",
    value,
    onSave,
    onPreview,
    errorMessage: "We couldn't save your workspace preferences.",
  });

  function updateDraft(patch: Partial<UserSettings["workspace"]>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  const canReset = JSON.stringify(draft) !== JSON.stringify(defaultUserSettings.workspace);

  return (
    <SettingsStack>
      {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

      <div data-settings-anchor="workspace-appearance">
      <SettingsGroup title="Appearance" body="Keep the workspace tuned to how you like to work across devices and sessions.">
        <div className="space-y-5">
          <SettingsField label="Theme">
            <SettingsSegmented
              value={draft.theme}
              onChange={(theme) => updateDraft({ theme })}
              options={[
                { value: "dark", label: "Dark", description: "Match the current product shell." },
                { value: "light", label: "Light", description: "Lighter surfaces and softer contrast." },
                { value: "system", label: "System", description: "Follow your device preference." },
              ]}
            />
          </SettingsField>

          <SettingsField label="Font preference">
            <SettingsSegmented
              value={draft.fontPreference}
              onChange={(fontPreference) => updateDraft({ fontPreference })}
              options={[
                { value: "default", label: "Default", description: "Current Sitezy product typography." },
                { value: "system", label: "System", description: "Use your platform’s UI font." },
              ]}
            />
          </SettingsField>

          <SettingsField label="Interface scale" hint="Applies instantly">
            <SettingsSlider
              value={draft.uiScale}
              onChange={(uiScale) => updateDraft({ uiScale })}
              min={85}
              max={115}
              step={1}
              suffix="%"
            />
          </SettingsField>
        </div>
      </SettingsGroup>
      </div>

      <div data-settings-anchor="workspace-behavior">
      <SettingsGroup title="Workspace behavior" body="Control density and motion for the editor, dashboard, and support surfaces.">
        <div className="space-y-4">
          <SettingsRow
            title="Editor density"
            body="Comfortable gives more breathing room. Compact trims padding for denser control surfaces."
            action={
              <div className="w-full min-w-[250px] max-w-[320px]">
                <SettingsSegmented
                  value={draft.editorDensity}
                  onChange={(editorDensity) => updateDraft({ editorDensity })}
                  columns={2}
                  options={[
                    { value: "comfortable", label: "Comfortable" },
                    { value: "compact", label: "Compact" },
                  ]}
                />
              </div>
            }
          />

          <SettingsRow
            title="Animations"
            body="Turn off ambient movement and transitions if you prefer a quieter workspace."
            action={
              <SettingsToggle
                checked={draft.animationsEnabled}
                onChange={(animationsEnabled) => updateDraft({ animationsEnabled })}
                label={draft.animationsEnabled ? "On" : "Off"}
              />
            }
          />
        </div>
      </SettingsGroup>
      </div>

      <SettingsResetRow onReset={() => setDraft(defaultUserSettings.workspace)} disabled={!canReset} />
    </SettingsStack>
  );
}
