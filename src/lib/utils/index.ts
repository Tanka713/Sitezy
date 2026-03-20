import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SiteBlueprint } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

export function buildFullPageHtml(
  pageHtml: string,
  blueprint: SiteBlueprint | null,
  pageName: string,
  editorScript = ""
): string {
  const headingFont = blueprint?.typography?.headingFont || "Inter";
  const bodyFont    = blueprint?.typography?.bodyFont    || "Inter";
  const colors      = blueprint?.colorScheme ?? {};

  const googleFonts = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;500;600;700;800;900&family=${encodeURIComponent(bodyFont)}:wght@300;400;500;600&display=swap`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${pageName}${blueprint?.siteName ? ` — ${blueprint.siteName}` : ""}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${googleFonts}" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --primary:   ${colors.primary   || "#7c3aed"};
      --secondary: ${colors.secondary || "#2563eb"};
      --accent:    ${colors.accent    || "#f59e0b"};
      --bg:        ${colors.bg        || "#ffffff"};
      --text:      ${colors.text      || "#111111"};
      --muted:     ${colors.muted     || "#6b7280"};
      --border:    ${colors.border    || "#e5e7eb"};
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: '${bodyFont}', system-ui, -apple-system, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: '${headingFont}', system-ui, sans-serif;
      line-height: 1.2;
    }
    a { color: var(--primary); }
    img { max-width: 100%; height: auto; display: block; }
    ::selection { background: var(--primary); color: white; }
  </style>
</head>
<body>
${pageHtml}
${editorScript}
</body>
</html>`;
}

export function downloadBlob(
  content: string | Blob,
  filename: string,
  mimeType = "application/octet-stream"
) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export * from "./images";

export { buildVisualEditorScript } from "./visualEditor";
