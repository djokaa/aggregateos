/**
 * Dispatch router — creates dispatch events and manages driver eligibility.
 *
 * A dispatch converts an approved order into one or many loads,
 * assigned to eligible drivers with pricing from rate cards.
 *
 * Key procedures:
 * - `create` — batch-create loads from an order with driver assignments
 * - `eligibleDrivers` — filter drivers by capability, availability, region
 * - `reassign` — handle driver decline → reassign to next eligible
 *
 * @module dispatch-router
 */

import { z } from "zod";
import { eq, and, desc, count, sql, ne, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";

export const dispatchRouter = router({
  /**
   * Create a dispatch event — batch-creates loads for an order.
   *
   * 1. Validates order exists and is active
   * 2. Creates a Dispatch record
   * 3. Creates N loads linked to that dispatch with pricing
   * 4. Optionally assigns drivers to each load
   */
  create: entityProcedure
    .input(
      z.object({
        orderId: z.string().uuid(),
        loadCount: z.number().int().positive().max(50),
        /** Optional per-load driver assignments (index-matched to loadCount) */
        driverAssignments: z
          .array(
            z.object({
              driverId: z.string().uuid(),
              vehicleId: z.string().uuid().optional(),
            }),
          )
          .optional(),
        /** Time window for pickup */
        scheduledPickupStart: z.string().datetime().optional(),
        /** Invoice rate override (per ton) */
        invoiceRatePerTon: z.string().optional(),
        /** Driver pay rate override */
        driverPayRate: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;

      // 1. Fetch order with related info
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

      if (order.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order must be active to dispatch",
        });
      }

      // 2. Create Dispatch record
      const [dispatch] = await ctx.db
        .insert(schema.dispatches)
        .values({
          entityId,
          orderId: input.orderId,
          dispatchedBy: ctx.userId,
          loadCount: input.loadCount,
          notes: input.notes,
        })
        .returning();

      if (!dispatch) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create dispatch",
        });
      }

      // 3. Generate sequential load numbers
      const [loadCountResult] = await ctx.db
        .select({ count: count() })
        .from(schema.loads)
        .where(eq(schema.loads.entityId, entityId));
      const baseCount = loadCountResult?.count ?? 0;

      // 4. Create loads
      const createdLoads = [];
      for (let i = 0; i < input.loadCount; i++) {
        const loadNumber = `LD-${String(baseCount + i + 1).padStart(6, "0")}`;
        const assignment = input.driverAssignments?.[i];
        const hasDriver = !!assignment;

        const scheduledPickup = input.scheduledPickupStart
          ? new Date(
              new Date(input.scheduledPickupStart).getTime() + i * 60 * 60_000,
            ) // stagger by 1 hour
          : null;

        const [load] = await ctx.db
          .insert(schema.loads)
          .values({
            entityId,
            orderId: input.orderId,
            dispatchId: dispatch.id,
            driverId: assignment?.driverId ?? null,
            vehicleId: assignment?.vehicleId ?? null,
            loadNumber,
            status: hasDriver ? "assigned" : "ordered",
            scheduledPickupTime: scheduledPickup,
            invoiceRatePerTon: input.invoiceRatePerTon ?? null,
            driverPayRate: input.driverPayRate ?? null,
          })
          .returning();

        if (load) createdLoads.push(load);

        // Mark assigned driver as on_load
        if (assignment?.driverId) {
          await ctx.db
            .update(schema.drivers)
            .set({ status: "on_load" })
            .where(eq(schema.drivers.id, assignment.driverId));
        }
      }

      return { dispatch, loads: createdLoads };
    }),

  /**
   * Get eligible drivers for a dispatch based on material requirements,
   * region, and availability.
   *
   * Filters by:
   * - Active status
   * - Vehicle capability flags (asphalt_ok, concrete_ok, etc.)
   * - Not currently on a load (status != 'on_load')
   * - Region match (if driver has regions set)
   */
  eligibleDrivers: entityProcedure
    .input(
      z.object({
        /** Material ID to check capability requirements */
        materialId: z.string().uuid().optional(),
        /** Region to filter by */
        region: z.string().optional(),
        /** Exclude these driver IDs (already assigned) */
        excludeDriverIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;

      // 1. If materialId provided, check if it requires special capabilities
      let requiresAsphalt = false;
      let requiresConcrete = false;

      if (input.materialId) {
        const [material] = await ctx.db
          .select()
          .from(schema.materials)
          .where(eq(schema.materials.id, input.materialId))
          .limit(1);

        if (material) {
          // Asphalt materials need trucks with asphalt_ok = true
          if (
            material.type === "asphalt" ||
            material.linedBedRequired === true
          ) {
            requiresAsphalt = true;
          }
          if (material.type === "concrete") {
            requiresConcrete = true;
          }
        }
      }

      // 2. Query drivers with their vehicles
      const driverConditions = [
        eq(schema.drivers.entityId, entityId),
        eq(schema.drivers.isActive, true),
        ne(schema.drivers.status, "on_load"),
      ];

      if (input.excludeDriverIds && input.excludeDriverIds.length > 0) {
        driverConditions.push(
          sql`${schema.drivers.id} NOT IN (${sql.join(
            input.excludeDriverIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})`,
        );
      }

      const rows = await ctx.db
        .select({
          driver: schema.drivers,
          vehicle: schema.vehicles,
        })
        .from(schema.drivers)
        .leftJoin(
          schema.vehicles,
          eq(schema.drivers.vehicleId, schema.vehicles.id),
        )
        .where(and(...driverConditions))
        .orderBy(desc(schema.drivers.reliabilityScore));

      // 3. Filter by vehicle capabilities
      const eligible = rows.filter((row) => {
        const v = row.vehicle;
        if (requiresAsphalt && (!v || !v.asphaltOk)) return false;
        if (requiresConcrete && (!v || !v.concreteOk)) return false;

        // Region filter
        if (input.region && row.driver.regions) {
          const driverRegions = row.driver.regions as string[];
          if (
            driverRegions.length > 0 &&
            !driverRegions.some((r) =>
              r.toLowerCase().includes(input.region!.toLowerCase()),
            )
          ) {
            return false;
          }
        }

        return true;
      });

      return eligible.map((row) => ({
        ...row.driver,
        vehicle: row.vehicle,
      }));
    }),

  /**
   * Reassign a load from one driver to another.
   * Frees the original driver and assigns the new one.
   */
  reassign: entityProcedure
    .input(
      z.object({
        loadId: z.string().uuid(),
        newDriverId: z.string().uuid(),
        newVehicleId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;

      // 1. Get current load
      const [load] = await ctx.db
        .select()
        .from(schema.loads)
        .where(
          and(
            eq(schema.loads.id, input.loadId),
            eq(schema.loads.entityId, entityId),
          ),
        )
        .limit(1);

      if (!load) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Load not found" });
      }

      // 2. Free old driver if exists
      if (load.driverId) {
        // Check if this driver has other active loads
        const [otherLoads] = await ctx.db
          .select({ count: count() })
          .from(schema.loads)
          .where(
            and(
              eq(schema.loads.driverId, load.driverId),
              ne(schema.loads.id, input.loadId),
              sql`${schema.loads.status} IN ('assigned', 'dispatched', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'at_delivery')`,
            ),
          );

        if ((otherLoads?.count ?? 0) === 0) {
          await ctx.db
            .update(schema.drivers)
            .set({ status: "available" })
            .where(eq(schema.drivers.id, load.driverId));
        }
      }

      // 3. Assign new driver
      const [updatedLoad] = await ctx.db
        .update(schema.loads)
        .set({
          driverId: input.newDriverId,
          vehicleId: input.newVehicleId ?? null,
          status: "assigned",
          updatedAt: new Date(),
        })
        .where(eq(schema.loads.id, input.loadId))
        .returning();

      // 4. Mark new driver as on_load
      await ctx.db
        .update(schema.drivers)
        .set({ status: "on_load" })
        .where(eq(schema.drivers.id, input.newDriverId));

      return updatedLoad;
    }),

  /**
   * List recent dispatches with summary info.
   */
  list: entityProcedure
    .input(
      z
        .object({
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(50).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;
      const { page, limit } = input;

      const items = await ctx.db
        .select({
          dispatch: schema.dispatches,
          orderNumber: schema.orders.orderNumber,
          customerName: schema.customers.name,
        })
        .from(schema.dispatches)
        .innerJoin(
          schema.orders,
          eq(schema.dispatches.orderId, schema.orders.id),
        )
        .leftJoin(
          schema.customers,
          eq(schema.orders.customerId, schema.customers.id),
        )
        .where(eq(schema.dispatches.entityId, entityId))
        .orderBy(desc(schema.dispatches.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const [total] = await ctx.db
        .select({ count: count() })
        .from(schema.dispatches)
        .where(eq(schema.dispatches.entityId, entityId));

      return {
        items: items.map((row) => ({
          ...row.dispatch,
          orderNumber: row.orderNumber,
          customerName: row.customerName,
        })),
        totalCount: total?.count ?? 0,
        page,
        limit,
      };
    }),
});
