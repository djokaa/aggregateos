import {
  pgTable,
  uuid,
  varchar,
  numeric,
  date,
  integer,
  text,
  jsonb,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { customerContacts } from "./customer-contacts";
import { users } from "./users";
import { materials } from "./materials";
import { locations } from "./locations";
import { projects } from "./projects";

// =============================================================================
// Estimates
// =============================================================================

export const estimates = pgTable(
  "estimates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => organizations.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    estimateNumber: varchar("estimate_number", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, sent, viewed, approved, rejected, expired
    // ── Totals (stored snapshots) ────────────────────────────────────────
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    fuelSurchargeTotal: numeric("fuel_surcharge_total", {
      precision: 12,
      scale: 2,
    }).notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    // ── Context ──────────────────────────────────────────────────────────
    /** Job site this estimate is for */
    jobSiteLocationId: uuid("job_site_location_id").references(
      () => locations.id,
    ),
    /** Optional project umbrella */
    projectId: uuid("project_id").references(() => projects.id),
    /** Market: TN, FL, GA, etc. */
    market: varchar("market", { length: 20 }),
    /** Currency code (default USD) */
    currency: varchar("currency", { length: 10 }).default("USD"),
    // ── Notes ────────────────────────────────────────────────────────────
    /** Internal admin-only notes */
    notesInternal: text("notes_internal"),
    /** Customer-visible notes */
    notesCustomer: text("notes_customer"),
    /** @deprecated Use notesInternal. Kept for backward compat. */
    notes: text("notes"),
    // ── Dates / timestamps ───────────────────────────────────────────────
    validUntil: date("valid_until"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentByUserId: uuid("sent_by_user_id").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    /** Legacy varchar field — kept for backward compat */
    approvedBy: varchar("approved_by", { length: 255 }),
    /** FK to the customer contact who approved */
    approvedByContactId: uuid("approved_by_contact_id").references(
      () => customerContacts.id,
    ),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    /** FK to the customer contact who rejected */
    rejectedByContactId: uuid("rejected_by_contact_id").references(
      () => customerContacts.id,
    ),
    // ── Integration ──────────────────────────────────────────────────────
    /** Source system: aggregateos, quickbooks */
    sourceSystem: varchar("source_system", { length: 30 }).default(
      "aggregateos",
    ),
    /** External reference ID (e.g. QuickBooks estimate ID) */
    externalRefId: varchar("external_ref_id", { length: 100 }),
    // ── Audit ────────────────────────────────────────────────────────────
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("estimates_entity_id_idx").on(table.entityId),
    index("estimates_customer_id_idx").on(table.customerId),
    index("estimates_status_idx").on(table.status),
    index("estimates_estimate_number_idx").on(table.estimateNumber),
  ],
);

export const estimatesRelations = relations(estimates, ({ one, many }) => ({
  entity: one(organizations, {
    fields: [estimates.entityId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [estimates.customerId],
    references: [customers.id],
  }),
  creator: one(users, {
    fields: [estimates.createdBy],
    references: [users.id],
  }),
  jobSiteLocation: one(locations, {
    fields: [estimates.jobSiteLocationId],
    references: [locations.id],
    relationName: "estimateJobSite",
  }),
  project: one(projects, {
    fields: [estimates.projectId],
    references: [projects.id],
  }),
  lineItems: many(estimateLineItems),
  historyEvents: many(estimateHistoryEvents),
  comments: many(estimateComments),
  attachments: many(estimateAttachments),
  versions: many(estimateVersions),
  recipients: many(estimateRecipients),
  accessTokens: many(estimateAccessTokens),
}));

// =============================================================================
// Estimate Line Items
// =============================================================================

export const estimateLineItems = pgTable(
  "estimate_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id, { onDelete: "cascade" }),
    /** Line type: material, hauling, hourly, fee, discount */
    lineType: varchar("line_type", { length: 30 }).default("material"),
    /** Free-text description for the line item */
    description: text("description"),
    /** Unit of measure: ton, load, hour, each */
    unit: varchar("unit", { length: 20 }).default("ton"),
    materialId: uuid("material_id").references(() => materials.id),
    originId: uuid("origin_id").references(() => locations.id),
    destinationId: uuid("destination_id").references(() => locations.id),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    materialRate: numeric("material_rate", {
      precision: 10,
      scale: 2,
    }).notNull(),
    haulRate: numeric("haul_rate", { precision: 10, scale: 2 }).notNull(),
    fuelSurcharge: numeric("fuel_surcharge", {
      precision: 10,
      scale: 2,
    }).notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
    distanceMiles: numeric("distance_miles", { precision: 8, scale: 2 }),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("estimate_line_items_estimate_id_idx").on(table.estimateId),
  ],
);

export const estimateLineItemsRelations = relations(
  estimateLineItems,
  ({ one }) => ({
    estimate: one(estimates, {
      fields: [estimateLineItems.estimateId],
      references: [estimates.id],
    }),
    material: one(materials, {
      fields: [estimateLineItems.materialId],
      references: [materials.id],
    }),
    origin: one(locations, {
      fields: [estimateLineItems.originId],
      references: [locations.id],
      relationName: "estimateLineItemOrigin",
    }),
    destination: one(locations, {
      fields: [estimateLineItems.destinationId],
      references: [locations.id],
      relationName: "estimateLineItemDestination",
    }),
  }),
);

// =============================================================================
// Estimate History Events (immutable activity log)
// =============================================================================

export const estimateHistoryEvents = pgTable(
  "estimate_history_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Actor type: user, customer, system */
    actorType: varchar("actor_type", { length: 20 }).notNull(),
    actorId: uuid("actor_id"),
    /** Fallback display name for the actor */
    actorLabel: varchar("actor_label", { length: 255 }).notNull(),
    /** Event type: created, updated, line_item_added, line_item_updated,
     *  line_item_removed, sent, viewed, commented, approved, rejected,
     *  attachment_added, attachment_removed, status_changed */
    eventType: varchar("event_type", { length: 50 }).notNull(),
    /** Arbitrary JSON metadata — diffs, comments, email subject, etc. */
    meta: jsonb("meta").default({}),
  },
  (table) => [
    index("estimate_history_events_estimate_id_idx").on(table.estimateId),
    index("estimate_history_events_event_type_idx").on(table.eventType),
  ],
);

