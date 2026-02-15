import {
  pgTable,
  uuid,
  varchar,
  text,
  doublePrecision,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    type: varchar("type", { length: 50 }).notNull(), // quarry, job_site, plant, yard
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address").notNull(),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 50 }),
    zip: varchar("zip", { length: 20 }),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    geofenceRadius: integer("geofence_radius").default(200), // meters
    contactName: varchar("contact_name", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 20 }),
    operatingHoursStart: varchar("operating_hours_start", { length: 10 }),
    operatingHoursEnd: varchar("operating_hours_end", { length: 10 }),
    notes: text("notes"),
    /** Region grouping (e.g. "South FL", "Middle TN") */
    region: varchar("region", { length: 100 }),
    /** Market: TN or FL — drives rate card and workflow defaults */
    market: varchar("market", { length: 20 }),
    /** Gate access / check-in instructions */
    gateInfo: text("gate_info"),
    /** Scale / weigh-station procedures */
    scaleInfo: text("scale_info"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("locations_entity_id_idx").on(table.entityId),
    index("locations_type_idx").on(table.type),
    index("locations_market_idx").on(table.market),
  ]
);

export const locationsRelations = relations(locations, ({ one }) => ({
  entity: one(organizations, {
    fields: [locations.entityId],
    references: [organizations.id],
  }),
}));
