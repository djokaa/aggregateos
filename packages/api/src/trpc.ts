import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Database } from "@aggregateos/db";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Context available to every tRPC procedure.
 *
 * - `db`             – Drizzle ORM database instance (may be null if DATABASE_URL is not set)
 * - `userId`         – Clerk user ID (null when unauthenticated)
 * - `organizationId` – Clerk organization ID used for multi-entity scoping
 * - `userRole`       – Role string used for authorization checks
 */
export interface TRPCContext {
  db: Database | null;
  userId: string | null;
  organizationId: string | null;
  userRole: string | null;
}

export type CreateTRPCContext = () => Promise<TRPCContext>;

// ---------------------------------------------------------------------------
// tRPC initialisation (v11)
// ---------------------------------------------------------------------------

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

// ---------------------------------------------------------------------------
// Router & base procedure
// ---------------------------------------------------------------------------

export const router = t.router;
export const publicProcedure = t.procedure;

// ---------------------------------------------------------------------------
// Middleware – authenticated user
// ---------------------------------------------------------------------------

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // narrowed to string
    },
  });
});

/**
 * Procedure that requires a logged-in user (userId != null).
 */
export const protectedProcedure = t.procedure.use(enforceAuth);

// ---------------------------------------------------------------------------
// Middleware – entity-scoped (user + organization)
// ---------------------------------------------------------------------------

const enforceEntity = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  if (!ctx.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must belong to an organization to perform this action",
    });
  }

  if (!ctx.db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database connection is not available",
    });
  }

  return next({
    ctx: {
      ...ctx,
      db: ctx.db, // narrowed to Database (non-null)
      userId: ctx.userId,
      organizationId: ctx.organizationId,
    },
  });
});

/**
 * Procedure that requires both userId **and** organizationId to be present.
 */
export const entityProcedure = t.procedure.use(enforceEntity);
