import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    type: varchar("type", { length: 50 }).notNull(), // ryland, jv_partner, customer_org
    /** Self-referencing FK for OpCo hierarchy (e.g. TrueHaul → Ryland parent) */
    parentOrganizationId: uuid("parent_organization_id").references(
      (): any => organizations.id,
    ),
    settings: jsonb("settings").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("organizations_slug_idx").on(table.slug),
    index("organizations_type_idx").on(table.type),
  ]
);

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    parentOrganization: one(organizations, {
      fields: [organizations.parentOrganizationId],
      references: [organizations.id],
      relationName: "orgParent",
    }),
    users: many(users),
    customers: many(customers),
    locations: many(locations),
    materials: many(materials),
    rateCards: many(rateCards),
    estimates: many(estimates),
    orders: many(orders),
    drivers: many(drivers),
    vehicles: many(vehicles),
    loads: many(loads),
    invoices: many(invoices),
    projects: many(projects),
    dispatches: many(dispatches),
    companies: many(companies),
    crmContacts: many(contacts),
  }),
);

// Forward-declare imports for relations (these will be resolved at runtime)
import { users } from "./users";
import { customers } from "./customers";
import { locations } from "./locations";
import { materials } from "./materials";
import { rateCards } from "./rate-cards";
import { estimates } from "./estimates";
import { orders } from "./orders";
import { drivers, vehicles } from "./drivers";
import { loads } from "./loads";
import { invoices } from "./invoices";
import { projects } from "./projects";
import { dispatches } from "./dispatches";
import { companies } from "./companies";
import { contacts } from "./contacts";
