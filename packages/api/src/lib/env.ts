/**
 * Runtime environment variable validation and typed access.
 *
 * All external service keys are validated at import time so that
 * misconfiguration surfaces immediately on server start rather than
 * failing silently when a feature is first used.
 *
 * Optional variables default to empty strings so the app can still
 * run in development without every key configured.
 *
 * @module env
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // Database (required for any data operation)
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .default("postgresql://postgres:password@localhost:5432/aggregateos"),

  // Clerk authentication (optional during local dev)
  CLERK_SECRET_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional().default(""),

  // Google Maps (optional — features degrade gracefully)
  GOOGLE_MAPS_API_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional().default(""),

  // OCR ticket processing (optional — manual entry fallback)
  GOOGLE_DOCUMENT_AI_PROJECT_ID: z.string().optional().default(""),
  GOOGLE_DOCUMENT_AI_LOCATION: z.string().optional().default("us"),
  GOOGLE_DOCUMENT_AI_PROCESSOR_ID: z.string().optional().default(""),

  // QuickBooks Online (optional — invoices stay local until configured)
  QBO_CLIENT_ID: z.string().optional().default(""),
  QBO_CLIENT_SECRET: z.string().optional().default(""),
  QBO_REDIRECT_URI: z.string().optional().default(""),
  QBO_REALM_ID: z.string().optional().default(""),
  QBO_ACCESS_TOKEN: z.string().optional().default(""),
  QBO_REFRESH_TOKEN: z.string().optional().default(""),

  // Notifications – Resend for email
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("AggregateOS <noreply@aggregateos.com>"),

  // Notifications – Twilio for SMS
  TWILIO_ACCOUNT_SID: z.string().optional().default(""),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
  TWILIO_PHONE_NUMBER: z.string().optional().default(""),

  // App
  NEXT_PUBLIC_APP_URL: z
    .string()
    .optional()
    .default("http://localhost:3000"),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
});

// ---------------------------------------------------------------------------
// Parse & export
// ---------------------------------------------------------------------------

/** Validated environment variables — safe to use throughout the app. */
export const env = envSchema.parse(process.env);

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** True when a Google Maps API key is configured. */
export const hasGoogleMaps = Boolean(
  env.GOOGLE_MAPS_API_KEY || env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
);

/** True when Document AI processor is configured for OCR. */
export const hasDocumentAI = Boolean(
  env.GOOGLE_DOCUMENT_AI_PROJECT_ID && env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID,
);

/** True when QuickBooks OAuth credentials are configured. */
export const hasQuickBooks = Boolean(
  env.QBO_CLIENT_ID && env.QBO_CLIENT_SECRET,
);

/** True when Resend email is configured. */
export const hasResend = Boolean(env.RESEND_API_KEY);

/** True when Twilio SMS is configured. */
export const hasTwilio = Boolean(
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER,
);

export type Env = z.infer<typeof envSchema>;
