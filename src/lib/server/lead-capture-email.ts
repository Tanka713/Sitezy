import type { LeadSubmissionKind } from "@/types";
import { isCtaLeadCaptureForm } from "@/lib/lead-capture";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getLeadCaptureEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const fromEmail =
    process.env.SITEZY_SUPPORT_FROM_EMAIL?.trim() ??
    process.env.SITEZY_SUPPORT_EMAIL?.trim() ??
    "";

  return {
    apiKey,
    fromEmail,
    enabled: Boolean(apiKey && fromEmail),
  };
}

function formatFields(fields: Record<string, string>) {
  return Object.entries(fields)
    .map(([key, value]) => {
      const label = key
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return { label: label || key, value };
    })
    .filter((entry) => entry.value.trim());
}

function isSafeReplyTo(email: string | null | undefined) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function sendLeadCaptureNotificationEmail(input: {
  to: string;
  kind: LeadSubmissionKind;
  projectName: string;
  siteUrl?: string | null;
  pagePath: string;
  formId?: string | null;
  name?: string | null;
  email?: string | null;
  message?: string | null;
  fields: Record<string, string>;
}) {
  const config = getLeadCaptureEmailConfig();
  if (!config.enabled) {
    return {
      sent: false,
      error: "Lead notification email is not configured.",
    };
  }

  const recipient = input.to.trim();
  if (!recipient) {
    return {
      sent: false,
      error: "No lead notification email recipient is configured for this project.",
    };
  }

  const formattedFields = formatFields(input.fields);
  const isCtaSignup = input.kind === "newsletter" && isCtaLeadCaptureForm(input.formId);
  const subjectPrefix = isCtaSignup
    ? "New CTA signup"
    : input.kind === "newsletter"
    ? "New newsletter signup"
    : "New form submission";
  const subject = `${subjectPrefix} for ${input.projectName}`;
  const replyTo = isSafeReplyTo(input.email) ? input.email!.trim() : undefined;
  const intro =
    isCtaSignup
      ? `${input.email ?? "A visitor"} signed up through a CTA form.`
      : input.kind === "newsletter"
      ? `${input.email ?? "A visitor"} subscribed to the newsletter.`
      : `${input.name ?? input.email ?? "A visitor"} sent a new contact form submission.`;

  const text = [
    subject,
    "",
    intro,
    `Project: ${input.projectName}`,
    input.siteUrl ? `Site: ${input.siteUrl}` : null,
    `Page: ${input.pagePath || "/"}`,
    input.formId ? `Form ID: ${input.formId}` : null,
    "",
    "Fields:",
    ...formattedFields.map((field) => `${field.label}: ${field.value}`),
    input.message?.trim() ? `\nMessage:\n${input.message.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const html = [
    `<div style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;color:#111827;padding:24px;">`,
    `<div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:32px;">`,
    `<p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;">${escapeHtml(subjectPrefix)}</p>`,
    `<h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;color:#111827;">${escapeHtml(input.projectName)}</h1>`,
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(intro)}</p>`,
    `<div style="display:grid;gap:8px;margin:0 0 24px;padding:16px 18px;border-radius:14px;background:#f9fafb;border:1px solid #e5e7eb;">`,
    `<p style="margin:0;font-size:13px;color:#4b5563;"><strong>Project:</strong> ${escapeHtml(input.projectName)}</p>`,
    input.siteUrl
      ? `<p style="margin:0;font-size:13px;color:#4b5563;"><strong>Site:</strong> <a href="${escapeHtml(input.siteUrl)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(input.siteUrl)}</a></p>`
      : "",
    `<p style="margin:0;font-size:13px;color:#4b5563;"><strong>Page:</strong> ${escapeHtml(input.pagePath || "/")}</p>`,
    input.formId
      ? `<p style="margin:0;font-size:13px;color:#4b5563;"><strong>Form ID:</strong> ${escapeHtml(input.formId)}</p>`
      : "",
    `</div>`,
    `<div style="display:grid;gap:12px;">`,
    ...formattedFields.map(
      (field) =>
        `<div style="padding:14px 16px;border-radius:14px;border:1px solid #e5e7eb;background:#ffffff;"><p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#6b7280;">${escapeHtml(field.label)}</p><p style="margin:0;font-size:15px;line-height:1.7;color:#111827;white-space:pre-wrap;">${escapeHtml(field.value)}</p></div>`
    ),
    `</div>`,
    `</div>`,
    `</div>`,
  ].join("");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Sitezy Leads <${config.fromEmail}>`,
        to: [recipient],
        reply_to: replyTo ? [replyTo] : undefined,
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const payload = (await response.text().catch(() => "")).trim();
      return {
        sent: false,
        error: payload || `Email provider returned HTTP ${response.status}.`,
      };
    }

    return {
      sent: true,
      error: null,
    };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "We couldn't send the lead notification email.",
    };
  }
}
