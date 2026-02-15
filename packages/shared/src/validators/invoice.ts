import { z } from "zod";

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  loadIds: z.array(z.string().uuid()).min(1, "At least one load is required"),
  dueDate: z.string().min(1, "Due date is required"),
  terms: z.string().optional(),
  market: z.string().optional(),
  notes: z.string().max(2000).optional(),
  notesInternal: z.string().max(2000).optional(),
  notesCustomer: z.string().max(2000).optional(),
  billingPeriodStart: z.string().optional(),
  billingPeriodEnd: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export const invoiceLineItemSchema = z.object({
  sourceType: z.enum(["load", "adjustment", "fee", "discount"]).default("load"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().nonnegative(),
  unit: z.string().default("tons"),
  unitPrice: z.number().nonnegative(),
  lineTotal: z.number(),
  sourceId: z.string().uuid().optional(),
  materialId: z.string().uuid().optional(),
});

export const billingProfileSchema = z.object({
  customerId: z.string().uuid().optional(),
  market: z.string().min(1, "Market is required"),
  invoiceCadence: z.enum(["daily", "weekly", "biweekly", "monthly"]).default("weekly"),
  groupBy: z.record(z.unknown()).default({}),
  weekStartDay: z.number().int().min(0).max(6).default(1),
  minimumBillableStatus: z.string().default("billable"),
  termsDefault: z.string().default("net_30"),
});

export const updateDraftSchema = z.object({
  id: z.string().uuid(),
  terms: z.string().optional(),
  market: z.string().optional(),
  dueDate: z.string().optional(),
  billingPeriodStart: z.string().optional(),
  billingPeriodEnd: z.string().optional(),
  notesInternal: z.string().max(2000).optional(),
  notesCustomer: z.string().max(2000).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;
export type BillingProfileInput = z.infer<typeof billingProfileSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
