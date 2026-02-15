import { z } from "zod";

export const createContactSchema = z.object({
  companyId: z.string().uuid("Select a company").optional(),
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().min(1, "Last name is required").max(255),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  isPrimary: z.boolean().default(false),
});

export const updateContactSchema = createContactSchema.partial();

export const linkContactToAccountSchema = z.object({
  contactId: z.string().uuid(),
  customerId: z.string().uuid(),
  role: z.enum(["ap", "pm", "dispatch", "executive", "site_contact", "other"]).default("other"),
  isPrimary: z.boolean().default(false),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type LinkContactToAccountInput = z.infer<typeof linkContactToAccountSchema>;
