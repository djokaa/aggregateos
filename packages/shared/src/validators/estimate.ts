import { z } from "zod";

export const estimateLineItemSchema = z.object({
  materialId: z.string().uuid(),
  originId: z.string().uuid(),
  destinationId: z.string().uuid(),
  quantity: z.number().positive("Quantity must be positive"),
  materialRate: z.number().nonnegative(),
  haulRate: z.number().nonnegative(),
  fuelSurcharge: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
  distanceMiles: z.number().nonnegative().optional(),
  estimatedDurationMinutes: z.number().nonnegative().optional(),
});

export const createEstimateSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  lineItems: z.array(estimateLineItemSchema).min(1, "At least one line item is required"),
  validUntilDays: z.number().int().positive().default(30),
  notes: z.string().max(2000).optional(),
});

export const updateEstimateSchema = createEstimateSchema.partial();

export type EstimateLineItem = z.infer<typeof estimateLineItemSchema>;
export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;
export type UpdateEstimateInput = z.infer<typeof updateEstimateSchema>;
