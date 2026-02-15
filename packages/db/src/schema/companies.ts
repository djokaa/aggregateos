import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { contacts } from "./contacts";
import { customers } from "./customers";

// =============================================================================
// Companies
// =============================================================================

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    name: varchar("name", { length: 255 }).notNull(),
    legalName: varchar("legal_name", { length: 255 }),
    type: varchar("type", { length: 50 }).notNull().default("customer"),
    industry: varchar("industry", { length: 100 }),
    website: varchar("website", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 50 }),
    zip: varchar("zip", { length: 20 }),
    notes: text("notes"),
    tags: jsonb("tags").default([]),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("companies_entity_id_idx").on(table.entityId),
    index("companies_name_idx").on(table.name),
    index("companies_type_idx").on(table.type),
  ],
);

export const companiesRelations = relations(companies, ({ one, many }) => ({
  entity: one(organizations, {
    fields: [companies.entityId],
    references: [organizations.id],
  }),
  contacts: many(contacts),
  accounts: many(customers),
  historyEvents: many(companyHistoryEvents),
}));

// =============================================================================
// Company History Events
// =============================================================================

export const companyHistoryEvents = pgTable(
  "company_history_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    actorType: varchar("actor_type", { length: 20 }).notNull(), // user | system
    actorId: varchar("actor_id", { length: 255 }),
    actorLabel: varchar("actor_label", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    meta: jsonb("meta").default({}),
  },
  (table) => [
    index("company_history_company_id_idx").on(table.companyId),
    index("company_history_timestamp_idx").on(table.timestamp),
  ],
);

export const companyHistoryEventsRelations = relations(
  companyHistoryEvents,
  ({ one }) => ({
    company: one(companies, {
      fields: [companyHistoryEvents.companyId],
      references: [companies.id],
    }),
  }),
);
