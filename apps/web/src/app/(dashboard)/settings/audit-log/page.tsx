"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@aggregateos/ui";
import {
  ArrowLeft,
  Search,
  Filter,
  Shield,
  User,
  Truck,
  FileText,
  Receipt,
  MapPin,
  Package,
  Clock,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

// --- Mock Data ---

interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  details: string;
  timestamp: string;
  category: "operations" | "finance" | "management" | "system";
  icon: LucideIcon;
}

const auditEntries: AuditEntry[] = [
  { id: "1", action: "load.status_updated", actor: "Tommy Williams", target: "LD-000015", details: "Status changed from 'en_route_delivery' to 'delivered'", timestamp: "2026-02-14T14:32:00Z", category: "operations", icon: Truck },
  { id: "2", action: "invoice.created", actor: "Emily Davis", target: "INV-000023", details: "Invoice created for Turner Construction ($4,250.00)", timestamp: "2026-02-14T14:15:00Z", category: "finance", icon: Receipt },
  { id: "3", action: "estimate.approved", actor: "Sarah Johnson", target: "EST-000045", details: "Estimate approved by Lennar Homes", timestamp: "2026-02-14T13:48:00Z", category: "finance", icon: FileText },
  { id: "4", action: "driver.assigned", actor: "Mike Thompson", target: "LD-000016", details: "Carlos Rivera assigned to load LD-000016", timestamp: "2026-02-14T13:30:00Z", category: "operations", icon: User },
  { id: "5", action: "location.created", actor: "Ivan Martinez", target: "Eagle Rock Quarry", details: "New quarry location added with geocoding", timestamp: "2026-02-14T12:15:00Z", category: "management", icon: MapPin },
  { id: "6", action: "ticket.verified", actor: "Emily Davis", target: "LD-000012", details: "Ticket verified: 22.4 tons #57 Limestone (confidence: 94%)", timestamp: "2026-02-14T11:45:00Z", category: "operations", icon: Package },
  { id: "7", action: "user.login", actor: "Ivan Martinez", target: "System", details: "Logged in from Chrome on macOS", timestamp: "2026-02-14T09:00:00Z", category: "system", icon: Shield },
  { id: "8", action: "load.created", actor: "Mike Thompson", target: "LD-000017", details: "New load created from order ORD-000008", timestamp: "2026-02-14T08:45:00Z", category: "operations", icon: Truck },
  { id: "9", action: "payment.received", actor: "System", target: "INV-000019", details: "Payment of $6,780.00 received from DOT Highway Division", timestamp: "2026-02-13T16:30:00Z", category: "finance", icon: Receipt },
  { id: "10", action: "estimate.sent", actor: "Sarah Johnson", target: "EST-000046", details: "Estimate emailed to Toll Brothers ($12,500.00)", timestamp: "2026-02-13T15:00:00Z", category: "finance", icon: FileText },
];

const categoryColors: Record<string, string> = {
  operations: "bg-blue-100 text-blue-600",
  finance: "bg-green-100 text-green-600",
  management: "bg-purple-100 text-purple-600",
  system: "bg-zinc-100 text-zinc-600",
};

const categoryBadgeVariant: Record<string, "info" | "success" | "purple" | "secondary"> = {
  operations: "info",
  finance: "success",
  management: "purple",
  system: "secondary",
};

function formatActionName(action: string): string {
  return action
    .split(".")
    .map((part) =>
      part
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    )
    .join(" ");
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date("2026-02-14T15:00:00Z"); // Mock current time
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState("today");

  const filteredEntries = auditEntries.filter((entry) => {
    const matchesSearch =
      entry.action.toLowerCase().includes(search.toLowerCase()) ||
      entry.actor.toLowerCase().includes(search.toLowerCase()) ||
      entry.target.toLowerCase().includes(search.toLowerCase()) ||
      entry.details.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || entry.category === categoryFilter;

    // Date range filter
    let matchesDate = true;
    const entryDate = new Date(entry.timestamp);
    const now = new Date("2026-02-14T15:00:00Z");
    if (dateRange === "today") {
      matchesDate = entryDate.toDateString() === now.toDateString();
    } else if (dateRange === "7days") {
      matchesDate = now.getTime() - entryDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
    } else if (dateRange === "30days") {
      matchesDate = now.getTime() - entryDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Track all system activity and changes across your organization
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search audit log..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="management">Management</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]">
            <Clock className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Audit Entries */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredEntries.map((entry) => {
              const IconComponent = entry.icon;
              return (
                <div key={entry.id} className="flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${categoryColors[entry.category]}`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {formatActionName(entry.action)}
                      </span>
                      <Badge variant={categoryBadgeVariant[entry.category] ?? "secondary"} size="sm">
                        {entry.category}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      <span className="font-medium text-zinc-700">{entry.actor}</span>
                      {" \u2192 "}
                      <span className="font-mono text-xs">{entry.target}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.details}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(entry.timestamp)}
                  </div>
                </div>
              );
            })}
            {filteredEntries.length === 0 && (
              <div className="flex h-24 items-center justify-center text-muted-foreground">
                No audit entries found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Load More */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => toast.info("No more entries to load")}
        >
          <ChevronDown className="mr-2 h-4 w-4" />
          Load More
        </Button>
      </div>
    </div>
  );
}
