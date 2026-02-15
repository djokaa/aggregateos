import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { companies } from "./companies";
import { accountContacts } from "./account-contacts";

// =============================================================================
// Contacts
// =============================================================================

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    companyId: uuid("company_id").references(() => companies.id),
    firstName: varchar("first_name", { length: 255 }).notNull(),
    lastName: varchar("last_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    title: varchar("title", { length: 100 }),
    department: varchar("department", { length: 100 }),
    isPrimary: boolean("is_primary").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("contacts_entity_id_idx").on(table.entityId),
    index("contacts_company_id_idx").on(table.companyId),
    index("contacts_name_idx").on(table.lastName, table.firstName),
  ],
);

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  entity: one(organizations, {
    fields: [contacts.entityId],
    references: [organizations.id],
  }),
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
  accountContacts: many(accountContacts),
  historyEvents: many(contactHistoryEvents),
}));

// =============================================================================
// Contact History Events
// =============================================================================

export const contactHistoryEvents = pgTable(
  "contact_history_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    actorType: varchar("actor_type", { length: 20 }).notNull(),
    actorId: varchar("actor_id", { length: 255 }),
    actorLabel: varchar("actor_label", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    meta: jsonb("meta").default({}),
  },
  (table) => [
    index("contact_history_contact_id_idx").on(table.contactId),
    index("contact_history_timestamp_idx").on(table.timestamp),
  ],
);

export const contactHistoryEventsRelations = relations(
  contactHistoryEvents,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [contactHistoryEvents.contactId],
      references: [contacts.id],
    }),
  }),
);
