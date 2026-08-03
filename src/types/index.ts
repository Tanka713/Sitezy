// ─── Core Domain Types ─────────────────────────────────────────────────────────

export type LayoutStyle =
  | "editorial"
  | "bento"
  | "asymmetric"
  | "split-screen"
  | "grid"
  | "storytelling"
  | "card-based"
  | "zigzag"
  | "product-first"
  | "magazine"
  | "sidebar-led";

export type SiteFormat =
  | "editorial-feature"
  | "campaign-poster"
  | "menu-first-catalog"
  | "club-community"
  | "showroom-split"
  | "story-journey"
  | "magazine-rail"
  | "product-showroom"
  | "gallery-showcase"
  | "trust-proof";

export type AnimationStyle = "none" | "subtle" | "moderate" | "expressive";

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
  muted?: string;
  border?: string;
  [key: string]: string | undefined;
}

export interface Typography {
  headingFont: string;
  bodyFont: string;
  style: string;
  headingWeight?: string;
  lineHeight?: string;
}

export interface SiteBlueprint {
  siteName: string;
  tagline: string;
  brandPersonality: string;
  colorScheme: ColorScheme;
  typography: Typography;
  layoutStyle: LayoutStyle;
  siteFormat?: SiteFormat;
  signatureShell?: string;
  heroApproach?: string;
  sectionRhythm?: string;
  pages: BlueprintPage[];
  designDirection: string;
  animationStyle: AnimationStyle;
  navigationStyle?: "minimal" | "full" | "sidebar" | "floating";
  footerStyle?: "simple" | "detailed" | "bold" | "minimal";
  generationPlan?: unknown;
  creativeDirection?: {
    conceptName?: string;
    brandCore?: string;
    brandWorld?: string;
    audienceFantasy?: string;
    visualSignature?: string;
    layoutDna?: string;
    experiencePrinciples?: string[];
    memorableMoments?: string[];
    antiGenericRules?: string[];
    colorStory?: string;
    typographyStory?: string;
    motionStory?: string;
  };
}

export interface BlueprintPage {
  id: string;
  name: string;
  slug: string;
  sections: string[];
  purpose: string;
  priority?: number;
}

export interface PageSection {
  id: string;
  type: string;
  name: string;
  startLine?: number;
  endLine?: number;
}

export interface ProjectPage {
  id: string;
  name: string;
  slug: string;
  sections: PageSection[];
  purpose: string;
  html: string;
  status: "pending" | "generating" | "done" | "error";
  error?: string;
  revision?: number;
  meta?: ProjectPageMeta;
}

export interface ProjectSeoSettings {
  siteTitle: string;
  siteDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noindex: boolean;
}

export type ProjectPageKind = "static" | "cms_listing" | "cms_detail";
export type ProjectPageApprovalStatus = "draft" | "in_review" | "approved";

export interface ProjectPageSeoSettings {
  title: string;
  description: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noindex: boolean;
}

export interface ProjectPageCmsSeoFieldMapping {
  title: string | null;
  description: string | null;
  ogImageUrl: string | null;
}

export interface ProjectPageCmsBinding {
  collectionId: string;
  collectionSlug: string | null;
  itemLimit: number | null;
  targetNodeId: string | null;
  detailPageId: string | null;
  detailSlugParam: string;
  fieldMapping: Record<string, string>;
  seoFieldMapping: ProjectPageCmsSeoFieldMapping;
}

export interface ProjectPageMeta {
  pageKind: ProjectPageKind;
  seo: ProjectPageSeoSettings | null;
  cmsBinding: ProjectPageCmsBinding | null;
  approvalStatus: ProjectPageApprovalStatus;
  shareTitle: string | null;
}

export interface VirtualFile {
  id: string;
  name: string;
  path: string;
  content: string;
  type: "html" | "css" | "js" | "json" | "md" | "config";
  language: string;
}

