"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@aggregateos/ui";
import {
  ArrowLeft,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const EXCEPTION_LABELS: Record<string, string> = {
  missing_pricing: "Missing Pricing",
  status_delivered: "Awaiting Ticket",
  status_ticket_uploaded: "Ticket Pending Review",
  status_ticket_verified: "Awaiting Billable Status",
  late_pickup: "Late Pickup",
  late_delivery: "Late Delivery",
  rejected_ticket: "Rejected Ticket",
  tonnage_mismatch: "Tonnage Mismatch",
};

const EXCEPTION_BADGE_VARIANT: Record<string, "error" | "orange" | "secondary"> = {
  missing_pricing: "error",
  status_delivered: "orange",
  status_ticket_uploaded: "orange",
  status_ticket_verified: "secondary",
  late_pickup: "error",
  late_delivery: "error",
  rejected_ticket: "error",
  tonnage_mismatch: "orange",
};

const PAGE_SIZE = 20;

// ── Page ───────────────────────────────────────────────────────────────────

export default function InvoiceExceptionsPage() {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [market, setMarket] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.invoice.getExceptions.useQuery({
    periodStart: periodStart || undefined,
    periodEnd: periodEnd || undefined,
    market: market !== "all" ? market : undefined,
    customerId: customerFilter !== "all" ? customerFilter : undefined,
    page,
    limit: PAGE_SIZE,
  });

  const { data: customers } = trpc.customer.list.useQuery({ limit: 100 });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // Summary stats by reason
  const reasonCounts = items.reduce(
    (acc, item) => {
      acc[item.reason] = (acc[item.reason] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Billing Exceptions
            </h1>
            <p className="text-sm text-muted-foreground">
              Loads blocked from billing that need attention
            </p>
          </div>
        </div>
        {totalCount > 0 && (
          <Badge variant="error" size="sm">
            {totalCount} exception{totalCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Summary Stats */}
      {Object.keys(reasonCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(reasonCounts).map(([reason, count]) => (
            <Card key={reason} className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={EXCEPTION_BADGE_VARIANT[reason] ?? "secondary"}
                  size="sm"
                >
                  {count}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {EXCEPTION_LABELS[reason] ?? reason}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Period Start</Label>
          <Input
            type="date"
            value={periodStart}
            onChange={(e) => {
              setPeriodStart(e.target.value);
              setPage(1);
            }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Period End</Label>
          <Input
            type="date"
            value={periodEnd}
            onChange={(e) => {
              setPeriodEnd(e.target.value);
              setPage(1);
            }}
            className="w-40"
          />
        </div>
        <Select
          value={customerFilter}
          onValueChange={(v) => {
            setCustomerFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {(customers?.items ?? []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-md border">
          <div className="space-y-0 divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16 text-muted-foreground">
          <AlertTriangle className="h-10 w-10" />
          <p className="mt-4 text-lg font-medium">No exceptions found</p>
          <p className="mt-1 text-sm">
            All loads are ready for billing.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Load #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Exception</TableHead>
                  <TableHead>Load Status</TableHead>
                  <TableHead className="text-right">Tons</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.load.id}>
                    <TableCell className="font-mono font-medium">
                      {item.loadNumber}
                    </TableCell>
                    <TableCell>{item.customerName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          EXCEPTION_BADGE_VARIANT[item.reason] ?? "secondary"
                        }
                        size="sm"
                      >
                        {EXCEPTION_LABELS[item.reason] ?? item.reason}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" size="sm">
                        {item.load.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.load.billableTons
                        ? Number(item.load.billableTons).toFixed(2)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/loads/${item.load.id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} &middot; {totalCount} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
