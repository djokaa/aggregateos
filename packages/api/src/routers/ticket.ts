/**
 * Ticket router — manages delivery ticket upload, OCR processing,
 * and the human review queue.
 *
 * Enhanced with:
 * - Standardized rejection reasons (enum)
 * - Rejection count tracking
 * - Reupload after rejection
 * - Billable tons locking on verification
 * - Bulk approve/reject
 *
 * @module ticket-router
 */

import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";
import { processTicketImage } from "../services/ocr";

/** Confidence threshold above which a ticket auto-approves. */
const AUTO_APPROVE_THRESHOLD = 0.9;

/** Standardized rejection reasons */
const rejectionReasonEnum = z.enum([
  "unreadable",
  "wrong_number",
  "tonnage_mismatch",
  "wrong_material",
  "wrong_job",
  "duplicate",
  "other",
]);

export const ticketRouter = router({
  /**
   * Upload a ticket photo and trigger OCR processing.
   */
  upload: entityProcedure
    .input(
      z.object({
        loadId: z.string().uuid(),
        photoUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [load] = await ctx.db
        .select()
        .from(schema.loads)
        .where(
          and(
            eq(schema.loads.id, input.loadId),
            eq(schema.loads.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!load) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Load not found" });
      }

      // Run OCR
      const extraction = await processTicketImage(input.photoUrl);
      const shouldAutoApprove =
        extraction.overallConfidence >= AUTO_APPROVE_THRESHOLD;

      // Create ticket record
      const [ticket] = await ctx.db
        .insert(schema.tickets)
        .values({
          loadId: input.loadId,
          photoUrl: input.photoUrl,
          ocrRaw: extraction.raw,
          extractedWeight: extraction.weight
            ? String(extraction.weight)
            : null,
          extractedDate: extraction.date,
          extractedTicketNumber: extraction.ticketNumber,
          extractedMaterial: extraction.material,
          confidenceScore: String(extraction.overallConfidence),
          isApproved: shouldAutoApprove ? true : null,
          verifiedAt: shouldAutoApprove ? new Date() : null,
          rejectionReason: null,
          rejectionCount: 0,
          notes: shouldAutoApprove
            ? `Auto-approved (confidence: ${(extraction.overallConfidence * 100).toFixed(1)}%)`
            : null,
        })
        .returning();

      // Advance load status
      const newStatus = shouldAutoApprove
        ? "ticket_verified"
        : "ticket_uploaded";

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedAt: new Date(),
      };

      // If auto-approved, lock billable tons from extracted weight
      if (shouldAutoApprove && extraction.weight) {
        updateData.billableTons = String(extraction.weight);
      }

      await ctx.db
        .update(schema.loads)
        .set(updateData)
        .where(eq(schema.loads.id, input.loadId));

      return { ticket, extraction, autoApproved: shouldAutoApprove };
    }),

  /**
   * Reupload a ticket after rejection.
   * Resets rejection state and processes new image.
   */
  reupload: entityProcedure
    .input(
      z.object({
        loadId: z.string().uuid(),
        photoUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [load] = await ctx.db
        .select()
        .from(schema.loads)
        .where(
          and(
            eq(schema.loads.id, input.loadId),
            eq(schema.loads.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!load) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Load not found" });
      }

      // Check that load is in "delivered" status (rejection sends it back there)
      if (load.status !== "delivered") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Load must be in 'delivered' status for reupload (current: ${load.status})`,
        });
      }

      // Run OCR on new photo
      const extraction = await processTicketImage(input.photoUrl);
      const shouldAutoApprove =
        extraction.overallConfidence >= AUTO_APPROVE_THRESHOLD;

      // Create a new ticket record (keeping old ones for history)
      const [ticket] = await ctx.db
        .insert(schema.tickets)
        .values({
          loadId: input.loadId,
          photoUrl: input.photoUrl,
          ocrRaw: extraction.raw,
          extractedWeight: extraction.weight
            ? String(extraction.weight)
            : null,
          extractedDate: extraction.date,
          extractedTicketNumber: extraction.ticketNumber,
          extractedMaterial: extraction.material,
          confidenceScore: String(extraction.overallConfidence),
          isApproved: shouldAutoApprove ? true : null,
          verifiedAt: shouldAutoApprove ? new Date() : null,
          rejectionReason: null,
          rejectionCount: 0,
          notes: shouldAutoApprove
            ? `Auto-approved on resubmit (confidence: ${(extraction.overallConfidence * 100).toFixed(1)}%)`
            : "Resubmitted after rejection",
        })
        .returning();

      const newStatus = shouldAutoApprove
        ? "ticket_verified"
        : "ticket_uploaded";

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (shouldAutoApprove && extraction.weight) {
        updateData.billableTons = String(extraction.weight);
      }

      await ctx.db
        .update(schema.loads)
        .set(updateData)
        .where(eq(schema.loads.id, input.loadId));

      return { ticket, extraction, autoApproved: shouldAutoApprove };
    }),

  /**
   * Get ticket by load ID.
   */
  getByLoadId: entityProcedure
    .input(z.object({ loadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [ticket] = await ctx.db
        .select()
        .from(schema.tickets)
        .where(eq(schema.tickets.loadId, input.loadId))
        .orderBy(desc(schema.tickets.createdAt))
        .limit(1);

      return ticket ?? null;
    }),

  /**
   * List tickets in review queue with load/order context.
   */
  reviewQueue: entityProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "approved", "rejected"]).optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.organizationId!;
      const { status, page, limit } = input;

      const conditions = [eq(schema.loads.entityId, entityId)];

      if (status === "pending") {
        conditions.push(sql`${schema.tickets.isApproved} IS NULL`);
      } else if (status === "approved") {
        conditions.push(eq(schema.tickets.isApproved, true));
      } else if (status === "rejected") {
        conditions.push(eq(schema.tickets.isApproved, false));
      }

      const items = await ctx.db
        .select({
          ticket: schema.tickets,
          loadNumber: schema.loads.loadNumber,
          loadStatus: schema.loads.status,
          driverName: schema.drivers.name,
          orderNumber: schema.orders.orderNumber,
          customerName: schema.customers.name,
          materialName: schema.materials.name,
        })
        .from(schema.tickets)
        .innerJoin(schema.loads, eq(schema.tickets.loadId, schema.loads.id))
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
        .where(and(...conditions))
        .orderBy(desc(schema.tickets.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const [total] = await ctx.db
        .select({ count: count() })
        .from(schema.tickets)
        .innerJoin(schema.loads, eq(schema.tickets.loadId, schema.loads.id))
        .where(and(...conditions));

      return {
        items: items.map((row) => ({
          ...row.ticket,
          loadNumber: row.loadNumber,
          loadStatus: row.loadStatus,
          driverName: row.driverName,
          orderNumber: row.orderNumber,
          customerName: row.customerName,
          materialName: row.materialName,
        })),
        totalCount: total?.count ?? 0,
        page,
        limit,
      };
    }),

  /**
   * Approve a ticket after human review.
   * Locks billable tons on the load.
   */
  approve: entityProcedure
    .input(
      z.object({
        ticketId: z.string().uuid(),
        corrections: z
          .object({
            weight: z.number().positive().optional(),
            material: z.string().optional(),
            date: z.string().optional(),
            ticketNumber: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [ticket] = await ctx.db
        .select()
        .from(schema.tickets)
        .where(eq(schema.tickets.id, input.ticketId))
        .limit(1);

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket not found",
        });
      }

      const [load] = await ctx.db
        .select()
        .from(schema.loads)
        .where(
          and(
            eq(schema.loads.id, ticket.loadId),
            eq(schema.loads.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!load) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Ticket does not belong to this organization",
        });
      }

      // Build ticket update
      const updateData: Record<string, unknown> = {
        isApproved: true,
        verifiedBy: ctx.userId,
        verifiedAt: new Date(),
        rejectionReason: null,
        notes: input.corrections
          ? "Approved with manual corrections"
          : "Approved by reviewer",
      };

      if (input.corrections) {
        if (input.corrections.weight !== undefined) {
          updateData.extractedWeight = String(input.corrections.weight);
        }
        if (input.corrections.material !== undefined) {
          updateData.extractedMaterial = input.corrections.material;
        }
        if (input.corrections.date !== undefined) {
          updateData.extractedDate = input.corrections.date;
        }
        if (input.corrections.ticketNumber !== undefined) {
          updateData.extractedTicketNumber = input.corrections.ticketNumber;
        }
      }

      const [updated] = await ctx.db
        .update(schema.tickets)
        .set(updateData)
        .where(eq(schema.tickets.id, input.ticketId))
        .returning();

      // Lock billable tons on load and advance status
      const billableTons =
        input.corrections?.weight ??
        (ticket.extractedWeight ? parseFloat(ticket.extractedWeight) : null);

      const loadUpdate: Record<string, unknown> = {
        status: "ticket_verified",
        updatedAt: new Date(),
      };
      if (billableTons !== null && billableTons !== undefined) {
        loadUpdate.billableTons = String(billableTons);
      }

      await ctx.db
        .update(schema.loads)
        .set(loadUpdate)
        .where(eq(schema.loads.id, ticket.loadId));

      return updated;
    }),

  /**
   * Reject a ticket with a standardized reason.
   * Increments rejection count and sends load back to "delivered".
   */
  reject: entityProcedure
    .input(
      z.object({
        ticketId: z.string().uuid(),
        reason: rejectionReasonEnum,
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [ticket] = await ctx.db
        .select()
        .from(schema.tickets)
        .where(eq(schema.tickets.id, input.ticketId))
        .limit(1);

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket not found",
        });
      }

      const [load] = await ctx.db
        .select()
        .from(schema.loads)
        .where(
          and(
            eq(schema.loads.id, ticket.loadId),
            eq(schema.loads.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!load) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Ticket does not belong to this organization",
        });
      }

      const [updated] = await ctx.db
        .update(schema.tickets)
        .set({
          isApproved: false,
          verifiedBy: ctx.userId,
          verifiedAt: new Date(),
          rejectionReason: input.reason,
          rejectionCount: (ticket.rejectionCount ?? 0) + 1,
          notes: input.notes
            ? `Rejected (${input.reason}): ${input.notes}`
            : `Rejected: ${input.reason}`,
        })
        .where(eq(schema.tickets.id, input.ticketId))
        .returning();

      // Send load back to delivered for re-upload
      await ctx.db
        .update(schema.loads)
        .set({ status: "delivered", updatedAt: new Date() })
        .where(eq(schema.loads.id, ticket.loadId));

      return updated;
    }),

  /**
   * Bulk approve tickets.
   */
  bulkApprove: entityProcedure
    .input(z.object({ ticketIds: z.array(z.string().uuid()).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const results = [];

      for (const ticketId of input.ticketIds) {
        const [ticket] = await ctx.db
          .select()
          .from(schema.tickets)
          .where(eq(schema.tickets.id, ticketId))
          .limit(1);

        if (!ticket) continue;

        const [load] = await ctx.db
          .select()
          .from(schema.loads)
          .where(
            and(
              eq(schema.loads.id, ticket.loadId),
              eq(schema.loads.entityId, ctx.organizationId!),
            ),
          )
          .limit(1);

        if (!load) continue;

        await ctx.db
          .update(schema.tickets)
          .set({
            isApproved: true,
            verifiedBy: ctx.userId,
            verifiedAt: new Date(),
            rejectionReason: null,
            notes: "Bulk approved by reviewer",
          })
          .where(eq(schema.tickets.id, ticketId));

        const billableTons = ticket.extractedWeight
          ? parseFloat(ticket.extractedWeight)
          : null;

        const loadUpdate: Record<string, unknown> = {
          status: "ticket_verified",
          updatedAt: new Date(),
        };
        if (billableTons !== null) {
          loadUpdate.billableTons = String(billableTons);
        }

        await ctx.db
          .update(schema.loads)
          .set(loadUpdate)
          .where(eq(schema.loads.id, ticket.loadId));

        results.push(ticketId);
      }

      return { approvedCount: results.length, ticketIds: results };
    }),

  /**
   * Get review queue statistics.
   */
  reviewStats: entityProcedure.query(async ({ ctx }) => {
    const entityId = ctx.organizationId!;

    const [pendingResult] = await ctx.db
      .select({ count: count() })
      .from(schema.loads)
      .where(
        and(
          eq(schema.loads.entityId, entityId),
          eq(schema.loads.status, "ticket_uploaded"),
        ),
      );

    const [totalResult] = await ctx.db
      .select({ count: count() })
      .from(schema.tickets)
      .innerJoin(schema.loads, eq(schema.tickets.loadId, schema.loads.id))
      .where(eq(schema.loads.entityId, entityId));

    const [approvedResult] = await ctx.db
      .select({ count: count() })
      .from(schema.tickets)
      .innerJoin(schema.loads, eq(schema.tickets.loadId, schema.loads.id))
      .where(
        and(
          eq(schema.loads.entityId, entityId),
          eq(schema.tickets.isApproved, true),
        ),
      );

    const [rejectedResult] = await ctx.db
      .select({ count: count() })
      .from(schema.tickets)
      .innerJoin(schema.loads, eq(schema.tickets.loadId, schema.loads.id))
      .where(
        and(
          eq(schema.loads.entityId, entityId),
          eq(schema.tickets.isApproved, false),
        ),
      );

    const total = totalResult?.count ?? 0;
    const approved = approvedResult?.count ?? 0;
    const rejected = rejectedResult?.count ?? 0;
    const autoRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return {
      pendingReview: pendingResult?.count ?? 0,
      totalProcessed: total,
      autoApproved: approved,
      rejected,
      autoApprovalRate: autoRate,
    };
  }),
});
