/**
 * Project router — long-running job umbrella management.
 *
 * @module project-router
 */

import { z } from "zod";
import { eq, and, desc, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";

export const projectRouter = router({
  list: entityProcedure
    .input(
      z
        .object({
          customerId: z.string().uuid().optional(),
          status: z.string().optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { customerId, status, page, limit } = input;
      const conditions = [eq(schema.projects.entityId, ctx.organizationId!)];

      if (customerId)
        conditions.push(eq(schema.projects.customerId, customerId));
      if (status) conditions.push(eq(schema.projects.status, status));

      const where = and(...conditions);

      const [items, [total]] = await Promise.all([
        ctx.db
          .select({
            project: schema.projects,
            customerName: schema.customers.name,
          })
          .from(schema.projects)
          .leftJoin(
            schema.customers,
            eq(schema.projects.customerId, schema.customers.id),
          )
          .where(where)
          .orderBy(desc(schema.projects.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        ctx.db.select({ count: count() }).from(schema.projects).where(where),
      ]);

      return {
        items: items.map((row) => ({
          ...row.project,
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
      const [project] = await ctx.db
        .select()
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.id, input.id),
            eq(schema.projects.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return project;
    }),

  create: entityProcedure
    .input(
      z.object({
        customerId: z.string().uuid(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .insert(schema.projects)
        .values({
          entityId: ctx.organizationId!,
          customerId: input.customerId,
          name: input.name,
          description: input.description ?? null,
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          notes: input.notes ?? null,
          status: "active",
        })
        .returning();

      return project;
    }),

  update: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(["active", "completed", "on_hold", "cancelled"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.startDate !== undefined) updateData.startDate = data.startDate;
      if (data.endDate !== undefined) updateData.endDate = data.endDate;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const [project] = await ctx.db
        .update(schema.projects)
        .set(updateData)
        .where(
          and(
            eq(schema.projects.id, id),
            eq(schema.projects.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return project;
    }),
});
