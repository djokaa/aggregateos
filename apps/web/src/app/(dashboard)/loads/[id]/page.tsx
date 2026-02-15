"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@aggregateos/ui";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Upload,
  ShieldCheck,
  ImageIcon,
  FileText,
  DollarSign,
  AlertTriangle,
  MapPin,
  Truck,
  User,
  CalendarDays,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  LOAD_STATUS_LABELS,
  LOAD_STATUS_VARIANT,
  LOAD_TRANSITIONS,
  LOAD_STATUSES,
  type LoadStatus,
} from "@aggregateos/shared";

function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export default function LoadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data: load, isLoading, error } = trpc.load.getById.useQuery({ id });

  const updateStatus = trpc.load.updateStatus.useMutation({
    onSuccess: (data) => {
      const newStatus = data.status as LoadStatus;
      toast.success(
        `Load status updated to ${LOAD_STATUS_LABELS[newStatus] ?? newStatus}`,
      );
      utils.load.getById.invalidate({ id });
      utils.load.list.invalidate();
      utils.load.todayStats.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to update status: " + err.message);
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-12 w-full animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-72 animate-pulse rounded-lg border bg-muted" />
          <div className="h-72 animate-pulse rounded-lg border bg-muted" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !load) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/loads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Load</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">
            Load not found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error?.message ?? "The load could not be loaded."}
          </p>
          <Link href="/loads" className="mt-4">
            <Button variant="outline">Back to Loads</Button>
          </Link>
        </div>
      </div>
    );
  }

  const status = load.status as LoadStatus;
  const nextStatuses = LOAD_TRANSITIONS[status] ?? [];
  const primaryNext = nextStatuses.length > 0 ? nextStatuses[0] : null;
  const ticket = load.ticket;
  const order = load.order;
  const driver = load.driver;
  const currentIndex = LOAD_STATUSES.indexOf(status);

  // Pricing calculations
  const invoiceRate = load.invoiceRatePerTon
    ? parseFloat(load.invoiceRatePerTon)
    : null;
  const driverPay = load.driverPayRate
    ? parseFloat(load.driverPayRate)
    : null;
  const fuelSurcharge = load.fuelSurchargeAmount
    ? parseFloat(load.fuelSurchargeAmount)
    : null;
  const billableTons = load.billableTons
    ? parseFloat(load.billableTons)
    : null;
  const totalRevenue =
    invoiceRate != null && billableTons != null
      ? invoiceRate * billableTons + (fuelSurcharge ?? 0)
      : null;
  const totalCost =
    driverPay != null && billableTons != null
      ? driverPay * billableTons
      : null;
  const margin =
    totalRevenue != null && totalCost != null
      ? totalRevenue - totalCost
      : null;
  const marginPercent =
    totalRevenue != null && totalRevenue > 0 && margin != null
      ? (margin / totalRevenue) * 100
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/loads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                {load.loadNumber}
              </h1>
              <Badge variant={LOAD_STATUS_VARIANT[status] ?? "secondary"}>
                {LOAD_STATUS_LABELS[status] ?? status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {order?.customerName && (
                <span>
                  {order.customerName}
                  {order?.materialName && ` · ${order.materialName}`}
                </span>
              )}
              {!order?.customerName && "Load detail and status management"}
            </p>
          </div>
        </div>

        {/* Quick-action status buttons */}
        <div className="flex items-center gap-2">
          {primaryNext && (
            <Button
              onClick={() => updateStatus.mutate({ id, status: primaryNext })}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {LOAD_STATUS_LABELS[primaryNext]}
            </Button>
          )}
          {nextStatuses.slice(1).map((ns) => (
            <Button
              key={ns}
              variant="outline"
              size="sm"
              onClick={() => updateStatus.mutate({ id, status: ns })}
              disabled={updateStatus.isPending}
            >
              {LOAD_STATUS_LABELS[ns]}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Order</p>
              <p className="text-sm font-semibold font-mono">
                {order?.orderNumber ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
              <User className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Driver</p>
              <p className="text-sm font-semibold">
                {driver?.name ?? (
                  <span className="text-amber-600">Unassigned</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billable</p>
              <p className="text-sm font-semibold">
                {billableTons != null ? `${billableTons} tons` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
              <MapPin className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Route</p>
              <p className="text-sm font-semibold truncate max-w-[140px]">
                {order?.originName ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="instructions">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Instructions
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="mr-1.5 h-3.5 w-3.5" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="ticket">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Ticket
          </TabsTrigger>
          <TabsTrigger value="exceptions">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Exceptions
            {load.exceptionType && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                !
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Timeline Tab ─────────────────────────────────── */}
        <TabsContent value="timeline" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Status Timeline */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Status Timeline</CardTitle>
                  <CardDescription>Load lifecycle progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start overflow-x-auto pb-4">
                    {LOAD_STATUSES.map((s, i) => {
                      const isCompleted = i < currentIndex;
                      const isCurrent = i === currentIndex;

                      return (
                        <div key={s} className="flex items-start">
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                isCompleted
                                  ? "bg-green-100"
                                  : isCurrent
                                    ? "bg-amber-100 ring-2 ring-amber-400"
                                    : "bg-gray-100"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : isCurrent ? (
                                <Clock className="h-4 w-4 text-amber-600" />
                              ) : (
                                <Circle className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                            <span
                              className={`mt-2 text-center text-xs leading-tight ${
                                isCompleted
                                  ? "text-green-700 font-medium"
                                  : isCurrent
                                    ? "text-amber-700 font-semibold"
                                    : "text-gray-400"
                              }`}
                              style={{ width: 72 }}
                            >
                              {LOAD_STATUS_LABELS[s]}
                            </span>
                          </div>
                          {i < LOAD_STATUSES.length - 1 && (
                            <div className="mt-4 flex items-center">
                              <div
                                className={`h-0.5 w-6 ${
                                  i < currentIndex
                                    ? "bg-green-400"
                                    : "bg-gray-200"
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle>Timestamps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Scheduled Pickup
                    </p>
                    <p className="text-sm font-medium">
                      {formatDateTime(load.scheduledPickupTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Actual Pickup
                    </p>
                    <p className="text-sm font-medium">
                      {load.actualPickupTime ? (
                        <span className="text-green-600">
                          {formatDateTime(load.actualPickupTime)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Scheduled Delivery
                    </p>
                    <p className="text-sm font-medium">
                      {formatDateTime(load.scheduledDeliveryTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Actual Delivery
                    </p>
                    <p className="text-sm font-medium">
                      {load.actualDeliveryTime ? (
                        <span className="text-green-600">
                          {formatDateTime(load.actualDeliveryTime)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">
                      {formatDateTime(load.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Instructions Tab ─────────────────────────────── */}
        <TabsContent value="instructions" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Pickup Instructions
                </CardTitle>
                <CardDescription>
                  Origin: {order?.originName ?? "—"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {order?.notes || order?.specialConstraints ? (
                  <div className="space-y-4">
                    {order.notes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Notes
                        </p>
                        <p className="whitespace-pre-wrap text-sm">
                          {order.notes}
                        </p>
                      </div>
                    )}
                    {order.specialConstraints && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Special Constraints
                        </p>
                        <p className="whitespace-pre-wrap text-sm">
                          {order.specialConstraints}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No pickup instructions available
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  Drop-off Instructions
                </CardTitle>
                <CardDescription>Delivery destination</CardDescription>
              </CardHeader>
              <CardContent>
                {load.notes ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Load Notes
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{load.notes}</p>
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No drop-off instructions available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Pricing Tab ──────────────────────────────────── */}
        <TabsContent value="pricing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Breakdown</CardTitle>
              <CardDescription>
                Invoice rate, driver pay, and margin analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Invoice Rate */}
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Invoice Rate
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {invoiceRate != null
                      ? `${formatCurrency(invoiceRate)}/ton`
                      : "—"}
                  </p>
                </div>

                {/* Driver Pay */}
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Driver Pay
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {driverPay != null
                      ? `${formatCurrency(driverPay)}/ton`
                      : "—"}
                  </p>
                </div>

                {/* Fuel Surcharge */}
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Fuel Surcharge
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {fuelSurcharge != null
                      ? formatCurrency(fuelSurcharge)
                      : "—"}
                  </p>
                </div>

                {/* Billable Tons */}
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Billable Tons
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {billableTons != null ? billableTons.toFixed(2) : "—"}
                  </p>
                </div>
              </div>

              {/* Margin Summary */}
              {(totalRevenue != null || totalCost != null) && (
                <>
                  <Separator className="my-6" />
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wide">
                        Total Revenue
                      </p>
                      <p className="mt-1 text-2xl font-bold text-green-700">
                        {totalRevenue != null
                          ? formatCurrency(totalRevenue)
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-xs font-medium text-red-600 uppercase tracking-wide">
                        Total Cost
                      </p>
                      <p className="mt-1 text-2xl font-bold text-red-700">
                        {totalCost != null ? formatCurrency(totalCost) : "—"}
                      </p>
                    </div>
                    <div
                      className={`rounded-lg border p-4 ${
                        margin != null && margin >= 0
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <p
                        className={`text-xs font-medium uppercase tracking-wide ${
                          margin != null && margin >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        Margin
                      </p>
                      <p
                        className={`mt-1 text-2xl font-bold ${
                          margin != null && margin >= 0
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {margin != null ? formatCurrency(margin) : "—"}
                        {marginPercent != null && (
                          <span className="ml-2 text-sm font-medium">
                            ({marginPercent.toFixed(1)}%)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {totalRevenue == null && totalCost == null && (
                <div className="mt-6 flex flex-col items-center justify-center rounded-md border border-dashed py-8">
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Margin calculations will appear when billable tons and rates
                    are available
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Ticket Tab ───────────────────────────────────── */}
        <TabsContent value="ticket" className="mt-6">
          {ticket ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Ticket Information
                </CardTitle>
                <CardDescription>
                  Ticket verification and extracted data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Left: Photo & Extracted Data */}
                  <div className="space-y-4">
                    {/* Photo */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Ticket Photo
                      </p>
                      {ticket.photoUrl ? (
                        <a
                          href={ticket.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border p-3 text-sm text-blue-600 transition-colors hover:bg-blue-50"
                        >
                          <ImageIcon className="h-4 w-4" />
                          View Photo
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed bg-muted/50">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Extracted Fields */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Extracted Data
                      </p>
                      <div className="rounded-lg border divide-y">
                        {ticket.extractedTicketNumber && (
                          <div className="flex justify-between px-4 py-2.5 text-sm">
                            <span className="text-muted-foreground">
                              Ticket Number
                            </span>
                            <span className="font-mono font-medium">
                              {ticket.extractedTicketNumber}
                            </span>
                          </div>
                        )}
                        {ticket.extractedWeight && (
                          <div className="flex justify-between px-4 py-2.5 text-sm">
                            <span className="text-muted-foreground">
                              Weight
                            </span>
                            <span className="font-medium">
                              {ticket.extractedWeight}
                            </span>
                          </div>
                        )}
                        {ticket.extractedMaterial && (
                          <div className="flex justify-between px-4 py-2.5 text-sm">
                            <span className="text-muted-foreground">
                              Material
                            </span>
                            <span className="font-medium">
                              {ticket.extractedMaterial}
                            </span>
                          </div>
                        )}
                        {ticket.extractedDate && (
                          <div className="flex justify-between px-4 py-2.5 text-sm">
                            <span className="text-muted-foreground">Date</span>
                            <span className="font-medium">
                              {ticket.extractedDate}
                            </span>
                          </div>
                        )}
                        {!ticket.extractedTicketNumber &&
                          !ticket.extractedWeight &&
                          !ticket.extractedMaterial &&
                          !ticket.extractedDate && (
                            <p className="px-4 py-4 text-center text-sm text-muted-foreground">
                              No extracted data available
                            </p>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Confidence & Verification */}
                  <div className="space-y-4">
                    {/* Confidence Score */}
                    {ticket.confidenceScore != null && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          OCR Confidence
                        </p>
                        <div className="rounded-lg border p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  Number(ticket.confidenceScore) > 0.9
                                    ? "bg-green-500"
                                    : Number(ticket.confidenceScore) > 0.7
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                }`}
                                style={{
                                  width: `${Number(ticket.confidenceScore) * 100}%`,
                                }}
                              />
                            </div>
                            <span
                              className={`text-lg font-bold ${
                                Number(ticket.confidenceScore) > 0.9
                                  ? "text-green-600"
                                  : Number(ticket.confidenceScore) > 0.7
                                    ? "text-amber-600"
                                    : "text-red-600"
                              }`}
                            >
                              {(Number(ticket.confidenceScore) * 100).toFixed(0)}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Approval Status */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Verification Status
                      </p>
                      <div className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Approved
                          </span>
                          <Badge
                            variant={
                              ticket.isApproved ? "success" : "secondary"
                            }
                          >
                            {ticket.isApproved ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Verified By
                          </span>
                          <span className="font-medium">
                            {ticket.verifiedBy
                              ? String(ticket.verifiedBy).slice(0, 8) + "…"
                              : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Verified At
                          </span>
                          <span className="font-medium">
                            {ticket.verifiedAt
                              ? formatDateTime(ticket.verifiedAt as string)
                              : "—"}
                          </span>
                        </div>
                        {ticket.rejectionReason && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Rejection Reason
                            </span>
                            <Badge variant="error">
                              {ticket.rejectionReason}
                            </Badge>
                          </div>
                        )}
                        {(ticket.rejectionCount ?? 0) > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Rejection Count
                            </span>
                            <span className="font-medium text-red-600">
                              {ticket.rejectionCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ticket Notes */}
                    {ticket.notes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Notes
                        </p>
                        <div className="rounded-lg border p-4">
                          <p className="whitespace-pre-wrap text-sm">
                            {ticket.notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">No Ticket</p>
                <p className="mt-1 text-sm text-muted-foreground text-center">
                  {status === "delivered"
                    ? "Upload a ticket photo to continue the workflow."
                    : "A ticket will appear here once uploaded."}
                </p>
                {status === "delivered" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    disabled
                  >
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    Upload Ticket
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Exceptions Tab ───────────────────────────────── */}
        <TabsContent value="exceptions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Exceptions
              </CardTitle>
              <CardDescription>
                Exception tracking and resolution notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {load.exceptionType ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-red-800">
                          {load.exceptionType
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </p>
                        <Badge variant="error" size="sm">
                          Active
                        </Badge>
                      </div>
                      {load.exceptionNotes && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-red-700">
                          {load.exceptionNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <p className="mt-4 text-lg font-medium">No Exceptions</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This load has no reported exceptions
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
