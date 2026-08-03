import type {
  SiteBrief,
  UserSettings,
  WorkspaceTheme,
  UserAccountProfile,
} from "@/types";
import { normalizeAccountLeadCaptureMode } from "@/lib/lead-capture";

export const SETTINGS_CACHE_KEY = "sitezy-user-settings-cache";

const DEFAULT_COLOR_PALETTE = ["#6b77ff", "#0f172a", "#111827", "#f4f7ff"];

export const defaultUserSettings: UserSettings = {
  workspace: {
    theme: "dark",
    editorDensity: "comfortable",
    animationsEnabled: true,
    uiScale: 100,
    fontPreference: "default",
  },
  ai: {
    designStyle: "ai-pick",
    creativityLevel: 64,
    structurePreference: "clean",
    contentDensity: "balanced",
    adaptiveGenerationEnabled: true,
  },
  projectDefaults: {
    defaultPages: ["Home"],
    defaultColorPalette: DEFAULT_COLOR_PALETTE,
    typographyStyle: "modern-sans",
    layoutSpacing: "balanced",
    navigationStyle: "minimal",
  },
  exportDeployment: {
    exportFormat: "sitezy-zip",
    includeAssets: true,
    includeSeoFiles: true,
  },
  integrations: {
    analyticsId: "",
    analytics: {
      enableSitezyAnalytics: true,
      ga4: {
        enabled: false,
        measurementId: "",
      },
      metaPixel: {
        enabled: false,
        pixelId: "",
      },
    },
    webhooks: {
      deliveryTimeoutSeconds: 10,
    },
    notificationEmail: "",
    contactCaptureDefault: "sitezy",
    newsletterCaptureDefault: "sitezy",
    primaryDomain: "",
  },
  billing: {
    planName: "Private Beta",
    planId: null,
    planStatus: "inactive",
    tokenUsage: 0,
    tokenLimit: 1000,
    allowanceCredits: 1000,
    manualGrantCredits: 0,
    remainingCredits: 1000,
    paymentMethodLabel: null,
    customerId: null,
    subscriptionId: null,
    periodStart: null,
    periodEnd: null,
    checkoutEnabled: false,
    portalEnabled: false,
    billingHistory: [],
  },
  experimental: {
    aiAutoEditSuggestions: true,
    smartLayoutRegeneration: true,
    advancedEditor: false,
    chatBasedEditing: false,
    selfLearningGenerator: false,
    trainingMode: false,
  },
  security: {},
  creativeMode: {
    surpriseMe: false,
    boldness: 55,
    breakDesignRules: false,
  },
};

