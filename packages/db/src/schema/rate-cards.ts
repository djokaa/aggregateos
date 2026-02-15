import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  date,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { materials } from "./materials";
import { locations } from "./locations";

export const rateCards = pgTable(
  "rate_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    originId: uuid("origin_id")
      .notNull()
      .references(() => locations.id),
    destinationZone: varchar("destination_zone", { length: 100 }).notNull(),
    /** Market this rate applies to (TN, FL, etc.) */
    market: varchar("market", { length: 20 }),
    /** Rate type: route_based, time_based, contract, spot */
    rateType: varchar("rate_type", { length: 30 }).default("route_based"),
    haulRate: numeric("haul_rate", { precision: 10, scale: 2 }).notNull(), // dollars per unit
    materialRate: numeric("material_rate", { precision: 10, scale: 2 }).notNull(), // dollars per unit
    /** Driver pay rate per ton or per hour */
    driverPayRate: numeric("driver_pay_rate", { precision: 10, scale: 2 }),
    /** Material cost rate (what we pay the quarry) per ton */
    materialCostRate: numeric("material_cost_rate", {
      precision: 10,
      scale: 2,
    }),
    fuelSurchargePercent: numeric("fuel_surcharge_percent", {
      precision: 5,
      scale: 4,
    }).default("0.12"),
    minimumLoads: integer("minimum_loads"),
    effectiveDate: date("effective_date").notNull(),
    expiresAt: date("expires_at"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("rate_cards_entity_id_idx").on(table.entityId),
    index("rate_cards_material_id_idx").on(table.materialId),
    index("rate_cards_origin_id_idx").on(table.originId),
    index("rate_cards_effective_date_idx").on(table.effectiveDate),
  ]
);

export const rateCardsRelations = relations(rateCards, ({ one }) => ({
  entity: one(organizations, {
    fields: [rateCards.entityId],
    references: [organizations.id],
  }),
  material: one(materials, {
    fields: [rateCards.materialId],
    references: [materials.id],
  }),
  origin: one(locations, {
    fields: [rateCards.originId],
    references: [locations.id],
  }),
}));
