/**
 * Shared error helpers for tRPC routers.
 *
 * Centralises common error patterns so routers stay focused on
 * business logic rather than repetitive error plumbing.
 *
 * @module errors
 */

import { TRPCError } from "@trpc/server";

// ---------------------------------------------------------------------------
// Not-found guard
// ---------------------------------------------------------------------------

/**
 * Throw a NOT_FOUND TRPCError if `value` is nullish.
 *
 * @example
 * ```ts
 * const customer = notFoundOrThrow(
 *   await db.select().from(customers).where(eq(customers.id, id)).limit(1),
 *   "Customer",
 * );
 * ```
 */
export function notFoundOrThrow<T>(
  rows: T[],
  entity: string,
): NonNullable<T> {
  const row = rows[0];
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `${entity} not found`,
    });
  }
  return row;
}

// ---------------------------------------------------------------------------
// Transition guard
// ---------------------------------------------------------------------------

/**
 * Validate a state machine transition and throw if invalid.
 *
 * @param transitions  Map of `currentState → allowedNextStates[]`
 * @param from         Current state
 * @param to           Desired next state
 * @param entity       Label for error messages (e.g. "Load", "Estimate")
 */
export function validateTransition<S extends string>(
  transitions: Record<S, S[]>,
  from: S,
  to: S,
  entity: string,
): void {
  const allowed = transitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot transition ${entity} from "${from}" to "${to}"`,
    });
  }
}

// ---------------------------------------------------------------------------
// Service-not-configured guard
// ---------------------------------------------------------------------------

/**
 * Throw a PRECONDITION_FAILED error when an external service is not configured.
 *
 * Use this at the top of procedures that depend on third-party APIs
 * so callers get a clear, actionable error instead of a cryptic failure.
 */
export function requireService(
  isConfigured: boolean,
  serviceName: string,
): void {
  if (!isConfigured) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${serviceName} is not configured. Add the required environment variables and restart.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Safe external call wrapper
// ---------------------------------------------------------------------------

/**
 * Execute an async function and return `{ data, error }` instead of throwing.
 *
 * Useful for external API calls where a failure should not crash the
 * request but should be reported to the caller for graceful fallback.
 *
 * @example
 * ```ts
 * const { data, error } = await safeCall(() => geocodeAddress(addr));
 * if (error) logger.warn("Geocoding unavailable:", error);
 * ```
 */
export async function safeCall<T>(
  fn: () => Promise<T>,
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
