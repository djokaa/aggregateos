import { z } from "zod";
import { eq, and, desc, lt, count, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { createEstimateSchema } from "@aggregateos/shared";
import { router, entityProcedure } from "../trpc";
import {
  writeEstimateEvent,
  writeCreatedEvent,
  writeStatusChangedEvent,
} from "../services/estimate-history";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Valid estimate status transitions */
const ESTIMATE_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["viewed", "approved", "rejected", "expired"],
  viewed: ["approved", "rejected", "expired"],
  approved: [],
  rejected: [],
  expired: [],
};

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a sequential estimate number like EST-000001.
 */
async function generateEstimateNumber(
  db: any,
  entityId: string,
): Promise<string> {
  const [result] = await db
    .select({ count: count() })
    .from(schema.estimates)
    .where(eq(schema.estimates.entityId, entityId));

  const next = (result?.count ?? 0) + 1;
  return `EST-${String(next).padStart(6, "0")}`;
}

/**
 * Build the full snapshot JSON for a version.
 */
async function buildVersionSnapshot(db: any, estimateId: string) {
  const [estimate] = await db
    .select()
    .from(schema.estimates)
    .where(eq(schema.estimates.id, estimateId))
    .limit(1);

  const lineItems = await db
    .select()
    .from(schema.estimateLineItems)
    .where(eq(schema.estimateLineItems.estimateId, estimateId));

  return { ...estimate, lineItems };
}

/**
 * Get the next version number for an estimate.
 */
async function getNextVersionNumber(
  db: any,
  estimateId: string,
): Promise<number> {
  const [result] = await db
    .select({ max: sql<number>`COALESCE(MAX(${schema.estimateVersions.versionNumber}), 0)` })
    .from(schema.estimateVersions)
    .where(eq(schema.estimateVersions.estimateId, estimateId));
  return (result?.max ?? 0) + 1;
}

/**
 * Generate a cryptographically secure token for magic links.
 */
function generateAccessToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ═══════════════════════════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════════════════════════

