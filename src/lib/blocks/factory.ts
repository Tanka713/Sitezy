import type { Project, ProjectPage } from "@/types";
import { uid } from "@/lib/utils";

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
  const tokens = inferTokens(project);
  const siteName = project.blueprint?.siteName || project.name || "Brand";
  const tagline = project.blueprint?.tagline || project.brief?.description || "Describe what makes this project stand out.";
  const id = `sec-${uid()}`;
  const primaryGlow = `rgba(${hexToRgb(tokens.primary)}, 0.18)`;

  switch (blockId) {
    case "navbar":
    case "nav-simple":
      return `<nav data-sz-section-id="${id}" data-sz-section-type="navbar" data-sz-section-name="Navbar" style="position:sticky;top:0;z-index:40;padding:18px 32px;border-bottom:1px solid ${tokens.border};background:color-mix(in srgb, ${tokens.bg} 92%, white 8%);backdrop-filter:blur(18px);font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><div style="width:min(100%,${tokens.containerWidth});margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:20px;"><a href="#" style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:22px;font-weight:800;color:${tokens.text};text-decoration:none;">${siteName}</a><div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;"><a href="#" style="color:${tokens.muted};text-decoration:none;font-size:14px;">Home</a><a href="#" style="color:${tokens.muted};text-decoration:none;font-size:14px;">About</a><a href="#" style="color:${tokens.muted};text-decoration:none;font-size:14px;">Services</a><a href="#" style="padding:12px 18px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;box-shadow:0 10px 26px ${primaryGlow};">Book a call</a></div></div></nav>`;
    case "navbar-center":
      return `<nav data-sz-section-id="${id}" data-sz-section-type="navbar" data-sz-section-name="Navbar Center" style="position:sticky;top:0;z-index:40;padding:16px 32px;border-bottom:1px solid ${tokens.border};background:${tokens.bg};font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><div style="width:min(100%,${tokens.containerWidth});margin:0 auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px;"><div style="display:flex;gap:20px;"><a href="#" style="color:${tokens.muted};text-decoration:none;font-size:14px;">Home</a><a href="#" style="color:${tokens.muted};text-decoration:none;font-size:14px;">Work</a><a href="#" style="color:${tokens.muted};text-decoration:none;font-size:14px;">About</a></div><a href="#" style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:22px;font-weight:800;color:${tokens.text};text-decoration:none;text-align:center;">${siteName}</a><div style="display:flex;justify-content:flex-end;"><a href="#" style="padding:10px 18px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:13px;font-weight:700;">Get started</a></div></div></nav>`;
    case "navbar-minimal":
      return `<nav data-sz-section-id="${id}" data-sz-section-type="navbar" data-sz-section-name="Navbar Minimal" style="position:sticky;top:0;z-index:40;padding:18px 32px;background:${tokens.bg};font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><div style="width:min(100%,${tokens.containerWidth});margin:0 auto;display:flex;align-items:center;justify-content:space-between;"><a href="#" style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:22px;font-weight:800;color:${tokens.text};text-decoration:none;">${siteName}</a><a href="#" style="padding:12px 20px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;">Book a call</a></div></nav>`;
    case "hero":
    case "hero-centered":
      return shell(id, "hero", "Hero", tokens, `<div style="display:grid;gap:28px;justify-items:start;text-align:left;"><span style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:${tokens.softBg};border:1px solid ${primaryGlow};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${tokens.primary};">New launch</span><div style="max-width:760px;"><h1 style="margin:0 0 18px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(42px,7vw,82px);line-height:0.98;letter-spacing:-0.04em;color:${tokens.text};">Built for clarity.<br/><span style="color:${tokens.primary};">Designed to convert.</span></h1><p style="margin:0;max-width:620px;font-size:18px;line-height:1.75;color:${tokens.muted};">${tagline}</p></div><div style="display:flex;gap:14px;flex-wrap:wrap;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:16px 24px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:15px;font-weight:700;box-shadow:0 14px 32px ${primaryGlow};">Get started</a><a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:16px 24px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};text-decoration:none;font-size:15px;font-weight:600;">View work</a></div></div>`);
    case "hero-split":
      return shell(id, "hero-split", "Hero Split", tokens, `<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;"><div style="display:grid;gap:22px;"><h1 style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(36px,5vw,64px);line-height:1.02;letter-spacing:-0.03em;color:${tokens.text};">${siteName}<br/><span style="color:${tokens.primary};">for bold brands.</span></h1><p style="margin:0;font-size:17px;line-height:1.8;color:${tokens.muted};">${tagline}</p><div style="display:flex;gap:12px;flex-wrap:wrap;"><a href="#" style="padding:14px 24px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;box-shadow:0 12px 28px ${primaryGlow};">Get started</a><a href="#" style="padding:14px 24px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};color:${tokens.text};text-decoration:none;font-size:14px;font-weight:600;">Learn more</a></div></div><div style="border-radius:${tokens.radius};overflow:hidden;box-shadow:${tokens.shadow};"><img src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=80" alt="Hero" style="width:100%;height:420px;object-fit:cover;display:block;" /></div></div>`);
    case "section":
    case "section-basic":
      return shell(id, "section", "Section", tokens, `<div style="padding:32px;border:1px solid ${tokens.border};border-radius:${tokens.radius};background:${tokens.bg};box-shadow:${tokens.shadow};"><h2 style="margin:0 0 12px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:32px;line-height:1.1;color:${tokens.text};">New section title</h2><p style="margin:0;font-size:16px;line-height:1.75;color:${tokens.muted};">A flexible section for a focused message, feature, or proof point.</p></div>`);
    case "container":
      return shell(id, "container", "Container", tokens, `<div style="min-height:160px;padding:28px;border-radius:${tokens.radius};border:1px dashed ${tokens.border};background:${tokens.softBg};display:flex;align-items:center;justify-content:center;text-align:center;"><p style="margin:0;font-size:14px;color:${tokens.muted};">Flexible container for grouped content.</p></div>`);
    case "heading":
      return shell(id, "heading", "Heading", tokens, `<div style="text-align:center;"><h2 style="margin:0 0 12px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(30px,5vw,56px);line-height:1.02;letter-spacing:-0.03em;color:${tokens.text};">Section heading</h2><p style="margin:0 auto;max-width:620px;font-size:17px;line-height:1.75;color:${tokens.muted};">Supporting copy that matches the current site voice and spacing rhythm.</p></div>`);
    case "paragraph":
      return shell(id, "paragraph", "Paragraph", tokens, `<div style="max-width:760px;"><p style="margin:0;font-size:18px;line-height:1.85;color:${tokens.text};opacity:0.88;">Use this space for a concise message that adds clarity, context, or momentum to the page.</p></div>`);
    case "button":
      return shell(id, "button", "Button", tokens, `<div style="display:flex;justify-content:center;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:16px 24px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:15px;font-weight:700;box-shadow:0 14px 32px ${primaryGlow};">Primary action</a></div>`);
    case "image":
      return shell(id, "image", "Image", tokens, `<figure style="margin:0;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};background:${tokens.softBg};"><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80" alt="Project visual" style="width:100%;height:420px;object-fit:cover;display:block;" /></figure>`);
    case "grid":
      return shell(id, "grid", "Grid", tokens, `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;">${[1,2,3].map((index) => `<div style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><h3 style="margin:0 0 8px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:20px;color:${tokens.text};">Grid item ${index}</h3><p style="margin:0;font-size:14px;line-height:1.7;color:${tokens.muted};">Editable content block that follows the project system.</p></div>`).join("")}</div>`, tokens.softBg);
    case "columns":
      return shell(id, "columns", "Columns", tokens, `<div style="display:grid;grid-template-columns:1.2fr .8fr;gap:24px;align-items:start;"><div style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><h3 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:28px;color:${tokens.text};">Two-column layout</h3><p style="margin:0;font-size:15px;line-height:1.75;color:${tokens.muted};">Use this for content paired with supporting detail, stats, or a call to action.</p></div><div style="padding:28px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${tokens.border};"><p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${tokens.primary};">Quick note</p><p style="margin:0;font-size:14px;line-height:1.75;color:${tokens.text};">Ideal for a short highlight, metric, or supporting takeaway.</p></div></div>`);
    case "features":
    case "features-3":
      return shell(id, "features", "Features", tokens, `<div style="text-align:center;margin-bottom:28px;"><h2 style="margin:0 0 12px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(30px,5vw,48px);color:${tokens.text};">Core features</h2><p style="margin:0 auto;max-width:620px;font-size:16px;line-height:1.75;color:${tokens.muted};">Highlight the capabilities or differentiators that matter most.</p></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;">${["Fast setup","Refined output","Reliable delivery"].map((title, index) => `<article style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};text-align:left;"><div style="width:44px;height:44px;border-radius:${tokens.buttonRadius};background:${tokens.softBg};display:flex;align-items:center;justify-content:center;margin-bottom:18px;font-size:20px;color:${tokens.primary};">${["✦","◎","→"][index]}</div><h3 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:21px;color:${tokens.text};">${title}</h3><p style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Clear, polished details that support the main promise of the page.</p></article>`).join("")}</div>`, tokens.softBg);
    case "testimonial":
      return shell(id, "testimonial", "Testimonial", tokens, `<div style="padding:36px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};text-align:center;"><div style="font-size:42px;line-height:1;color:${tokens.primary};margin-bottom:16px;">“</div><blockquote style="margin:0 auto 20px;max-width:760px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:28px;line-height:1.4;color:${tokens.text};">Working with ${siteName} brought clarity, speed, and a stronger presence across every touchpoint.</blockquote><div style="display:inline-flex;align-items:center;gap:12px;"><div style="width:46px;height:46px;border-radius:999px;background:${tokens.softBg};display:flex;align-items:center;justify-content:center;color:${tokens.primary};font-weight:700;">SJ</div><div style="text-align:left;"><p style="margin:0;font-size:14px;font-weight:700;color:${tokens.text};">Sarah Johnson</p><p style="margin:0;font-size:13px;color:${tokens.muted};">Founder, ${siteName}</p></div></div></div>`, tokens.softBg);
    case "gallery":
      return shell(id, "gallery", "Gallery", tokens, `<div style="display:grid;gap:18px;grid-template-columns:1.4fr 1fr 1fr;"><img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80" alt="Gallery item 1" style="width:100%;height:420px;object-fit:cover;border-radius:${tokens.radius};box-shadow:${tokens.shadow};" /><div style="display:grid;gap:18px;">${["photo-1498050108023-c5249f4df085","photo-1517248135467-4c7edcad34c4"].map((key, index) => `<img src="https://images.unsplash.com/${key}?auto=format&fit=crop&w=900&q=80" alt="Gallery item ${index + 2}" style="width:100%;height:201px;object-fit:cover;border-radius:${tokens.radius};box-shadow:${tokens.shadow};" />`).join("")}</div><div style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};display:flex;flex-direction:column;justify-content:center;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${tokens.primary};">Gallery</p><h3 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:28px;color:${tokens.text};">Show the work visually</h3><p style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Images inherit the site framing, radius, and shadow system.</p></div></div>`);
    case "cta":
    case "cta-solid":
      return shell(id, "cta", "Call To Action", tokens, `<div style="padding:44px;border-radius:${tokens.radius};background:${tokens.strongBg};box-shadow:${tokens.shadow};text-align:center;"><h2 style="margin:0 0 14px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(30px,5vw,48px);color:${tokens.bg};">Ready to move faster?</h2><p style="margin:0 auto 24px;max-width:620px;font-size:17px;line-height:1.75;color:rgba(255,255,255,0.76);">A focused next step for visitors who are ready to take action.</p><div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;"><a href="#" style="padding:16px 24px;border-radius:${tokens.buttonRadius};background:${tokens.bg};color:${tokens.strongBg};text-decoration:none;font-size:15px;font-weight:700;">Start now</a><a href="#" style="padding:16px 24px;border-radius:${tokens.buttonRadius};border:1px solid rgba(255,255,255,0.18);color:${tokens.bg};text-decoration:none;font-size:15px;font-weight:600;">Talk to sales</a></div></div>`);
    case "split-image":
      return shell(id, "split-image", "Split Image", tokens, `<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center;"><img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80" alt="Visual" style="width:100%;height:460px;object-fit:cover;border-radius:${tokens.radius};box-shadow:${tokens.shadow};display:block;" /><div style="display:grid;gap:16px;"><span style="display:inline-flex;padding:6px 12px;border-radius:999px;background:${tokens.softBg};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${tokens.primary};width:max-content;">Feature</span><h2 style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,48px);line-height:1.08;color:${tokens.text};">Content that converts on sight</h2><p style="margin:0;font-size:16px;line-height:1.8;color:${tokens.muted};">Pair a strong visual with a focused message and a clear next step.</p><a href="#" style="display:inline-flex;align-items:center;gap:8px;padding:14px 22px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;width:max-content;box-shadow:0 10px 26px ${primaryGlow};">Learn more →</a></div></div>`);
    case "stats":
      return shell(id, "stats", "Stats", tokens, `<div style="text-align:center;margin-bottom:28px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">By the numbers</h2><p style="margin:0 auto;max-width:540px;font-size:15px;color:${tokens.muted};">Real results that speak for themselves.</p></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">${[["98%","Customer satisfaction"],["2.4×","Average ROI",""],["10k+","Active users"],["< 48h","Response time"]].map(([val, label]) => `<div style="padding:28px 20px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};text-align:center;box-shadow:${tokens.shadow};"><div style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:40px;font-weight:800;color:${tokens.primary};line-height:1;">${val}</div><div style="margin-top:8px;font-size:13px;color:${tokens.muted};">${label}</div></div>`).join("")}`, tokens.softBg);
    case "timeline":
      return shell(id, "timeline", "Timeline", tokens, `<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">How it works</h2></div><div style="display:grid;gap:0;position:relative;">${["Discover","Design","Deliver"].map((step, i) => `<div style="display:grid;grid-template-columns:80px 1fr;gap:20px;padding:24px 0;${i < 2 ? `border-left:2px solid ${tokens.border};margin-left:39px;padding-left:28px;` : ""}"><div style="width:44px;height:44px;border-radius:999px;background:${tokens.primary};color:#fff;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:${i > 0 ? "-50px" : "-22px"};box-shadow:0 8px 20px ${primaryGlow};">${i + 1}</div><div><h3 style="margin:0 0 6px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:20px;color:${tokens.text};">${step}</h3><p style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Brief description of this step goes here. Edit to match your process.</p></div></div>`).join("")}</div>`);
    case "features-list":
      return shell(id, "features-list", "Feature List", tokens, `<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center;"><div><h2 style="margin:0 0 14px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">Everything you need</h2><p style="margin:0 0 28px;font-size:16px;line-height:1.8;color:${tokens.muted};">A complete toolkit built to help you move fast and look great.</p></div><div style="display:grid;gap:16px;">${["Zero setup required","Fully customisable","Production-ready output","Priority support"].map(f => `<div style="display:flex;align-items:flex-start;gap:14px;padding:18px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};"><div style="width:32px;height:32px;border-radius:${tokens.buttonRadius};background:${tokens.softBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${tokens.primary};font-weight:700;">✓</div><div><p style="margin:0;font-size:15px;font-weight:600;color:${tokens.text};">${f}</p><p style="margin:4px 0 0;font-size:13px;color:${tokens.muted};">Short supporting detail.</p></div></div>`).join("")}</div></div>`);
    case "testimonials":
      return shell(id, "testimonials", "Testimonials", tokens, `<div style="text-align:center;margin-bottom:28px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">What people say</h2></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;">${[["Alex R.","CEO, Axiom","The results spoke for themselves. We moved faster than ever."],["Priya S.","Designer","Blocks that actually match the brand. Rare and genuinely useful."],["James K.","Founder","This alone saved us three weeks of back-and-forth."]].map(([name, role, quote]) => `<div style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><div style="font-size:28px;color:${tokens.primary};margin-bottom:12px;">"</div><p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:${tokens.text};">${quote}</p><div style="display:flex;align-items:center;gap:10px;"><div style="width:36px;height:36px;border-radius:999px;background:${tokens.softBg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${tokens.primary};">${name[0]}</div><div><p style="margin:0;font-size:13px;font-weight:700;color:${tokens.text};">${name}</p><p style="margin:0;font-size:12px;color:${tokens.muted};">${role}</p></div></div></div>`).join("")}`, tokens.softBg);
    case "team":
      return shell(id, "team", "Team", tokens, `<div style="text-align:center;margin-bottom:28px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">Meet the team</h2><p style="margin:0 auto;max-width:520px;font-size:15px;color:${tokens.muted};">The people behind the work.</p></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;">${[["Alex M.","Co-founder & CEO","photo-1507003211169-0a1dd7228f2d"],["Priya K.","Head of Design","photo-1573496359142-b8d87734a5a2"],["Sam T.","Lead Engineer","photo-1519085360753-af0119f7cbe7"],["Zoe L.","Growth","photo-1580489944761-15a19d654956"]].map(([name, role, photo]) => `<div style="text-align:center;padding:24px 16px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><img src="https://images.unsplash.com/${photo}?auto=format&fit=crop&w=300&q=80" alt="${name}" style="width:72px;height:72px;border-radius:999px;object-fit:cover;display:block;margin:0 auto 14px;" /><p style="margin:0 0 4px;font-size:15px;font-weight:700;color:${tokens.text};">${name}</p><p style="margin:0;font-size:12px;color:${tokens.muted};">${role}</p></div>`).join("")}`);
    case "pricing":
      return shell(id, "pricing", "Pricing", tokens, `<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">Simple pricing</h2><p style="margin:0 auto;max-width:520px;font-size:15px;color:${tokens.muted};">No hidden fees. Pick a plan and get started today.</p></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start;">${[["Starter","49","For individuals just getting started.",["5 projects","Basic analytics","Email support"]],["Pro","99","Perfect for growing teams.",["Unlimited projects","Advanced analytics","Priority support","Custom domain"]],["Enterprise","249","For large organisations at scale.",["Everything in Pro","Dedicated manager","SLA & compliance","SSO & audit logs"]]].map(([name, price, desc, features], i) => `<div style="padding:28px;border-radius:${tokens.radius};background:${i === 1 ? tokens.primary : tokens.bg};border:${i === 1 ? `2px solid ${tokens.primary}` : `1px solid ${tokens.border}`};box-shadow:${i === 1 ? `0 20px 60px ${primaryGlow}` : tokens.shadow};"><p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${i === 1 ? "rgba(255,255,255,.7)" : tokens.primary};">${name}</p><div style="display:flex;align-items:baseline;gap:2px;margin:0 0 10px;"><span style="font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:48px;font-weight:800;color:${i === 1 ? "#fff" : tokens.text};">$${price}</span><span style="font-size:13px;color:${i === 1 ? "rgba(255,255,255,.6)" : tokens.muted};">/mo</span></div><p style="margin:0 0 18px;font-size:13px;line-height:1.7;color:${i === 1 ? "rgba(255,255,255,.75)" : tokens.muted};">${desc}</p><ul style="margin:0 0 22px;padding:0;list-style:none;display:grid;gap:8px;">${(features as string[]).map(f => `<li style="display:flex;align-items:center;gap:8px;font-size:13px;color:${i === 1 ? "rgba(255,255,255,.85)" : tokens.text};"><span style="color:${i === 1 ? "#fff" : tokens.primary};font-weight:700;">✓</span>${f}</li>`).join("")}</ul><a href="#" style="display:block;text-align:center;padding:13px;border-radius:${tokens.buttonRadius};background:${i === 1 ? "#fff" : tokens.primary};color:${i === 1 ? tokens.primary : "#fff"};text-decoration:none;font-size:14px;font-weight:700;">Get started</a></div>`).join("")}`);
    case "faq":
      return shell(id, "faq", "FAQ", tokens, `<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">Frequently asked</h2></div><div style="max-width:760px;margin:0 auto;display:grid;gap:12px;">${[["How quickly can we get started?","Most projects can begin within a few business days once scope and priorities are aligned."],["Can this be tailored to our needs?","Yes. Every engagement can be shaped around your goals, audience, and internal workflow."],["What does collaboration look like?","You’ll have a clear point of contact, defined milestones, and regular updates throughout the process."],["Do you offer ongoing support?","Yes. Ongoing support and optimization can be included based on the level of help you need."]].map(([q, a]) => `<details style="border:1px solid ${tokens.border};border-radius:${tokens.radius};background:${tokens.bg};overflow:hidden;"><summary style="padding:18px 22px;font-size:15px;font-weight:600;color:${tokens.text};cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;">${q}<span style="font-size:20px;color:${tokens.muted};">+</span></summary><p style="margin:0;padding:0 22px 18px;font-size:14px;line-height:1.8;color:${tokens.muted};">${a}</p></details>`).join("")}`);
    case "logo-wall":
      return shell(id, "logo-wall", "Logo Wall", tokens, `<div style="text-align:center;margin-bottom:24px;"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${tokens.muted};">Trusted by teams at</p></div><div style="display:flex;align-items:center;justify-content:center;gap:32px;flex-wrap:wrap;">${["Vercel","Linear","Figma","Stripe","Notion","Loom"].map(name => `<div style="padding:12px 22px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:15px;font-weight:800;color:${tokens.muted};letter-spacing:-.02em;">${name}</div>`).join("")}`, tokens.softBg);
    case "cta-strip":
      return shell(id, "cta-strip", "CTA Strip", tokens, `<div style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:28px 32px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${primaryGlow};"><div><h3 style="margin:0 0 4px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:22px;color:${tokens.text};">Ready to get started?</h3><p style="margin:0;font-size:14px;color:${tokens.muted};">Join thousands of teams already using ${siteName}.</p></div><a href="#" style="padding:14px 24px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:14px;font-weight:700;white-space:nowrap;box-shadow:0 12px 28px ${primaryGlow};">Start free →</a></div>`);
    case "newsletter":
      return shell(id, "newsletter", "Newsletter", tokens, `<div style="text-align:center;max-width:560px;margin:0 auto;display:grid;gap:20px;"><h2 style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">Stay in the loop</h2><p style="margin:0;font-size:16px;line-height:1.8;color:${tokens.muted};">Get insights, product updates, and resources delivered to your inbox.</p><form style="display:flex;gap:10px;"><input type="email" placeholder="Your email address" style="flex:1;padding:14px 18px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;font-family:'${tokens.bodyFont}',system-ui,sans-serif;" /><button type="submit" style="padding:14px 22px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;white-space:nowrap;box-shadow:0 10px 24px ${primaryGlow};">Subscribe</button></form><p style="margin:0;font-size:12px;color:${tokens.muted};">No spam. Unsubscribe any time.</p></div>`);
    case "footer":
    case "footer-simple":
      return `<footer data-sz-section-id="${id}" data-sz-section-type="footer" data-sz-section-name="Footer" style="padding:36px 32px;background:${tokens.text};color:#fff;font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><div style="width:min(100%,${tokens.containerWidth});margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;"><div><strong style="display:block;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:18px;">${siteName}</strong><span style="font-size:13px;color:rgba(255,255,255,0.55);">${tagline.slice(0, 72)}</span></div><div style="display:flex;gap:20px;flex-wrap:wrap;"><a href="#" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:14px;">Privacy</a><a href="#" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:14px;">Terms</a><a href="#" style="color:rgba(255,255,255,0.7);text-decoration:none;font-size:14px;">Contact</a></div></div></footer>`;
    case "footer-columns":
      return `<footer data-sz-section-id="${id}" data-sz-section-type="footer" data-sz-section-name="Footer Columns" style="padding:56px 32px 28px;background:${tokens.text};color:#fff;font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><div style="width:min(100%,${tokens.containerWidth});margin:0 auto;"><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px;margin-bottom:40px;"><div><strong style="display:block;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:20px;margin-bottom:10px;">${siteName}</strong><p style="margin:0 0 16px;font-size:13px;line-height:1.75;color:rgba(255,255,255,.5);max-width:220px;">${tagline.slice(0,80)}</p></div>${["Product","Company","Legal"].map(col => `<div><p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.35);">${col}</p><div style="display:grid;gap:10px;">${["Overview","Pricing","Changelog"].map(l=>`<a href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:13px;">${l}</a>`).join("")}</div></div>`).join("")}</div><div style="border-top:1px solid rgba(255,255,255,.08);padding-top:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;"><span style="font-size:12px;color:rgba(255,255,255,.3);">© ${new Date().getFullYear()} ${siteName}. All rights reserved.</span></div></div></footer>`;
    // ── New section blocks ──────────────────────────────────────────────────────
    case "blog-grid":
      return shell(id, "section", "Blog Grid", tokens, `<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">From the blog</h2><p style="margin:0 auto;max-width:520px;font-size:15px;color:${tokens.muted};">Insights, guides, and updates from the team.</p></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">${[["1497366754035-f200968a6e72","Design Systems in 2025","Learn how to build scalable, consistent design systems that your team will actually use.","Mar 12, 2025","Design"],["1522202176988-66273c2fd55f","The Future of AI Workflows","Explore how AI is changing the way product teams think, build, and ship software.","Mar 5, 2025","AI"],["1460925895917-afdab827c52f","Writing Copy That Converts","A practical guide to writing landing page copy that speaks to your audience and drives action.","Feb 28, 2025","Copy"]].map(([photo,title,exc,date,tag]) => `<article style="border-radius:${tokens.radius};overflow:hidden;background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><img src="https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=640&q=80" alt="${title}" style="width:100%;height:180px;object-fit:cover;display:block;" /><div style="padding:20px;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${tokens.softBg};font-size:11px;font-weight:700;color:${tokens.primary};margin:0 0 10px;">${tag}</span><h3 style="margin:0 0 8px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:18px;font-weight:700;line-height:1.3;color:${tokens.text};">${title}</h3><p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:${tokens.muted};">${exc}</p><div style="display:flex;align-items:center;justify-content:space-between;"><span style="font-size:12px;color:${tokens.muted};">${date}</span><a href="#" style="font-size:13px;font-weight:600;color:${tokens.primary};text-decoration:none;">Read →</a></div></div></article>`).join("")}`, tokens.softBg);
    case "contact":
      return shell(id, "contact", "Contact", tokens, `<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:48px;align-items:start;"><div><h2 style="margin:0 0 14px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">Get in touch</h2><p style="margin:0 0 28px;font-size:16px;line-height:1.8;color:${tokens.muted};">We'd love to hear from you. Fill out the form or reach us directly.</p><div style="display:grid;gap:16px;">${[["📍","Address","123 Main Street, Suite 100\nNew York, NY 10001"],["📞","Phone","+1 (555) 000-0000"],["✉️","Email","hello@${siteName.toLowerCase().replace(/\s/g,'')}.com"],["🕐","Hours","Mon – Fri, 9am – 6pm EST"]].map(([icon,label,val])=>`<div style="display:flex;gap:12px;"><span style="font-size:18px;line-height:1;">${icon}</span><div><p style="margin:0 0 2px;font-size:13px;font-weight:700;color:${tokens.text};">${label}</p><p style="margin:0;font-size:13px;color:${tokens.muted};white-space:pre-line;">${val}</p></div></div>`).join("")}</div></div><div style="padding:28px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><form style="display:grid;gap:14px;" onsubmit="return false;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;"><div><label style="display:block;font-size:12px;font-weight:700;color:${tokens.text};margin:0 0 6px;">First name</label><input placeholder="Alex" style="width:100%;padding:11px 14px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;box-sizing:border-box;" /></div><div><label style="display:block;font-size:12px;font-weight:700;color:${tokens.text};margin:0 0 6px;">Last name</label><input placeholder="Johnson" style="width:100%;padding:11px 14px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;box-sizing:border-box;" /></div></div><div><label style="display:block;font-size:12px;font-weight:700;color:${tokens.text};margin:0 0 6px;">Email</label><input type="email" placeholder="alex@example.com" style="width:100%;padding:11px 14px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;box-sizing:border-box;" /></div><div><label style="display:block;font-size:12px;font-weight:700;color:${tokens.text};margin:0 0 6px;">Message</label><textarea rows="4" placeholder="Tell us how we can help…" style="width:100%;padding:11px 14px;border-radius:${tokens.buttonRadius};border:1px solid ${tokens.border};background:${tokens.bg};color:${tokens.text};font-size:14px;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea></div><button type="submit" style="padding:14px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;box-shadow:0 10px 24px ${primaryGlow};">Send message</button></form></div></div>`);
    case "comparison":
      return shell(id, "section", "Comparison", tokens, `<div style="text-align:center;margin-bottom:32px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">How we compare</h2><p style="margin:0 auto;max-width:520px;font-size:15px;color:${tokens.muted};">See how ${siteName} stacks up against the alternatives.</p></div><div style="overflow-x:auto;border-radius:${tokens.radius};border:1px solid ${tokens.border};"><table style="width:100%;border-collapse:collapse;font-size:14px;font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><thead><tr style="border-bottom:2px solid ${tokens.border};"><th style="padding:16px 20px;text-align:left;color:${tokens.muted};font-weight:600;">Feature</th>${[siteName,"Competitor A","Competitor B"].map((n,i)=>`<th style="padding:16px 20px;text-align:center;font-weight:800;color:${i===0?tokens.primary:tokens.text};${i===0?`background:rgba(${hexToRgb(tokens.primary)},0.04);`:""}">${n}</th>`).join("")}</tr></thead><tbody>${[["Custom branding","✓","✓","✗"],["AI generation","✓","✗","✗"],["Export to code","✓","✓","✗"],["Team collaboration","✓","✓","✓"],["Priority support","✓","✗","✗"],["No code required","✓","✗","✓"]].map(([feat,...vals],ri)=>`<tr style="border-bottom:1px solid ${tokens.border};background:${ri%2===0?tokens.softBg:"transparent"};"><td style="padding:14px 20px;font-weight:500;color:${tokens.text};">${feat}</td>${vals.map((v,i)=>`<td style="padding:14px 20px;text-align:center;font-size:18px;${i===0?`color:${v==="✓"?tokens.primary:"#ef4444"};background:rgba(${hexToRgb(tokens.primary)},0.03);`:`color:${v==="✓"?"#22c55e":"#ef4444"};`}">${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`, tokens.softBg);
    case "gallery-masonry":
      return shell(id, "gallery", "Gallery Masonry", tokens, `<div style="text-align:center;margin-bottom:28px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">Our work</h2></div><div style="columns:3;column-gap:12px;">${[["1497366754035-f200968a6e72",260],["1460925895917-afdab827c52f",180],["1522202176988-66273c2fd55f",220],["1498050108023-c5249f4df085",200],["1461749280684-dccba630e2f6",240],["1551288049-bebda4e38f71",190]].map(([photo,h])=>`<div style="break-inside:avoid;margin-bottom:12px;border-radius:${tokens.radius};overflow:hidden;"><img src="https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=600&q=80" alt="" style="width:100%;height:${h}px;object-fit:cover;display:block;" /></div>`).join("")}</div>`);
    case "video-section":
      return shell(id, "section", "Video Section", tokens, `<div style="text-align:center;max-width:720px;margin:0 auto 28px;"><h2 style="margin:0 0 12px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(28px,4vw,44px);color:${tokens.text};">See it in action</h2><p style="margin:0;font-size:16px;line-height:1.8;color:${tokens.muted};">Watch how ${siteName} transforms your workflow in under 2 minutes.</p></div><div style="border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};background:#000;"><div style="position:relative;padding-top:56.25%;"><iframe src="https://www.youtube.com/embed/ScMzIvxBSi4?playsinline=1&rel=0&modestbranding=1" title="Product demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;"></iframe></div></div>`);

    // ── Decorative sections ─────────────────────────────────────────────────────
    case "wave-divider":
      return `<section data-sz-section-id="${id}" data-sz-section-type="section" data-sz-section-name="Wave Divider" style="padding:0;overflow:hidden;line-height:0;background:${tokens.bg};font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><svg viewBox="0 0 1200 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="display:block;width:100%;height:80px;"><defs><linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:rgba(${hexToRgb(tokens.primary)},0.08)"/><stop offset="50%" style="stop-color:rgba(${hexToRgb(tokens.primary)},0.18)"/><stop offset="100%" style="stop-color:rgba(${hexToRgb(tokens.primary)},0.08)"/></linearGradient></defs><path d="M0,0 C150,80 350,0 600,40 C850,80 1050,0 1200,40 L1200,80 L0,80 Z" fill="url(#wg)"/><path d="M0,20 C200,70 400,10 600,50 C800,90 1000,20 1200,55 L1200,80 L0,80 Z" fill="rgba(${hexToRgb(tokens.primary)},0.06)"/></svg></section>`;
    case "banner":
      return `<div data-sz-section-id="${id}" data-sz-section-type="section" data-sz-section-name="Banner Strip" style="padding:12px 24px;background:${tokens.primary};color:#fff;text-align:center;font-family:'${tokens.bodyFont}',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;gap:16px;"><span style="font-size:14px;font-weight:600;">🎉 New feature just launched — <a href="#" style="color:#fff;font-weight:800;text-decoration:underline;text-underline-offset:2px;">Learn more →</a></span></div>`;
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
      return `<div style="margin:0 0 24px;"><h2 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:clamp(26px,4vw,44px);line-height:1.08;letter-spacing:-0.02em;color:${tokens.text};">Section Heading</h2><p style="margin:0;font-size:16px;line-height:1.75;color:${tokens.muted};">Supporting subtext that matches the site voice.</p></div>`;
    case "paragraph":
      return `<p style="margin:0 0 20px;font-size:17px;line-height:1.85;color:${tokens.text};">This paragraph uses clear, natural copy that fits the tone and rhythm of the page.</p>`;
    case "button":
      return `<div style="margin:0 0 20px;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 24px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;text-decoration:none;font-size:15px;font-weight:700;box-shadow:0 10px 26px ${primaryGlow};">Primary action</a></div>`;
    case "button-outline":
      return `<div style="margin:0 0 20px;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 24px;border-radius:${tokens.buttonRadius};border:1.5px solid ${tokens.primary};background:transparent;color:${tokens.primary};text-decoration:none;font-size:15px;font-weight:700;">Secondary action</a></div>`;
    case "badge":
      return `<div style="margin:0 0 16px;"><span style="display:inline-flex;align-items:center;padding:6px 14px;border-radius:999px;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.22);font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${tokens.primary};">Label</span></div>`;
    case "blockquote":
      return `<blockquote style="margin:0 0 20px;padding:20px 24px;border-left:4px solid ${tokens.primary};background:${tokens.softBg};border-radius:0 ${tokens.radius} ${tokens.radius} 0;font-size:18px;line-height:1.7;color:${tokens.text};font-style:italic;">"A compelling pull-quote that anchors the reader's attention and builds credibility."</blockquote>`;
    case "divider":
      return `<hr style="margin:16px 0;border:none;border-top:1px solid ${tokens.border};" />`;
    case "spacer":
      return `<div style="height:80px;" aria-hidden="true"></div>`;
    case "image":
      return `<figure style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80" alt="Image" style="width:100%;height:320px;object-fit:cover;display:block;" /></figure>`;
    case "video":
      return `<figure style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};background:#000;"><video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" poster="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80" controls playsinline style="width:100%;height:360px;display:block;object-fit:cover;background:#000;"></video></figure>`;
    case "youtube":
      return `<div style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};background:#000;"><div style="position:relative;padding-top:56.25%;"><iframe src="https://www.youtube.com/embed/ScMzIvxBSi4?playsinline=1&rel=0&modestbranding=1" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000;"></iframe></div></div>`;
    case "embed":
      return `<div style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};background:${tokens.bg};"><div style="position:relative;padding-top:56.25%;"><iframe src="https://player.vimeo.com/video/76979871" title="Embedded content" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000;"></iframe></div></div>`;
    case "icon-block":
      return `<div style="display:flex;align-items:flex-start;gap:16px;margin:0 0 20px;padding:20px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};"><div style="width:44px;height:44px;border-radius:${tokens.buttonRadius};background:${tokens.softBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;color:${tokens.primary};">◈</div><div><h4 style="margin:0 0 6px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:16px;font-weight:700;color:${tokens.text};">Icon block title</h4><p style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Supporting description for this feature or benefit.</p></div></div>`;
    case "card":
      return `<div style="margin:0 0 20px;padding:24px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><h3 style="margin:0 0 10px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:20px;color:${tokens.text};">Card title</h3><p style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Use this card for a short feature, highlight, or supporting detail.</p></div>`;
    case "contact-form":
      {
        const spec = inferFormSpec(project, page);
        return `<div style="margin:0 0 20px;padding:24px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><div style="display:grid;gap:8px;margin-bottom:18px;"><h3 style="margin:0;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:24px;line-height:1.1;color:${tokens.text};">${spec.title}</h3><p style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">${spec.description}</p></div><form style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;" onsubmit="return false;">${spec.fields.map((field) => renderFormField(field, tokens)).join("")}<div style="grid-column:1 / -1;display:flex;justify-content:flex-start;"><button type="submit" style="padding:14px 22px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;box-shadow:0 10px 24px ${primaryGlow};">${spec.submitLabel}</button></div></form></div>`;
      }
    // ── Layout containers ──────────────────────────────────────────────────────
    case "container":
      return `<div style="margin:0 0 20px;min-height:140px;padding:24px;border-radius:${tokens.radius};border:1px dashed rgba(${hexToRgb(tokens.primary)},0.28);background:${tokens.softBg};display:grid;place-items:center;"><div style="text-align:center;max-width:320px;"><p style="margin:0 0 6px;font-size:14px;font-weight:700;color:${tokens.text};">Container</p><p style="margin:0;font-size:13px;line-height:1.7;color:${tokens.muted};">A neutral wrapper for cards, copy, media, or custom layouts.</p></div></div>`;
    case "flex-container":
      return `<div style="display:flex;flex-wrap:wrap;align-items:stretch;gap:16px;margin:0 0 20px;">${["First item","Second item","Third item"].map((title, index) => `<div style="flex:1 1 220px;min-width:180px;padding:18px;border-radius:${tokens.radius};background:${index === 1 ? tokens.bg : tokens.softBg};border:1px solid ${tokens.border};box-shadow:${index === 1 ? tokens.shadow : "none"};"><p style="margin:0 0 8px;font-size:15px;font-weight:700;color:${tokens.text};">${title}</p><p style="margin:0;font-size:13px;line-height:1.7;color:${tokens.muted};">Flexible content cell that adapts to the current page rhythm.</p></div>`).join("")}</div>`;
    case "grid-container":
      return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:0 0 20px;">${["Grid cell one","Grid cell two","Grid cell three","Grid cell four"].map((title) => `<div style="min-height:120px;padding:18px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};box-shadow:${tokens.shadow};display:flex;flex-direction:column;justify-content:flex-end;"><p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${tokens.text};">${title}</p><p style="margin:0;font-size:13px;line-height:1.7;color:${tokens.muted};">Use this as a raw grid primitive for feature cells, stats, or media.</p></div>`).join("")}</div>`;
    case "two-columns":
      return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:0 0 20px;"><div style="padding:20px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${tokens.border};"><h4 style="margin:0 0 8px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:17px;font-weight:700;color:${tokens.text};">Column one</h4><p style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Content for the left column goes here.</p></div><div style="padding:20px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${tokens.border};"><h4 style="margin:0 0 8px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:17px;font-weight:700;color:${tokens.text};">Column two</h4><p style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Content for the right column goes here.</p></div></div>`;
    case "three-columns":
      return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:0 0 20px;">${[["First","",],["Second",""],["Third",""]].map(([title], i) => `<div style="padding:18px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${tokens.border};"><div style="width:36px;height:36px;border-radius:${tokens.buttonRadius};background:${tokens.primary};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;margin:0 0 12px;">${i+1}</div><h4 style="margin:0 0 6px;font-size:15px;font-weight:700;color:${tokens.text};">${title} column</h4><p style="margin:0;font-size:13px;line-height:1.7;color:${tokens.muted};">Editable content block.</p></div>`).join("")}</div>`;
    case "accordion": {
      const items = [["What is this for?","Use this accordion for FAQ-style Q&A, expandable content sections, or progressive disclosure of detailed information."],["How do I customize it?","Click any text to edit inline, or use the Style tab to adjust colors, fonts, and spacing to match your brand."],["Can I add more items?","Yes — duplicate any list item in the editor or add more <details> elements to expand this accordion."]];
      return `<div style="margin:0 0 20px;display:grid;gap:8px;">${items.map(([q,a]) => `<details style="border:1px solid ${tokens.border};border-radius:${tokens.radius};overflow:hidden;background:${tokens.bg};"><summary style="padding:14px 18px;font-size:15px;font-weight:600;color:${tokens.text};cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;">${q}<span style="font-size:18px;line-height:1;color:${tokens.muted};flex-shrink:0;">+</span></summary><p style="margin:0;padding:0 18px 14px;font-size:14px;line-height:1.8;color:${tokens.muted};">${a}</p></details>`).join("")}</div>`;
    }
    case "tabs": {
      const tid = `t${uid().slice(0,6)}`;
      return `<div style="margin:0 0 20px;"><style>.${tid} input[type=radio]{position:absolute;opacity:0;width:0;height:0}.${tid} .th{display:flex;border-bottom:2px solid ${tokens.border}}.${tid} .th label{padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;color:${tokens.muted};border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s,border-color .15s}.${tid} #${tid}a:checked~.th label[for="${tid}a"],.${tid} #${tid}b:checked~.th label[for="${tid}b"],.${tid} #${tid}c:checked~.th label[for="${tid}c"]{color:${tokens.primary};border-bottom-color:${tokens.primary}}.${tid} .tp .p{display:none;padding:20px 0}.${tid} #${tid}a:checked~.tp .pa,.${tid} #${tid}b:checked~.tp .pb,.${tid} #${tid}c:checked~.tp .pc{display:block}</style><div class="${tid}"><input type="radio" id="${tid}a" name="${tid}" checked><input type="radio" id="${tid}b" name="${tid}"><input type="radio" id="${tid}c" name="${tid}"><div class="th"><label for="${tid}a">Overview</label><label for="${tid}b">Features</label><label for="${tid}c">Details</label></div><div class="tp"><div class="p pa"><p style="margin:0;font-size:15px;line-height:1.8;color:${tokens.text};">Overview content goes here. Edit this panel for the first tab.</p></div><div class="p pb"><p style="margin:0;font-size:15px;line-height:1.8;color:${tokens.text};">Feature highlights for the second tab. Add bullet points, icons, or cards.</p></div><div class="p pc"><p style="margin:0;font-size:15px;line-height:1.8;color:${tokens.text};">Detailed information for the third tab. Add specs, tables, or expanded content.</p></div></div></div></div>`;
    }
    case "step-list": {
      const steps = ["Discover","Design","Deliver","Deploy"];
      return `<ol style="margin:0 0 20px;padding:0;list-style:none;">${steps.map((s,i) => `<li style="display:flex;gap:16px;padding-bottom:${i<steps.length-1?"28px":"0"};position:relative;${i<steps.length-1?`&lt;&lt;` : ""}"><div style="position:relative;z-index:1;"><div style="width:40px;height:40px;border-radius:50%;background:${tokens.primary};color:#fff;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 16px ${primaryGlow};">0${i+1}</div>${i<steps.length-1?`<div style="position:absolute;left:19px;top:40px;width:2px;height:calc(100% - 40px + 28px);background:linear-gradient(to bottom,${tokens.primary}55,${tokens.border})"></div>`:""}</div><div style="padding-top:8px;"><h4 style="margin:0 0 4px;font-family:'${tokens.headingFont}',system-ui,sans-serif;font-size:17px;font-weight:700;color:${tokens.text};">${s}</h4><p style="margin:0;font-size:14px;line-height:1.75;color:${tokens.muted};">Short description of step ${i+1} that guides the user through the process.</p></div></li>`).join("")}</ol>`;
    }

    // ── Text extras ────────────────────────────────────────────────────────────
    case "list":
      return `<ul style="margin:0 0 20px;padding:0 0 0 22px;list-style:disc;color:${tokens.text};"><li style="margin:0 0 8px;font-size:16px;line-height:1.65;">First list item with clear, natural copy</li><li style="margin:0 0 8px;font-size:16px;line-height:1.65;">Second item that builds on the first</li><li style="margin:0 0 8px;font-size:16px;line-height:1.65;">Third item adding more depth</li><li style="margin:0;font-size:16px;line-height:1.65;">Final item that wraps things up</li></ul>`;
    case "icon-list": {
      const ck = `<svg viewBox="0 0 24 24" fill="none" stroke="${tokens.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;margin-top:2px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      const row = (t: string, mb = "10px") => `<li style="display:flex;align-items:flex-start;gap:10px;margin:0 0 ${mb};">${ck}<span style="font-size:15px;line-height:1.55;color:${tokens.text};">${t}</span></li>`;
      return `<ul style="margin:0 0 20px;padding:0;list-style:none;">${row("Feature one that matters to users")}${row("Feature two with measurable impact")}${row("Feature three that builds trust")}${row("Feature four that closes the deal", "0")}</ul>`;
    }
    case "pill-list":
      return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px;">${["Design","Development","Strategy","UX Research","Branding","Analytics"].map((t) => `<span style="padding:6px 16px;border-radius:999px;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.18);font-size:13px;font-weight:600;color:${tokens.primary};">${t}</span>`).join("")}</div>`;
    case "highlight-text":
      return `<p style="margin:0 0 20px;font-size:20px;line-height:1.75;color:${tokens.text};">We believe great design is about <mark style="background:linear-gradient(120deg,rgba(${hexToRgb(tokens.primary)},0.22) 0%,rgba(${hexToRgb(tokens.primary)},0.1) 100%);color:${tokens.primary};padding:2px 6px;border-radius:6px;font-style:normal;">clarity and intention</mark>, not decoration for its own sake.</p>`;
    case "table":
      return `<div style="margin:0 0 20px;overflow-x:auto;border-radius:${tokens.radius};border:1px solid ${tokens.border};"><table style="width:100%;border-collapse:collapse;font-size:14px;font-family:'${tokens.bodyFont}',system-ui,sans-serif;"><thead><tr style="background:${tokens.softBg};">${["Name","Role","Status","Value"].map(h=>`<th style="padding:12px 16px;text-align:left;font-weight:700;color:${tokens.text};border-bottom:1px solid ${tokens.border};white-space:nowrap;">${h}</th>`).join("")}</tr></thead><tbody>${[["Alex Johnson","Designer","Active","$4,200"],["Priya Kumar","Engineer","Active","$5,800"],["Sam Torres","Product","Away","$4,900"]].map((row,ri) => `<tr style="background:${ri%2===1?tokens.softBg:"transparent"};">${row.map(cell=>`<td style="padding:12px 16px;color:${tokens.muted};border-bottom:1px solid ${tokens.border};">${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    case "code-block":
      return `<div style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid rgba(255,255,255,0.09);background:#1e1e2e;"><div style="padding:10px 16px;background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:#ff5f56;display:inline-block;"></span><span style="width:10px;height:10px;border-radius:50%;background:#ffbd2e;display:inline-block;"></span><span style="width:10px;height:10px;border-radius:50%;background:#27c93f;display:inline-block;"></span><span style="margin-left:8px;font-size:11px;color:rgba(255,255,255,0.4);font-family:monospace;">script.js</span></div><pre style="margin:0;padding:20px;font-family:'Fira Code',Consolas,monospace;font-size:13px;line-height:1.8;color:#cdd6f4;overflow-x:auto;"><code><span style="color:#89b4fa;">function</span> <span style="color:#a6e3a1;">greet</span>(<span style="color:#fab387;">name</span>) {\n  <span style="color:#89b4fa;">return</span> <span style="color:#a6e3a1;">\`Hello, \${</span><span style="color:#fab387;">name</span><span style="color:#a6e3a1;">}!\`</span>;\n}\n\n<span style="color:#89dceb;">console</span>.<span style="color:#a6e3a1;">log</span>(greet(<span style="color:#a6e3a1;">"World"</span>));</code></pre></div>`;
    case "alert":
      return `<div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:${tokens.radius};background:rgba(${hexToRgb(tokens.primary)},0.07);border:1px solid rgba(${hexToRgb(tokens.primary)},0.2);margin:0 0 20px;"><svg viewBox="0 0 24 24" fill="none" stroke="${tokens.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><div><p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${tokens.text};">Heads up!</p><p style="margin:0;font-size:13px;line-height:1.75;color:${tokens.muted};">Edit this alert message for important notices, tips, or callouts on your page.</p></div></div>`;
    case "text-link":
      return `<a href="#" style="display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:600;color:${tokens.primary};text-decoration:none;border-bottom:2px solid rgba(${hexToRgb(tokens.primary)},0.3);padding-bottom:1px;margin:0 0 16px;display:inline-flex;">Learn more <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>`;

    // ── Form primitives ────────────────────────────────────────────────────────
    case "text-input":
      return `<div style="margin:0 0 20px;">${fieldLabel("Full name")}<input type="text" name="full_name" placeholder="Enter full name" style="${controlBase}" /></div>`;
    case "textarea-field":
      return `<div style="margin:0 0 20px;">${fieldLabel("Message")}<textarea name="message" rows="5" placeholder="Type your message here" style="${controlBase}resize:vertical;min-height:140px;"></textarea></div>`;
    case "select-field":
      return `<div style="margin:0 0 20px;">${fieldLabel("Topic")}<select name="topic" style="${controlBase}"><option value="general">General inquiry</option><option value="sales">Sales question</option><option value="support">Support request</option></select></div>`;
    case "checkbox-field":
      return `<label style="display:flex;align-items:flex-start;gap:12px;padding:16px 18px;margin:0 0 20px;border-radius:${tokens.radius};background:${tokens.softBg};border:1px solid ${tokens.border};cursor:pointer;"><input type="checkbox" checked style="margin-top:3px;width:16px;height:16px;accent-color:${tokens.primary};flex-shrink:0;" /><span style="font-size:14px;line-height:1.7;color:${tokens.text};">I agree to receive product updates and helpful tips.</span></label>`;
    case "radio-group": {
      const groupName = `plan-${uid().slice(0, 6)}`;
      return `<fieldset style="margin:0 0 20px;padding:18px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};display:grid;gap:10px;"><legend style="padding:0 6px;font-size:12px;font-weight:700;letter-spacing:.02em;color:${tokens.text};">Choose a plan</legend>${["Starter","Growth","Scale"].map((option, index) => `<label style="display:flex;align-items:center;gap:10px;font-size:14px;color:${tokens.text};cursor:pointer;"><input type="radio" name="${groupName}" ${index === 1 ? "checked" : ""} style="width:16px;height:16px;accent-color:${tokens.primary};flex-shrink:0;" /><span>${option}</span></label>`).join("")}</fieldset>`;
    }
    case "toggle-switch":
      return `<label style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;margin:0 0 20px;border-radius:${tokens.radius};background:${tokens.bg};border:1px solid ${tokens.border};cursor:pointer;"><div><p style="margin:0 0 3px;font-size:14px;font-weight:700;color:${tokens.text};">Enable notifications</p><p style="margin:0;font-size:12px;line-height:1.6;color:${tokens.muted};">Let visitors opt into updates with a clear on/off switch.</p></div><span style="position:relative;display:inline-flex;align-items:center;width:48px;height:28px;border-radius:999px;background:${tokens.primary};box-shadow:inset 0 0 0 1px rgba(${hexToRgb(tokens.primary)},0.18);flex-shrink:0;"><span style="position:absolute;right:3px;width:22px;height:22px;border-radius:999px;background:#fff;box-shadow:0 4px 12px rgba(15,23,42,0.2);"></span></span><input type="checkbox" checked style="display:none;" /></label>`;

    // ── Media extras ────────────────────────────────────────────────────────────
    case "icon-circle":
      return `<div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.18);margin:0 0 16px;"><svg viewBox="0 0 24 24" fill="none" stroke="${tokens.primary}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px;"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`;
    case "avatar":
      return `<div style="display:flex;align-items:center;gap:12px;margin:0 0 16px;"><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format&q=80" alt="Avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid rgba(${hexToRgb(tokens.primary)},0.25);flex-shrink:0;" /><div><p style="margin:0 0 2px;font-size:15px;font-weight:700;color:${tokens.text};">Alex Johnson</p><p style="margin:0;font-size:13px;color:${tokens.muted};">Product Designer</p></div></div>`;
    case "avatar-group":
      return `<div style="display:inline-flex;align-items:center;gap:10px;margin:0 0 20px;"><div style="display:flex;align-items:center;"><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&auto=format&q=80" alt="" style="width:34px;height:34px;border-radius:50%;border:2px solid white;object-fit:cover;margin-right:-10px;" /><img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&auto=format&q=80" alt="" style="width:34px;height:34px;border-radius:50%;border:2px solid white;object-fit:cover;margin-right:-10px;" /><img src="https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=60&h=60&fit=crop&auto=format&q=80" alt="" style="width:34px;height:34px;border-radius:50%;border:2px solid white;object-fit:cover;margin-right:-10px;" /><div style="width:34px;height:34px;border-radius:50%;background:${tokens.softBg};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${tokens.primary};">+9</div></div><span style="font-size:14px;color:${tokens.muted};">Join 200+ happy customers</span></div>`;
    case "rating": {
      const star = `<svg viewBox="0 0 24 24" fill="${tokens.primary}" stroke="none" style="width:18px;height:18px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      return `<div style="display:flex;align-items:center;gap:8px;margin:0 0 16px;"><div style="display:flex;gap:2px;">${star}${star}${star}${star}${star}</div><span style="font-size:14px;font-weight:700;color:${tokens.text};">4.9</span><span style="font-size:13px;color:${tokens.muted};">(2,400 reviews)</span></div>`;
    }
    case "social-links": {
      const btn = (label: string, path: string) => `<a href="#" title="${label}" style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.15);color:${tokens.primary};text-decoration:none;transition:background .2s;"><svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;">${path}</svg></a>`;
      return `<div style="display:flex;gap:10px;margin:0 0 20px;">${btn("Twitter/X","M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z")}${btn("Instagram","M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zm4.5 3a5 5 0 1 1 0 10A5 5 0 0 1 12 7zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.25-.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z")}${btn("LinkedIn","M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zm2-3a2 2 0 1 1 0-4 2 2 0 0 1 0 4z")}${btn("GitHub","M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z")}</div>`;
    }
    case "map-embed":
      return `<div style="margin:0 0 20px;border-radius:${tokens.radius};overflow:hidden;border:1px solid ${tokens.border};box-shadow:${tokens.shadow};"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9663095919364!2d-74.00425878459523!3d40.74076794379132!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259bf5c1654f3%3A0xc80f9cfce5383d5d!2sNew%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2sus!4v1" width="100%" height="280" style="border:0;display:block;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;

    // ── Decorative inline ──────────────────────────────────────────────────────
    case "progress-bar":
      return `<div style="margin:0 0 20px;"><div style="display:flex;justify-content:space-between;margin:0 0 6px;"><span style="font-size:13px;font-weight:600;color:${tokens.text};">Progress</span><span style="font-size:13px;font-weight:700;color:${tokens.primary};">75%</span></div><div style="height:8px;border-radius:999px;background:${tokens.softBg};overflow:hidden;"><div style="width:75%;height:100%;border-radius:999px;background:${tokens.primary};"></div></div></div>`;
    case "counter-stat":
      return `<div style="text-align:center;padding:24px 16px;margin:0 0 20px;"><div style="font-size:clamp(40px,7vw,72px);font-weight:900;line-height:1;letter-spacing:-0.04em;color:${tokens.primary};font-family:'${tokens.headingFont}',system-ui,sans-serif;">99%</div><div style="font-size:14px;color:${tokens.muted};margin-top:8px;">Customer satisfaction</div></div>`;
    case "notification":
      return `<div style="display:inline-flex;align-items:center;gap:12px;padding:12px 16px;background:${tokens.bg};border:1px solid ${tokens.border};border-radius:${tokens.radius};box-shadow:${tokens.shadow};margin:0 0 20px;max-width:360px;"><div style="width:32px;height:32px;border-radius:50%;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg viewBox="0 0 24 24" fill="none" stroke="${tokens.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div><div style="min-width:0;"><p style="margin:0 0 1px;font-size:13px;font-weight:700;color:${tokens.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">New message</p><p style="margin:0;font-size:12px;color:${tokens.muted};">You have 3 unread messages</p></div><span style="margin-left:auto;font-size:11px;color:${tokens.muted};white-space:nowrap;flex-shrink:0;">now</span></div>`;
    case "countdown":
      return `<div style="display:flex;gap:12px;margin:0 0 20px;">${[["12","Days"],["08","Hours"],["45","Mins"],["30","Secs"]].map(([n,l]) => `<div style="text-align:center;padding:14px 18px;background:${tokens.softBg};border:1px solid rgba(${hexToRgb(tokens.primary)},0.12);border-radius:${tokens.radius};min-width:60px;"><div style="font-size:28px;font-weight:900;line-height:1;color:${tokens.primary};font-family:'${tokens.headingFont}',system-ui,sans-serif;">${n}</div><div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${tokens.muted};margin-top:4px;">${l}</div></div>`).join("")}</div>`;
    case "tag-cloud":
      return `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 20px;">${[["React","text-[16px]"],["TypeScript","text-[12px]"],["Design Systems","text-[18px]"],["Next.js","text-[14px]"],["Tailwind","text-[13px]"],["AI","text-[22px]"],["Product","text-[15px]"],["UX","text-[17px]"]].map(([t, sz]) => `<span style="padding:4px 12px;border-radius:8px;background:${tokens.softBg};font-size:${sz.replace("text-[","").replace("]","")};font-weight:600;color:${tokens.text};opacity:${Math.random() * 0.4 + 0.6};">${t}</span>`).join("")}</div>`;

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
