import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  jsonb,
  boolean,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { orders } from "./orders";
import { drivers, vehicles } from "./drivers";
import { users } from "./users";
import { dispatches } from "./dispatches";

export const loads = pgTable(
  "loads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    driverId: uuid("driver_id").references(() => drivers.id),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id),
    /** Link back to the dispatch event that created this load */
    dispatchId: uuid("dispatch_id").references(() => dispatches.id),
    loadNumber: varchar("load_number", { length: 50 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("ordered"),
    scheduledPickupTime: timestamp("scheduled_pickup_time", {
      withTimezone: true,
    }),
    actualPickupTime: timestamp("actual_pickup_time", { withTimezone: true }),
    scheduledDeliveryTime: timestamp("scheduled_delivery_time", {
      withTimezone: true,
    }),
    actualDeliveryTime: timestamp("actual_delivery_time", {
      withTimezone: true,
    }),
    // ── Pricing fields ────────────────────────────────────────────────────
    /** Invoice rate $/ton charged to customer */
    invoiceRatePerTon: numeric("invoice_rate_per_ton", {
      precision: 10,
      scale: 2,
    }),
    /** Driver pay rate $/ton or $/hr */
    driverPayRate: numeric("driver_pay_rate", { precision: 10, scale: 2 }),
    /** Fuel surcharge amount for this load */
    fuelSurchargeAmount: numeric("fuel_surcharge_amount", {
      precision: 10,
      scale: 2,
    }),
    /** Verified tonnage from ticket — locks on ticket_verified */
    billableTons: numeric("billable_tons", { precision: 10, scale: 2 }),
    // ── Exception tracking ────────────────────────────────────────────────
    /** Exception type: late_pickup, late_delivery, rejected_ticket, tonnage_mismatch */
    exceptionType: varchar("exception_type", { length: 50 }),
    exceptionNotes: text("exception_notes"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("loads_entity_id_idx").on(table.entityId),
    index("loads_order_id_idx").on(table.orderId),
    index("loads_driver_id_idx").on(table.driverId),
    index("loads_status_idx").on(table.status),
    index("loads_load_number_idx").on(table.loadNumber),
    index("loads_dispatch_id_idx").on(table.dispatchId),
  ]
);

export const loadsRelations = relations(loads, ({ one, many }) => ({
  entity: one(organizations, {
    fields: [loads.entityId],
    references: [organizations.id],
  }),
  order: one(orders, {
    fields: [loads.orderId],
    references: [orders.id],
  }),
  driver: one(drivers, {
    fields: [loads.driverId],
    references: [drivers.id],
  }),
  vehicle: one(vehicles, {
    fields: [loads.vehicleId],
    references: [vehicles.id],
  }),
  dispatch: one(dispatches, {
    fields: [loads.dispatchId],
    references: [dispatches.id],
  }),
  tickets: many(tickets),
}));

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loadId: uuid("load_id")
      .notNull()
      .references(() => loads.id),
    photoUrl: text("photo_url").notNull(),
    ocrRaw: jsonb("ocr_raw"),
    extractedWeight: numeric("extracted_weight", { precision: 10, scale: 2 }),
    extractedDate: varchar("extracted_date", { length: 50 }),
    extractedTicketNumber: varchar("extracted_ticket_number", { length: 100 }),
    extractedMaterial: varchar("extracted_material", { length: 255 }),
    confidenceScore: numeric("confidence_score", { precision: 5, scale: 4 }),
    /** Standardized rejection reason */
    rejectionReason: varchar("rejection_reason", { length: 50 }), // unreadable, wrong_number, tonnage_mismatch, wrong_material, wrong_job, duplicate
    /** Number of times this ticket has been rejected and resubmitted */
    rejectionCount: integer("rejection_count").default(0),
    verifiedBy: uuid("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    isApproved: boolean("is_approved"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("tickets_load_id_idx").on(table.loadId),
    index("tickets_is_approved_idx").on(table.isApproved),
  ]
);

export const ticketsRelations = relations(tickets, ({ one }) => ({
  load: one(loads, {
    fields: [tickets.loadId],
    references: [loads.id],
  }),
  verifier: one(users, {
    fields: [tickets.verifiedBy],
    references: [users.id],
  }),
}));
