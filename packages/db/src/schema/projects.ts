import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { customers } from "./customers";

/**
 * Projects — long-running job umbrella that groups orders, loads, and invoices.
 * E.g. "I-85 Bridge Expansion" is a project under customer "DOT Highway Division".
 */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 30 })
      .notNull()
      .default("active"), // active, completed, on_hold, cancelled
    startDate: date("start_date"),
    endDate: date("end_date"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("projects_entity_id_idx").on(table.entityId),
    index("projects_customer_id_idx").on(table.customerId),
    index("projects_status_idx").on(table.status),
  ],
);

export const projectsRelations = relations(projects, ({ one }) => ({
  entity: one(organizations, {
    fields: [projects.entityId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [projects.customerId],
    references: [customers.id],
  }),
}));
