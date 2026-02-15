// =============================================================================
// CRM Types & Constants — Companies, Contacts, Account Contacts
// =============================================================================

// ── Company Types ──────────────────────────────────────────────────────────

export const COMPANY_TYPES = [
  "customer",
  "supplier",
  "broker",
  "partner",
  "other",
] as const;

export type CompanyType = (typeof COMPANY_TYPES)[number];

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  customer: "Customer",
  supplier: "Supplier",
  broker: "Broker",
  partner: "Partner",
  other: "Other",
};

export const COMPANY_TYPE_BADGE_VARIANT: Record<
  CompanyType,
  "info" | "purple" | "orange" | "success" | "secondary"
> = {
  customer: "info",
  supplier: "purple",
  broker: "orange",
  partner: "success",
  other: "secondary",
};

// ── Contact Roles ──────────────────────────────────────────────────────────

export const CONTACT_ROLES = [
  "ap",
  "pm",
  "dispatch",
  "executive",
  "site_contact",
  "other",
] as const;

export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  ap: "Accounts Payable",
  pm: "Project Manager",
  dispatch: "Dispatch",
  executive: "Executive",
  site_contact: "Site Contact",
  other: "Other",
};

export const CONTACT_ROLE_BADGE_VARIANT: Record<
  ContactRole,
  "info" | "purple" | "orange" | "success" | "error" | "secondary"
> = {
  ap: "info",
  pm: "purple",
  dispatch: "orange",
  executive: "success",
  site_contact: "error",
  other: "secondary",
};

// ── Company Event Types ────────────────────────────────────────────────────

export const COMPANY_EVENT_TYPES = [
  "created",
  "updated",
  "contact_added",
  "contact_removed",
  "account_linked",
  "account_unlinked",
  "note_added",
] as const;

export type CompanyEventType = (typeof COMPANY_EVENT_TYPES)[number];

export const COMPANY_EVENT_LABELS: Record<CompanyEventType, string> = {
  created: "Company Created",
  updated: "Company Updated",
  contact_added: "Contact Added",
  contact_removed: "Contact Removed",
  account_linked: "Account Linked",
  account_unlinked: "Account Unlinked",
  note_added: "Note Added",
};

// ── Contact Event Types ────────────────────────────────────────────────────

export const CONTACT_EVENT_TYPES = [
  "created",
  "updated",
  "linked_to_account",
  "unlinked_from_account",
  "role_changed",
] as const;

export type ContactEventType = (typeof CONTACT_EVENT_TYPES)[number];

export const CONTACT_EVENT_LABELS: Record<ContactEventType, string> = {
  created: "Contact Created",
  updated: "Contact Updated",
  linked_to_account: "Linked to Account",
  unlinked_from_account: "Unlinked from Account",
  role_changed: "Role Changed",
};
