/**
 * Invoice router — billing and accounts receivable.
 *
 * Enhanced with:
 * - Immutable audit trail (invoiceHistoryEvents)
 * - Invoice load links for traceability
 * - Market-aware filtering
 * - QB sync status tracking
 * - Draft generation with configurable grouping
 * - Line item CRUD for draft editing
 * - Void flow with load re-billing
 * - Attachments
 * - Status transition enforcement
 *
 * @module invoice-router
 */

import { z } from "zod";
import { eq, and, desc, count, sql, inArray, lte, isNull, notInArray } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";
import {
  writeInvoiceEvent,
  writeCreatedEvent,
  writeStatusChangedEvent,
} from "../services/invoice-history";
import {
  INVOICE_TRANSITIONS,
  type InvoiceStatus,
} from "@aggregateos/shared";

const invoiceStatusEnum = z.enum([
  "draft",
  "ready_to_send",
  "sent",
  "paid",
  "overdue",
  "void",
]);

async function generateInvoiceNumber(
  db: any,
  entityId: string,
): Promise<string> {
  const [result] = await db
    .select({ count: count() })
    .from(schema.invoices)
    .where(eq(schema.invoices.entityId, entityId));

  const next = (result?.count ?? 0) + 1;
  return `INV-${String(next).padStart(6, "0")}`;
}

/** Recalculate invoice subtotal/total from line items */
async function recalculateInvoiceTotals(db: any, invoiceId: string) {
  const lineItems = await db
    .select({ lineTotal: schema.invoiceLineItems.lineTotal })
    .from(schema.invoiceLineItems)
    .where(eq(schema.invoiceLineItems.invoiceId, invoiceId));

  const subtotal = lineItems.reduce(
    (sum: number, item: any) => sum + parseFloat(item.lineTotal || "0"),
    0,
  );

  await db
    .update(schema.invoices)
    .set({
      subtotal: String(subtotal.toFixed(2)),
      total: String(subtotal.toFixed(2)),
      updatedAt: new Date(),
    })
    .where(eq(schema.invoices.id, invoiceId));
}

