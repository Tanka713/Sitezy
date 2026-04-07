"use client";

import { useMemo } from "react";
import type { UserSettings } from "@/types";
import { defaultUserSettings } from "@/lib/settings";
import {
  SettingsColorPicker,
  SettingsField,
  SettingsGrid,
  SettingsGroup,
  SettingsResetRow,
  SettingsSegmented,
  SettingsStack,
  SettingsStatus,
} from "../ui";
import { useSettingsSectionAutosave } from "../useSettingsSectionAutosave";

const DEFAULT_PAGE_OPTIONS = ["Home", "About", "Services", "Contact"] as const;

export function ProjectDefaultsSection({
  value,
  onSave,
}: {
  value: UserSettings["projectDefaults"];
  onSave: (patch: Partial<UserSettings>) => Promise<void>;
}) {
  const { draft, status, setDraft } = useSettingsSectionAutosave({
    sectionKey: "projectDefaults",
    value,
    onSave,
    errorMessage: "We couldn't save your project defaults.",
  });
  const canReset = JSON.stringify(draft) !== JSON.stringify(defaultUserSettings.projectDefaults);

  const palette = useMemo(() => {
    const next = [...draft.defaultColorPalette];
    while (next.length < 4) next.push("#ffffff");
    return next.slice(0, 4);
  }, [draft.defaultColorPalette]);

  function togglePage(page: string) {
    setDraft((current) => {
      const active = current.defaultPages.includes(page);
      const nextPages = active
        ? current.defaultPages.filter((entry) => entry !== page)
        : [...current.defaultPages, page];

      return {
        ...current,
        defaultPages: nextPages.length ? nextPages : ["Home"],
      };
    });
  }

  function updatePalette(index: number, valueHex: string) {
    setDraft((current) => {
      const next = [...current.defaultColorPalette];
      while (next.length < 4) next.push("#ffffff");
      next[index] = valueHex;
      return { ...current, defaultColorPalette: next };
    });
  }
  return (
    <SettingsStack>
      {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

      <SettingsGroup title="Starting structure" body="These defaults are applied to new generation briefs before you customize them in the generator.">
        <div className="space-y-5">
          <SettingsField label="Default pages">
            <div className="flex flex-wrap gap-2">
              {DEFAULT_PAGE_OPTIONS.map((page) => {
                const active = draft.defaultPages.includes(page);
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => togglePage(page)}
                    className={[
                      "rounded-full border px-4 py-2.5 text-[13px] font-medium transition-all",
                      active
                        ? "border-[var(--border-focus)] bg-[var(--accent-subtle)] text-[var(--text-primary)]"
                        : "border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--fg-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-4)]",
                    ].join(" ")}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          </SettingsField>

          <SettingsField label="Default color palette">
            <SettingsGrid className="md:grid-cols-4">
              {palette.map((color, index) => (
                <div key={index} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">
                    Color {index + 1}
                  </p>
                  <SettingsColorPicker value={color} onChange={(hex) => updatePalette(index, hex)} />
                </div>
              ))}
            </SettingsGrid>
          </SettingsField>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Design defaults" body="Choose the typography and layout bias that should seed new projects automatically.">
        <div className="space-y-5">
          <SettingsField label="Typography style">
            <SettingsSegmented
              value={draft.typographyStyle}
              onChange={(typographyStyle) => setDraft((current) => ({ ...current, typographyStyle }))}
              options={[
                { value: "modern-sans", label: "Modern Sans" },
                { value: "editorial-serif", label: "Editorial Serif" },
                { value: "product-sans", label: "Product Sans" },
              ]}
            />
          </SettingsField>

          <SettingsField label="Layout spacing">
            <SettingsSegmented
              value={draft.layoutSpacing}
              onChange={(layoutSpacing) => setDraft((current) => ({ ...current, layoutSpacing }))}
              options={[
                { value: "compact", label: "Compact" },
                { value: "balanced", label: "Balanced" },
                { value: "airy", label: "Airy" },
              ]}
            />
          </SettingsField>

          <SettingsField label="Navigation style">
            <SettingsSegmented
              value={draft.navigationStyle}
              onChange={(navigationStyle) => setDraft((current) => ({ ...current, navigationStyle }))}
              options={[
                { value: "minimal", label: "Minimal" },
                { value: "full", label: "Full" },
                { value: "floating", label: "Floating" },
              ]}
            />
          </SettingsField>
        </div>
      </SettingsGroup>

      <SettingsResetRow onReset={() => setDraft(defaultUserSettings.projectDefaults)} disabled={!canReset} />
    </SettingsStack>
  );
}
