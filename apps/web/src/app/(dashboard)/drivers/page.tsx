"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Label,
  Badge,
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@aggregateos/ui";
import {
  Plus,
  Search,
  MoreHorizontal,
  Truck,
  Star,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Users,
  Loader2,
  Pencil,
  Signal,
  SignalZero,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "info" | "secondary" }
> = {
  available: { label: "Available", variant: "success" },
  on_load: { label: "On Load", variant: "info" },
  offline: { label: "Offline", variant: "secondary" },
};

const CAPABILITY_LABELS: Record<string, string> = {
  asphalt: "Asphalt",
  concrete: "Concrete",
  end_dump: "End Dump",
  belly_dump: "Belly Dump",
  flatbed: "Flatbed",
};

const CAPABILITY_VARIANT: Record<string, "info" | "purple" | "orange" | "warning" | "secondary"> = {
  asphalt: "orange",
  concrete: "info",
  end_dump: "purple",
  belly_dump: "warning",
  flatbed: "secondary",
};

function formatPayRate(rate: string | number | null | undefined) {
  if (rate === null || rate === undefined) return "—";
  const num = typeof rate === "string" ? parseFloat(rate) : rate;
  if (isNaN(num)) return "—";
  return `$${num.toFixed(2)}/hr`;
}

function getCapabilities(vehicle: Record<string, unknown> | null | undefined): string[] {
  if (!vehicle) return [];
  const caps: string[] = [];
  if (vehicle.asphaltOk) caps.push("asphalt");
  if (vehicle.concreteOk) caps.push("concrete");
  if (vehicle.endDump) caps.push("end_dump");
  if (vehicle.bellyDump) caps.push("belly_dump");
  if (vehicle.flatbed) caps.push("flatbed");
  return caps;
}

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
// Driver Dialog (Create / Edit)
// ---------------------------------------------------------------------------

type DriverFormData = {
  name: string;
  phone: string;
  email: string;
  licenseNumber: string;
  regions: string;
  paymentMethod: string;
  payRateDefault: string;
};

