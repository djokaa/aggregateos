"use client";

import dynamic from "next/dynamic";
import { Building2, User } from "lucide-react";

// Dynamically import UserButton to avoid SSR issues and handle missing ClerkProvider
const ClerkUserButton = dynamic(
  () =>
    import("@clerk/nextjs").then((mod) => ({
      default: mod.UserButton,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200">
        <User className="h-4 w-4 text-zinc-600" />
      </div>
    ),
  },
);

function UserAvatar() {
  const hasClerk =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("...");

  if (hasClerk) {
    return <ClerkUserButton afterSignOutUrl="/sign-in" />;
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200">
      <User className="h-4 w-4 text-zinc-600" />
    </div>
  );
}

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">Dashboard</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600">
          <Building2 className="h-4 w-4" />
          <span>Ryland Logistics</span>
        </div>
        <UserAvatar />
      </div>
    </header>
  );
}