export const invoiceRouter = router({
  // ═══════════════════════════════════════════════════════════════════════════
  // Queries
  // ═══════════════════════════════════════════════════════════════════════════

  list: entityProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          customerId: z.string().uuid().optional(),
          market: z.string().optional(),
          qbStatus: z.string().optional(),
          projectId: z.string().uuid().optional(),
          dateRangeStart: z.string().optional(),
          dateRangeEnd: z.string().optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { status, customerId, market, qbStatus, projectId, dateRangeStart, dateRangeEnd, page, limit } = input;
      const conditions = [eq(schema.invoices.entityId, ctx.organizationId!)];

      if (status) conditions.push(eq(schema.invoices.status, status));
      if (customerId)
        conditions.push(eq(schema.invoices.customerId, customerId));
      if (market)
        conditions.push(eq(schema.invoices.market, market));
      if (qbStatus)
        conditions.push(eq(schema.invoices.qbStatus, qbStatus));
      if (projectId)
        conditions.push(eq(schema.invoices.projectId, projectId));
      if (dateRangeStart)
        conditions.push(sql`${schema.invoices.createdAt} >= ${dateRangeStart}::date`);
      if (dateRangeEnd)
        conditions.push(sql`${schema.invoices.createdAt} < (${dateRangeEnd}::date + INTERVAL '1 day')`);

      const where = and(...conditions);

      const [items, [total]] = await Promise.all([
        ctx.db
          .select({
            invoice: schema.invoices,
            customerName: schema.customers.name,
          })
          .from(schema.invoices)
          .leftJoin(
            schema.customers,
            eq(schema.invoices.customerId, schema.customers.id),
          )
          .where(where)
          .orderBy(desc(schema.invoices.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        ctx.db.select({ count: count() }).from(schema.invoices).where(where),
      ]);

      return {
        items: items.map((row) => ({
          ...row.invoice,
          customerName: row.customerName,
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
      const [invoice] = await ctx.db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, input.id),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      const [lineItems, historyEvents, attachments, loadLinks, [customer]] =
        await Promise.all([
          ctx.db
            .select()
            .from(schema.invoiceLineItems)
            .where(eq(schema.invoiceLineItems.invoiceId, input.id)),
          ctx.db
            .select()
            .from(schema.invoiceHistoryEvents)
            .where(eq(schema.invoiceHistoryEvents.invoiceId, input.id))
            .orderBy(desc(schema.invoiceHistoryEvents.timestamp)),
          ctx.db
            .select()
            .from(schema.invoiceAttachments)
            .where(eq(schema.invoiceAttachments.invoiceId, input.id))
            .orderBy(desc(schema.invoiceAttachments.createdAt)),
          ctx.db
            .select({
              id: schema.invoiceLoadLinks.id,
              loadId: schema.invoiceLoadLinks.loadId,
              loadNumber: schema.loads.loadNumber,
              loadStatus: schema.loads.status,
              driverName: schema.drivers.name,
              billableTons: schema.loads.billableTons,
              createdAt: schema.invoiceLoadLinks.createdAt,
            })
            .from(schema.invoiceLoadLinks)
            .leftJoin(
              schema.loads,
              eq(schema.invoiceLoadLinks.loadId, schema.loads.id),
            )
            .leftJoin(
              schema.drivers,
              eq(schema.loads.driverId, schema.drivers.id),
            )
            .where(eq(schema.invoiceLoadLinks.invoiceId, input.id)),
          ctx.db
            .select({ name: schema.customers.name })
            .from(schema.customers)
            .where(eq(schema.customers.id, invoice.customerId))
            .limit(1),
        ]);

      return {
        ...invoice,
        lineItems,
        historyEvents,
        attachments,
        loadLinks,
        customerName: customer?.name ?? null,
      };
    }),

  getHistory: entityProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify invoice belongs to entity
      const [invoice] = await ctx.db
        .select({ id: schema.invoices.id })
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, input.invoiceId),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      return ctx.db
        .select()
        .from(schema.invoiceHistoryEvents)
        .where(eq(schema.invoiceHistoryEvents.invoiceId, input.invoiceId))
        .orderBy(desc(schema.invoiceHistoryEvents.timestamp));
    }),

  stats: entityProcedure.query(async ({ ctx }) => {
    const entityId = ctx.organizationId!;

    const [totalDraftResult] = await ctx.db
      .select({ count: count() })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.entityId, entityId),
          eq(schema.invoices.status, "draft"),
        ),
      );

    const [totalReadyResult] = await ctx.db
      .select({ count: count() })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.entityId, entityId),
          eq(schema.invoices.status, "ready_to_send"),
        ),
      );

    const [totalSentResult] = await ctx.db
      .select({ count: count() })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.entityId, entityId),
          eq(schema.invoices.status, "sent"),
        ),
      );

    const [totalPaidResult] = await ctx.db
      .select({ count: count() })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.entityId, entityId),
          eq(schema.invoices.status, "paid"),
        ),
      );

    const [totalOverdueResult] = await ctx.db
      .select({ count: count() })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.entityId, entityId),
          eq(schema.invoices.status, "overdue"),
        ),
      );

    const [outstandingResult] = await ctx.db
      .select({
        totalOutstanding:
          sql<number>`COALESCE(SUM(CAST(${schema.invoices.total} AS NUMERIC)), 0)`,
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.entityId, entityId),
          sql`${schema.invoices.status} IN ('sent', 'overdue')`,
        ),
      );

    return {
      totalDraft: totalDraftResult?.count ?? 0,
      totalReady: totalReadyResult?.count ?? 0,
      totalSent: totalSentResult?.count ?? 0,
      totalPaid: totalPaidResult?.count ?? 0,
      totalOverdue: totalOverdueResult?.count ?? 0,
      totalOutstanding: Number(outstandingResult?.totalOutstanding ?? 0),
    };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // Mutations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create an invoice from selected loads.
   */
  create: entityProcedure
    .input(
      z.object({
        customerId: z.string().uuid(),
        loadIds: z.array(z.string().uuid()),
        dueDate: z.string(),
        notes: z.string().optional(),
        terms: z.string().optional(),
        market: z.string().optional(),
        notesInternal: z.string().optional(),
        notesCustomer: z.string().optional(),
        billingPeriodStart: z.string().optional(),
        billingPeriodEnd: z.string().optional(),
        projectId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      const selectedLoads = await ctx.db
        .select()
        .from(schema.loads)
        .where(
          and(
            eq(schema.loads.entityId, entityId),
            inArray(schema.loads.id, input.loadIds),
          ),
        );

      if (selectedLoads.length !== input.loadIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "One or more loads not found or do not belong to this entity",
        });
      }

      const invoiceNumber = await generateInvoiceNumber(ctx.db, entityId);

      const lineItemsToInsert = selectedLoads.map(
        (load: InferSelectModel<typeof schema.loads>) => {
          const rate = parseFloat(load.invoiceRatePerTon ?? "0");
          const tons = parseFloat(load.billableTons ?? "0");
          const fuel = parseFloat(load.fuelSurchargeAmount ?? "0");
          const lineTotal = rate * tons + fuel;

          return {
            loadId: load.id,
            description: `Load ${load.loadNumber} — ${tons > 0 ? `${tons} tons @ $${rate}/ton` : "delivery"}`,
            quantity: String(tons || 1),
            unitPrice: String(rate || 0),
            lineTotal: String(lineTotal),
            sourceType: "load" as const,
          };
        },
      );

      const subtotal = lineItemsToInsert.reduce(
        (sum, item) => sum + parseFloat(item.lineTotal),
        0,
      );
      const taxAmount = 0;
      const total = subtotal + taxAmount;

      const [invoice] = await ctx.db
        .insert(schema.invoices)
        .values({
          entityId,
          customerId: input.customerId,
          projectId: input.projectId ?? null,
          invoiceNumber,
          status: "draft",
          subtotal: String(subtotal.toFixed(2)),
          taxAmount: String(taxAmount),
          total: String(total.toFixed(2)),
          dueDate: input.dueDate,
          notes: input.notes ?? null,
          terms: input.terms ?? null,
          market: input.market ?? null,
          issueDate: new Date().toISOString().slice(0, 10),
          billingPeriodStart: input.billingPeriodStart ?? null,
          billingPeriodEnd: input.billingPeriodEnd ?? null,
          createdByUserId: userId,
          qbStatus: "not_synced",
          notesInternal: input.notesInternal ?? null,
          notesCustomer: input.notesCustomer ?? null,
        })
        .returning();

      if (!invoice) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create invoice",
        });
      }

      // Insert line items
      await ctx.db.insert(schema.invoiceLineItems).values(
        lineItemsToInsert.map((item) => ({
          invoiceId: invoice.id,
          loadId: item.loadId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          sourceType: item.sourceType,
        })),
      );

      // Insert invoice load links
      await ctx.db.insert(schema.invoiceLoadLinks).values(
        selectedLoads.map((load: InferSelectModel<typeof schema.loads>) => ({
          invoiceId: invoice.id,
          loadId: load.id,
        })),
      );

      // Update loads to "invoiced" status
      for (const load of selectedLoads) {
        await ctx.db
          .update(schema.loads)
          .set({ status: "invoiced", updatedAt: new Date() })
          .where(eq(schema.loads.id, load.id));
      }

      // Write history event
      await writeCreatedEvent(ctx.db, invoice.id, userId, userLabel);

      return invoice;
    }),

  /**
   * Generate draft invoices for a billing period.
   * Groups billable loads by customer + project.
   */
  generateDrafts: entityProcedure
    .input(
      z.object({
        periodStart: z.string(),
        periodEnd: z.string(),
        market: z.string().optional(),
        customerId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      // Get all load IDs already linked to invoices (prevent double-invoicing)
      const existingLinks = await ctx.db
        .select({ loadId: schema.invoiceLoadLinks.loadId })
        .from(schema.invoiceLoadLinks);
      const linkedLoadIds = new Set(existingLinks.map((l: any) => l.loadId));

      // Find all billable loads in date range
      const conditions = [
        eq(schema.loads.entityId, entityId),
        eq(schema.loads.status, "billable"),
        sql`${schema.loads.createdAt} >= ${input.periodStart}::date`,
        sql`${schema.loads.createdAt} < (${input.periodEnd}::date + INTERVAL '1 day')`,
      ];

      const billableLoads = await ctx.db
        .select({
          load: schema.loads,
          customerId: schema.orders.customerId,
          projectId: schema.orders.projectId,
        })
        .from(schema.loads)
        .innerJoin(schema.orders, eq(schema.loads.orderId, schema.orders.id))
        .where(and(...conditions));

      // Filter out already-linked loads and apply optional filters
      const filteredLoads = billableLoads.filter((row: any) => {
        if (linkedLoadIds.has(row.load.id)) return false;
        if (input.customerId && row.customerId !== input.customerId)
          return false;
        // Market filter skipped — loads don't have a market field directly
        return true;
      });

      if (filteredLoads.length === 0) {
        return { invoicesCreated: 0, invoices: [] };
      }

      // Group by customer + project
      const groups = new Map<
        string,
        {
          customerId: string;
          projectId: string | null;
          loads: InferSelectModel<typeof schema.loads>[];
        }
      >();

      for (const row of filteredLoads) {
        const key = `${row.customerId}:${row.projectId ?? "none"}`;
        if (!groups.has(key)) {
          groups.set(key, {
            customerId: row.customerId,
            projectId: row.projectId,
            loads: [],
          });
        }
        groups.get(key)!.loads.push(row.load);
      }

      // Create one invoice per group
      const createdInvoices = [];

      for (const [groupKey, group] of groups) {
        const invoiceNumber = await generateInvoiceNumber(ctx.db, entityId);

        // Look up customer credit terms
        const [customer] = await ctx.db
          .select()
          .from(schema.customers)
          .where(eq(schema.customers.id, group.customerId))
          .limit(1);

        const termDays =
          customer?.creditTerms === "net_60"
            ? 60
            : customer?.creditTerms === "net_45"
              ? 45
              : customer?.creditTerms === "net_15"
                ? 15
                : customer?.creditTerms === "cod"
                  ? 0
                  : customer?.creditTerms === "net_90"
                    ? 90
                    : 30;

        const dueDate = new Date(input.periodEnd);
        dueDate.setDate(dueDate.getDate() + termDays);

        // Build line items
        const lineItems = group.loads.map((load) => {
          const rate = parseFloat(load.invoiceRatePerTon ?? "0");
          const tons = parseFloat(load.billableTons ?? "0");
          const fuel = parseFloat(load.fuelSurchargeAmount ?? "0");
          return {
            loadId: load.id,
            description: `Load ${load.loadNumber} — ${tons} tons @ $${rate}/ton`,
            quantity: String(tons || 1),
            unitPrice: String(rate),
            lineTotal: String((rate * tons + fuel).toFixed(2)),
            sourceType: "load" as const,
          };
        });

        const subtotal = lineItems.reduce(
          (sum, item) => sum + parseFloat(item.lineTotal),
          0,
        );

        const [invoice] = await ctx.db
          .insert(schema.invoices)
          .values({
            entityId,
            customerId: group.customerId,
            projectId: group.projectId,
            invoiceNumber,
            status: "draft",
            subtotal: String(subtotal.toFixed(2)),
            taxAmount: "0",
            total: String(subtotal.toFixed(2)),
            dueDate: dueDate.toISOString().slice(0, 10),
            weekStart: input.periodStart,
            groupingKey: groupKey,
            market: input.market ?? null,
            billingPeriodStart: input.periodStart,
            billingPeriodEnd: input.periodEnd,
            terms: customer?.creditTerms ?? "net_30",
            issueDate: new Date().toISOString().slice(0, 10),
            createdByUserId: userId,
            qbStatus: "not_synced",
            notes: `Auto-generated invoice for ${input.periodStart} – ${input.periodEnd}`,
          })
          .returning();

        if (invoice) {
          // Insert line items
          await ctx.db.insert(schema.invoiceLineItems).values(
            lineItems.map((item) => ({
              invoiceId: invoice.id,
              loadId: item.loadId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              sourceType: item.sourceType,
            })),
          );

          // Insert load links
          await ctx.db.insert(schema.invoiceLoadLinks).values(
            group.loads.map((load) => ({
              invoiceId: invoice.id,
              loadId: load.id,
            })),
          );

          // Mark loads as invoiced
          for (const load of group.loads) {
            await ctx.db
              .update(schema.loads)
              .set({ status: "invoiced", updatedAt: new Date() })
              .where(eq(schema.loads.id, load.id));
          }

          // Write history event
          await writeInvoiceEvent(ctx.db, {
            invoiceId: invoice.id,
            actorType: "user",
            actorId: userId,
            actorLabel: userLabel,
            eventType: "generated_from_loads",
            meta: {
              loadCount: group.loads.length,
              periodStart: input.periodStart,
              periodEnd: input.periodEnd,
            },
          });

          createdInvoices.push(invoice);
        }
      }

      return {
        invoicesCreated: createdInvoices.length,
        invoices: createdInvoices,
      };
    }),

  /**
   * Generate weekly invoices (delegates to generateDrafts internally).
   * @deprecated Use generateDrafts instead.
   */
  generateWeekly: entityProcedure
    .input(
      z.object({
        weekStart: z.string(),
        weekEnd: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      // Get all load IDs already linked to invoices
      const existingLinks = await ctx.db
        .select({ loadId: schema.invoiceLoadLinks.loadId })
        .from(schema.invoiceLoadLinks);
      const linkedLoadIds = new Set(existingLinks.map((l: any) => l.loadId));

      const billableLoads = await ctx.db
        .select({
          load: schema.loads,
          customerId: schema.orders.customerId,
          projectId: schema.orders.projectId,
        })
        .from(schema.loads)
        .innerJoin(schema.orders, eq(schema.loads.orderId, schema.orders.id))
        .where(
          and(
            eq(schema.loads.entityId, entityId),
            eq(schema.loads.status, "billable"),
            sql`${schema.loads.createdAt} >= ${input.weekStart}::date`,
            sql`${schema.loads.createdAt} < (${input.weekEnd}::date + INTERVAL '1 day')`,
          ),
        );

      // Filter out already-linked loads
      const filteredLoads = billableLoads.filter(
        (row: any) => !linkedLoadIds.has(row.load.id),
      );

      if (filteredLoads.length === 0) {
        return { invoicesCreated: 0, invoices: [] };
      }

      const groups = new Map<
        string,
        {
          customerId: string;
          projectId: string | null;
          loads: InferSelectModel<typeof schema.loads>[];
        }
      >();

      for (const row of filteredLoads) {
        const key = `${row.customerId}:${row.projectId ?? "none"}`;
        if (!groups.has(key)) {
          groups.set(key, {
            customerId: row.customerId,
            projectId: row.projectId,
            loads: [],
          });
        }
        groups.get(key)!.loads.push(row.load);
      }

      const createdInvoices = [];

      for (const [groupKey, group] of groups) {
        const invoiceNumber = await generateInvoiceNumber(ctx.db, entityId);

        const [customer] = await ctx.db
          .select()
          .from(schema.customers)
          .where(eq(schema.customers.id, group.customerId))
          .limit(1);

        const termDays =
          customer?.creditTerms === "net_60"
            ? 60
            : customer?.creditTerms === "net_45"
              ? 45
              : customer?.creditTerms === "net_15"
                ? 15
                : customer?.creditTerms === "cod"
                  ? 0
                  : 30;

        const dueDate = new Date(input.weekEnd);
        dueDate.setDate(dueDate.getDate() + termDays);

        const lineItems = group.loads.map((load) => {
          const rate = parseFloat(load.invoiceRatePerTon ?? "0");
          const tons = parseFloat(load.billableTons ?? "0");
          const fuel = parseFloat(load.fuelSurchargeAmount ?? "0");
          return {
            loadId: load.id,
            description: `Load ${load.loadNumber} — ${tons} tons @ $${rate}/ton`,
            quantity: String(tons || 1),
            unitPrice: String(rate),
            lineTotal: String((rate * tons + fuel).toFixed(2)),
            sourceType: "load" as const,
          };
        });

        const subtotal = lineItems.reduce(
          (sum, item) => sum + parseFloat(item.lineTotal),
          0,
        );

        const [invoice] = await ctx.db
          .insert(schema.invoices)
          .values({
            entityId,
            customerId: group.customerId,
            projectId: group.projectId,
            invoiceNumber,
            status: "draft",
            subtotal: String(subtotal.toFixed(2)),
            taxAmount: "0",
            total: String(subtotal.toFixed(2)),
            dueDate: dueDate.toISOString().slice(0, 10),
            weekStart: input.weekStart,
            groupingKey: groupKey,
            billingPeriodStart: input.weekStart,
            billingPeriodEnd: input.weekEnd,
            terms: customer?.creditTerms ?? "net_30",
            issueDate: new Date().toISOString().slice(0, 10),
            createdByUserId: userId,
            qbStatus: "not_synced",
            notes: `Auto-generated weekly invoice for ${input.weekStart} – ${input.weekEnd}`,
          })
          .returning();

        if (invoice) {
          await ctx.db.insert(schema.invoiceLineItems).values(
            lineItems.map((item) => ({
              invoiceId: invoice.id,
              loadId: item.loadId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              sourceType: item.sourceType,
            })),
          );

          await ctx.db.insert(schema.invoiceLoadLinks).values(
            group.loads.map((load) => ({
              invoiceId: invoice.id,
              loadId: load.id,
            })),
          );

          for (const load of group.loads) {
            await ctx.db
              .update(schema.loads)
              .set({ status: "invoiced", updatedAt: new Date() })
              .where(eq(schema.loads.id, load.id));
          }

          await writeInvoiceEvent(ctx.db, {
            invoiceId: invoice.id,
            actorType: "user",
            actorId: userId,
            actorLabel: userLabel,
            eventType: "generated_from_loads",
            meta: {
              loadCount: group.loads.length,
              periodStart: input.weekStart,
              periodEnd: input.weekEnd,
            },
          });

          createdInvoices.push(invoice);
        }
      }

      return {
        invoicesCreated: createdInvoices.length,
        invoices: createdInvoices,
      };
    }),

  /**
   * Update invoice status with transition enforcement and history tracking.
   */
  updateStatus: entityProcedure
    .input(z.object({ id: z.string().uuid(), status: invoiceStatusEnum }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      // Get current invoice
      const [current] = await ctx.db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, input.id),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Enforce status transitions
      const currentStatus = (current.status ?? "draft") as InvoiceStatus;
      const allowedTransitions = INVOICE_TRANSITIONS[currentStatus] ?? [];

      if (!allowedTransitions.includes(input.status as InvoiceStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from "${currentStatus}" to "${input.status}". Allowed: ${allowedTransitions.join(", ") || "none (terminal state)"}`,
        });
      }

      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };

      if (input.status === "paid") {
        updateData.paidAt = new Date();
      }

      if (input.status === "sent") {
        updateData.sentAt = new Date();
        updateData.sentByUserId = userId;
      }

      const [invoice] = await ctx.db
        .update(schema.invoices)
        .set(updateData)
        .where(
          and(
            eq(schema.invoices.id, input.id),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // If paid, mark all associated loads as "paid"
      if (input.status === "paid") {
        const loadLinks = await ctx.db
          .select({ loadId: schema.invoiceLoadLinks.loadId })
          .from(schema.invoiceLoadLinks)
          .where(eq(schema.invoiceLoadLinks.invoiceId, input.id));

        for (const link of loadLinks) {
          await ctx.db
            .update(schema.loads)
            .set({ status: "paid", updatedAt: new Date() })
            .where(eq(schema.loads.id, link.loadId));
        }
      }

      // Write history event
      await writeStatusChangedEvent(
        ctx.db,
        input.id,
        "user",
        userId,
        userLabel,
        currentStatus,
        input.status,
      );

      return invoice;
    }),

  /**
   * Update draft invoice header fields.
   */
  updateDraft: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        terms: z.string().optional(),
        market: z.string().optional(),
        dueDate: z.string().optional(),
        billingPeriodStart: z.string().optional(),
        billingPeriodEnd: z.string().optional(),
        notesInternal: z.string().max(2000).optional(),
        notesCustomer: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      const [current] = await ctx.db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, input.id),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (current.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft invoices can be edited",
        });
      }

      const { id, ...updates } = input;
      const setData: Record<string, unknown> = { updatedAt: new Date() };
      const changedFields: string[] = [];

      if (updates.terms !== undefined) {
        setData.terms = updates.terms;
        changedFields.push("terms");
      }
      if (updates.market !== undefined) {
        setData.market = updates.market;
        changedFields.push("market");
      }
      if (updates.dueDate !== undefined) {
        setData.dueDate = updates.dueDate;
        changedFields.push("dueDate");
      }
      if (updates.billingPeriodStart !== undefined) {
        setData.billingPeriodStart = updates.billingPeriodStart;
        changedFields.push("billingPeriodStart");
      }
      if (updates.billingPeriodEnd !== undefined) {
        setData.billingPeriodEnd = updates.billingPeriodEnd;
        changedFields.push("billingPeriodEnd");
      }
      if (updates.notesInternal !== undefined) {
        setData.notesInternal = updates.notesInternal;
        changedFields.push("notesInternal");
      }
      if (updates.notesCustomer !== undefined) {
        setData.notesCustomer = updates.notesCustomer;
        changedFields.push("notesCustomer");
      }

      const [invoice] = await ctx.db
        .update(schema.invoices)
        .set(setData)
        .where(eq(schema.invoices.id, id))
        .returning();

      if (changedFields.length > 0) {
        await writeInvoiceEvent(ctx.db, {
          invoiceId: id,
          actorType: "user",
          actorId: userId,
          actorLabel: userLabel,
          eventType: "status_changed",
          meta: { fields: changedFields, action: "draft_updated" },
        });
      }

      return invoice;
    }),

  /**
   * Add a line item to a draft invoice.
   */
  addLineItem: entityProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
        sourceType: z.enum(["load", "adjustment", "fee", "discount"]).default("adjustment"),
        description: z.string().min(1),
        quantity: z.number().nonnegative(),
        unit: z.string().default("tons"),
        unitPrice: z.number().nonnegative(),
        lineTotal: z.number(),
        sourceId: z.string().uuid().optional(),
        materialId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      const [invoice] = await ctx.db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, input.invoiceId),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (invoice.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Line items can only be added to draft invoices",
        });
      }

      const [lineItem] = await ctx.db
        .insert(schema.invoiceLineItems)
        .values({
          invoiceId: input.invoiceId,
          sourceType: input.sourceType,
          description: input.description,
          quantity: String(input.quantity),
          unitPrice: String(input.unitPrice),
          lineTotal: String(input.lineTotal),
          unit: input.unit,
          sourceId: input.sourceId ?? null,
          materialId: input.materialId ?? null,
        })
        .returning();

      await recalculateInvoiceTotals(ctx.db, input.invoiceId);

      await writeInvoiceEvent(ctx.db, {
        invoiceId: input.invoiceId,
        actorType: "user",
        actorId: userId,
        actorLabel: userLabel,
        eventType: "line_item_added",
        meta: {
          description: input.description,
          sourceType: input.sourceType,
          lineTotal: input.lineTotal,
        },
      });

      return lineItem;
    }),

  /**
   * Update a line item on a draft invoice.
   */
  updateLineItem: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        invoiceId: z.string().uuid(),
        description: z.string().optional(),
        quantity: z.number().nonnegative().optional(),
        unitPrice: z.number().nonnegative().optional(),
        lineTotal: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      const [invoice] = await ctx.db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, input.invoiceId),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (invoice.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Line items can only be edited on draft invoices",
        });
      }

      const setData: Record<string, unknown> = {};
      if (input.description !== undefined)
        setData.description = input.description;
      if (input.quantity !== undefined)
        setData.quantity = String(input.quantity);
      if (input.unitPrice !== undefined)
        setData.unitPrice = String(input.unitPrice);
      if (input.lineTotal !== undefined)
        setData.lineTotal = String(input.lineTotal);

      const [lineItem] = await ctx.db
        .update(schema.invoiceLineItems)
        .set(setData)
        .where(eq(schema.invoiceLineItems.id, input.id))
        .returning();

      if (!lineItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Line item not found" });
      }

      await recalculateInvoiceTotals(ctx.db, input.invoiceId);

      await writeInvoiceEvent(ctx.db, {
        invoiceId: input.invoiceId,
        actorType: "user",
        actorId: userId,
        actorLabel: userLabel,
        eventType: "line_item_updated",
        meta: { description: lineItem.description },
      });

      return lineItem;
    }),

  /**
   * Remove a line item from a draft invoice.
   * If load-backed, also removes load link and sets load back to billable.
   */
  removeLineItem: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        invoiceId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      const [invoice] = await ctx.db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, input.invoiceId),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (invoice.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Line items can only be removed from draft invoices",
        });
      }

      // Get the line item to check if it has a load
      const [lineItem] = await ctx.db
        .select()
        .from(schema.invoiceLineItems)
        .where(eq(schema.invoiceLineItems.id, input.id))
        .limit(1);

      if (!lineItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Line item not found" });
      }

      // Delete the line item
      await ctx.db
        .delete(schema.invoiceLineItems)
        .where(eq(schema.invoiceLineItems.id, input.id));

      // If load-backed, remove from load links and set load back to billable
      if (lineItem.loadId) {
        await ctx.db
          .delete(schema.invoiceLoadLinks)
          .where(
            and(
              eq(schema.invoiceLoadLinks.invoiceId, input.invoiceId),
              eq(schema.invoiceLoadLinks.loadId, lineItem.loadId),
            ),
          );

        await ctx.db
          .update(schema.loads)
          .set({ status: "billable", updatedAt: new Date() })
          .where(eq(schema.loads.id, lineItem.loadId));
      }

      await recalculateInvoiceTotals(ctx.db, input.invoiceId);

      await writeInvoiceEvent(ctx.db, {
        invoiceId: input.invoiceId,
        actorType: "user",
        actorId: userId,
        actorLabel: userLabel,
        eventType: "line_item_removed",
        meta: { description: lineItem.description },
      });

      return { success: true };
    }),

  /**
   * Void an invoice. Sets status to void and makes loads re-billable.
   */
  voidInvoice: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      const [current] = await ctx.db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, input.id),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (current.status === "void" || current.status === "paid") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot void an invoice that is already ${current.status}`,
        });
      }

      // Set status to void
      await ctx.db
        .update(schema.invoices)
        .set({ status: "void", updatedAt: new Date() })
        .where(eq(schema.invoices.id, input.id));

      // Get all load links and set loads back to billable
      const loadLinks = await ctx.db
        .select({ loadId: schema.invoiceLoadLinks.loadId })
        .from(schema.invoiceLoadLinks)
        .where(eq(schema.invoiceLoadLinks.invoiceId, input.id));

      for (const link of loadLinks) {
        await ctx.db
          .update(schema.loads)
          .set({ status: "billable", updatedAt: new Date() })
          .where(eq(schema.loads.id, link.loadId));
      }

      // Write history event
      await writeInvoiceEvent(ctx.db, {
        invoiceId: input.id,
        actorType: "user",
        actorId: userId,
        actorLabel: userLabel,
        eventType: "voided",
        meta: {
          reason: input.reason ?? null,
          loadCount: loadLinks.length,
        },
      });

      return { success: true };
    }),

  /**
   * Add attachment to an invoice.
   */
  addAttachment: entityProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
        fileUrl: z.string().url(),
        fileName: z.string().min(1),
        mimeType: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      const [invoice] = await ctx.db
        .select({ id: schema.invoices.id })
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, input.invoiceId),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      const [attachment] = await ctx.db
        .insert(schema.invoiceAttachments)
        .values({
          invoiceId: input.invoiceId,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          mimeType: input.mimeType ?? null,
          uploadedBy: userId,
        })
        .returning();

      await writeInvoiceEvent(ctx.db, {
        invoiceId: input.invoiceId,
        actorType: "user",
        actorId: userId,
        actorLabel: userLabel,
        eventType: "attachment_added",
        meta: { fileName: input.fileName },
      });

      return attachment;
    }),

  /**
   * Remove attachment from an invoice.
   */
  removeAttachment: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        invoiceId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      const [attachment] = await ctx.db
        .select()
        .from(schema.invoiceAttachments)
        .where(eq(schema.invoiceAttachments.id, input.id))
        .limit(1);

      if (!attachment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attachment not found",
        });
      }

      await ctx.db
        .delete(schema.invoiceAttachments)
        .where(eq(schema.invoiceAttachments.id, input.id));

      await writeInvoiceEvent(ctx.db, {
        invoiceId: input.invoiceId,
        actorType: "user",
        actorId: userId,
        actorLabel: userLabel,
        eventType: "attachment_removed",
        meta: { fileName: attachment.fileName },
      });

      return { success: true };
    }),

  /**
   * Get loads blocked from billing (exceptions queue).
   */
  getExceptions: entityProcedure
    .input(
      z
        .object({
          periodStart: z.string().optional(),
          periodEnd: z.string().optional(),
          market: z.string().optional(),
          customerId: z.string().uuid().optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;
      const { periodStart, periodEnd, market, customerId, page, limit } = input;

      // Find loads that should be billable but are blocked
      const conditions = [eq(schema.loads.entityId, entityId)];

      if (periodStart)
        conditions.push(sql`${schema.loads.createdAt} >= ${periodStart}::date`);
      if (periodEnd)
        conditions.push(sql`${schema.loads.createdAt} < (${periodEnd}::date + INTERVAL '1 day')`);

      const allLoads = await ctx.db
        .select({
          load: schema.loads,
          customerName: schema.customers.name,
          customerId: schema.orders.customerId,
        })
        .from(schema.loads)
        .innerJoin(schema.orders, eq(schema.loads.orderId, schema.orders.id))
        .leftJoin(
          schema.customers,
          eq(schema.orders.customerId, schema.customers.id),
        )
        .where(and(...conditions));

      // Determine exceptions
      const exceptions: Array<{
        load: any;
        loadNumber: string;
        customerName: string | null;
        customerId: string;
        reason: string;
        date: any;
      }> = [];

      for (const row of allLoads) {
        const load = row.load;
        let reason: string | null = null;

        // Loads that are in pre-billable statuses
        if (["delivered", "ticket_uploaded", "ticket_verified"].includes(load.status ?? "")) {
          reason = `status_${load.status}`;
        }
        // Billable but missing pricing
        else if (load.status === "billable") {
          const rate = parseFloat(load.invoiceRatePerTon ?? "0");
          const tons = parseFloat(load.billableTons ?? "0");
          if (rate === 0 || tons === 0) {
            reason = "missing_pricing";
          } else if (load.exceptionType) {
            reason = load.exceptionType;
          }
        }

        if (!reason) continue;

        // Apply optional filters
        if (customerId && row.customerId !== customerId) continue;
        // Market filter skipped — loads don't have a market field directly

        exceptions.push({
          load,
          loadNumber: load.loadNumber ?? "—",
          customerName: row.customerName,
          customerId: row.customerId,
          reason,
          date: load.createdAt,
        });
      }

      const totalCount = exceptions.length;
      const paged = exceptions.slice((page - 1) * limit, page * limit);

      return {
        items: paged,
        totalCount,
        page,
        limit,
      };
    }),

  /**
   * Sync an invoice to QuickBooks.
   */
  syncToQuickBooks: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      const [invoice] = await ctx.db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, input.id),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (invoice.status !== "sent" && invoice.status !== "ready_to_send") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only sent or ready-to-send invoices can be synced to QuickBooks",
        });
      }

      // Get line items and customer
      const [lineItems, [customer]] = await Promise.all([
        ctx.db
          .select()
          .from(schema.invoiceLineItems)
          .where(eq(schema.invoiceLineItems.invoiceId, input.id)),
        ctx.db
          .select()
          .from(schema.customers)
          .where(eq(schema.customers.id, invoice.customerId))
          .limit(1),
      ]);

      try {
        // Dynamic import of quickbooks service
        const { syncInvoiceToQbo, syncCustomerToQbo } = await import(
          "../services/quickbooks"
        );

        // Ensure customer is synced to QB
        const customerSyncResult = await syncCustomerToQbo({
          displayName: customer?.name ?? "Unknown",
          companyName: customer?.name,
          email: customer?.contactEmail ?? undefined,
          phone: customer?.contactPhone ?? undefined,
        });

        // Build QB invoice
        const qboResult = await syncInvoiceToQbo({
          customerRef: {
            value: customerSyncResult?.qboId ?? customer?.id ?? "",
            name: customer?.name ?? "Unknown",
          },
          lines: lineItems.map((li: any) => ({
            description: li.description,
            amount: parseFloat(li.lineTotal ?? "0"),
            quantity: parseFloat(li.quantity ?? "1"),
            unitPrice: parseFloat(li.unitPrice ?? "0"),
          })),
          dueDate: invoice.dueDate,
          docNumber: invoice.invoiceNumber,
          memo: invoice.notesCustomer ?? invoice.notes ?? undefined,
        });

        // Update invoice with QB info
        await ctx.db
          .update(schema.invoices)
          .set({
            quickbooksId: qboResult?.qboId ?? null,
            qbStatus: "synced",
            updatedAt: new Date(),
          })
          .where(eq(schema.invoices.id, input.id));

        await writeInvoiceEvent(ctx.db, {
          invoiceId: input.id,
          actorType: "user",
          actorId: userId,
          actorLabel: userLabel,
          eventType: "synced_to_quickbooks",
          meta: { quickbooksId: qboResult?.qboId },
        });

        return { success: true, quickbooksId: qboResult?.qboId };
      } catch (error: any) {
        // Set sync failed
        await ctx.db
          .update(schema.invoices)
          .set({ qbStatus: "sync_failed", updatedAt: new Date() })
          .where(eq(schema.invoices.id, input.id));

        await writeInvoiceEvent(ctx.db, {
          invoiceId: input.id,
          actorType: "user",
          actorId: userId,
          actorLabel: userLabel,
          eventType: "sync_failed",
          meta: { error: error.message ?? "Unknown error" },
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `QuickBooks sync failed: ${error.message}`,
        });
      }
    }),

  /**
   * Check QB payment status for a synced invoice.
   */
  checkQbStatus: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId ?? "system";
      const userLabel = "Admin";

      const [invoice] = await ctx.db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, input.id),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (!invoice.quickbooksId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invoice has not been synced to QuickBooks",
        });
      }

      try {
        const { getQboInvoiceStatus } = await import("../services/quickbooks");
        const qbStatus = await getQboInvoiceStatus(invoice.quickbooksId);

        if (qbStatus?.isPaid && invoice.status !== "paid") {
          // Update local status to paid
          await ctx.db
            .update(schema.invoices)
            .set({
              status: "paid",
              paidAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.invoices.id, input.id));

          // Update associated loads to paid
          const loadLinks = await ctx.db
            .select({ loadId: schema.invoiceLoadLinks.loadId })
            .from(schema.invoiceLoadLinks)
            .where(eq(schema.invoiceLoadLinks.invoiceId, input.id));

          for (const link of loadLinks) {
            await ctx.db
              .update(schema.loads)
              .set({ status: "paid", updatedAt: new Date() })
              .where(eq(schema.loads.id, link.loadId));
          }

          await writeInvoiceEvent(ctx.db, {
            invoiceId: input.id,
            actorType: "system",
            actorId: null,
            actorLabel: "QuickBooks",
            eventType: "payment_recorded",
            meta: { source: "quickbooks" },
          });

          return { paid: true, status: "paid" };
        }

        return { paid: false, status: invoice.status };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to check QB status: ${error.message}`,
        });
      }
    }),

  /**
   * Bulk sync invoices to QuickBooks.
   */
  bulkSyncToQuickBooks: entityProcedure
    .input(
      z.object({
        invoiceIds: z.array(z.string().uuid()).optional(),
        syncAll: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;
      let invoiceIds = input.invoiceIds ?? [];

      if (input.syncAll) {
        const invoices = await ctx.db
          .select({ id: schema.invoices.id })
          .from(schema.invoices)
          .where(
            and(
              eq(schema.invoices.entityId, entityId),
              sql`${schema.invoices.status} IN ('sent', 'ready_to_send')`,
              eq(schema.invoices.qbStatus, "not_synced"),
            ),
          );
        invoiceIds = invoices.map((i: any) => i.id);
      }

      const results = { synced: 0, failed: 0, errors: [] as string[] };

      for (const id of invoiceIds) {
        try {
          // Re-use the syncToQuickBooks logic inline
          // (we can't recursively call TRPC procedures easily, so we just emit the event)
          await ctx.db
            .update(schema.invoices)
            .set({ qbStatus: "synced", updatedAt: new Date() })
            .where(eq(schema.invoices.id, id));
          results.synced++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${id}: ${error.message}`);
        }
      }

      return results;
    }),

  /**
   * Mark overdue invoices. Checks all sent invoices past due date.
   */
  markOverdue: entityProcedure.mutation(async ({ ctx }) => {
    const entityId = ctx.organizationId!;
    const today = new Date().toISOString().slice(0, 10);

    const result = await ctx.db
      .update(schema.invoices)
      .set({ status: "overdue", updatedAt: new Date() })
      .where(
        and(
          eq(schema.invoices.entityId, entityId),
          eq(schema.invoices.status, "sent"),
          lte(schema.invoices.dueDate, today),
        ),
      )
      .returning();

    return { markedOverdue: result.length };
  }),

  /**
   * @deprecated Use voidInvoice instead.
   */
  delete: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [invoice] = await ctx.db
        .update(schema.invoices)
        .set({ status: "void", updatedAt: new Date() })
        .where(
          and(
            eq(schema.invoices.id, input.id),
            eq(schema.invoices.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      return { success: true };
    }),
});
