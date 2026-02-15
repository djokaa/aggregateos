import { z } from "zod";

/** Coordinate pair refinement: both lat and lng must be provided together, or neither. */
function refineCoordinates(data: { lat?: number | null; lng?: number | null }, ctx: z.RefinementCtx) {
  const hasLat = data.lat !== undefined && data.lat !== null;
  const hasLng = data.lng !== undefined && data.lng !== null;

  if (hasLat && !hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Longitude is required when latitude is provided",
      path: ["lng"],
    });
  }

  if (hasLng && !hasLat) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Latitude is required when longitude is provided",
      path: ["lat"],
    });
  }
}

/** Base object schema (without refinement) — used to derive .partial() */
const locationBaseSchema = z.object({
  name: z.string().min(1, "Location name is required").max(255),
  type: z.enum(["quarry", "job_site", "plant", "yard"]),
  address: z.string().min(1, "Address is required").max(500),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(50),
  zip: z.string().min(1, "ZIP code is required").max(20),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  geofenceRadius: z.number().min(50).max(5000).default(200), // meters
  contactName: z.string().max(255).optional(),
  contactPhone: z.string().max(20).optional(),
  operatingHoursStart: z.string().optional(), // "06:00"
  operatingHoursEnd: z.string().optional(), // "18:00"
  notes: z.string().max(2000).optional(),
});

export const createLocationSchema = locationBaseSchema.superRefine(refineCoordinates);

export const updateLocationSchema = locationBaseSchema.partial().superRefine(refineCoordinates);

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
