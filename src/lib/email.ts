const RESEND_URL = "https://api.resend.com/emails"

export type SendResult = { sent: boolean; reason?: "not_configured" | "send_failed" }

/** True when both RESEND_API_KEY and EMAIL_FROM are set. */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

/** Canonical app origin, used to build links inside emails. */
export function appUrl(path = ""): string {
  const base = process.env.BETTER_AUTH_URL || "http://localhost:3000"
  return `${base.replace(/\/$/, "")}${path}`
}

/**
 * Send one email via the Resend REST API. Never throws: when the key is
 * missing it returns { sent: false, reason: "not_configured" } so callers can
 * degrade gracefully (e.g. tell the user to copy the link instead).
 */
export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    console.warn("[email] not configured (RESEND_API_KEY/EMAIL_FROM missing) — skipped send")
    return { sent: false, reason: "not_configured" }
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.text ? { text: options.text } : {}),
      }),
      // Never let a slow/hung Resend API block the request indefinitely.
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error(`[email] Resend error ${res.status}: ${detail.slice(0, 300)}`)
      return { sent: false, reason: "send_failed" }
    }
    return { sent: true }
  } catch (err) {
    console.error("[email] send threw:", err)
    return { sent: false, reason: "send_failed" }
  }
}

// ---------------------------------------------------------------------------
// Templates (inline styles for email-client compatibility)
// ---------------------------------------------------------------------------

function escapeHtml(value: string | null | undefined): string {
  if (!value) return ""
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
}

function layout(options: { agencyName: string; heading: string; body: string }): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
            <tr>
              <td style="padding:8px 8px 16px;font-weight:700;font-size:18px;color:#0f172a;">
                ${escapeHtml(options.agencyName)}
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${escapeHtml(options.heading)}</h1>
                ${options.body}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 8px;color:#94a3b8;font-size:12px;">
                Sent by ${escapeHtml(options.agencyName)} via Discovery Pro.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function button(url: string, label: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:15px;">${escapeHtml(label)}</a>`
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${text}</p>`
}

export type EmailContent = { subject: string; html: string; text: string }

export function questionnaireInviteEmail(options: {
  agencyName: string
  projectName: string | null
  clientName: string
  url: string
}): EmailContent {
  const project = options.projectName || "your project"
  return {
    subject: `A few questions about ${project}`,
    html: layout({
      agencyName: options.agencyName,
      heading: `Let's plan ${project}`,
      body:
        paragraph(
          `Hi ${escapeHtml(options.clientName)}, before we start we'd like to understand your goals. It only takes a few minutes and your answers save as you go.`
        ) +
        `<p style="margin:8px 0 24px;">${button(options.url, "Start the questionnaire")}</p>` +
        paragraph(
          `If the button doesn't work, paste this link into your browser:<br><span style="color:#2563eb;word-break:break-all;">${escapeHtml(options.url)}</span>`
        ),
    }),
    text: `Hi ${options.clientName}, please complete the discovery questionnaire for ${project}:\n${options.url}`,
  }
}

export function submissionNotificationEmail(options: {
  agencyName: string
  clientName: string
  projectName: string | null
  dashboardUrl: string
}): EmailContent {
  const project = options.projectName || "Untitled project"
  return {
    subject: `${options.clientName} submitted their questionnaire`,
    html: layout({
      agencyName: options.agencyName,
      heading: "Questionnaire answers received",
      body:
        paragraph(
          `<strong>${escapeHtml(options.clientName)}</strong> completed the questionnaire for <strong>${escapeHtml(project)}</strong>. You can review their answers and generate a product brief now.`
        ) + `<p style="margin:8px 0 0;">${button(options.dashboardUrl, "Review answers")}</p>`,
    }),
    text: `${options.clientName} submitted the questionnaire for ${project}. Review it: ${options.dashboardUrl}`,
  }
}

export function passwordResetEmail(options: {
  agencyName: string
  url: string
}): EmailContent {
  return {
    subject: "Reset your password",
    html: layout({
      agencyName: options.agencyName,
      heading: "Reset your password",
      body:
        paragraph(
          "We received a request to reset your password. This link expires in one hour. If you didn't ask for this, you can safely ignore this email."
        ) +
        `<p style="margin:8px 0 24px;">${button(options.url, "Reset password")}</p>` +
        paragraph(
          `Or paste this link into your browser:<br><span style="color:#2563eb;word-break:break-all;">${escapeHtml(options.url)}</span>`
        ),
    }),
    text: `Reset your password (link expires in 1 hour): ${options.url}`,
  }
}

export function followUpEmail(options: {
  agencyName: string
  projectName: string | null
  clientName: string
  url: string
}): EmailContent {
  const project = options.projectName || "your project"
  return {
    subject: `A few more questions about ${project}`,
    html: layout({
      agencyName: options.agencyName,
      heading: "A few follow-up questions",
      body:
        paragraph(
          `Hi ${escapeHtml(options.clientName)}, thanks for your answers so far. We have a few follow-up questions to make sure we scope ${escapeHtml(project)} correctly.`
        ) + `<p style="margin:8px 0 0;">${button(options.url, "Answer follow-up questions")}</p>`,
    }),
    text: `Hi ${options.clientName}, we have a few follow-up questions for ${project}:\n${options.url}`,
  }
}
