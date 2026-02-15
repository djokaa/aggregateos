import { eq, and, sql, count, gte, desc } from "drizzle-orm";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";

export const dashboardRouter = router({
  // -----------------------------------------------------------------------
  // Dashboard aggregate stats
  // -----------------------------------------------------------------------
  stats: entityProcedure.query(async ({ ctx }) => {
    const entityId = ctx.organizationId!;
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Total active customers
    const [customersResult] = await ctx.db
      .select({ count: count() })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.entityId, entityId),
          eq(schema.customers.isActive, true),
        ),
      );

    // Total loads today
    let totalLoadsToday = 0;
    try {
      const [loadsResult] = await ctx.db
        .select({ count: count() })
        .from(schema.loads)
        .where(
          and(
            eq(schema.loads.entityId, entityId),
            gte(schema.loads.createdAt, startOfDay),
          ),
        );
      totalLoadsToday = loadsResult?.count ?? 0;
    } catch {
      totalLoadsToday = 0;
    }

    // Total revenue this month (sum of paid invoices)
    let totalRevenueThisMonth = 0;
    try {
      const [revenueResult] = await ctx.db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${schema.invoices.total} AS NUMERIC)), 0)`,
        })
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.entityId, entityId),
            eq(schema.invoices.status, "paid"),
            gte(schema.invoices.createdAt, startOfMonth),
          ),
        );
      totalRevenueThisMonth = Number(revenueResult?.total ?? 0);
    } catch {
      totalRevenueThisMonth = 0;
    }

    // Active drivers
    let activeDrivers = 0;
    try {
      const [driversResult] = await ctx.db
        .select({ count: count() })
        .from(schema.drivers)
        .where(
          and(
            eq(schema.drivers.entityId, entityId),
            eq(schema.drivers.isActive, true),
          ),
        );
      activeDrivers = driversResult?.count ?? 0;
    } catch {
      activeDrivers = 0;
    }

    // Pending tickets (loads with status ticket_uploaded)
    let pendingTickets = 0;
    try {
      const [ticketsResult] = await ctx.db
        .select({ count: count() })
        .from(schema.loads)
        .where(
          and(
            eq(schema.loads.entityId, entityId),
            eq(schema.loads.status, "ticket_uploaded"),
          ),
        );
      pendingTickets = ticketsResult?.count ?? 0;
    } catch {
      pendingTickets = 0;
    }

    // Pending estimates
    const [estimatesResult] = await ctx.db
      .select({ count: count() })
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.entityId, entityId),
          eq(schema.estimates.status, "sent"),
        ),
      );

    return {
      totalCustomers: customersResult?.count ?? 0,
      totalLoadsToday,
      totalRevenueThisMonth,
      activeDrivers,
      pendingTickets,
      pendingEstimates: estimatesResult?.count ?? 0,
    };
  }),

  // -----------------------------------------------------------------------
  // Weekly load volume – loads per day for the last 7 days
  // -----------------------------------------------------------------------
  weeklyLoads: entityProcedure.query(async ({ ctx }) => {
    const entityId = ctx.organizationId!;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const rows = await ctx.db
      .select({
        day: sql<string>`TO_CHAR(${schema.loads.createdAt}, 'Dy')`,
        dayDate: sql<string>`DATE(${schema.loads.createdAt})`,
        total: count(),
        delivered: sql<number>`COUNT(*) FILTER (WHERE ${schema.loads.status} IN ('delivered','ticket_uploaded','ticket_verified','billable','invoiced','paid'))`,
      })
      .from(schema.loads)
      .where(
        and(
          eq(schema.loads.entityId, entityId),
          gte(schema.loads.createdAt, sevenDaysAgo),
        ),
      )
      .groupBy(
        sql`DATE(${schema.loads.createdAt})`,
        sql`TO_CHAR(${schema.loads.createdAt}, 'Dy')`,
      )
      .orderBy(sql`DATE(${schema.loads.createdAt})`);

    // Build a full 7-day array (fill gaps with zeroes)
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result: { day: string; loads: number; delivered: number }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = dayNames[d.getDay()];
      const match = rows.find((r) => r.dayDate === dateStr);
      result.push({
        day: dayName,
        loads: match?.total ?? 0,
        delivered: Number(match?.delivered ?? 0),
      });
    }

    return result;
  }),

  // -----------------------------------------------------------------------
  // Material distribution – load count per material across orders
  // -----------------------------------------------------------------------
  materialDistribution: entityProcedure.query(async ({ ctx }) => {
    const entityId = ctx.organizationId!;

    const rows = await ctx.db
      .select({
        name: schema.materials.name,
        value: count(),
      })
      .from(schema.orders)
      .innerJoin(
        schema.materials,
        eq(schema.orders.materialId, schema.materials.id),
      )
      .innerJoin(schema.loads, eq(schema.loads.orderId, schema.orders.id))
      .where(eq(schema.orders.entityId, entityId))
      .groupBy(schema.materials.name)
      .orderBy(desc(count()));

    // Calculate percentages
    const total = rows.reduce((sum, r) => sum + r.value, 0) || 1;
    const colors = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#f97316", "#ec4899", "#06b6d4", "#84cc16"];

    return rows.map((r, i) => ({
      name: r.name,
      value: Math.round((r.value / total) * 100),
      color: colors[i % colors.length],
    }));
  }),

  // -----------------------------------------------------------------------
  // Recent activity – last 10 loads with status/timestamp info
  // -----------------------------------------------------------------------
  recentActivity: entityProcedure.query(async ({ ctx }) => {
    const entityId = ctx.organizationId!;

    const recentLoads = await ctx.db
      .select({
        id: schema.loads.id,
        loadNumber: schema.loads.loadNumber,
        status: schema.loads.status,
        updatedAt: schema.loads.updatedAt,
        driverName: schema.drivers.name,
        materialName: schema.materials.name,
        destinationName: schema.locations.name,
      })
      .from(schema.loads)
      .innerJoin(schema.orders, eq(schema.loads.orderId, schema.orders.id))
      .leftJoin(schema.drivers, eq(schema.loads.driverId, schema.drivers.id))
      .leftJoin(
        schema.materials,
        eq(schema.orders.materialId, schema.materials.id),
      )
      .leftJoin(
        schema.locations,
        eq(schema.orders.destinationId, schema.locations.id),
      )
      .where(eq(schema.loads.entityId, entityId))
      .orderBy(desc(schema.loads.updatedAt))
      .limit(10);

    return recentLoads;
  }),

  // -----------------------------------------------------------------------
  // Top customers by total invoice amount
  // -----------------------------------------------------------------------
  topCustomers: entityProcedure.query(async ({ ctx }) => {
    const entityId = ctx.organizationId!;

    const rows = await ctx.db
      .select({
        name: schema.customers.name,
        revenue: sql<number>`COALESCE(SUM(CAST(${schema.invoices.total} AS NUMERIC)), 0)`,
      })
      .from(schema.invoices)
      .innerJoin(
        schema.customers,
        eq(schema.invoices.customerId, schema.customers.id),
      )
      .where(eq(schema.invoices.entityId, entityId))
      .groupBy(schema.customers.name)
      .orderBy(desc(sql`SUM(CAST(${schema.invoices.total} AS NUMERIC))`))
      .limit(8);

    return rows.map((r) => ({
      name: r.name,
      revenue: Number(r.revenue),
    }));
  }),

  // -----------------------------------------------------------------------
  // AR Aging – outstanding invoice amounts by aging bucket per customer
  // -----------------------------------------------------------------------
  arAging: entityProcedure.query(async ({ ctx }) => {
    const entityId = ctx.organizationId!;

    const rows = await ctx.db
      .select({
        customer: schema.customers.name,
        total: sql<number>`CAST(${schema.invoices.total} AS NUMERIC)`,
        dueDate: schema.invoices.dueDate,
        status: schema.invoices.status,
      })
      .from(schema.invoices)
      .innerJoin(
        schema.customers,
        eq(schema.invoices.customerId, schema.customers.id),
      )
      .where(
        and(
          eq(schema.invoices.entityId, entityId),
          sql`${schema.invoices.status} NOT IN ('paid', 'void')`,
        ),
      );

    // Bucket invoices by customer and aging period
    const today = new Date();
    const bucketMap = new Map<
      string,
      { current: number; days30: number; days60: number; days90: number; days90plus: number }
    >();

    for (const inv of rows) {
      const due = new Date(inv.dueDate);
      const daysOverdue = Math.floor(
        (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
      );
      const amount = Number(inv.total);

      if (!bucketMap.has(inv.customer)) {
        bucketMap.set(inv.customer, {
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          days90plus: 0,
        });
      }
      const b = bucketMap.get(inv.customer)!;

      if (daysOverdue <= 0) b.current += amount;
      else if (daysOverdue <= 30) b.days30 += amount;
      else if (daysOverdue <= 60) b.days60 += amount;
      else if (daysOverdue <= 90) b.days90 += amount;
      else b.days90plus += amount;
    }

    return Array.from(bucketMap.entries()).map(([customer, buckets]) => ({
      customer,
      ...buckets,
    }));
  }),

  // -----------------------------------------------------------------------
  // Route margins – loads grouped by origin → destination with revenue/cost
  // -----------------------------------------------------------------------
  routeMargins: entityProcedure.query(async ({ ctx }) => {
    const entityId = ctx.organizationId!;

    const rows = await ctx.db
      .select({
        originName: sql<string>`origin.name`,
        destinationName: sql<string>`dest.name`,
        loads: count(),
        revenue: sql<number>`COALESCE(SUM(CAST(${schema.invoiceLineItems.lineTotal} AS NUMERIC)), 0)`,
      })
      .from(schema.loads)
      .innerJoin(schema.orders, eq(schema.loads.orderId, schema.orders.id))
      .innerJoin(
        sql`${schema.locations} AS origin`,
        sql`origin.id = ${schema.orders.originId}`,
      )
      .innerJoin(
        sql`${schema.locations} AS dest`,
        sql`dest.id = ${schema.orders.destinationId}`,
      )
      .leftJoin(
        schema.invoiceLineItems,
        eq(schema.invoiceLineItems.loadId, schema.loads.id),
      )
      .where(eq(schema.loads.entityId, entityId))
      .groupBy(sql`origin.name`, sql`dest.name`)
      .orderBy(desc(count()))
      .limit(10);

    return rows.map((r) => ({
      origin: r.originName,
      destination: r.destinationName,
      loads: r.loads,
      revenue: Number(r.revenue),
      cost: Math.round(Number(r.revenue) * 0.62), // Estimate 62% cost ratio for now
    }));
  }),

  // -----------------------------------------------------------------------
  // Monthly revenue – last 6 months of invoice totals
  // -----------------------------------------------------------------------
  monthlyRevenue: entityProcedure.query(async ({ ctx }) => {
    const entityId = ctx.organizationId!;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const rows = await ctx.db
      .select({
        month: sql<string>`TO_CHAR(${schema.invoices.createdAt}, 'Mon')`,
        monthNum: sql<number>`EXTRACT(MONTH FROM ${schema.invoices.createdAt})`,
        year: sql<number>`EXTRACT(YEAR FROM ${schema.invoices.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(CAST(${schema.invoices.total} AS NUMERIC)), 0)`,
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.entityId, entityId),
          gte(schema.invoices.createdAt, sixMonthsAgo),
        ),
      )
      .groupBy(
        sql`TO_CHAR(${schema.invoices.createdAt}, 'Mon')`,
        sql`EXTRACT(MONTH FROM ${schema.invoices.createdAt})`,
        sql`EXTRACT(YEAR FROM ${schema.invoices.createdAt})`,
      )
      .orderBy(
        sql`EXTRACT(YEAR FROM ${schema.invoices.createdAt})`,
        sql`EXTRACT(MONTH FROM ${schema.invoices.createdAt})`,
      );

    return rows.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
    }));
  }),
});
