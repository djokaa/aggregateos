"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@aggregateos/ui";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Truck,
  Package,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  UserPlus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  Filter,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  LOAD_STATUS_LABELS,
  LOAD_STATUS_VARIANT,
  LOAD_STATUSES,
  type LoadStatus,
} from "@aggregateos/shared";

const PAGE_SIZE = 20;

function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function computeMargin(
  invoiceRate: string | null | undefined,
  driverPay: string | null | undefined,
): { percent: number; direction: "up" | "down" | "neutral" } | null {
  if (!invoiceRate || !driverPay) return null;
  const inv = parseFloat(invoiceRate);
  const pay = parseFloat(driverPay);
  if (isNaN(inv) || isNaN(pay) || inv === 0) return null;
  const percent = ((inv - pay) / inv) * 100;
  if (percent > 5) return { percent, direction: "up" };
  if (percent < 0) return { percent, direction: "down" };
  return { percent, direction: "neutral" };
}

export default function LoadsPage() {
  const router = useRouter();

  // Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Assign driver dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Debounce search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFilter, customerFilter, exceptionsOnly]);

  // Queries
  const { data, isLoading, error } = trpc.load.list.useQuery(
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      date: dateFilter || undefined,
      customerId: customerFilter !== "all" ? customerFilter : undefined,
      exceptionsOnly: exceptionsOnly || undefined,
      search: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { refetchInterval: 30_000 },
  );

  const { data: stats } = trpc.load.todayStats.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const { data: customers } = trpc.customer.list.useQuery({
    limit: 100,
    page: 1,
  });

  const { data: availableDrivers } = trpc.driver.available.useQuery(undefined, {
    enabled: assignDialogOpen,
  });

  // Mutations
  const assignDriverMutation = trpc.load.assignDriver.useMutation({
    onSuccess: () => {
      toast.success("Driver assigned successfully");
      setAssignDialogOpen(false);
      setSelectedLoadId(null);
      utils.load.list.invalidate();
      utils.load.todayStats.invalidate();
      utils.driver.available.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to assign driver: " + err.message);
    },
  });

  const handleAssignDriver = (driverId: string) => {
    if (!selectedLoadId) return;
    assignDriverMutation.mutate({ loadId: selectedLoadId, driverId });
  };

  const openAssignDialog = (loadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLoadId(loadId);
    setAssignDialogOpen(true);
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    dateFilter !== "" ||
    customerFilter !== "all" ||
    exceptionsOnly;

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFilter("");
    setCustomerFilter("all");
    setExceptionsOnly(false);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-40 animate-pulse rounded bg-muted"
            />
          ))}
        </div>
        <div className="rounded-md border">
          <div className="space-y-0 divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loads</h1>
          <p className="text-sm text-muted-foreground">
            Manage hauling loads and track deliveries
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">
            Failed to load data
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const loads = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loads</h1>
          <p className="text-sm text-muted-foreground">
            Manage hauling loads and track deliveries
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            utils.load.list.invalidate();
            utils.load.todayStats.invalidate();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Today</p>
              <p className="text-2xl font-bold">{stats?.totalToday ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivered</p>
              <p className="text-2xl font-bold">
                {stats?.deliveredToday ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Truck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Now</p>
              <p className="text-2xl font-bold">{stats?.activeNow ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exceptions</p>
              <p className="text-2xl font-bold">{stats?.exceptions ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by load #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LOAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {LOAD_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date filter */}
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-44 pl-9"
          />
        </div>

        {/* Customer filter */}
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {(customers?.items ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Exceptions Only Toggle */}
        <Button
          variant={exceptionsOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setExceptionsOnly((v) => !v)}
          className="gap-2"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Exceptions Only
        </Button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        {/* Count */}
        {totalCount > 0 && (
          <p className="ml-auto text-sm text-muted-foreground">
            {totalCount} load{totalCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Empty state */}
      {loads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No loads found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasActiveFilters || debouncedSearch
              ? "Try adjusting your filters or search terms"
              : "No loads have been created yet"}
          </p>
          {(hasActiveFilters || debouncedSearch) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                clearFilters();
                setSearch("");
              }}
            >
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Data Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Load #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="text-right">Billable</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loads.map((load) => {
                  const status = load.status as LoadStatus;
                  const margin = computeMargin(
                    load.invoiceRatePerTon,
                    load.driverPayRate,
                  );
                  const billableAmount =
                    load.billableTons && load.invoiceRatePerTon
                      ? parseFloat(load.billableTons) *
                        parseFloat(load.invoiceRatePerTon)
                      : null;

                  return (
                    <TableRow
                      key={load.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/loads/${load.id}`)}
                    >
                      <TableCell className="font-mono font-semibold">
                        {load.loadNumber}
                      </TableCell>
                      <TableCell>
                        {load.customerName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {load.materialName ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="max-w-[120px] truncate">
                            {load.originName ?? "—"}
                          </span>
                          <span className="text-xs">→</span>
                          <span className="max-w-[120px] truncate text-foreground">
                            Drop
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={LOAD_STATUS_VARIANT[status] ?? "secondary"}
                          size="sm"
                        >
                          {LOAD_STATUS_LABELS[status] ?? status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {load.driverName ? (
                          <span className="text-sm">{load.driverName}</span>
                        ) : (
                          <button
                            className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
                            onClick={(e) => openAssignDialog(load.id, e)}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Assign
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {load.scheduledPickupTime
                          ? `${formatDate(load.scheduledPickupTime)} ${formatTime(load.scheduledPickupTime)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {billableAmount != null
                          ? formatCurrency(billableAmount)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {margin ? (
                          <span
                            className={`inline-flex items-center gap-1 text-sm font-medium ${
                              margin.direction === "up"
                                ? "text-green-600"
                                : margin.direction === "down"
                                  ? "text-red-600"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {margin.direction === "up" ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : margin.direction === "down" ? (
                              <TrendingDown className="h-3.5 w-3.5" />
                            ) : (
                              <Minus className="h-3.5 w-3.5" />
                            )}
                            {margin.percent.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
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

      {/* Assign Driver Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
            <DialogDescription>
              Select an available driver to assign to this load.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {!availableDrivers || availableDrivers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No available drivers
              </p>
            ) : (
              availableDrivers.map((driver) => (
                <button
                  key={driver.id}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                  onClick={() => handleAssignDriver(driver.id)}
                  disabled={assignDriverMutation.isPending}
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="font-medium">{driver.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {driver.phone}
                      {driver.vehicleId &&
                        ` · Vehicle: ${driver.vehicleId.slice(0, 8)}…`}
                    </p>
                  </div>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
