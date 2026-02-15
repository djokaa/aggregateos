/**
 * Order router — customer request intake and lifecycle management.
 *
 * Supports:
 * - Direct order creation (not just from estimates)
 * - Multiple order types (material_haul, haul_only, hourly, contract)
 * - Project linkage
 * - Automatic quantity tracking from load completions
 *
 * @module order-router
 */

import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";

const orderStatusEnum = z.enum(["active", "completed", "cancelled"]);
const orderTypeEnum = z.enum([
  "material_haul",
  "haul_only",
  "hourly",
  "contract",
]);

async function generateOrderNumber(
  db: any,
  entityId: string,
): Promise<string> {
  const [result] = await db
    .select({ count: count() })
    .from(schema.orders)
    .where(eq(schema.orders.entityId, entityId));
  const next = (result?.count ?? 0) + 1;
  return `ORD-${String(next).padStart(6, "0")}`;
}

export const orderRouter = router({
  list: entityProcedure
    .input(
      z
        .object({
          status: z.enum(["active", "completed", "cancelled"]).optional(),
          customerId: z.string().uuid().optional(),
          projectId: z.string().uuid().optional(),
          orderType: orderTypeEnum.optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { status, customerId, projectId, orderType, page, limit } = input;

      const conditions = [eq(schema.orders.entityId, ctx.organizationId!)];

      if (status) conditions.push(eq(schema.orders.status, status));
      if (customerId) conditions.push(eq(schema.orders.customerId, customerId));
      if (projectId) conditions.push(eq(schema.orders.projectId, projectId));
      if (orderType) conditions.push(eq(schema.orders.orderType, orderType));

      const where = and(...conditions);

      const [items, [total]] = await Promise.all([
        ctx.db
          .select({
            order: schema.orders,
            customerName: schema.customers.name,
            materialName: schema.materials.name,
            originName: schema.locations.name,
          })
          .from(schema.orders)
          .leftJoin(
            schema.customers,
            eq(schema.orders.customerId, schema.customers.id),
          )
          .leftJoin(
            schema.materials,
            eq(schema.orders.materialId, schema.materials.id),
          )
          .leftJoin(
            schema.locations,
            eq(schema.orders.originId, schema.locations.id),
          )
          .where(where)
          .orderBy(desc(schema.orders.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        ctx.db.select({ count: count() }).from(schema.orders).where(where),
      ]);

      return {
        items: items.map((row) => ({
          ...row.order,
          customerName: row.customerName,
          materialName: row.materialName,
          originName: row.originName,
        })),
        totalCount: total?.count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((total?.count ?? 0) / limit),
      };
    }),

  getById: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .select()
        .from(schema.orders)
        .where(
          and(
            eq(schema.orders.id, input.id),
            eq(schema.orders.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // Fetch related names
      const [customer] = await ctx.db
        .select({ name: schema.customers.name })
        .from(schema.customers)
        .where(eq(schema.customers.id, order.customerId))
        .limit(1);

      const [material] = await ctx.db
        .select({ name: schema.materials.name })
        .from(schema.materials)
        .where(eq(schema.materials.id, order.materialId))
        .limit(1);

      // Count associated loads
      const [loadStats] = await ctx.db
        .select({
          totalLoads: count(),
          deliveredLoads: sql<number>`COUNT(*) FILTER (WHERE ${schema.loads.status} IN ('delivered', 'ticket_uploaded', 'ticket_verified', 'billable', 'invoiced', 'paid'))`,
        })
        .from(schema.loads)
        .where(eq(schema.loads.orderId, input.id));

      return {
        ...order,
        customerName: customer?.name ?? null,
        materialName: material?.name ?? null,
        totalLoads: loadStats?.totalLoads ?? 0,
        deliveredLoads: Number(loadStats?.deliveredLoads ?? 0),
      };
    }),

  /**
   * Direct order creation — no estimate required.
   * Supports all order types with project linkage.
   */
  create: entityProcedure
    .input(
      z.object({
        customerId: z.string().uuid(),
        projectId: z.string().uuid().optional(),
        orderType: orderTypeEnum.default("material_haul"),
        materialId: z.string().uuid(),
        originId: z.string().uuid(),
        destinationId: z.string().uuid(),
        quantityOrdered: z.string(),
        scheduledDate: z.string().optional(),
        billingTerms: z.string().optional(),
        specialConstraints: z.string().optional(),
        requiresEstimate: z.boolean().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;
      const orderNumber = await generateOrderNumber(ctx.db, entityId);

      const [order] = await ctx.db
        .insert(schema.orders)
        .values({
          entityId,
          customerId: input.customerId,
          projectId: input.projectId ?? null,
          orderNumber,
          orderType: input.orderType,
          materialId: input.materialId,
          originId: input.originId,
          destinationId: input.destinationId,
          quantityOrdered: input.quantityOrdered,
          status: "active",
          scheduledDate: input.scheduledDate ?? null,
          billingTerms: input.billingTerms ?? null,
          specialConstraints: input.specialConstraints ?? null,
          requiresEstimate: input.requiresEstimate ?? false,
          notes: input.notes ?? null,
        })
        .returning();

      if (!order) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create order",
        });
      }

      return order;
    }),

  /**
   * Create orders from an approved estimate (one order per line item).
   */
  createFromEstimate: entityProcedure
    .input(z.object({ estimateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;

      const [estimate] = await ctx.db
        .select()
        .from(schema.estimates)
        .where(
          and(
            eq(schema.estimates.id, input.estimateId),
            eq(schema.estimates.entityId, entityId),
          ),
        )
        .limit(1);

      if (!estimate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Estimate not found" });
      }

      if (estimate.status !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Estimate must be approved to create orders",
        });
      }

      const lineItems = await ctx.db
        .select()
        .from(schema.estimateLineItems)
        .where(eq(schema.estimateLineItems.estimateId, input.estimateId));

      if (lineItems.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Estimate has no line items",
        });
      }

      const [orderCountResult] = await ctx.db
        .select({ count: count() })
        .from(schema.orders)
        .where(eq(schema.orders.entityId, entityId));

      const baseCount = orderCountResult?.count ?? 0;
      const createdOrders = [];

      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i]!;
        const orderNumber = `ORD-${String(baseCount + i + 1).padStart(6, "0")}`;

        const [order] = await ctx.db
          .insert(schema.orders)
          .values({
            entityId,
            estimateId: input.estimateId,
            customerId: estimate.customerId,
            orderNumber,
            orderType: "material_haul",
            materialId: item.materialId,
            originId: item.originId,
            destinationId: item.destinationId,
            quantityOrdered: item.quantity,
            status: "active",
          })
          .returning();

        if (order) createdOrders.push(order);
      }

      return createdOrders;
    }),

  /**
   * Create loads for an order (convenience procedure, delegates to dispatch.create if full dispatch is needed).
   */
  createLoads: entityProcedure
    .input(z.object({ orderId: z.string().uuid(), count: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;

      const [order] = await ctx.db
        .select()
        .from(schema.orders)
        .where(
          and(eq(schema.orders.id, input.orderId), eq(schema.orders.entityId, entityId)),
        )
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const [loadCountResult] = await ctx.db
        .select({ count: count() })
        .from(schema.loads)
        .where(eq(schema.loads.entityId, entityId));

      const baseCount = loadCountResult?.count ?? 0;
      const createdLoads = [];

      for (let i = 0; i < input.count; i++) {
        const loadNumber = `LD-${String(baseCount + i + 1).padStart(6, "0")}`;

        const [load] = await ctx.db
          .insert(schema.loads)
          .values({
            entityId,
            orderId: input.orderId,
            loadNumber,
            status: "ordered",
          })
          .returning();

        if (load) createdLoads.push(load);
      }

      return createdLoads;
    }),

  updateStatus: entityProcedure
    .input(z.object({ id: z.string().uuid(), status: orderStatusEnum }))
    .mutation(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .update(schema.orders)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(schema.orders.id, input.id),
            eq(schema.orders.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      return order;
    }),
});
