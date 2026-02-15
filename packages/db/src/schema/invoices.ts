import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  text,
  jsonb,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { loads } from "./loads";
import { projects } from "./projects";
import { materials } from "./materials";

// =============================================================================
// Invoices
// =============================================================================

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    /** Optional project grouping */
    projectId: uuid("project_id").references(() => projects.id),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).default("draft"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date").notNull(),
    /** @deprecated Use billingPeriodStart/End instead */
    weekStart: date("week_start"),
    /** Grouping key for auto-generated invoices */
    groupingKey: varchar("grouping_key", { length: 255 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    quickbooksId: varchar("quickbooks_id", { length: 100 }),
    /** @deprecated Use notesInternal/notesCustomer instead */
    notes: text("notes"),
    // ── New fields ────────────────────────────────────────────────────────
    market: varchar("market", { length: 20 }),
    billingPeriodStart: date("billing_period_start"),
    billingPeriodEnd: date("billing_period_end"),
    terms: varchar("terms", { length: 20 }),
    issueDate: date("issue_date"),
    /** Clerk user ID who created the invoice */
    createdByUserId: varchar("created_by_user_id", { length: 255 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    /** Clerk user ID who sent the invoice */
    sentByUserId: varchar("sent_by_user_id", { length: 255 }),
    qbStatus: varchar("qb_status", { length: 20 }).default("not_synced"),
    notesInternal: text("notes_internal"),
    notesCustomer: text("notes_customer"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("invoices_entity_id_idx").on(table.entityId),
    index("invoices_customer_id_idx").on(table.customerId),
    index("invoices_project_id_idx").on(table.projectId),
    index("invoices_status_idx").on(table.status),
    index("invoices_invoice_number_idx").on(table.invoiceNumber),
    index("invoices_due_date_idx").on(table.dueDate),
    index("invoices_market_idx").on(table.market),
    index("invoices_qb_status_idx").on(table.qbStatus),
  ]
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  entity: one(organizations, {
    fields: [invoices.entityId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  lineItems: many(invoiceLineItems),
  historyEvents: many(invoiceHistoryEvents),
  loadLinks: many(invoiceLoadLinks),
  attachments: many(invoiceAttachments),
}));

// =============================================================================
// Invoice Line Items
// =============================================================================

export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    loadId: uuid("load_id").references(() => loads.id),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
    // ── New fields ────────────────────────────────────────────────────────
    sourceType: varchar("source_type", { length: 20 }).default("load"),
    sourceId: uuid("source_id"),
    materialId: uuid("material_id").references(() => materials.id),
    unit: varchar("unit", { length: 20 }).default("tons"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("invoice_line_items_invoice_id_idx").on(table.invoiceId),
    index("invoice_line_items_load_id_idx").on(table.loadId),
  ]
);

export const invoiceLineItemsRelations = relations(
  invoiceLineItems,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLineItems.invoiceId],
      references: [invoices.id],
    }),
    load: one(loads, {
      fields: [invoiceLineItems.loadId],
      references: [loads.id],
    }),
    material: one(materials, {
      fields: [invoiceLineItems.materialId],
      references: [materials.id],
    }),
  })
);

// =============================================================================
// Invoice History Events (immutable audit log)
// =============================================================================

export const invoiceHistoryEvents = pgTable(
  "invoice_history_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Actor type: user, system */
    actorType: varchar("actor_type", { length: 20 }).notNull(),
    actorId: varchar("actor_id", { length: 255 }),
    /** Fallback display name for the actor */
    actorLabel: varchar("actor_label", { length: 255 }).notNull(),
    /** Event type: created, generated_from_loads, line_item_added, etc. */
    eventType: varchar("event_type", { length: 50 }).notNull(),
    /** Arbitrary JSON metadata */
    meta: jsonb("meta").default({}),
  },
  (table) => [
    index("invoice_history_events_invoice_id_idx").on(table.invoiceId),
    index("invoice_history_events_event_type_idx").on(table.eventType),
  ]
);

export const invoiceHistoryEventsRelations = relations(
  invoiceHistoryEvents,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceHistoryEvents.invoiceId],
      references: [invoices.id],
    }),
  })
);

// =============================================================================
// Invoice Load Links (many-to-many traceability)
// =============================================================================

export const invoiceLoadLinks = pgTable(
  "invoice_load_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    loadId: uuid("load_id")
      .notNull()
      .references(() => loads.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invoice_load_links_invoice_id_idx").on(table.invoiceId),
    index("invoice_load_links_load_id_idx").on(table.loadId),
  ]
);

export const invoiceLoadLinksRelations = relations(
  invoiceLoadLinks,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLoadLinks.invoiceId],
      references: [invoices.id],
    }),
    load: one(loads, {
      fields: [invoiceLoadLinks.loadId],
      references: [loads.id],
    }),
  })
);

// =============================================================================
// Invoice Attachments
// =============================================================================

export const invoiceAttachments = pgTable(
  "invoice_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }),
    uploadedBy: varchar("uploaded_by", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invoice_attachments_invoice_id_idx").on(table.invoiceId),
  ]
);

export const invoiceAttachmentsRelations = relations(
  invoiceAttachments,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceAttachments.invoiceId],
      references: [invoices.id],
    }),
  })
);

// =============================================================================
// Billing Profiles (configurable grouping rules per market)
// =============================================================================

export const billingProfiles = pgTable(
  "billing_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    customerId: uuid("customer_id").references(() => customers.id),
    market: varchar("market", { length: 20 }).notNull(),
    invoiceCadence: varchar("invoice_cadence", { length: 20 })
      .notNull()
      .default("weekly"),
    /** JSON config: { fields: ["customer", "project", "material"] } */
    groupBy: jsonb("group_by").default({}),
    /** Day of week: 0=Sunday, 1=Monday, etc. */
    weekStartDay: integer("week_start_day").default(1),
    minimumBillableStatus: varchar("minimum_billable_status", { length: 30 })
      .default("billable"),
    termsDefault: varchar("terms_default", { length: 20 }).default("net_30"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("billing_profiles_entity_id_idx").on(table.entityId),
    index("billing_profiles_customer_id_idx").on(table.customerId),
  ]
);

export const billingProfilesRelations = relations(
  billingProfiles,
  ({ one }) => ({
    entity: one(organizations, {
      fields: [billingProfiles.entityId],
      references: [organizations.id],
    }),
    customer: one(customers, {
      fields: [billingProfiles.customerId],
      references: [customers.id],
    }),
  })
);
