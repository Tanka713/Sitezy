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
}

export interface Project {
  id: string;
  name: string;
  brief: SiteBrief;
  blueprint: SiteBlueprint | null;
  pages: ProjectPage[];
  files: Record<string, VirtualFile>;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "generating" | "ready" | "error";
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

export type LeftPanelTab = "pages" | "files" | "components";
export type RightPanelTab = "ai" | "properties" | "blocks" | "design";
export type PreviewMode = "preview" | "code" | "split";
export type DevicePreview = "desktop" | "tablet" | "mobile";

export interface EditorState {
  selectedPageId: string | null;
  selectedFileId: string | null;
  selectedSectionId: string | null;
  leftPanelTab: LeftPanelTab;
  rightPanelTab: RightPanelTab;
  previewMode: PreviewMode;
  devicePreview: DevicePreview;
  isFullPreview: boolean;
  visualEditMode: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
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
  | "newsletter";

export interface BlockDefinition {
  type: BlockType;
  name: string;
  description: string;
  icon: string;
  category: "layout" | "content" | "media" | "conversion" | "navigation";
}
