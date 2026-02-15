/**
 * Billing Profile router — configurable grouping rules per market.
 *
 * @module billing-profile-router
 */

import { z } from "zod";
import { eq, and, desc, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";

export const billingProfileRouter = router({
  list: entityProcedure
    .input(
      z
        .object({
          customerId: z.string().uuid().optional(),
          market: z.string().optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { customerId, market, page, limit } = input;
      const conditions = [
        eq(schema.billingProfiles.entityId, ctx.organizationId!),
      ];

      if (customerId)
        conditions.push(eq(schema.billingProfiles.customerId, customerId));
      if (market)
        conditions.push(eq(schema.billingProfiles.market, market));

      const where = and(...conditions);

      const [items, [total]] = await Promise.all([
        ctx.db
          .select({
            profile: schema.billingProfiles,
            customerName: schema.customers.name,
          })
          .from(schema.billingProfiles)
          .leftJoin(
            schema.customers,
            eq(schema.billingProfiles.customerId, schema.customers.id),
          )
          .where(where)
          .orderBy(desc(schema.billingProfiles.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        ctx.db
          .select({ count: count() })
          .from(schema.billingProfiles)
          .where(where),
      ]);

      return {
        items: items.map((row) => ({
          ...row.profile,
          customerName: row.customerName,
        })),
        totalCount: total?.count ?? 0,
        page,
        limit,
      };
    }),

  getById: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [profile] = await ctx.db
        .select()
        .from(schema.billingProfiles)
        .where(
          and(
            eq(schema.billingProfiles.id, input.id),
            eq(schema.billingProfiles.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Billing profile not found",
        });
      }

      return profile;
    }),

  create: entityProcedure
    .input(
      z.object({
        customerId: z.string().uuid().optional(),
        market: z.string().min(1),
        invoiceCadence: z
          .enum(["daily", "weekly", "biweekly", "monthly"])
          .default("weekly"),
        groupBy: z.record(z.unknown()).default({}),
        weekStartDay: z.number().int().min(0).max(6).default(1),
        minimumBillableStatus: z.string().default("billable"),
        termsDefault: z.string().default("net_30"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [profile] = await ctx.db
        .insert(schema.billingProfiles)
        .values({
          entityId: ctx.organizationId!,
          customerId: input.customerId ?? null,
          market: input.market,
          invoiceCadence: input.invoiceCadence,
          groupBy: input.groupBy,
          weekStartDay: input.weekStartDay,
          minimumBillableStatus: input.minimumBillableStatus,
          termsDefault: input.termsDefault,
        })
        .returning();

      return profile;
    }),

  update: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        customerId: z.string().uuid().optional(),
        market: z.string().optional(),
        invoiceCadence: z
          .enum(["daily", "weekly", "biweekly", "monthly"])
          .optional(),
        groupBy: z.record(z.unknown()).optional(),
        weekStartDay: z.number().int().min(0).max(6).optional(),
        minimumBillableStatus: z.string().optional(),
        termsDefault: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const [profile] = await ctx.db
        .update(schema.billingProfiles)
        .set({ ...updates, updatedAt: new Date() })
        .where(
          and(
            eq(schema.billingProfiles.id, id),
            eq(schema.billingProfiles.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Billing profile not found",
        });
      }

      return profile;
    }),
});
