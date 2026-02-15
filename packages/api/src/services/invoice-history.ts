/**
 * Invoice History Event Writer
 *
 * Utility for writing immutable activity log entries for invoices.
 * Every mutation on an invoice should call `writeInvoiceEvent` to maintain
 * a full audit trail.
 */

import * as schema from "@aggregateos/db";
import type { InvoiceEventType } from "@aggregateos/shared";

export type ActorType = "user" | "system";

export interface WriteInvoiceEventParams {
  invoiceId: string;
  actorType: ActorType;
  actorId?: string | null;
  actorLabel: string;
  eventType: InvoiceEventType;
  meta?: Record<string, unknown>;
}

/**
 * Insert an immutable history event row for an invoice.
 */
export async function writeInvoiceEvent(
  db: any,
  params: WriteInvoiceEventParams,
) {
  const [event] = await db
    .insert(schema.invoiceHistoryEvents)
    .values({
      invoiceId: params.invoiceId,
      actorType: params.actorType,
      actorId: params.actorId ?? null,
      actorLabel: params.actorLabel,
      eventType: params.eventType,
      meta: params.meta ?? {},
    })
    .returning();

  return event;
}

/**
 * Convenience: write a "Created" event.
 */
export function writeCreatedEvent(
  db: any,
  invoiceId: string,
  userId: string,
  userLabel: string,
) {
  return writeInvoiceEvent(db, {
    invoiceId,
    actorType: "user",
    actorId: userId,
    actorLabel: userLabel,
    eventType: "created",
    meta: {},
  });
}

/**
 * Convenience: write a "StatusChanged" event.
 */
export function writeStatusChangedEvent(
  db: any,
  invoiceId: string,
  actorType: ActorType,
  actorId: string | null,
  actorLabel: string,
  fromStatus: string,
  toStatus: string,
) {
  return writeInvoiceEvent(db, {
    invoiceId,
    actorType,
    actorId,
    actorLabel,
    eventType: "status_changed",
    meta: { from: fromStatus, to: toStatus },
  });
}
