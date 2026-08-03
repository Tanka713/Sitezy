import type {
  AccountLeadCaptureMode,
  EffectiveProjectLeadCaptureSettings,
  LeadCaptureRuntimeConfig,
  LeadSubmissionKind,
  ProjectIntegrationSettings,
  ProjectLeadCaptureMode,
  UserSettings,
} from "@/types";

export const defaultProjectIntegrationSettings: ProjectIntegrationSettings = {
  notificationEmail: null,
  contactCapture: "inherit",
  newsletterCapture: "inherit",
};

export function normalizeAccountLeadCaptureMode(value: unknown): AccountLeadCaptureMode {
  return value === "disabled" ? "disabled" : "sitezy";
}

export function normalizeProjectLeadCaptureMode(value: unknown): ProjectLeadCaptureMode {
  if (value === "sitezy" || value === "disabled") return value;
  return "inherit";
}

export function normalizeLeadSubmissionKind(value: unknown): LeadSubmissionKind {
  return value === "newsletter" ? "newsletter" : "contact";
}

function normalizeLeadFormId(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isCtaLeadCaptureForm(formId: string | null | undefined): boolean {
  const normalized = normalizeLeadFormId(formId);
  return normalized.includes("-cta-capture") || normalized.includes("-cta-strip-capture");
}

export function getLeadSubmissionDisplayLabel(
  kind: LeadSubmissionKind,
  formId: string | null | undefined
): string {
  if (kind === "newsletter") {
    return isCtaLeadCaptureForm(formId) ? "CTA signup" : "Newsletter";
  }
  return "Contact";
}

export function getLeadSubmissionSourceLabel(
  kind: LeadSubmissionKind,
  formId: string | null | undefined
): string | null {
  if (kind === "newsletter") {
    return isCtaLeadCaptureForm(formId) ? "CTA signup form" : "Newsletter form";
  }
  return null;
}

export function normalizeProjectIntegrationSettings(
  input?: Partial<ProjectIntegrationSettings> | null
): ProjectIntegrationSettings {
  const raw = input ?? {};
  return {
    notificationEmail:
      typeof raw.notificationEmail === "string" && raw.notificationEmail.trim()
        ? raw.notificationEmail.trim()
        : null,
    contactCapture: normalizeProjectLeadCaptureMode(raw.contactCapture),
    newsletterCapture: normalizeProjectLeadCaptureMode(raw.newsletterCapture),
  };
}

function resolveProjectLeadCaptureMode(
  mode: ProjectLeadCaptureMode,
  fallback: AccountLeadCaptureMode
): AccountLeadCaptureMode {
  if (mode === "sitezy" || mode === "disabled") return mode;
  return fallback;
}

export function resolveEffectiveProjectLeadCaptureSettings(
  projectSettings: Partial<ProjectIntegrationSettings> | null | undefined,
  userSettings: Pick<UserSettings, "integrations">,
  fallbackNotificationEmail?: string | null
): EffectiveProjectLeadCaptureSettings {
  const normalizedProjectSettings = normalizeProjectIntegrationSettings(projectSettings);
  const accountNotificationEmail = userSettings.integrations.notificationEmail.trim() || null;
  const fallbackEmail =
    typeof fallbackNotificationEmail === "string" && fallbackNotificationEmail.trim()
      ? fallbackNotificationEmail.trim()
      : null;
  const notificationEmail =
    normalizedProjectSettings.notificationEmail ??
    accountNotificationEmail ??
    fallbackEmail;

  return {
    notificationEmail,
    contactCapture: resolveProjectLeadCaptureMode(
      normalizedProjectSettings.contactCapture,
      normalizeAccountLeadCaptureMode(userSettings.integrations.contactCaptureDefault)
    ),
    newsletterCapture: resolveProjectLeadCaptureMode(
      normalizedProjectSettings.newsletterCapture,
      normalizeAccountLeadCaptureMode(userSettings.integrations.newsletterCaptureDefault)
    ),
  };
}

function normalizeLeadFieldValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 5000);
}

export function normalizeLeadFields(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = String(rawKey ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_:-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);
    const value = normalizeLeadFieldValue(rawValue);
    if (!key || !value) continue;
    normalized[key] = value;
  }
  return normalized;
}

function firstLeadField(fields: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = fields[key];
    if (value) return value;
  }
  return null;
}

