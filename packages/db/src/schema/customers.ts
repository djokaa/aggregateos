import {
  pgTable,
  uuid,
  varchar,
  numeric,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { customerContacts } from "./customer-contacts";
import { companies } from "./companies";
import { accountContacts } from "./account-contacts";
import { projects } from "./projects";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    /** FK to the parent company entity (nullable for backward compat) */
    companyId: uuid("company_id").references(() => companies.id),
    name: varchar("name", { length: 255 }).notNull(),
    /** Formal legal name for invoicing/contracts */
    legalName: varchar("legal_name", { length: 255 }),
    contactName: varchar("contact_name", { length: 255 }).notNull(),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
    billingAddress: text("billing_address").notNull(),
    billingCity: varchar("billing_city", { length: 100 }),
    billingState: varchar("billing_state", { length: 50 }),
    billingZip: varchar("billing_zip", { length: 20 }),
    creditTerms: varchar("credit_terms", { length: 20 }).default("net_30"),
    /** Maximum outstanding AR allowed before orders are held */
    creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }),
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("customers_entity_id_idx").on(table.entityId),
    index("customers_name_idx").on(table.name),
  ],
);

export const customersRelations = relations(customers, ({ one, many }) => ({
  entity: one(organizations, {
    fields: [customers.entityId],
    references: [organizations.id],
  }),
  company: one(companies, {
    fields: [customers.companyId],
    references: [companies.id],
  }),
  contacts: many(customerContacts),
  accountContacts: many(accountContacts),
  projects: many(projects),
}));
