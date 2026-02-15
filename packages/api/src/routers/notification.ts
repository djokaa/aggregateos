/**
 * Notification router — send emails and SMS from the application.
 *
 * Provides procedures for:
 * - Sending estimates to customers (email)
 * - Sending invoices to customers (email)
 * - Alerting drivers of new assignments (SMS + email)
 * - Checking notification service health
 *
 * @module notification-router
 */

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as schema from "@aggregateos/db";
import { router, entityProcedure } from "../trpc";
import {
  sendEstimateEmail,
  sendInvoiceEmail,
  sendLoadAssignmentEmail,
  isEmailConfigured,
} from "../services/email";
import {
  smsLoadAssignment,
  isSmsConfigured,
} from "../services/sms";

export const notificationRouter = router({
  /**
   * Send an estimate to the customer via email.
   */
  sendEstimate: entityProcedure
    .input(
      z.object({
        estimateId: z.string().uuid(),
        recipientEmail: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch the estimate
      const [estimate] = await ctx.db
        .select()
        .from(schema.estimates)
        .where(
          and(
            eq(schema.estimates.id, input.estimateId),
            eq(schema.estimates.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!estimate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Estimate not found" });
      }

      // Fetch customer name
      const [customer] = await ctx.db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, estimate.customerId))
        .limit(1);

      const lineItems = await ctx.db
        .select()
        .from(schema.estimateLineItems)
        .where(eq(schema.estimateLineItems.estimateId, input.estimateId));

      const result = await sendEstimateEmail({
        to: input.recipientEmail,
        customerName: customer?.name || "Customer",
        estimateNumber: estimate.estimateNumber,
        estimateId: estimate.id,
        total: `$${parseFloat(estimate.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        validUntil: estimate.validUntil || "30 days",
        lineItemCount: lineItems.length,
      });

      // Update estimate status to "sent" if currently draft
      if (estimate.status === "draft") {
        await ctx.db
          .update(schema.estimates)
          .set({ status: "sent", updatedAt: new Date() })
          .where(eq(schema.estimates.id, input.estimateId));
      }

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    }),

  /**
   * Send an invoice to the customer via email.
   */
  sendInvoice: entityProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
        recipientEmail: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      const [customer] = await ctx.db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, invoice.customerId))
        .limit(1);

      const dueDateFormatted =
        invoice.dueDate instanceof Date
          ? invoice.dueDate.toLocaleDateString("en-US")
          : String(invoice.dueDate);

      const result = await sendInvoiceEmail({
        to: input.recipientEmail,
        customerName: customer?.name || "Customer",
        invoiceNumber: invoice.invoiceNumber,
        total: `$${parseFloat(invoice.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        dueDate: dueDateFormatted,
      });

      // Update invoice status to "sent" if currently draft
      if (invoice.status === "draft") {
        await ctx.db
          .update(schema.invoices)
          .set({ status: "sent", updatedAt: new Date() })
          .where(eq(schema.invoices.id, input.invoiceId));
      }

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    }),

  /**
   * Notify a driver about a load assignment (SMS + email).
   */
  notifyDriverAssignment: entityProcedure
    .input(
      z.object({
        loadId: z.string().uuid(),
        driverId: z.string().uuid(),
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

      const [driver] = await ctx.db
        .select()
        .from(schema.drivers)
        .where(
          and(
            eq(schema.drivers.id, input.driverId),
            eq(schema.drivers.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!load || !driver) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Load or driver not found",
        });
      }

      const results = {
        sms: { success: false, error: "Not sent" } as {
          success: boolean;
          error?: string;
        },
        email: { success: false, error: "Not sent" } as {
          success: boolean;
          error?: string;
        },
      };

      // Send SMS if driver has a phone number
      if (driver.phone) {
        results.sms = await smsLoadAssignment({
          to: driver.phone,
          driverName: driver.name,
          loadNumber: load.loadNumber,
        });
      }

      // Send email if driver has an email address
      if (driver.email) {
        results.email = await sendLoadAssignmentEmail({
          to: driver.email,
          driverName: driver.name,
          loadNumber: load.loadNumber,
        });
      }

      return results;
    }),

  /**
   * Check the health of notification services.
   */
  health: entityProcedure.query(async () => {
    return {
      email: { configured: isEmailConfigured, provider: "Resend" },
      sms: { configured: isSmsConfigured, provider: "Twilio" },
    };
  }),
});
