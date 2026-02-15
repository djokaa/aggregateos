import { z } from "zod";
import { eq, and, desc, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";

export const driverRouter = router({
  list: entityProcedure
    .input(z.object({
      status: z.string().optional(),
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(50),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const { status, page, limit } = input;
      const conditions = [eq(schema.drivers.entityId, ctx.organizationId!), eq(schema.drivers.isActive, true)];
      if (status) conditions.push(eq(schema.drivers.status, status));

      const where = and(...conditions);
      const [items, [total]] = await Promise.all([
        ctx.db.select().from(schema.drivers).where(where).orderBy(desc(schema.drivers.createdAt)).limit(limit).offset((page - 1) * limit),
        ctx.db.select({ count: count() }).from(schema.drivers).where(where),
      ]);

      return { items, totalCount: total?.count ?? 0, page, limit, totalPages: Math.ceil((total?.count ?? 0) / limit) };
    }),

  getById: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [driver] = await ctx.db.select().from(schema.drivers)
        .where(and(eq(schema.drivers.id, input.id), eq(schema.drivers.entityId, ctx.organizationId!)))
        .limit(1);
      if (!driver) throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });
      return driver;
    }),

  updateStatus: entityProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(["available", "on_load", "offline"]) }))
    .mutation(async ({ ctx, input }) => {
      const [driver] = await ctx.db.update(schema.drivers).set({ status: input.status })
        .where(and(eq(schema.drivers.id, input.id), eq(schema.drivers.entityId, ctx.organizationId!)))
        .returning();
      if (!driver) throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });
      return driver;
    }),

  create: entityProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      phone: z.string().min(1).max(20),
      email: z.string().email().optional(),
      licenseNumber: z.string().max(50).optional(),
      regions: z.array(z.string()).optional(),
      paymentMethod: z.string().max(50).optional(),
      payRateDefault: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [driver] = await ctx.db.insert(schema.drivers).values({
        entityId: ctx.organizationId!,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        licenseNumber: input.licenseNumber ?? null,
        regions: input.regions ?? [],
        paymentMethod: input.paymentMethod ?? null,
        payRateDefault: input.payRateDefault ?? null,
        status: "available",
      }).returning();
      return driver;
    }),

  update: entityProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        name: z.string().min(1).max(255).optional(),
        phone: z.string().min(1).max(20).optional(),
        email: z.string().email().optional(),
        licenseNumber: z.string().max(50).optional(),
        regions: z.array(z.string()).optional(),
        paymentMethod: z.string().max(50).optional(),
        payRateDefault: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      for (const [key, value] of Object.entries(input.data)) {
        if (value !== undefined) updateData[key] = value;
      }
      const [driver] = await ctx.db.update(schema.drivers).set(updateData)
        .where(and(eq(schema.drivers.id, input.id), eq(schema.drivers.entityId, ctx.organizationId!)))
        .returning();
      if (!driver) throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });
      return driver;
    }),

  available: entityProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.select().from(schema.drivers)
      .where(and(eq(schema.drivers.entityId, ctx.organizationId!), eq(schema.drivers.isActive, true), eq(schema.drivers.status, "available")));
    return items;
  }),
});
