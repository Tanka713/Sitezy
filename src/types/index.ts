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
  pages: BlueprintPage[];
  designDirection: string;
  animationStyle: AnimationStyle;
  navigationStyle?: "minimal" | "full" | "sidebar" | "floating";
  footerStyle?: "simple" | "detailed" | "bold" | "minimal";
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
export interface SmartBrief {
  logoUrl?: string;
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
  generatorMode?: "quick" | "smart"; // defaults to "quick" when absent
  smartBrief?: SmartBrief;           // only populated in "smart" mode
  // ── Enriched context ───────────────────────────────────────────────────────
  hasLogo?: boolean;   // logo image was uploaded — AI should use __LOGO__ placeholder in navbar
  currency?: string;   // detected currency, e.g. "AED (د.إ)", "GBP (£)"
}

export interface Project {
  id: string;
  name: string;
  brief: SiteBrief;
  blueprint: SiteBlueprint | null;
  pages: ProjectPage[];
  files: Record<string, VirtualFile>;
  media: ProjectMediaAsset[];
  createdAt: string;
  updatedAt: string;
  status: "draft" | "generating" | "ready" | "error";
}

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface ProjectSnapshot {
  project: Project;
  editorState: EditorState;
  aiChats: AIChatMessage[];
}

// ─── Generation Types ─────────────────────────────────────────────────────────

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
export type RightPanelTab = "ai" | "properties" | "blocks" | "style";
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
  type: "text" | "textarea" | "number" | "datetime-local";
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
  collectionFields: CanvasCollectionField[];
  collectionItems: CanvasCollectionItem[];
  linkTargetNodeId: string | null;
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
  borderStyle: string;
  borderColor: string | null;
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
