import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { contacts } from "./contacts";
import { customers } from "./customers";

// =============================================================================
// Account Contacts — junction table linking Contacts to Accounts (customers)
// =============================================================================

export const accountContacts = pgTable(
  "account_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull().default("other"),
    isPrimary: boolean("is_primary").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("account_contacts_contact_customer_idx").on(
      table.contactId,
      table.customerId,
    ),
    index("account_contacts_customer_id_idx").on(table.customerId),
    index("account_contacts_contact_id_idx").on(table.contactId),
  ],
);

export const accountContactsRelations = relations(
  accountContacts,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [accountContacts.contactId],
      references: [contacts.id],
    }),
    customer: one(customers, {
      fields: [accountContacts.customerId],
      references: [customers.id],
    }),
  }),
);
