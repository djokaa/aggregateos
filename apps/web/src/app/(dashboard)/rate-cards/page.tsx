"use client";

import { useState, useMemo } from "react";
import {
  Button,
  Input,
  Label,
  Badge,
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
  DialogDescription,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@aggregateos/ui";
import {
  Plus,
  MoreHorizontal,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
  Filter,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { createRateCardSchema } from "@aggregateos/shared";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARKETS = ["GA", "TN", "FL"] as const;

const RATE_TYPES = [
  { value: "route_based", label: "Route Based" },
  { value: "time_based", label: "Time Based" },
  { value: "contract", label: "Contract" },
  { value: "spot", label: "Spot" },
] as const;

type RateType = (typeof RATE_TYPES)[number]["value"];

const RATE_TYPE_BADGE: Record<
  string,
  { variant: "info" | "purple" | "orange" | "secondary"; label: string }
> = {
  route_based: { variant: "info", label: "Route Based" },
  time_based: { variant: "purple", label: "Time Based" },
  contract: { variant: "orange", label: "Contract" },
  spot: { variant: "secondary", label: "Spot" },
};

const MARKET_BADGE_VARIANT: Record<
  string,
  "info" | "success" | "warning" | "purple" | "orange" | "secondary"
> = {
  GA: "success",
  TN: "info",
  FL: "orange",
};

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pctFmt = (v: number) => `${(v * 100).toFixed(1)}%`;

const PAGE_SIZE = 20;

const INITIAL_FORM = {
  materialId: "",
  originId: "",
  destinationZone: "",
  market: "",
  rateType: "route_based" as string,
  haulRate: "",
  materialRate: "",
  driverPayRate: "",
  materialCostRate: "",
  fuelSurchargePercent: "0.12",
  minimumLoads: "",
  effectiveDate: "",
  expiresAt: "",
  notes: "",
};

type FormState = typeof INITIAL_FORM;

// ---------------------------------------------------------------------------
// Table Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: 14 }).map((_, j) => (
              <TableHead key={j}>
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 14 }).map((_, j) => (
                <TableCell key={j}>
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rate Card Form Dialog
// ---------------------------------------------------------------------------

function RateCardFormDialog({
  open,
  onOpenChange,
  editId,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: string | null;
  initialValues: FormState;
}) {
  const utils = trpc.useUtils();

  const [form, setForm] = useState<FormState>(initialValues);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens with new values
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    // Dialog just opened - sync initial values
    if (form !== initialValues) {
      setForm(initialValues);
      setFormErrors({});
    }
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  const { data: materialsData } = trpc.material.list.useQuery(undefined, {
    enabled: open,
  });
  const { data: locationsData } = trpc.location.list.useQuery(undefined, {
    enabled: open,
  });

  const createMutation = trpc.rateCard.create.useMutation({
    onSuccess: () => {
      utils.rateCard.list.invalidate();
      onOpenChange(false);
      toast.success("Rate card created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create rate card");
    },
  });

  const updateMutation = trpc.rateCard.update.useMutation({
    onSuccess: () => {
      utils.rateCard.list.invalidate();
      onOpenChange(false);
      toast.success("Rate card updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update rate card");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    setFormErrors({});

    const payload = {
      materialId: form.materialId,
      originId: form.originId,
      destinationZone: form.destinationZone,
      market: form.market || undefined,
      rateType: (form.rateType || "route_based") as RateType,
      haulRate: parseFloat(form.haulRate) || 0,
      materialRate: parseFloat(form.materialRate) || 0,
      driverPayRate: form.driverPayRate
        ? parseFloat(form.driverPayRate)
        : undefined,
      materialCostRate: form.materialCostRate
        ? parseFloat(form.materialCostRate)
        : undefined,
      fuelSurchargePercent: parseFloat(form.fuelSurchargePercent) || 0.12,
      minimumLoads: form.minimumLoads
        ? parseInt(form.minimumLoads, 10)
        : undefined,
      effectiveDate: form.effectiveDate,
      expiresAt: form.expiresAt || undefined,
      notes: form.notes || undefined,
    };

    const result = createRateCardSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setFormErrors(fieldErrors);
      return;
    }

    if (editId) {
      updateMutation.mutate({ id: editId, data: result.data });
    } else {
      createMutation.mutate(result.data);
    }
  };

  const materials = materialsData?.items ?? [];
  const locations = locationsData?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editId ? "Edit Rate Card" : "New Rate Card"}
          </DialogTitle>
          <DialogDescription>
            {editId
              ? "Update the pricing rate card details below."
              : "Create a new pricing rate card for a material and route."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Material */}
          <div className="space-y-2">
            <Label>
              Material <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.materialId}
              onValueChange={(v) => update("materialId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.materialId && (
              <p className="text-sm text-red-500">{formErrors.materialId}</p>
            )}
          </div>

          {/* Origin */}
          <div className="space-y-2">
            <Label>
              Origin <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.originId}
              onValueChange={(v) => update("originId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select origin" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.originId && (
              <p className="text-sm text-red-500">{formErrors.originId}</p>
            )}
          </div>

          {/* Destination Zone */}
          <div className="space-y-2">
            <Label htmlFor="destinationZone">
              Destination Zone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="destinationZone"
              placeholder="e.g. Zone A – Charlotte Metro"
              value={form.destinationZone}
              onChange={(e) => update("destinationZone", e.target.value)}
            />
            {formErrors.destinationZone && (
              <p className="text-sm text-red-500">
                {formErrors.destinationZone}
              </p>
            )}
          </div>

          {/* Market + Rate Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Market</Label>
              <Select
                value={form.market}
                onValueChange={(v) => update("market", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {MARKETS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rate Type</Label>
              <Select
                value={form.rateType}
                onValueChange={(v) => update("rateType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {RATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.rateType && (
                <p className="text-sm text-red-500">{formErrors.rateType}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Revenue Rates */}
          <p className="text-sm font-medium text-muted-foreground">
            Revenue Rates
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="haulRate">Haul Rate ($)</Label>
              <Input
                id="haulRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.haulRate}
                onChange={(e) => update("haulRate", e.target.value)}
              />
              {formErrors.haulRate && (
                <p className="text-sm text-red-500">{formErrors.haulRate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="materialRate">Material Rate ($)</Label>
              <Input
                id="materialRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.materialRate}
                onChange={(e) => update("materialRate", e.target.value)}
              />
              {formErrors.materialRate && (
                <p className="text-sm text-red-500">
                  {formErrors.materialRate}
                </p>
              )}
            </div>
          </div>

          {/* Cost Rates */}
          <p className="text-sm font-medium text-muted-foreground">
            Cost Rates
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driverPayRate">Driver Pay Rate ($)</Label>
              <Input
                id="driverPayRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.driverPayRate}
                onChange={(e) => update("driverPayRate", e.target.value)}
              />
              {formErrors.driverPayRate && (
                <p className="text-sm text-red-500">
                  {formErrors.driverPayRate}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="materialCostRate">Material Cost ($)</Label>
              <Input
                id="materialCostRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.materialCostRate}
                onChange={(e) => update("materialCostRate", e.target.value)}
              />
              {formErrors.materialCostRate && (
                <p className="text-sm text-red-500">
                  {formErrors.materialCostRate}
                </p>
              )}
            </div>
          </div>

          {/* Fuel & Minimum Loads */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuelSurchargePercent">
                Fuel Surcharge (decimal)
              </Label>
              <Input
                id="fuelSurchargePercent"
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="0.12"
                value={form.fuelSurchargePercent}
                onChange={(e) => update("fuelSurchargePercent", e.target.value)}
              />
              {formErrors.fuelSurchargePercent && (
                <p className="text-sm text-red-500">
                  {formErrors.fuelSurchargePercent}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimumLoads">Minimum Loads</Label>
              <Input
                id="minimumLoads"
                type="number"
                min="0"
                placeholder="Optional"
                value={form.minimumLoads}
                onChange={(e) => update("minimumLoads", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">
                Effective Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="effectiveDate"
                type="date"
                value={form.effectiveDate}
                onChange={(e) => update("effectiveDate", e.target.value)}
              />
              {formErrors.effectiveDate && (
                <p className="text-sm text-red-500">
                  {formErrors.effectiveDate}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At</Label>
              <Input
                id="expiresAt"
                type="date"
                value={form.expiresAt}
                onChange={(e) => update("expiresAt", e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="rcNotes">Notes</Label>
            <Input
              id="rcNotes"
              placeholder="Optional notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editId ? "Save Changes" : "Create Rate Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function RateCardsPage() {
  // Filters
  const [materialFilter, setMaterialFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [rateTypeFilter, setRateTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [dialogInitial, setDialogInitial] = useState<FormState>(INITIAL_FORM);

  const utils = trpc.useUtils();

  // ---- Queries ----

  const { data, isLoading } = trpc.rateCard.list.useQuery({
    materialId: materialFilter || undefined,
    originId: originFilter || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const { data: materialsData } = trpc.material.list.useQuery();
  const { data: locationsData } = trpc.location.list.useQuery();

  const deleteMutation = trpc.rateCard.delete.useMutation({
    onSuccess: () => {
      utils.rateCard.list.invalidate();
      toast.success("Rate card deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete rate card");
    },
  });

  // ---- Lookup maps ----

  const materialsMap = useMemo(
    () => new Map((materialsData?.items ?? []).map((m) => [m.id, m.name])),
    [materialsData],
  );

  const locationsMap = useMemo(
    () => new Map((locationsData?.items ?? []).map((l) => [l.id, l.name])),
    [locationsData],
  );

  // ---- Client-side filtering for market & rateType ----

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const filtered = useMemo(() => {
    let result = items;
    if (marketFilter) {
      result = result.filter(
        (rc) =>
          (rc.market ?? "").toLowerCase() === marketFilter.toLowerCase(),
      );
    }
    if (rateTypeFilter) {
      result = result.filter(
        (rc) =>
          (rc.rateType ?? "route_based") === rateTypeFilter,
      );
    }
    return result;
  }, [items, marketFilter, rateTypeFilter]);

  // ---- Handlers ----

  const hasFilters =
    !!materialFilter || !!originFilter || !!marketFilter || !!rateTypeFilter;

  const clearFilters = () => {
    setMaterialFilter("");
    setOriginFilter("");
    setMarketFilter("");
    setRateTypeFilter("");
    setPage(1);
  };

  const openCreate = () => {
    setEditId(null);
    setDialogInitial(INITIAL_FORM);
    setDialogOpen(true);
  };

  const openEdit = (rc: (typeof items)[number]) => {
    setEditId(rc.id);
    setDialogInitial({
      materialId: rc.materialId,
      originId: rc.originId,
      destinationZone: rc.destinationZone,
      market: rc.market ?? "",
      rateType: rc.rateType ?? "route_based",
      haulRate: String(Number(rc.haulRate)),
      materialRate: String(Number(rc.materialRate)),
      driverPayRate: rc.driverPayRate ? String(Number(rc.driverPayRate)) : "",
      materialCostRate: rc.materialCostRate
        ? String(Number(rc.materialCostRate))
        : "",
      fuelSurchargePercent: String(Number(rc.fuelSurchargePercent)),
      minimumLoads: rc.minimumLoads ? String(rc.minimumLoads) : "",
      effectiveDate: rc.effectiveDate ?? "",
      expiresAt: rc.expiresAt ?? "",
      notes: rc.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this rate card?")) {
      deleteMutation.mutate({ id });
    }
  };

  // When server-side filters change, reset to page 1
  const setMaterialFilterAndReset = (v: string) => {
    setMaterialFilter(v === "__all__" ? "" : v);
    setPage(1);
  };
  const setOriginFilterAndReset = (v: string) => {
    setOriginFilter(v === "__all__" ? "" : v);
    setPage(1);
  };

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rate Cards</h1>
          <p className="text-sm text-muted-foreground">
            Manage pricing for materials and routes
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Rate Card
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />

        {/* Material */}
        <Select value={materialFilter} onValueChange={setMaterialFilterAndReset}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Materials" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Materials</SelectItem>
            {(materialsData?.items ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Origin */}
        <Select value={originFilter} onValueChange={setOriginFilterAndReset}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Origins" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Origins</SelectItem>
            {(locationsData?.items ?? []).map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Market */}
        <Select
          value={marketFilter}
          onValueChange={(v) => {
            setMarketFilter(v === "__all__" ? "" : v);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Markets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Markets</SelectItem>
            {MARKETS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Rate Type */}
        <Select
          value={rateTypeFilter}
          onValueChange={(v) => {
            setRateTypeFilter(v === "__all__" ? "" : v);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Rate Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Rate Types</SelectItem>
            {RATE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16">
          <DollarSign className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            No rate cards found
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            {hasFilters
              ? "Try adjusting your filters"
              : "Get started by adding your first rate card"}
          </p>
          {!hasFilters && (
            <Button variant="outline" className="mt-4" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Rate Card
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            {filtered.length} rate card{filtered.length !== 1 ? "s" : ""}
            {data?.totalCount && data.totalCount > filtered.length
              ? ` of ${data.totalCount} total`
              : ""}
          </p>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Dest Zone</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Rate Type</TableHead>
                  <TableHead className="text-right">Haul Rate</TableHead>
                  <TableHead className="text-right">Material Rate</TableHead>
                  <TableHead className="text-right">Driver Pay</TableHead>
                  <TableHead className="text-right">Material Cost</TableHead>
                  <TableHead className="text-right">Fuel %</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rc) => {
                  const haulRate = Number(rc.haulRate);
                  const matRate = Number(rc.materialRate);
                  const driverPay = Number(rc.driverPayRate ?? 0);
                  const matCost = Number(rc.materialCostRate ?? 0);
                  const fuelPct = Number(rc.fuelSurchargePercent);
                  const margin = haulRate + matRate - driverPay - matCost;

                  const isExpired = rc.expiresAt
                    ? new Date(rc.expiresAt) < new Date()
                    : false;

                  const rtBadge =
                    RATE_TYPE_BADGE[rc.rateType ?? "route_based"] ??
                    RATE_TYPE_BADGE.route_based;

                  const mktVariant =
                    MARKET_BADGE_VARIANT[rc.market ?? ""] ?? "secondary";

                  return (
                    <TableRow key={rc.id} className={isExpired ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        {materialsMap.get(rc.materialId) ?? rc.materialId}
                      </TableCell>
                      <TableCell>
                        {locationsMap.get(rc.originId) ?? rc.originId}
                      </TableCell>
                      <TableCell>{rc.destinationZone}</TableCell>
                      <TableCell>
                        {rc.market ? (
                          <Badge size="sm" variant={mktVariant}>
                            {rc.market}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge size="sm" variant={rtBadge.variant}>
                          {rtBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {currencyFmt.format(haulRate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {currencyFmt.format(matRate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {driverPay > 0
                          ? currencyFmt.format(driverPay)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {matCost > 0
                          ? currencyFmt.format(matCost)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pctFmt(fuelPct)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={
                            margin >= 0
                              ? "text-emerald-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {currencyFmt.format(margin)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {rc.effectiveDate}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {rc.expiresAt ? (
                          <span className={isExpired ? "text-red-500" : ""}>
                            {rc.expiresAt}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
                            <DropdownMenuItem onClick={() => openEdit(rc)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(rc.id)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
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
                Page {page} of {totalPages} &middot; {data?.totalCount ?? 0}{" "}
                total
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

      {/* Create / Edit Dialog */}
      <RateCardFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editId={editId}
        initialValues={dialogInitial}
      />
    </div>
  );
}
