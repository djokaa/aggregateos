"use client";

import {
  DollarSign,
  Truck,
  FileText,
  Users,
  Camera,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface StatCard {
  label: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardStats() {
  const { data, isLoading } = trpc.dashboard.stats.useQuery(undefined, {
    refetchInterval: 30_000,
    retry: false,
  });

  const stats: StatCard[] = [
    {
      label: "Total Revenue",
      value: formatCurrency(data?.totalRevenueThisMonth ?? 0),
      subtitle: "This month",
      icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      label: "Active Loads",
      value: data?.totalLoadsToday ?? 0,
      subtitle: "Today",
      icon: Truck,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Pending Estimates",
      value: data?.pendingEstimates ?? 0,
      subtitle: "Awaiting response",
      icon: FileText,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "Active Drivers",
      value: data?.activeDrivers ?? 0,
      subtitle: "Currently active",
      icon: Users,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      label: "Pending Tickets",
      value: data?.pendingTickets ?? 0,
      subtitle: "Awaiting review",
      icon: Camera,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      label: "Total Customers",
      value: data?.totalCustomers ?? 0,
      subtitle: "Active accounts",
      icon: Receipt,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{stat.subtitle}</p>
            </div>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
            >
              <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
