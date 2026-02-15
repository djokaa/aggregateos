/**
 * Customer contacts router — CRUD for per-customer contact records.
 *
 * @module customer-contact-router
 */

import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";

export const customerContactRouter = router({
  /**
   * List contacts for a customer.
   */
  list: entityProcedure
    .input(z.object({ customerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify customer belongs to entity
      const [customer] = await ctx.db
        .select()
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.id, input.customerId),
            eq(schema.customers.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      return ctx.db
        .select()
        .from(schema.customerContacts)
        .where(eq(schema.customerContacts.customerId, input.customerId))
        .orderBy(desc(schema.customerContacts.isPrimary));
    }),

  create: entityProcedure
    .input(
      z.object({
        customerId: z.string().uuid(),
        name: z.string().min(1).max(255),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(["ap", "pm", "dispatch", "executive", "other"]).default("other"),
        isPrimary: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [contact] = await ctx.db
        .insert(schema.customerContacts)
        .values({
          customerId: input.customerId,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          role: input.role,
          isPrimary: input.isPrimary ?? false,
        })
        .returning();

      return contact;
    }),

  update: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(["ap", "pm", "dispatch", "executive", "other"]).optional(),
        isPrimary: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary;

      const [contact] = await ctx.db
        .update(schema.customerContacts)
        .set(updateData)
        .where(eq(schema.customerContacts.id, id))
        .returning();

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      return contact;
    }),

  delete: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [contact] = await ctx.db
        .delete(schema.customerContacts)
        .where(eq(schema.customerContacts.id, input.id))
        .returning();

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      return { success: true };
    }),
});
