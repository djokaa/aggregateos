/**
 * Estimate Token Validation Helper
 *
 * Validates magic link tokens for customer-facing estimate views.
 */

import { eq, and } from "drizzle-orm";
import * as schema from "@aggregateos/db";
import { TRPCError } from "@trpc/server";

export interface ValidTokenResult {
  valid: true;
  accessToken: typeof schema.estimateAccessTokens.$inferSelect;
  estimate: typeof schema.estimates.$inferSelect;
  lineItems: (typeof schema.estimateLineItems.$inferSelect)[];
  customerName: string | null;
  jobSiteName: string | null;
}

/**
 * Validate an estimate access token.
 * Returns the access token, estimate, and line items if valid.
 * Throws a TRPCError if the token is invalid, expired, or already used.
 */
export async function validateEstimateToken(
  db: any,
  token: string,
): Promise<ValidTokenResult> {
  // Find the token
  const [accessToken] = await db
    .select()
    .from(schema.estimateAccessTokens)
    .where(eq(schema.estimateAccessTokens.token, token))
    .limit(1);

  if (!accessToken) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invalid or expired estimate link.",
    });
  }

  // Check expiry
  if (new Date() > new Date(accessToken.expiresAt)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This estimate link has expired.",
    });
  }

  // Fetch estimate with customer name
  const [estimateRow] = await db
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
      market: schema.estimates.market,
      currency: schema.estimates.currency,
      notesCustomer: schema.estimates.notesCustomer,
      validUntil: schema.estimates.validUntil,
      sentAt: schema.estimates.sentAt,
      approvedAt: schema.estimates.approvedAt,
      rejectedAt: schema.estimates.rejectedAt,
      createdAt: schema.estimates.createdAt,
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
    .where(eq(schema.estimates.id, accessToken.estimateId))
    .limit(1);

  if (!estimateRow) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Estimate not found.",
    });
  }

  // Fetch line items with material names
  const lineItems = await db
    .select({
      id: schema.estimateLineItems.id,
      lineType: schema.estimateLineItems.lineType,
      description: schema.estimateLineItems.description,
      unit: schema.estimateLineItems.unit,
      materialName: schema.materials.name,
      quantity: schema.estimateLineItems.quantity,
      materialRate: schema.estimateLineItems.materialRate,
      haulRate: schema.estimateLineItems.haulRate,
      fuelSurcharge: schema.estimateLineItems.fuelSurcharge,
      lineTotal: schema.estimateLineItems.lineTotal,
    })
    .from(schema.estimateLineItems)
    .leftJoin(
      schema.materials,
      eq(schema.estimateLineItems.materialId, schema.materials.id),
    )
    .where(eq(schema.estimateLineItems.estimateId, accessToken.estimateId));

  return {
    valid: true,
    accessToken,
    estimate: estimateRow as any,
    lineItems,
    customerName: estimateRow.customerName,
    jobSiteName: estimateRow.jobSiteName,
  };
}