export function normalizeUserSettings(input?: Partial<UserSettings> | null): UserSettings {
  const raw = input ?? {};
  return {
    workspace: {
      theme: normalizeTheme(raw.workspace?.theme),
      editorDensity: raw.workspace?.editorDensity === "compact" ? "compact" : "comfortable",
      animationsEnabled: raw.workspace?.animationsEnabled ?? defaultUserSettings.workspace.animationsEnabled,
      uiScale: clampNumber(raw.workspace?.uiScale, 85, 115, defaultUserSettings.workspace.uiScale),
      fontPreference: raw.workspace?.fontPreference === "system" || raw.workspace?.fontPreference === "geometric"
        ? raw.workspace.fontPreference
        : "default",
    },
    ai: {
      designStyle: normalizeEnum(
        raw.ai?.designStyle,
        ["ai-pick", "minimal", "luxury", "playful", "brutalist", "editorial", "futuristic"],
        defaultUserSettings.ai.designStyle
      ),
      creativityLevel: clampNumber(raw.ai?.creativityLevel, 0, 100, defaultUserSettings.ai.creativityLevel),
      structurePreference: normalizeEnum(
        raw.ai?.structurePreference,
        ["clean", "grid-heavy", "asymmetric"],
        defaultUserSettings.ai.structurePreference
      ),
      contentDensity: normalizeEnum(
        raw.ai?.contentDensity,
        ["short", "balanced", "detailed"],
        defaultUserSettings.ai.contentDensity
      ),
      adaptiveGenerationEnabled:
        raw.ai?.adaptiveGenerationEnabled ?? defaultUserSettings.ai.adaptiveGenerationEnabled,
    },
    projectDefaults: {
      defaultPages: normalizePageList(raw.projectDefaults?.defaultPages),
      defaultColorPalette: normalizePalette(raw.projectDefaults?.defaultColorPalette),
      typographyStyle: normalizeEnum(
        raw.projectDefaults?.typographyStyle,
        ["modern-sans", "editorial-serif", "product-sans"],
        defaultUserSettings.projectDefaults.typographyStyle
      ),
      layoutSpacing: normalizeEnum(
        raw.projectDefaults?.layoutSpacing,
        ["compact", "balanced", "airy"],
        defaultUserSettings.projectDefaults.layoutSpacing
      ),
      navigationStyle: normalizeEnum(
        raw.projectDefaults?.navigationStyle,
        ["minimal", "full", "floating"],
        defaultUserSettings.projectDefaults.navigationStyle
      ),
    },
    exportDeployment: {
      exportFormat: normalizeEnum(
        raw.exportDeployment?.exportFormat,
        ["sitezy-zip", "html-package", "full-package"],
        defaultUserSettings.exportDeployment.exportFormat
      ),
      includeAssets: raw.exportDeployment?.includeAssets ?? defaultUserSettings.exportDeployment.includeAssets,
      includeSeoFiles: raw.exportDeployment?.includeSeoFiles ?? defaultUserSettings.exportDeployment.includeSeoFiles,
    },
    integrations: {
      analyticsId: normalizeLegacyAnalyticsId(raw.integrations),
      analytics: {
        enableSitezyAnalytics:
          raw.integrations?.analytics?.enableSitezyAnalytics ??
          defaultUserSettings.integrations.analytics.enableSitezyAnalytics,
        ga4: {
          enabled:
            raw.integrations?.analytics?.ga4?.enabled ??
            Boolean(normalizeLegacyAnalyticsId(raw.integrations)),
          measurementId: normalizeLegacyAnalyticsId(raw.integrations),
        },
        metaPixel: {
          enabled:
            raw.integrations?.analytics?.metaPixel?.enabled ??
            Boolean(String(raw.integrations?.analytics?.metaPixel?.pixelId ?? "").trim()),
          pixelId: String(raw.integrations?.analytics?.metaPixel?.pixelId ?? "").trim(),
        },
      },
      webhooks: {
        deliveryTimeoutSeconds: clampNumber(
          raw.integrations?.webhooks?.deliveryTimeoutSeconds,
          3,
          60,
          defaultUserSettings.integrations.webhooks.deliveryTimeoutSeconds
        ),
      },
      notificationEmail: String(raw.integrations?.notificationEmail ?? "").trim(),
      contactCaptureDefault: normalizeAccountLeadCaptureMode(raw.integrations?.contactCaptureDefault),
      newsletterCaptureDefault: normalizeAccountLeadCaptureMode(raw.integrations?.newsletterCaptureDefault),
      primaryDomain: String(raw.integrations?.primaryDomain ?? "").trim(),
    },
    billing: {
      planName: String(raw.billing?.planName ?? defaultUserSettings.billing.planName).trim() || defaultUserSettings.billing.planName,
      planId: normalizeNullableString(raw.billing?.planId),
      planStatus: normalizeBillingPlanStatus(raw.billing?.planStatus),
      tokenUsage: clampNumber(raw.billing?.tokenUsage, 0, Number.MAX_SAFE_INTEGER, defaultUserSettings.billing.tokenUsage),
      tokenLimit: clampNumber(
        raw.billing?.tokenLimit,
        1,
        Number.MAX_SAFE_INTEGER,
        defaultUserSettings.billing.tokenLimit
      ),
      allowanceCredits: clampNumber(
        raw.billing?.allowanceCredits,
        0,
        Number.MAX_SAFE_INTEGER,
        defaultUserSettings.billing.allowanceCredits
      ),
      manualGrantCredits: clampNumber(
        raw.billing?.manualGrantCredits,
        0,
        Number.MAX_SAFE_INTEGER,
        defaultUserSettings.billing.manualGrantCredits
      ),
      remainingCredits: clampNumber(
        raw.billing?.remainingCredits,
        0,
        Number.MAX_SAFE_INTEGER,
        Math.max(
          0,
          clampNumber(raw.billing?.tokenLimit, 1, Number.MAX_SAFE_INTEGER, defaultUserSettings.billing.tokenLimit) -
            clampNumber(raw.billing?.tokenUsage, 0, Number.MAX_SAFE_INTEGER, defaultUserSettings.billing.tokenUsage)
        )
      ),
      paymentMethodLabel:
        typeof raw.billing?.paymentMethodLabel === "string" && raw.billing.paymentMethodLabel.trim()
          ? raw.billing.paymentMethodLabel.trim()
          : null,
      customerId: normalizeNullableString(raw.billing?.customerId),
      subscriptionId: normalizeNullableString(raw.billing?.subscriptionId),
      periodStart: normalizeNullableString(raw.billing?.periodStart),
      periodEnd: normalizeNullableString(raw.billing?.periodEnd),
      checkoutEnabled: raw.billing?.checkoutEnabled ?? defaultUserSettings.billing.checkoutEnabled,
      portalEnabled: raw.billing?.portalEnabled ?? defaultUserSettings.billing.portalEnabled,
      billingHistory: Array.isArray(raw.billing?.billingHistory)
        ? raw.billing!.billingHistory
            .map((entry) => ({
              id: String(entry.id ?? ""),
              label: String(entry.label ?? ""),
              date: String(entry.date ?? ""),
              amount: String(entry.amount ?? ""),
              status: normalizeBillingInvoiceStatus(entry.status),
              invoiceUrl:
                typeof entry.invoiceUrl === "string" && entry.invoiceUrl.trim()
                  ? entry.invoiceUrl.trim()
                  : null,
            }))
            .filter((entry) => entry.id && entry.label)
        : defaultUserSettings.billing.billingHistory,
    },
    experimental: {
      aiAutoEditSuggestions: raw.experimental?.aiAutoEditSuggestions ?? defaultUserSettings.experimental.aiAutoEditSuggestions,
      smartLayoutRegeneration: raw.experimental?.smartLayoutRegeneration ?? defaultUserSettings.experimental.smartLayoutRegeneration,
      advancedEditor: raw.experimental?.advancedEditor ?? defaultUserSettings.experimental.advancedEditor,
      chatBasedEditing: raw.experimental?.chatBasedEditing ?? defaultUserSettings.experimental.chatBasedEditing,
      selfLearningGenerator: raw.experimental?.selfLearningGenerator ?? defaultUserSettings.experimental.selfLearningGenerator,
      trainingMode: raw.experimental?.trainingMode ?? defaultUserSettings.experimental.trainingMode,
    },
    security: {},
    creativeMode: {
      surpriseMe: raw.creativeMode?.surpriseMe ?? defaultUserSettings.creativeMode.surpriseMe,
      boldness: clampNumber(raw.creativeMode?.boldness, 0, 100, defaultUserSettings.creativeMode.boldness),
      breakDesignRules: raw.creativeMode?.breakDesignRules ?? defaultUserSettings.creativeMode.breakDesignRules,
    },
  };
}

