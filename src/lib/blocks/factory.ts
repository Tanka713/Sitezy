import type { Project, ProjectPage } from "@/types";
import { uid } from "@/lib/utils";
import { resolveBlockAlias } from "./aliases";

interface DesignTokens {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
  muted: string;
  border: string;
  sectionPadding: string;
  containerWidth: string;
  radius: string;
  buttonRadius: string;
  shadow: string;
  softBg: string;
  strongBg: string;
  headingFont: string;
  bodyFont: string;
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "124, 58, 237";
  const value = Number.parseInt(clean, 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function inferTokens(project: Project): DesignTokens {
  const colors = project.blueprint?.colorScheme;
  const typography = project.blueprint?.typography;
  const flavor = `${project.brief?.tone || ""} ${project.blueprint?.brandPersonality || ""} ${project.blueprint?.designDirection || ""}`.toLowerCase();

  const playful = /playful|friendly|warm/.test(flavor);
  const luxury = /lux|premium|elegant|editorial/.test(flavor);
  const bold = /bold|edgy|expressive/.test(flavor);
  const minimal = /minimal|clean|technical|professional/.test(flavor);

  const primary = colors?.primary || "#7c3aed";
  const text = colors?.text || "#111111";
  const bg = colors?.bg || "#ffffff";
  const muted = colors?.muted || "#6b7280";

  return {
    primary,
    secondary: colors?.secondary || primary,
    accent: colors?.accent || primary,
    bg,
    text,
    muted,
    border: colors?.border || "rgba(15, 23, 42, 0.10)",
    sectionPadding: luxury ? "112px 40px" : bold ? "104px 36px" : minimal ? "88px 32px" : "96px 36px",
    containerWidth: luxury ? "1240px" : "1160px",
    radius: playful ? "28px" : luxury ? "22px" : minimal ? "16px" : "18px",
    buttonRadius: playful ? "999px" : luxury ? "16px" : "12px",
    shadow: luxury
      ? "0 18px 60px rgba(15, 23, 42, 0.16)"
      : minimal
      ? "0 10px 30px rgba(15, 23, 42, 0.08)"
      : "0 16px 44px rgba(15, 23, 42, 0.12)",
    softBg: `rgba(${hexToRgb(primary)}, 0.08)`,
    strongBg: bold || luxury ? text : primary,
    headingFont: typography?.headingFont || "Inter",
    bodyFont: typography?.bodyFont || "Inter",
  };
}

function shell(id: string, type: string, name: string, tokens: DesignTokens, inner: string, bg?: string): string {
  return `<section data-sz-section-id="${id}" data-sz-section-type="${type}" data-sz-section-name="${name}" style="padding:${tokens.sectionPadding};background:${bg || "transparent"};font-family:'${tokens.bodyFont}',system-ui,sans-serif;color:${tokens.text};"><div style="width:min(100%,${tokens.containerWidth});margin:0 auto;">${inner}</div></section>`;
}

interface SmartFormField {
  kind: "input" | "textarea" | "select";
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  options?: string[];
  rows?: number;
  full?: boolean;
}

interface SmartFormSpec {
  title: string;
  description: string;
  submitLabel: string;
  fields: SmartFormField[];
}

type CollectionFieldType = "text" | "textarea" | "image" | "list";
type WidgetFieldType = "text" | "textarea" | "number" | "datetime-local";

interface CollectionFieldDef {
  key: string;
  label: string;
  type?: CollectionFieldType;
  placeholder?: string;
}

interface WidgetFieldDef {
  key: string;
  label: string;
  type?: WidgetFieldType;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

function escAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function collectionAttrs(
  kind: string,
  label: string,
  fields: CollectionFieldDef[],
  options?: { fixed?: boolean },
): string {
  return [
    `data-sz-collection-kind="${escAttr(kind)}"`,
    `data-sz-collection-label="${escAttr(label)}"`,
    `data-sz-collection-fields="${escAttr(JSON.stringify(fields))}"`,
    options?.fixed ? `data-sz-collection-fixed="1"` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function collectionItemAttr(key?: string): string {
  return key
    ? `data-sz-item="1" data-sz-item-key="${escAttr(key)}"`
    : `data-sz-item="1"`;
}

function collectionFieldAttr(key: string, type: CollectionFieldType = "text"): string {
  return type === "text"
    ? `data-sz-field="${escAttr(key)}"`
    : `data-sz-field="${escAttr(key)}" data-sz-field-type="${type}"`;
}

function widgetAttrs(
  kind: string,
  label: string,
  fields: WidgetFieldDef[],
  state: Record<string, string>,
): string {
  return [
    `data-sz-widget-kind="${escAttr(kind)}"`,
    `data-sz-widget-label="${escAttr(label)}"`,
    `data-sz-widget-fields="${escAttr(JSON.stringify(fields))}"`,
    `data-sz-widget-state="${escAttr(JSON.stringify(state))}"`,
  ].join(" ");
}

function widgetPartAttr(key: string): string {
  return `data-sz-widget-part="${escAttr(key)}"`;
}

function defaultCountdownTarget(): string {
  const target = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const iso = new Date(target.getTime() - target.getTimezoneOffset() * 60 * 1000).toISOString();
  return iso.slice(0, 16);
}

function socialIconPath(label: string): string {
  const normalized = String(label || "").trim().toLowerCase();
  if (normalized.includes("instagram")) {
    return "M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zm4.5 3a5 5 0 1 1 0 10A5 5 0 0 1 12 7zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.25-.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z";
  }
  if (normalized.includes("linkedin")) {
    return "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zm2-3a2 2 0 1 1 0-4 2 2 0 0 1 0 4z";
  }
  if (normalized.includes("github")) {
    return "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z";
  }
  return "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";
}

function inferFormSpec(project: Project, page?: ProjectPage | null): SmartFormSpec {
  const siteType = String(project.brief?.siteType ?? "").toLowerCase();
  const tone = String(project.brief?.tone ?? "").toLowerCase();
  const pageContext = `${page?.name ?? ""} ${page?.slug ?? ""}`.toLowerCase();
  const bookingLike = /restaurant|cafe|event|board game cafe/.test(siteType) || /book|reserve|reservation/.test(pageContext);
  const fitnessLike = /gym/.test(siteType);
  const propertyLike = /real estate/.test(siteType);
  const supportLike = /ecommerce/.test(siteType) || /support|help/.test(pageContext);
  const demoLike = /saas|startup|technical/.test(siteType);
  const creativeLeadLike = /agency|consultancy|creative studio|portfolio|personal brand|local business/.test(siteType);

  if (bookingLike) {
    return {
      title: "Book your visit",
      description: "Share a few details and we’ll confirm the best time for you.",
      submitLabel: "Request booking",
      fields: [
        { kind: "input", label: "Name", name: "name", type: "text", placeholder: "Your full name" },
        { kind: "input", label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
        { kind: "input", label: "Phone", name: "phone", type: "tel", placeholder: "+1 (555) 000-0000" },
        { kind: "input", label: "Date", name: "date", type: "date" },
        { kind: "input", label: "Time", name: "time", type: "time" },
        { kind: "select", label: "Party Size", name: "party_size", options: ["2 guests", "4 guests", "6 guests", "8+ guests"] },
        { kind: "textarea", label: "Notes", name: "notes", placeholder: "Anything we should know before your visit?", rows: 4, full: true },
      ],
    };
  }

  if (fitnessLike) {
    return {
      title: "Start your plan",
      description: "Tell us your goals and we’ll match you with the right program.",
      submitLabel: "Book intro session",
      fields: [
        { kind: "input", label: "Name", name: "name", type: "text", placeholder: "Your full name" },
        { kind: "input", label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
        { kind: "input", label: "Phone", name: "phone", type: "tel", placeholder: "+1 (555) 000-0000" },
        { kind: "select", label: "Primary Goal", name: "goal", options: ["Lose weight", "Build muscle", "Increase energy", "Improve endurance"] },
        { kind: "select", label: "Preferred Time", name: "time_pref", options: ["Morning", "Afternoon", "Evening", "Flexible"] },
        { kind: "textarea", label: "Notes", name: "notes", placeholder: "Anything you want your coach to know?", rows: 4, full: true },
      ],
    };
  }

  if (propertyLike) {
    return {
      title: "Request property details",
      description: "Let us know what you’re looking for and we’ll follow up with the right options.",
      submitLabel: "Request a showing",
      fields: [
        { kind: "input", label: "Name", name: "name", type: "text", placeholder: "Your full name" },
        { kind: "input", label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
        { kind: "input", label: "Phone", name: "phone", type: "tel", placeholder: "+1 (555) 000-0000" },
        { kind: "input", label: "Preferred Area", name: "area", type: "text", placeholder: "Neighborhood or city" },
        { kind: "select", label: "Budget", name: "budget", options: ["Under $500k", "$500k - $1M", "$1M - $2M", "$2M+"] },
        { kind: "textarea", label: "Notes", name: "notes", placeholder: "What kind of property are you looking for?", rows: 4, full: true },
      ],
    };
  }

  if (supportLike) {
    return {
      title: "How can we help?",
      description: "Share the issue and we’ll get back to you with the right next step.",
      submitLabel: "Contact support",
      fields: [
        { kind: "input", label: "Name", name: "name", type: "text", placeholder: "Your full name" },
        { kind: "input", label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
        { kind: "input", label: "Order Number", name: "order_number", type: "text", placeholder: "#12345" },
        { kind: "select", label: "Topic", name: "topic", options: ["Order issue", "Product question", "Billing", "Returns", "Other"] },
        { kind: "textarea", label: "Message", name: "message", placeholder: "Tell us what’s going on.", rows: 4, full: true },
      ],
    };
  }

  if (demoLike || creativeLeadLike) {
    return {
      title: demoLike ? "Request a demo" : "Tell us about your project",
      description: demoLike
        ? "A few details helps us tailor the walkthrough."
        : "Share the scope and we’ll come back with the best next step.",
      submitLabel: demoLike ? "Book demo" : tone.includes("lux") ? "Start the conversation" : "Request proposal",
      fields: [
        { kind: "input", label: "Name", name: "name", type: "text", placeholder: "Your full name" },
        { kind: "input", label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
        { kind: "input", label: "Company", name: "company", type: "text", placeholder: "Company or brand" },
        { kind: "select", label: "Project Type", name: "project_type", options: demoLike ? ["Product demo", "Pricing questions", "Implementation", "Partnership"] : ["Website redesign", "Landing page", "Brand refresh", "Ongoing support"] },
        { kind: "select", label: "Budget", name: "budget", options: ["Under $5k", "$5k - $15k", "$15k - $50k", "$50k+"] },
        { kind: "textarea", label: "Project Brief", name: "message", placeholder: "What are you building and what outcome matters most?", rows: 5, full: true },
      ],
    };
  }

  return {
    title: "Get in touch",
    description: "Send us a quick message and we’ll follow up soon.",
    submitLabel: "Send message",
    fields: [
      { kind: "input", label: "Name", name: "name", type: "text", placeholder: "Your full name" },
      { kind: "input", label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
      { kind: "input", label: "Subject", name: "subject", type: "text", placeholder: "What is this about?" },
      { kind: "textarea", label: "Message", name: "message", placeholder: "Tell us how we can help.", rows: 5, full: true },
    ],
  };
}

function renderFormField(field: SmartFormField, tokens: DesignTokens): string {
  const shellStyle = field.full ? "grid-column:1 / -1;" : "";
  const label = `<label style="display:block;margin-bottom:6px;font-size:12px;font-weight:700;letter-spacing:.02em;color:${tokens.text};">${field.label}</label>`;
  const controlStyle = `width:100%;padding:13px 16px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;box-sizing:border-box;font-family:'${tokens.bodyFont}',system-ui,sans-serif;`;

  if (field.kind === "textarea") {
    return `<div style="${shellStyle}">${label}<textarea name="${field.name}" rows="${field.rows ?? 4}" placeholder="${field.placeholder ?? ""}" style="${controlStyle}resize:vertical;min-height:132px;"></textarea></div>`;
  }

  if (field.kind === "select") {
    return `<div style="${shellStyle}">${label}<select name="${field.name}" style="${controlStyle}">${(field.options ?? []).map((option, index) => `<option value="${option.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${index === 0 ? option : option}</option>`).join("")}</select></div>`;
  }

  return `<div style="${shellStyle}">${label}<input type="${field.type ?? "text"}" name="${field.name}" placeholder="${field.placeholder ?? ""}" style="${controlStyle}" /></div>`;
}

export function buildBlockHtml(blockId: string, project: Project): string {
  const resolvedBlockId = resolveBlockAlias(blockId);
  const tokens = inferTokens(project);
  const siteName = project.blueprint?.siteName || project.name || "Brand";
  const tagline = project.blueprint?.tagline || project.brief?.description || "Describe what makes this project stand out.";
  const id = `sec-${uid()}`;
  const primaryGlow = `rgba(${hexToRgb(tokens.primary)}, 0.18)`;

  switch (resolvedBlockId) {
    case "navbar": {
      const navbarState = {
        brand: siteName,
        ctaLabel: "Book a call",
        ctaUrl: "#",
      };
      const navbarLinks = [["Home", "#"], ["About", "#"], ["Services", "#"]] as const;
      return `<nav data-sz-section-id="${id}" data-sz-section-type="navbar" data-sz-section-name="Navbar" ${widgetAttrs("navbar", "Navbar", [
        { key: "brand", label: "Brand", type: "text", placeholder: siteName },
        { key: "ctaLabel", label: "CTA Label", type: "text", placeholder: "Book a call" },
        { key: "ctaUrl", label: "CTA URL", type: "text", placeholder: "#" },
      ], navbarState)} style="position:sticky;top:0;z-index:40;padding:18px 32px;border-bottom:1px solid ${tokens.border};background:color-mix(in srgb, ${tokens.bg} 92%, white 8%);backdrop-filter:blur(18px);font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><div style="width:min(100%,${tokens.containerWidth});margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:20px;"><a href="#" ${widgetPartAttr("brand")} style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:22px;font-weight:800;color:${tokens.text};text-decoration:none;">${navbarState.brand}</a><div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;"><div ${collectionAttrs("nav-links", "Navigation Links", [
        { key: "label", label: "Label", type: "text", placeholder: "Home" },
        { key: "url", label: "URL", type: "text", placeholder: "#" },
      ])} data-sz-collection-items="1" style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">${navbarLinks.map(([label, url], index) => `<div ${collectionItemAttr(`nav-link-${index + 1}`)}><a data-sz-nav-link="1" href="${url}" style="color:${tokens.muted};text-decoration:none;font-size:14px;"><span ${collectionFieldAttr("label")}>${label}</span></a><span ${collectionFieldAttr("url")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${url}</span></div>`).join("")}</div><a data-sz-navbar-cta="1" ${widgetPartAttr("cta-url")} href="${navbarState.ctaUrl}" style="padding:12px 18px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;box-shadow:0 10px 26px ${primaryGlow};"><span ${widgetPartAttr("cta-label")}>${navbarState.ctaLabel}</span></a></div></div></nav>`;
    }
    case "navbar-center": {
      const navbarCenterState = {
        brand: siteName,
        ctaLabel: "Get started",
        ctaUrl: "#",
      };
      const navbarCenterLinks = [["Home", "#"], ["Work", "#"], ["About", "#"]] as const;
      return `<nav data-sz-section-id="${id}" data-sz-section-type="navbar" data-sz-section-name="Navbar Center" ${widgetAttrs("navbar-center", "Navbar Center", [
        { key: "brand", label: "Brand", type: "text", placeholder: siteName },
        { key: "ctaLabel", label: "CTA Label", type: "text", placeholder: "Get started" },
        { key: "ctaUrl", label: "CTA URL", type: "text", placeholder: "#" },
      ], navbarCenterState)} style="position:sticky;top:0;z-index:40;padding:16px 32px;border-bottom:1px solid ${tokens.border};background:${tokens.bg};font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><div style="width:min(100%,${tokens.containerWidth});margin:0 auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px;"><div ${collectionAttrs("nav-links", "Navigation Links", [
        { key: "label", label: "Label", type: "text", placeholder: "Home" },
        { key: "url", label: "URL", type: "text", placeholder: "#" },
      ])} data-sz-collection-items="1" style="display:flex;gap:20px;flex-wrap:wrap;">${navbarCenterLinks.map(([label, url], index) => `<div ${collectionItemAttr(`nav-center-link-${index + 1}`)}><a data-sz-nav-link="1" href="${url}" style="color:${tokens.muted};text-decoration:none;font-size:14px;"><span ${collectionFieldAttr("label")}>${label}</span></a><span ${collectionFieldAttr("url")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${url}</span></div>`).join("")}</div><a href="#" ${widgetPartAttr("brand")} style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:22px;font-weight:800;color:${tokens.text};text-decoration:none;text-align:center;">${navbarCenterState.brand}</a><div style="display:flex;justify-content:flex-end;"><a data-sz-navbar-cta="1" ${widgetPartAttr("cta-url")} href="${navbarCenterState.ctaUrl}" style="padding:10px 18px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:13px;font-weight:700;"><span ${widgetPartAttr("cta-label")}>${navbarCenterState.ctaLabel}</span></a></div></div></nav>`;
    }
    case "navbar-minimal": {
      const navbarMinimalState = {
        brand: siteName,
      };
      const navbarMinimalActions = [
        ["Book a call", "#"],
        ["See pricing", "#"],
      ] as const;
      return `<nav data-sz-section-id="${id}" data-sz-section-type="navbar" data-sz-section-name="Navbar Minimal" ${widgetAttrs("navbar-minimal", "Navbar Minimal", [
        { key: "brand", label: "Brand", type: "text", placeholder: siteName },
      ], navbarMinimalState)} style="position:sticky;top:0;z-index:40;padding:18px 32px;background:${tokens.bg};font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><div style="width:min(100%,${tokens.containerWidth});margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;"><a href="#" ${widgetPartAttr("brand")} style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:22px;font-weight:800;color:${tokens.text};text-decoration:none;">${navbarMinimalState.brand}</a><div ${collectionAttrs("navbar-actions", "Action Buttons", [
        { key: "label", label: "Label", type: "text", placeholder: "Book a call" },
        { key: "url", label: "URL", type: "text", placeholder: "#" },
      ])} data-sz-collection-items="1" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">${navbarMinimalActions.map(([label, url], index) => `<a ${collectionItemAttr(`nav-action-${index + 1}`)} data-sz-nav-action="1" href="${url}" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border-radius:${tokens.buttonRadius};background:${index === 0 ? tokens.primary : tokens.softBg};border:1px solid ${index === 0 ? tokens.primary : tokens.border};color:${index === 0 ? "#fff" : tokens.text};text-decoration:none;font-size:14px;font-weight:700;box-shadow:${index === 0 ? `0 10px 26px ${primaryGlow}` : "none"};"><span ${collectionFieldAttr("label")}>${label}</span><span ${collectionFieldAttr("url")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${url}</span></a>`).join("")}</div></div></nav>`;
    }
    case "hero": {
      const heroState = {
        eyebrow: "New launch",
        title: "Built for clarity.",
        accent: "Designed to convert.",
        body: tagline,
        primaryLabel: "Get started",
        primaryUrl: "#",
        secondaryLabel: "View work",
        secondaryUrl: "#",
      };
      return shell(id, "hero", "Hero", tokens, `<div ${widgetAttrs("hero", "Hero", [
        { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "New launch" },
        { key: "title", label: "Title", type: "text", placeholder: "Built for clarity." },
        { key: "accent", label: "Accent Line", type: "text", placeholder: "Designed to convert." },
        { key: "body", label: "Body", type: "textarea", placeholder: tagline },
        { key: "primaryLabel", label: "Primary Button", type: "text", placeholder: "Get started" },
        { key: "primaryUrl", label: "Primary URL", type: "text", placeholder: "#" },
        { key: "secondaryLabel", label: "Secondary Button", type: "text", placeholder: "View work" },
        { key: "secondaryUrl", label: "Secondary URL", type: "text", placeholder: "#" },
      ], heroState)} style="display:grid;gap:28px;justify-items:start;text-align:left;"><span ${widgetPartAttr("eyebrow")} style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:${tokens.softBg};border:1px solid ${primaryGlow};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${tokens.primary};">${heroState.eyebrow}</span><div style="max-width:760px;"><h1 style="margin:0 0 18px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(42px,7vw,82px);line-height:0.98;letter-spacing:-0.04em;color:${tokens.text};"><span ${widgetPartAttr("title")}>${heroState.title}</span><br/><span ${widgetPartAttr("accent")} style="color:${tokens.primary};">${heroState.accent}</span></h1><p ${widgetPartAttr("body")} style="margin:0;max-width:620px;font-size:18px;line-height:1.75;color:${tokens.muted};">${heroState.body}</p></div><div style="display:flex;gap:14px;flex-wrap:wrap;"><a data-sz-hero-primary="1" ${widgetPartAttr("primary-url")} href="${heroState.primaryUrl}" style="display:inline-flex;align-items:center;justify-content:center;padding:16px 24px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:15px;font-weight:700;box-shadow:0 14px 32px ${primaryGlow};"><span ${widgetPartAttr("primary-label")}>${heroState.primaryLabel}</span></a><a data-sz-hero-secondary="1" ${widgetPartAttr("secondary-url")} href="${heroState.secondaryUrl}" style="display:inline-flex;align-items:center;justify-content:center;padding:16px 24px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};text-decoration:none;font-size:15px;font-weight:600;"><span ${widgetPartAttr("secondary-label")}>${heroState.secondaryLabel}</span></a></div></div>`);
    }
    case "hero-split": {
      const heroSplitState = {
        title: siteName,
        accent: "for bold brands.",
        body: tagline,
        primaryLabel: "Get started",
        primaryUrl: "#",
        secondaryLabel: "Learn more",
        secondaryUrl: "#",
      };
      return shell(id, "hero-split", "Hero Split", tokens, `<div ${widgetAttrs("hero-split", "Hero Split", [
        { key: "title", label: "Title", type: "text", placeholder: siteName },
        { key: "accent", label: "Accent Line", type: "text", placeholder: "for bold brands." },
        { key: "body", label: "Body", type: "textarea", placeholder: tagline },
        { key: "primaryLabel", label: "Primary Button", type: "text", placeholder: "Get started" },
        { key: "primaryUrl", label: "Primary URL", type: "text", placeholder: "#" },
        { key: "secondaryLabel", label: "Secondary Button", type: "text", placeholder: "Learn more" },
        { key: "secondaryUrl", label: "Secondary URL", type: "text", placeholder: "#" },
      ], heroSplitState)} style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;"><div style="display:grid;gap:22px;"><h1 style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(36px,5vw,64px);line-height:1.02;letter-spacing:-0.03em;color:${tokens.text};"><span ${widgetPartAttr("title")}>${heroSplitState.title}</span><br/><span ${widgetPartAttr("accent")} style="color:${tokens.primary};">${heroSplitState.accent}</span></h1><p ${widgetPartAttr("body")} style="margin:0;font-size:17px;line-height:1.8;color:${tokens.muted};">${heroSplitState.body}</p><div style="display:flex;gap:12px;flex-wrap:wrap;"><a data-sz-hero-primary="1" ${widgetPartAttr("primary-url")} href="${heroSplitState.primaryUrl}" style="padding:14px 24px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;box-shadow:0 12px 28px ${primaryGlow};"><span ${widgetPartAttr("primary-label")}>${heroSplitState.primaryLabel}</span></a><a data-sz-hero-secondary="1" ${widgetPartAttr("secondary-url")} href="${heroSplitState.secondaryUrl}" style="padding:14px 24px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};color:${tokens.text};text-decoration:none;font-size:14px;font-weight:600;"><span ${widgetPartAttr("secondary-label")}>${heroSplitState.secondaryLabel}</span></a></div></div><div style="border-radius:${tokens.radius};overflow:hidden;box-shadow:${tokens.shadow};"><img src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=80" alt="Hero" style="width:100%;height:420px;object-fit:cover;display:block;" /></div></div>`);
    }
    case "section": {
      const sectionState = {
        title: "New section title",
        body: "A flexible section for a focused message, feature, or proof point.",
      };
      return shell(id, "section", "Section", tokens, `<div ${widgetAttrs("section", "Section", [
        { key: "title", label: "Title", type: "text", placeholder: "New section title" },
        { key: "body", label: "Body", type: "textarea", placeholder: "A flexible section for a focused message, feature, or proof point." },
      ], sectionState)} style="padding:32px;border:1px solid ${tokens.border};border-radius:${tokens.radius};background:${tokens.bg};box-shadow:${tokens.shadow};"><h2 ${widgetPartAttr("title")} style="margin:0 0 12px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:32px;line-height:1.1;color:${tokens.text};">${sectionState.title}</h2><p ${widgetPartAttr("body")} style="margin:0;font-size:16px;line-height:1.75;color:${tokens.muted};">${sectionState.body}</p></div>`);
    }
    case "container": {
      const containerState = {
        body: "Flexible container for grouped content.",
      };
      return shell(id, "container", "Container", tokens, `<div ${widgetAttrs("container", "Container", [
        { key: "body", label: "Body", type: "text", placeholder: "Flexible container for grouped content." },
      ], containerState)} style="min-height:160px;padding:28px;border-radius:${tokens.radius};border:1px dashed ${tokens.border};background:${tokens.softBg};display:flex;align-items:center;justify-content:center;text-align:center;"><p ${widgetPartAttr("body")} style="margin:0;font-size:14px;color:${tokens.muted};">${containerState.body}</p></div>`);
    }
    case "heading":
      return shell(id, "heading", "Heading", tokens, `<div ${widgetAttrs("section-heading", "Heading", [
        { key: "title", label: "Title", type: "text", placeholder: "Section heading" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Supporting copy that matches the current site voice and spacing rhythm." },
      ], { title: "Section heading", body: "Supporting copy that matches the current site voice and spacing rhythm." })} style="text-align:center;"><h2 ${widgetPartAttr("title")} style="margin:0 0 12px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(30px,5vw,56px);line-height:1.02;letter-spacing:-0.03em;color:${tokens.text};">Section heading</h2><p ${widgetPartAttr("body")} style="margin:0 auto;max-width:620px;font-size:17px;line-height:1.75;color:${tokens.muted};">Supporting copy that matches the current site voice and spacing rhythm.</p></div>`);
    case "paragraph":
      return shell(id, "paragraph", "Paragraph", tokens, `<div ${widgetAttrs("section-paragraph", "Paragraph", [
        { key: "body", label: "Body", type: "textarea", placeholder: "Use this space for a concise message that adds clarity, context, or momentum to the page." },
      ], { body: "Use this space for a concise message that adds clarity, context, or momentum to the page." })} style="max-width:760px;"><p ${widgetPartAttr("body")} style="margin:0;font-size:18px;line-height:1.85;color:${tokens.text};opacity:0.88;">Use this space for a concise message that adds clarity, context, or momentum to the page.</p></div>`);
    case "button":
      return shell(id, "button", "Button", tokens, `<div ${widgetAttrs("section-button", "Button", [
        { key: "label", label: "Label", type: "text", placeholder: "Primary action" },
        { key: "url", label: "URL", type: "text", placeholder: "#" },
      ], { label: "Primary action", url: "#" })} style="display:flex;justify-content:center;"><a ${widgetPartAttr("url")} href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:16px 24px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:15px;font-weight:700;box-shadow:0 14px 32px ${primaryGlow};"><span ${widgetPartAttr("label")}>Primary action</span></a></div>`);
    case "image":
      return shell(id, "image", "Image", tokens, `<figure ${widgetAttrs("section-image", "Image", [
        { key: "src", label: "Image URL", type: "text", placeholder: "https://images.unsplash.com/..." },
        { key: "alt", label: "Alt Text", type: "text", placeholder: "Project visual" },
      ], { src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80", alt: "Project visual" })} style="margin:0;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};background:${tokens.softBg};"><img ${widgetPartAttr("src")} src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80" alt="Project visual" style="width:100%;height:420px;object-fit:cover;display:block;" /><span ${widgetPartAttr("alt")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">Project visual</span></figure>`);
    case "grid": {
      const gridCards = [
        ["Grid item 1", "Editable content block that follows the project system."],
        ["Grid item 2", "Use these cards for grouped features, proof points, or linked destinations."],
        ["Grid item 3", "Each item now stays editable as structured content instead of raw HTML."],
      ] as const;
      return shell(id, "grid", "Grid", tokens, `<div ${collectionAttrs("grid-cards", "Grid Cards", [
        { key: "title", label: "Title", type: "text", placeholder: "Grid item 1" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Editable content block that follows the project system." },
      ], { fixed: true })} data-sz-collection-items="1" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;">${gridCards.map(([title, body], index) => `<div ${collectionItemAttr(`grid-card-${index + 1}`)} style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><h3 ${collectionFieldAttr("title")} style="margin:0 0 8px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:20px;color:${tokens.text};">${title}</h3><p ${collectionFieldAttr("body", "textarea")} style="margin:0;font-size:14px;line-height:1.7;color:${tokens.muted};">${body}</p></div>`).join("")}</div>`, tokens.softBg);
    }
    case "columns": {
      const columnsState = {
        title: "Two-column layout",
        body: "Use this for content paired with supporting detail, stats, or a call to action.",
        asideEyebrow: "Quick note",
        asideBody: "Ideal for a short highlight, metric, or supporting takeaway.",
      };
      return shell(id, "columns", "Columns", tokens, `<div ${widgetAttrs("columns", "Columns", [
        { key: "title", label: "Main Title", type: "text", placeholder: "Two-column layout" },
        { key: "body", label: "Main Body", type: "textarea", placeholder: "Use this for content paired with supporting detail, stats, or a call to action." },
        { key: "asideEyebrow", label: "Aside Eyebrow", type: "text", placeholder: "Quick note" },
        { key: "asideBody", label: "Aside Body", type: "textarea", placeholder: "Ideal for a short highlight, metric, or supporting takeaway." },
      ], columnsState)} style="display:grid;grid-template-columns:1.2fr .8fr;gap:24px;align-items:start;"><div style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><h3 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:28px;color:${tokens.text};">${columnsState.title}</h3><p ${widgetPartAttr("body")} style="margin:0;font-size:15px;line-height:1.75;color:${tokens.muted};">${columnsState.body}</p></div><div style="padding:28px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${tokens.border};"><p ${widgetPartAttr("aside-eyebrow")} style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${tokens.primary};">${columnsState.asideEyebrow}</p><p ${widgetPartAttr("aside-body")} style="margin:0;font-size:14px;line-height:1.75;color:${tokens.text};">${columnsState.asideBody}</p></div></div>`);
    }
    case "features": {
      const featuresState = {
        title: "Core features",
        subtitle: "Highlight the capabilities or differentiators that matter most.",
      };
      const features = [
        ["✦", "Fast setup", "Clear, polished details that support the main promise of the page."],
        ["◎", "Refined output", "Thoughtful defaults and flexible controls keep the block looking on-brand."],
        ["→", "Reliable delivery", "Use this section to spotlight the outcomes that matter to visitors."],
      ] as const;
      return shell(
        id,
        "features",
        "Features",
        tokens,
        `<div ${widgetAttrs("features", "Features", [
          { key: "title", label: "Title", type: "text", placeholder: "Core features" },
          { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Highlight the capabilities or differentiators that matter most." },
        ], featuresState)} ${collectionAttrs("features", "Feature Cards", [
          { key: "title", label: "Title", type: "text", placeholder: "Fast setup" },
          { key: "description", label: "Description", type: "textarea", placeholder: "Explain the capability…" },
          { key: "icon", label: "Icon", type: "text", placeholder: "✦" },
        ], { fixed: true })}><div style="text-align:center;margin-bottom:28px;"><h2 ${widgetPartAttr("title")} style="margin:0 0 12px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(30px,5vw,48px);color:${tokens.text};">${featuresState.title}</h2><p ${widgetPartAttr("subtitle")} style="margin:0 auto;max-width:620px;font-size:16px;line-height:1.75;color:${tokens.muted};">${featuresState.subtitle}</p></div><div data-sz-collection-items="1" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;">${features.map(([icon, title, description], index) => `<article ${collectionItemAttr(`feature-card-${index + 1}`)} style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};text-align:left;"><div ${collectionFieldAttr("icon")} style="width:44px;height:44px;border-radius:${tokens.buttonRadius};background:${tokens.softBg};display:flex;align-items:center;justify-content:center;margin-bottom:18px;font-size:20px;color:${tokens.primary};">${icon}</div><h3 ${collectionFieldAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:21px;color:${tokens.text};">${title}</h3><p ${collectionFieldAttr("description", "textarea")} style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">${description}</p></article>`).join("")}</div></div>`,
        tokens.softBg,
      );
    }
    case "testimonial": {
      const testimonialState = {
        quote: `Working with ${siteName} brought clarity, speed, and a stronger presence across every touchpoint.`,
        name: "Sarah Johnson",
        role: `Founder, ${siteName}`,
        initial: "SJ",
      };
      return shell(
        id,
        "testimonial",
        "Testimonial",
        tokens,
        `<div ${widgetAttrs("testimonial", "Testimonial", [
          { key: "quote", label: "Quote", type: "textarea", placeholder: "Working with Sitezy brought clarity, speed, and a stronger presence across every touchpoint." },
          { key: "name", label: "Name", type: "text", placeholder: "Sarah Johnson" },
          { key: "role", label: "Role", type: "text", placeholder: "Founder, Sitezy" },
          { key: "initial", label: "Avatar Initials", type: "text", placeholder: "SJ" },
        ], testimonialState)} style="padding:36px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};text-align:center;"><div style="font-size:42px;line-height:1;color:${tokens.primary};margin-bottom:16px;">“</div><blockquote ${widgetPartAttr("quote")} style="margin:0 auto 20px;max-width:760px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:28px;line-height:1.4;color:${tokens.text};">${testimonialState.quote}</blockquote><div style="display:inline-flex;align-items:center;gap:12px;"><div ${widgetPartAttr("initial")} style="width:46px;height:46px;border-radius:999px;background:${tokens.softBg};display:flex;align-items:center;justify-content:center;color:${tokens.primary};font-weight:700;">${testimonialState.initial}</div><div style="text-align:left;"><p ${widgetPartAttr("name")} style="margin:0;font-size:14px;font-weight:700;color:${tokens.text};">${testimonialState.name}</p><p ${widgetPartAttr("role")} style="margin:0;font-size:13px;color:${tokens.muted};">${testimonialState.role}</p></div></div></div>`,
        tokens.softBg,
      );
    }
    case "gallery": {
      const galleryState = {
        eyebrow: "Gallery",
        title: "Show the work visually",
        body: "Images inherit the site framing, radius, and shadow system.",
      };
      const galleryImages = [
        ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80", "Gallery item 1"],
        ["https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80", "Gallery item 2"],
        ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80", "Gallery item 3"],
      ] as const;
      return shell(
        id,
        "gallery",
        "Gallery",
        tokens,
        `<div ${widgetAttrs("gallery", "Gallery", [
          { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Gallery" },
          { key: "title", label: "Title", type: "text", placeholder: "Show the work visually" },
          { key: "body", label: "Description", type: "textarea", placeholder: "Images inherit the site framing, radius, and shadow system." },
        ], galleryState)} ${collectionAttrs("gallery", "Gallery Images", [
          { key: "alt", label: "Alt Text", type: "text", placeholder: "Gallery image" },
          { key: "image", label: "Image", type: "image", placeholder: "https://example.com/gallery.jpg" },
        ], { fixed: true })} style="display:grid;gap:18px;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);align-items:start;"><div data-sz-collection-items="1" style="display:grid;grid-template-columns:1.4fr 1fr;gap:18px;"><figure ${collectionItemAttr("gallery-1")} style="margin:0;grid-row:span 2;border-radius:${tokens.radius};overflow:hidden;box-shadow:${tokens.shadow};"><img ${collectionFieldAttr("image", "image")} src="${galleryImages[0][0]}" alt="${galleryImages[0][1]}" style="width:100%;height:420px;object-fit:cover;display:block;" /><span ${collectionFieldAttr("alt")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${galleryImages[0][1]}</span></figure><figure ${collectionItemAttr("gallery-2")} style="margin:0;border-radius:${tokens.radius};overflow:hidden;box-shadow:${tokens.shadow};"><img ${collectionFieldAttr("image", "image")} src="${galleryImages[1][0]}" alt="${galleryImages[1][1]}" style="width:100%;height:201px;object-fit:cover;display:block;" /><span ${collectionFieldAttr("alt")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${galleryImages[1][1]}</span></figure><figure ${collectionItemAttr("gallery-3")} style="margin:0;border-radius:${tokens.radius};overflow:hidden;box-shadow:${tokens.shadow};"><img ${collectionFieldAttr("image", "image")} src="${galleryImages[2][0]}" alt="${galleryImages[2][1]}" style="width:100%;height:201px;object-fit:cover;display:block;" /><span ${collectionFieldAttr("alt")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${galleryImages[2][1]}</span></figure></div><div style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};display:flex;flex-direction:column;justify-content:center;min-height:420px;"><p ${widgetPartAttr("eyebrow")} style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${tokens.primary};">${galleryState.eyebrow}</p><h3 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:28px;color:${tokens.text};">${galleryState.title}</h3><p ${widgetPartAttr("body")} style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">${galleryState.body}</p></div></div>`,
      );
    }
    case "cta": {
      const ctaState = {
        title: "Ready to move faster?",
        body: "A focused next step for visitors who are ready to take action.",
        primaryLabel: "Start now",
        primaryUrl: "#",
        secondaryLabel: "Talk to sales",
        secondaryUrl: "#",
      };
      return shell(id, "cta", "Call To Action", tokens, `<div ${widgetAttrs("cta", "Call To Action", [
        { key: "title", label: "Title", type: "text", placeholder: "Ready to move faster?" },
        { key: "body", label: "Body", type: "textarea", placeholder: "A focused next step for visitors who are ready to take action." },
        { key: "primaryLabel", label: "Primary Button", type: "text", placeholder: "Start now" },
        { key: "primaryUrl", label: "Primary URL", type: "text", placeholder: "#" },
        { key: "secondaryLabel", label: "Secondary Button", type: "text", placeholder: "Talk to sales" },
        { key: "secondaryUrl", label: "Secondary URL", type: "text", placeholder: "#" },
      ], ctaState)} style="padding:44px;border-radius:${tokens.radius};background:${tokens.strongBg};box-shadow:${tokens.shadow};text-align:center;"><h2 ${widgetPartAttr("title")} style="margin:0 0 14px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(30px,5vw,48px);color:${tokens.bg};">${ctaState.title}</h2><p ${widgetPartAttr("body")} style="margin:0 auto 24px;max-width:620px;font-size:17px;line-height:1.75;color:rgba(255,255,255,0.76);">${ctaState.body}</p><div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;"><a data-sz-cta-primary="1" ${widgetPartAttr("primary-url")} href="${ctaState.primaryUrl}" style="padding:16px 24px;border-radius:${tokens.buttonRadius};background:${tokens.bg};color:${tokens.strongBg};text-decoration:none;font-size:15px;font-weight:700;"><span ${widgetPartAttr("primary-label")}>${ctaState.primaryLabel}</span></a><a data-sz-cta-secondary="1" ${widgetPartAttr("secondary-url")} href="${ctaState.secondaryUrl}" style="padding:16px 24px;border-radius:${tokens.buttonRadius};border:1px solid rgba(255,255,255,0.18);color:${tokens.bg};text-decoration:none;font-size:15px;font-weight:600;"><span ${widgetPartAttr("secondary-label")}>${ctaState.secondaryLabel}</span></a></div></div>`);
    }
    case "split-image": {
      const splitImageState = {
        eyebrow: "Feature",
        title: "Content that converts on sight",
        body: "Pair a strong visual with a focused message and a clear next step.",
        ctaLabel: "Learn more →",
        ctaUrl: "#",
        image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
      };
      return shell(id, "split-image", "Split Image", tokens, `<div ${widgetAttrs("split-image", "Split Image", [
        { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Feature" },
        { key: "title", label: "Title", type: "text", placeholder: "Content that converts on sight" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Pair a strong visual with a focused message and a clear next step." },
        { key: "ctaLabel", label: "CTA Label", type: "text", placeholder: "Learn more →" },
        { key: "ctaUrl", label: "CTA URL", type: "text", placeholder: "#" },
        { key: "image", label: "Image URL", type: "text", placeholder: "https://example.com/visual.jpg" },
      ], splitImageState)} style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center;"><img ${widgetPartAttr("image")} src="${splitImageState.image}" alt="Visual" style="width:100%;height:460px;object-fit:cover;border-radius:${tokens.radius};box-shadow:${tokens.shadow};display:block;" /><div style="display:grid;gap:16px;"><span ${widgetPartAttr("eyebrow")} style="display:inline-flex;padding:6px 12px;border-radius:999px;background:${tokens.softBg};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${tokens.primary};width:max-content;">${splitImageState.eyebrow}</span><h2 ${widgetPartAttr("title")} style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,48px);line-height:1.08;color:${tokens.text};">${splitImageState.title}</h2><p ${widgetPartAttr("body")} style="margin:0;font-size:16px;line-height:1.8;color:${tokens.muted};">${splitImageState.body}</p><a data-sz-split-image-cta="1" ${widgetPartAttr("cta-url")} href="${splitImageState.ctaUrl}" style="display:inline-flex;align-items:center;gap:8px;padding:14px 22px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;width:max-content;box-shadow:0 10px 26px ${primaryGlow};"><span ${widgetPartAttr("cta-label")}>${splitImageState.ctaLabel}</span></a></div></div>`);
    }
    case "stats": {
      const statsState = {
        title: "By the numbers",
        subtitle: "Real results that speak for themselves.",
      };
      return shell(
        id,
        "stats",
        "Stats",
        tokens,
        `<div ${widgetAttrs("stats", "Stats", [
          { key: "title", label: "Title", type: "text", placeholder: "By the numbers" },
          { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Real results that speak for themselves." },
        ], statsState)}><div style="text-align:center;margin-bottom:28px;"><h2 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${statsState.title}</h2><p ${widgetPartAttr("subtitle")} style="margin:0 auto;max-width:540px;font-size:15px;color:${tokens.muted};">${statsState.subtitle}</p></div><div ${collectionAttrs("stats", "Stats", [
          { key: "value", label: "Value" },
          { key: "label", label: "Label" },
        ])} data-sz-collection-items="1" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">${[
          ["98%", "Customer satisfaction"],
          ["2.4×", "Average ROI"],
          ["10k+", "Active users"],
          ["< 48h", "Response time"],
        ].map(([val, label], index) => `<div ${collectionItemAttr(`stat-${index + 1}`)} style="padding:28px 20px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};text-align:center;box-shadow:${tokens.shadow};"><div ${collectionFieldAttr("value")} style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:40px;font-weight:800;color:${tokens.primary};line-height:1;">${val}</div><div ${collectionFieldAttr("label")} style="margin-top:8px;font-size:13px;color:${tokens.muted};">${label}</div></div>`).join("")}</div></div>`,
        tokens.softBg,
      );
    }
    case "timeline": {
      const timelineState = {
        title: "How it works",
        subtitle: "Lay out the process in clear steps without leaving the current page system.",
      };
      return shell(
        id,
        "timeline",
        "Timeline",
        tokens,
        `<div ${widgetAttrs("timeline", "Timeline", [
          { key: "title", label: "Title", type: "text", placeholder: "How it works" },
          { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Lay out the process in clear steps without leaving the current page system." },
        ], timelineState)}><div style="text-align:center;margin-bottom:32px;"><h2 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${timelineState.title}</h2><p ${widgetPartAttr("subtitle")} style="margin:0 auto;max-width:620px;font-size:15px;line-height:1.75;color:${tokens.muted};">${timelineState.subtitle}</p></div><div ${collectionAttrs("timeline", "Timeline Steps", [
          { key: "title", label: "Title" },
          { key: "description", label: "Description", type: "textarea" },
        ])} data-sz-collection-items="1" style="display:grid;gap:0;position:relative;">${["Discover", "Design", "Deliver"].map((step, i) => `<div ${collectionItemAttr(`timeline-${i + 1}`)} style="display:grid;grid-template-columns:80px 1fr;gap:20px;padding:24px 0;${i < 2 ? `border-left:2px solid ${tokens.border};margin-left:39px;padding-left:28px;` : ""}"><div data-sz-timeline-step="1" style="width:44px;height:44px;border-radius:999px;background:${tokens.primary};color:#fff;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:${i > 0 ? "-50px" : "-22px"};box-shadow:0 8px 20px ${primaryGlow};">${i + 1}</div><div><h3 ${collectionFieldAttr("title")} style="margin:0 0 6px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:20px;color:${tokens.text};">${step}</h3><p ${collectionFieldAttr("description", "textarea")} style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Brief description of this step goes here. Edit to match your process.</p></div></div>`).join("")}</div></div>`,
      );
    }
    case "features-list": {
      const listState = {
        title: "Everything you need",
        subtitle: "A complete toolkit built to help you move fast and look great.",
      };
      const rows = [
        ["✓", "Zero setup required", "Start quickly with a sensible structure and polished defaults."],
        ["✓", "Fully customisable", "Adjust the content, visuals, and layout without rebuilding from scratch."],
        ["✓", "Production-ready output", "Use this row to describe a capability with supporting detail."],
        ["✓", "Priority support", "Keep the list tight and outcome-focused for better scanning."],
      ] as const;
      return shell(
        id,
        "features-list",
        "Feature List",
        tokens,
        `<div ${widgetAttrs("features-list", "Feature List", [
          { key: "title", label: "Title", type: "text", placeholder: "Everything you need" },
          { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "A complete toolkit built to help you move fast and look great." },
        ], listState)} ${collectionAttrs("features-list", "Feature List Items", [
          { key: "title", label: "Title", type: "text", placeholder: "Zero setup required" },
          { key: "description", label: "Description", type: "textarea", placeholder: "Short supporting detail." },
          { key: "icon", label: "Icon", type: "text", placeholder: "✓" },
        ], { fixed: true })} style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center;"><div><h2 ${widgetPartAttr("title")} style="margin:0 0 14px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${listState.title}</h2><p ${widgetPartAttr("subtitle")} style="margin:0 0 28px;font-size:16px;line-height:1.8;color:${tokens.muted};">${listState.subtitle}</p></div><div data-sz-collection-items="1" style="display:grid;gap:16px;">${rows.map(([icon, title, description], index) => `<div ${collectionItemAttr(`feature-list-${index + 1}`)} style="display:flex;align-items:flex-start;gap:14px;padding:18px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};"><div ${collectionFieldAttr("icon")} style="width:32px;height:32px;border-radius:${tokens.buttonRadius};background:${tokens.softBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${tokens.primary};font-weight:700;">${icon}</div><div><p ${collectionFieldAttr("title")} style="margin:0;font-size:15px;font-weight:600;color:${tokens.text};">${title}</p><p ${collectionFieldAttr("description", "textarea")} style="margin:4px 0 0;font-size:13px;line-height:1.7;color:${tokens.muted};">${description}</p></div></div>`).join("")}</div></div>`,
      );
    }
    case "testimonials": {
      const testimonialsState = {
        title: "What people say",
        subtitle: "Social proof works better when the voices, roles, and quotes all stay editable.",
      };
      return shell(
        id,
        "testimonials",
        "Testimonials",
        tokens,
        `<div ${widgetAttrs("testimonials", "Testimonials", [
          { key: "title", label: "Title", type: "text", placeholder: "What people say" },
          { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Social proof works better when the voices, roles, and quotes all stay editable." },
        ], testimonialsState)}><div style="text-align:center;margin-bottom:28px;"><h2 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${testimonialsState.title}</h2><p ${widgetPartAttr("subtitle")} style="margin:0 auto;max-width:560px;font-size:15px;line-height:1.75;color:${tokens.muted};">${testimonialsState.subtitle}</p></div><div ${collectionAttrs("testimonials", "Testimonials", [
          { key: "quote", label: "Quote", type: "textarea" },
          { key: "name", label: "Name" },
          { key: "role", label: "Role" },
        ])} data-sz-collection-items="1" style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;">${[
          ["Alex R.", "CEO, Axiom", "The results spoke for themselves. We moved faster than ever."],
          ["Priya S.", "Designer", "Blocks that actually match the brand. Rare and genuinely useful."],
          ["James K.", "Founder", "This alone saved us three weeks of back-and-forth."],
        ].map(([name, role, quote], index) => `<div ${collectionItemAttr(`testimonial-${index + 1}`)} style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><div style="font-size:28px;color:${tokens.primary};margin-bottom:12px;">"</div><p ${collectionFieldAttr("quote", "textarea")} style="margin:0 0 20px;font-size:15px;line-height:1.75;color:${tokens.text};">${quote}</p><div style="display:flex;align-items:center;gap:10px;"><div data-sz-avatar-initial="1" style="width:36px;height:36px;border-radius:999px;background:${tokens.softBg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${tokens.primary};">${name[0]}</div><div><p ${collectionFieldAttr("name")} style="margin:0;font-size:13px;font-weight:700;color:${tokens.text};">${name}</p><p ${collectionFieldAttr("role")} style="margin:0;font-size:12px;color:${tokens.muted};">${role}</p></div></div></div>`).join("")}</div></div>`,
        tokens.softBg,
      );
    }
    case "team": {
      const teamState = {
        title: "Meet the team",
        subtitle: "The people behind the work.",
      };
      return shell(
        id,
        "team",
        "Team",
        tokens,
        `<div ${widgetAttrs("team", "Team", [
          { key: "title", label: "Title", type: "text", placeholder: "Meet the team" },
          { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "The people behind the work." },
        ], teamState)}><div style="text-align:center;margin-bottom:28px;"><h2 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${teamState.title}</h2><p ${widgetPartAttr("subtitle")} style="margin:0 auto;max-width:520px;font-size:15px;color:${tokens.muted};">${teamState.subtitle}</p></div><div ${collectionAttrs("team", "Team Members", [
          { key: "image", label: "Photo", type: "image", placeholder: "https://…" },
          { key: "name", label: "Name" },
          { key: "role", label: "Role" },
        ])} data-sz-collection-items="1" style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;">${[
          ["Alex M.", "Co-founder & CEO", "photo-1507003211169-0a1dd7228f2d"],
          ["Priya K.", "Head of Design", "photo-1573496359142-b8d87734a5a2"],
          ["Sam T.", "Lead Engineer", "photo-1519085360753-af0119f7cbe7"],
          ["Zoe L.", "Growth", "photo-1580489944761-15a19d654956"],
        ].map(([name, role, photo], index) => `<div ${collectionItemAttr(`team-${index + 1}`)} style="text-align:center;padding:24px 16px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><img ${collectionFieldAttr("image", "image")} src="https://images.unsplash.com/${photo}?auto=format&fit=crop&w=300&q=80" alt="${name}" style="width:72px;height:72px;border-radius:999px;object-fit:cover;display:block;margin:0 auto 14px;" /><p ${collectionFieldAttr("name")} style="margin:0 0 4px;font-size:15px;font-weight:700;color:${tokens.text};">${name}</p><p ${collectionFieldAttr("role")} style="margin:0;font-size:12px;color:${tokens.muted};">${role}</p></div>`).join("")}</div></div>`,
      );
    }
    case "pricing": {
      const pricingState = {
        title: "Simple pricing",
        subtitle: "No hidden fees. Pick a plan and get started today.",
      };
      return shell(
        id,
        "pricing",
        "Pricing",
        tokens,
        `<div ${widgetAttrs("pricing", "Pricing", [
          { key: "title", label: "Title", type: "text", placeholder: "Simple pricing" },
          { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "No hidden fees. Pick a plan and get started today." },
        ], pricingState)}><div style="text-align:center;margin-bottom:32px;"><h2 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${pricingState.title}</h2><p ${widgetPartAttr("subtitle")} style="margin:0 auto;max-width:520px;font-size:15px;color:${tokens.muted};">${pricingState.subtitle}</p></div><div ${collectionAttrs("pricing", "Pricing Plans", [
          { key: "plan", label: "Plan" },
          { key: "price", label: "Price" },
          { key: "period", label: "Period" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "features", label: "Features", type: "list", placeholder: "One feature per line" },
          { key: "cta", label: "Button Label" },
        ])} data-sz-collection-items="1" style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start;">${[
          ["Starter", "49", "/mo", "For individuals just getting started.", ["5 projects", "Basic analytics", "Email support"]],
          ["Pro", "99", "/mo", "Perfect for growing teams.", ["Unlimited projects", "Advanced analytics", "Priority support", "Custom domain"]],
          ["Enterprise", "249", "/mo", "For large organisations at scale.", ["Everything in Pro", "Dedicated manager", "SLA & compliance", "SSO & audit logs"]],
        ].map(([name, price, period, desc, features], i) => `<div ${collectionItemAttr(`pricing-${i + 1}`)} style="padding:28px;border-radius:${tokens.radius};background:${i === 1 ? tokens.primary : tokens.bg};border:${i === 1 ? `2px solid ${tokens.primary}` : `1px solid ${tokens.border}`};box-shadow:${i === 1 ? `0 20px 60px ${primaryGlow}` : tokens.shadow};"><p ${collectionFieldAttr("plan")} style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${i === 1 ? "rgba(255,255,255,.7)" : tokens.primary};">${name}</p><div style="display:flex;align-items:baseline;gap:2px;margin:0 0 10px;"><span style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:48px;font-weight:800;color:${i === 1 ? "#fff" : tokens.text};">$</span><span ${collectionFieldAttr("price")} style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:48px;font-weight:800;color:${i === 1 ? "#fff" : tokens.text};">${price}</span><span ${collectionFieldAttr("period")} style="font-size:13px;color:${i === 1 ? "rgba(255,255,255,.6)" : tokens.muted};">${period}</span></div><p ${collectionFieldAttr("description", "textarea")} style="margin:0 0 18px;font-size:13px;line-height:1.7;color:${i === 1 ? "rgba(255,255,255,.75)" : tokens.muted};">${desc}</p><ul ${collectionFieldAttr("features", "list")} style="margin:0 0 22px;padding:0;list-style:none;display:grid;gap:8px;">${(features as string[]).map((feature) => `<li data-sz-list-item="1" style="display:flex;align-items:center;gap:8px;font-size:13px;color:${i === 1 ? "rgba(255,255,255,.85)" : tokens.text};"><span style="color:${i === 1 ? "#fff" : tokens.primary};font-weight:700;">✓</span><span data-sz-list-item-text="1">${feature}</span></li>`).join("")}</ul><a ${collectionFieldAttr("cta")} href="#" style="display:block;text-align:center;padding:13px;border-radius:${tokens.buttonRadius};background:${i === 1 ? "#fff" : tokens.primary};color:${i === 1 ? tokens.primary : "#fff"};text-decoration:none;font-size:14px;font-weight:700;">Get started</a></div>`).join("")}</div></div>`,
      );
    }
    case "pricing-toggle": {
      const toggleId = `pricing-${uid().slice(0, 6)}`;
      const pricingToggleState = {
        title: "Choose your pace",
        subtitle: "Give visitors a clearer choice between monthly flexibility and yearly savings.",
        monthlyLabel: "Monthly",
        yearlyLabel: "Yearly",
      };
      const activateMonthly = `var root=document.getElementById('${toggleId}');if(!root)return false;var m=root.querySelector('[data-plan=\"monthly\"]');var y=root.querySelector('[data-plan=\"yearly\"]');var bm=root.querySelector('[data-role=\"monthly-btn\"]');var by=root.querySelector('[data-role=\"yearly-btn\"]');if(m)m.style.display='grid';if(y)y.style.display='none';if(bm){bm.style.background='${tokens.primary}';bm.style.color='#fff';bm.style.borderColor='${tokens.primary}';}if(by){by.style.background='${tokens.bg}';by.style.color='${tokens.text}';by.style.borderColor='${tokens.border}';}return false;`;
      const activateYearly = `var root=document.getElementById('${toggleId}');if(!root)return false;var m=root.querySelector('[data-plan=\"monthly\"]');var y=root.querySelector('[data-plan=\"yearly\"]');var bm=root.querySelector('[data-role=\"monthly-btn\"]');var by=root.querySelector('[data-role=\"yearly-btn\"]');if(m)m.style.display='none';if(y)y.style.display='grid';if(by){by.style.background='${tokens.primary}';by.style.color='#fff';by.style.borderColor='${tokens.primary}';}if(bm){bm.style.background='${tokens.bg}';bm.style.color='${tokens.text}';bm.style.borderColor='${tokens.border}';}return false;`;
      const plans = [
        ["Starter", "29", "24", "For focused solo work", ["3 active sites", "Core editing", "Export included"]],
        ["Pro", "79", "64", "Best for growing teams", ["Unlimited projects", "AI regeneration", "Priority support"]],
        ["Scale", "169", "139", "For larger client work", ["Team access", "Advanced exports", "Concierge onboarding"]],
      ] as const;
      const renderPlans = (mode: "monthly" | "yearly") => `<div data-plan="${mode}" data-sz-pricing-mode="${mode}" style="display:${mode === "monthly" ? "grid" : "none"};grid-template-columns:repeat(3,1fr);gap:18px;align-items:start;">${plans.map(([name, monthPrice, yearPrice, desc, features], i) => {
        const price = mode === "monthly" ? monthPrice : yearPrice;
        const period = mode === "monthly" ? "/mo" : "/mo billed yearly";
        const badge = mode === "yearly" && i === 1 ? `<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.22);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${tokens.primary};margin:0 0 10px;">Save 18%</span>` : "";
        return `<div data-sz-pricing-card="${i}" style="padding:28px;border-radius:${tokens.radius};background:${i === 1 ? tokens.primary : tokens.bg};border:${i === 1 ? `2px solid ${tokens.primary}` : `1px solid ${tokens.border}`};box-shadow:${i === 1 ? `0 20px 60px ${primaryGlow}` : tokens.shadow};"><p data-sz-pricing-part="plan" style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${i === 1 ? "rgba(255,255,255,.74)" : tokens.primary};">${name}</p>${badge}<div style="display:flex;align-items:flex-end;gap:5px;margin:0 0 12px;"><span data-sz-pricing-part="price" style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:48px;font-weight:800;line-height:1;color:${i === 1 ? "#fff" : tokens.text};">$${price}</span><span data-sz-pricing-part="period" style="font-size:12px;color:${i === 1 ? "rgba(255,255,255,.62)" : tokens.muted};padding-bottom:6px;">${period}</span></div><p data-sz-pricing-part="description" style="margin:0 0 18px;font-size:13px;line-height:1.7;color:${i === 1 ? "rgba(255,255,255,.78)" : tokens.muted};">${desc}</p><ul data-sz-pricing-part="features" style="margin:0 0 22px;padding:0;list-style:none;display:grid;gap:8px;">${features.map((feature) => `<li data-sz-list-item="1" style="display:flex;align-items:center;gap:8px;font-size:13px;color:${i === 1 ? "rgba(255,255,255,.88)" : tokens.text};"><span style="color:${i === 1 ? "#fff" : tokens.primary};font-weight:700;">✓</span><span data-sz-list-item-text="1">${feature}</span></li>`).join("")}</ul><a data-sz-pricing-part="cta" href="#" style="display:block;text-align:center;padding:13px;border-radius:${tokens.buttonRadius};background:${i === 1 ? "#fff" : tokens.primary};color:${i === 1 ? tokens.primary : "#fff"};text-decoration:none;font-size:14px;font-weight:700;">Choose ${name}</a></div>`;
      }).join("")}</div>`;
      return shell(id, "pricing", "Pricing Toggle", tokens, `<div id="${toggleId}" ${widgetAttrs("pricing-toggle", "Pricing Toggle", [
        { key: "title", label: "Title", type: "text", placeholder: "Choose your pace" },
        { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Give visitors a clearer choice between monthly flexibility and yearly savings." },
        { key: "monthlyLabel", label: "Monthly Label", type: "text", placeholder: "Monthly" },
        { key: "yearlyLabel", label: "Yearly Label", type: "text", placeholder: "Yearly" },
      ], pricingToggleState)} ${collectionAttrs("pricing-toggle-plans", "Pricing Toggle Plans", [
        { key: "plan", label: "Plan" },
        { key: "monthlyPrice", label: "Monthly Price" },
        { key: "yearlyPrice", label: "Yearly Price" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "features", label: "Features", type: "list" },
        { key: "cta", label: "CTA" },
      ], { fixed: true })}><div style="text-align:center;margin-bottom:28px;"><h2 data-sz-widget-part="title" style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${pricingToggleState.title}</h2><p data-sz-widget-part="subtitle" style="margin:0 auto;max-width:560px;font-size:15px;line-height:1.75;color:${tokens.muted};">${pricingToggleState.subtitle}</p></div><div style="display:flex;justify-content:center;margin:0 0 28px;"><div style="display:inline-flex;align-items:center;gap:8px;padding:8px;border-radius:999px;border:1px solid ${tokens.border};background:${tokens.bg};box-shadow:${tokens.shadow};"><button type="button" data-role="monthly-btn" onclick="${activateMonthly}" style="padding:10px 16px;border-radius:999px;border:1px solid ${tokens.primary};background:${tokens.primary};color:#fff;font-size:13px;font-weight:700;cursor:pointer;"><span data-sz-widget-part="monthly-label">${pricingToggleState.monthlyLabel}</span></button><button type="button" data-role="yearly-btn" onclick="${activateYearly}" style="padding:10px 16px;border-radius:999px;border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:13px;font-weight:700;cursor:pointer;"><span data-sz-widget-part="yearly-label">${pricingToggleState.yearlyLabel}</span></button></div></div>${renderPlans("monthly")}${renderPlans("yearly")}<div data-sz-collection-items="1" style="display:none;">${plans.map(([name, monthPrice, yearPrice, desc, features], index) => `<div ${collectionItemAttr(`pricing-toggle-${index + 1}`)}><span ${collectionFieldAttr("plan")}>${name}</span><span ${collectionFieldAttr("monthlyPrice")}>${monthPrice}</span><span ${collectionFieldAttr("yearlyPrice")}>${yearPrice}</span><span ${collectionFieldAttr("description", "textarea")}>${desc}</span><ul ${collectionFieldAttr("features", "list")}>${features.map((feature) => `<li data-sz-list-item="1"><span data-sz-list-item-text="1">${feature}</span></li>`).join("")}</ul><span ${collectionFieldAttr("cta")}>Choose ${name}</span></div>`).join("")}</div></div>`, tokens.softBg);
    }
    case "faq": {
      const faqState = {
        title: "Frequently asked",
        subtitle: "Keep answers short, direct, and easy to scan.",
      };
      return shell(
        id,
        "faq",
        "FAQ",
        tokens,
        `<div ${widgetAttrs("faq", "FAQ", [
          { key: "title", label: "Title", type: "text", placeholder: "Frequently asked" },
          { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Keep answers short, direct, and easy to scan." },
        ], faqState)}><div style="text-align:center;margin-bottom:32px;"><h2 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${faqState.title}</h2><p ${widgetPartAttr("subtitle")} style="margin:0 auto;max-width:620px;font-size:15px;line-height:1.75;color:${tokens.muted};">${faqState.subtitle}</p></div><div ${collectionAttrs("faq", "FAQ Items", [
          { key: "question", label: "Question" },
          { key: "answer", label: "Answer", type: "textarea" },
        ])} data-sz-collection-items="1" style="max-width:760px;margin:0 auto;display:grid;gap:12px;">${[
          ["How quickly can we get started?", "Most projects can begin within a few business days once scope and priorities are aligned."],
          ["Can this be tailored to our needs?", "Yes. Every engagement can be shaped around your goals, audience, and internal workflow."],
          ["What does collaboration look like?", "You’ll have a clear point of contact, defined milestones, and regular updates throughout the process."],
          ["Do you offer ongoing support?", "Yes. Ongoing support and optimization can be included based on the level of help you need."],
        ].map(([q, a], index) => `<details ${collectionItemAttr(`faq-${index + 1}`)} style="border:1px solid ${tokens.border};border-radius:${tokens.radius};background:${tokens.bg};overflow:hidden;"><summary style="padding:18px 22px;font-size:15px;font-weight:600;color:${tokens.text};cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;"><span ${collectionFieldAttr("question")}>${q}</span><span style="font-size:20px;color:${tokens.muted};">+</span></summary><p ${collectionFieldAttr("answer", "textarea")} style="margin:0;padding:0 22px 18px;font-size:14px;line-height:1.8;color:${tokens.muted};">${a}</p></details>`).join("")}</div></div>`,
      );
    }
    case "logo-wall":
      return shell(id, "logo-wall", "Logo Wall", tokens, `<div ${widgetAttrs("logo-wall", "Logo Wall", [
        { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Trusted by teams at" },
      ], { eyebrow: "Trusted by teams at" })} ${collectionAttrs("logo-wall", "Logos", [
        { key: "label", label: "Logo Label", type: "text", placeholder: "Vercel" },
      ])}><div style="text-align:center;margin-bottom:24px;"><p ${widgetPartAttr("eyebrow")} style="margin:0;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${tokens.muted};">Trusted by teams at</p></div><div data-sz-logo-wall="1" data-sz-collection-items="1" style="display:flex;align-items:center;justify-content:center;gap:32px;flex-wrap:wrap;">${["Vercel","Linear","Figma","Stripe","Notion","Loom"].map((name, index) => `<div ${collectionItemAttr(`logo-wall-${index + 1}`)} data-sz-logo-chip="1" style="padding:12px 22px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:15px;font-weight:800;color:${tokens.muted};letter-spacing:-.02em;"><span ${collectionFieldAttr("label")}>${name}</span></div>`).join("")}</div></div>`, tokens.softBg);
    case "logo-scroller": {
      const logos = ["Vercel","Linear","Figma","Stripe","Notion","Loom","Framer","Slack"];
      const chips = logos.concat(logos).map((name, index) => `<div ${collectionItemAttr(`logo-scroller-${index + 1}`)} data-sz-logo-chip="1" style="padding:12px 22px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:15px;font-weight:800;color:${tokens.muted};letter-spacing:-.02em;white-space:nowrap;flex:0 0 auto;"><span ${collectionFieldAttr("label")}>${name}</span></div>`).join("");
      return shell(id, "logo-scroller", "Logo Scroller", tokens, `<div ${widgetAttrs("logo-scroller", "Logo Scroller", [
        { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Seen in the workflows of modern teams" },
      ], { eyebrow: "Seen in the workflows of modern teams" })} ${collectionAttrs("logo-scroller", "Logos", [
        { key: "label", label: "Logo Label", type: "text", placeholder: "Vercel" },
      ])}><div style="text-align:center;margin-bottom:24px;"><p ${widgetPartAttr("eyebrow")} style="margin:0;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${tokens.muted};">Seen in the workflows of modern teams</p></div><div data-sz-logo-scroller="1" style="position:relative;overflow:hidden;border-radius:${tokens.radius};border:1px solid ${tokens.border};background:${tokens.softBg};padding:18px 0;"><div data-sz-logo-track="1" data-sz-collection-items="1">${chips}</div></div></div>`, tokens.softBg);
    }
    case "cta-strip": {
      const ctaStripState = {
        title: "Ready to get started?",
        body: `Join thousands of teams already using ${siteName}.`,
        buttonLabel: "Start free →",
        buttonUrl: "#",
      };
      return shell(
        id,
        "cta-strip",
        "CTA Strip",
        tokens,
        `<div ${widgetAttrs("cta-strip", "CTA Strip", [
          { key: "title", label: "Title", type: "text", placeholder: "Ready to get started?" },
          { key: "body", label: "Body", type: "textarea", placeholder: "Join thousands of teams already using Sitezy." },
          { key: "buttonLabel", label: "Button Label", type: "text", placeholder: "Start free →" },
          { key: "buttonUrl", label: "Button URL", type: "text", placeholder: "#" },
        ], ctaStripState)} style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:28px 32px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${primaryGlow};"><div><h3 ${widgetPartAttr("title")} style="margin:0 0 4px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:22px;color:${tokens.text};">${ctaStripState.title}</h3><p ${widgetPartAttr("body")} style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">${ctaStripState.body}</p></div><a ${widgetPartAttr("button-url")} href="${ctaStripState.buttonUrl}" style="padding:14px 24px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;white-space:nowrap;box-shadow:0 12px 28px ${primaryGlow};"><span ${widgetPartAttr("button-label")}>${ctaStripState.buttonLabel}</span></a></div>`,
      );
    }
    case "newsletter": {
      const newsletterState = {
        title: "Stay in the loop",
        body: "Get insights, product updates, and resources delivered to your inbox.",
        placeholder: "Your email address",
        buttonLabel: "Subscribe",
        note: "No spam. Unsubscribe any time.",
      };
      return shell(
        id,
        "newsletter",
        "Newsletter",
        tokens,
        `<div ${widgetAttrs("newsletter", "Newsletter", [
          { key: "title", label: "Title", type: "text", placeholder: "Stay in the loop" },
          { key: "body", label: "Body", type: "textarea", placeholder: "Get insights, product updates, and resources delivered to your inbox." },
          { key: "placeholder", label: "Input Placeholder", type: "text", placeholder: "Your email address" },
          { key: "buttonLabel", label: "Button Label", type: "text", placeholder: "Subscribe" },
          { key: "note", label: "Note", type: "text", placeholder: "No spam. Unsubscribe any time." },
        ], newsletterState)} style="text-align:center;max-width:560px;margin:0 auto;display:grid;gap:20px;"><h2 ${widgetPartAttr("title")} style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${newsletterState.title}</h2><p ${widgetPartAttr("body")} style="margin:0;font-size:16px;line-height:1.8;color:${tokens.muted};">${newsletterState.body}</p><form style="display:flex;gap:10px;" onsubmit="return false;"><input ${widgetPartAttr("placeholder")} type="email" placeholder="${newsletterState.placeholder}" style="flex:1;padding:14px 18px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;font-family:'${tokens.bodyFont}',system-ui,sans-serif;" /><button type="submit" ${widgetPartAttr("button-label")} style="padding:14px 22px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;white-space:nowrap;box-shadow:0 10px 24px ${primaryGlow};">${newsletterState.buttonLabel}</button></form><p ${widgetPartAttr("note")} style="margin:0;font-size:12px;color:${tokens.muted};">${newsletterState.note}</p></div>`,
      );
    }
    case "footer": {
      const footerState = {
        brand: siteName,
        tagline: tagline.slice(0, 72),
      };
      const footerLinks = [["Privacy", "#"], ["Terms", "#"], ["Contact", "#"]] as const;
      return `<footer data-sz-section-id="${id}" data-sz-section-type="footer" data-sz-section-name="Footer" ${widgetAttrs("footer", "Footer", [
        { key: "brand", label: "Brand", type: "text", placeholder: siteName },
        { key: "tagline", label: "Tagline", type: "textarea", placeholder: tagline.slice(0, 72) },
      ], footerState)} style="padding:36px 32px;background:${tokens.text};color:#fff;font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><div style="width:min(100%,${tokens.containerWidth});margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;"><div><strong ${widgetPartAttr("brand")} style="display:block;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:18px;">${footerState.brand}</strong><span ${widgetPartAttr("tagline")} style="font-size:13px;color:rgba(255,255,255,0.55);">${footerState.tagline}</span></div><div ${collectionAttrs("footer-links", "Footer Links", [
        { key: "label", label: "Label", type: "text", placeholder: "Privacy" },
        { key: "url", label: "URL", type: "text", placeholder: "#" },
      ])} data-sz-collection-items="1" style="display:flex;gap:20px;flex-wrap:wrap;">${footerLinks.map(([label, url], index) => `<div ${collectionItemAttr(`footer-link-${index + 1}`)}><a data-sz-footer-link="1" href="${url}" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:14px;"><span ${collectionFieldAttr("label")}>${label}</span></a><span ${collectionFieldAttr("url")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${url}</span></div>`).join("")}</div></div></footer>`;
    }
    case "footer-columns": {
      const footerColumnsState = {
        brand: siteName,
        tagline: tagline.slice(0, 80),
        copyright: `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`,
      };
      const footerColumns = [
        ["Product", ["Overview", "Pricing", "Changelog"]],
        ["Company", ["About", "Careers", "Contact"]],
        ["Legal", ["Privacy", "Terms", "Security"]],
      ] as const;
      return `<footer data-sz-section-id="${id}" data-sz-section-type="footer" data-sz-section-name="Footer Columns" ${widgetAttrs("footer-columns", "Footer Columns", [
        { key: "brand", label: "Brand", type: "text", placeholder: siteName },
        { key: "tagline", label: "Tagline", type: "textarea", placeholder: tagline.slice(0, 80) },
        { key: "copyright", label: "Copyright", type: "text", placeholder: `© ${new Date().getFullYear()} ${siteName}. All rights reserved.` },
      ], footerColumnsState)} style="padding:56px 32px 28px;background:${tokens.text};color:#fff;font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><div style="width:min(100%,${tokens.containerWidth});margin:0 auto;"><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px;margin-bottom:40px;"><div><strong ${widgetPartAttr("brand")} style="display:block;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:20px;margin-bottom:10px;">${footerColumnsState.brand}</strong><p ${widgetPartAttr("tagline")} style="margin:0 0 16px;font-size:13px;line-height:1.75;color:rgba(255,255,255,.5);max-width:220px;">${footerColumnsState.tagline}</p></div><div ${collectionAttrs("footer-columns", "Footer Columns", [
        { key: "heading", label: "Heading", type: "text", placeholder: "Product" },
        { key: "links", label: "Links", type: "list", placeholder: "Overview\nPricing\nChangelog" },
      ], { fixed: true })} data-sz-collection-items="1" style="display:contents;">${footerColumns.map(([heading, links], index) => `<div ${collectionItemAttr(`footer-column-${index + 1}`)}><p ${collectionFieldAttr("heading")} style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.35);">${heading}</p><div ${collectionFieldAttr("links", "list")} style="display:grid;gap:10px;">${links.map((label) => `<a data-sz-footer-column-link="1" href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:13px;">${label}</a>`).join("")}</div></div>`).join("")}</div></div><div style="border-top:1px solid rgba(255,255,255,.08);padding-top:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;"><span ${widgetPartAttr("copyright")} style="font-size:12px;color:rgba(255,255,255,.3);">${footerColumnsState.copyright}</span></div></div></footer>`;
    }
    // ── New section blocks ──────────────────────────────────────────────────────
    case "blog-grid": {
      const blogState = {
        title: "From the blog",
        subtitle: "Insights, guides, and updates from the team.",
      };
      const posts = [
        [
          "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=640&q=80",
          "Design Systems in 2025",
          "Learn how to build scalable, consistent design systems that your team will actually use.",
          "Mar 12, 2025",
          "Design",
          "Read more",
          "#",
        ],
        [
          "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=640&q=80",
          "The Future of AI Workflows",
          "Explore how AI is changing the way product teams think, build, and ship software.",
          "Mar 5, 2025",
          "AI",
          "Read more",
          "#",
        ],
        [
          "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=640&q=80",
          "Writing Copy That Converts",
          "A practical guide to writing landing page copy that speaks to your audience and drives action.",
          "Feb 28, 2025",
          "Copy",
          "Read more",
          "#",
        ],
      ] as const;
      return shell(
        id,
        "section",
        "Blog Grid",
        tokens,
        `<div ${widgetAttrs("blog-grid", "Blog Grid", [
          { key: "title", label: "Title", type: "text", placeholder: "From the blog" },
          { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Insights, guides, and updates from the team." },
        ], blogState)} ${collectionAttrs("blog-grid", "Blog Posts", [
          { key: "title", label: "Title", type: "text", placeholder: "Design Systems in 2025" },
          { key: "tag", label: "Tag", type: "text", placeholder: "Design" },
          { key: "excerpt", label: "Excerpt", type: "textarea", placeholder: "Write a short summary…" },
          { key: "date", label: "Date", type: "text", placeholder: "Mar 12, 2025" },
          { key: "cta", label: "CTA Label", type: "text", placeholder: "Read more" },
          { key: "url", label: "URL", type: "text", placeholder: "https://example.com/post" },
          { key: "image", label: "Image", type: "image", placeholder: "https://example.com/post.jpg" },
        ], { fixed: true })}><div style="text-align:center;margin-bottom:32px;"><h2 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${blogState.title}</h2><p ${widgetPartAttr("subtitle")} style="margin:0 auto;max-width:520px;font-size:15px;line-height:1.75;color:${tokens.muted};">${blogState.subtitle}</p></div><div data-sz-collection-items="1" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">${posts.map(([image, title, excerpt, date, tag, cta, url], index) => `<article ${collectionItemAttr(`blog-post-${index + 1}`)} style="border-radius:${tokens.radius};overflow:hidden;background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><img ${collectionFieldAttr("image", "image")} src="${image}" alt="${title}" style="width:100%;height:180px;object-fit:cover;display:block;" /><div style="padding:20px;"><span ${collectionFieldAttr("tag")} style="display:inline-block;padding:4px 10px;border-radius:999px;background:${tokens.softBg};font-size:11px;font-weight:700;color:${tokens.primary};margin:0 0 10px;">${tag}</span><h3 ${collectionFieldAttr("title")} style="margin:0 0 8px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:18px;font-weight:700;line-height:1.3;color:${tokens.text};">${title}</h3><p ${collectionFieldAttr("excerpt", "textarea")} style="margin:0 0 14px;font-size:13px;line-height:1.7;color:${tokens.muted};">${excerpt}</p><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><span ${collectionFieldAttr("date")} style="font-size:12px;color:${tokens.muted};">${date}</span><a data-sz-blog-link="1" href="${url}" style="font-size:13px;font-weight:600;color:${tokens.primary};text-decoration:none;"><span ${collectionFieldAttr("cta")}>${cta}</span></a><span ${collectionFieldAttr("url")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${url}</span></div></div></article>`).join("")}</div></div>`,
        tokens.softBg,
      );
    }
    case "contact": {
      const contactState = {
        title: "Get in touch",
        body: "We'd love to hear from you. Fill out the form or reach us directly.",
        buttonLabel: "Send message",
      };
      const contactItems = [
        ["📍", "Address", "123 Main Street, Suite 100\nNew York, NY 10001"],
        ["📞", "Phone", "+1 (555) 000-0000"],
        ["✉️", "Email", `hello@${siteName.toLowerCase().replace(/\s/g, "")}.com`],
        ["🕐", "Hours", "Mon – Fri, 9am – 6pm EST"],
      ] as const;
      return shell(id, "contact", "Contact", tokens, `<div ${widgetAttrs("contact", "Contact", [
        { key: "title", label: "Title", type: "text", placeholder: "Get in touch" },
        { key: "body", label: "Body", type: "textarea", placeholder: "We'd love to hear from you. Fill out the form or reach us directly." },
        { key: "buttonLabel", label: "Button Label", type: "text", placeholder: "Send message" },
      ], contactState)} style="display:grid;grid-template-columns:1fr 1.4fr;gap:48px;align-items:start;"><div><h2 ${widgetPartAttr("title")} style="margin:0 0 14px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${contactState.title}</h2><p ${widgetPartAttr("body")} style="margin:0 0 28px;font-size:16px;line-height:1.8;color:${tokens.muted};">${contactState.body}</p><div ${collectionAttrs("contact-details", "Contact Details", [
        { key: "label", label: "Label", type: "text", placeholder: "Address" },
        { key: "value", label: "Value", type: "textarea", placeholder: "123 Main Street" },
        { key: "icon", label: "Icon", type: "text", placeholder: "📍" },
      ], { fixed: true })} data-sz-collection-items="1" style="display:grid;gap:16px;">${contactItems.map(([icon, label, value], index) => `<div ${collectionItemAttr(`contact-detail-${index + 1}`)} style="display:flex;gap:12px;"><span ${collectionFieldAttr("icon")} style="font-size:18px;line-height:1;">${icon}</span><div><p ${collectionFieldAttr("label")} style="margin:0 0 2px;font-size:13px;font-weight:700;color:${tokens.text};">${label}</p><p ${collectionFieldAttr("value", "textarea")} style="margin:0;font-size:13px;color:${tokens.muted};white-space:pre-line;">${value}</p></div></div>`).join("")}</div></div><div style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><form style="display:grid;gap:14px;" onsubmit="return false;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;"><div><label style="display:block;font-size:12px;font-weight:700;color:${tokens.text};margin:0 0 6px;">First name</label><input placeholder="Alex" style="width:100%;padding:11px 14px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;box-sizing:border-box;" /></div><div><label style="display:block;font-size:12px;font-weight:700;color:${tokens.text};margin:0 0 6px;">Last name</label><input placeholder="Johnson" style="width:100%;padding:11px 14px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;box-sizing:border-box;" /></div></div><div><label style="display:block;font-size:12px;font-weight:700;color:${tokens.text};margin:0 0 6px;">Email</label><input type="email" placeholder="alex@example.com" style="width:100%;padding:11px 14px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;box-sizing:border-box;" /></div><div><label style="display:block;font-size:12px;font-weight:700;color:${tokens.text};margin:0 0 6px;">Message</label><textarea rows="4" placeholder="Tell us how we can help…" style="width:100%;padding:11px 14px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea></div><button type="submit" ${widgetPartAttr("button-label")} style="padding:14px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;box-shadow:0 10px 24px ${primaryGlow};">${contactState.buttonLabel}</button></form></div></div>`);
    }
    case "comparison": {
      const comparisonState = {
        title: "How we compare",
        subtitle: `See how ${siteName} stacks up against the alternatives.`,
        featureLabel: "Feature",
        primaryLabel: siteName,
        secondaryLabel: "Competitor A",
        tertiaryLabel: "Competitor B",
      };
      const rows = [
        ["Custom branding", "✓", "✓", "✗"],
        ["AI generation", "✓", "✗", "✗"],
        ["Export to code", "✓", "✓", "✗"],
        ["Team collaboration", "✓", "✓", "✓"],
        ["Priority support", "✓", "✗", "✗"],
        ["No code required", "✓", "✗", "✓"],
      ] as const;
      return shell(
        id,
        "section",
        "Comparison",
        tokens,
        `<div ${widgetAttrs("comparison", "Comparison", [
          { key: "title", label: "Title", type: "text", placeholder: "How we compare" },
          { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "See how Sitezy stacks up against the alternatives." },
          { key: "featureLabel", label: "Feature Column", type: "text", placeholder: "Feature" },
          { key: "primaryLabel", label: "Primary Column", type: "text", placeholder: siteName },
          { key: "secondaryLabel", label: "Secondary Column", type: "text", placeholder: "Competitor A" },
          { key: "tertiaryLabel", label: "Tertiary Column", type: "text", placeholder: "Competitor B" },
        ], comparisonState)} ${collectionAttrs("comparison", "Comparison Rows", [
          { key: "feature", label: "Feature", type: "text", placeholder: "Custom branding" },
          { key: "primary", label: "Primary Value", type: "text", placeholder: "✓" },
          { key: "secondary", label: "Secondary Value", type: "text", placeholder: "✓" },
          { key: "tertiary", label: "Tertiary Value", type: "text", placeholder: "✗" },
        ], { fixed: true })}><div style="text-align:center;margin-bottom:32px;"><h2 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${comparisonState.title}</h2><p ${widgetPartAttr("subtitle")} style="margin:0 auto;max-width:520px;font-size:15px;line-height:1.75;color:${tokens.muted};">${comparisonState.subtitle}</p></div><div style="overflow-x:auto;border-radius:${tokens.radius};border:1px solid ${tokens.border};"><table style="width:100%;border-collapse:collapse;font-size:14px;font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><thead><tr style="border-bottom:2px solid ${tokens.border};"><th ${widgetPartAttr("feature-label")} style="padding:16px 20px;text-align:left;color:${tokens.muted};font-weight:600;">${comparisonState.featureLabel}</th><th ${widgetPartAttr("primary-label")} style="padding:16px 20px;text-align:center;font-weight:800;color:${tokens.primary};background:rgba(${hexToRgb(tokens.primary)},0.04);">${comparisonState.primaryLabel}</th><th ${widgetPartAttr("secondary-label")} style="padding:16px 20px;text-align:center;font-weight:800;color:${tokens.text};">${comparisonState.secondaryLabel}</th><th ${widgetPartAttr("tertiary-label")} style="padding:16px 20px;text-align:center;font-weight:800;color:${tokens.text};">${comparisonState.tertiaryLabel}</th></tr></thead><tbody data-sz-collection-items="1">${rows.map(([feature, primary, secondary, tertiary], index) => `<tr ${collectionItemAttr(`comparison-row-${index + 1}`)} style="border-bottom:1px solid ${tokens.border};background:${index % 2 === 0 ? tokens.softBg : "transparent"};"><td ${collectionFieldAttr("feature")} style="padding:14px 20px;font-weight:500;color:${tokens.text};">${feature}</td><td ${collectionFieldAttr("primary")} data-sz-comparison-cell="1" data-sz-comparison-column="primary" style="padding:14px 20px;text-align:center;font-size:18px;color:${primary === "✓" ? tokens.primary : "#ef4444"};background:rgba(${hexToRgb(tokens.primary)},0.03);">${primary}</td><td ${collectionFieldAttr("secondary")} data-sz-comparison-cell="1" data-sz-comparison-column="secondary" style="padding:14px 20px;text-align:center;font-size:18px;color:${secondary === "✓" ? "#22c55e" : "#ef4444"};">${secondary}</td><td ${collectionFieldAttr("tertiary")} data-sz-comparison-cell="1" data-sz-comparison-column="tertiary" style="padding:14px 20px;text-align:center;font-size:18px;color:${tertiary === "✓" ? "#22c55e" : "#ef4444"};">${tertiary}</td></tr>`).join("")}</tbody></table></div></div>`,
        tokens.softBg,
      );
    }
    case "gallery-masonry": {
      const galleryState = {
        title: "Our work",
        subtitle: "A flexible masonry wall for project imagery, case-study screenshots, or editorial moments.",
      };
      const images = [
        ["https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80", "Studio workspace", "260"],
        ["https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80", "Creative meeting notes", "180"],
        ["https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80", "Collaboration session", "220"],
        ["https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80", "Code and design setup", "200"],
        ["https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80", "Interface closeup", "240"],
        ["https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80", "Analytics screen", "190"],
      ] as const;
      return shell(
        id,
        "gallery",
        "Gallery Masonry",
        tokens,
        `<div ${widgetAttrs("gallery-masonry", "Gallery Masonry", [
          { key: "title", label: "Title", type: "text", placeholder: "Our work" },
          { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "A flexible masonry wall for project imagery, case-study screenshots, or editorial moments." },
        ], galleryState)} ${collectionAttrs("gallery-masonry", "Masonry Images", [
          { key: "alt", label: "Alt Text", type: "text", placeholder: "Gallery image" },
          { key: "height", label: "Height", type: "text", placeholder: "220" },
          { key: "image", label: "Image", type: "image", placeholder: "https://example.com/gallery.jpg" },
        ], { fixed: true })}><div style="text-align:center;margin-bottom:28px;display:grid;gap:10px;"><h2 ${widgetPartAttr("title")} style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${galleryState.title}</h2><p ${widgetPartAttr("subtitle")} style="margin:0 auto;max-width:620px;font-size:15px;line-height:1.75;color:${tokens.muted};">${galleryState.subtitle}</p></div><div data-sz-collection-items="1" style="columns:3;column-gap:12px;">${images.map(([image, alt, height], index) => `<div ${collectionItemAttr(`masonry-image-${index + 1}`)} style="break-inside:avoid;margin-bottom:12px;border-radius:${tokens.radius};overflow:hidden;"><img ${collectionFieldAttr("image", "image")} src="${image}" alt="${alt}" style="width:100%;height:${height}px;object-fit:cover;display:block;" /><span ${collectionFieldAttr("alt")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${alt}</span><span ${collectionFieldAttr("height")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${height}</span></div>`).join("")}</div></div>`,
      );
    }
    case "video-section": {
      const videoState = {
        title: "See it in action",
        body: `Watch how ${siteName} transforms your workflow in under 2 minutes.`,
        videoUrl: "https://www.youtube.com/embed/ScMzIvxBSi4?playsinline=1&rel=0&modestbranding=1",
      };
      return shell(id, "section", "Video Section", tokens, `<div ${widgetAttrs("video-section", "Video Section", [
        { key: "title", label: "Title", type: "text", placeholder: "See it in action" },
        { key: "body", label: "Body", type: "textarea", placeholder: `Watch how ${siteName} transforms your workflow in under 2 minutes.` },
        { key: "videoUrl", label: "Video URL", type: "text", placeholder: "https://www.youtube.com/embed/..." },
      ], videoState)}><div style="text-align:center;max-width:720px;margin:0 auto 28px;"><h2 ${widgetPartAttr("title")} style="margin:0 0 12px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">${videoState.title}</h2><p ${widgetPartAttr("body")} style="margin:0;font-size:16px;line-height:1.8;color:${tokens.muted};">${videoState.body}</p></div><div style="border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};background:#000;"><div style="position:relative;padding-top:56.25%;"><iframe ${widgetPartAttr("video-url")} src="${videoState.videoUrl}" title="Product demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;"></iframe></div></div></div>`);
    }
    case "carousel": {
      const carouselId = `carousel-${uid().slice(0, 6)}`;
      const slides = [
        ["photo-1497366754035-f200968a6e72", "Editorial systems", "Tighter hierarchy, better pacing, cleaner conversion."],
        ["photo-1522202176988-66273c2fd55f", "Product clarity", "Showcase the strongest proof and keep the eye moving."],
        ["photo-1461749280684-dccba630e2f6", "Launch-ready output", "A polished presentation block for stories or case studies."],
      ] as const;
      const go = (index: number) => `var root=document.getElementById('${carouselId}');if(!root)return false;var track=root.querySelector('[data-carousel-track]');var slide=root.querySelector('[data-slide-index=\"${index}\"]');if(track&&slide){track.scrollTo({left:slide.offsetLeft,behavior:'smooth'});}return false;`;
      return shell(id, "gallery", "Carousel", tokens, `<div id="${carouselId}" ${collectionAttrs("carousel", "Carousel Slides", [
        { key: "image", label: "Image", type: "image", placeholder: "https://…" },
        { key: "title", label: "Title" },
        { key: "body", label: "Description", type: "textarea" },
      ], { fixed: true })}><div style="text-align:center;margin-bottom:24px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">Swipe through the story</h2><p style="margin:0 auto;max-width:560px;font-size:15px;line-height:1.75;color:${tokens.muted};">A smooth scroll-snap carousel for highlights, visuals, or sequential messaging.</p></div><div data-carousel-track data-sz-collection-items="1" style="display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;padding-bottom:8px;">${slides.map(([photo, title, body], index) => `<article ${collectionItemAttr(`carousel-${index + 1}`)} data-slide-index="${index}" style="flex:0 0 min(82vw, 760px);scroll-snap-align:start;border-radius:${tokens.radius};overflow:hidden;background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><img ${collectionFieldAttr("image", "image")} src="https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1400&q=80" alt="${title}" style="width:100%;height:360px;object-fit:cover;display:block;" /><div style="padding:22px 24px;display:grid;gap:8px;"><h3 ${collectionFieldAttr("title")} style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:28px;color:${tokens.text};">${title}</h3><p ${collectionFieldAttr("body", "textarea")} style="margin:0;font-size:15px;line-height:1.75;color:${tokens.muted};">${body}</p></div></article>`).join("")}</div><div data-sz-collection-nav="carousel" style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:18px;">${slides.map((_, index) => `<button type="button" onclick="${go(index)}" style="width:${index===0?"34px":"12px"};height:12px;border-radius:999px;border:1px solid rgba(${hexToRgb(tokens.primary)},0.24);background:${index===0?tokens.primary:tokens.bg};cursor:pointer;"></button>`).join("")}</div></div>`, tokens.softBg);
    }
    case "testimonial-slider": {
      const sliderId = `testimonial-${uid().slice(0, 6)}`;
      const quotes = [
        ["“The builder finally felt fast, sharp, and ready for clients.”", "Samir O.", "Founder, Atelier"],
        ["“We shipped a premium landing page in hours instead of days.”", "Leena K.", "Marketing Lead"],
        ["“The editing flow felt much more trustworthy after the rebuild.”", "Omar H.", "Creative Director"],
      ] as const;
      const go = (index: number) => `var root=document.getElementById('${sliderId}');if(!root)return false;var track=root.querySelector('[data-testimonial-track]');var slide=root.querySelector('[data-testimonial-index=\"${index}\"]');if(track&&slide){track.scrollTo({left:slide.offsetLeft,behavior:'smooth'});}return false;`;
      return shell(id, "testimonial", "Testimonial Slider", tokens, `<div id="${sliderId}" ${collectionAttrs("testimonial-slider", "Testimonial Slider", [
        { key: "quote", label: "Quote", type: "textarea" },
        { key: "name", label: "Name" },
        { key: "role", label: "Role" },
      ], { fixed: true })}><div style="text-align:center;margin-bottom:24px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">What clients keep saying</h2><p style="margin:0 auto;max-width:520px;font-size:15px;color:${tokens.muted};">A scrollable testimonial format with clear social proof and cleaner pacing.</p></div><div data-testimonial-track data-sz-collection-items="1" style="display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;padding-bottom:8px;">${quotes.map(([quote, name, role], index) => `<article ${collectionItemAttr(`testimonial-slider-${index + 1}`)} data-testimonial-index="${index}" style="flex:0 0 min(78vw, 680px);scroll-snap-align:start;padding:34px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};display:grid;gap:18px;"><div style="font-size:42px;line-height:1;color:${tokens.primary};">“</div><blockquote ${collectionFieldAttr("quote", "textarea")} style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:30px;line-height:1.42;color:${tokens.text};">${quote.replace(/^“|”$/g,"")}</blockquote><div style="display:flex;align-items:center;gap:12px;"><div data-sz-avatar-initial="1" style="width:46px;height:46px;border-radius:999px;background:${tokens.softBg};display:flex;align-items:center;justify-content:center;color:${tokens.primary};font-weight:800;">${name.charAt(0)}</div><div><p ${collectionFieldAttr("name")} style="margin:0;font-size:14px;font-weight:700;color:${tokens.text};">${name}</p><p ${collectionFieldAttr("role")} style="margin:0;font-size:12px;color:${tokens.muted};">${role}</p></div></div></article>`).join("")}</div><div data-sz-collection-nav="testimonial-slider" style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:18px;">${quotes.map((_, index) => `<button type="button" onclick="${go(index)}" style="padding:8px 12px;border-radius:999px;border:1px solid ${tokens.border};background:${index===0?tokens.softBg:tokens.bg};color:${index===0?tokens.primary:tokens.text};font-size:12px;font-weight:700;cursor:pointer;">${String(index + 1).padStart(2, "0")}</button>`).join("")}</div></div>`, tokens.softBg);
    }

    // ── Decorative sections ─────────────────────────────────────────────────────
    case "wave-divider":
      return `<section data-sz-section-id="${id}" data-sz-section-type="section" data-sz-section-name="Wave Divider" style="padding:0;overflow:hidden;line-height:0;background:${tokens.bg};font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><svg viewBox="0 0 1200 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="display:block;width:100%;height:80px;"><defs><linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:rgba(${hexToRgb(tokens.primary)},0.08)"/><stop offset="50%" style="stop-color:rgba(${hexToRgb(tokens.primary)},0.18)"/><stop offset="100%" style="stop-color:rgba(${hexToRgb(tokens.primary)},0.08)"/></linearGradient></defs><path d="M0,0 C150,80 350,0 600,40 C850,80 1050,0 1200,40 L1200,80 L0,80 Z" fill="url(#wg)"/><path d="M0,20 C200,70 400,10 600,50 C800,90 1000,20 1200,55 L1200,80 L0,80 Z" fill="rgba(${hexToRgb(tokens.primary)},0.06)"/></svg></section>`;
    case "banner": {
      const bannerState = {
        message: "🎉 New feature just launched —",
        ctaLabel: "Learn more →",
        ctaUrl: "#",
      };
      return `<div data-sz-section-id="${id}" data-sz-section-type="section" data-sz-section-name="Banner Strip" ${widgetAttrs("banner", "Banner Strip", [
        { key: "message", label: "Message", type: "text", placeholder: "🎉 New feature just launched —" },
        { key: "ctaLabel", label: "CTA Label", type: "text", placeholder: "Learn more →" },
        { key: "ctaUrl", label: "CTA URL", type: "text", placeholder: "#" },
      ], bannerState)} style="padding:12px 24px;background:${tokens.primary};color:#fff;text-align:center;font-family:'${tokens.bodyFont}',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;gap:16px;"><span style="font-size:14px;font-weight:600;"><span ${widgetPartAttr("message")}>${bannerState.message}</span> <a ${widgetPartAttr("cta-url")} href="${bannerState.ctaUrl}" style="color:#fff;font-weight:800;text-decoration:underline;text-underline-offset:2px;"><span ${widgetPartAttr("cta-label")}>${bannerState.ctaLabel}</span></a></span></div>`;
    }
    case "alert-bar":
      return shell(id, "section", "Alert Bar", tokens, `<div style="display:flex;align-items:flex-start;gap:14px;padding:20px 24px;border-radius:${tokens.radius};background:rgba(${hexToRgb(tokens.primary)},0.08);border:1px solid rgba(${hexToRgb(tokens.primary)},0.22);"><div style="font-size:20px;flex-shrink:0;">💡</div><div><p style="margin:0 0 4px;font-size:15px;font-weight:700;color:${tokens.text};">Important notice</p><p style="margin:0;font-size:14px;line-height:1.7;color:${tokens.muted};">Edit this text to share an important update, tip, or call-to-action with your visitors.</p></div></div>`);
    case "shape-row":
      return shell(id, "section", "Shape Row", tokens, `<div style="display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;">${[[64,1],[80,0.6],[48,0.85],[96,0.45],[72,0.75]].map(([size,op]) => `<div style="width:${size}px;height:${size}px;border-radius:${Math.random()>.5?"50%":tokens.radius};background:rgba(${hexToRgb(tokens.primary)},${op * 0.25});border:1px solid rgba(${hexToRgb(tokens.primary)},${op * 0.3});"></div>`).join("")}</div>`);

    default:
      return shell(id, "section", "Section", tokens, `<div style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><h3 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;color:${tokens.text};">${blockId}</h3><p style="margin:0;color:${tokens.muted};line-height:1.75;">A flexible content block ready for this page.</p></div>`);
  }
}

/** HTML for a standalone SVG icon span, colored with the project's primary color. */
export function buildIconHtml(iconId: string, iconPaths: string, project: Project): string {
  const primary = project.blueprint?.colorScheme?.primary ?? "#7c3aed";
  const open = `<span data-sz-icon="true" style="display:inline-flex;align-items:center;justify-content:center;line-height:0;vertical-align:middle;align-self:flex-start;position:relative;z-index:1;color:${primary};width:32px;height:32px;flex-shrink:0;cursor:pointer;" title="${iconId}">`;
  const svg = ["<svg viewBox=", '"0 0 24 24"', " fill=", '"none"', " stroke=", '"currentColor"', " stroke-width=", '"2"', " stroke-linecap=", '"round"', " stroke-linejoin=", '"round"', " style=", '"width:100%;height:100%;"', ">", iconPaths, "</svg>"].join("");
  return open + svg + "</span>";
}

/** HTML for inline elements — no section shell, ready to append inside an existing section container. */
export function buildInlineHtml(blockId: string, project: Project, page?: ProjectPage | null): string {
  const tokens = inferTokens(project);
  const primaryGlow = `rgba(${hexToRgb(tokens.primary)}, 0.18)`;
  const controlBase = `width:100%;padding:13px 16px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;box-sizing:border-box;font-family:'${tokens.bodyFont}',system-ui,sans-serif;`;
  const fieldLabel = (text: string) => `<label style="display:block;margin-bottom:6px;font-size:12px;font-weight:700;letter-spacing:.02em;color:${tokens.text};">${text}</label>`;

  switch (blockId) {
    case "heading":
      return `<div ${widgetAttrs("heading", "Heading", [
        { key: "title", label: "Title", type: "text", placeholder: "Section Heading" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Supporting subtext that matches the site voice." },
      ], { title: "Section Heading", body: "Supporting subtext that matches the site voice." })} style="margin:0 0 24px;"><h2 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(26px,4vw,44px);line-height:1.08;letter-spacing:-0.02em;color:${tokens.text};">Section Heading</h2><p ${widgetPartAttr("body")} style="margin:0;font-size:16px;line-height:1.75;color:${tokens.muted};">Supporting subtext that matches the site voice.</p></div>`;
    case "paragraph":
      return `<p ${widgetAttrs("paragraph", "Paragraph", [
        { key: "body", label: "Body", type: "textarea", placeholder: "This paragraph uses clear, natural copy that fits the tone and rhythm of the page." },
      ], { body: "This paragraph uses clear, natural copy that fits the tone and rhythm of the page." })} ${widgetPartAttr("body")} style="margin:0 0 20px;font-size:17px;line-height:1.85;color:${tokens.text};">This paragraph uses clear, natural copy that fits the tone and rhythm of the page.</p>`;
    case "button":
      return `<div ${widgetAttrs("button", "Button", [
        { key: "label", label: "Label", type: "text", placeholder: "Primary action" },
        { key: "url", label: "URL", type: "text", placeholder: "#" },
      ], { label: "Primary action", url: "#" })} style="margin:0 0 20px;"><a ${widgetPartAttr("url")} href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 24px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:15px;font-weight:700;box-shadow:0 10px 26px ${primaryGlow};"><span ${widgetPartAttr("label")}>Primary action</span></a></div>`;
    case "button-outline":
      return `<div ${widgetAttrs("button-outline", "Outline Button", [
        { key: "label", label: "Label", type: "text", placeholder: "Secondary action" },
        { key: "url", label: "URL", type: "text", placeholder: "#" },
      ], { label: "Secondary action", url: "#" })} style="margin:0 0 20px;"><a ${widgetPartAttr("url")} href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 24px;border-radius:${tokens.buttonRadius};border:1.5px solid ${tokens.primary};background:transparent;color:${tokens.primary};text-decoration:none;font-size:15px;font-weight:700;"><span ${widgetPartAttr("label")}>Secondary action</span></a></div>`;
    case "icon-button":
      return `<div ${widgetAttrs("icon-button", "Icon Button", [
        { key: "label", label: "Label", type: "text", placeholder: "Take action" },
        { key: "url", label: "URL", type: "text", placeholder: "#" },
      ], { label: "Take action", url: "#" })} style="margin:0 0 20px;"><a ${widgetPartAttr("url")} href="#" style="display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:14px 22px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;box-shadow:0 10px 26px ${primaryGlow};"><span data-sz-icon="true" style="display:inline-flex;align-items:center;justify-content:center;line-height:0;color:currentColor;width:18px;height:18px;flex-shrink:0;"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"width:100%;height:100%;\"><path d=\"M5 12h14\"></path><path d=\"m12 5 7 7-7 7\"></path></svg></span><span ${widgetPartAttr("label")}>Take action</span></a></div>`;
    case "badge":
      return `<div ${widgetAttrs("badge", "Badge", [
        { key: "label", label: "Label", type: "text", placeholder: "Label" },
      ], { label: "Label" })} style="margin:0 0 16px;"><span ${widgetPartAttr("label")} style="display:inline-flex;align-items:center;padding:6px 14px;border-radius:999px;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.22);font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${tokens.primary};">Label</span></div>`;
    case "blockquote":
      return `<blockquote ${widgetAttrs("blockquote", "Blockquote", [
        { key: "quote", label: "Quote", type: "textarea", placeholder: "A compelling pull-quote that anchors the reader's attention and builds credibility." },
      ], { quote: "A compelling pull-quote that anchors the reader's attention and builds credibility." })} ${widgetPartAttr("quote")} style="margin:0 0 20px;padding:20px 24px;border-left:4px solid ${tokens.primary};background:${tokens.softBg};border-radius:0 ${tokens.radius} ${tokens.radius} 0;font-size:18px;line-height:1.7;color:${tokens.text};font-style:italic;">"A compelling pull-quote that anchors the reader's attention and builds credibility."</blockquote>`;
    case "divider":
      return `<hr style="margin:16px 0;border:none;border-top:1px solid ${tokens.border};" />`;
    case "spacer":
      return `<div style="height:80px;" aria-hidden="true"></div>`;
    case "image":
      return `<figure ${widgetAttrs("image", "Image", [
        { key: "src", label: "Image URL", type: "text", placeholder: "https://images.unsplash.com/..." },
        { key: "alt", label: "Alt Text", type: "text", placeholder: "Image" },
      ], { src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80", alt: "Image" })} style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><img ${widgetPartAttr("src")} src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80" alt="Image" style="width:100%;height:320px;object-fit:cover;display:block;" /><span ${widgetPartAttr("alt")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">Image</span></figure>`;
    case "video":
      return `<figure ${widgetAttrs("video", "Video", [
        { key: "src", label: "Video URL", type: "text", placeholder: "https://example.com/video.mp4" },
        { key: "poster", label: "Poster URL", type: "text", placeholder: "https://example.com/poster.jpg" },
      ], { src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", poster: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80" })} style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};background:#000;"><video ${widgetPartAttr("src")} src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" ${widgetPartAttr("poster")} poster="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80" controls playsinline style="width:100%;height:360px;display:block;object-fit:cover;background:#000;"></video></figure>`;
    case "youtube":
      return `<div ${widgetAttrs("youtube", "YouTube Embed", [
        { key: "src", label: "Embed URL", type: "text", placeholder: "https://www.youtube.com/embed/..." },
      ], { src: "https://www.youtube.com/embed/ScMzIvxBSi4?playsinline=1&rel=0&modestbranding=1" })} style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};background:#000;"><div style="position:relative;padding-top:56.25%;"><iframe ${widgetPartAttr("src")} src="https://www.youtube.com/embed/ScMzIvxBSi4?playsinline=1&rel=0&modestbranding=1" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000;"></iframe></div></div>`;
    case "embed":
      return `<div ${widgetAttrs("embed", "Custom Embed", [
        { key: "src", label: "Embed URL", type: "text", placeholder: "https://player.vimeo.com/video/..." },
        { key: "title", label: "Title", type: "text", placeholder: "Embedded content" },
      ], { src: "https://player.vimeo.com/video/76979871", title: "Embedded content" })} style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};background:${tokens.bg};"><div style="position:relative;padding-top:56.25%;"><iframe ${widgetPartAttr("src")} src="https://player.vimeo.com/video/76979871" title="Embedded content" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000;"></iframe><span ${widgetPartAttr("title")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">Embedded content</span></div></div>`;
    case "icon-block":
      return `<div ${widgetAttrs("icon-block", "Icon Block", [
        { key: "icon", label: "Icon", type: "text", placeholder: "◈" },
        { key: "title", label: "Title", type: "text", placeholder: "Icon block title" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Supporting description for this feature or benefit." },
      ], { icon: "◈", title: "Icon block title", body: "Supporting description for this feature or benefit." })} style="display:flex;align-items:flex-start;gap:16px;margin:0 0 20px;padding:20px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};"><div ${widgetPartAttr("icon")} style="width:44px;height:44px;border-radius:${tokens.buttonRadius};background:${tokens.softBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;color:${tokens.primary};">◈</div><div><h4 ${widgetPartAttr("title")} style="margin:0 0 6px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:16px;font-weight:700;color:${tokens.text};">Icon block title</h4><p ${widgetPartAttr("body")} style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Supporting description for this feature or benefit.</p></div></div>`;
    case "card":
      return `<div ${widgetAttrs("card", "Card", [
        { key: "title", label: "Title", type: "text", placeholder: "Card title" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Use this card for a short feature, highlight, or supporting detail." },
      ], { title: "Card title", body: "Use this card for a short feature, highlight, or supporting detail." })} style="margin:0 0 20px;padding:24px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><h3 ${widgetPartAttr("title")} style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:20px;color:${tokens.text};">Card title</h3><p ${widgetPartAttr("body")} style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Use this card for a short feature, highlight, or supporting detail.</p></div>`;
    case "contact-form":
      {
        const spec = inferFormSpec(project, page);
        return `<div ${widgetAttrs("contact-form", "Contact Form", [
          { key: "title", label: "Title", type: "text", placeholder: spec.title },
          { key: "description", label: "Description", type: "textarea", placeholder: spec.description },
          { key: "submitLabel", label: "Submit Label", type: "text", placeholder: spec.submitLabel },
        ], { title: spec.title, description: spec.description, submitLabel: spec.submitLabel })} style="margin:0 0 20px;padding:24px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><div style="display:grid;gap:8px;margin-bottom:18px;"><h3 ${widgetPartAttr("title")} style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:24px;line-height:1.1;color:${tokens.text};">${spec.title}</h3><p ${widgetPartAttr("description")} style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">${spec.description}</p></div><form style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;" onsubmit="return false;">${spec.fields.map((field) => renderFormField(field, tokens)).join("")}<div style="grid-column:1 / -1;display:flex;justify-content:flex-start;"><button type="submit" style="padding:14px 22px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;box-shadow:0 10px 24px ${primaryGlow};"><span ${widgetPartAttr("submit-label")}>${spec.submitLabel}</span></button></div></form></div>`;
      }
    // ── Layout containers ──────────────────────────────────────────────────────
    case "container":
      return `<div ${widgetAttrs("container-primitive", "Container", [
        { key: "title", label: "Title", type: "text", placeholder: "Container" },
        { key: "body", label: "Body", type: "textarea", placeholder: "A neutral wrapper for cards, copy, media, or custom layouts." },
      ], { title: "Container", body: "A neutral wrapper for cards, copy, media, or custom layouts." })} style="margin:0 0 20px;min-height:140px;padding:24px;border-radius:${tokens.radius};border:1px dashed rgba(${hexToRgb(tokens.primary)},0.28);background:${tokens.softBg};display:grid;place-items:center;"><div style="text-align:center;max-width:320px;"><p ${widgetPartAttr("title")} style="margin:0 0 6px;font-size:14px;font-weight:700;color:${tokens.text};">Container</p><p ${widgetPartAttr("body")} style="margin:0;font-size:13px;line-height:1.7;color:${tokens.muted};">A neutral wrapper for cards, copy, media, or custom layouts.</p></div></div>`;
    case "flex-container":
      return `<div ${collectionAttrs("flex-container", "Flex Items", [
        { key: "title", label: "Title", type: "text", placeholder: "First item" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Flexible content cell that adapts to the current page rhythm." },
      ])} data-sz-collection-items="1" style="display:flex;flex-wrap:wrap;align-items:stretch;gap:16px;margin:0 0 20px;">${["First item","Second item","Third item"].map((title, index) => `<div ${collectionItemAttr(`flex-item-${index + 1}`)} style="flex:1 1 220px;min-width:180px;padding:18px;border-radius:${tokens.radius};background:${index === 1 ? tokens.bg : tokens.softBg};border:1px solid ${tokens.border};box-shadow:${index === 1 ? tokens.shadow : "none"};"><p ${collectionFieldAttr("title")} style="margin:0 0 8px;font-size:15px;font-weight:700;color:${tokens.text};">${title}</p><p ${collectionFieldAttr("body", "textarea")} style="margin:0;font-size:13px;line-height:1.7;color:${tokens.muted};">Flexible content cell that adapts to the current page rhythm.</p></div>`).join("")}</div>`;
    case "grid-container":
      return `<div ${collectionAttrs("grid-container", "Grid Cells", [
        { key: "title", label: "Title", type: "text", placeholder: "Grid cell one" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Use this as a raw grid primitive for feature cells, stats, or media." },
      ])} data-sz-collection-items="1" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:0 0 20px;">${["Grid cell one","Grid cell two","Grid cell three","Grid cell four"].map((title, index) => `<div ${collectionItemAttr(`grid-cell-${index + 1}`)} style="min-height:120px;padding:18px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};display:flex;flex-direction:column;justify-content:flex-end;"><p ${collectionFieldAttr("title")} style="margin:0 0 6px;font-size:15px;font-weight:700;color:${tokens.text};">${title}</p><p ${collectionFieldAttr("body", "textarea")} style="margin:0;font-size:13px;line-height:1.7;color:${tokens.muted};">Use this as a raw grid primitive for feature cells, stats, or media.</p></div>`).join("")}</div>`;
    case "two-columns":
      return `<div ${widgetAttrs("two-columns", "Two Columns", [
        { key: "leftTitle", label: "Left Title", type: "text", placeholder: "Column one" },
        { key: "leftBody", label: "Left Body", type: "textarea", placeholder: "Content for the left column goes here." },
        { key: "rightTitle", label: "Right Title", type: "text", placeholder: "Column two" },
        { key: "rightBody", label: "Right Body", type: "textarea", placeholder: "Content for the right column goes here." },
      ], { leftTitle: "Column one", leftBody: "Content for the left column goes here.", rightTitle: "Column two", rightBody: "Content for the right column goes here." })} style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:0 0 20px;"><div style="padding:20px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${tokens.border};"><h4 ${widgetPartAttr("left-title")} style="margin:0 0 8px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:17px;font-weight:700;color:${tokens.text};">Column one</h4><p ${widgetPartAttr("left-body")} style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Content for the left column goes here.</p></div><div style="padding:20px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${tokens.border};"><h4 ${widgetPartAttr("right-title")} style="margin:0 0 8px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:17px;font-weight:700;color:${tokens.text};">Column two</h4><p ${widgetPartAttr("right-body")} style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Content for the right column goes here.</p></div></div>`;
    case "three-columns":
      return `<div ${collectionAttrs("three-columns", "Columns", [
        { key: "title", label: "Title", type: "text", placeholder: "First column" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Editable content block." },
      ])} data-sz-collection-items="1" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:0 0 20px;">${["First column","Second column","Third column"].map((title, i) => `<div ${collectionItemAttr(`three-column-${i + 1}`)} style="padding:18px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${tokens.border};"><div style="width:36px;height:36px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;margin:0 0 12px;">${i+1}</div><h4 ${collectionFieldAttr("title")} style="margin:0 0 6px;font-size:15px;font-weight:700;color:${tokens.text};">${title}</h4><p ${collectionFieldAttr("body", "textarea")} style="margin:0;font-size:13px;line-height:1.7;color:${tokens.muted};">Editable content block.</p></div>`).join("")}</div>`;
    case "accordion": {
      const items = [["What is this for?","Use this accordion for FAQ-style Q&A, expandable content sections, or progressive disclosure of detailed information."],["How do I customize it?","Click any text to edit inline, or use the Style tab to adjust colors, fonts, and spacing to match your brand."],["Can I add more items?","Yes — duplicate any list item in the editor or add more <details> elements to expand this accordion."]];
      return `<div ${collectionAttrs("accordion", "Accordion Items", [
        { key: "question", label: "Question" },
        { key: "answer", label: "Answer", type: "textarea" },
      ], { fixed: true })} style="margin:0 0 20px;display:grid;gap:8px;">${items.map(([q,a], index) => `<details ${collectionItemAttr(`accordion-${index + 1}`)} style="border:1px solid ${tokens.border};border-radius:${tokens.radius};overflow:hidden;background:${tokens.bg};"><summary style="padding:14px 18px;font-size:15px;font-weight:600;color:${tokens.text};cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;"><span ${collectionFieldAttr("question")}>${q}</span><span style="font-size:18px;line-height:1;color:${tokens.muted};flex-shrink:0;">+</span></summary><p ${collectionFieldAttr("answer", "textarea")} style="margin:0;padding:0 18px 14px;font-size:14px;line-height:1.8;color:${tokens.muted};">${a}</p></details>`).join("")}</div>`;
    }
    case "tabs": {
      const tid = `t${uid().slice(0,6)}`;
      const activateTab = (index: number) => `var root=document.getElementById('${tid}');if(!root)return false;root.querySelectorAll('[data-sz-tab-trigger-index]').forEach(function(btn,btnIndex){btn.style.color=btnIndex===${index}?'${tokens.primary}':'${tokens.muted}';btn.style.borderBottomColor=btnIndex===${index}?'${tokens.primary}':'transparent';});root.querySelectorAll('[data-sz-tab-panel-index]').forEach(function(panel,panelIndex){panel.style.display=panelIndex===${index}?'block':'none';});return false;`;
      const tabs = [
        ["Overview", "Overview content goes here. Edit this panel for the first tab."],
        ["Features", "Feature highlights for the second tab. Add bullet points, icons, or cards."],
        ["Details", "Detailed information for the third tab. Add specs, tables, or expanded content."],
      ] as const;
      return `<div id="${tid}" ${collectionAttrs("tabs", "Tabs", [
        { key: "label", label: "Label" },
        { key: "body", label: "Content", type: "textarea" },
      ], { fixed: true })} style="margin:0 0 20px;"><div data-sz-tabs-nav style="display:flex;border-bottom:2px solid ${tokens.border};flex-wrap:wrap;">${tabs.map(([label], index) => `<button type="button" data-sz-tab-trigger-index="${index}" onclick="${activateTab(index)}" style="padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;color:${index===0?tokens.primary:tokens.muted};border:none;border-bottom:2px solid ${index===0?tokens.primary:'transparent'};background:transparent;margin-bottom:-2px;transition:color .15s,border-color .15s;"><span data-sz-tab-label="1">${label}</span></button>`).join("")}</div><div data-sz-tabs-panels>${tabs.map(([_, body], index) => `<div data-sz-tab-panel-index="${index}" style="display:${index===0?'block':'none'};padding:20px 0;"><p data-sz-tab-body="1" style="margin:0;font-size:15px;line-height:1.8;color:${tokens.text};">${body}</p></div>`).join("")}</div><div data-sz-collection-items="1" style="display:none;">${tabs.map(([label, body], index) => `<div ${collectionItemAttr(`tab-${index + 1}`)}><span ${collectionFieldAttr("label")}>${label}</span><span ${collectionFieldAttr("body", "textarea")}>${body}</span></div>`).join("")}</div></div>`;
    }
    case "step-list": {
      const steps = ["Discover","Design","Deliver","Deploy"];
      return `<ol ${collectionAttrs("step-list", "Steps", [
        { key: "title", label: "Title" },
        { key: "description", label: "Description", type: "textarea" },
      ], { fixed: true })} style="margin:0 0 20px;padding:0;list-style:none;">${steps.map((s,i) => `<li ${collectionItemAttr(`step-${i + 1}`)} style="display:flex;gap:16px;padding-bottom:${i<steps.length-1?"28px":"0"};position:relative;"><div style="position:relative;z-index:1;"><div style="width:40px;height:40px;border-radius:50%;background:${tokens.primary};color:#fff;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 16px ${primaryGlow};">0${i+1}</div>${i<steps.length-1?`<div style="position:absolute;left:19px;top:40px;width:2px;height:calc(100% - 40px + 28px);background:linear-gradient(to bottom,${tokens.primary}55,${tokens.border})"></div>`:""}</div><div style="padding-top:8px;"><h4 ${collectionFieldAttr("title")} style="margin:0 0 4px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:17px;font-weight:700;color:${tokens.text};">${s}</h4><p ${collectionFieldAttr("description", "textarea")} style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Short description of step ${i+1} that guides the user through the process.</p></div></li>`).join("")}</ol>`;
    }

    // ── Text extras ────────────────────────────────────────────────────────────
    case "list":
      return `<ul ${collectionAttrs("list-items", "List Items", [
        { key: "label", label: "Item", type: "text", placeholder: "First list item with clear, natural copy" },
      ])} data-sz-collection-items="1" style="margin:0 0 20px;padding:0 0 0 22px;list-style:disc;color:${tokens.text};">${["First list item with clear, natural copy","Second item that builds on the first","Third item adding more depth","Final item that wraps things up"].map((item, index) => `<li ${collectionItemAttr(`list-item-${index + 1}`)} ${collectionFieldAttr("label")} style="margin:0 0 ${index === 3 ? "0" : "8px"};font-size:16px;line-height:1.65;">${item}</li>`).join("")}</ul>`;
    case "icon-list": {
      const ck = `<svg viewBox="0 0 24 24" fill="none" stroke="${tokens.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;margin-top:2px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      return `<ul ${collectionAttrs("icon-list-items", "Icon List", [
        { key: "icon", label: "Icon", type: "text", placeholder: "✓" },
        { key: "label", label: "Item", type: "text", placeholder: "Feature one that matters to users" },
      ])} data-sz-collection-items="1" style="margin:0 0 20px;padding:0;list-style:none;">${[
        ["✓", "Feature one that matters to users"],
        ["✓", "Feature two with measurable impact"],
        ["✓", "Feature three that builds trust"],
        ["✓", "Feature four that closes the deal"],
      ].map(([icon, label], index) => `<li ${collectionItemAttr(`icon-list-item-${index + 1}`)} style="display:flex;align-items:flex-start;gap:10px;margin:0 0 ${index === 3 ? "0" : "10px"};"><span ${collectionFieldAttr("icon")} style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;margin-top:2px;color:${tokens.primary};font-size:14px;font-weight:800;">${icon}</span><span ${collectionFieldAttr("label")} style="font-size:15px;line-height:1.55;color:${tokens.text};">${label}</span></li>`).join("")}</ul>`;
    }
    case "pill-list":
      return `<div ${collectionAttrs("pill-list", "Pills", [
        { key: "label", label: "Pill", type: "text", placeholder: "Design" },
      ])} data-sz-collection-items="1" style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px;">${["Design","Development","Strategy","UX Research","Branding","Analytics"].map((t, index) => `<span ${collectionItemAttr(`pill-${index + 1}`)} ${collectionFieldAttr("label")} style="padding:6px 16px;border-radius:999px;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.18);font-size:13px;font-weight:600;color:${tokens.primary};">${t}</span>`).join("")}</div>`;
    case "highlight-text":
      return `<p ${widgetAttrs("highlight-text", "Highlight Text", [
        { key: "before", label: "Before Highlight", type: "text", placeholder: "We believe great design is about" },
        { key: "highlight", label: "Highlight", type: "text", placeholder: "clarity and intention" },
        { key: "after", label: "After Highlight", type: "text", placeholder: "not decoration for its own sake." },
      ], { before: "We believe great design is about", highlight: "clarity and intention", after: "not decoration for its own sake." })} style="margin:0 0 20px;font-size:20px;line-height:1.75;color:${tokens.text};"><span ${widgetPartAttr("before")}>We believe great design is about</span> <mark ${widgetPartAttr("highlight")} style="background:linear-gradient(120deg,rgba(${hexToRgb(tokens.primary)},0.22) 0%,rgba(${hexToRgb(tokens.primary)},0.1) 100%);color:${tokens.primary};padding:2px 6px;border-radius:6px;font-style:normal;">clarity and intention</mark>, <span ${widgetPartAttr("after")}>not decoration for its own sake.</span></p>`;
    case "table":
      return `<div ${widgetAttrs("table", "Table", [
        { key: "header1", label: "Header 1", type: "text", placeholder: "Name" },
        { key: "header2", label: "Header 2", type: "text", placeholder: "Role" },
        { key: "header3", label: "Header 3", type: "text", placeholder: "Status" },
        { key: "header4", label: "Header 4", type: "text", placeholder: "Value" },
      ], { header1: "Name", header2: "Role", header3: "Status", header4: "Value" })} ${collectionAttrs("table", "Rows", [
        { key: "col1", label: "Column 1", type: "text", placeholder: "Alex Johnson" },
        { key: "col2", label: "Column 2", type: "text", placeholder: "Designer" },
        { key: "col3", label: "Column 3", type: "text", placeholder: "Active" },
        { key: "col4", label: "Column 4", type: "text", placeholder: "$4,200" },
      ])} style="margin:0 0 20px;overflow-x:auto;border-radius:${tokens.radius};border:1px solid ${tokens.border};"><table style="width:100%;border-collapse:collapse;font-size:14px;font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><thead><tr style="background:${tokens.softBg};"><th ${widgetPartAttr("header1")} style="padding:12px 16px;text-align:left;font-weight:700;color:${tokens.text};border-bottom:1px solid ${tokens.border};white-space:nowrap;">Name</th><th ${widgetPartAttr("header2")} style="padding:12px 16px;text-align:left;font-weight:700;color:${tokens.text};border-bottom:1px solid ${tokens.border};white-space:nowrap;">Role</th><th ${widgetPartAttr("header3")} style="padding:12px 16px;text-align:left;font-weight:700;color:${tokens.text};border-bottom:1px solid ${tokens.border};white-space:nowrap;">Status</th><th ${widgetPartAttr("header4")} style="padding:12px 16px;text-align:left;font-weight:700;color:${tokens.text};border-bottom:1px solid ${tokens.border};white-space:nowrap;">Value</th></tr></thead><tbody data-sz-collection-items="1">${[["Alex Johnson","Designer","Active","$4,200"],["Priya Kumar","Engineer","Active","$5,800"],["Sam Torres","Product","Away","$4,900"]].map((row,ri) => `<tr ${collectionItemAttr(`table-row-${ri + 1}`)} style="background:${ri%2===1?tokens.softBg:"transparent"};">${row.map((cell, cellIndex)=>`<td ${collectionFieldAttr(`col${cellIndex + 1}`)} style="padding:12px 16px;color:${tokens.muted};border-bottom:1px solid ${tokens.border};">${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    case "code-block":
      return `<div ${widgetAttrs("code-block", "Code Block", [
        { key: "filename", label: "Filename", type: "text", placeholder: "script.js" },
        { key: "code", label: "Code", type: "textarea", placeholder: "function greet(name) {\n  return `Hello, ${name}!`;\n}" },
      ], { filename: "script.js", code: "function greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet(\"World\"));" })} style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid rgba(255,255,255,0.09);background:#1e1e2e;"><div style="padding:10px 16px;background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:#ff5f56;display:inline-block;"></span><span style="width:10px;height:10px;border-radius:50%;background:#ffbd2e;display:inline-block;"></span><span style="width:10px;height:10px;border-radius:50%;background:#27c93f;display:inline-block;"></span><span ${widgetPartAttr("filename")} style="margin-left:8px;font-size:11px;color:rgba(255,255,255,0.4);font-family:monospace;">script.js</span></div><pre style="margin:0;padding:20px;font-family:'Fira Code',Consolas,monospace;font-size:13px;line-height:1.8;color:#cdd6f4;overflow-x:auto;white-space:pre-wrap;"><code ${widgetPartAttr("code")}>function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));</code></pre></div>`;
    case "alert":
      return `<div ${widgetAttrs("alert", "Alert", [
        { key: "title", label: "Title", type: "text", placeholder: "Heads up!" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Edit this alert message for important notices, tips, or callouts on your page." },
      ], { title: "Heads up!", body: "Edit this alert message for important notices, tips, or callouts on your page." })} style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:${tokens.radius};background:rgba(${hexToRgb(tokens.primary)},0.07);border:1px solid rgba(${hexToRgb(tokens.primary)},0.2);margin:0 0 20px;"><svg viewBox="0 0 24 24" fill="none" stroke="${tokens.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><div><p ${widgetPartAttr("title")} style="margin:0 0 3px;font-size:14px;font-weight:700;color:${tokens.text};">Heads up!</p><p ${widgetPartAttr("body")} style="margin:0;font-size:13px;line-height:1.75;color:${tokens.muted};">Edit this alert message for important notices, tips, or callouts on your page.</p></div></div>`;
    case "text-link":
      return `<a ${widgetAttrs("text-link", "Text Link", [
        { key: "label", label: "Label", type: "text", placeholder: "Learn more" },
        { key: "url", label: "URL", type: "text", placeholder: "#" },
      ], { label: "Learn more", url: "#" })} ${widgetPartAttr("url")} href="#" style="display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:600;color:${tokens.primary};text-decoration:none;border-bottom:2px solid rgba(${hexToRgb(tokens.primary)},0.3);padding-bottom:1px;margin:0 0 16px;display:inline-flex;"><span ${widgetPartAttr("label")}>Learn more</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>`;
    case "breadcrumb":
      return `<nav aria-label="Breadcrumb" style="margin:0 0 20px;display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:13px;color:${tokens.muted};"><a href="#" style="color:${tokens.muted};text-decoration:none;">Home</a><span style="opacity:.45;">/</span><a href="#" style="color:${tokens.muted};text-decoration:none;">Collection</a><span style="opacity:.45;">/</span><span style="color:${tokens.text};font-weight:600;">Current page</span></nav>`;
    case "pagination":
      return `<nav aria-label="Pagination" style="margin:0 0 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;"><a href="#" style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};text-decoration:none;font-size:13px;font-weight:600;">← Previous</a><div style="display:flex;align-items:center;gap:8px;">${["1","2","3"].map((pageNumber, index) => `<a href="#" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:${tokens.buttonRadius};text-decoration:none;font-size:13px;font-weight:700;border:1px solid ${index===1?`rgba(${hexToRgb(tokens.primary)},0.3)` : tokens.border};background:${index===1?tokens.softBg:tokens.bg};color:${index===1?tokens.primary:tokens.text};">${pageNumber}</a>`).join("")}</div><a href="#" style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};text-decoration:none;font-size:13px;font-weight:600;">Next →</a></nav>`;

    // ── Form primitives ────────────────────────────────────────────────────────
    case "text-input":
      return `<div ${widgetAttrs("text-input", "Text Input", [
        { key: "label", label: "Label", type: "text", placeholder: "Full name" },
        { key: "placeholder", label: "Placeholder", type: "text", placeholder: "Enter full name" },
      ], { label: "Full name", placeholder: "Enter full name" })} style="margin:0 0 20px;"><label ${widgetPartAttr("label")} style="display:block;margin-bottom:6px;font-size:12px;font-weight:700;letter-spacing:.02em;color:${tokens.text};">Full name</label><input ${widgetPartAttr("placeholder")} type="text" name="full_name" placeholder="Enter full name" style="${controlBase}" /></div>`;
    case "textarea-field":
      return `<div ${widgetAttrs("textarea-field", "Textarea", [
        { key: "label", label: "Label", type: "text", placeholder: "Message" },
        { key: "placeholder", label: "Placeholder", type: "text", placeholder: "Type your message here" },
      ], { label: "Message", placeholder: "Type your message here" })} style="margin:0 0 20px;"><label ${widgetPartAttr("label")} style="display:block;margin-bottom:6px;font-size:12px;font-weight:700;letter-spacing:.02em;color:${tokens.text};">Message</label><textarea ${widgetPartAttr("placeholder")} name="message" rows="5" placeholder="Type your message here" style="${controlBase}resize:vertical;min-height:140px;"></textarea></div>`;
    case "select-field":
      return `<div ${widgetAttrs("select-field", "Select", [
        { key: "label", label: "Label", type: "text", placeholder: "Topic" },
      ], { label: "Topic" })} style="margin:0 0 20px;"><label ${widgetPartAttr("label")} style="display:block;margin-bottom:6px;font-size:12px;font-weight:700;letter-spacing:.02em;color:${tokens.text};">Topic</label><select name="topic" style="${controlBase}"><option value="general">General inquiry</option><option value="sales">Sales question</option><option value="support">Support request</option></select></div>`;
    case "checkbox-field":
      return `<label ${widgetAttrs("checkbox-field", "Checkbox", [
        { key: "label", label: "Label", type: "text", placeholder: "I agree to receive product updates and helpful tips." },
      ], { label: "I agree to receive product updates and helpful tips." })} style="display:flex;align-items:flex-start;gap:12px;padding:16px 18px;margin:0 0 20px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${tokens.border};cursor:pointer;"><input type="checkbox" checked style="margin-top:3px;width:16px;height:16px;accent-color:${tokens.primary};flex-shrink:0;" /><span ${widgetPartAttr("label")} style="font-size:14px;line-height:1.7;color:${tokens.text};">I agree to receive product updates and helpful tips.</span></label>`;
    case "radio-group": {
      const groupName = `plan-${uid().slice(0, 6)}`;
      return `<fieldset ${widgetAttrs("radio-group", "Radio Group", [
        { key: "legend", label: "Legend", type: "text", placeholder: "Choose a plan" },
      ], { legend: "Choose a plan" })} ${collectionAttrs("radio-group", "Radio Options", [
        { key: "label", label: "Option", type: "text", placeholder: "Starter" },
      ])} style="margin:0 0 20px;padding:18px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};display:grid;gap:10px;"><legend ${widgetPartAttr("legend")} style="padding:0 6px;font-size:12px;font-weight:700;letter-spacing:.02em;color:${tokens.text};">Choose a plan</legend><div data-sz-collection-items="1" style="display:grid;gap:10px;">${["Starter","Growth","Scale"].map((option, index) => `<label ${collectionItemAttr(`radio-option-${index + 1}`)} style="display:flex;align-items:center;gap:10px;font-size:14px;color:${tokens.text};cursor:pointer;"><input type="radio" name="${groupName}" ${index === 1 ? "checked" : ""} style="width:16px;height:16px;accent-color:${tokens.primary};flex-shrink:0;" /><span ${collectionFieldAttr("label")}>${option}</span></label>`).join("")}</div></fieldset>`;
    }
    case "toggle-switch":
      return `<label ${widgetAttrs("toggle-switch", "Toggle", [
        { key: "title", label: "Title", type: "text", placeholder: "Enable notifications" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Let visitors opt into updates with a clear on/off switch." },
      ], { title: "Enable notifications", body: "Let visitors opt into updates with a clear on/off switch." })} style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;margin:0 0 20px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};cursor:pointer;"><div><p ${widgetPartAttr("title")} style="margin:0 0 3px;font-size:14px;font-weight:700;color:${tokens.text};">Enable notifications</p><p ${widgetPartAttr("body")} style="margin:0;font-size:12px;line-height:1.6;color:${tokens.muted};">Let visitors opt into updates with a clear on/off switch.</p></div><span style="position:relative;display:inline-flex;align-items:center;width:48px;height:28px;border-radius:999px;background:${tokens.primary};box-shadow:inset 0 0 0 1px rgba(${hexToRgb(tokens.primary)},0.18);flex-shrink:0;"><span style="position:absolute;right:3px;width:22px;height:22px;border-radius:999px;background:#fff;box-shadow:0 4px 12px rgba(15,23,42,0.2);"></span></span><input type="checkbox" checked style="display:none;" /></label>`;

    // ── Media extras ────────────────────────────────────────────────────────────
    case "icon-circle":
      return `<div ${widgetAttrs("icon-circle", "Icon Circle", [
        { key: "icon", label: "Icon", type: "text", placeholder: "✓" },
      ], { icon: "✓" })} style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.18);margin:0 0 16px;"><span ${widgetPartAttr("icon")} style="font-size:28px;font-weight:800;color:${tokens.primary};line-height:1;">✓</span></div>`;
    case "avatar":
      return `<div ${widgetAttrs("avatar", "Avatar", [
        { key: "image", label: "Image URL", type: "text", placeholder: "https://example.com/avatar.jpg" },
        { key: "name", label: "Name", type: "text", placeholder: "Alex Johnson" },
        { key: "role", label: "Role", type: "text", placeholder: "Product Designer" },
      ], { image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format&q=80", name: "Alex Johnson", role: "Product Designer" })} style="display:flex;align-items:center;gap:12px;margin:0 0 16px;"><img ${widgetPartAttr("image")} src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format&q=80" alt="Avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid rgba(${hexToRgb(tokens.primary)},0.25);flex-shrink:0;" /><div><p ${widgetPartAttr("name")} style="margin:0 0 2px;font-size:15px;font-weight:700;color:${tokens.text};">Alex Johnson</p><p ${widgetPartAttr("role")} style="margin:0;font-size:13px;color:${tokens.muted};">Product Designer</p></div></div>`;
    case "avatar-group": {
      const avatarSummary = {
        extra: "+9",
        label: "Join 200+ happy customers",
      };
      const people = [
        ["Alex", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&auto=format&q=80"],
        ["Priya", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&auto=format&q=80"],
        ["Sam", "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=60&h=60&fit=crop&auto=format&q=80"],
      ];
      return `<div ${widgetAttrs("avatar-group", "Avatar Group", [
        { key: "extra", label: "Extra Count", type: "text", placeholder: "+9" },
        { key: "label", label: "Caption", type: "text", placeholder: "Join 200+ happy customers" },
      ], avatarSummary)} ${collectionAttrs("avatar-group", "Avatars", [
        { key: "name", label: "Name", type: "text", placeholder: "Alex" },
        { key: "image", label: "Image", type: "image", placeholder: "https://example.com/avatar.jpg" },
      ], { fixed: true })} style="display:inline-flex;align-items:center;gap:10px;margin:0 0 20px;flex-wrap:wrap;"><div data-sz-collection-items="1" style="display:flex;align-items:center;">${people.map(([name, photo], index) => `<div ${collectionItemAttr(`avatar-${index + 1}`)} style="position:relative;display:flex;align-items:center;"><img ${collectionFieldAttr("image", "image")} src="${photo}" alt="${name}" style="width:34px;height:34px;border-radius:50%;border:2px solid white;object-fit:cover;margin-right:-10px;" /><span ${collectionFieldAttr("name")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${name}</span></div>`).join("")}<div ${widgetPartAttr("extra")} style="width:34px;height:34px;border-radius:50%;background:${tokens.softBg};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${tokens.primary};">${avatarSummary.extra}</div></div><span ${widgetPartAttr("label")} style="font-size:14px;color:${tokens.muted};">${avatarSummary.label}</span></div>`;
    }
    case "rating": {
      const ratingState = {
        score: "4.9",
        reviews: "2,400 reviews",
        stars: "5",
      };
      const ratingFields: WidgetFieldDef[] = [
        { key: "score", label: "Score", type: "text", placeholder: "4.9" },
        { key: "reviews", label: "Reviews", type: "text", placeholder: "2,400 reviews" },
        { key: "stars", label: "Stars", type: "number", min: 1, max: 5, step: 1 },
      ];
      const stars = Array.from({ length: 5 }, (_, index) => `
        <svg viewBox="0 0 24 24" fill="${tokens.primary}" fill-opacity="${index < 5 ? "1" : "0.24"}" stroke="none" style="width:18px;height:18px;">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>`).join("");
      return `<div ${widgetAttrs("rating", "Rating", ratingFields, ratingState)} style="display:flex;align-items:center;gap:8px;margin:0 0 16px;flex-wrap:wrap;"><div ${widgetPartAttr("stars")} style="display:flex;gap:2px;align-items:center;">${stars}</div><span ${widgetPartAttr("score")} style="font-size:14px;font-weight:700;color:${tokens.text};">${ratingState.score}</span><span ${widgetPartAttr("reviews")} style="font-size:13px;color:${tokens.muted};">${ratingState.reviews}</span></div>`;
    }
    case "social-links": {
      const links = [
        ["Twitter/X", "https://x.com/sitezy"],
        ["Instagram", "https://instagram.com/sitezy"],
        ["LinkedIn", "https://linkedin.com/company/sitezy"],
        ["GitHub", "https://github.com/sitezy"],
      ];
      return `<div ${collectionAttrs("social-links", "Social Links", [
        { key: "platform", label: "Platform", type: "text", placeholder: "Twitter/X" },
        { key: "url", label: "URL", type: "text", placeholder: "https://example.com" },
      ], { fixed: true })} data-sz-collection-items="1" style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 20px;">${links.map(([label, url], index) => `<a ${collectionItemAttr(`social-${index + 1}`)} href="${url}" title="${label}" style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.15);color:${tokens.primary};text-decoration:none;transition:background .2s;"><span ${collectionFieldAttr("platform")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${label}</span><span ${collectionFieldAttr("url")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${url}</span><svg data-sz-social-icon="1" viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;"><path d="${socialIconPath(label)}"></path></svg></a>`).join("")}</div>`;
    }
    case "map-embed":
      return `<div ${widgetAttrs("map-embed", "Map Embed", [
        { key: "src", label: "Embed URL", type: "text", placeholder: "https://www.google.com/maps/embed?..." },
      ], { src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9663095919364!2d-74.00425878459523!3d40.74076794379132!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259bf5c1654f3%3A0xc80f9cfce5383d5d!2sNew%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2sus!4v1" })} style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><iframe ${widgetPartAttr("src")} src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9663095919364!2d-74.00425878459523!3d40.74076794379132!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259bf5c1654f3%3A0xc80f9cfce5383d5d!2sNew%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2sus!4v1" width="100%" height="280" style="border:0;display:block;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;
    case "before-after":
      return `<div ${collectionAttrs("before-after", "Before / After", [
        { key: "label", label: "Label", type: "text", placeholder: "Before" },
        { key: "image", label: "Image", type: "image", placeholder: "https://example.com/photo.jpg" },
      ], { fixed: true })} style="margin:0 0 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;"><figure ${collectionItemAttr("before")} style="margin:0;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};background:${tokens.bg};"><img ${collectionFieldAttr("image", "image")} src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80" alt="Before" style="width:100%;height:260px;object-fit:cover;display:block;" /><figcaption ${collectionFieldAttr("label")} style="padding:12px 14px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${tokens.muted};">Before</figcaption></figure><figure ${collectionItemAttr("after")} style="margin:0;border-radius:${tokens.radius};overflow:hidden;border:1px solid rgba(${hexToRgb(tokens.primary)},0.26);box-shadow:${tokens.shadow};background:${tokens.bg};"><img ${collectionFieldAttr("image", "image")} src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80" alt="After" style="width:100%;height:260px;object-fit:cover;display:block;" /><figcaption ${collectionFieldAttr("label")} style="padding:12px 14px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${tokens.primary};">After</figcaption></figure></div>`;

    // ── Decorative inline ──────────────────────────────────────────────────────
    case "progress-bar": {
      const progressState = {
        label: "Progress",
        value: "75%",
        percent: "75",
      };
      return `<div ${widgetAttrs("progress-bar", "Progress Bar", [
        { key: "label", label: "Label", type: "text", placeholder: "Progress" },
        { key: "value", label: "Value Text", type: "text", placeholder: "75%" },
        { key: "percent", label: "Percent", type: "number", min: 0, max: 100, step: 1 },
      ], progressState)} style="margin:0 0 20px;display:grid;gap:8px;"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;"><span ${widgetPartAttr("label")} style="font-size:13px;font-weight:600;color:${tokens.text};">${progressState.label}</span><span ${widgetPartAttr("value")} style="font-size:13px;font-weight:700;color:${tokens.primary};">${progressState.value}</span></div><div style="height:8px;border-radius:999px;background:${tokens.softBg};overflow:hidden;"><div ${widgetPartAttr("fill")} style="width:${progressState.percent}%;height:100%;border-radius:999px;background:${tokens.primary};"></div></div></div>`;
    }
    case "counter-stat": {
      const counterState = {
        value: "99%",
        label: "Customer satisfaction",
      };
      return `<div ${widgetAttrs("counter-stat", "Stat Counter", [
        { key: "value", label: "Value", type: "text", placeholder: "99%" },
        { key: "label", label: "Label", type: "text", placeholder: "Customer satisfaction" },
      ], counterState)} style="text-align:center;padding:24px 16px;margin:0 0 20px;"><div ${widgetPartAttr("value")} style="font-size:clamp(40px,7vw,72px);font-weight:900;line-height:1;letter-spacing:-0.04em;color:${tokens.primary};font-family:'${tokens.headingFont}',system-ui,sans-serif;">${counterState.value}</div><div ${widgetPartAttr("label")} style="font-size:14px;color:${tokens.muted};margin-top:8px;">${counterState.label}</div></div>`;
    }
    case "notification": {
      const notificationState = {
        title: "New message",
        message: "You have 3 unread messages",
        time: "now",
      };
      return `<div ${widgetAttrs("notification", "Notification", [
        { key: "title", label: "Title", type: "text", placeholder: "New message" },
        { key: "message", label: "Message", type: "textarea", placeholder: "You have 3 unread messages" },
        { key: "time", label: "Time", type: "text", placeholder: "now" },
      ], notificationState)} style="display:inline-flex;align-items:center;gap:12px;padding:12px 16px;background:${tokens.bg};border:1px solid ${tokens.border};border-radius:${tokens.radius};box-shadow:${tokens.shadow};margin:0 0 20px;max-width:360px;"><div style="width:32px;height:32px;border-radius:50%;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg viewBox="0 0 24 24" fill="none" stroke="${tokens.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div><div style="min-width:0;"><p ${widgetPartAttr("title")} style="margin:0 0 1px;font-size:13px;font-weight:700;color:${tokens.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${notificationState.title}</p><p ${widgetPartAttr("message")} style="margin:0;font-size:12px;color:${tokens.muted};">${notificationState.message}</p></div><span ${widgetPartAttr("time")} style="margin-left:auto;font-size:11px;color:${tokens.muted};white-space:nowrap;flex-shrink:0;">${notificationState.time}</span></div>`;
    }
    case "countdown": {
      const countdownState = {
        targetDate: defaultCountdownTarget(),
        labelDays: "Days",
        labelHours: "Hours",
        labelMinutes: "Mins",
        labelSeconds: "Secs",
      };
      const countdownFields: WidgetFieldDef[] = [
        { key: "targetDate", label: "Target Date", type: "text", placeholder: "2026-04-05T18:00" },
        { key: "labelDays", label: "Days Label", type: "text", placeholder: "Days" },
        { key: "labelHours", label: "Hours Label", type: "text", placeholder: "Hours" },
        { key: "labelMinutes", label: "Minutes Label", type: "text", placeholder: "Mins" },
        { key: "labelSeconds", label: "Seconds Label", type: "text", placeholder: "Secs" },
      ];
      return `<div ${widgetAttrs("countdown", "Countdown", countdownFields, countdownState)} style="display:flex;gap:12px;flex-wrap:wrap;margin:0 0 20px;">${[
        ["days", "12", countdownState.labelDays],
        ["hours", "08", countdownState.labelHours],
        ["minutes", "45", countdownState.labelMinutes],
        ["seconds", "30", countdownState.labelSeconds],
      ].map(([key, value, label]) => `<div style="text-align:center;padding:14px 18px;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.12);border-radius:${tokens.radius};min-width:72px;"><div ${widgetPartAttr(`${key}-value`)} style="font-size:28px;font-weight:900;line-height:1;color:${tokens.primary};font-family:'${tokens.headingFont}',system-ui,sans-serif;">${value}</div><div ${widgetPartAttr(`${key}-label`)} style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${tokens.muted};margin-top:4px;">${label}</div></div>`).join("")}</div>`;
    }
    case "tag-cloud":
      return `<div ${collectionAttrs("tag-cloud", "Tag Cloud", [
        { key: "label", label: "Tag", type: "text", placeholder: "React" },
        { key: "size", label: "Size", type: "text", placeholder: "16" },
      ], { fixed: true })} data-sz-collection-items="1" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 20px;">${[
        ["React", "16"],
        ["TypeScript", "12"],
        ["Design Systems", "18"],
        ["Next.js", "14"],
        ["Tailwind", "13"],
        ["AI", "22"],
        ["Product", "15"],
        ["UX", "17"],
      ].map(([label, size], index) => `<span ${collectionItemAttr(`tag-${index + 1}`)} style="padding:4px 12px;border-radius:8px;background:${tokens.softBg};font-size:${size}px;font-weight:600;color:${tokens.text};opacity:0.9;"><span ${collectionFieldAttr("label")}>${label}</span><span ${collectionFieldAttr("size")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${size}</span></span>`).join("")}</div>`;
    case "floating-button":
      return `<div ${widgetAttrs("floating-button", "Floating Button", [
        { key: "label", label: "Label", type: "text", placeholder: "Chat with us" },
        { key: "url", label: "URL", type: "text", placeholder: "#" },
      ], { label: "Chat with us", url: "#" })} style="margin:0 0 20px;display:flex;justify-content:flex-end;"><a ${widgetPartAttr("url")} href="#" style="position:relative;display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:999px;background:${tokens.primary};color:#fff;text-decoration:none;font-size:13px;font-weight:700;box-shadow:0 14px 30px ${primaryGlow};"><span style="width:10px;height:10px;border-radius:999px;background:#fff;opacity:.92;"></span><span ${widgetPartAttr("label")}>Chat with us</span></a></div>`;
    case "sidebar-panel":
      return `<aside ${widgetAttrs("sidebar-panel", "Sidebar Panel", [
        { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Sidebar" },
        { key: "title", label: "Title", type: "text", placeholder: "Helpful links" },
      ], { eyebrow: "Sidebar", title: "Helpful links" })} ${collectionAttrs("sidebar-links", "Sidebar Links", [
        { key: "label", label: "Label", type: "text", placeholder: "Overview" },
        { key: "url", label: "URL", type: "text", placeholder: "#" },
      ])} style="margin:0 0 20px;padding:20px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};display:grid;gap:14px;max-width:320px;"><div><p ${widgetPartAttr("eyebrow")} style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${tokens.primary};">Sidebar</p><h4 ${widgetPartAttr("title")} style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:20px;color:${tokens.text};">Helpful links</h4></div><div data-sz-collection-items="1" style="display:grid;gap:10px;">${["Overview","Pricing","Case studies","Contact"].map((item, index) => `<a ${collectionItemAttr(`sidebar-link-${index + 1}`)} data-sz-sidebar-link="1" href="#" style="display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:${tokens.buttonRadius};text-decoration:none;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.12);color:${tokens.text};font-size:13px;font-weight:600;"><span ${collectionFieldAttr("label")}>${item}</span><span style="color:${tokens.primary};">→</span><span ${collectionFieldAttr("url")} style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">#</span></a>`).join("")}</div></aside>`;
    case "menu-item":
      return `<article style="margin:0 0 20px;padding:20px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};display:grid;gap:10px;"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;"><div><p style="margin:0 0 4px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:20px;color:${tokens.text};">Signature dish</p><p style="margin:0;font-size:14px;line-height:1.7;color:${tokens.muted};">Locally sourced ingredients with a seasonal finish and rich texture.</p></div><p style="margin:0;font-size:18px;font-weight:800;color:${tokens.primary};white-space:nowrap;">$24</p></div><div style="display:flex;flex-wrap:wrap;gap:8px;">${["Chef favorite","Vegetarian","Spicy"].map((tag) => `<span style="padding:5px 10px;border-radius:999px;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.16);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${tokens.primary};">${tag}</span>`).join("")}</div></article>`;
    case "modal-popup": {
      const modalId = `modal-${uid().slice(0, 6)}`;
      const modalState = {
        buttonLabel: "Open modal",
        eyebrow: "Popup",
        title: "Quick announcement",
        body: "Use this modal for gated updates, promo messages, feature announcements, or a focused call to action without leaving the page.",
        primaryLabel: "Primary action",
        secondaryLabel: "Dismiss",
      };
      const openModal = `var modal=document.getElementById('${modalId}');if(modal){modal.style.display='flex';}return false;`;
      const closeModal = `var modal=document.getElementById('${modalId}');if(modal){modal.style.display='none';}return false;`;
      return `<div ${widgetAttrs("modal-popup", "Modal Popup", [
        { key: "buttonLabel", label: "Button Label", type: "text", placeholder: "Open modal" },
        { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Popup" },
        { key: "title", label: "Title", type: "text", placeholder: "Quick announcement" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Use this modal for gated updates..." },
        { key: "primaryLabel", label: "Primary Button", type: "text", placeholder: "Primary action" },
        { key: "secondaryLabel", label: "Secondary Button", type: "text", placeholder: "Dismiss" },
      ], modalState)} style="margin:0 0 20px;"><a href="#" onclick="${openModal}" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 22px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;box-shadow:0 10px 26px ${primaryGlow};"><span data-sz-widget-part="button-label">${modalState.buttonLabel}</span></a><div id="${modalId}" onclick="if(event.target===this){${closeModal}}" style="display:none;position:fixed;inset:0;z-index:80;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,0.55);backdrop-filter:blur(6px);"><div style="width:min(100%,520px);padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};display:grid;gap:14px;"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;"><div><p data-sz-widget-part="eyebrow" style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${tokens.primary};">${modalState.eyebrow}</p><h3 data-sz-widget-part="title" style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:28px;color:${tokens.text};">${modalState.title}</h3></div><button type="button" onclick="${closeModal}" style="width:36px;height:36px;border-radius:999px;border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:18px;cursor:pointer;flex-shrink:0;">×</button></div><p data-sz-widget-part="body" style="margin:0;font-size:15px;line-height:1.8;color:${tokens.muted};">${modalState.body}</p><div style="display:flex;gap:10px;flex-wrap:wrap;"><a href="#" data-sz-widget-part="primary-label" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:13px;font-weight:700;">${modalState.primaryLabel}</a><a href="#" onclick="${closeModal}" data-sz-widget-part="secondary-label" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};text-decoration:none;font-size:13px;font-weight:700;">${modalState.secondaryLabel}</a></div></div></div></div>`;
    }

    // ── Decorative shapes ──────────────────────────────────────────────────────
    case "shape-circle":
      return `<div style="margin:0 0 20px;display:flex;justify-content:center;"><div style="width:120px;height:120px;border-radius:50%;background:${tokens.primary};opacity:0.85;"></div></div>`;
    case "shape-ring":
      return `<div style="margin:0 0 20px;display:flex;justify-content:center;"><div style="width:120px;height:120px;border-radius:50%;border:6px solid ${tokens.primary};opacity:0.85;"></div></div>`;
    case "shape-square":
      return `<div style="margin:0 0 20px;display:flex;justify-content:center;"><div style="width:120px;height:120px;border-radius:${tokens.radius};background:${tokens.primary};opacity:0.85;"></div></div>`;
    case "shape-diamond":
      return `<div style="margin:0 0 20px;display:flex;justify-content:center;"><div style="width:100px;height:100px;background:${tokens.primary};opacity:0.85;transform:rotate(45deg);border-radius:8px;"></div></div>`;
    case "shape-triangle":
      return `<div style="margin:0 0 20px;display:flex;justify-content:center;"><svg viewBox="0 0 120 104" style="width:120px;height:auto;"><polygon points="60,4 116,100 4,100" fill="${tokens.primary}" opacity="0.85" rx="4"/></svg></div>`;
    case "shape-pill":
      return `<div style="margin:0 0 20px;display:flex;justify-content:center;"><div style="width:180px;height:60px;border-radius:999px;background:${tokens.primary};opacity:0.85;"></div></div>`;
    case "shape-line": {
      const rgb = hexToRgb(tokens.primary);
      return `<div style="margin:0 0 20px;display:flex;align-items:center;gap:12px;"><div style="flex:1;height:2px;background:linear-gradient(to right,transparent,${tokens.primary},transparent);opacity:0.6;"></div><div style="width:8px;height:8px;border-radius:50%;background:${tokens.primary};flex-shrink:0;box-shadow:0 0 0 4px rgba(${rgb},0.18);"></div><div style="flex:1;height:2px;background:linear-gradient(to left,transparent,${tokens.primary},transparent);opacity:0.6;"></div></div>`;
    }
    case "shape-blob":
      return `<div style="margin:0 0 20px;display:flex;justify-content:center;"><svg viewBox="0 0 200 200" style="width:160px;height:160px;"><path d="M47.7,-57.2C60.5,-46.4,68.5,-30.4,70.8,-13.8C73.1,2.9,69.7,20.1,61.1,34.3C52.5,48.5,38.7,59.6,22.4,66.1C6.2,72.6,-12.5,74.4,-28.1,68.2C-43.7,61.9,-56.3,47.5,-64.2,31.1C-72.1,14.7,-75.4,-3.7,-70.4,-19.5C-65.4,-35.3,-52.1,-48.5,-37.5,-59C-22.9,-69.4,-7.1,-77.2,7.3,-75.8C21.7,-74.3,34.9,-68.1,47.7,-57.2Z" transform="translate(100 100)" fill="${tokens.primary}" opacity="0.8"/></svg></div>`;
    case "shape-cross": {
      const s = 120; const t = 36;
      return `<div style="margin:0 0 20px;display:flex;justify-content:center;"><svg viewBox="0 0 ${s} ${s}" style="width:${s}px;height:${s}px;"><rect x="${(s-t)/2}" y="0" width="${t}" height="${s}" rx="8" fill="${tokens.primary}" opacity="0.85"/><rect x="0" y="${(s-t)/2}" width="${s}" height="${t}" rx="8" fill="${tokens.primary}" opacity="0.85"/></svg></div>`;
    }
    case "shape-dots": {
      const dotColor = tokens.primary;
      const rows = 5; const cols = 8; const gap = 18; const r = 3;
      const dots = Array.from({length: rows}, (_,row) => Array.from({length: cols}, (_,col) => `<circle cx="${col*gap+r}" cy="${row*gap+r}" r="${r}" fill="${dotColor}" opacity="${0.25 + (row*cols+col) % 3 * 0.25}"/>`).join("")).join("");
      const w = (cols-1)*gap + r*2; const h = (rows-1)*gap + r*2;
      return `<div style="margin:0 0 20px;display:flex;justify-content:center;"><svg viewBox="0 0 ${w} ${h}" style="width:${w}px;height:${h}px;">${dots}</svg></div>`;
    }

    default:
      return `<div style="padding:12px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px dashed ${tokens.border};font-size:13px;color:${tokens.muted};">${blockId}</div>`;
  }
}