export function extractLeadSummaryFields(
  kind: LeadSubmissionKind,
  fields: Record<string, string>
): { email: string | null; name: string | null; message: string | null } {
  const normalizedEmail = firstLeadField(fields, [
    "email",
    "email_address",
    "work_email",
    "business_email",
    "your_email",
  ]);
  const email = normalizedEmail ? normalizedEmail.toLowerCase() : null;
  const directName = firstLeadField(fields, ["name", "full_name", "fullname", "contact_name"]);
  const firstName = firstLeadField(fields, ["first_name", "firstname", "given_name"]);
  const lastName = firstLeadField(fields, ["last_name", "lastname", "family_name", "surname"]);
  const fallbackName = [firstName, lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const joinedName = directName ?? (fallbackName || null);
  const message = firstLeadField(fields, [
    "message",
    "project_brief",
    "brief",
    "notes",
    "details",
    "description",
    "inquiry",
  ]);

  return {
    email,
    name: joinedName,
    message: kind === "newsletter" ? null : message,
  };
}

export function buildLeadCaptureRuntimeConfig(input: Partial<LeadCaptureRuntimeConfig>): LeadCaptureRuntimeConfig {
  return {
    mode:
      input.mode === "preview" || input.mode === "published"
        ? input.mode
        : "disabled",
    projectId: typeof input.projectId === "string" && input.projectId.trim() ? input.projectId.trim() : null,
    contactCaptureEnabled: Boolean(input.contactCaptureEnabled),
    newsletterCaptureEnabled: Boolean(input.newsletterCaptureEnabled),
    submitEndpoint:
      typeof input.submitEndpoint === "string" && input.submitEndpoint.trim()
        ? input.submitEndpoint.trim()
        : "/api/leads/submit",
  };
}

function escapeLeadCaptureHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeLeadCaptureRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readLeadCaptureTagAttr(tag: string, attrName: string): string | null {
  const attrPattern = new RegExp(
    `${escapeLeadCaptureRegExp(attrName)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  );
  const match = tag.match(attrPattern);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

function hasLeadCaptureTagAttr(tag: string, attrName: string): boolean {
  return new RegExp(`\\s${escapeLeadCaptureRegExp(attrName)}(?:\\s*=|\\s|>)`, "i").test(tag);
}

function removeLeadCaptureTagAttr(tag: string, attrName: string): string {
  const attrPattern = new RegExp(
    `\\s${escapeLeadCaptureRegExp(attrName)}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?`,
    "gi"
  );
  return tag.replace(attrPattern, "");
}

function writeLeadCaptureTagAttr(tag: string, attrName: string, value: string): string {
  const attrPattern = new RegExp(
    `\\s${escapeLeadCaptureRegExp(attrName)}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`,
    "i"
  );
  const serializedAttr = ` ${attrName}="${escapeLeadCaptureHtmlAttr(value)}"`;

  if (attrPattern.test(tag)) {
    return tag.replace(attrPattern, serializedAttr);
  }

  return tag.replace(/\s*\/?>$/, `${serializedAttr}>`);
}

function normalizeLeadCaptureHtmlText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function inferGeneratedLeadCaptureKind(formHtml: string): LeadSubmissionKind | null {
  if (/<input\b[^>]*type\s*=\s*["']password["']/i.test(formHtml)) return null;
  if (/<input\b[^>]*type\s*=\s*["']search["']/i.test(formHtml)) return null;

  const normalizedText = normalizeLeadCaptureHtmlText(formHtml);
  const hasEmailInput =
    /<input\b[^>]*type\s*=\s*["']email["']/i.test(formHtml) ||
    /\b(email|e-mail)\b/.test(normalizedText);
  const hasTextarea = /<textarea\b/i.test(formHtml);
  const fieldCount = (formHtml.match(/<(input|textarea|select)\b/gi) ?? []).length;

  if (!hasEmailInput && !hasTextarea) {
    return null;
  }

  if (
    /\b(newsletter|subscribe|subscription|updates|join|mailing list|inbox)\b/.test(normalizedText) ||
    (hasEmailInput && !hasTextarea && fieldCount <= 2)
  ) {
    return "newsletter";
  }

  if (
    hasTextarea ||
    /\b(contact|get in touch|message|project brief|inquiry|enquiry|request)\b/.test(normalizedText)
  ) {
    return "contact";
  }

  return hasEmailInput ? "contact" : null;
}

function inferGeneratedLeadFieldName(
  kind: LeadSubmissionKind,
  controlTag: string,
  formInnerHtml: string,
  offset: number,
  index: number
): string | null {
  const tagName = controlTag.match(/^<([a-z]+)/i)?.[1]?.toLowerCase();
  if (!tagName) return null;

  const existingName = readLeadCaptureTagAttr(controlTag, "name");
  if (existingName?.trim()) return existingName.trim();

  const rawType =
    tagName === "textarea" ? "textarea" : readLeadCaptureTagAttr(controlTag, "type")?.toLowerCase() ?? "text";

  if (rawType === "hidden" || rawType === "submit" || rawType === "button" || rawType === "password") {
    return null;
  }

  if (rawType === "email") return "email";
  if (rawType === "tel") return "phone";
  if (rawType === "date") return "date";
  if (rawType === "time") return "time";

  const context = normalizeLeadCaptureHtmlText(
    `${formInnerHtml.slice(Math.max(0, offset - 180), Math.min(formInnerHtml.length, offset + controlTag.length + 180))} ${controlTag}`
  );

  if (/\bfirst name|given name\b/.test(context)) return "first_name";
  if (/\blast name|family name|surname\b/.test(context)) return "last_name";
  if (/\bcompany|brand|business\b/.test(context)) return "company";
  if (/\bsubject\b/.test(context)) return "subject";
  if (/\bphone|mobile|whatsapp\b/.test(context)) return "phone";
  if (/\bbudget\b/.test(context)) return "budget";
  if (/\bproject type|service\b/.test(context)) return "project_type";
  if (/\bgoal\b/.test(context)) return "goal";
  if (/\bparty size|guests?\b/.test(context)) return "party_size";
  if (/\bdate\b/.test(context)) return "date";
  if (/\btime\b/.test(context)) return "time";
  if (/\barea|location\b/.test(context)) return "area";
  if (/\b(full name|name)\b/.test(context)) return "name";

  if (tagName === "textarea") {
    if (/\b(message|brief|details|notes|inquiry|enquiry|how can we help|tell us)\b/.test(context)) {
      return "message";
    }
    return kind === "newsletter" ? "details" : "message";
  }

  return `field_${index}`;
}

function buildGeneratedLeadCaptureHoneypot(): string {
  return `<div aria-hidden="true" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;"><label style="display:block;font-size:11px;color:inherit;">Leave this field empty<input data-sz-capture-honeypot="1" type="text" name="website" tabindex="-1" autocomplete="off" style="display:block;width:1px;height:1px;opacity:0;" /></label></div>`;
}

function buildGeneratedLeadCaptureFeedback(): string {
  return `<p data-sz-capture-feedback="1" data-sz-capture-feedback-state="idle" style="margin:0;font-size:12px;line-height:1.6;color:inherit;"></p>`;
}

export function upgradeGeneratedLeadCaptureMarkup(html: string): string {
  let generatedFormIndex = 0;

  return html.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, (formMarkup) => {
    const openingTagMatch = formMarkup.match(/^<form\b[^>]*>/i);
    if (!openingTagMatch) return formMarkup;

    const inferredKind = inferGeneratedLeadCaptureKind(formMarkup);
    if (!inferredKind) return formMarkup;

    generatedFormIndex += 1;

    let openingTag = removeLeadCaptureTagAttr(openingTagMatch[0], "onsubmit");
    openingTag = writeLeadCaptureTagAttr(openingTag, "data-sz-capture-kind", inferredKind);

    if (!hasLeadCaptureTagAttr(openingTag, "data-sz-capture-form-id")) {
      openingTag = writeLeadCaptureTagAttr(
        openingTag,
        "data-sz-capture-form-id",
        `generated-${inferredKind}-form-${generatedFormIndex}`
      );
    }

    const closingTagIndex = formMarkup.lastIndexOf("</form>");
    let innerHtml = formMarkup.slice(openingTagMatch[0].length, closingTagIndex >= 0 ? closingTagIndex : formMarkup.length);
    let leadFieldIndex = 0;

    innerHtml = innerHtml.replace(/<(input|textarea|select)\b[^>]*>/gi, (controlTag, _tagName, offset) => {
      const nextName = inferGeneratedLeadFieldName(
        inferredKind,
        controlTag,
        innerHtml,
        Number(offset) || 0,
        leadFieldIndex + 1
      );

      let nextTag = controlTag;
      const controlType = readLeadCaptureTagAttr(controlTag, "type")?.toLowerCase() ?? "";

      if (nextName) {
        nextTag = writeLeadCaptureTagAttr(nextTag, "name", nextName);
        leadFieldIndex += 1;
      }

      if (controlType === "email") {
        nextTag = writeLeadCaptureTagAttr(nextTag, "autocomplete", "email");
        nextTag = writeLeadCaptureTagAttr(nextTag, "inputmode", "email");
        if (inferredKind === "newsletter" && !hasLeadCaptureTagAttr(nextTag, "required")) {
          nextTag = nextTag.replace(/\s*\/?>$/, ' required="required">');
        }
      }

      return nextTag;
    });

    if (!/data-sz-capture-honeypot\s*=/.test(innerHtml)) {
      innerHtml += buildGeneratedLeadCaptureHoneypot();
    }

    if (!/data-sz-capture-feedback\s*=/.test(innerHtml)) {
      innerHtml += buildGeneratedLeadCaptureFeedback();
    }

    return `${openingTag}${innerHtml}</form>`;
  });
}
