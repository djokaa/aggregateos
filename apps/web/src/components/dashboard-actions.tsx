"use client";

import Link from "next/link";
import {
  ShoppingCart,
  Truck,
  Camera,
  FileCheck,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

const actions: QuickAction[] = [
  {
    title: "Create Order",
    description: "Start a new customer order",
    href: "/orders",
    icon: ShoppingCart,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    title: "Dispatch Loads",
    description: "Assign and dispatch pending loads",
    href: "/dispatch",
    icon: Truck,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    title: "Review Tickets",
    description: "Review pending delivery tickets",
    href: "/tickets",
    icon: Camera,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    title: "Approve Estimates",
    description: "Review and approve open estimates",
    href: "/estimates",
    icon: FileCheck,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
];

export function DashboardActions() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${action.iconBg}`}
              >
                <action.icon className={`h-5 w-5 ${action.iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700">
                  {action.title}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {action.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
