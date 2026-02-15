import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";

/**
 * Create a Drizzle database instance from a connection string.
 * Uses the `postgres` (postgres-js) driver.
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

/**
 * Lazy singleton database instance.
 * Only available if DATABASE_URL environment variable is set.
 */
let _db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL environment variable is not set. " +
          "Either set it or use createDb() with an explicit connection string."
      );
    }
    _db = createDb(url);
  }
  return _db;
}

/**
 * Default database instance — uses DATABASE_URL env var.
 * Access via the `db` export or call `getDb()` for the same instance.
 *
 * Note: This is a lazy getter. It will throw if DATABASE_URL is not set
 * at the time of first access.
 */
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Database = ReturnType<typeof createDb>;
