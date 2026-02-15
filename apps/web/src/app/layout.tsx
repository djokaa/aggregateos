import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCProvider } from "@/providers/trpc-provider";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AggregateOS - Aggregate Logistics Operating System",
  description:
    "The operating system for aggregate logistics. Manage dispatch, drivers, estimates, invoices, and more.",
};

/** Force dynamic rendering -- Clerk needs runtime auth context */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasClerkKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("...");

  const body = (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCProvider>{children}</TRPCProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );

  if (hasClerkKey) {
    return <ClerkProvider>{body}</ClerkProvider>;
  }

  return body;
}
