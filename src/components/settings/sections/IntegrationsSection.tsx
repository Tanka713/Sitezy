"use client";

import type { UserSettings } from "@/types";
import { defaultUserSettings } from "@/lib/settings";
import {
  SettingsField,
  SettingsGroup,
  SettingsInput,
  SettingsPlaceholder,
  SettingsResetRow,
  SettingsSegmented,
  SettingsStack,
  SettingsStatus,
} from "../ui";
import { useSettingsSectionAutosave } from "../useSettingsSectionAutosave";

export function IntegrationsSection({
  value,
  onSave,
}: {
  value: UserSettings["integrations"];
  onSave: (patch: Partial<UserSettings>) => Promise<void>;
}) {
  const { draft, status, setDraft } = useSettingsSectionAutosave({
    sectionKey: "integrations",
    value,
    onSave,
    errorMessage: "We couldn't save integrations.",
  });
  const canReset = JSON.stringify(draft) !== JSON.stringify(defaultUserSettings.integrations);

  return (
    <SettingsStack>
      {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

      <SettingsGroup title="Analytics & forms" body="Store the IDs and delivery defaults that new projects should inherit automatically.">
        <div className="space-y-5">
          <SettingsField label="Analytics ID">
            <SettingsInput
              value={draft.analyticsId}
              onChange={(event) => setDraft((current) => ({ ...current, analyticsId: event.target.value }))}
              placeholder="G-XXXXXXXXXX or similar"
            />
          </SettingsField>

          <SettingsField label="Form notifications">
            <SettingsInput
              type="email"
              value={draft.notificationEmail}
              onChange={(event) => setDraft((current) => ({ ...current, notificationEmail: event.target.value }))}
              placeholder="notifications@company.com"
            />
          </SettingsField>

          <SettingsField label="Forms provider">
            <SettingsSegmented
              value={draft.formsProvider}
              onChange={(formsProvider) => setDraft((current) => ({ ...current, formsProvider }))}
              columns={2}
              options={[
                { value: "email", label: "Email" },
                { value: "none", label: "None" },
              ]}
            />
          </SettingsField>

          <SettingsField label="Primary domain">
            <SettingsInput
              value={draft.primaryDomain}
              onChange={(event) => setDraft((current) => ({ ...current, primaryDomain: event.target.value }))}
              placeholder="studio.yourdomain.com"
            />
          </SettingsField>
        </div>
      </SettingsGroup>

      <SettingsPlaceholder
        title="Live domains are managed in Export & Deployment"
        body="Use the Export & Deployment section to publish to sitezy.ai, connect custom domains, and manage live deployment targets."
      />

      <SettingsResetRow onReset={() => setDraft(defaultUserSettings.integrations)} disabled={!canReset} />
    </SettingsStack>
  );
}
