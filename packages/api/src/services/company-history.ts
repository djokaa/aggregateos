/**
 * Company History Event Writer
 *
 * Utility for writing immutable activity log entries for companies.
 * Every mutation on a company should call `writeCompanyEvent` to maintain
 * a full audit trail.
 */

import * as schema from "@aggregateos/db";
import type { CompanyEventType } from "@aggregateos/shared";

export type ActorType = "user" | "system";

export interface WriteCompanyEventParams {
  companyId: string;
  actorType: ActorType;
  actorId?: string | null;
  actorLabel: string;
  eventType: CompanyEventType;
  meta?: Record<string, unknown>;
}

export async function writeCompanyEvent(
  db: any,
  params: WriteCompanyEventParams,
) {
  const [event] = await db
    .insert(schema.companyHistoryEvents)
    .values({
      companyId: params.companyId,
      actorType: params.actorType,
      actorId: params.actorId ?? null,
      actorLabel: params.actorLabel,
      eventType: params.eventType,
      meta: params.meta ?? {},
    })
    .returning();

  return event;
}

export function writeCompanyCreatedEvent(
  db: any,
  companyId: string,
  userId: string,
  userLabel: string,
) {
  return writeCompanyEvent(db, {
    companyId,
    actorType: "user",
    actorId: userId,
    actorLabel: userLabel,
    eventType: "created",
  });
}

export function writeCompanyUpdatedEvent(
  db: any,
  companyId: string,
  userId: string,
  userLabel: string,
  fields: string[],
) {
  return writeCompanyEvent(db, {
    companyId,
    actorType: "user",
    actorId: userId,
    actorLabel: userLabel,
    eventType: "updated",
    meta: { fields },
  });
}
