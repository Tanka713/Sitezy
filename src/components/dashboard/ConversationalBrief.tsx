"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUp,
  Check,
  ImageIcon,
  Link2,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { SitezyButton } from "@/components/ui/sitezy";
import { useAppStore } from "@/lib/store";
import { normalizeMediaAsset, USER_MEDIA_BUCKET } from "@/lib/media/library";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { siteBriefToBusinessBrief } from "@/lib/ai/adapters/wizardAdapter";
import { mergeBusinessBrief } from "@/lib/ai/utils/normalize";
import type { BriefChatMessage } from "@/lib/ai/types";
import type { BriefImageAsset, BusinessBrief, ProjectMediaAsset, SiteBrief } from "@/types";

interface ConversationalBriefProps {
  onComplete: (brief: Partial<SiteBrief>) => void;
  onCancel: () => void;
}

type BriefChatResponse = {
  partialBrief: Partial<SiteBrief>;
  businessBrief: BusinessBrief;
};

// Tappable example prompts to inspire the composer.
const EXAMPLE_PROMPTS = [
  "Stanlee — premium reusable water bottles",
  "A cozy neighborhood coffee shop in Austin",
  "A modern SaaS for team scheduling",
  "A photographer's portfolio, minimal and bold",
];

// Vibe presets seed tone + style direction instantly.
const VIBE_PRESETS: { label: string; tone: string; style: string[]; dot: string }[] = [
  { label: "Minimal", tone: "minimal", style: ["minimal", "clean", "refined"], dot: "#cbd5e1" },
  { label: "Bold", tone: "bold", style: ["bold", "high-contrast", "striking"], dot: "#f59e0b" },
  { label: "Luxury", tone: "premium", style: ["luxury", "elegant", "refined"], dot: "#d4b483" },
  { label: "Editorial", tone: "editorial", style: ["editorial", "magazine", "typographic"], dot: "#e2e8f0" },
  { label: "Playful", tone: "playful", style: ["playful", "vibrant", "friendly"], dot: "#34d399" },
  { label: "Futuristic", tone: "futuristic", style: ["futuristic", "sleek", "tech"], dot: "#8faeff" },
];

const MAX_SITE_IMAGES = 8;

function mergePartialBrief(prev: Partial<SiteBrief>, patch: Partial<SiteBrief>): Partial<SiteBrief> {
  const businessBrief = patch.businessBrief || prev.businessBrief
    ? mergeBusinessBrief(prev.businessBrief, patch.businessBrief)
    : undefined;

  return {
    ...prev,
    ...patch,
    pages: patch.pages ?? prev.pages,
    colorPalette: patch.colorPalette ?? prev.colorPalette,
    smartBrief: patch.smartBrief || prev.smartBrief
      ? {
          ...(prev.smartBrief ?? {}),
          ...(patch.smartBrief ?? {}),
          contactDetails: {
            ...(prev.smartBrief?.contactDetails ?? {}),
            ...(patch.smartBrief?.contactDetails ?? {}),
          },
          logo: patch.smartBrief?.logo ?? prev.smartBrief?.logo,
        }
      : undefined,
    businessBrief,
  };
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "asset";
}

