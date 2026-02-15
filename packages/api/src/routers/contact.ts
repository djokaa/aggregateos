import { z } from "zod";
import { eq, and, sql, desc, count } from "drizzle-orm";
import * as schema from "@aggregateos/db";
import {
  createContactSchema,
  updateContactSchema,
  linkContactToAccountSchema,
} from "@aggregateos/shared";
import { router, entityProcedure } from "../trpc";
import {
  writeContactEvent,
  writeContactCreatedEvent,
  writeContactUpdatedEvent,
} from "../services/contact-history";

export const contactRouter = router({
  // -----------------------------------------------------------------------
  // List contacts (paginated, searchable, filterable by company)
  // -----------------------------------------------------------------------
  list: entityProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          companyId: z.string().uuid().optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { search, companyId, page, limit } = input;

      const conditions: any[] = [
        eq(schema.contacts.entityId, ctx.organizationId!),
        eq(schema.contacts.isActive, true),
      ];

      if (search) {
        conditions.push(
          sql`(${schema.contacts.firstName} ILIKE ${"%" + search + "%"} OR ${schema.contacts.lastName} ILIKE ${"%" + search + "%"} OR ${schema.contacts.email} ILIKE ${"%" + search + "%"})`,
        );
      }

      if (companyId) {
        conditions.push(eq(schema.contacts.companyId, companyId));
      }

      const where = and(...conditions);

      const [items, [total]] = await Promise.all([
        ctx.db
          .select({
            contact: schema.contacts,
            companyName: schema.companies.name,
          })
          .from(schema.contacts)
          .leftJoin(
            schema.companies,
            eq(schema.contacts.companyId, schema.companies.id),
          )
          .where(where)
          .orderBy(desc(schema.contacts.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        ctx.db
          .select({ count: count() })
          .from(schema.contacts)
          .where(where),
      ]);

      return {
        items: items.map((row) => ({
          ...row.contact,
          companyName: row.companyName,
        })),
        totalCount: total?.count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((total?.count ?? 0) / limit),
      };
    }),

  // -----------------------------------------------------------------------
  // Get contact by ID
  // -----------------------------------------------------------------------
  getById: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          contact: schema.contacts,
          companyName: schema.companies.name,
        })
        .from(schema.contacts)
        .leftJoin(
          schema.companies,
          eq(schema.contacts.companyId, schema.companies.id),
        )
        .where(
          and(
            eq(schema.contacts.id, input.id),
            eq(schema.contacts.entityId, ctx.organizationId!),
          ),
        )
        .limit(1);

      if (!row) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      return {
        ...row.contact,
        companyName: row.companyName,
      };
    }),

  // -----------------------------------------------------------------------
  // Create contact
  // -----------------------------------------------------------------------
  create: entityProcedure
    .input(createContactSchema)
    .mutation(async ({ ctx, input }) => {
      const [contact] = await ctx.db
        .insert(schema.contacts)
        .values({
          ...input,
          entityId: ctx.organizationId!,
        })
        .returning();

      await writeContactCreatedEvent(
        ctx.db,
        contact.id,
        ctx.userId,
        "Admin",
      );

      return contact;
    }),

  // -----------------------------------------------------------------------
  // Update contact
  // -----------------------------------------------------------------------
  update: entityProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateContactSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [contact] = await ctx.db
        .update(schema.contacts)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.contacts.id, input.id),
            eq(schema.contacts.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!contact) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      await writeContactUpdatedEvent(
        ctx.db,
        contact.id,
        ctx.userId,
        "Admin",
        Object.keys(input.data),
      );

      return contact;
    }),

  // -----------------------------------------------------------------------
  // Delete contact (soft delete)
  // -----------------------------------------------------------------------
  delete: entityProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [contact] = await ctx.db
        .update(schema.contacts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.contacts.id, input.id),
            eq(schema.contacts.entityId, ctx.organizationId!),
          ),
        )
        .returning();

      if (!contact) {
        throw new (await import("@trpc/server")).TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      return { success: true };
    }),

  // -----------------------------------------------------------------------
  // Link contact to account (customer)
  // -----------------------------------------------------------------------
  linkToAccount: entityProcedure
    .input(linkContactToAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const [link] = await ctx.db
        .insert(schema.accountContacts)
        .values({
          contactId: input.contactId,
          customerId: input.customerId,
          role: input.role,
          isPrimary: input.isPrimary,
        })
        .onConflictDoUpdate({
          target: [
            schema.accountContacts.contactId,
            schema.accountContacts.customerId,
          ],
          set: {
            role: input.role,
            isPrimary: input.isPrimary,
          },
        })
        .returning();

      await writeContactEvent(ctx.db, {
        contactId: input.contactId,
        actorType: "user",
        actorId: ctx.userId,
        actorLabel: "Admin",
        eventType: "linked_to_account",
        meta: { customerId: input.customerId, role: input.role },
      });

      return link;
    }),

  // -----------------------------------------------------------------------
  // Unlink contact from account
  // -----------------------------------------------------------------------
  unlinkFromAccount: entityProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        customerId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(schema.accountContacts)
        .where(
          and(
            eq(schema.accountContacts.contactId, input.contactId),
            eq(schema.accountContacts.customerId, input.customerId),
          ),
        );

      await writeContactEvent(ctx.db, {
        contactId: input.contactId,
        actorType: "user",
        actorId: ctx.userId,
        actorLabel: "Admin",
        eventType: "unlinked_from_account",
        meta: { customerId: input.customerId },
      });

      return { success: true };
    }),

  // -----------------------------------------------------------------------
  // Get accounts linked to this contact
  // -----------------------------------------------------------------------
  getAccounts: entityProcedure
    .input(z.object({ contactId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db
        .select({
          accountContact: schema.accountContacts,
          customer: schema.customers,
        })
        .from(schema.accountContacts)
        .innerJoin(
          schema.customers,
          eq(schema.accountContacts.customerId, schema.customers.id),
        )
        .where(eq(schema.accountContacts.contactId, input.contactId));

      return items.map((row) => ({
        ...row.accountContact,
        customerName: row.customer.name,
        customerId: row.customer.id,
      }));
    }),

  // -----------------------------------------------------------------------
  // Get contacts for a specific account (customer) via junction table
  // -----------------------------------------------------------------------
  getByAccount: entityProcedure
    .input(z.object({ customerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db
        .select({
          accountContact: schema.accountContacts,
          contact: schema.contacts,
        })
        .from(schema.accountContacts)
        .innerJoin(
          schema.contacts,
          eq(schema.accountContacts.contactId, schema.contacts.id),
        )
        .where(eq(schema.accountContacts.customerId, input.customerId));

      return items.map((row) => ({
        ...row.contact,
        role: row.accountContact.role,
        isPrimaryForAccount: row.accountContact.isPrimary,
        linkId: row.accountContact.id,
      }));
    }),

  // -----------------------------------------------------------------------
  // Get history events
  // -----------------------------------------------------------------------
  getHistory: entityProcedure
    .input(z.object({ contactId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db
        .select()
        .from(schema.contactHistoryEvents)
        .where(eq(schema.contactHistoryEvents.contactId, input.contactId))
        .orderBy(desc(schema.contactHistoryEvents.timestamp))
        .limit(100);

      return items;
    }),
});
