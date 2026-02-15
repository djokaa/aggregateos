// =============================================================================
// Invoice Types & Constants
// =============================================================================

export const INVOICE_STATUSES = [
  "draft",
  "ready_to_send",
  "sent",
  "paid",
  "overdue",
  "void",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const QB_SYNC_STATUSES = [
  "not_synced",
  "synced",
  "sync_failed",
] as const;

export type QbSyncStatus = (typeof QB_SYNC_STATUSES)[number];

export const INVOICE_LINE_SOURCE_TYPES = [
  "load",
  "adjustment",
  "fee",
  "discount",
] as const;

export type InvoiceLineSourceType = (typeof INVOICE_LINE_SOURCE_TYPES)[number];

export const INVOICE_TERMS = [
  "cod",
  "net_15",
  "net_30",
  "net_45",
  "net_60",
  "net_90",
  "pwp",
] as const;

export type InvoiceTerms = (typeof INVOICE_TERMS)[number];

export const INVOICE_EVENT_TYPES = [
  "created",
  "generated_from_loads",
  "line_item_added",
  "line_item_updated",
  "line_item_removed",
  "attachment_added",
  "attachment_removed",
  "sent",
  "synced_to_quickbooks",
  "sync_failed",
  "voided",
  "payment_recorded",
  "status_changed",
] as const;

export type InvoiceEventType = (typeof INVOICE_EVENT_TYPES)[number];

export const BILLING_CADENCES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
] as const;

export type BillingCadence = (typeof BILLING_CADENCES)[number];

// ── Status labels & badge variants ─────────────────────────────────────────

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  ready_to_send: "Ready to Send",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

export const INVOICE_STATUS_BADGE_VARIANT: Record<
  InvoiceStatus,
  "secondary" | "info" | "success" | "error" | "outline" | "orange" | "purple"
> = {
  draft: "secondary",
  ready_to_send: "purple",
  sent: "info",
  paid: "success",
  overdue: "error",
  void: "outline",
};

export const QB_SYNC_STATUS_LABELS: Record<QbSyncStatus, string> = {
  not_synced: "Not Synced",
  synced: "Synced",
  sync_failed: "Sync Failed",
};

export const QB_SYNC_BADGE_VARIANT: Record<
  QbSyncStatus,
  "secondary" | "success" | "error"
> = {
  not_synced: "secondary",
  synced: "success",
  sync_failed: "error",
};

export const INVOICE_TERMS_LABELS: Record<InvoiceTerms, string> = {
  cod: "COD",
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
  net_90: "Net 90",
  pwp: "Pay When Paid",
};

export const INVOICE_TERMS_DAYS: Record<InvoiceTerms, number> = {
  cod: 0,
  net_15: 15,
  net_30: 30,
  net_45: 45,
  net_60: 60,
  net_90: 90,
  pwp: 0,
};

export const SOURCE_TYPE_LABELS: Record<InvoiceLineSourceType, string> = {
  load: "Load",
  adjustment: "Adjustment",
  fee: "Fee",
  discount: "Discount",
};

// ── Status transition map ──────────────────────────────────────────────────

export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["ready_to_send", "void"],
  ready_to_send: ["sent", "draft", "void"],
  sent: ["paid", "overdue", "void"],
  overdue: ["paid", "void"],
  paid: [],
  void: [],
};
