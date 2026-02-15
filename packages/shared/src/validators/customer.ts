import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(255),
  contactName: z.string().min(1, "Contact name is required").max(255),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  contactPhone: z.string().min(1, "Phone number is required").max(20),
  billingAddress: z.string().min(1, "Billing address is required").max(500),
  billingCity: z.string().min(1, "City is required").max(100),
  billingState: z.string().min(1, "State is required").max(50),
  billingZip: z.string().min(1, "ZIP code is required").max(20),
  creditTerms: z.enum(["cod", "net_15", "net_30", "net_45", "net_60"]).default("net_30"),
  notes: z.string().max(2000).optional(),
  companyId: z.string().uuid().optional().or(z.literal("")),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
