import { z } from "zod";
import { eq, and, like, sql, desc, count } from "drizzle-orm";
import * as schema from "@aggregateos/db";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "@aggregateos/shared";
import { router, entityProcedure } from "../trpc";

export const customerRouter = router({
  // -----------------------------------------------------------------------
  // List customers (paginated, searchable)
  // -----------------------------------------------------------------------
  list: entityProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          companyId: z.string().uuid().optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { search, companyId, page, limit } = input;

      const conditions: any[] = [
        eq(schema.customers.entityId, ctx.organizationId!),
        eq(schema.customers.isActive, true),
      ];

      if (search) {
        conditions.push(
          sql`(${schema.customers.name} ILIKE ${"%" + search + "%"} OR ${schema.customers.contactName} ILIKE ${"%" + search + "%"})`,
        );
      }

      if (companyId) {
        conditions.push(eq(schema.customers.companyId, companyId));
      }

      const where = and(...conditions);

      const [items, [total]] = await Promise.all([
        ctx.db
          .select({
            customer: schema.customers,
            companyName: schema.companies.name,
          })
          .from(schema.customers)
          .leftJoin(
            schema.companies,
            eq(schema.customers.companyId, schema.companies.id),
          )
          .where(where)
          .orderBy(desc(schema.customers.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        ctx.db
          .select({ count: count() })
          .from(schema.customers)
          .where(where),
      ]);

      return {
        items: items.map((row) => ({
          ...row.customer,
          companyName: row.companyName,
        })),
        totalCount: total?.count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((total?.count ?? 0) / limit),
      };
    }),

  // -----------------------------------------------------------------------
  // Get customer by ID
  // -----------------------------------------------------------------------
  getById: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          customer: schema.customers,
          companyName: schema.companies.name,
          companyId: schema.companies.id,
        })
        .from(schema.customers)
        .leftJoin(
          schema.companies,
          eq(schema.customers.companyId, schema.companies.id),
        )
        .where(
          and(
            eq(schema.customers.id, input.id),
            eq(schema.customers.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!row) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      return {
        ...row.customer,
        companyName: row.companyName,
        linkedCompanyId: row.companyId,
      };
    }),

  // -----------------------------------------------------------------------
  // Create customer
  // -----------------------------------------------------------------------
  create: entityProcedure
    .input(createCustomerSchema)
    .mutation(async ({ ctx, input }) => {
      const values = { ...input };
      if (!values.companyId || values.companyId === "") {
        delete values.companyId;
      }
      const [customer] = await ctx.db
        .insert(schema.customers)
        .values({
          ...values,
          entityId: ctx.organizationId!,
        })
        .returning();

      return customer;
    }),

  // -----------------------------------------------------------------------
  // Update customer
  // -----------------------------------------------------------------------
  update: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateCustomerSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = { ...input.data };
      // Normalize empty companyId string to null for DB
      if ("companyId" in data && (!data.companyId || data.companyId === "")) {
        (data as any).companyId = null;
      }
      const [customer] = await ctx.db
        .update(schema.customers)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.customers.id, input.id),
            eq(schema.customers.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!customer) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      return customer;
    }),

  // -----------------------------------------------------------------------
  // Delete customer (soft delete)
  // -----------------------------------------------------------------------
  delete: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [customer] = await ctx.db
        .update(schema.customers)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.customers.id, input.id),
            eq(schema.customers.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!customer) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      return { success: true };
    }),
});