export interface ProjectMediaAsset {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string | null;
  kind: "image" | "video";
  storageBucket: string | null;
  storagePath: string | null;
  thumbnailStorageBucket: string | null;
  thumbnailStoragePath: string | null;
  mimeType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export type BetaRole = "customer" | "customer_service" | "admin";
export type BetaAccessStatus = "invited" | "active" | "revoked";
export type BetaAccessSource = "open" | "bootstrap-admin" | "bootstrap-allowlist" | "beta-access" | "none";

export interface BetaAccessRecord {
  id: string;
  email: string;
  role: BetaRole;
  status: BetaAccessStatus;
  note: string | null;
  invitedBy: string | null;
  userId: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMemberBillingSnapshot {
  planName: string;
  tokenUsage: number;
  tokenLimit: number;
  remainingCredits: number;
}

export interface AdminMemberRecord extends BetaAccessRecord {
  billing: AdminMemberBillingSnapshot | null;
}

export interface CurrentBetaAccess {
  allowed: boolean;
  email: string;
  inviteOnlyBeta: boolean;
  role: BetaRole | null;
  status: BetaAccessStatus | null;
  source: BetaAccessSource;
}

export type BetaInterestSource = "signup" | "oauth" | "login" | "app";

export interface BetaInterestRequest {
  id: string;
  userId: string;
  email: string;
  userName: string | null;
  note: string | null;
  source: BetaInterestSource;
  persisted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SupportRequestKind = "bug" | "feature" | "support";
export type SupportRequestStatus = "pending" | "open" | "closed";
export type SupportReplyAuthorRole = "customer" | "customer_service" | "admin" | "system";
export type SupportReplyEmailDeliveryStatus = "sent" | "failed" | "not_requested";

export interface SupportRequestMetadata {
  route: string | null;
  browser: string | null;
}

export interface SupportRequestReply {
  id: string;
  requestId: string;
  authorRole: SupportReplyAuthorRole;
  authorName?: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  emailedAt?: string | null;
  emailDeliveryStatus?: SupportReplyEmailDeliveryStatus | null;
  emailError?: string | null;
}

export interface SupportRequest {
  id: string;
  ticketNumber: number | null;
  kind: SupportRequestKind;
  subject: string;
  message: string;
  status: SupportRequestStatus;
  metadata: SupportRequestMetadata;
  replies: SupportRequestReply[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerServiceSupportRequest extends SupportRequest {
  userEmail: string;
  userName: string | null;
}

export type WorkspaceTheme = "dark" | "light" | "system";
export type EditorDensityPreference = "compact" | "comfortable";
export type FontPreference = "default" | "system" | "geometric";
export type AIDesignStyle = "ai-pick" | "minimal" | "luxury" | "playful" | "brutalist" | "editorial" | "futuristic" | "organic" | "neo-retro" | "corporate" | "artisan" | "geometric" | "dark-modern";
export type AIStructurePreference = "clean" | "grid-heavy" | "asymmetric";
export type AIContentDensity = "short" | "balanced" | "detailed";
export type ProjectTypographyStyle = "modern-sans" | "editorial-serif" | "product-sans";
export type ProjectSpacingStyle = "compact" | "balanced" | "airy";
export type ProjectNavigationStyle = "minimal" | "full" | "floating";
export type ExportFormatPreference = "sitezy-zip" | "html-package" | "full-package";

export interface UserAccountProfile {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
  profileImageStorageBucket: string | null;
  profileImageStoragePath: string | null;
  emailConfirmedAt: string | null;
  phoneNumber: string | null;
  phoneCountryCode: string | null;
  phoneOtpStatus: PhoneOtpStatus | null;
}

export interface WorkspacePreferences {
  theme: WorkspaceTheme;
  editorDensity: EditorDensityPreference;
  animationsEnabled: boolean;
  uiScale: number;
  fontPreference: FontPreference;
}

export interface AIGenerationPreferences {
  designStyle: AIDesignStyle;
  creativityLevel: number;
  structurePreference: AIStructurePreference;
  contentDensity: AIContentDensity;
  adaptiveGenerationEnabled: boolean;
}

export interface ProjectDefaultPreferences {
  defaultPages: string[];
  defaultColorPalette: string[];
  typographyStyle: ProjectTypographyStyle;
  layoutSpacing: ProjectSpacingStyle;
  navigationStyle: ProjectNavigationStyle;
}

export interface ExportDeploymentPreferences {
  exportFormat: ExportFormatPreference;
  includeAssets: boolean;
  includeSeoFiles: boolean;
}

export type AccountLeadCaptureMode = "sitezy" | "disabled";
export type ProjectLeadCaptureMode = "inherit" | "sitezy" | "disabled";
export type LeadSubmissionKind = "contact" | "newsletter";
export type LeadNotificationDeliveryStatus = "sent" | "failed" | "not_requested";
export type LeadCaptureExportKind = "submissions" | "subscribers";
export type LeadCaptureRuntimeMode = "preview" | "published" | "disabled";

export interface IntegrationAnalyticsProviderSettings {
  enabled: boolean;
  measurementId: string;
}

export interface IntegrationMetaPixelSettings {
  enabled: boolean;
  pixelId: string;
}

export interface IntegrationAnalyticsSettings {
  enableSitezyAnalytics: boolean;
  ga4: IntegrationAnalyticsProviderSettings;
  metaPixel: IntegrationMetaPixelSettings;
}

export interface IntegrationWebhookDefaults {
  deliveryTimeoutSeconds: number;
}

export interface IntegrationPreferences {
  analyticsId: string;
  analytics: IntegrationAnalyticsSettings;
  webhooks: IntegrationWebhookDefaults;
  notificationEmail: string;
  contactCaptureDefault: AccountLeadCaptureMode;
  newsletterCaptureDefault: AccountLeadCaptureMode;
  primaryDomain: string;
}

export interface ProjectIntegrationSettings {
  notificationEmail: string | null;
  contactCapture: ProjectLeadCaptureMode;
  newsletterCapture: ProjectLeadCaptureMode;
}

export interface EffectiveProjectLeadCaptureSettings {
  notificationEmail: string | null;
  contactCapture: AccountLeadCaptureMode;
  newsletterCapture: AccountLeadCaptureMode;
}

export interface BillingHistoryEntry {
  id: string;
  label: string;
  date: string;
  amount: string;
  status: BillingInvoiceStatus;
  invoiceUrl: string | null;
}

export type BillingSubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";
export type BillingInvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible" | "pending";

export interface LeadSubmission {
  id: string;
  projectId: string;
  kind: LeadSubmissionKind;
  pagePath: string;
  formId: string | null;
  name: string | null;
  email: string | null;
  message: string | null;
  fields: Record<string, string>;
  notificationEmail: string | null;
  notificationDeliveryStatus: LeadNotificationDeliveryStatus;
  notificationError: string | null;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  projectId: string;
  email: string;
  name: string | null;
  sourceSubmissionId: string | null;
  subscribedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectLeadSummary {
  totalSubmissions: number;
  totalContactSubmissions: number;
  totalNewsletterSubmissions: number;
  totalSubscribers: number;
  latestSubmissionAt: string | null;
}

export interface LeadCaptureSubmitRequest {
  kind: LeadSubmissionKind;
  projectId?: string;
  pagePath: string;
  formId?: string;
  fields: Record<string, string>;
  honeypot?: string;
}

export interface LeadCaptureRuntimeConfig {
  mode: LeadCaptureRuntimeMode;
  projectId: string | null;
  contactCaptureEnabled: boolean;
  newsletterCaptureEnabled: boolean;
  submitEndpoint: string;
}

export interface BillingPreferences {
  planName: string;
  planId: string | null;
  planStatus: BillingSubscriptionStatus;
  tokenUsage: number;
  tokenLimit: number;
  allowanceCredits: number;
  manualGrantCredits: number;
  remainingCredits: number;
  paymentMethodLabel: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  checkoutEnabled: boolean;
  portalEnabled: boolean;
  billingHistory: BillingHistoryEntry[];
}

export interface ExperimentalPreferences {
  aiAutoEditSuggestions: boolean;
  smartLayoutRegeneration: boolean;
  advancedEditor: boolean;
  chatBasedEditing: boolean;
  selfLearningGenerator: boolean;
  trainingMode: boolean;
}

export type PhoneOtpStatus = "not_provided" | "pending_setup" | "enabled" | "disabled";

export type SecurityPreferences = Record<string, never>;

export interface CreativeModePreferences {
  surpriseMe: boolean;
  boldness: number;
  breakDesignRules: boolean;
}

export interface UserSettings {
  workspace: WorkspacePreferences;
  ai: AIGenerationPreferences;
  projectDefaults: ProjectDefaultPreferences;
  exportDeployment: ExportDeploymentPreferences;
  integrations: IntegrationPreferences;
  billing: BillingPreferences;
  experimental: ExperimentalPreferences;
  security: SecurityPreferences;
  creativeMode: CreativeModePreferences;
}

export interface UserSettingsPayload {
  account: UserAccountProfile;
  settings: UserSettings;
}

export type SiteType =
  | "Agency"
  | "Restaurant"
  | "Cafe"
  | "Gym"
  | "Personal Brand"
  | "Portfolio"
  | "SaaS Startup"
  | "Event"
  | "Consultancy"
  | "Real Estate"
  | "Creative Studio"
  | "Ecommerce"
  | "Board Game Cafe"
  | "Local Business"
  | "Other";

export type Tone =
  | "Professional"
  | "Playful"
  | "Minimal"
  | "Bold"
  | "Luxurious"
  | "Friendly"
  | "Edgy"
  | "Warm"
  | "Technical";

// ─── Smart Setup (Phase 2: advanced generator mode) ───────────────────────────
// These fields are collected in Phase 1 and wired into generation in Phase 2.
export type BusinessBriefStage =
  | "identity"
  | "offer"
  | "goal"
  | "style"
  | "content"
  | "logo"
  | "finalize"
  | "ready";

export type BusinessBriefFieldId =
  | "businessName"
  | "industry"
  | "location"
  | "businessDescription"
  | "offerSummary"
  | "audience"
  | "differentiators"
  | "websiteGoals"
  | "tone"
  | "styleDirection"
  | "brandColors"
  | "pages"
  | "services"
  | "testimonials"
  | "socialProof"
  | "story"
  | "contactInfo"
  | "leadCapture"
  | "logo";

export interface BriefLogoAsset {
  status: "uploaded" | "url" | "missing" | "unknown";
  assetId?: string;
  fileUrl?: string;
  fileName?: string;
  sourceUrl?: string;
  storageBucket?: string | null;
  storagePath?: string | null;
  altText?: string;
  notes?: string;
}

export interface BriefImageAsset {
  assetId?: string;
  url: string;
  name?: string;
  storageBucket?: string | null;
  storagePath?: string | null;
  altText?: string;
  notes?: string;
}

export interface BusinessContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  hours?: string;
  cta?: string;
  bookingEnabled?: boolean;
  leadCaptureEnabled?: boolean;
}

export interface BusinessBrief {
  version: 2;
  businessName: string;
  industry: string;
  location: string;
  businessDescription: string;
  offerSummary: string;
  audience: string;
  differentiators: string[];
  websiteGoals: string[];
  tone: string;
  styleDirection: string[];
  brandColors: string[];
  pages: string[];
  services: string[];
  testimonials: string[];
  socialProof: string[];
  story: string;
  references: string[];
  contactInfo: BusinessContactInfo;
  brand: {
    hasExistingStyle: boolean | null;
    mood: string[];
    references: string[];
  };
  assets: {
    logo: BriefLogoAsset;
    images: BriefImageAsset[];
  };
  intelligence: {
    stage: BusinessBriefStage;
    missingFields: BusinessBriefFieldId[];
    knownFields: BusinessBriefFieldId[];
    readinessScore: number;
    recommendedNextPrompt?: string | null;
    lastUpdatedAt?: string;
  };
}

export interface SmartBrief {
  logoUrl?: string;
  logo?: BriefLogoAsset;
  industry?: string;
  offeringsType?: string;   // "services" | "products" | "menu" | "portfolio" | "courses"
  offeringsText?: string;   // free-text list of offerings (parsed/used in Phase 2)
  stylePreference?: string; // e.g. "modern like Apple", "warm like Airbnb"
  contactDetails?: {
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
  };
}

export interface SiteBrief {
  siteName: string;
  description: string;
  siteType: SiteType | string;
  tone: Tone | string;
  pages: string[];
  features: string;
  targetAudience?: string;
  competitors?: string;
  colorPreference?: string;   // e.g. "warm earthy tones" or specific hex
  colorPalette?: string[];    // optional pre-picked hex colors
  imageStyle?: "photos" | "illustrations" | "minimal" | "none";
  // ── Generator mode (Phase 1+) ──────────────────────────────────────────────
  generatorMode?: "quick" | "smart" | "conversation"; // defaults to "quick" when absent
  smartBrief?: SmartBrief;           // only populated in "smart" mode
  businessBrief?: BusinessBrief;     // structured conversational brief
  // ── Enriched context ───────────────────────────────────────────────────────
  hasLogo?: boolean;   // logo image was uploaded — AI should use __LOGO__ placeholder in navbar
  currency?: string;   // detected currency, e.g. "AED (د.إ)", "GBP (£)"
  generationDesignStyle?: AIDesignStyle;
  generationCreativityLevel?: number;
  generationStructurePreference?: AIStructurePreference;
  generationContentDensity?: AIContentDensity;
  defaultTypographyStyle?: ProjectTypographyStyle;
  defaultLayoutSpacing?: ProjectSpacingStyle;
  defaultNavigationStyle?: ProjectNavigationStyle;
  creativeMode?: CreativeModePreferences;
}

export type ProjectPublishStatus = "unpublished" | "publishing" | "published" | "failed";
export type ProjectDeploymentStatus = "publishing" | "published" | "failed";
export type ProjectDomainStatus = "pending" | "verifying" | "active" | "failed";

export interface ProjectDomain {
  id: string;
  publishedSiteId: string;
  projectId: string;
  hostname: string;
  status: ProjectDomainStatus;
  isPrimary: boolean;
  verificationToken: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDeployment {
  id: string;
  publishedSiteId: string;
  projectId: string;
  versionNumber: number;
  status: ProjectDeploymentStatus;
  publishedUrl: string;
  pageCount: number;
  sourceDeploymentId?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PublishedSite {
  id: string;
  projectId: string;
  subdomain: string;
  status: ProjectPublishStatus;
  siteUrl: string;
  internalUrl: string;
  liveUrl: string;
  primaryDomain: string | null;
  activeDeploymentId: string | null;
  deploymentCount: number;
  lastPublishedAt: string | null;
  currentDeployment: ProjectDeployment | null;
  domains: ProjectDomain[];
  createdAt: string;
  updatedAt: string;
}

export type CmsCollectionPreset = "custom" | "blog_posts" | "case_studies" | "team_members" | "faq_items";
export type CmsFieldType = "text" | "textarea" | "rich_text" | "image" | "url" | "date";
export type CmsEntryStatus = "draft" | "published";

export interface CmsField {
  id: string;
  collectionId: string;
  projectId: string;
  key: string;
  label: string;
  type: CmsFieldType;
  required: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CmsEntry {
  id: string;
  collectionId: string;
  projectId: string;
  title: string;
  slug: string;
  status: CmsEntryStatus;
  values: Record<string, string>;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CmsCollection {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  preset: CmsCollectionPreset;
  fields: CmsField[];
  entries: CmsEntry[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectAnalyticsEventType =
  | "session"
  | "page_view"
  | "lead_conversion"
  | "subscriber_conversion"
  | "deployment_published";

export interface ProjectAnalyticsEvent {
  id: string;
  projectId: string;
  eventType: ProjectAnalyticsEventType;
  pagePath: string;
  sessionId: string | null;
  visitorId: string | null;
  referrer: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProjectAnalyticsTopPage {
  pagePath: string;
  views: number;
}

export interface ProjectAnalyticsSummary {
  sessions: number;
  pageViews: number;
  leadConversions: number;
  subscriberConversions: number;
  deploymentsPublished: number;
  topPages: ProjectAnalyticsTopPage[];
  daily: Array<{
    date: string;
    sessions: number;
    pageViews: number;
    leadConversions: number;
    subscriberConversions: number;
  }>;
}

export type ProjectWebhookEventType = "lead.created" | "subscriber.created" | "deployment.published";
export type ProjectWebhookDeliveryStatus = "pending" | "delivered" | "failed";

export interface ProjectWebhook {
  id: string;
  projectId: string;
  label: string;
  targetUrl: string;
  secret: string | null;
  events: ProjectWebhookEventType[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWebhookDelivery {
  id: string;
  webhookId: string;
  projectId: string;
  eventType: ProjectWebhookEventType;
  status: ProjectWebhookDeliveryStatus;
  attemptCount: number;
  responseStatus: number | null;
  responseBody: string | null;
  nextAttemptAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingAccount {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  planName: string;
  planStatus: BillingSubscriptionStatus;
  allowanceCredits: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethodLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoiceRecord {
  id: string;
  userId: string;
  stripeInvoiceId: string | null;
  status: BillingInvoiceStatus;
  amountCents: number;
  currency: string;
  invoiceUrl: string | null;
  hostedInvoiceUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingCreditGrant {
  id: string;
  userId: string;
  grantedBy: string | null;
  credits: number;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSummary {
  account: BillingAccount | null;
  invoices: BillingInvoiceRecord[];
  manualGrants: BillingCreditGrant[];
  snapshot: BillingPreferences;
}

export type ProjectCommentStatus = "open" | "resolved";

export interface ProjectComment {
  id: string;
  projectId: string;
  pageId: string | null;
  sectionId: string | null;
  authorUserId: string;
  authorName: string | null;
  body: string;
  status: ProjectCommentStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export type ProjectPageOperationType =
  | "replace_html"
  | "replace_sections"
  | "visual_edit"
  | "style_edit"
  | "structure_edit";

export interface ProjectPageOperation {
  id: string;
  projectId: string;
  pageId: string;
  revision: number;
  expectedRevision: number;
  operationType: ProjectPageOperationType;
  payload: Record<string, unknown>;
  actorUserId: string;
  createdAt: string;
}

export interface ProjectPageLock {
  id: string;
  projectId: string;
  pageId: string;
  userId: string;
  mode: "code" | "transform";
  expiresAt: string;
  createdAt: string;
}

export interface ProjectCollaborationPresence {
  userId: string;
  name: string;
  email: string | null;
  color: string;
  pageId: string | null;
  sectionId: string | null;
  nodeLabel: string | null;
  mode: "visual" | "code" | "preview";
  lastActiveAt: string;
}

export interface ProjectPreviewShare {
  id: string;
  projectId: string;
  pageId: string | null;
  token: string;
  label: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  shareUrl: string;
}

export interface ProjectCollaborationBootstrap {
  comments: ProjectComment[];
  locks: ProjectPageLock[];
  previewShares: ProjectPreviewShare[];
}

export interface Project {
  id: string;
  name: string;
  brief: SiteBrief;
  blueprint: SiteBlueprint | null;
  seo?: ProjectSeoSettings;
  integrationSettings?: ProjectIntegrationSettings | null;
  pages: ProjectPage[];
  files: Record<string, VirtualFile>;
  media: ProjectMediaAsset[];
  createdAt: string;
  updatedAt: string;
  status: "draft" | "generating" | "ready" | "error";
  generationJob?: ProjectGenerationJob | null;
  publishedSite?: PublishedSite | null;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface ProjectSnapshot {
  project: Project;
  editorState: EditorState;
  aiChats: AIChatMessage[];
}

// ─── Generation Types ─────────────────────────────────────────────────────────

export type ProjectGenerationJobKind = "full_site";
export type ProjectGenerationJobStatus = "queued" | "running" | "completed" | "failed" | "canceled";

export interface ProjectGenerationJob {
  id: string;
  projectId: string;
  userId: string;
  kind: ProjectGenerationJobKind;
  status: ProjectGenerationJobStatus;
  progressMessage: string | null;
  currentPageId: string | null;
  currentPageName: string | null;
  totalPages: number;
  completedPages: number;
  lockedBy: string | null;
  lockedAt: string | null;
  heartbeatAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GenerationStatus =
  | "idle"
  | "normalizing"
  | "blueprint"
  | "pages"
  | "done"
  | "error";

export interface GenerationLogEntry {
  id: string;
  time: number;
  msg: string;
  type: "info" | "success" | "error" | "progress";
}

// ─── Editor Types ─────────────────────────────────────────────────────────────

export type LeftPanelTab = "pages" | "navigator" | "add" | "files";
export type RightPanelTab = "ai" | "blocks" | "style" | "theme" | "page";
export type PreviewMode = "preview" | "code" | "split";
export type DevicePreview = "desktop" | "tablet" | "mobile";

export interface EditorState {
  selectedPageId: string | null;
  selectedFileId: string | null;
  selectedSectionId: string | null;
  selectedNode: CanvasNodeInfo | null;
  isCanvasEditing: boolean;
  leftPanelTab: LeftPanelTab;
  rightPanelTab: RightPanelTab;
  previewMode: PreviewMode;
  devicePreview: DevicePreview;
  isFullPreview: boolean;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  visualEditMode: boolean;
  canvasZoom: number;
  canvasPanX: number;
  canvasPanY: number;
  canvasGridVisible: boolean;
}

export interface CanvasCollectionField {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "list";
  placeholder?: string;
}

export interface CanvasCollectionItem {
  id: string;
  title: string;
  fields: Record<string, string>;
}

export interface CanvasWidgetField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "datetime-local" | "image";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface CanvasNodeInfo {
  nodeId: string;
  animationTargetNodeId: string | null;
  animationEntranceTargetNodeId: string | null;
  animationHoverTargetNodeId: string | null;
  mediaTargetNodeId: string | null;
  textTargetNodeId: string | null;
  textTargetTag: string | null;
  widgetNodeId: string | null;
  widgetKind: string | null;
  widgetLabel: string | null;
  widgetFields: CanvasWidgetField[];
  widgetState: Record<string, string>;
  collectionNodeId: string | null;
  collectionKind: string | null;
  collectionLabel: string | null;
  collectionFixed: boolean;
  collectionDataSource: "manual" | "cms";
  collectionCmsCollectionId: string | null;
  collectionCmsCollectionName: string | null;
  collectionCmsLimit: number | null;
  collectionFields: CanvasCollectionField[];
  collectionItems: CanvasCollectionItem[];
  linkTargetNodeId: string | null;
  buttonSurfaceNodeId: string | null;
  listTargetNodeId: string | null;
  parentNodeId: string | null;
  sectionId: string | null;
  sectionName: string | null;
  sectionType: string | null;
  tag: string;
  label: string;
  role: "section" | "container" | "text" | "button" | "image" | "input" | "media";
  depth: number;
  text: string;
  editableText: string | null;
  logoCollectionNodeId: string | null;
  logoItems: string[];
  src: string | null;
  altText: string | null;
  href: string | null;
  target: string | null;
  isImg: boolean;
  isVideo: boolean;
  isIframe: boolean;
  isInput: boolean;
  isSvg: boolean;
  hasEditableText: boolean;
  svgInner: string | null;
  svgStroke: string | null;
  svgFill: string | null;
  svgStrokeWidth: string | null;
  svgViewBox: string | null;
  isText: boolean;
  isBtn: boolean;
  isContainer: boolean;
  isSec: boolean;
  videoAutoplay: boolean;
  videoLoop: boolean;
  videoMuted: boolean;
  videoControls: boolean;
  embedAllow: string | null;
  embedAllowFullscreen: boolean;
  placeholder: string | null;
  inputType: string | null;
  inputName: string | null;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  fontVariantCaps: string;
  textAlign: string;
  lineHeight: string;
  letterSpacing: string;
  textDecoration: string;
  textDecorationStyle: string;
  textUnderlineOffset: string;
  textTransform?: string;
  whiteSpace: string;
  overflowWrap: string;
  wordBreak: string;
  textIndent: string;
  textOpacity: string;
  listStyleType: string;
  listStylePosition: string;
  columnCount: string;
  color: string | null;
  backgroundColor: string | null;
  buttonSurfaceBackgroundColor?: string | null;
  backgroundImage: string;
  hasBgImage: boolean;
  bgImageSrc: string | null;
  backgroundPosition: string;
  backgroundSize: string;
  backgroundRepeat: string;
  backgroundAttachment: string;
  backgroundBlendMode: string;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  width: string;
  height: string;
  objectFit: string;
  objectPosition: string;
  minWidth: string;
  maxWidth: string;
  borderRadius: string;
  border: string;
  borderWidth: string;
  buttonSurfaceBorderWidth?: string;
  borderStyle: string;
  buttonSurfaceBorderStyle?: string;
  borderColor: string | null;
  buttonSurfaceBorderColor?: string | null;
  position: string;
  zIndex: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
  display: string;
  parentDisplay: string | null;
  flexDir: string;
  flexWrap: string;
  flexGrow: string;
  flexShrink: string;
  flexBasis: string;
  alignSelf: string;
  alignContent: string;
  justifyContent: string;
  alignItems: string;
  justifyItems: string;
  gap: string;
  gridCols: string;
  gridRows: string;
  gridAutoFlow: string;
  rowGap: string;
  columnGap: string;
  gridColumn: string;
  gridRow: string;
  opacity: string;
  boxShadow: string;
  filter: string;
  backdropFilter: string;
  mixBlendMode: string;
  overflow: string;
  responsiveMode: DevicePreview;
  responsiveHasTabletOverrides: boolean;
  responsiveHasMobileOverrides: boolean;
  responsiveHasCurrentOverrides: boolean;
  responsiveCurrentProps: string[];
  animationIn: string;
  animationHover: string;
  hasCustomEntranceAnimation: boolean;
  hasCustomHoverAnimation: boolean;
  animationDuration: string;
  animationDelay: string;
  animationEase: string;
  secBg: string | null;
  secPadding: string | null;
  secHasBgImage: boolean;
  secBgImageSrc: string | null;
  secBgPosition: string;
  secBgSize: string;
  sectionVisualNodeId: string | null;
  sectionVisualSrc: string | null;
  sectionVisualKind: "image" | "video" | "embed" | null;
  isIconEl: boolean;
  iconWrapperNodeId: string | null;
  iconSize: number;
  iconIsBtn: boolean;
  iconBtnHref: string | null;
  iconBtnTarget: string | null;
  iconBtnNodeId: string | null;
}

// ─── AI Chat Types ────────────────────────────────────────────────────────────

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  pageId?: string;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface GenerateRequest {
  brief: SiteBrief;
  projectId: string;
}

export interface BlueprintResponse {
  blueprint: SiteBlueprint;
}

export interface PageGenerateRequest {
  blueprint: SiteBlueprint;
  page: BlueprintPage;
  brief: SiteBrief;
  existingPages?: string[];
}

export interface PageGenerateResponse {
  html: string;
  sections: PageSection[];
}

export interface AIEditRequest {
  instruction: string;
  pageHtml?: string;
  sectionId?: string;
  blueprint?: SiteBlueprint;
  context?: string;
}

export interface AIEditResponse {
  result: string;
  type: "html" | "text" | "suggestion";
}

// ─── Structured AI Edit Operations ────────────────────────────────────────────

export type AIEditOperationType =
  | "replaceSection"
  | "updateStyle"
  | "rewriteCopy"
  | "restructure"
  | "globalStyleChange"
  | "addSection"
  | "removeSection"
  | "reorderSections";

export interface AIEditOperation {
  type: AIEditOperationType;
  /** Target section ID (for section-scoped operations) */
  sectionId?: string;
  /** New HTML for replaceSection / addSection */
  html?: string;
  /** Design token overrides for updateStyle / globalStyleChange */
  tokenOverrides?: Record<string, string>;
  /** Copy replacements for rewriteCopy: { selectorOrId: newText } */
  copyUpdates?: Record<string, string>;
  /** New layout variant name for restructure */
  variant?: string;
  /** Position hint for addSection / reorderSections */
  position?: "before" | "after";
  /** Reference section ID for positioning */
  relativeTo?: string;
}

export interface AIAssistResult {
  /** Friendly message to display in chat */
  message: string;
  /** Structured edit operations to apply */
  operations: AIEditOperation[];
}

export type AIEditScope = "element" | "section" | "page" | "site";

export interface AIAssistContext {
  projectName: string;
  blueprint?: SiteBlueprint | null;
  brief?: SiteBrief | null;
  pageName?: string;
  pageHtml?: string;
  siteType?: string;
  /** Currently selected section ID in editor */
  selectedSectionId?: string | null;
  /** Currently selected element info */
  selectedElement?: {
    nodeId: string;
    tagName: string;
    textContent?: string;
    sectionId?: string;
  } | null;
  /** Conversation history for multi-turn */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Scope the user is editing at */
  scope?: AIEditScope;
}

export interface ExportRequest {
  project: Project;
}

// ─── Block Library ────────────────────────────────────────────────────────────

export type BlockType =
  | "navbar"
  | "hero"
  | "features"
  | "stats"
  | "logo-cloud"
  | "testimonials"
  | "gallery"
  | "pricing"
  | "team"
  | "faq"
  | "cta"
  | "contact"
  | "footer"
  | "timeline"
  | "menu-section"
  | "booking"
  | "blog-preview"
  | "case-studies"
  | "map"
  | "video"
  | "youtube"
  | "embed"
  | "newsletter";

export interface BlockDefinition {
  type: BlockType;
  name: string;
  description: string;
  icon: string;
  category: "layout" | "content" | "media" | "conversion" | "navigation";
}
