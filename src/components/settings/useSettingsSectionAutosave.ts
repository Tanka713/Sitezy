"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserSettings } from "@/types";

type StatusTone = "success" | "error" | "muted";

export function useSettingsSectionAutosave<K extends keyof UserSettings>({
  sectionKey,
  value,
  onSave,
  onPreview,
  errorMessage,
  savingMessage = "Saving changes automatically...",
  debounceMs = 700,
}: {
  sectionKey: K;
  value: UserSettings[K];
  onSave: (patch: Partial<UserSettings>) => Promise<void>;
  onPreview?: (patch: Partial<UserSettings>) => void;
  errorMessage: string;
  savingMessage?: string;
  debounceMs?: number;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);

  const latestDraftRef = useRef(draft);
  const hasMountedRef = useRef(false);
  const isMountedRef = useRef(true);
  const saveVersionRef = useRef(0);
  const inFlightSaveIdRef = useRef(0);
  const lastSavedSerializedRef = useRef(JSON.stringify(value));
  const inFlightSaveRef = useRef<Promise<void> | null>(null);
  const draftSerializedRef = useRef(JSON.stringify(draft));

  const draftSerialized = useMemo(() => JSON.stringify(draft), [draft]);
  const externalSerialized = useMemo(() => JSON.stringify(value), [value]);

  useEffect(() => {
    latestDraftRef.current = draft;
    draftSerializedRef.current = draftSerialized;
  }, [draft, draftSerialized]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const currentDraftSerialized = JSON.stringify(latestDraftRef.current);

    if (externalSerialized === currentDraftSerialized) {
      lastSavedSerializedRef.current = externalSerialized;
      return;
    }

    if (externalSerialized === lastSavedSerializedRef.current) {
      return;
    }

    lastSavedSerializedRef.current = externalSerialized;
    setDraft(value);
  }, [externalSerialized, value]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (draftSerialized === lastSavedSerializedRef.current) {
      return;
    }

    setStatus({ tone: "muted", message: savingMessage });
    const saveVersion = ++saveVersionRef.current;
    const timer = window.setTimeout(async () => {
      const nextDraft = latestDraftRef.current;
      const saveId = ++inFlightSaveIdRef.current;
      const savePromise = (async () => {
        if (isMountedRef.current) {
          setSaving(true);
        }

        try {
          await onSave({ [sectionKey]: nextDraft } as Partial<UserSettings>);

          if (saveVersionRef.current !== saveVersion) {
            return;
          }

          lastSavedSerializedRef.current = JSON.stringify(nextDraft);
          if (isMountedRef.current) {
            setStatus(null);
          }
        } catch (error) {
          if (saveVersionRef.current !== saveVersion) {
            return;
          }

          if (isMountedRef.current) {
            setStatus({
              tone: "error",
              message: error instanceof Error ? error.message : errorMessage,
            });
          }
        } finally {
          if (saveVersionRef.current === saveVersion && isMountedRef.current) {
            setSaving(false);
          }
          if (inFlightSaveIdRef.current === saveId) {
            inFlightSaveRef.current = null;
          }
        }
      })();
      inFlightSaveRef.current = savePromise;
      await savePromise;
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, draftSerialized, errorMessage, onSave, savingMessage, sectionKey]);

  useEffect(() => {
    const flushPendingSave = () => {
      if (draftSerializedRef.current === lastSavedSerializedRef.current) {
        return;
      }

      if (inFlightSaveRef.current) {
        return;
      }

      const saveVersion = ++saveVersionRef.current;
      const nextDraft = latestDraftRef.current;
      const saveId = ++inFlightSaveIdRef.current;
      const savePromise = (async () => {
        if (isMountedRef.current) {
          setSaving(true);
        }

        try {
          await onSave({ [sectionKey]: nextDraft } as Partial<UserSettings>);

          if (saveVersionRef.current !== saveVersion) {
            return;
          }

          lastSavedSerializedRef.current = JSON.stringify(nextDraft);
          if (isMountedRef.current) {
            setStatus(null);
          }
        } catch (error) {
          if (saveVersionRef.current !== saveVersion) {
            return;
          }

          if (isMountedRef.current) {
            setStatus({
              tone: "error",
              message: error instanceof Error ? error.message : errorMessage,
            });
          }
        } finally {
          if (saveVersionRef.current === saveVersion && isMountedRef.current) {
            setSaving(false);
          }
          if (inFlightSaveIdRef.current === saveId) {
            inFlightSaveRef.current = null;
          }
        }
      })();

      inFlightSaveRef.current = savePromise;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPendingSave();
      }
    };

    window.addEventListener("pagehide", flushPendingSave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      flushPendingSave();
      window.removeEventListener("pagehide", flushPendingSave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [errorMessage, onSave, sectionKey]);

  const updateDraft = useCallback(
    (updater: UserSettings[K] | ((current: UserSettings[K]) => UserSettings[K])) => {
      setDraft((current) => {
        const next = typeof updater === "function" ? (updater as (current: UserSettings[K]) => UserSettings[K])(current) : updater;
        onPreview?.({ [sectionKey]: next } as Partial<UserSettings>);
        return next;
      });
    },
    [onPreview, sectionKey]
  );

  return {
    draft,
    saving,
    status,
    setDraft: updateDraft,
    setStatus,
  };
}