export function mergeUserSettings(
  current: UserSettings,
  patch?: Partial<UserSettings> | null
): UserSettings {
  if (!patch) return normalizeUserSettings(current);
  return normalizeUserSettings({
    ...current,
    ...patch,
    workspace: { ...current.workspace, ...patch.workspace },
    ai: { ...current.ai, ...patch.ai },
    projectDefaults: { ...current.projectDefaults, ...patch.projectDefaults },
    exportDeployment: { ...current.exportDeployment, ...patch.exportDeployment },
    integrations: {
      ...current.integrations,
      ...patch.integrations,
      analytics: {
        ...current.integrations.analytics,
        ...patch.integrations?.analytics,
        ga4: {
          ...current.integrations.analytics.ga4,
          ...patch.integrations?.analytics?.ga4,
        },
        metaPixel: {
          ...current.integrations.analytics.metaPixel,
          ...patch.integrations?.analytics?.metaPixel,
        },
      },
      webhooks: {
        ...current.integrations.webhooks,
        ...patch.integrations?.webhooks,
      },
    },
    billing: { ...current.billing, ...patch.billing },
    experimental: { ...current.experimental, ...patch.experimental },
    security: { ...current.security, ...patch.security },
    creativeMode: { ...current.creativeMode, ...patch.creativeMode },
  });
}

export function readCachedUserSettings(): UserSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    return normalizeUserSettings(JSON.parse(raw) as Partial<UserSettings>);
  } catch {
    return null;
  }
}

export function cacheUserSettings(settings: UserSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {}
}

export function broadcastUserSettings(settings: UserSettings) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sitezy-settings-updated", { detail: settings }));
}

export function clearCachedUserSettings() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SETTINGS_CACHE_KEY);
  } catch {}
}

export function resetSignedOutUserSettings() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  clearCachedUserSettings();
  applyUserSettingsToDocument(defaultUserSettings);
  broadcastUserSettings(defaultUserSettings);
}

export function applyUserSettingsToDocument(settings: UserSettings) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const root = document.documentElement;
  const theme = resolveWorkspaceTheme(settings.workspace.theme);
  const fontPreference = settings.workspace.fontPreference === "system" ? "system" : "default";
  root.dataset.theme = theme;
  root.dataset.motion = settings.workspace.animationsEnabled ? "default" : "reduced";
  root.dataset.density = settings.workspace.editorDensity;
  root.dataset.fontPreference = fontPreference;
  root.style.setProperty("--sz-ui-scale", String(settings.workspace.uiScale / 100));
}