function buildObjectPath(userId: string, fileName: string) {
  return `${userId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

function mediaAssetToBriefImage(asset: ProjectMediaAsset): BriefImageAsset {
  return {
    assetId: asset.id,
    url: asset.url,
    name: asset.name,
    storageBucket: asset.storageBucket,
    storagePath: asset.storagePath,
    altText: asset.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
    notes: "Uploaded website image",
  };
}

function mergeBriefImages(current: BriefImageAsset[], incoming: BriefImageAsset[]): BriefImageAsset[] {
  const byUrl = new Map<string, BriefImageAsset>();
  [...current, ...incoming].forEach((asset) => {
    if (asset.url && !byUrl.has(asset.url)) byUrl.set(asset.url, asset);
  });
  return Array.from(byUrl.values()).slice(0, MAX_SITE_IMAGES);
}

// Derive a reasonable site name from the prompt when extraction doesn't yield one.
function deriveSiteName(prompt: string): string {
  const firstSegment = prompt.split(/[—\-–,:|\n]/)[0]?.trim() ?? "";
  const base =
    firstSegment && firstSegment.length >= 2 && firstSegment.length <= 42
      ? firstSegment
      : prompt.split(/\s+/).slice(0, 5).join(" ");
  return base.trim().slice(0, 60) || "My Site";
}

export function ConversationalBrief({ onComplete, onCancel }: ConversationalBriefProps) {
  const upsertMediaAssets = useAppStore((state) => state.upsertMediaAssets);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isSiteImagesUploading, setIsSiteImagesUploading] = useState(false);
  const [partialBrief, setPartialBrief] = useState<Partial<SiteBrief>>({});
  const [businessBrief, setBusinessBrief] = useState<BusinessBrief>(siteBriefToBusinessBrief({}));
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const siteImagesInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    composerRef.current?.focus();
  }, []);

  const logoPreview = businessBrief.assets.logo.fileUrl || businessBrief.assets.logo.sourceUrl || "";
  const logoAttached = Boolean(logoPreview);
  const siteImages = businessBrief.assets.images ?? [];
  const siteImagesAttached = siteImages.length > 0;

  // One step: structure + research the prompt, then go straight to generation.
  async function createSite() {
    const trimmed = input.trim();
    if (!trimmed || isLoading || isLogoUploading || isSiteImagesUploading) return;

    setError(null);
    setIsLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch("/api/brief-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [{ role: "user", content: trimmed } as BriefChatMessage],
          currentBrief: partialBrief,
          // Instant create: skip the slow web-research round-trip here; the
          // generation pipeline does its own research with a progress screen.
          skipResearch: true,
        }),
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error("Failed to read that");
      const data = (await response.json()) as BriefChatResponse;
      const merged = mergePartialBrief(partialBrief, {
        ...data.partialBrief,
        businessBrief: data.partialBrief.businessBrief ?? data.businessBrief,
      });
      const ensuredBusinessBrief = merged.businessBrief
        ? {
            ...merged.businessBrief,
            assets: {
              ...merged.businessBrief.assets,
              logo: logoAttached ? businessBrief.assets.logo : merged.businessBrief.assets.logo,
              images: siteImages.length ? siteImages : merged.businessBrief.assets.images,
            },
          }
        : undefined;
      // Generation no-ops on empty siteName/description, which would leave this
      // screen stuck on "Creating…". Guarantee both from the prompt as fallback.
      const fallbackName = deriveSiteName(trimmed);
      const extractedName = (merged.siteName || ensuredBusinessBrief?.businessName || data.businessBrief?.businessName || "").trim();
      const ensured: Partial<SiteBrief> = {
        ...merged,
        businessBrief: ensuredBusinessBrief,
        // Use the extracted brand name when it's clean; otherwise derive a short
        // name from the prompt (avoids the whole sentence becoming the brand name).
        siteName: extractedName && extractedName.length <= 42 ? extractedName : fallbackName,
        description: (merged.description || trimmed).trim() || trimmed,
      };
      // onComplete starts generation and unmounts this modal, so leave isLoading on.
      onComplete(ensured);
    } catch {
      clearTimeout(timer);
      setError("That took too long or hit a snag. Please try again.");
      setIsLoading(false);
    }
  }

  function applyVibe(preset: (typeof VIBE_PRESETS)[number]) {
    const nextBusinessBrief: BusinessBrief = {
      ...businessBrief,
      tone: preset.tone,
      styleDirection: preset.style,
    };
    setBusinessBrief(nextBusinessBrief);
    setPartialBrief((prev) => mergePartialBrief(prev, { businessBrief: nextBusinessBrief, tone: preset.tone }));
    setSelectedVibe(preset.label);
  }

  async function handleLogoFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file for the logo.");
      return;
    }

    setError(null);
    setIsLogoUploading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw authError ?? new Error("Authentication required to upload a logo");
      }

      const objectPath = buildObjectPath(authData.user.id, file.name);
      const { error: uploadError } = await supabase.storage
        .from(USER_MEDIA_BUCKET)
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from(USER_MEDIA_BUCKET).getPublicUrl(objectPath).data.publicUrl;
      const asset = normalizeMediaAsset({
        name: file.name,
        url: publicUrl,
        kind: "image",
        storageBucket: USER_MEDIA_BUCKET,
        storagePath: objectPath,
        mimeType: file.type,
        size: file.size,
      });
      await upsertMediaAssets([asset]);

      const nextBusinessBrief: BusinessBrief = {
        ...businessBrief,
        assets: {
          ...businessBrief.assets,
          logo: {
            status: "uploaded",
            assetId: asset.id,
            fileUrl: asset.url,
            fileName: file.name,
            storageBucket: asset.storageBucket,
            storagePath: asset.storagePath,
            altText: `${businessBrief.businessName || "Brand"} logo`,
          },
        },
      };

      setBusinessBrief(nextBusinessBrief);
      setPartialBrief((prev) =>
        mergePartialBrief(prev, {
          businessBrief: nextBusinessBrief,
          smartBrief: { ...(prev.smartBrief ?? {}), logoUrl: asset.url, logo: nextBusinessBrief.assets.logo },
          hasLogo: true,
        })
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Logo upload failed.");
    } finally {
      setIsLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleSiteImageFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!images.length) {
      setError("Please upload image files for the website.");
      return;
    }

    const availableSlots = MAX_SITE_IMAGES - siteImages.length;
    if (availableSlots <= 0) {
      setError(`You can attach up to ${MAX_SITE_IMAGES} website images.`);
      return;
    }

    const selectedFiles = images.slice(0, availableSlots);
    setError(null);
    setIsSiteImagesUploading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw authError ?? new Error("Authentication required to upload website images");
      }

      const uploadedAssets: ProjectMediaAsset[] = [];
      for (const file of selectedFiles) {
        const objectPath = buildObjectPath(authData.user.id, file.name);
        const { error: uploadError } = await supabase.storage
          .from(USER_MEDIA_BUCKET)
          .upload(objectPath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from(USER_MEDIA_BUCKET).getPublicUrl(objectPath).data.publicUrl;
        uploadedAssets.push(normalizeMediaAsset({
          name: file.name,
          url: publicUrl,
          kind: "image",
          storageBucket: USER_MEDIA_BUCKET,
          storagePath: objectPath,
          mimeType: file.type,
          size: file.size,
        }));
      }

      await upsertMediaAssets(uploadedAssets);

      const nextBusinessBrief: BusinessBrief = {
        ...businessBrief,
        assets: {
          ...businessBrief.assets,
          images: mergeBriefImages(siteImages, uploadedAssets.map(mediaAssetToBriefImage)),
        },
      };

      setBusinessBrief(nextBusinessBrief);
      setPartialBrief((prev) => mergePartialBrief(prev, { businessBrief: nextBusinessBrief }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Website image upload failed.");
    } finally {
      setIsSiteImagesUploading(false);
      if (siteImagesInputRef.current) siteImagesInputRef.current.value = "";
    }
  }

  function removeSiteImage(url: string) {
    const nextBusinessBrief: BusinessBrief = {
      ...businessBrief,
      assets: {
        ...businessBrief.assets,
        images: siteImages.filter((asset) => asset.url !== url),
      },
    };
    setBusinessBrief(nextBusinessBrief);
    setPartialBrief((prev) => mergePartialBrief(prev, { businessBrief: nextBusinessBrief }));
    setError(null);
  }

  function handleLogoUrlSubmit() {
    const url = logoUrlInput.trim();
    if (!url) return;

    const nextBusinessBrief: BusinessBrief = {
      ...businessBrief,
      assets: {
        ...businessBrief.assets,
        logo: { ...businessBrief.assets.logo, status: "url", sourceUrl: url, fileUrl: url },
      },
    };

    setBusinessBrief(nextBusinessBrief);
    setPartialBrief((prev) =>
      mergePartialBrief(prev, {
        businessBrief: nextBusinessBrief,
        smartBrief: { ...(prev.smartBrief ?? {}), logoUrl: url, logo: nextBusinessBrief.assets.logo },
        hasLogo: true,
      })
    );
    setError(null);
    setShowLogoUrlInput(false);
    setLogoUrlInput("");
  }

  function handleComposerKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void createSite();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end px-5 pt-4">
        <button
          onClick={onCancel}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-8 pb-10">
        <div className="w-full max-w-[620px]">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#8faeff]" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9db4ff]">Sitezy AI builder</p>
          </div>
          <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-white">
            What do you want to build?
          </h1>
          <p className="mt-2 text-[13.5px] leading-6 text-white/45">
            Name your business or describe the site. I’ll research it and build the first version.
          </p>

          {/* Composer */}
          <div className="mt-6 rounded-[20px] border border-white/[0.1] bg-white/[0.035] p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)] transition-colors focus-within:border-[rgba(91,140,255,0.4)]">
            <textarea
              ref={composerRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Stanlee — premium reusable water bottles… or describe your whole site."
              rows={3}
              disabled={isLoading}
              className="min-h-[72px] w-full resize-none bg-transparent text-[15px] leading-[1.6] text-white/90 outline-none placeholder:text-white/26 disabled:opacity-60"
              style={{ maxHeight: 200 }}
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Attach logo"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isLogoUploading || isLoading}
                  className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-medium transition-all disabled:opacity-50 ${
                    logoAttached
                      ? "border-[rgba(91,140,255,0.3)] bg-[rgba(91,140,255,0.12)] text-[#bcd0ff]"
                      : "border-white/[0.1] bg-white/[0.03] text-white/64 hover:bg-white/[0.06]"
                  }`}
                >
                  {isLogoUploading ? <Loader2 size={13} className="spin" /> : logoAttached ? <Check size={13} /> : <ImageIcon size={13} />}
                  Logo
                </button>
                <button
                  type="button"
                  title="Paste logo URL"
                  onClick={() => setShowLogoUrlInput((value) => !value)}
                  disabled={isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-white/56 transition-all hover:bg-white/[0.06] disabled:opacity-50"
                >
                  <Link2 size={13} />
                </button>
                <button
                  type="button"
                  title="Upload website images"
                  onClick={() => siteImagesInputRef.current?.click()}
                  disabled={isSiteImagesUploading || isLoading || siteImages.length >= MAX_SITE_IMAGES}
                  className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-medium transition-all disabled:opacity-50 ${
                    siteImagesAttached
                      ? "border-[rgba(143,174,255,0.28)] bg-[rgba(143,174,255,0.1)] text-[#c8d6ff]"
                      : "border-white/[0.1] bg-white/[0.03] text-white/64 hover:bg-white/[0.06]"
                  }`}
                >
                  {isSiteImagesUploading ? <Loader2 size={13} className="spin" /> : siteImagesAttached ? <Check size={13} /> : <ImageIcon size={13} />}
                  Images{siteImagesAttached ? ` ${siteImages.length}` : ""}
                </button>
              </div>

              <button
                onClick={() => void createSite()}
                disabled={!input.trim() || isLoading || isLogoUploading || isSiteImagesUploading}
                className="flex h-9 items-center gap-1.5 rounded-full bg-[#5b8cff] px-4 text-[13px] font-semibold text-white transition-all hover:bg-[#6d99ff] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {isLoading ? <Loader2 size={14} className="spin" /> : <ArrowUp size={15} />}
                {isLoading ? "Creating your site…" : "Create site"}
              </button>
            </div>

            {showLogoUrlInput ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={logoUrlInput}
                  onChange={(event) => setLogoUrlInput(event.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full rounded-[12px] border border-white/[0.1] bg-black/20 px-3 py-2.5 text-[12.5px] text-white/88 outline-none placeholder:text-white/26"
                />
                <SitezyButton variant="secondary" size="sm" onClick={() => handleLogoUrlSubmit()}>
                  Attach
                </SitezyButton>
              </div>
            ) : null}

            {siteImages.length ? (
              <div className="mt-3">
                <p className="mb-2 text-[11px] text-white/36">
                  Product, team, space, or brand photos — these are used before stock imagery.
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {siteImages.map((image) => (
                    <div
                      key={image.url}
                      className="group relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-[12px] border border-white/[0.1] bg-white/[0.04]"
                    >
                      <img
                        src={image.url}
                        alt={image.altText || image.name || "Uploaded website image"}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        title="Remove image from this project"
                        onClick={() => removeSiteImage(image.url)}
                        disabled={isLoading || isSiteImagesUploading}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white/80 opacity-0 transition-opacity hover:text-white disabled:cursor-not-allowed group-hover:opacity-100"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 flex items-start gap-2 rounded-[12px] border border-[rgba(255,100,100,0.22)] bg-[rgba(255,100,100,0.08)] px-3 py-2.5 text-[11px] leading-5 text-[#ffc4c4]">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleLogoFile(file);
            }}
          />
          <input
            ref={siteImagesInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = event.target.files;
              if (files?.length) void handleSiteImageFiles(files);
            }}
          />

          {/* Example prompts */}
          <div className="mt-5 flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setInput(example);
                  composerRef.current?.focus();
                }}
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[11.5px] text-white/52 transition-all hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white/78 disabled:opacity-40"
              >
                {example}
              </button>
            ))}
          </div>

          {/* Vibe presets */}
          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Set a vibe (optional)</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {VIBE_PRESETS.map((preset) => {
                const active = selectedVibe === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={isLoading}
                    onClick={() => applyVibe(preset)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all disabled:opacity-40 ${
                      active
                        ? "border-[rgba(91,140,255,0.4)] bg-[rgba(91,140,255,0.14)] text-white"
                        : "border-white/[0.08] bg-white/[0.02] text-white/62 hover:bg-white/[0.05] hover:text-white/85"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: preset.dot }} />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
