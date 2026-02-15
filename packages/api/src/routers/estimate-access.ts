/**
 * Estimate Access Router — Public (token-validated, no auth required)
 *
 * These procedures are used by the customer-facing estimate view page.
 * All actions are authenticated via the magic link token, not Clerk.
 */

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { router, publicProcedure } from "../trpc";
import { validateEstimateToken } from "../lib/estimate-token";
import { writeEstimateEvent, writeStatusChangedEvent } from "../services/estimate-history";

export const estimateAccessRouter = router({
  // ─────────────────────────────────────────────────────────────────────────
  // Validate token + return estimate data (customer view page load)
  // ─────────────────────────────────────────────────────────────────────────
  validateToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      const result = await validateEstimateToken(ctx.db, input.token);

      // Fetch comments visible to customer
      const comments = await ctx.db
        .select()
        .from(schema.estimateComments)
        .where(
          eq(
            schema.estimateComments.estimateId,
            result.accessToken.estimateId,
          ),
        );

      return {
        estimate: result.estimate,
        lineItems: result.lineItems,
        comments,
        customerName: result.customerName,
        jobSiteName: result.jobSiteName,
        permissions: result.accessToken.permissions,
        recipientEmail: result.accessToken.recipientEmail,
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Mark estimate as viewed (called once on page load, de-duped)
  // ─────────────────────────────────────────────────────────────────────────
  markViewed: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      const result = await validateEstimateToken(ctx.db, input.token);
      const { accessToken } = result;

      // Update recipient lastViewedAt
      await ctx.db
        .update(schema.estimateRecipients)
        .set({ lastViewedAt: new Date() })
        .where(
          and(
            eq(
              schema.estimateRecipients.estimateId,
              accessToken.estimateId,
            ),
            eq(
              schema.estimateRecipients.email,
              accessToken.recipientEmail,
            ),
          ),
        );

      // Write Viewed event (de-duped — only write if status is still "sent")
      const estimate = result.estimate as any;
      if (estimate.status === "sent") {
        await ctx.db
          .update(schema.estimates)
          .set({ status: "viewed", updatedAt: new Date() })
          .where(eq(schema.estimates.id, accessToken.estimateId));

        await writeStatusChangedEvent(
          ctx.db,
          accessToken.estimateId,
          "customer",
          null,
          accessToken.recipientEmail,
          "sent",
          "viewed",
        );
      }

      await writeEstimateEvent(ctx.db, {
        estimateId: accessToken.estimateId,
        actorType: "customer",
        actorId: null,
        actorLabel: accessToken.recipientEmail,
        eventType: "viewed",
        meta: { recipientEmail: accessToken.recipientEmail },
      });

      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Approve estimate
  // ─────────────────────────────────────────────────────────────────────────
  approve: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        comment: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      const result = await validateEstimateToken(ctx.db, input.token);
      const { accessToken } = result;

      if (accessToken.permissions !== "approve_reject") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to approve this estimate.",
        });
      }

      const estimate = result.estimate as any;
      if (estimate.status !== "sent" && estimate.status !== "viewed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot approve an estimate in "${estimate.status}" status.`,
        });
      }

      // Update estimate status
      await ctx.db
        .update(schema.estimates)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy: accessToken.recipientEmail,
          updatedAt: new Date(),
        })
        .where(eq(schema.estimates.id, accessToken.estimateId));

      // Mark token as used
      await ctx.db
        .update(schema.estimateAccessTokens)
        .set({ usedAt: new Date() })
        .where(eq(schema.estimateAccessTokens.id, accessToken.id));

      // Write history event
      await writeEstimateEvent(ctx.db, {
        estimateId: accessToken.estimateId,
        actorType: "customer",
        actorId: null,
        actorLabel: accessToken.recipientEmail,
        eventType: "approved",
        meta: {
          versionId: accessToken.estimateVersionId,
          recipientEmail: accessToken.recipientEmail,
        },
      });

      // Add optional comment
      if (input.comment) {
        await ctx.db.insert(schema.estimateComments).values({
          estimateId: accessToken.estimateId,
          authorType: "customer",
          authorLabel: accessToken.recipientEmail,
          body: input.comment,
        });
      }

      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Reject estimate (requires reason)
  // ─────────────────────────────────────────────────────────────────────────
  reject: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        reason: z.string().min(1, "Rejection reason is required").max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      const result = await validateEstimateToken(ctx.db, input.token);
      const { accessToken } = result;

      if (accessToken.permissions !== "approve_reject") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to reject this estimate.",
        });
      }

      const estimate = result.estimate as any;
      if (estimate.status !== "sent" && estimate.status !== "viewed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot reject an estimate in "${estimate.status}" status.`,
        });
      }

      // Update estimate
      await ctx.db
        .update(schema.estimates)
        .set({
          status: "rejected",
          rejectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.estimates.id, accessToken.estimateId));

      // Mark token as used
      await ctx.db
        .update(schema.estimateAccessTokens)
        .set({ usedAt: new Date() })
        .where(eq(schema.estimateAccessTokens.id, accessToken.id));

      // Write rejection reason as a comment
      await ctx.db.insert(schema.estimateComments).values({
        estimateId: accessToken.estimateId,
        authorType: "customer",
        authorLabel: accessToken.recipientEmail,
        body: input.reason,
      });

      // Write history event
      await writeEstimateEvent(ctx.db, {
        estimateId: accessToken.estimateId,
        actorType: "customer",
        actorId: null,
        actorLabel: accessToken.recipientEmail,
        eventType: "rejected",
        meta: {
          reason: input.reason,
          versionId: accessToken.estimateVersionId,
          recipientEmail: accessToken.recipientEmail,
        },
      });

      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // Add comment (customer)
  // ─────────────────────────────────────────────────────────────────────────
  addComment: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        body: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      const result = await validateEstimateToken(ctx.db, input.token);
      const { accessToken } = result;

      if (
        accessToken.permissions !== "approve_reject" &&
        accessToken.permissions !== "comment"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to comment.",
        });
      }

      const [comment] = await ctx.db
        .insert(schema.estimateComments)
        .values({
          estimateId: accessToken.estimateId,
          authorType: "customer",
          authorLabel: accessToken.recipientEmail,
          body: input.body,
        })
        .returning();

      await writeEstimateEvent(ctx.db, {
        estimateId: accessToken.estimateId,
        actorType: "customer",
        actorId: null,
        actorLabel: accessToken.recipientEmail,
        eventType: "commented",
        meta: {
          commentId: comment.id,
          body: input.body,
        },
      });

      return comment;
    }),
});
