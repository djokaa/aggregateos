import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
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

// Get auth info - handles missing Clerk gracefully
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

  // Development fallback — use the seeded admin user and org UUIDs.
  // These must match what `npm run db:seed` inserts so that entity-scoped
  // queries return data during local development without Clerk.
  return {
    userId: "c9590da3-8d7c-4022-b2da-14a42bdd9708",
    orgId: "4d7d6b40-6fac-4b5d-95a1-5047ad5053cb",
  };
}

const handler = async (req: Request) => {
  const { userId, orgId } = await getAuthInfo();

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({
      db: getDb(),
      userId: userId,
      organizationId: orgId,
      userRole: "platform_admin",
    }),
  });
};

export { handler as GET, handler as POST };
