import { z } from "zod";
import { eq, and, sql, desc, count, inArray } from "drizzle-orm";
import * as schema from "@aggregateos/db";
import {
  createCompanySchema,
  updateCompanySchema,
} from "@aggregateos/shared";
import { router, entityProcedure } from "../trpc";
import {
  writeCompanyEvent,
  writeCompanyCreatedEvent,
  writeCompanyUpdatedEvent,
} from "../services/company-history";

export const companyRouter = router({
  // -----------------------------------------------------------------------
  // List companies (paginated, searchable, filterable by type)
  // -----------------------------------------------------------------------
  list: entityProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          type: z.string().optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { search, type, page, limit } = input;

      const conditions: any[] = [
        eq(schema.companies.entityId, ctx.organizationId!),
        eq(schema.companies.isActive, true),
      ];

      if (search) {
        conditions.push(
          sql`(${schema.companies.name} ILIKE ${"%" + search + "%"} OR ${schema.companies.legalName} ILIKE ${"%" + search + "%"})`,
        );
      }

      if (type) {
        conditions.push(eq(schema.companies.type, type));
      }

      const where = and(...conditions);

      const [items, [total]] = await Promise.all([
        ctx.db
          .select()
          .from(schema.companies)
          .where(where)
          .orderBy(desc(schema.companies.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        ctx.db
          .select({ count: count() })
          .from(schema.companies)
          .where(where),
      ]);

      return {
        items,
        totalCount: total?.count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((total?.count ?? 0) / limit),
      };
    }),

  // -----------------------------------------------------------------------
  // Get company by ID
  // -----------------------------------------------------------------------
  getById: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [company] = await ctx.db
        .select()
        .from(schema.companies)
        .where(
          and(
            eq(schema.companies.id, input.id),
            eq(schema.companies.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!company) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Company not found",
        });
      }

      return company;
    }),

  // -----------------------------------------------------------------------
  // Create company
  // -----------------------------------------------------------------------
  create: entityProcedure
    .input(createCompanySchema)
    .mutation(async ({ ctx, input }) => {
      const [company] = await ctx.db
        .insert(schema.companies)
        .values({
          ...input,
          entityId: ctx.organizationId!,
        })
        .returning();

      await writeCompanyCreatedEvent(
        ctx.db,
        company.id,
        ctx.userId,
        "Admin",
      );

      return company;
    }),

  // -----------------------------------------------------------------------
  // Update company
  // -----------------------------------------------------------------------
  update: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateCompanySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [company] = await ctx.db
        .update(schema.companies)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.companies.id, input.id),
            eq(schema.companies.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!company) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Company not found",
        });
      }

      await writeCompanyUpdatedEvent(
        ctx.db,
        company.id,
        ctx.userId,
        "Admin",
        Object.keys(input.data),
      );

      return company;
    }),

  // -----------------------------------------------------------------------
  // Delete company (soft delete)
  // -----------------------------------------------------------------------
  delete: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [company] = await ctx.db
        .update(schema.companies)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.companies.id, input.id),
            eq(schema.companies.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!company) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Company not found",
        });
      }

      return { success: true };
    }),

  // -----------------------------------------------------------------------
  // Get accounts (customers) linked to this company
  // -----------------------------------------------------------------------
  getAccounts: entityProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db
        .select()
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.companyId, input.companyId),
            eq(schema.customers.entityId, ctx.organizationId!),
            eq(schema.customers.isActive, true),
          ),
        )
        .orderBy(desc(schema.customers.createdAt));

      return items;
    }),

  // -----------------------------------------------------------------------
  // Get contacts for this company
  // -----------------------------------------------------------------------
  getContacts: entityProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db
        .select()
        .from(schema.contacts)
        .where(
          and(
            eq(schema.contacts.companyId, input.companyId),
            eq(schema.contacts.entityId, ctx.organizationId!),
            eq(schema.contacts.isActive, true),
          ),
        )
        .orderBy(desc(schema.contacts.createdAt));

      return items;
    }),

  // -----------------------------------------------------------------------
  // Get orders across all accounts linked to this company
  // -----------------------------------------------------------------------
  getOrders: entityProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get all customer IDs linked to this company
      const accounts = await ctx.db
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.companyId, input.companyId),
            eq(schema.customers.entityId, ctx.organizationId!),
          ),
        );

      if (accounts.length === 0) return [];

      const customerIds = accounts.map((a) => a.id);

      const items = await ctx.db
        .select()
        .from(schema.orders)
        .where(
          and(
            inArray(schema.orders.customerId, customerIds),
            eq(schema.orders.entityId, ctx.organizationId!),
          ),
        )
        .orderBy(desc(schema.orders.createdAt))
        .limit(50);

      return items;
    }),

  // -----------------------------------------------------------------------
  // Get invoices across all accounts linked to this company
  // -----------------------------------------------------------------------
  getInvoices: entityProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const accounts = await ctx.db
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.companyId, input.companyId),
            eq(schema.customers.entityId, ctx.organizationId!),
          ),
        );

      if (accounts.length === 0) return [];

      const customerIds = accounts.map((a) => a.id);

      const items = await ctx.db
        .select()
        .from(schema.invoices)
        .where(
          and(
            inArray(schema.invoices.customerId, customerIds),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .orderBy(desc(schema.invoices.createdAt))
        .limit(50);

      return items;
    }),

  // -----------------------------------------------------------------------
  // Get projects across all accounts linked to this company
  // -----------------------------------------------------------------------
  getProjects: entityProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const accounts = await ctx.db
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.companyId, input.companyId),
            eq(schema.customers.entityId, ctx.organizationId!),
          ),
        );

      if (accounts.length === 0) return [];

      const customerIds = accounts.map((a) => a.id);

      const items = await ctx.db
        .select()
        .from(schema.projects)
        .where(inArray(schema.projects.customerId, customerIds))
        .orderBy(desc(schema.projects.createdAt))
        .limit(50);

      return items;
    }),

  // -----------------------------------------------------------------------
  // Get history events
  // -----------------------------------------------------------------------
  getHistory: entityProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db
        .select()
        .from(schema.companyHistoryEvents)
        .where(eq(schema.companyHistoryEvents.companyId, input.companyId))
        .orderBy(desc(schema.companyHistoryEvents.timestamp))
        .limit(100);

      return items;
    }),
});
