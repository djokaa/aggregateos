import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { customers } from "./customers";

/**
 * Customer contacts — separate contact records per customer.
 * Roles: ap (accounts payable), pm (project manager), dispatch, executive, other.
 */
export const customerContacts = pgTable(
  "customer_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    role: varchar("role", { length: 50 }).notNull().default("other"), // ap, pm, dispatch, executive, other
    isPrimary: boolean("is_primary").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("customer_contacts_customer_id_idx").on(table.customerId),
    index("customer_contacts_role_idx").on(table.role),
  ],
);

export const customerContactsRelations = relations(
  customerContacts,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerContacts.customerId],
      references: [customers.id],
    }),
  }),
);
