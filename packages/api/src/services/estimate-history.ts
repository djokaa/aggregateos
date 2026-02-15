/**
 * Estimate History Event Writer
 *
 * Utility for writing immutable activity log entries for estimates.
 * Every mutation on an estimate (create, edit, send, approve, reject, etc.)
 * should call `writeEstimateEvent` to maintain a full audit trail.
 */

import * as schema from "@aggregateos/db";

// The db parameter accepts any Drizzle PG instance (including transaction handles)
type DrizzleDb = Parameters<typeof schema.estimateHistoryEvents._.columns.id.mapFromDriverValue> extends never
  ? any
  : any;

export type EstimateEventType =
  | "created"
  | "updated"
  | "line_item_added"
  | "line_item_updated"
  | "line_item_removed"
  | "sent"
  | "viewed"
  | "commented"
  | "approved"
  | "rejected"
  | "attachment_added"
  | "attachment_removed"
  | "status_changed";

export type ActorType = "user" | "customer" | "system";

export interface WriteEstimateEventParams {
  estimateId: string;
  actorType: ActorType;
  actorId?: string | null;
  actorLabel: string;
  eventType: EstimateEventType;
  meta?: Record<string, unknown>;
}

/**
 * Insert an immutable history event row for an estimate.
 *
 * @param db - Drizzle database instance (or transaction handle)
 * @param params - Event parameters
 * @returns The newly created history event row
 */
export async function writeEstimateEvent(
  db: any,
  params: WriteEstimateEventParams,
) {
  const [event] = await db
    .insert(schema.estimateHistoryEvents)
    .values({
      estimateId: params.estimateId,
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
  estimateId: string,
  userId: string,
  userLabel: string,
) {
  return writeEstimateEvent(db, {
    estimateId,
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
  estimateId: string,
  actorType: ActorType,
  actorId: string | null,
  actorLabel: string,
  fromStatus: string,
  toStatus: string,
) {
  return writeEstimateEvent(db, {
    estimateId,
    actorType,
    actorId,
    actorLabel,
    eventType: "status_changed",
    meta: { from: fromStatus, to: toStatus },
  });
}
