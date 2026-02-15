import { z } from "zod";
import { eq, and, lte, sql, desc, count } from "drizzle-orm";
import * as schema from "@aggregateos/db";
import { createRateCardSchema, updateRateCardSchema } from "@aggregateos/shared";
import { router, entityProcedure } from "../trpc";

export const rateCardRouter = router({
  // -----------------------------------------------------------------------
  // List rate cards (paginated, filterable)
  // -----------------------------------------------------------------------
  list: entityProcedure
    .input(
      z
        .object({
          materialId: z.string().uuid().optional(),
          originId: z.string().uuid().optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { materialId, originId, page, limit } = input;

      const conditions = [
        eq(schema.rateCards.entityId, ctx.organizationId!),
        eq(schema.rateCards.isActive, true),
      ];

      if (materialId) {
        conditions.push(eq(schema.rateCards.materialId, materialId));
      }

      if (originId) {
        conditions.push(eq(schema.rateCards.originId, originId));
      }

      const where = and(...conditions);

      const [items, [total]] = await Promise.all([
        ctx.db
          .select()
          .from(schema.rateCards)
          .where(where)
          .orderBy(desc(schema.rateCards.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        ctx.db
          .select({ count: count() })
          .from(schema.rateCards)
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
  // Get rate card by ID
  // -----------------------------------------------------------------------
  getById: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [rateCard] = await ctx.db
        .select()
        .from(schema.rateCards)
        .where(
          and(
            eq(schema.rateCards.id, input.id),
            eq(schema.rateCards.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!rateCard) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Rate card not found",
        });
      }

      return rateCard;
    }),

  // -----------------------------------------------------------------------
  // Create rate card
  // -----------------------------------------------------------------------
  create: entityProcedure
    .input(createRateCardSchema)
    .mutation(async ({ ctx, input }) => {
      const [rateCard] = await ctx.db
        .insert(schema.rateCards)
        .values({
          entityId: ctx.organizationId!,
          materialId: input.materialId,
          originId: input.originId,
          destinationZone: input.destinationZone,
          market: input.market ?? null,
          rateType: input.rateType ?? "route_based",
          haulRate: String(input.haulRate),
          materialRate: String(input.materialRate),
          driverPayRate: input.driverPayRate != null ? String(input.driverPayRate) : null,
          materialCostRate: input.materialCostRate != null ? String(input.materialCostRate) : null,
          fuelSurchargePercent: String(input.fuelSurchargePercent),
          minimumLoads: input.minimumLoads ?? null,
          effectiveDate: input.effectiveDate,
          expiresAt: input.expiresAt ?? null,
          notes: input.notes ?? null,
        })
        .returning();

      return rateCard;
    }),

  // -----------------------------------------------------------------------
  // Update rate card
  // -----------------------------------------------------------------------
  update: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateRateCardSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const d = input.data;
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (d.materialId !== undefined) updateData.materialId = d.materialId;
      if (d.originId !== undefined) updateData.originId = d.originId;
      if (d.destinationZone !== undefined) updateData.destinationZone = d.destinationZone;
      if (d.market !== undefined) updateData.market = d.market;
      if (d.rateType !== undefined) updateData.rateType = d.rateType;
      if (d.haulRate !== undefined) updateData.haulRate = String(d.haulRate);
      if (d.materialRate !== undefined) updateData.materialRate = String(d.materialRate);
      if (d.driverPayRate !== undefined) updateData.driverPayRate = d.driverPayRate != null ? String(d.driverPayRate) : null;
      if (d.materialCostRate !== undefined) updateData.materialCostRate = d.materialCostRate != null ? String(d.materialCostRate) : null;
      if (d.fuelSurchargePercent !== undefined) updateData.fuelSurchargePercent = String(d.fuelSurchargePercent);
      if (d.minimumLoads !== undefined) updateData.minimumLoads = d.minimumLoads;
      if (d.effectiveDate !== undefined) updateData.effectiveDate = d.effectiveDate;
      if (d.expiresAt !== undefined) updateData.expiresAt = d.expiresAt;
      if (d.notes !== undefined) updateData.notes = d.notes;

      const [rateCard] = await ctx.db
        .update(schema.rateCards)
        .set(updateData)
        .where(
          and(
            eq(schema.rateCards.id, input.id),
            eq(schema.rateCards.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!rateCard) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Rate card not found",
        });
      }

      return rateCard;
    }),

  // -----------------------------------------------------------------------
  // Delete rate card (soft delete)
  // -----------------------------------------------------------------------
  delete: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [rateCard] = await ctx.db
        .update(schema.rateCards)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.rateCards.id, input.id),
            eq(schema.rateCards.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!rateCard) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Rate card not found",
        });
      }

      return { success: true };
    }),

  // -----------------------------------------------------------------------
  // Find active rate for a specific material + origin + destination zone
  // -----------------------------------------------------------------------
  findRate: entityProcedure
    .input(
      z.object({
        materialId: z.string().uuid(),
        originId: z.string().uuid(),
        destinationZone: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const today = new Date().toISOString().split("T")[0]!;

      const [rateCard] = await ctx.db
        .select()
        .from(schema.rateCards)
        .where(
          and(
            eq(schema.rateCards.entityId, ctx.organizationId!),
            eq(schema.rateCards.isActive, true),
            eq(schema.rateCards.materialId, input.materialId),
            eq(schema.rateCards.originId, input.originId),
            eq(schema.rateCards.destinationZone, input.destinationZone),
            lte(schema.rateCards.effectiveDate, today),
            sql`(${schema.rateCards.expiresAt} IS NULL OR ${schema.rateCards.expiresAt} >= ${today})`,
          ),
        )
        .orderBy(desc(schema.rateCards.effectiveDate))
        .limit(1);

      if (!rateCard) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message:
            "No active rate card found for the given material, origin, and destination zone",
        });
      }

      return rateCard;
    }),
});
