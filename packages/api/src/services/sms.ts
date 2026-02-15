/**
 * SMS notification service powered by Twilio.
 *
 * Sends text messages for time-critical notifications:
 * - Driver load assignment alerts
 * - Dispatch status changes
 * - Delivery confirmations
 *
 * Falls back to console logging when Twilio is not configured.
 *
 * @module sms
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

/** Whether Twilio SMS is properly configured. */
export const isSmsConfigured = Boolean(
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER,
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SmsOptions {
  to: string;
  body: string;
}

export interface SmsResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Core send
// ---------------------------------------------------------------------------

/**
 * Send an SMS message via Twilio.
 */
export async function sendSms(options: SmsOptions): Promise<SmsResult> {
  if (!isSmsConfigured) {
    console.log(`[SMS] (dev mode) Would send to: ${options.to}`);
    console.log(`[SMS] Body: ${options.body}`);
    return { success: true, messageSid: `dev-${Date.now()}` };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        To: options.to,
        From: TWILIO_PHONE_NUMBER,
        Body: options.body,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[SMS] Twilio API error:", res.status, error);
      return { success: false, error: `Twilio ${res.status}: ${error}` };
    }

    const data = (await res.json()) as { sid?: string };
    return { success: true, messageSid: data.sid };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SMS] Send failed:", msg);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Pre-built message templates
// ---------------------------------------------------------------------------

/**
 * Notify a driver of a new load assignment via SMS.
 */
export async function smsLoadAssignment(params: {
  to: string;
  driverName: string;
  loadNumber: string;
  origin?: string;
  destination?: string;
}): Promise<SmsResult> {
  const lines = [
    `AggregateOS: New load ${params.loadNumber} assigned to you.`,
  ];
  if (params.origin) lines.push(`Pickup: ${params.origin}`);
  if (params.destination) lines.push(`Deliver: ${params.destination}`);
  lines.push("Open the app for details.");

  return sendSms({ to: params.to, body: lines.join("\n") });
}

/**
 * Notify dispatch about a delivery completion.
 */
export async function smsDeliveryComplete(params: {
  to: string;
  loadNumber: string;
  driverName: string;
  weight?: string;
}): Promise<SmsResult> {
  let body = `AggregateOS: ${params.loadNumber} delivered by ${params.driverName}.`;
  if (params.weight) body += ` Weight: ${params.weight} tons.`;
  body += " Ticket pending review.";

  return sendSms({ to: params.to, body });
}

/**
 * Send a dispatch alert (e.g. driver running late, issue reported).
 */
export async function smsDispatchAlert(params: {
  to: string;
  message: string;
}): Promise<SmsResult> {
  return sendSms({
    to: params.to,
    body: `AggregateOS Alert: ${params.message}`,
  });
}
