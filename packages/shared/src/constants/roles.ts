import type { UserRole } from "../types/auth";

export const ROLE_LABELS: Record<UserRole, string> = {
  // Canonical roles
  super_admin: "Super Admin",
  ops_manager: "Ops Manager",
  dispatcher: "Dispatcher",
  estimator: "Estimator",
  accounting: "Accounting",
  customer_user: "Customer User",
  driver_user: "Driver User",
  // Legacy
  platform_admin: "Platform Admin",
  entity_gm: "General Manager",
  driver: "Driver",
  customer: "Customer",
  finance: "Finance",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: "Full God-mode access across all entities and settings",
  ops_manager: "Manage operations, users, and finances for an entity",
  dispatcher: "Create and assign loads, manage daily dispatch operations",
  estimator: "Create estimates, manage rate cards and pricing",
  accounting: "Manage billing, invoices, payments, and financial reporting",
  customer_user: "View orders, track deliveries, access invoices (customer portal)",
  driver_user: "View assignments, update load status, upload tickets (driver app)",
  // Legacy
  platform_admin: "Full access to all entities and settings across the platform",
  entity_gm: "Manage operations, users, and finances for a single entity",
  driver: "View assignments, update load status, upload tickets",
  customer: "View orders, track deliveries, access invoices",
  finance: "Manage billing, invoices, payments, and financial reporting",
};