export function resolveWorkspaceTheme(theme: WorkspaceTheme): "dark" | "light" {
  if (theme === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return theme === "light" ? "light" : "dark";
}

export function buildBriefFromSettings(brief: SiteBrief, settings: UserSettings): SiteBrief {
  return {
    ...brief,
    pages: brief.pages.length ? brief.pages : settings.projectDefaults.defaultPages,
    colorPalette: brief.colorPalette?.length ? brief.colorPalette : settings.projectDefaults.defaultColorPalette,
    colorPreference: brief.colorPreference || settings.projectDefaults.defaultColorPalette.join(", "),
    generationDesignStyle: brief.generationDesignStyle ?? settings.ai.designStyle,
    generationCreativityLevel: brief.generationCreativityLevel ?? settings.creativeMode.boldness,
    generationStructurePreference: brief.generationStructurePreference ?? settings.ai.structurePreference,
    generationContentDensity: brief.generationContentDensity ?? settings.ai.contentDensity,
    defaultTypographyStyle: brief.defaultTypographyStyle ?? settings.projectDefaults.typographyStyle,
    defaultLayoutSpacing: brief.defaultLayoutSpacing ?? settings.projectDefaults.layoutSpacing,
    defaultNavigationStyle: brief.defaultNavigationStyle ?? settings.projectDefaults.navigationStyle,
    creativeMode: brief.creativeMode ?? settings.creativeMode,
  };
}

export function buildInitialBriefSettings(settings: UserSettings) {
  return {
    pages: settings.projectDefaults.defaultPages,
    colorPalette: settings.projectDefaults.defaultColorPalette,
    colorPreference: settings.projectDefaults.defaultColorPalette.join(", "),
    generationDesignStyle: settings.ai.designStyle,
    generationCreativityLevel: settings.creativeMode.boldness,
    generationStructurePreference: settings.ai.structurePreference,
    generationContentDensity: settings.ai.contentDensity,
    defaultTypographyStyle: settings.projectDefaults.typographyStyle,
    defaultLayoutSpacing: settings.projectDefaults.layoutSpacing,
    defaultNavigationStyle: settings.projectDefaults.navigationStyle,
    creativeMode: settings.creativeMode,
  } satisfies Partial<SiteBrief>;
}

export function buildAccountProfile(input: Partial<UserAccountProfile> & Pick<UserAccountProfile, "id" | "email">): UserAccountProfile {
  return {
    id: input.id,
    email: input.email,
    name: input.name?.trim() || inferAccountName(input.email),
    profileImageUrl: input.profileImageUrl ?? null,
    profileImageStorageBucket: input.profileImageStorageBucket ?? null,
    profileImageStoragePath: input.profileImageStoragePath ?? null,
    emailConfirmedAt: input.emailConfirmedAt ?? null,
    phoneNumber: input.phoneNumber ?? null,
    phoneCountryCode: input.phoneCountryCode ?? null,
    phoneOtpStatus: input.phoneOtpStatus ?? null,
  };
}

function inferAccountName(email: string) {
  const base = email.split("@")[0] || "Sitezy User";
  return base
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeTheme(theme?: WorkspaceTheme | null): WorkspaceTheme {
  return theme === "light" || theme === "system" ? theme : "dark";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeEnum<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : fallback;
}

function normalizePalette(value: unknown): string[] {
  if (!Array.isArray(value)) return defaultUserSettings.projectDefaults.defaultColorPalette;
  const cleaned = value
    .map((entry) => String(entry).trim())
    .filter((entry) => /^#[0-9a-f]{6}$/i.test(entry));
  return cleaned.length ? cleaned.slice(0, 6) : defaultUserSettings.projectDefaults.defaultColorPalette;
}

function normalizePageList(value: unknown): string[] {
  if (!Array.isArray(value)) return defaultUserSettings.projectDefaults.defaultPages;
  const cleaned = value
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .slice(0, 8);
  return cleaned.length ? cleaned : defaultUserSettings.projectDefaults.defaultPages;
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeLegacyAnalyticsId(value: Partial<UserSettings["integrations"]> | undefined) {
  return String(value?.analytics?.ga4?.measurementId ?? value?.analyticsId ?? "").trim();
}

function normalizeBillingPlanStatus(value: unknown): UserSettings["billing"]["planStatus"] {
  return normalizeEnum(
    value,
    ["inactive", "trialing", "active", "past_due", "canceled", "unpaid"],
    defaultUserSettings.billing.planStatus
  );
}

function normalizeBillingInvoiceStatus(value: unknown): UserSettings["billing"]["billingHistory"][number]["status"] {
  return normalizeEnum(value, ["draft", "open", "paid", "void", "uncollectible", "pending"], "pending");
}
