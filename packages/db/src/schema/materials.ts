import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";

export const materials = pgTable(
  "materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(), // rock, sand, fill, concrete, gravel, asphalt, other
    unit: varchar("unit", { length: 20 }).notNull(), // ton, cy, load
    description: text("description"),
    /** Broad grouping (aggregate, hot_mix, concrete, fill, specialty) */
    category: varchar("category", { length: 100 }),
    /** Requires a lined truck bed (e.g. hot mix asphalt) */
    linedBedRequired: boolean("lined_bed_required").default(false),
    /** Temperature-sensitive material (e.g. asphalt must stay > 275°F) */
    tempSensitive: boolean("temp_sensitive").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("materials_entity_id_idx").on(table.entityId),
    index("materials_type_idx").on(table.type),
  ]
);

export const materialsRelations = relations(materials, ({ one }) => ({
  entity: one(organizations, {
    fields: [materials.entityId],
    references: [organizations.id],
  }),
}));
