import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { orders } from "./orders";
import { users } from "./users";

/**
 * Dispatches — the event record of dispatching one or many loads for an order.
 * A single dispatch event may create N loads and assign them to drivers.
 */
export const dispatches = pgTable(
  "dispatches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    dispatchedBy: uuid("dispatched_by").references(() => users.id),
    loadCount: integer("load_count").notNull().default(1),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("dispatches_entity_id_idx").on(table.entityId),
    index("dispatches_order_id_idx").on(table.orderId),
  ],
);

export const dispatchesRelations = relations(dispatches, ({ one }) => ({
  entity: one(organizations, {
    fields: [dispatches.entityId],
    references: [organizations.id],
  }),
  order: one(orders, {
    fields: [dispatches.orderId],
    references: [orders.id],
  }),
  dispatcher: one(users, {
    fields: [dispatches.dispatchedBy],
    references: [users.id],
  }),
}));
