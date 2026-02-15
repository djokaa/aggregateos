"use client";

import {
  Truck,
  UserPlus,
  MapPin,
  Clock,
  Package,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { LOAD_STATUS_LABELS } from "@aggregateos/shared";
import type { LoadStatus } from "@aggregateos/shared";

// ---------------------------------------------------------------------------
// Map load status to icon/colour
// ---------------------------------------------------------------------------

const STATUS_ICON: Record<
  string,
  { icon: LucideIcon; color: string; bg: string }
> = {
  ordered: { icon: Package, color: "text-zinc-500", bg: "bg-zinc-50" },
  assigned: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50" },
  dispatched: { icon: Truck, color: "text-indigo-600", bg: "bg-indigo-50" },
  en_route_pickup: { icon: Truck, color: "text-purple-600", bg: "bg-purple-50" },
  at_pickup: { icon: MapPin, color: "text-violet-600", bg: "bg-violet-50" },
  loaded: { icon: Package, color: "text-amber-600", bg: "bg-amber-50" },
  en_route_delivery: { icon: Truck, color: "text-orange-600", bg: "bg-orange-50" },
  at_delivery: { icon: MapPin, color: "text-yellow-600", bg: "bg-yellow-50" },
  delivered: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  ticket_uploaded: { icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50" },
  ticket_verified: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  billable: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  invoiced: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  paid: { icon: CheckCircle2, color: "text-green-700", bg: "bg-green-50" },
};

const DEFAULT_ICON = {
  icon: Package,
  color: "text-zinc-500",
  bg: "bg-zinc-50",
};

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function relativeTime(date: Date | string | null): string {
  if (!date) return "—";
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Build a human-readable message from a load row
// ---------------------------------------------------------------------------

function buildMessage(load: {
  loadNumber: string;
  status: string;
  driverName: string | null;
  materialName: string | null;
  destinationName: string | null;
}): string {
  const label =
    LOAD_STATUS_LABELS[load.status as LoadStatus] ?? load.status;

  switch (load.status) {
    case "assigned":
      return `${load.loadNumber} assigned to ${load.driverName ?? "a driver"}`;
    case "dispatched":
      return `${load.loadNumber} dispatched${load.destinationName ? ` to ${load.destinationName}` : ""}`;
    case "delivered":
      return `${load.loadNumber} delivered${load.destinationName ? ` to ${load.destinationName}` : ""}`;
    case "ticket_uploaded":
      return `Ticket uploaded for ${load.loadNumber}${load.materialName ? ` (${load.materialName})` : ""}`;
    case "ticket_verified":
      return `Ticket for ${load.loadNumber} verified`;
    case "invoiced":
      return `${load.loadNumber} invoiced`;
    case "paid":
      return `${load.loadNumber} marked paid`;
    default:
      return `${load.loadNumber} → ${label}`;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityFeed() {
  const { data, isLoading } = trpc.dashboard.recentActivity.useQuery(
    undefined,
    { retry: false, refetchInterval: 30_000 },
  );

  const activities = data ?? [];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">
          Recent Activity
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-zinc-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">
          No recent activity
        </p>
      ) : (
        <div className="space-y-4">
          {activities.map((load) => {
            const si = STATUS_ICON[load.status] ?? DEFAULT_ICON;
            const IconComp = si.icon;
            return (
              <div key={load.id} className="flex gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${si.bg}`}
                >
                  <IconComp className={`h-4 w-4 ${si.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-700">
                    {buildMessage(load)}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                    <Clock className="h-3 w-3" />
                    {relativeTime(load.updatedAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
