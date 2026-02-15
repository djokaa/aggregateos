import { z } from "zod";
import { eq, and, desc, count } from "drizzle-orm";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";

const createMaterialSchema = z.object({
  name: z.string().min(1, "Material name is required").max(255),
  type: z.enum(["rock", "sand", "fill", "concrete", "gravel", "asphalt", "other"]),
  unit: z.enum(["ton", "cy", "load"]),
  description: z.string().max(2000).optional(),
});

const updateMaterialSchema = createMaterialSchema.partial();

export const materialRouter = router({
  // -----------------------------------------------------------------------
  // List materials (paginated, optional type filter)
  // -----------------------------------------------------------------------
  list: entityProcedure
    .input(
      z
        .object({
          type: z.string().optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(50),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { type, page, limit } = input;

      const conditions = [
        eq(schema.materials.entityId, ctx.organizationId!),
        eq(schema.materials.isActive, true),
      ];

      if (type) {
        conditions.push(eq(schema.materials.type, type));
      }

      const where = and(...conditions);

      const [items, [total]] = await Promise.all([
        ctx.db
          .select()
          .from(schema.materials)
          .where(where)
          .orderBy(desc(schema.materials.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        ctx.db
          .select({ count: count() })
          .from(schema.materials)
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
  // Get material by ID
  // -----------------------------------------------------------------------
  getById: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [material] = await ctx.db
        .select()
        .from(schema.materials)
        .where(
          and(
            eq(schema.materials.id, input.id),
            eq(schema.materials.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!material) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Material not found",
        });
      }

      return material;
    }),

  // -----------------------------------------------------------------------
  // Create material
  // -----------------------------------------------------------------------
  create: entityProcedure
    .input(createMaterialSchema)
    .mutation(async ({ ctx, input }) => {
      const [material] = await ctx.db
        .insert(schema.materials)
        .values({
          ...input,
          entityId: ctx.organizationId!,
        })
        .returning();

      return material;
    }),

  // -----------------------------------------------------------------------
  // Update material
  // -----------------------------------------------------------------------
  update: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateMaterialSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [material] = await ctx.db
        .update(schema.materials)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.materials.id, input.id),
            eq(schema.materials.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!material) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Material not found",
        });
      }

      return material;
    }),

  // -----------------------------------------------------------------------
  // Delete material (soft delete)
  // -----------------------------------------------------------------------
  delete: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [material] = await ctx.db
        .update(schema.materials)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.materials.id, input.id),
            eq(schema.materials.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!material) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Material not found",
        });
      }

      return { success: true };
    }),
});