function DriverDialog({
  open,
  onOpenChange,
  driver,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    licenseNumber: string | null;
    regions: string[] | null;
    paymentMethod: string | null;
    payRateDefault: string | null;
  } | null;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!driver;

  const [form, setForm] = useState<DriverFormData>({
    name: "",
    phone: "",
    email: "",
    licenseNumber: "",
    regions: "",
    paymentMethod: "",
    payRateDefault: "",
  });

  useEffect(() => {
    if (driver) {
      setForm({
        name: driver.name ?? "",
        phone: driver.phone ?? "",
        email: driver.email ?? "",
        licenseNumber: driver.licenseNumber ?? "",
        regions: driver.regions?.join(", ") ?? "",
        paymentMethod: driver.paymentMethod ?? "",
        payRateDefault: driver.payRateDefault ?? "",
      });
    } else {
      setForm({
        name: "",
        phone: "",
        email: "",
        licenseNumber: "",
        regions: "",
        paymentMethod: "",
        payRateDefault: "",
      });
    }
  }, [driver, open]);

  const createMutation = trpc.driver.create.useMutation({
    onSuccess: () => {
      toast.success("Driver created successfully");
      utils.driver.list.invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(`Failed to create driver: ${err.message}`),
  });

  const updateMutation = trpc.driver.update.useMutation({
    onSuccess: () => {
      toast.success("Driver updated successfully");
      utils.driver.list.invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(`Failed to update driver: ${err.message}`),
  });

  const handleSubmit = () => {
    if (!form.name || !form.phone) {
      toast.error("Name and phone are required");
      return;
    }

    const regions = form.regions
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    if (isEdit && driver) {
      updateMutation.mutate({
        id: driver.id,
        data: {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          licenseNumber: form.licenseNumber || undefined,
          regions: regions.length > 0 ? regions : undefined,
          paymentMethod: form.paymentMethod || undefined,
          payRateDefault: form.payRateDefault || undefined,
        },
      });
    } else {
      createMutation.mutate({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        licenseNumber: form.licenseNumber || undefined,
        regions: regions.length > 0 ? regions : undefined,
        paymentMethod: form.paymentMethod || undefined,
        payRateDefault: form.payRateDefault || undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Driver" : "New Driver"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Driver name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>License Number</Label>
            <Input
              placeholder="CDL number"
              value={form.licenseNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, licenseNumber: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Regions</Label>
            <Input
              placeholder="e.g. South FL, Middle TN (comma separated)"
              value={form.regions}
              onChange={(e) => setForm((f) => ({ ...f, regions: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Input
                placeholder="e.g. direct_deposit"
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentMethod: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Pay Rate ($/hr)</Label>
              <Input
                placeholder="e.g. 25.00"
                value={form.payRateDefault}
                onChange={(e) =>
                  setForm((f) => ({ ...f, payRateDefault: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create Driver"
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
        ))}
      </div>
      <div className="h-10 w-80 animate-pulse rounded bg-muted" />
      <div className="rounded-md border">
        <div className="space-y-0 divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-8 w-8 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DriversPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string | null;
    licenseNumber: string | null;
    regions: string[] | null;
    paymentMethod: string | null;
    payRateDefault: string | null;
  } | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.driver.list.useQuery(
    { page, limit: PAGE_SIZE },
    { refetchInterval: 15_000, retry: false }
  );

  const updateStatusMutation = trpc.driver.updateStatus.useMutation({
    onSuccess: () => {
      utils.driver.list.invalidate();
      toast.success("Driver status updated");
    },
    onError: (err) => toast.error(err.message),
  });

  // Loading
  if (isLoading) {
    return <TableSkeleton />;
  }

  // Error
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Drivers</h1>
            <p className="text-sm text-muted-foreground">
              Manage driver profiles and performance
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">
            Failed to load drivers
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  const allItems = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  // Client-side search filter
  const items = debouncedSearch
    ? allItems.filter(
        (d) =>
          d.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (d.email ?? "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (d.phone ?? "").includes(debouncedSearch)
      )
    : allItems;

  // Compute stats from current page items (for all items we use totalCount)
  const activeCount = allItems.filter((d) => d.status === "available").length;
  const onLoadCount = allItems.filter((d) => d.status === "on_load").length;
  const offlineCount = allItems.filter((d) => d.status === "offline").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drivers</h1>
          <p className="text-sm text-muted-foreground">
            Manage driver profiles and performance
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDriver(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Driver
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Drivers" value={totalCount} icon={Users} />
        <StatCard title="Active" value={activeCount} icon={Signal} />
        <StatCard title="On Load" value={onLoadCount} icon={Truck} />
        <StatCard title="Offline" value={offlineCount} icon={SignalZero} />
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {items.length} driver{items.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Empty */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16">
          <Truck className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No drivers found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {debouncedSearch
              ? "Try adjusting your search terms"
              : "Add your first driver to get started"}
          </p>
          {!debouncedSearch && (
            <Button
              className="mt-4"
              onClick={() => {
                setEditingDriver(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Driver
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Regions</TableHead>
                  <TableHead>Pay Rate</TableHead>
                  <TableHead>On-Time %</TableHead>
                  <TableHead>Reliability</TableHead>
                  <TableHead>Total Loads</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((driver) => {
                  const sc =
                    statusConfig[driver.status ?? "offline"] ??
                    statusConfig.offline;
                  const onTime = driver.onTimeRate
                    ? `${(Number(driver.onTimeRate) * 100).toFixed(0)}%`
                    : "—";
                  const reliability = driver.reliabilityScore
                    ? Number(driver.reliabilityScore).toFixed(2)
                    : "—";

                  // Vehicle info – driver.vehicle comes from the relation if included
                  const vehicle = (driver as Record<string, unknown>).vehicle as Record<string, unknown> | null;
                  const vehicleLabel = vehicle
                    ? `${vehicle.make ?? ""} ${vehicle.model ?? ""} ${vehicle.licensePlate ? `(${vehicle.licensePlate})` : ""}`.trim()
                    : "—";
                  const capabilities = getCapabilities(vehicle);

                  return (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        {driver.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {driver.phone}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {driver.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {vehicleLabel}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {driver.regions && driver.regions.length > 0
                            ? driver.regions.map((r) => (
                                <Badge key={r} variant="outline" size="sm">
                                  {r}
                                </Badge>
                              ))
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatPayRate(driver.payRateDefault)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {onTime}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Star className="h-3 w-3 text-amber-500" />
                          {reliability}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {driver.totalLoads ?? 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {capabilities.length > 0
                            ? capabilities.map((cap) => (
                                <Badge
                                  key={cap}
                                  variant={CAPABILITY_VARIANT[cap] ?? "secondary"}
                                  size="sm"
                                >
                                  {CAPABILITY_LABELS[cap] ?? cap}
                                </Badge>
                              ))
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingDriver(driver);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {driver.status !== "available" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: driver.id,
                                    status: "available",
                                  })
                                }
                              >
                                Set Available
                              </DropdownMenuItem>
                            )}
                            {driver.status !== "offline" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: driver.id,
                                    status: "offline",
                                  })
                                }
                              >
                                Set Offline
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                Page {page} of {totalPages} &middot; {totalCount} total drivers
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

      {/* Driver Dialog */}
      <DriverDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        driver={editingDriver}
      />
    </div>
  );
}
