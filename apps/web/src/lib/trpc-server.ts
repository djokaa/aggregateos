import "server-only";
import { appRouter } from "@aggregateos/api";
import { createDb } from "@aggregateos/db";

// Lazy database singleton
let db: ReturnType<typeof createDb> | null = null;

function getDb() {
  if (!db && process.env.DATABASE_URL) {
    db = createDb(process.env.DATABASE_URL);
  }
  return db;
}

async function getAuthInfo() {
  const hasClerk =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("...");

  if (hasClerk) {
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const session = await auth();
      return {
        userId: session.userId,
        orgId: session.orgId ?? null,
      };
    } catch {
      // Clerk not available
    }
  }

  // Dev fallback — matches UUIDs inserted by the seed script
  return {
    userId: "c9590da3-8d7c-4022-b2da-14a42bdd9708",
    orgId: "4d7d6b40-6fac-4b5d-95a1-5047ad5053cb",
  };
}

export async function createServerCaller() {
  const { userId, orgId } = await getAuthInfo();

  return appRouter.createCaller({
    db: getDb(),
    userId,
    organizationId: orgId,
    userRole: "platform_admin",
  });
}
