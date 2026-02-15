import {
  pgTable,
  uuid,
  varchar,
  numeric,
  boolean,
  date,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { estimates } from "./estimates";
import { customers } from "./customers";
import { materials } from "./materials";
import { locations } from "./locations";
import { projects } from "./projects";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    estimateId: uuid("estimate_id").references(() => estimates.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    /** Optional project umbrella */
    projectId: uuid("project_id").references(() => projects.id),
    orderNumber: varchar("order_number", { length: 50 }).notNull(),
    /** Order type: material_haul, haul_only, hourly, contract */
    orderType: varchar("order_type", { length: 30 }).default("material_haul"),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    originId: uuid("origin_id")
      .notNull()
      .references(() => locations.id),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => locations.id),
    quantityOrdered: numeric("quantity_ordered", {
      precision: 10,
      scale: 2,
    }).notNull(),
    quantityDelivered: numeric("quantity_delivered", {
      precision: 10,
      scale: 2,
    }).default("0"),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, completed, cancelled
    scheduledDate: date("scheduled_date"),
    /** Gate codes, dump restrictions, night work, etc. */
    specialConstraints: text("special_constraints"),
    /** Billing terms override: net_30, net_60, net_90, pwp (pay-when-paid) */
    billingTerms: varchar("billing_terms", { length: 20 }),
    /** Whether this order requires an estimate before dispatch */
    requiresEstimate: boolean("requires_estimate").default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("orders_entity_id_idx").on(table.entityId),
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_project_id_idx").on(table.projectId),
    index("orders_status_idx").on(table.status),
    index("orders_order_number_idx").on(table.orderNumber),
    index("orders_scheduled_date_idx").on(table.scheduledDate),
  ]
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  entity: one(organizations, {
    fields: [orders.entityId],
    references: [organizations.id],
  }),
  estimate: one(estimates, {
    fields: [orders.estimateId],
    references: [estimates.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  project: one(projects, {
    fields: [orders.projectId],
    references: [projects.id],
  }),
  material: one(materials, {
    fields: [orders.materialId],
    references: [materials.id],
  }),
  origin: one(locations, {
    fields: [orders.originId],
    references: [locations.id],
    relationName: "orderOrigin",
  }),
  destination: one(locations, {
    fields: [orders.destinationId],
    references: [locations.id],
    relationName: "orderDestination",
  }),
  loads: many(loads),
}));

import { loads } from "./loads";
