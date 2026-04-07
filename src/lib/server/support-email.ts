function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatReplyBody(body: string) {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function getSupportReplyEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const fromEmail =
    process.env.SITEZY_SUPPORT_FROM_EMAIL?.trim() ??
    process.env.SITEZY_SUPPORT_EMAIL?.trim() ??
    "";
  const replyTo = process.env.SITEZY_SUPPORT_EMAIL?.trim() || fromEmail || undefined;

  return {
    apiKey,
    fromEmail,
    replyTo,
    enabled: Boolean(apiKey && fromEmail),
  };
}

export function isSupportReplyEmailConfigured() {
  return getSupportReplyEmailConfig().enabled;
}

export async function sendSupportReplyEmail(input: {
  to: string;
  ticketNumber?: number | null;
  requestSubject: string;
  replyBody: string;
  userName?: string | null;
  replyAuthorName?: string | null;
  origin?: string | null;
}) {
  const config = getSupportReplyEmailConfig();
  if (!config.enabled) {
    return {
      sent: false,
      error: "Support reply email is not configured.",
    };
  }

  const email = input.to.trim();
  if (!email) {
    return {
      sent: false,
      error: "This support request does not have a customer email address.",
    };
  }

  const greetingName = input.userName?.trim() || "there";
  const signInUrl = (() => {
    try {
      return input.origin ? new URL("/login", input.origin).toString() : null;
    } catch {
      return null;
    }
  })();
  const safeSubject = input.requestSubject.trim() || "your Sitezy support request";
  const ticketLabel =
    typeof input.ticketNumber === "number" && Number.isFinite(input.ticketNumber)
      ? `Ticket ST-${input.ticketNumber}`
      : "your Sitezy support request";
  const paragraphs = formatReplyBody(input.replyBody);
  const responderLabel =
    typeof input.replyAuthorName === "string" && input.replyAuthorName.trim()
      ? `${input.replyAuthorName.trim()} from Sitezy Support`
      : "Sitezy Support";

  const text = [
    `Hi ${greetingName},`,
    "",
    `${responderLabel} replied to ${ticketLabel}: ${safeSubject}`,
    "",
    input.replyBody.trim(),
    "",
    signInUrl ? `You can also sign in to Sitezy to view the full thread: ${signInUrl}` : null,
    config.replyTo ? `Reply address: ${config.replyTo}` : null,
    "",
    responderLabel,
  ]
    .filter(Boolean)
    .join("\n");

  const html = [
    `<div style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;color:#111827;padding:24px;">`,
    `<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;">`,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hi ${escapeHtml(greetingName)},</p>`,
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;"><strong>${escapeHtml(responderLabel)}</strong> replied to <strong>${escapeHtml(ticketLabel)}</strong>: ${escapeHtml(safeSubject)}</p>`,
    ...paragraphs.map(
      (paragraph) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#374151;">${escapeHtml(paragraph)}</p>`
    ),
    signInUrl
      ? `<p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#4b5563;">You can also sign in to Sitezy to view the full thread: <a href="${escapeHtml(signInUrl)}" style="color:#4f46e5;text-decoration:none;">Open Sitezy</a></p>`
      : "",
    `<p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">${escapeHtml(responderLabel)}</p>`,
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
        from: `Sitezy Support <${config.fromEmail}>`,
        to: [email],
        reply_to: config.replyTo ? [config.replyTo] : undefined,
        subject:
          typeof input.ticketNumber === "number" && Number.isFinite(input.ticketNumber)
            ? `Re: [ST-${input.ticketNumber}] ${safeSubject}`
            : `Re: ${safeSubject}`,
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
      error: error instanceof Error ? error.message : "We couldn't send the support reply email.",
    };
  }
}
