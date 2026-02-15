/**
 * Load router — the atomic unit of work in AggregateOS.
 *
 * Key features:
 * - State machine–validated status transitions
 * - Auto-timestamping on pickup/delivery status changes
 * - Auto-update of order `quantityDelivered` on ticket verification
 * - Full CRUD with entity scoping
 *
 * @module load-router
 */

import { z } from "zod";
import { eq, and, desc, count, gte, sql, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";
import {
  LOAD_STATUSES,
  type LoadStatus,
  isValidTransition,
} from "@aggregateos/shared";

const loadStatusEnum = z.enum(LOAD_STATUSES as unknown as [string, ...string[]]);

export const loadRouter = router({
  /**
   * List loads with filtering and pagination.
   * Joins order → customer/material/location + driver for name resolution.
   */
  list: entityProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          date: z.string().optional(), // YYYY-MM-DD
          driverId: z.string().uuid().optional(),
          customerId: z.string().uuid().optional(),
          orderId: z.string().uuid().optional(),
          exceptionsOnly: z.boolean().optional(),
          search: z.string().optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const {
        status,
        date,
        driverId,
        customerId,
        orderId,
        exceptionsOnly,
        search,
        page,
        limit,
      } = input;

      const conditions = [eq(schema.loads.entityId, ctx.organizationId!)];

      if (status) conditions.push(eq(schema.loads.status, status));
      if (driverId) conditions.push(eq(schema.loads.driverId, driverId));
      if (orderId) conditions.push(eq(schema.loads.orderId, orderId));
      if (date) {
        const dayStart = new Date(date + "T00:00:00Z");
        conditions.push(gte(schema.loads.createdAt, dayStart));
      }
      if (exceptionsOnly) {
        conditions.push(sql`${schema.loads.exceptionType} IS NOT NULL`);
      }
      if (search) {
        conditions.push(
          sql`${schema.loads.loadNumber} ILIKE ${`%${search}%`}`,
        );
      }

      // Build WHERE — optionally filter by customer via order join
      let baseQuery = ctx.db
        .select({
          load: schema.loads,
          driverName: schema.drivers.name,
          customerName: schema.customers.name,
          materialName: schema.materials.name,
          originName: schema.locations.name,
          orderNumber: schema.orders.orderNumber,
        })
        .from(schema.loads)
        .leftJoin(schema.drivers, eq(schema.loads.driverId, schema.drivers.id))
        .innerJoin(schema.orders, eq(schema.loads.orderId, schema.orders.id))
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
        );

      if (customerId) {
        conditions.push(eq(schema.orders.customerId, customerId));
      }

      const where = and(...conditions);

      const items = await baseQuery
        .where(where)
        .orderBy(desc(schema.loads.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const [total] = await ctx.db
        .select({ count: count() })
        .from(schema.loads)
        .innerJoin(schema.orders, eq(schema.loads.orderId, schema.orders.id))
        .where(where);

      // Flatten into a nicer shape
      const flatItems = items.map((row) => ({
        ...row.load,
        driverName: row.driverName,
        customerName: row.customerName,
        materialName: row.materialName,
        originName: row.originName,
        orderNumber: row.orderNumber,
      }));

      return {
        items: flatItems,
        totalCount: total?.count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((total?.count ?? 0) / limit),
      };
    }),

  /**
   * Get a single load by ID with associated ticket, order details, and driver info.
   */
  getById: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [load] = await ctx.db
        .select()
        .from(schema.loads)
        .where(
          and(
            eq(schema.loads.id, input.id),
            eq(schema.loads.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);
      if (!load)
        throw new TRPCError({ code: "NOT_FOUND", message: "Load not found" });

      // Fetch related objects in parallel
      const [ticketResults, orderResults, driverResults] = await Promise.all([
        ctx.db
          .select()
          .from(schema.tickets)
          .where(eq(schema.tickets.loadId, input.id))
          .orderBy(desc(schema.tickets.createdAt))
          .limit(1),
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
          .where(eq(schema.orders.id, load.orderId))
          .limit(1),
        load.driverId
          ? ctx.db
              .select()
              .from(schema.drivers)
              .where(eq(schema.drivers.id, load.driverId))
              .limit(1)
          : Promise.resolve([]),
      ]);

      const orderRow = orderResults[0];

      return {
        ...load,
        ticket: ticketResults[0] ?? null,
        order: orderRow
          ? {
              ...orderRow.order,
              customerName: orderRow.customerName,
              materialName: orderRow.materialName,
              originName: orderRow.originName,
            }
          : null,
        driver: driverResults[0] ?? null,
      };
    }),

  /**
   * Update load status with state machine validation.
   *
   * Enforces LOAD_TRANSITIONS rules, auto-sets pickup/delivery timestamps,
   * and auto-updates order `quantityDelivered` when reaching `ticket_verified`.
   */
  updateStatus: entityProcedure
    .input(z.object({ id: z.string().uuid(), status: loadStatusEnum }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch current load
      const [currentLoad] = await ctx.db
        .select()
        .from(schema.loads)
        .where(
          and(
            eq(schema.loads.id, input.id),
            eq(schema.loads.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!currentLoad) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Load not found" });
      }

      // 2. Validate state transition
      const fromStatus = currentLoad.status as LoadStatus;
      const toStatus = input.status as LoadStatus;

      if (!isValidTransition(fromStatus, toStatus)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Invalid status transition: ${fromStatus} → ${toStatus}`,
        });
      }

      // 3. Build update payload
      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };

      // Auto-set pickup timestamp
      if (toStatus === "at_pickup" && !currentLoad.actualPickupTime) {
        updateData.actualPickupTime = new Date();
      }

      // Auto-set delivery timestamp
      if (toStatus === "delivered" && !currentLoad.actualDeliveryTime) {
        updateData.actualDeliveryTime = new Date();
      }

      // 4. Execute update
      const [updatedLoad] = await ctx.db
        .update(schema.loads)
        .set(updateData)
        .where(eq(schema.loads.id, input.id))
        .returning();

      if (!updatedLoad) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update load",
        });
      }

      // 5. Side effects on ticket_verified — lock billable tons + update order qty
      if (toStatus === "ticket_verified" && updatedLoad.billableTons) {
        const tons = parseFloat(updatedLoad.billableTons);
        if (tons > 0) {
          await ctx.db
            .update(schema.orders)
            .set({
              quantityDelivered: sql`CAST(COALESCE(CAST(${schema.orders.quantityDelivered} AS NUMERIC), 0) + ${tons} AS VARCHAR)`,
              updatedAt: new Date(),
            })
            .where(eq(schema.orders.id, updatedLoad.orderId));
        }
      }

      return updatedLoad;
    }),

  /**
   * Assign a driver (and optionally vehicle) to a load.
   * Transitions load to "assigned" status and marks driver as "on_load".
   */
  assignDriver: entityProcedure
    .input(
      z.object({
        loadId: z.string().uuid(),
        driverId: z.string().uuid(),
        vehicleId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [load] = await ctx.db
        .update(schema.loads)
        .set({
          driverId: input.driverId,
          vehicleId: input.vehicleId ?? null,
          status: "assigned",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.loads.id, input.loadId),
            eq(schema.loads.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!load) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Load not found" });
      }

      // Mark driver as on_load
      await ctx.db
        .update(schema.drivers)
        .set({ status: "on_load" })
        .where(eq(schema.drivers.id, input.driverId));

      return load;
    }),

  /**
   * Get today's operational stats for the dispatch board.
   */
  todayStats: entityProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const conditions = [
      eq(schema.loads.entityId, ctx.organizationId!),
      gte(schema.loads.createdAt, startOfDay),
    ];

    const [totalResult] = await ctx.db
      .select({ count: count() })
      .from(schema.loads)
      .where(and(...conditions));
    const [deliveredResult] = await ctx.db
      .select({ count: count() })
      .from(schema.loads)
      .where(and(...conditions, eq(schema.loads.status, "delivered")));
    const [activeResult] = await ctx.db
      .select({ count: count() })
      .from(schema.loads)
      .where(
        and(
          eq(schema.loads.entityId, ctx.organizationId!),
          sql`${schema.loads.status} IN ('assigned', 'dispatched', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'at_delivery')`,
        ),
      );
    const [exceptionsResult] = await ctx.db
      .select({ count: count() })
      .from(schema.loads)
      .where(
        and(
          eq(schema.loads.entityId, ctx.organizationId!),
          sql`${schema.loads.exceptionType} IS NOT NULL`,
        ),
      );

    return {
      totalToday: totalResult?.count ?? 0,
      deliveredToday: deliveredResult?.count ?? 0,
      activeNow: activeResult?.count ?? 0,
      exceptions: exceptionsResult?.count ?? 0,
    };
  }),
});