export const estimateRouter = router({
  // ─────────────────────────────────────────────────────────────────────────
  // List estimates (paginated, filterable)
  // ─────────────────────────────────────────────────────────────────────────
  list: entityProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          customerId: z.string().uuid().optional(),
          market: z.string().optional(),
          search: z.string().optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { status, customerId, market, search, page, limit } = input;

      const conditions = [
        eq(schema.estimates.entityId, ctx.organizationId!),
      ];

      if (status) {
        conditions.push(eq(schema.estimates.status, status));
      }
      if (customerId) {
        conditions.push(eq(schema.estimates.customerId, customerId));
      }
      if (market) {
        conditions.push(eq(schema.estimates.market, market));
      }

      const where = and(...conditions);

      const [items, [total]] = await Promise.all([
        ctx.db
          .select({
            id: schema.estimates.id,
            estimateNumber: schema.estimates.estimateNumber,
            status: schema.estimates.status,
            customerId: schema.estimates.customerId,
            customerName: schema.customers.name,
            subtotal: schema.estimates.subtotal,
            total: schema.estimates.total,
            validUntil: schema.estimates.validUntil,
            sentAt: schema.estimates.sentAt,
            approvedAt: schema.estimates.approvedAt,
            rejectedAt: schema.estimates.rejectedAt,
            market: schema.estimates.market,
            jobSiteLocationId: schema.estimates.jobSiteLocationId,
            createdAt: schema.estimates.createdAt,
          })
          .from(schema.estimates)
          .leftJoin(
            schema.customers,
            eq(schema.estimates.customerId, schema.customers.id),
          )
          .where(where)
          .orderBy(desc(schema.estimates.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        ctx.db
          .select({ count: count() })
          .from(schema.estimates)
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

  // ─────────────────────────────────────────────────────────────────────────
  // Get estimate by ID (includes line items, history, comments, attachments,
  // versions, recipients, and resolved names)
  // ─────────────────────────────────────────────────────────────────────────
  getById: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [estimate] = await ctx.db
        .select({
          id: schema.estimates.id,
          entityId: schema.estimates.entityId,
          customerId: schema.estimates.customerId,
          customerName: schema.customers.name,
          estimateNumber: schema.estimates.estimateNumber,
          status: schema.estimates.status,
          subtotal: schema.estimates.subtotal,
          fuelSurchargeTotal: schema.estimates.fuelSurchargeTotal,
          total: schema.estimates.total,
          jobSiteLocationId: schema.estimates.jobSiteLocationId,
          jobSiteName: schema.locations.name,
          projectId: schema.estimates.projectId,
          market: schema.estimates.market,
          currency: schema.estimates.currency,
          notesInternal: schema.estimates.notesInternal,
          notesCustomer: schema.estimates.notesCustomer,
          notes: schema.estimates.notes,
          validUntil: schema.estimates.validUntil,
          sentAt: schema.estimates.sentAt,
          sentByUserId: schema.estimates.sentByUserId,
          approvedAt: schema.estimates.approvedAt,
          approvedBy: schema.estimates.approvedBy,
          approvedByContactId: schema.estimates.approvedByContactId,
          rejectedAt: schema.estimates.rejectedAt,
          rejectedByContactId: schema.estimates.rejectedByContactId,
          sourceSystem: schema.estimates.sourceSystem,
          externalRefId: schema.estimates.externalRefId,
          createdBy: schema.estimates.createdBy,
          createdAt: schema.estimates.createdAt,
          updatedAt: schema.estimates.updatedAt,
        })
        .from(schema.estimates)
        .leftJoin(
          schema.customers,
          eq(schema.estimates.customerId, schema.customers.id),
        )
        .leftJoin(
          schema.locations,
          eq(schema.estimates.jobSiteLocationId, schema.locations.id),
        )
        .where(
          and(
            eq(schema.estimates.id, input.id),
            eq(schema.estimates.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!estimate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Estimate not found",
        });
      }

      // Fetch all related data in parallel
      const [lineItems, historyEvents, comments, attachments, versions, recipients] =
        await Promise.all([
          ctx.db
            .select({
              id: schema.estimateLineItems.id,
              estimateId: schema.estimateLineItems.estimateId,
              lineType: schema.estimateLineItems.lineType,
              description: schema.estimateLineItems.description,
              unit: schema.estimateLineItems.unit,
              materialId: schema.estimateLineItems.materialId,
              materialName: schema.materials.name,
              originId: schema.estimateLineItems.originId,
              destinationId: schema.estimateLineItems.destinationId,
              quantity: schema.estimateLineItems.quantity,
              materialRate: schema.estimateLineItems.materialRate,
              haulRate: schema.estimateLineItems.haulRate,
              fuelSurcharge: schema.estimateLineItems.fuelSurcharge,
              lineTotal: schema.estimateLineItems.lineTotal,
              distanceMiles: schema.estimateLineItems.distanceMiles,
              estimatedDurationMinutes: schema.estimateLineItems.estimatedDurationMinutes,
              createdAt: schema.estimateLineItems.createdAt,
            })
            .from(schema.estimateLineItems)
            .leftJoin(
              schema.materials,
              eq(schema.estimateLineItems.materialId, schema.materials.id),
            )
            .where(eq(schema.estimateLineItems.estimateId, input.id)),
          ctx.db
            .select()
            .from(schema.estimateHistoryEvents)
            .where(eq(schema.estimateHistoryEvents.estimateId, input.id))
            .orderBy(desc(schema.estimateHistoryEvents.timestamp)),
          ctx.db
            .select()
            .from(schema.estimateComments)
            .where(eq(schema.estimateComments.estimateId, input.id))
            .orderBy(desc(schema.estimateComments.createdAt)),
          ctx.db
            .select()
            .from(schema.estimateAttachments)
            .where(eq(schema.estimateAttachments.estimateId, input.id))
            .orderBy(desc(schema.estimateAttachments.createdAt)),
          ctx.db
            .select()
            .from(schema.estimateVersions)
            .where(eq(schema.estimateVersions.estimateId, input.id))
            .orderBy(desc(schema.estimateVersions.versionNumber)),
          ctx.db
            .select()
            .from(schema.estimateRecipients)
            .where(eq(schema.estimateRecipients.estimateId, input.id))
            .orderBy(desc(schema.estimateRecipients.sentAt)),
        ]);

      return {
        ...estimate,
        lineItems,
        historyEvents,
        comments,
        attachments,
        versions,
        recipients,
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Create estimate (auto-generates estimateNumber, writes Created event)
  // ─────────────────────────────────────────────────────────────────────────
  create: entityProcedure
    .input(createEstimateSchema)
    .mutation(async ({ ctx, input }) => {
      const estimateNumber = await generateEstimateNumber(
        ctx.db,
        ctx.organizationId!,
      );

      // Calculate totals from line items
      let subtotal = 0;
      let fuelSurchargeTotal = 0;
      for (const item of input.lineItems) {
        const materialCost = item.materialRate * item.quantity;
        const haulCost = item.haulRate * item.quantity;
        subtotal += materialCost + haulCost;
        fuelSurchargeTotal += item.fuelSurcharge * item.quantity;
      }
      const total = subtotal + fuelSurchargeTotal;

      // Calculate validUntil date
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (input.validUntilDays ?? 30));

      const [estimate] = await ctx.db
        .insert(schema.estimates)
        .values({
          entityId: ctx.organizationId!,
          customerId: input.customerId,
          estimateNumber,
          status: "draft",
          subtotal: String(subtotal),
          fuelSurchargeTotal: String(fuelSurchargeTotal),
          total: String(total),
          validUntil: validUntil.toISOString().split("T")[0],
          notes: input.notes,
          notesInternal: input.notes, // copy to new field too
          createdBy: ctx.userId,
        })
        .returning();

      // Insert line items
      if (input.lineItems.length > 0) {
        await ctx.db.insert(schema.estimateLineItems).values(
          input.lineItems.map((item) => ({
            estimateId: estimate.id,
            lineType: "material" as const,
            unit: "ton" as const,
            materialId: item.materialId,
            originId: item.originId,
            destinationId: item.destinationId,
            quantity: String(item.quantity),
            materialRate: String(item.materialRate),
            haulRate: String(item.haulRate),
            fuelSurcharge: String(item.fuelSurcharge),
            lineTotal: String(item.lineTotal),
            distanceMiles: item.distanceMiles
              ? String(item.distanceMiles)
              : null,
            estimatedDurationMinutes: item.estimatedDurationMinutes ?? null,
          })),
        );
      }

      // Write history event
      await writeCreatedEvent(ctx.db, estimate.id, ctx.userId!, "Admin");

      return estimate;
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Update estimate (Draft only — full header + line items replacement)
  // ─────────────────────────────────────────────────────────────────────────
  update: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        customerId: z.string().uuid().optional(),
        jobSiteLocationId: z.string().uuid().nullable().optional(),
        projectId: z.string().uuid().nullable().optional(),
        market: z.string().nullable().optional(),
        notesInternal: z.string().nullable().optional(),
        notesCustomer: z.string().nullable().optional(),
        validUntilDays: z.number().int().positive().optional(),
        lineItems: z
          .array(
            z.object({
              id: z.string().uuid().optional(), // existing item id
              lineType: z.string().default("material"),
              description: z.string().nullable().optional(),
              unit: z.string().default("ton"),
              materialId: z.string().uuid().optional().nullable(),
              originId: z.string().uuid().optional().nullable(),
              destinationId: z.string().uuid().optional().nullable(),
              quantity: z.number().nonnegative(),
              materialRate: z.number().nonnegative(),
              haulRate: z.number().nonnegative(),
              fuelSurcharge: z.number().nonnegative(),
              lineTotal: z.number().nonnegative(),
              distanceMiles: z.number().nonnegative().optional(),
              estimatedDurationMinutes: z.number().nonnegative().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch current estimate
      const [existing] = await ctx.db
        .select()
        .from(schema.estimates)
        .where(
          and(
            eq(schema.estimates.id, input.id),
            eq(schema.estimates.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Estimate not found",
        });
      }

      if (existing.status !== "draft") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Estimates can only be edited in Draft status. To make changes, recall to Draft first.",
        });
      }

      // Build header update
      const headerUpdate: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (input.customerId !== undefined)
        headerUpdate.customerId = input.customerId;
      if (input.jobSiteLocationId !== undefined)
        headerUpdate.jobSiteLocationId = input.jobSiteLocationId;
      if (input.projectId !== undefined)
        headerUpdate.projectId = input.projectId;
      if (input.market !== undefined) headerUpdate.market = input.market;
      if (input.notesInternal !== undefined)
        headerUpdate.notesInternal = input.notesInternal;
      if (input.notesCustomer !== undefined)
        headerUpdate.notesCustomer = input.notesCustomer;
      if (input.validUntilDays !== undefined) {
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + input.validUntilDays);
        headerUpdate.validUntil = validUntil.toISOString().split("T")[0];
      }

      // If line items provided, recalculate totals and replace all items
      if (input.lineItems) {
        let subtotal = 0;
        let fuelSurchargeTotal = 0;
        for (const item of input.lineItems) {
          subtotal += item.materialRate * item.quantity + item.haulRate * item.quantity;
          fuelSurchargeTotal += item.fuelSurcharge * item.quantity;
        }
        headerUpdate.subtotal = String(subtotal);
        headerUpdate.fuelSurchargeTotal = String(fuelSurchargeTotal);
        headerUpdate.total = String(subtotal + fuelSurchargeTotal);

        // Delete old line items and insert new ones
        await ctx.db
          .delete(schema.estimateLineItems)
          .where(eq(schema.estimateLineItems.estimateId, input.id));

        if (input.lineItems.length > 0) {
          await ctx.db.insert(schema.estimateLineItems).values(
            input.lineItems.map((item) => ({
              estimateId: input.id,
              lineType: item.lineType,
              description: item.description ?? null,
              unit: item.unit,
              materialId: item.materialId ?? null,
              originId: item.originId ?? null,
              destinationId: item.destinationId ?? null,
              quantity: String(item.quantity),
              materialRate: String(item.materialRate),
              haulRate: String(item.haulRate),
              fuelSurcharge: String(item.fuelSurcharge),
              lineTotal: String(item.lineTotal),
              distanceMiles: item.distanceMiles
                ? String(item.distanceMiles)
                : null,
              estimatedDurationMinutes:
                item.estimatedDurationMinutes ?? null,
            })),
          );
        }

        // Write line items history event
        await writeEstimateEvent(ctx.db, {
          estimateId: input.id,
          actorType: "user",
          actorId: ctx.userId,
          actorLabel: "Admin",
          eventType: "updated",
          meta: { lineItemsReplaced: true, lineItemCount: input.lineItems.length },
        });
      }

      const [updated] = await ctx.db
        .update(schema.estimates)
        .set(headerUpdate)
        .where(eq(schema.estimates.id, input.id))
        .returning();

      // Write header update history event
      await writeEstimateEvent(ctx.db, {
        estimateId: input.id,
        actorType: "user",
        actorId: ctx.userId,
        actorLabel: "Admin",
        eventType: "updated",
        meta: { fields: Object.keys(headerUpdate).filter((k) => k !== "updatedAt") },
      });

      return updated;
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Update status (validates transition, writes history)
  // ─────────────────────────────────────────────────────────────────────────
  updateStatus: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum([
          "draft",
          "sent",
          "viewed",
          "approved",
          "rejected",
          "expired",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(schema.estimates)
        .where(
          and(
            eq(schema.estimates.id, input.id),
            eq(schema.estimates.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Estimate not found",
        });
      }

      const allowedTransitions =
        ESTIMATE_TRANSITIONS[existing.status as string] ?? [];
      if (!allowedTransitions.includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition estimate from "${existing.status}" to "${input.status}"`,
        });
      }

      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };

      if (input.status === "approved") {
        updateData.approvedAt = new Date();
        updateData.approvedBy = ctx.userId;
      }
      if (input.status === "rejected") {
        updateData.rejectedAt = new Date();
      }

      const [estimate] = await ctx.db
        .update(schema.estimates)
        .set(updateData)
        .where(eq(schema.estimates.id, input.id))
        .returning();

      // Write history event
      await writeStatusChangedEvent(
        ctx.db,
        input.id,
        "user",
        ctx.userId,
        "Admin",
        existing.status,
        input.status,
      );

      return estimate;
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Send estimate (creates version, tokens, recipients, sends email)
  // ─────────────────────────────────────────────────────────────────────────
  send: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        recipientEmails: z.array(z.string().email()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(schema.estimates)
        .where(
          and(
            eq(schema.estimates.id, input.id),
            eq(schema.estimates.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Estimate not found",
        });
      }

      if (existing.status !== "draft" && existing.status !== "sent") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot send an estimate in "${existing.status}" status. Only Draft or Sent estimates can be sent.`,
        });
      }

      // 1. Create version snapshot
      const snapshotJson = await buildVersionSnapshot(ctx.db, input.id);
      const versionNumber = await getNextVersionNumber(ctx.db, input.id);

      const [version] = await ctx.db
        .insert(schema.estimateVersions)
        .values({
          estimateId: input.id,
          versionNumber,
          createdByUserId: ctx.userId,
          snapshotJson,
        })
        .returning();

      // 2. Create recipients and access tokens
      const tokens: string[] = [];
      for (const email of input.recipientEmails) {
        const token = generateAccessToken();
        tokens.push(token);

        await ctx.db.insert(schema.estimateRecipients).values({
          estimateId: input.id,
          email,
          sentAt: new Date(),
          deliveryStatus: "sent",
        });

        await ctx.db.insert(schema.estimateAccessTokens).values({
          token,
          estimateId: input.id,
          estimateVersionId: version.id,
          recipientEmail: email,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          permissions: "approve_reject",
        });
      }

      // 3. Update estimate status
      await ctx.db
        .update(schema.estimates)
        .set({
          status: "sent",
          sentAt: new Date(),
          sentByUserId: ctx.userId,
          updatedAt: new Date(),
        })
        .where(eq(schema.estimates.id, input.id));

      // 4. Write history event
      await writeEstimateEvent(ctx.db, {
        estimateId: input.id,
        actorType: "user",
        actorId: ctx.userId,
        actorLabel: "Admin",
        eventType: "sent",
        meta: {
          recipients: input.recipientEmails,
          versionNumber,
          versionId: version.id,
        },
      });

      // 5. Attempt to send emails (graceful — don't fail the mutation)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      try {
        // Dynamic import to avoid hard dependency
        const { sendEmail } = await import("../services/email");
        for (let i = 0; i < input.recipientEmails.length; i++) {
          const recipientEmail = input.recipientEmails[i];
          const token = tokens[i];
          await sendEmail({
            to: recipientEmail,
            subject: `Estimate ${existing.estimateNumber} — Ryland Logistics`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Estimate ${existing.estimateNumber}</h2>
                <p>You've received an estimate from Ryland Logistics.</p>
                <p><strong>Total:</strong> $${Number(existing.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                ${existing.validUntil ? `<p><strong>Valid until:</strong> ${existing.validUntil}</p>` : ""}
                <p>
                  <a href="${appUrl}/estimate/view/${token}"
                     style="display:inline-block;padding:12px 24px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px;">
                    View Estimate
                  </a>
                </p>
                <p style="color:#6b7280;font-size:13px;">This link will expire in 30 days.</p>
              </div>
            `,
          }).catch(() => {
            // email send failed silently
          });
        }
      } catch {
        // Email service not configured — that's OK
      }

      return {
        success: true,
        versionNumber,
        tokenCount: tokens.length,
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Duplicate estimate (creates a new Draft from existing)
  // ─────────────────────────────────────────────────────────────────────────
  duplicate: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [source] = await ctx.db
        .select()
        .from(schema.estimates)
        .where(
          and(
            eq(schema.estimates.id, input.id),
            eq(schema.estimates.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Estimate not found",
        });
      }

      const estimateNumber = await generateEstimateNumber(
        ctx.db,
        ctx.organizationId!,
      );

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      const [newEstimate] = await ctx.db
        .insert(schema.estimates)
        .values({
          entityId: ctx.organizationId!,
          customerId: source.customerId,
          estimateNumber,
          status: "draft",
          subtotal: source.subtotal,
          fuelSurchargeTotal: source.fuelSurchargeTotal,
          total: source.total,
          jobSiteLocationId: source.jobSiteLocationId,
          projectId: source.projectId,
          market: source.market,
          currency: source.currency,
          notesInternal: source.notesInternal,
          notesCustomer: source.notesCustomer,
          validUntil: validUntil.toISOString().split("T")[0],
          createdBy: ctx.userId,
        })
        .returning();

      // Copy line items
      const sourceItems = await ctx.db
        .select()
        .from(schema.estimateLineItems)
        .where(eq(schema.estimateLineItems.estimateId, input.id));

      if (sourceItems.length > 0) {
        await ctx.db.insert(schema.estimateLineItems).values(
          sourceItems.map((item: any) => ({
            estimateId: newEstimate.id,
            lineType: item.lineType,
            description: item.description,
            unit: item.unit,
            materialId: item.materialId,
            originId: item.originId,
            destinationId: item.destinationId,
            quantity: item.quantity,
            materialRate: item.materialRate,
            haulRate: item.haulRate,
            fuelSurcharge: item.fuelSurcharge,
            lineTotal: item.lineTotal,
            distanceMiles: item.distanceMiles,
            estimatedDurationMinutes: item.estimatedDurationMinutes,
          })),
        );
      }

      await writeCreatedEvent(
        ctx.db,
        newEstimate.id,
        ctx.userId!,
        "Admin",
      );

      return newEstimate;
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Add comment
  // ─────────────────────────────────────────────────────────────────────────
  addComment: entityProcedure
    .input(
      z.object({
        estimateId: z.string().uuid(),
        body: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [comment] = await ctx.db
        .insert(schema.estimateComments)
        .values({
          estimateId: input.estimateId,
          authorType: "user",
          authorId: ctx.userId,
          authorLabel: "Admin",
          body: input.body,
        })
        .returning();

      await writeEstimateEvent(ctx.db, {
        estimateId: input.estimateId,
        actorType: "user",
        actorId: ctx.userId,
        actorLabel: "Admin",
        eventType: "commented",
        meta: { commentId: comment.id, body: input.body },
      });

      return comment;
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // List comments
  // ─────────────────────────────────────────────────────────────────────────
  listComments: entityProcedure
    .input(z.object({ estimateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(schema.estimateComments)
        .where(eq(schema.estimateComments.estimateId, input.estimateId))
        .orderBy(desc(schema.estimateComments.createdAt));
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Add attachment
  // ─────────────────────────────────────────────────────────────────────────
  addAttachment: entityProcedure
    .input(
      z.object({
        estimateId: z.string().uuid(),
        fileUrl: z.string().url(),
        fileName: z.string().min(1),
        mimeType: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [attachment] = await ctx.db
        .insert(schema.estimateAttachments)
        .values({
          estimateId: input.estimateId,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          mimeType: input.mimeType ?? null,
          uploadedBy: ctx.userId,
        })
        .returning();

      await writeEstimateEvent(ctx.db, {
        estimateId: input.estimateId,
        actorType: "user",
        actorId: ctx.userId,
        actorLabel: "Admin",
        eventType: "attachment_added",
        meta: { attachmentId: attachment.id, fileName: input.fileName },
      });

      return attachment;
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Remove attachment
  // ─────────────────────────────────────────────────────────────────────────
  removeAttachment: entityProcedure
    .input(
      z.object({
        estimateId: z.string().uuid(),
        attachmentId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [attachment] = await ctx.db
        .select()
        .from(schema.estimateAttachments)
        .where(
          and(
            eq(schema.estimateAttachments.id, input.attachmentId),
            eq(
              schema.estimateAttachments.estimateId,
              input.estimateId,
            ),
          ),
        )
        .limit(1);

      if (!attachment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attachment not found",
        });
      }

      await ctx.db
        .delete(schema.estimateAttachments)
        .where(eq(schema.estimateAttachments.id, input.attachmentId));

      await writeEstimateEvent(ctx.db, {
        estimateId: input.estimateId,
        actorType: "user",
        actorId: ctx.userId,
        actorLabel: "Admin",
        eventType: "attachment_removed",
        meta: {
          attachmentId: input.attachmentId,
          fileName: attachment.fileName,
        },
      });

      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // List attachments
  // ─────────────────────────────────────────────────────────────────────────
  listAttachments: entityProcedure
    .input(z.object({ estimateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(schema.estimateAttachments)
        .where(
          eq(schema.estimateAttachments.estimateId, input.estimateId),
        )
        .orderBy(desc(schema.estimateAttachments.createdAt));
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // List history events
  // ─────────────────────────────────────────────────────────────────────────
  listHistory: entityProcedure
    .input(z.object({ estimateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(schema.estimateHistoryEvents)
        .where(
          eq(
            schema.estimateHistoryEvents.estimateId,
            input.estimateId,
          ),
        )
        .orderBy(desc(schema.estimateHistoryEvents.timestamp));
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // List versions
  // ─────────────────────────────────────────────────────────────────────────
  listVersions: entityProcedure
    .input(z.object({ estimateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(schema.estimateVersions)
        .where(
          eq(schema.estimateVersions.estimateId, input.estimateId),
        )
        .orderBy(desc(schema.estimateVersions.versionNumber));
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Mark expired estimates (sent + past validUntil)
  // ─────────────────────────────────────────────────────────────────────────
  markExpired: entityProcedure.mutation(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];

    const expired = await ctx.db
      .update(schema.estimates)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.estimates.entityId, ctx.organizationId!),
          eq(schema.estimates.status, "sent"),
          lt(schema.estimates.validUntil, today),
        ),
      )
      .returning();

    return { markedExpired: expired.length };
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Delete estimate (soft-delete / set to rejected)
  // ─────────────────────────────────────────────────────────────────────────
  delete: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [estimate] = await ctx.db
        .update(schema.estimates)
        .set({
          status: "rejected",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.estimates.id, input.id),
            eq(schema.estimates.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!estimate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Estimate not found",
        });
      }

      return { success: true };
    }),
});
