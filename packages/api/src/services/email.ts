/**
 * Email service powered by Resend.
 *
 * Sends transactional emails for:
 * - Estimate delivery to customers
 * - Invoice delivery to customers
 * - Load status notifications
 * - Driver assignment alerts
 * - System alerts
 *
 * Falls back to console logging when RESEND_API_KEY is not set,
 * allowing the full flow to work during local development.
 *
 * @module email
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "AggregateOS <noreply@aggregateos.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Whether Resend is properly configured. */
export const isEmailConfigured = Boolean(RESEND_API_KEY);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  /** Optional plain-text fallback */
  text?: string;
  /** Reply-to address */
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Core send function
// ---------------------------------------------------------------------------

/**
 * Send an email via Resend API.
 *
 * @returns  Result with success flag and message ID.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  if (!isEmailConfigured) {
    console.log(
      `[Email] (dev mode) Would send to: ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`,
    );
    console.log(`[Email] Subject: ${options.subject}`);
    console.log(`[Email] Body preview: ${options.html.substring(0, 200)}...`);
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[Email] Resend API error:", res.status, error);
      return { success: false, error: `Resend ${res.status}: ${error}` };
    }

    const data = (await res.json()) as { id?: string };
    return { success: true, messageId: data.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Email] Send failed:", msg);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

/** Base HTML wrapper for all emails */
function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f4f4f5; color: #18181b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #18181b; padding: 24px 32px; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 0; }
    .header h1 span { color: #f59e0b; }
    .body { padding: 32px; }
    .footer { padding: 16px 32px; background: #fafafa; border-top: 1px solid #e4e4e7; text-align: center; font-size: 12px; color: #a1a1aa; }
    .btn { display: inline-block; padding: 12px 24px; background: #f59e0b; color: #000; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; }
    .btn-outline { display: inline-block; padding: 10px 20px; border: 1px solid #e4e4e7; color: #18181b; text-decoration: none; border-radius: 6px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { text-align: left; padding: 8px 12px; background: #fafafa; border-bottom: 1px solid #e4e4e7; font-size: 12px; text-transform: uppercase; color: #71717a; }
    td { padding: 8px 12px; border-bottom: 1px solid #f4f4f5; font-size: 14px; }
    .highlight { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
  </style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container">
      <div class="header">
        <h1>Aggregate<span>OS</span></h1>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>Powered by AggregateOS — Aggregate Logistics Platform</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Pre-built email templates
// ---------------------------------------------------------------------------

/**
 * Send an estimate to a customer for review.
 */
export async function sendEstimateEmail(params: {
  to: string;
  customerName: string;
  estimateNumber: string;
  estimateId: string;
  total: string;
  validUntil: string;
  lineItemCount: number;
}): Promise<EmailResult> {
  const viewUrl = `${APP_URL}/api/estimates/${params.estimateId}/pdf`;

  const html = emailWrapper(`
    <h2 style="margin-top: 0;">New Estimate</h2>
    <p>Hi ${params.customerName},</p>
    <p>We've prepared an estimate for your review:</p>
    <div class="highlight">
      <strong>Estimate ${params.estimateNumber}</strong><br>
      <span style="font-size: 24px; font-weight: 700; color: #18181b;">${params.total}</span><br>
      <span style="font-size: 13px; color: #71717a;">${params.lineItemCount} line item${params.lineItemCount !== 1 ? "s" : ""} · Valid until ${params.validUntil}</span>
    </div>
    <p style="margin: 24px 0;">
      <a href="${viewUrl}" class="btn">View Estimate</a>
    </p>
    <p style="font-size: 13px; color: #71717a;">
      If you have questions, reply to this email and we'll get back to you promptly.
    </p>
  `);

  return sendEmail({
    to: params.to,
    subject: `Estimate ${params.estimateNumber} — ${params.total}`,
    html,
  });
}

/**
 * Send an invoice to a customer.
 */
export async function sendInvoiceEmail(params: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  total: string;
  dueDate: string;
}): Promise<EmailResult> {
  const html = emailWrapper(`
    <h2 style="margin-top: 0;">Invoice</h2>
    <p>Hi ${params.customerName},</p>
    <p>Please find your invoice below:</p>
    <div class="highlight">
      <strong>Invoice ${params.invoiceNumber}</strong><br>
      <span style="font-size: 24px; font-weight: 700; color: #18181b;">${params.total}</span><br>
      <span style="font-size: 13px; color: #71717a;">Due by ${params.dueDate}</span>
    </div>
    <p style="font-size: 13px; color: #71717a;">
      Payment terms as per your agreement. Please contact us with any questions.
    </p>
  `);

  return sendEmail({
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} — ${params.total} due ${params.dueDate}`,
    html,
  });
}

/**
 * Send a load assignment notification to a driver.
 */
export async function sendLoadAssignmentEmail(params: {
  to: string;
  driverName: string;
  loadNumber: string;
  scheduledTime?: string;
  origin?: string;
  destination?: string;
}): Promise<EmailResult> {
  const html = emailWrapper(`
    <h2 style="margin-top: 0;">New Load Assigned</h2>
    <p>Hi ${params.driverName},</p>
    <p>You've been assigned a new load:</p>
    <div class="highlight">
      <strong>${params.loadNumber}</strong><br>
      ${params.origin ? `<span>From: ${params.origin}</span><br>` : ""}
      ${params.destination ? `<span>To: ${params.destination}</span><br>` : ""}
      ${params.scheduledTime ? `<span>Scheduled: ${params.scheduledTime}</span>` : ""}
    </div>
    <p style="font-size: 13px; color: #71717a;">
      Open the AggregateOS Driver app for full details and navigation.
    </p>
  `);

  return sendEmail({
    to: params.to,
    subject: `Load ${params.loadNumber} assigned to you`,
    html,
  });
}
