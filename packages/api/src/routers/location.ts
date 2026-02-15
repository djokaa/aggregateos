import { z } from "zod";
import { eq, and, like, sql, desc, count } from "drizzle-orm";
import * as schema from "@aggregateos/db";
import {
  createLocationSchema,
  updateLocationSchema,
} from "@aggregateos/shared";
import { router, entityProcedure } from "../trpc";

export const locationRouter = router({
  // -----------------------------------------------------------------------
  // List locations (paginated, searchable, filterable by type)
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

      const conditions = [
        eq(schema.locations.entityId, ctx.organizationId!),
        eq(schema.locations.isActive, true),
      ];

      if (search) {
        conditions.push(
          sql`(${schema.locations.name} ILIKE ${"%" + search + "%"} OR ${schema.locations.address} ILIKE ${"%" + search + "%"})`,
        );
      }

      if (type) {
        conditions.push(eq(schema.locations.type, type));
      }

      const where = and(...conditions);

      const [items, [total]] = await Promise.all([
        ctx.db
          .select()
          .from(schema.locations)
          .where(where)
          .orderBy(desc(schema.locations.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        ctx.db
          .select({ count: count() })
          .from(schema.locations)
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
  // Get location by ID
  // -----------------------------------------------------------------------
  getById: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [location] = await ctx.db
        .select()
        .from(schema.locations)
        .where(
          and(
            eq(schema.locations.id, input.id),
            eq(schema.locations.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!location) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Location not found",
        });
      }

      return location;
    }),

  // -----------------------------------------------------------------------
  // Create location
  // -----------------------------------------------------------------------
  create: entityProcedure
    .input(createLocationSchema)
    .mutation(async ({ ctx, input }) => {
      const [location] = await ctx.db
        .insert(schema.locations)
        .values({
          ...input,
          entityId: ctx.organizationId!,
        })
        .returning();

      return location;
    }),

  // -----------------------------------------------------------------------
  // Update location
  // -----------------------------------------------------------------------
  update: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateLocationSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [location] = await ctx.db
        .update(schema.locations)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.locations.id, input.id),
            eq(schema.locations.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!location) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Location not found",
        });
      }

      return location;
    }),

  // -----------------------------------------------------------------------
  // Delete location (soft delete)
  // -----------------------------------------------------------------------
  delete: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [location] = await ctx.db
        .update(schema.locations)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.locations.id, input.id),
            eq(schema.locations.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!location) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Location not found",
        });
      }

      return { success: true };
    }),
});
