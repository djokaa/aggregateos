"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  Package,
  Users,
  MapPin,
  Layers,
  CreditCard,
  Truck,
  FileText,
  Receipt,
  Settings,
  Mountain,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  Building2,
  Contact,
} from "lucide-react";
import { cn } from "@aggregateos/ui";

const navigation = [
  {
    label: "Operations",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Dispatch", href: "/dispatch", icon: Send },
      { name: "Loads", href: "/loads", icon: Package },
      { name: "Tickets", href: "/tickets", icon: ClipboardCheck },
      { name: "Orders", href: "/orders", icon: ClipboardList },
    ],
  },
  {
    label: "CRM",
    items: [
      { name: "Companies", href: "/companies", icon: Building2 },
      { name: "Contacts", href: "/contacts", icon: Contact },
      { name: "Accounts", href: "/customers", icon: Users },
    ],
  },
  {
    label: "Management",
    items: [
      { name: "Locations", href: "/locations", icon: MapPin },
      { name: "Materials", href: "/materials", icon: Layers },
      { name: "Rate Cards", href: "/rate-cards", icon: CreditCard },
      { name: "Drivers", href: "/drivers", icon: Truck },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Estimates", href: "/estimates", icon: FileText },
      { name: "Invoices", href: "/invoices", icon: Receipt },
      { name: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [{ name: "Settings", href: "/settings", icon: Settings }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-zinc-900 text-zinc-100">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-5">
        <Mountain className="h-6 w-6 text-amber-500" />
        <span className="text-lg font-bold tracking-tight">AggregateOS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "border-l-2 border-amber-500 bg-zinc-800 text-white"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Version indicator */}
      <div className="border-t border-zinc-800 px-5 py-3">
        <p className="text-xs text-zinc-500">v0.1.0 &mdash; Phase 1</p>
      </div>
    </aside>
  );
}