export const estimateHistoryEventsRelations = relations(
  estimateHistoryEvents,
  ({ one }) => ({
    estimate: one(estimates, {
      fields: [estimateHistoryEvents.estimateId],
      references: [estimates.id],
    }),
  }),
);

// =============================================================================
// Estimate Comments
// =============================================================================

export const estimateComments = pgTable(
  "estimate_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id, { onDelete: "cascade" }),
    /** Author type: user, customer */
    authorType: varchar("author_type", { length: 20 }).notNull(),
    authorId: uuid("author_id"),
    /** Fallback display name */
    authorLabel: varchar("author_label", { length: 255 }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("estimate_comments_estimate_id_idx").on(table.estimateId),
  ],
);

export const estimateCommentsRelations = relations(
  estimateComments,
  ({ one }) => ({
    estimate: one(estimates, {
      fields: [estimateComments.estimateId],
      references: [estimates.id],
    }),
  }),
);

// =============================================================================
// Estimate Attachments
// =============================================================================

export const estimateAttachments = pgTable(
  "estimate_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("estimate_attachments_estimate_id_idx").on(table.estimateId),
  ],
);

export const estimateAttachmentsRelations = relations(
  estimateAttachments,
  ({ one }) => ({
    estimate: one(estimates, {
      fields: [estimateAttachments.estimateId],
      references: [estimates.id],
    }),
    uploader: one(users, {
      fields: [estimateAttachments.uploadedBy],
      references: [users.id],
    }),
  }),
);

// =============================================================================
// Estimate Versions (immutable snapshots created on send)
// =============================================================================

export const estimateVersions = pgTable(
  "estimate_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    /** Full estimate header + line items JSON snapshot */
    snapshotJson: jsonb("snapshot_json").notNull(),
    pdfUrl: text("pdf_url"),
  },
  (table) => [
    index("estimate_versions_estimate_id_idx").on(table.estimateId),
  ],
);

export const estimateVersionsRelations = relations(
  estimateVersions,
  ({ one }) => ({
    estimate: one(estimates, {
      fields: [estimateVersions.estimateId],
      references: [estimates.id],
    }),
    creator: one(users, {
      fields: [estimateVersions.createdByUserId],
      references: [users.id],
    }),
  }),
);

// =============================================================================
// Estimate Recipients (who it was sent to)
// =============================================================================

export const estimateRecipients = pgTable(
  "estimate_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => customerContacts.id),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    /** Delivery status: queued, sent, failed, bounced */
    deliveryStatus: varchar("delivery_status", { length: 20 }).default(
      "queued",
    ),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  },
  (table) => [
    index("estimate_recipients_estimate_id_idx").on(table.estimateId),
  ],
);

export const estimateRecipientsRelations = relations(
  estimateRecipients,
  ({ one }) => ({
    estimate: one(estimates, {
      fields: [estimateRecipients.estimateId],
      references: [estimates.id],
    }),
    contact: one(customerContacts, {
      fields: [estimateRecipients.contactId],
      references: [customerContacts.id],
    }),
  }),
);

// =============================================================================
// Estimate Access Tokens (Phase 1 magic links)
// =============================================================================

export const estimateAccessTokens = pgTable(
  "estimate_access_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Secure random token string used in the URL */
    token: varchar("token", { length: 255 }).notNull().unique(),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimates.id, { onDelete: "cascade" }),
    estimateVersionId: uuid("estimate_version_id").references(
      () => estimateVersions.id,
    ),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    /** Permissions: view, comment, approve_reject */
    permissions: varchar("permissions", { length: 50 }).default("view"),
  },
  (table) => [
    uniqueIndex("estimate_access_tokens_token_idx").on(table.token),
    index("estimate_access_tokens_estimate_id_idx").on(table.estimateId),
  ],
);

export const estimateAccessTokensRelations = relations(
  estimateAccessTokens,
  ({ one }) => ({
    estimate: one(estimates, {
      fields: [estimateAccessTokens.estimateId],
      references: [estimates.id],
    }),
    version: one(estimateVersions, {
      fields: [estimateAccessTokens.estimateVersionId],
      references: [estimateVersions.id],
    }),
  }),
);
