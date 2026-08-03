"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { resetSignedOutUserSettings } from "@/lib/settings";
import { useAppStore } from "@/lib/store";
import type { UserAccountProfile } from "@/types";
import { normalizeError, logAppError, API_AUTH_001, API_UNKNOWN_001 } from "@/lib/errors";
import { AccountTwoFactorSection } from "./AccountTwoFactorSection";
import {
  SettingsActionRow,
  SettingsField,
  SettingsGrid,
  SettingsGroup,
  SettingsInput,
  SettingsModal,
  SettingsPrimaryAction,
  SettingsSecondaryAction,
  SettingsStack,
  SettingsStatus,
} from "../ui";

type StoredAvatar = {
  url: string | null;
  bucket: string | null;
  path: string | null;
};

function sameStoredAvatar(
  left: Pick<StoredAvatar, "bucket" | "path"> | null | undefined,
  right: Pick<StoredAvatar, "bucket" | "path"> | null | undefined
) {
  return (left?.bucket ?? null) === (right?.bucket ?? null) && (left?.path ?? null) === (right?.path ?? null);
}

export function AccountSection({
  account,
  onAccountChange,
}: {
  account: UserAccountProfile;
  onAccountChange: (next: UserAccountProfile) => void;
}) {
  const setApiError = useAppStore((s) => s.setApiError);
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(account.profileImageUrl);
  const [profileBucket, setProfileBucket] = useState<string | null>(account.profileImageStorageBucket);
  const [profilePath, setProfilePath] = useState<string | null>(account.profileImageStoragePath);
  const [status, setStatus] = useState<{ tone: "success" | "error" | "muted"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const persistedAvatarRef = useRef<StoredAvatar>({
    url: account.profileImageUrl,
    bucket: account.profileImageStorageBucket,
    path: account.profileImageStoragePath,
  });
  const uploadedDraftAvatarRef = useRef<Pick<StoredAvatar, "bucket" | "path"> | null>(null);

  useEffect(() => {
    setName(account.name);
    setEmail(account.email);
    setProfileImageUrl(account.profileImageUrl);
    setProfileBucket(account.profileImageStorageBucket);
    setProfilePath(account.profileImageStoragePath);

    const nextPersistedAvatar = {
      url: account.profileImageUrl,
      bucket: account.profileImageStorageBucket,
      path: account.profileImageStoragePath,
    };
    persistedAvatarRef.current = nextPersistedAvatar;
    if (sameStoredAvatar(uploadedDraftAvatarRef.current, nextPersistedAvatar)) {
      uploadedDraftAvatarRef.current = null;
    }
  }, [account]);

  useEffect(() => {
    return () => {
      const draftAvatar = uploadedDraftAvatarRef.current;
      if (!draftAvatar?.bucket || !draftAvatar.path) return;

      const supabase = getSupabaseBrowserClient();
      void supabase.storage.from(draftAvatar.bucket).remove([draftAvatar.path]);
      uploadedDraftAvatarRef.current = null;
    };
  }, []);

  async function removeStoredAvatar(target: Pick<StoredAvatar, "bucket" | "path"> | null | undefined) {
    if (!target?.bucket || !target.path) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.storage.from(target.bucket).remove([target.path]);
  }

  async function removeUploadedDraftAvatar() {
    const draftAvatar = uploadedDraftAvatarRef.current;
    if (!draftAvatar) return;
    uploadedDraftAvatarRef.current = null;
    await removeStoredAvatar(draftAvatar);
  }

  async function commitSavedAccount(nextAccount: UserAccountProfile) {
    const previousPersistedAvatar = persistedAvatarRef.current;
    const nextPersistedAvatar = {
      url: nextAccount.profileImageUrl,
      bucket: nextAccount.profileImageStorageBucket,
      path: nextAccount.profileImageStoragePath,
    };

    if (sameStoredAvatar(uploadedDraftAvatarRef.current, nextPersistedAvatar)) {
      uploadedDraftAvatarRef.current = null;
    }

    persistedAvatarRef.current = nextPersistedAvatar;
    onAccountChange(nextAccount);

    if (!sameStoredAvatar(previousPersistedAvatar, nextPersistedAvatar)) {
      try {
        await removeStoredAvatar(previousPersistedAvatar);
      } catch (error) {
        const appErr = normalizeError(error, API_UNKNOWN_001, { action: "cleanupPreviousProfileImage" });
        logAppError(appErr);
      }
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setStatus(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const extension = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${account.id}/profile/avatar-${Date.now()}.${extension}`;
      const previousDraftAvatar = uploadedDraftAvatarRef.current;

      const { error: uploadError } = await supabase.storage
        .from("sitezy-media")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      if (previousDraftAvatar) {
        try {
          await removeStoredAvatar(previousDraftAvatar);
        } catch (error) {
          const appErr = normalizeError(error, API_UNKNOWN_001, { action: "cleanupUploadedProfileImageDraft" });
          logAppError(appErr);
        }
      }

      const { data } = supabase.storage.from("sitezy-media").getPublicUrl(path);
      uploadedDraftAvatarRef.current = { bucket: "sitezy-media", path };
      setProfileImageUrl(data.publicUrl);
      setProfileBucket("sitezy-media");
      setProfilePath(path);
      setStatus({ tone: "success", message: "Profile image uploaded. Save account changes to apply it." });
    } catch (error) {
      const appErr = normalizeError(error, API_AUTH_001, { action: "uploadProfileImage" });
      logAppError(appErr);
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({ tone: "error", message: appErr.userMessage });
    } finally {
      setUploading(false);
    }
  }

  async function saveAccount() {
    setSaving(true);
    setStatus(null);
    let profileSaved = false;
    try {
      const supabase = getSupabaseBrowserClient();
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const wantsEmailUpdate = Boolean(trimmedEmail && trimmedEmail !== account.email);
      const wantsPasswordUpdate = Boolean(password || confirmPassword);

      if (wantsPasswordUpdate) {
        if (password.length < 8) {
          throw new Error("Use at least 8 characters for your new password.");
        }
        if (password !== confirmPassword) {
          throw new Error("Your passwords do not match.");
        }
      }

      const nextAccount: UserAccountProfile = {
        ...account,
        name: trimmedName || account.name,
        email: trimmedEmail || account.email,
        profileImageUrl,
        profileImageStorageBucket: profileBucket,
        profileImageStoragePath: profilePath,
      };

      const { error: profileError } = await supabase.auth.updateUser({
        ...(wantsEmailUpdate ? { email: trimmedEmail } : {}),
        data: {
          full_name: trimmedName || account.name,
          avatar_url: profileImageUrl,
          avatar_storage_bucket: profileBucket,
          avatar_storage_path: profilePath,
        },
      });

      if (profileError) throw profileError;
      await commitSavedAccount(nextAccount);
      profileSaved = true;

      if (wantsPasswordUpdate) {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) throw passwordError;
      }

      setPassword("");
      setConfirmPassword("");
      setStatus({
        tone: "success",
        message:
          wantsEmailUpdate
            ? "Account updated. Check your inbox to confirm the new email address."
            : "Account details saved.",
      });
    } catch (error) {
      const appErr = normalizeError(error, API_AUTH_001, { action: "saveAccount" });
      logAppError(appErr);
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({
        tone: "error",
        message: profileSaved ? `Profile details saved, but ${appErr.userMessage.toLowerCase()}` : appErr.userMessage,
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeAvatar() {
    setUploading(true);
    setStatus(null);
    try {
      if (
        uploadedDraftAvatarRef.current &&
        sameStoredAvatar(uploadedDraftAvatarRef.current, { bucket: profileBucket, path: profilePath })
      ) {
        await removeUploadedDraftAvatar();
      }

      setProfileImageUrl(null);
      setProfileBucket(null);
      setProfilePath(null);
      setStatus({ tone: "success", message: "Profile image removed. Save account changes to apply it." });
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "removeProfileImage" });
      logAppError(appErr);
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({ tone: "error", message: appErr.userMessage });
    } finally {
      setUploading(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setStatus(null);
    try {
      const response = await fetch("/api/settings/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!response.ok) {
        throw new Error(data.error || "We couldn't delete your account.");
      }

      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "global" });
      resetSignedOutUserSettings();
      window.location.assign("/");
    } catch (error) {
      const appErr = normalizeError(error, API_UNKNOWN_001, { action: "deleteAccount" });
      logAppError(appErr);
      setApiError({ message: appErr.userMessage, requestId: null, code: appErr.code });
      setStatus({ tone: "error", message: appErr.userMessage });
      setDeleting(false);
    }
  }

  return (
    <>
      <SettingsStack>
        {status ? <SettingsStatus tone={status.tone}>{status.message}</SettingsStatus> : null}

        <div data-settings-anchor="account-profile">
        <SettingsGroup title="Profile" body="Update your visible account details and profile image.">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] border border-[var(--border-softer)] bg-[var(--surface-3)] text-[22px] font-semibold text-[var(--fg-soft)]">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  (name.trim().charAt(0) || account.email.charAt(0) || "S").toUpperCase()
                )}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <SettingsSecondaryAction type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}
                    Upload image
                  </SettingsSecondaryAction>
                  {profileImageUrl ? (
                    <SettingsSecondaryAction type="button" onClick={removeAvatar} disabled={uploading}>
                      <Trash2 size={14} />
                      Remove
                    </SettingsSecondaryAction>
                  ) : null}
                </div>
                <p className="text-[12px] leading-6 text-[var(--text-tertiary)]">
                  Upload a square image for the cleanest result. We store it in your account media bucket.
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleAvatarUpload(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>
          </div>

          <div className="mt-6">
            <SettingsGrid>
              <SettingsField label="Name">
                <SettingsInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
              </SettingsField>
              <SettingsField label="Email">
                <SettingsInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
              </SettingsField>
            </SettingsGrid>
          </div>
        </SettingsGroup>
        </div>

        <div data-settings-anchor="change-password">
        <SettingsGroup title="Password" body="Change your password without leaving the app.">
          <SettingsGrid>
            <SettingsField label="New password">
              <SettingsInput
                id="account-new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
              />
            </SettingsField>
            <SettingsField label="Confirm password">
              <SettingsInput
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
              />
            </SettingsField>
          </SettingsGrid>
        </SettingsGroup>
        </div>

        <AccountTwoFactorSection account={account} onAccountChange={onAccountChange} />

        <div data-settings-anchor="delete-account">
        <SettingsActionRow className="justify-between">
          <SettingsSecondaryAction type="button" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} />
            Delete account
          </SettingsSecondaryAction>
          <SettingsPrimaryAction type="button" onClick={saveAccount} disabled={saving || uploading}>
            {saving ? <Loader2 size={14} className="spin" /> : null}
            Save account
          </SettingsPrimaryAction>
        </SettingsActionRow>
        </div>
      </SettingsStack>

      <SettingsModal
        open={deleteOpen}
        title="Delete your account"
        onClose={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeleteConfirmation("");
        }}
        body={
          <div className="space-y-4">
            <p className="text-[14px] leading-7 text-[var(--text-secondary)]">
              This permanently deletes your account, projects, settings, and media records. Type{" "}
              <span className="font-semibold text-[var(--text-primary)]">DELETE</span> to confirm.
            </p>
            <SettingsField label="Confirmation">
              <SettingsInput
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder="DELETE"
              />
            </SettingsField>
          </div>
        }
        actions={
          <>
            <SettingsSecondaryAction
              type="button"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirmation("");
              }}
              disabled={deleting}
            >
              Cancel
            </SettingsSecondaryAction>
            <SettingsPrimaryAction
              type="button"
              onClick={() => void deleteAccount()}
              disabled={deleting || deleteConfirmation.trim().toUpperCase() !== "DELETE"}
              className="bg-[linear-gradient(135deg,#eb5e67_0%,#cf4459_100%)] border-red-400/30 shadow-[0_12px_28px_rgba(207,68,89,0.22)] hover:bg-[linear-gradient(135deg,#f06a74_0%,#d14a5e_100%)]"
            >
              {deleting ? <Loader2 size={14} className="spin" /> : null}
              Delete permanently
            </SettingsPrimaryAction>
          </>
        }
      />
    </>
  );
}
