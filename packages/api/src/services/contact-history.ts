/**
 * Contact History Event Writer
 *
 * Utility for writing immutable activity log entries for contacts.
 * Every mutation on a contact should call `writeContactEvent` to maintain
 * a full audit trail.
 */

import * as schema from "@aggregateos/db";
import type { ContactEventType } from "@aggregateos/shared";

export type ActorType = "user" | "system";

export interface WriteContactEventParams {
  contactId: string;
  actorType: ActorType;
  actorId?: string | null;
  actorLabel: string;
  eventType: ContactEventType;
  meta?: Record<string, unknown>;
}

export async function writeContactEvent(
  db: any,
  params: WriteContactEventParams,
) {
  const [event] = await db
    .insert(schema.contactHistoryEvents)
    .values({
      contactId: params.contactId,
      actorType: params.actorType,
      actorId: params.actorId ?? null,
      actorLabel: params.actorLabel,
      eventType: params.eventType,
      meta: params.meta ?? {},
    })
    .returning();

  return event;
}

export function writeContactCreatedEvent(
  db: any,
  contactId: string,
  userId: string,
  userLabel: string,
) {
  return writeContactEvent(db, {
    contactId,
    actorType: "user",
    actorId: userId,
    actorLabel: userLabel,
    eventType: "created",
  });
}

export function writeContactUpdatedEvent(
  db: any,
  contactId: string,
  userId: string,
  userLabel: string,
  fields: string[],
) {
  return writeContactEvent(db, {
    contactId,
    actorType: "user",
    actorId: userId,
    actorLabel: userLabel,
    eventType: "updated",
    meta: { fields },
  });
}
