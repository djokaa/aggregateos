import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  legalName: z.string().max(255).optional(),
  type: z.enum(["customer", "supplier", "broker", "partner", "other"]).default("customer"),
  industry: z.string().max(100).optional(),
  website: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
