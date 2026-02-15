"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Separator,
} from "@aggregateos/ui";
import {
  Plus,
  Package,
  CheckCircle,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

type OrderStatus = "active" | "completed" | "cancelled";

const STATUS_BADGE: Record<
  string,
  { variant: "info" | "success" | "secondary"; label: string }
> = {
  active: { variant: "info", label: "Active" },
  completed: { variant: "success", label: "Completed" },
  cancelled: { variant: "secondary", label: "Cancelled" },
};

const ORDER_TYPES = [
  { value: "material_haul", label: "Material Haul" },
  { value: "haul_only", label: "Haul Only" },
  { value: "hourly", label: "Hourly" },
  { value: "contract", label: "Contract" },
] as const;

type OrderType = (typeof ORDER_TYPES)[number]["value"];

const ORDER_TYPE_BADGE: Record<
  string,
  { variant: "info" | "purple" | "orange" | "secondary"; label: string }
> = {
  material_haul: { variant: "info", label: "Material Haul" },
  haul_only: { variant: "purple", label: "Haul Only" },
  hourly: { variant: "orange", label: "Hourly" },
  contract: { variant: "secondary", label: "Contract" },
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Fulfillment Progress Bar
// ---------------------------------------------------------------------------

function FulfillmentBar({
  delivered,
  ordered,
}: {
  delivered: number;
  ordered: number;
}) {
  const pct = ordered > 0 ? Math.min(100, (delivered / ordered) * 100) : 0;
  const color =
    pct >= 100
      ? "bg-emerald-500"
      : pct >= 50
        ? "bg-blue-500"
        : "bg-amber-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {delivered}/{ordered}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Order Dialog
// ---------------------------------------------------------------------------

function NewOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();

  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [orderType, setOrderType] = useState<OrderType | "">("");
  const [materialId, setMaterialId] = useState("");
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [quantityOrdered, setQuantityOrdered] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [billingTerms, setBillingTerms] = useState("");
  const [specialConstraints, setSpecialConstraints] = useState("");
  const [notes, setNotes] = useState("");

  // Lookup data
  const { data: customerData } = trpc.customer.list.useQuery(
    { limit: 200 },
    { enabled: open }
  );
  const { data: materialData } = trpc.material.list.useQuery(undefined, {
    enabled: open,
  });
  const { data: locationData } = trpc.location.list.useQuery(undefined, {
    enabled: open,
  });
  const { data: projectData } = trpc.project.list.useQuery(undefined, {
    enabled: open,
  });

  const createMutation = trpc.order.create.useMutation({
    onSuccess: () => {
      toast.success("Order created successfully");
      utils.order.list.invalidate();
      resetForm();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(`Failed to create order: ${err.message}`);
    },
  });

  const resetForm = () => {
    setCustomerId("");
    setProjectId("");
    setOrderType("");
    setMaterialId("");
    setOriginId("");
    setDestinationId("");
    setQuantityOrdered("");
    setScheduledDate("");
    setBillingTerms("");
    setSpecialConstraints("");
    setNotes("");
  };

  const handleSubmit = () => {
    if (!customerId || !orderType || !materialId || !originId || !destinationId) {
      toast.error("Please fill in all required fields");
      return;
    }

    createMutation.mutate({
      customerId,
      projectId: projectId || undefined,
      orderType,
      materialId,
      originId,
      destinationId,
      quantityOrdered: quantityOrdered ? Number(quantityOrdered) : undefined,
      scheduledDate: scheduledDate || undefined,
      billingTerms: billingTerms || undefined,
      specialConstraints: specialConstraints || undefined,
      notes: notes || undefined,
    });
  };

  const customers = customerData?.items ?? [];
  const materials = materialData?.items ?? materialData ?? [];
  const locations = locationData?.items ?? locationData ?? [];
  const projects = projectData?.items ?? projectData ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Order</DialogTitle>
          <DialogDescription>
            Create a new delivery order with the details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer */}
          <div className="space-y-2">
            <Label>
              Customer <span className="text-red-500">*</span>
            </Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer..." />
              </SelectTrigger>
              <SelectContent>
                {(customers as { id: string; name: string }[]).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project (optional) */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project (optional)..." />
              </SelectTrigger>
              <SelectContent>
                {(projects as { id: string; name: string }[]).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <Label>
              Order Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={orderType}
              onValueChange={(v) => setOrderType(v as OrderType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select order type..." />
              </SelectTrigger>
              <SelectContent>
                {ORDER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Material */}
          <div className="space-y-2">
            <Label>
              Material <span className="text-red-500">*</span>
            </Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger>
                <SelectValue placeholder="Select material..." />
              </SelectTrigger>
              <SelectContent>
                {(materials as { id: string; name: string }[]).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Origin / Destination side-by-side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Origin <span className="text-red-500">*</span>
              </Label>
              <Select value={originId} onValueChange={setOriginId}>
                <SelectTrigger>
                  <SelectValue placeholder="Origin..." />
                </SelectTrigger>
                <SelectContent>
                  {(locations as { id: string; name: string }[]).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Destination <span className="text-red-500">*</span>
              </Label>
              <Select value={destinationId} onValueChange={setDestinationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Destination..." />
                </SelectTrigger>
                <SelectContent>
                  {(locations as { id: string; name: string }[]).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity & Scheduled Date side-by-side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity Ordered</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 500"
                value={quantityOrdered}
                onChange={(e) => setQuantityOrdered(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>

          {/* Billing Terms */}
          <div className="space-y-2">
            <Label>Billing Terms</Label>
            <Input
              placeholder="e.g. Net 30, COD"
              value={billingTerms}
              onChange={(e) => setBillingTerms(e.target.value)}
            />
          </div>

          {/* Special Constraints */}
          <div className="space-y-2">
            <Label>Special Constraints</Label>
            <Textarea
              value={specialConstraints}
              onChange={(e) => setSpecialConstraints(e.target.value)}
              placeholder="Delivery windows, access restrictions, etc."
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createMutation.isPending ||
              !customerId ||
              !orderType ||
              !materialId ||
              !originId ||
              !destinationId
            }
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Table Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="space-y-0 divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-2 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-8 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filters
  const [customerFilter, setCustomerFilter] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("");

  const statusFilter: OrderStatus | undefined =
    activeTab === "all" ? undefined : (activeTab as OrderStatus);

  // ---------- Queries ----------

  const { data, isLoading, error } = trpc.order.list.useQuery({
    status: statusFilter,
    customerId: customerFilter || undefined,
    orderType: orderTypeFilter || undefined,
    page,
    limit: PAGE_SIZE,
  });

  // Customer list for filter dropdown
  const { data: customerData } = trpc.customer.list.useQuery({ limit: 200 });

  // ---------- Derived ----------

  const orders = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  // Compute stats from data (lightweight, no separate endpoint needed)
  const allOrders = data?.items ?? [];
  const activeCount = allOrders.filter((o) => o.status === "active").length;
  const completedCount = allOrders.filter(
    (o) => o.status === "completed"
  ).length;

  // Calculate fulfillment rate from visible orders
  const totalOrdered = allOrders.reduce(
    (sum, o) => sum + (Number(o.quantityOrdered) || 0),
    0
  );
  const totalDelivered = allOrders.reduce(
    (sum, o) => sum + (Number(o.quantityDelivered) || 0),
    0
  );
  const fulfillmentPct =
    totalOrdered > 0
      ? ((totalDelivered / totalOrdered) * 100).toFixed(1)
      : "—";

  const customers = customerData?.items ?? [];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
  };

  const clearFilters = () => {
    setCustomerFilter("");
    setOrderTypeFilter("");
    setPage(1);
  };

  const hasFilters = !!customerFilter || !!orderTypeFilter;

  // ---------- Error state ----------

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Manage delivery orders
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">
            Failed to load orders
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Manage delivery orders
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Active"
          value={isLoading ? "—" : activeCount}
          icon={Package}
        />
        <StatCard
          title="Completed"
          value={isLoading ? "—" : completedCount}
          icon={CheckCircle}
        />
        <StatCard
          title="% Fulfilled"
          value={isLoading ? "—" : typeof fulfillmentPct === "string" ? fulfillmentPct : `${fulfillmentPct}%`}
          icon={TrendingUp}
        />
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Customers</SelectItem>
            {(customers as { id: string; name: string }[]).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Types</SelectItem>
            {ORDER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Tabs & Table */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Results count */}
          {!isLoading && totalCount > 0 && (
            <p className="mb-4 text-sm text-muted-foreground">
              {totalCount} order{totalCount !== 1 ? "s" : ""}
            </p>
          )}

          {isLoading ? (
            <TableSkeleton />
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16">
              <Package className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No orders found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab !== "all" || hasFilters
                  ? "No orders match the current filters"
                  : "Get started by creating your first order"}
              </p>
              {!hasFilters && activeTab === "all" && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Order
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
                      <TableHead>Order #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const badge =
                        STATUS_BADGE[order.status ?? "active"] ??
                        STATUS_BADGE.active;
                      const typeBadge =
                        ORDER_TYPE_BADGE[order.orderType ?? ""] ?? null;

                      const qtyOrdered = Number(order.quantityOrdered) || 0;
                      const qtyDelivered =
                        Number(order.quantityDelivered) || 0;

                      return (
                        <TableRow key={order.id}>
                          {/* Order # */}
                          <TableCell className="font-mono font-semibold">
                            {order.orderNumber}
                          </TableCell>

                          {/* Type badge */}
                          <TableCell>
                            {typeBadge ? (
                              <Badge size="sm" variant={typeBadge.variant}>
                                {typeBadge.label}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {order.orderType ?? "—"}
                              </span>
                            )}
                          </TableCell>

                          {/* Customer */}
                          <TableCell>
                            {order.customerName ?? "—"}
                          </TableCell>

                          {/* Material */}
                          <TableCell>
                            {order.materialName ?? "—"}
                          </TableCell>

                          {/* Route: Origin → Destination */}
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <span>
                                {order.originName ?? "—"}
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span>
                                {order.destinationName ?? "—"}
                              </span>
                            </div>
                          </TableCell>

                          {/* Fulfillment */}
                          <TableCell>
                            {qtyOrdered > 0 ? (
                              <FulfillmentBar
                                delivered={qtyDelivered}
                                ordered={qtyOrdered}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge variant={badge.variant}>
                              {badge.label}
                            </Badge>
                          </TableCell>

                          {/* Date */}
                          <TableCell className="text-sm text-muted-foreground">
                            {order.createdAt
                              ? new Date(
                                  order.createdAt
                                ).toLocaleDateString()
                              : "—"}
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <Link href={`/orders/${order.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8"
                              >
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} &middot; {totalCount} total
                    orders
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
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* New Order Dialog */}
      <NewOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
