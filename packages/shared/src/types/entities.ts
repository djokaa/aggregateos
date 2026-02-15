export type OrganizationType = "ryland" | "jv_partner" | "customer_org";

export type LocationType = "quarry" | "job_site" | "plant" | "yard";

export type MaterialType = "rock" | "sand" | "fill" | "concrete" | "gravel" | "asphalt" | "other";

export type MaterialUnit = "ton" | "cy" | "load";

/** @deprecated Use InvoiceStatus from types/invoices instead */
// InvoiceStatus moved to types/invoices.ts (includes ready_to_send)

export type EstimateStatus = "draft" | "sent" | "approved" | "rejected" | "expired";

export type DriverStatus = "available" | "on_load" | "offline";

export type VehicleType = "dump_truck" | "semi" | "flatbed" | "tanker" | "other";

export type CreditTerms = "cod" | "net_15" | "net_30" | "net_45" | "net_60";
