"use client";

import { useState, useMemo } from "react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Separator,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@aggregateos/ui";
import {
  Truck,
  MapPin,
  Package,
  CheckCircle,
  AlertTriangle,
  Activity,
  ArrowRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  Star,
  User,
  Calendar,
  DollarSign,
  FileText,
  Check,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectedDriver {
  driverId: string;
  vehicleId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Dispatch Board Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function DispatchPage() {
  // ── State ─────────────────────────────────────────────────────────────────
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<SelectedDriver[]>([]);
  const [loadCount, setLoadCount] = useState(1);
  const [scheduledPickupStart, setScheduledPickupStart] = useState("");
  const [invoiceRatePerTon, setInvoiceRatePerTon] = useState("");
  const [driverPayRate, setDriverPayRate] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  // ── Queries ───────────────────────────────────────────────────────────────

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
  } = trpc.order.list.useQuery(
    { status: "active", limit: 50 },
    { refetchInterval: 30_000 }
  );

  const { data: stats, isLoading: statsLoading } =
    trpc.load.todayStats.useQuery(undefined, { refetchInterval: 30_000 });

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId || !ordersData?.items) return null;
    return ordersData.items.find((o) => o.id === selectedOrderId) ?? null;
  }, [selectedOrderId, ordersData]);

  const {
    data: eligibleDrivers,
    isLoading: driversLoading,
  } = trpc.dispatch.eligibleDrivers.useQuery(
    {
      materialId: selectedOrder?.materialId ?? undefined,
      excludeDriverIds: selectedDrivers.map((d) => d.driverId),
    },
    { enabled: !!selectedOrderId }
  );

  const {
    data: recentDispatches,
    isLoading: dispatchesLoading,
  } = trpc.dispatch.list.useQuery(
    { limit: 10 },
    { refetchInterval: 30_000 }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createDispatchMutation = trpc.dispatch.create.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Dispatch created with ${data.loads.length} load${data.loads.length !== 1 ? "s" : ""}`
      );
      resetForm();
      utils.dispatch.list.invalidate();
      utils.order.list.invalidate();
      utils.load.list.invalidate();
      utils.load.todayStats.invalidate();
      utils.dispatch.eligibleDrivers.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to create dispatch: " + err.message);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const resetForm = () => {
    setSelectedOrderId(null);
    setSelectedDrivers([]);
    setLoadCount(1);
    setScheduledPickupStart("");
    setInvoiceRatePerTon("");
    setDriverPayRate("");
    setNotes("");
  };

  const handleSelectOrder = (orderId: string) => {
    if (selectedOrderId === orderId) {
      resetForm();
    } else {
      setSelectedOrderId(orderId);
      setSelectedDrivers([]);
      setLoadCount(1);
    }
  };

  const toggleDriverSelection = (
    driverId: string,
    vehicleId?: string | null
  ) => {
    setSelectedDrivers((prev) => {
      const exists = prev.find((d) => d.driverId === driverId);
      if (exists) {
        return prev.filter((d) => d.driverId !== driverId);
      }
      if (prev.length >= loadCount) {
        toast.error(`Cannot select more than ${loadCount} driver(s)`);
        return prev;
      }
      return [
        ...prev,
        { driverId, vehicleId: vehicleId ?? undefined },
      ];
    });
  };

  const handleDispatch = () => {
    if (!selectedOrderId) return;
    createDispatchMutation.mutate({
      orderId: selectedOrderId,
      loadCount,
      driverAssignments:
        selectedDrivers.length > 0 ? selectedDrivers : undefined,
      scheduledPickupStart: scheduledPickupStart || undefined,
      invoiceRatePerTon: invoiceRatePerTon || undefined,
      driverPayRate: driverPayRate || undefined,
      notes: notes || undefined,
    });
  };

  const handleRefresh = () => {
    utils.order.list.invalidate();
    utils.load.todayStats.invalidate();
    utils.dispatch.list.invalidate();
    utils.dispatch.eligibleDrivers.invalidate();
    toast.success("Data refreshed");
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const orders = ordersData?.items ?? [];
  const dispatches = recentDispatches?.items ?? [];

  // ── Loading state ─────────────────────────────────────────────────────────

  if (ordersLoading && statsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-96 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (ordersError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dispatch Board</h1>
          <p className="text-sm text-muted-foreground">
            Create dispatches and assign drivers to orders
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">
            Failed to load dispatch data
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {ordersError.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dispatch Board</h1>
          <p className="text-sm text-muted-foreground">
            Create dispatches and assign drivers to orders
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* ─── KPI Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Loads</p>
              <p className="text-2xl font-bold">{stats?.totalToday ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{stats?.activeNow ?? 0}</p>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exceptions</p>
              <p className="text-2xl font-bold">{stats?.exceptions ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Three-Panel Layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6">
        {/* ── Left Panel: Active Orders ─────────────────────────────── */}
        <div className="col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Active Orders</span>
                <Badge variant="secondary" className="font-mono">
                  {orders.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ordersLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-20 animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <Package className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-4 text-sm font-medium">
                    No active orders
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground text-center">
                    Active orders will appear here for dispatching
                  </p>
                </div>
              ) : (
                <div className="max-h-[520px] overflow-y-auto">
                  {orders.map((order) => {
                    const isSelected = selectedOrderId === order.id;
                    return (
                      <button
                        key={order.id}
                        onClick={() => handleSelectOrder(order.id)}
                        className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-accent/50 ${
                          isSelected
                            ? "bg-accent border-l-4 border-l-primary"
                            : "border-l-4 border-l-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-sm">
                                {order.orderNumber}
                              </span>
                              <Badge variant="info" size="sm">
                                Active
                              </Badge>
                            </div>
                            <p className="text-sm font-medium truncate">
                              {order.customerName ?? "Unknown Customer"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {order.materialName ?? "Unknown Material"}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {order.originName ?? "Origin"} →{" "}
                                {order.destinationId
                                  ? order.destinationId.slice(0, 8) + "…"
                                  : "Destination"}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Qty
                            </p>
                            <p className="text-sm font-semibold">
                              {order.quantityDelivered ?? "0"}/
                              {order.quantityOrdered}
                            </p>
                            {order.scheduledDate && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(
                                  order.scheduledDate
                                ).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Center Panel: Create Dispatch Form ────────────────────── */}
        <div className="col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Create Dispatch</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedOrder ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ArrowRight className="h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    Select an order to dispatch
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Click an order from the left panel to begin
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Order context */}
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold">
                        {selectedOrder.orderNumber}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={resetForm}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Customer:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.customerName ?? "—"}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Material:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.materialName ?? "—"}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Route:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.originName ?? "Origin"} → Destination
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">
                        Qty Ordered:
                      </span>{" "}
                      <span className="font-medium">
                        {selectedOrder.quantityOrdered}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        Delivered:
                      </span>{" "}
                      <span className="font-medium">
                        {selectedOrder.quantityDelivered ?? "0"}
                      </span>
                    </p>
                  </div>

                  <Separator />

                  {/* Load count */}
                  <div className="space-y-2">
                    <Label htmlFor="loadCount">Number of Loads</Label>
                    <Input
                      id="loadCount"
                      type="number"
                      min={1}
                      max={50}
                      value={loadCount}
                      onChange={(e) =>
                        setLoadCount(
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                    />
                  </div>

                  {/* Scheduled pickup start */}
                  <div className="space-y-2">
                    <Label htmlFor="scheduledPickup">
                      Scheduled Pickup Start
                    </Label>
                    <Input
                      id="scheduledPickup"
                      type="datetime-local"
                      value={scheduledPickupStart}
                      onChange={(e) => setScheduledPickupStart(e.target.value)}
                    />
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="invoiceRate">
                        <DollarSign className="inline h-3 w-3 mr-1" />
                        Invoice Rate/Ton
                      </Label>
                      <Input
                        id="invoiceRate"
                        type="text"
                        placeholder="0.00"
                        value={invoiceRatePerTon}
                        onChange={(e) => setInvoiceRatePerTon(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driverPay">
                        <DollarSign className="inline h-3 w-3 mr-1" />
                        Driver Pay Rate
                      </Label>
                      <Input
                        id="driverPay"
                        type="text"
                        placeholder="0.00"
                        value={driverPayRate}
                        onChange={(e) => setDriverPayRate(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Assigned drivers summary */}
                  {selectedDrivers.length > 0 && (
                    <div className="space-y-2">
                      <Label>
                        Assigned Drivers ({selectedDrivers.length}/{loadCount})
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDrivers.map((d) => {
                          const driver = eligibleDrivers?.find(
                            (ed) => ed.id === d.driverId
                          );
                          return (
                            <Badge
                              key={d.driverId}
                              variant="secondary"
                              className="gap-1 pr-1"
                            >
                              {driver?.name ?? d.driverId.slice(0, 8)}
                              <button
                                onClick={() =>
                                  toggleDriverSelection(d.driverId)
                                }
                                className="ml-1 rounded-full hover:bg-muted p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">
                      <FileText className="inline h-3 w-3 mr-1" />
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Special instructions, gate codes, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Dispatch button */}
                  <Button
                    className="w-full"
                    onClick={handleDispatch}
                    disabled={createDispatchMutation.isPending}
                  >
                    {createDispatchMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Dispatching...
                      </>
                    ) : (
                      <>
                        <Truck className="mr-2 h-4 w-4" />
                        Dispatch {loadCount} Load
                        {loadCount !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right Panel: Eligible Drivers ─────────────────────────── */}
        <div className="col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Eligible Drivers</span>
                {eligibleDrivers && (
                  <Badge variant="secondary" className="font-mono">
                    {eligibleDrivers.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedOrderId ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <User className="h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    Select an order first
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground text-center">
                    Eligible drivers will be shown based on the order&apos;s
                    material requirements
                  </p>
                </div>
              ) : driversLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : !eligibleDrivers || eligibleDrivers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <User className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-4 text-sm font-medium">
                    No eligible drivers
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground text-center">
                    No drivers match the material and availability requirements
                  </p>
                </div>
              ) : (
                <div className="max-h-[520px] overflow-y-auto">
                  {eligibleDrivers.map((driver) => {
                    const isSelected = selectedDrivers.some(
                      (d) => d.driverId === driver.id
                    );
                    const reliability = driver.reliabilityScore
                      ? Number(driver.reliabilityScore).toFixed(2)
                      : null;

                    return (
                      <button
                        key={driver.id}
                        onClick={() =>
                          toggleDriverSelection(
                            driver.id,
                            driver.vehicleId
                          )
                        }
                        className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-accent/50 ${
                          isSelected
                            ? "bg-green-50/50 border-l-4 border-l-green-500"
                            : "border-l-4 border-l-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              isSelected
                                ? "bg-green-100 text-green-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isSelected ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm truncate">
                                {driver.name}
                              </p>
                              <Badge
                                variant={
                                  driver.status === "available"
                                    ? "success"
                                    : "secondary"
                                }
                                size="sm"
                              >
                                {driver.status === "available"
                                  ? "Available"
                                  : (driver.status ?? "Unknown")}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              {driver.vehicle && (
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  {driver.vehicle.unitNumber ??
                                    driver.vehicle.licensePlate ??
                                    "Vehicle"}
                                </span>
                              )}
                              {reliability && (
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-amber-500" />
                                  {reliability}
                                </span>
                              )}
                            </div>
                            {/* Capability badges */}
                            {driver.vehicle && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {driver.vehicle.asphaltOk && (
                                  <Badge
                                    variant="secondary"
                                    size="sm"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    Asphalt
                                  </Badge>
                                )}
                                {driver.vehicle.concreteOk && (
                                  <Badge
                                    variant="secondary"
                                    size="sm"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    Concrete
                                  </Badge>
                                )}
                                {driver.vehicle.type && (
                                  <Badge
                                    variant="secondary"
                                    size="sm"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {driver.vehicle.type}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Recent Dispatches Table ──────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Dispatches</h2>

        {dispatchesLoading ? (
          <div className="rounded-md border">
            <div className="space-y-0 divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ) : dispatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12">
            <Truck className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">No dispatches yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dispatches will appear here after you create them
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispatch ID</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Loads</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatches.map((dispatch) => (
                  <TableRow key={dispatch.id}>
                    <TableCell className="font-mono text-sm">
                      {dispatch.id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-sm">
                      {dispatch.orderNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {dispatch.customerName ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {dispatch.loadCount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {dispatch.notes || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dispatch.createdAt
                        ? new Date(dispatch.createdAt).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
