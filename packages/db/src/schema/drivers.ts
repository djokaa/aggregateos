import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  index,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { users } from "./users";

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    type: varchar("type", { length: 50 }).notNull(),
    licensePlate: varchar("license_plate", { length: 20 }).notNull(),
    capacity: numeric("capacity", { precision: 10, scale: 2 }), // tons or cy
    /** Maximum payload capacity in tons — used for eligibility filtering */
    maxCapacityTons: numeric("max_capacity_tons", { precision: 10, scale: 2 }),
    make: varchar("make", { length: 100 }),
    model: varchar("model", { length: 100 }),
    year: integer("year"),
    // ── Capability flags (used for dispatch eligibility filtering) ─────────
    asphaltOk: boolean("asphalt_ok").default(false),
    concreteOk: boolean("concrete_ok").default(false),
    endDump: boolean("end_dump").default(false),
    bellyDump: boolean("belly_dump").default(false),
    flatbed: boolean("flatbed").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("vehicles_entity_id_idx").on(table.entityId),
    index("vehicles_type_idx").on(table.type),
  ]
);

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  entity: one(organizations, {
    fields: [vehicles.entityId],
    references: [organizations.id],
  }),
}));

export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }),
    licenseNumber: varchar("license_number", { length: 50 }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id),
    status: varchar("status", { length: 20 }).default("offline"), // available, on_load, offline
    /** Regions this driver covers (e.g. ["South FL", "Middle TN"]) */
    regions: text("regions").array(),
    /** Payment method: direct_deposit, check, etc. */
    paymentMethod: varchar("payment_method", { length: 50 }),
    /** Default per-ton or per-hour pay rate */
    payRateDefault: numeric("pay_rate_default", { precision: 10, scale: 2 }),
    onTimeRate: numeric("on_time_rate", { precision: 5, scale: 4 }).default("0"),
    reliabilityScore: numeric("reliability_score", {
      precision: 5,
      scale: 4,
    }).default("0"),
    totalLoads: integer("total_loads").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("drivers_entity_id_idx").on(table.entityId),
    index("drivers_user_id_idx").on(table.userId),
    index("drivers_status_idx").on(table.status),
  ]
);

export const driversRelations = relations(drivers, ({ one }) => ({
  entity: one(organizations, {
    fields: [drivers.entityId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [drivers.vehicleId],
    references: [vehicles.id],
  }),
}));
