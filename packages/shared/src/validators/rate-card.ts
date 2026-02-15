import { z } from "zod";

export const createRateCardSchema = z.object({
  materialId: z.string().uuid("Select a material"),
  originId: z.string().uuid("Select an origin location"),
  destinationZone: z.string().min(1, "Destination zone is required").max(100),
  market: z.string().max(20).optional(),
  rateType: z
    .enum(["route_based", "time_based", "contract", "spot"])
    .default("route_based"),
  haulRate: z.number().nonnegative("Haul rate must be non-negative"),
  materialRate: z.number().nonnegative("Material rate must be non-negative"),
  driverPayRate: z.number().nonnegative().optional(),
  materialCostRate: z.number().nonnegative().optional(),
  fuelSurchargePercent: z.number().min(0).max(1).default(0.12),
  minimumLoads: z.number().int().nonnegative().optional(),
  effectiveDate: z.string().min(1, "Effective date is required"),
  expiresAt: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateRateCardSchema = createRateCardSchema.partial();

export type CreateRateCardInput = z.infer<typeof createRateCardSchema>;
export type UpdateRateCardInput = z.infer<typeof updateRateCardSchema>;
