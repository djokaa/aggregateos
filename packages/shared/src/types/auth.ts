export const USER_ROLES = [
  "super_admin",
  "ops_manager",
  "dispatcher",
  "estimator",
  "accounting",
  "customer_user",
  "driver_user",
  // Legacy roles kept for backward compatibility during migration
  "platform_admin",
  "entity_gm",
  "driver",
  "customer",
  "finance",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface UserPermissions {
  canManageEntities: boolean;
  canManageUsers: boolean;
  canViewAllEntities: boolean;
  canDispatch: boolean;
  canDrive: boolean;
  canViewFinancials: boolean;
  canManageRates: boolean;
  canApproveTickets: boolean;
  canGenerateInvoices: boolean;
  canViewCustomerPortal: boolean;
  canCreateEstimates: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  // ── New canonical roles ──────────────────────────────────────────────────
  super_admin: {
    canManageEntities: true,
    canManageUsers: true,
    canViewAllEntities: true,
    canDispatch: true,
    canDrive: false,
    canViewFinancials: true,
    canManageRates: true,
    canApproveTickets: true,
    canGenerateInvoices: true,
    canViewCustomerPortal: false,
    canCreateEstimates: true,
  },
  ops_manager: {
    canManageEntities: false,
    canManageUsers: true,
    canViewAllEntities: false,
    canDispatch: true,
    canDrive: false,
    canViewFinancials: true,
    canManageRates: true,
    canApproveTickets: true,
    canGenerateInvoices: true,
    canViewCustomerPortal: false,
    canCreateEstimates: true,
  },
  dispatcher: {
    canManageEntities: false,
    canManageUsers: false,
    canViewAllEntities: false,
    canDispatch: true,
    canDrive: false,
    canViewFinancials: false,
    canManageRates: false,
    canApproveTickets: true,
    canGenerateInvoices: false,
    canViewCustomerPortal: false,
    canCreateEstimates: false,
  },
  estimator: {
    canManageEntities: false,
    canManageUsers: false,
    canViewAllEntities: false,
    canDispatch: false,
    canDrive: false,
    canViewFinancials: true,
    canManageRates: true,
    canApproveTickets: false,
    canGenerateInvoices: false,
    canViewCustomerPortal: false,
    canCreateEstimates: true,
  },
  accounting: {
    canManageEntities: false,
    canManageUsers: false,
    canViewAllEntities: false,
    canDispatch: false,
    canDrive: false,
    canViewFinancials: true,
    canManageRates: true,
    canApproveTickets: true,
    canGenerateInvoices: true,
    canViewCustomerPortal: false,
    canCreateEstimates: false,
  },
  customer_user: {
    canManageEntities: false,
    canManageUsers: false,
    canViewAllEntities: false,
    canDispatch: false,
    canDrive: false,
    canViewFinancials: false,
    canManageRates: false,
    canApproveTickets: false,
    canGenerateInvoices: false,
    canViewCustomerPortal: true,
    canCreateEstimates: false,
  },
  driver_user: {
    canManageEntities: false,
    canManageUsers: false,
    canViewAllEntities: false,
    canDispatch: false,
    canDrive: true,
    canViewFinancials: false,
    canManageRates: false,
    canApproveTickets: false,
    canGenerateInvoices: false,
    canViewCustomerPortal: false,
    canCreateEstimates: false,
  },

  // ── Legacy roles (aliases) ──────────────────────────────────────────────
  platform_admin: {
    canManageEntities: true,
    canManageUsers: true,
    canViewAllEntities: true,
    canDispatch: true,
    canDrive: false,
    canViewFinancials: true,
    canManageRates: true,
    canApproveTickets: true,
    canGenerateInvoices: true,
    canViewCustomerPortal: false,
    canCreateEstimates: true,
  },
  entity_gm: {
    canManageEntities: false,
    canManageUsers: true,
    canViewAllEntities: false,
    canDispatch: true,
    canDrive: false,
    canViewFinancials: true,
    canManageRates: true,
    canApproveTickets: true,
    canGenerateInvoices: true,
    canViewCustomerPortal: false,
    canCreateEstimates: true,
  },
  driver: {
    canManageEntities: false,
    canManageUsers: false,
    canViewAllEntities: false,
    canDispatch: false,
    canDrive: true,
    canViewFinancials: false,
    canManageRates: false,
    canApproveTickets: false,
    canGenerateInvoices: false,
    canViewCustomerPortal: false,
    canCreateEstimates: false,
  },
  customer: {
    canManageEntities: false,
    canManageUsers: false,
    canViewAllEntities: false,
    canDispatch: false,
    canDrive: false,
    canViewFinancials: false,
    canManageRates: false,
    canApproveTickets: false,
    canGenerateInvoices: false,
    canViewCustomerPortal: true,
    canCreateEstimates: false,
  },
  finance: {
    canManageEntities: false,
    canManageUsers: false,
    canViewAllEntities: false,
    canDispatch: false,
    canDrive: false,
    canViewFinancials: true,
    canManageRates: true,
    canApproveTickets: true,
    canGenerateInvoices: true,
    canViewCustomerPortal: false,
    canCreateEstimates: false,
  },
};

export function getPermissions(role: UserRole): UserPermissions {
  return ROLE_PERMISSIONS[role];
}
