// ---------------------------------------------------------------------------
// Router & context
// ---------------------------------------------------------------------------

export { appRouter, type AppRouter } from "./root";
export {
  router,
  publicProcedure,
  protectedProcedure,
  entityProcedure,
  type TRPCContext,
  type CreateTRPCContext,
} from "./trpc";

// ---------------------------------------------------------------------------
// Services — importable by the web app for direct usage (e.g. OAuth routes)
// ---------------------------------------------------------------------------

export { geocodeAddress, calculateDistance } from "./services/google-maps";
export { processTicketImage, parseTicketText, isOcrConfigured } from "./services/ocr";
export { sendEmail, sendEstimateEmail, sendInvoiceEmail, isEmailConfigured } from "./services/email";
export { sendSms, smsLoadAssignment, isSmsConfigured } from "./services/sms";
export {
  syncInvoiceToQbo,
  syncCustomerToQbo,
  getQboInvoiceStatus,
  getAuthorizationUrl as getQboAuthUrl,
  exchangeAuthCode as exchangeQboAuthCode,
  isQboConfigured,
} from "./services/quickbooks";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export { env, hasGoogleMaps, hasDocumentAI, hasQuickBooks, hasResend, hasTwilio } from "./lib/env";
export { notFoundOrThrow, validateTransition, requireService, safeCall } from "./lib/errors";
