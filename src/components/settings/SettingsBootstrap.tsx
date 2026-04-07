"use client";

import { useEffect, useRef, useState } from "react";
import type { UserSettings } from "@/types";
import {
  applyUserSettingsToDocument,
  broadcastUserSettings,
  cacheUserSettings,
  defaultUserSettings,
  mergeUserSettings,
  normalizeUserSettings,
  readCachedUserSettings,
  resetSignedOutUserSettings,
} from "@/lib/settings";

export function SettingsBootstrap() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const cachedSettingsRef = useRef<UserSettings | null>(null);

  useEffect(() => {
    const cached = readCachedUserSettings();
    if (cached) {
      cachedSettingsRef.current = cached;
      setSettings(cached);
      applyUserSettingsToDocument(cached);
      broadcastUserSettings(cached);
    }

    let cancelled = false;

    void fetch("/api/settings", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            resetSignedOutUserSettings();
            return defaultUserSettings;
          }
          return null;
        }
        const data = (await response.json()) as { settings?: Partial<UserSettings> };
        return normalizeUserSettings(data.settings);
      })
      .then((next) => {
        if (!next || cancelled) return;
        const resolved = cachedSettingsRef.current
          ? mergeUserSettings(next, { workspace: cachedSettingsRef.current.workspace })
          : next;
        cachedSettingsRef.current = resolved;
        setSettings(resolved);
        cacheUserSettings(resolved);
        applyUserSettingsToDocument(resolved);
        broadcastUserSettings(resolved);
      })
      .catch(() => {
        // unauthenticated or network issue — keep cached defaults silently
      });

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UserSettings>).detail;
      if (!detail) return;
      const next = normalizeUserSettings(detail);
      cachedSettingsRef.current = next;
      setSettings(next);
      cacheUserSettings(next);
      applyUserSettingsToDocument(next);
    };

    window.addEventListener("sitezy-settings-updated", handleUpdate as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("sitezy-settings-updated", handleUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!settings || settings.workspace.theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const syncTheme = () => {
      applyUserSettingsToDocument(settings);
      broadcastUserSettings(settings);
    };

    syncTheme();
    media.addEventListener?.("change", syncTheme);
    return () => media.removeEventListener?.("change", syncTheme);
  }, [settings]);

  return null;
}
