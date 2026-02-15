"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Label,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Separator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from "@aggregateos/ui";
import { ArrowLeft, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface LineItem {
  id: string;
  lineType: string;
  description: string;
  unit: string;
  materialId: string;
  originId: string;
  destinationId: string;
  quantity: number;
  materialRate: number;
  haulRate: number;
  fuelSurchargePercent: number;
  fuelSurcharge: number;
  lineTotal: number;
  rateFound: boolean | null;
}

function createEmptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    lineType: "material",
    description: "",
    unit: "ton",
    materialId: "",
    originId: "",
    destinationId: "",
    quantity: 1,
    materialRate: 0,
    haulRate: 0,
    fuelSurchargePercent: 0,
    fuelSurcharge: 0,
    lineTotal: 0,
    rateFound: null,
  };
}

function computeLineTotal(item: LineItem): number {
  const fuelSurcharge =
    (item.materialRate + item.haulRate) * item.fuelSurchargePercent;
  return (item.materialRate + item.haulRate + fuelSurcharge) * item.quantity;
}

function computeFuelSurcharge(item: LineItem): number {
  return (item.materialRate + item.haulRate) * item.fuelSurchargePercent;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const LINE_TYPES = [
  { value: "material", label: "Material" },
  { value: "hauling", label: "Hauling" },
  { value: "hourly", label: "Hourly" },
  { value: "fee", label: "Fee" },
  { value: "discount", label: "Discount" },
];

const UNITS = [
  { value: "ton", label: "Tons" },
  { value: "load", label: "Loads" },
  { value: "hour", label: "Hours" },
  { value: "each", label: "Each" },
];

const MARKETS = [
  { value: "TN", label: "Tennessee" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "NC", label: "North Carolina" },
];

// ═══════════════════════════════════════════════════════════════════════════
// Rate lookup hook
// ═══════════════════════════════════════════════════════════════════════════

function useRateLookup(materialId: string, originId: string) {
  const enabled = !!materialId && !!originId;
  return trpc.rateCard.findRate.useQuery(
    { materialId, originId, destinationZone: "default" },
    { enabled, retry: false },
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════

export default function NewEstimatePage() {
  const router = useRouter();

  // Reference data
  const { data: customersData, isLoading: customersLoading } =
    trpc.customer.list.useQuery({ limit: 100 });
  const { data: materialsData, isLoading: materialsLoading } =
    trpc.material.list.useQuery({ limit: 100 });
  const { data: originsData, isLoading: originsLoading } =
    trpc.location.list.useQuery({ type: "quarry", limit: 100 });
  const { data: destinationsData, isLoading: destinationsLoading } =
    trpc.location.list.useQuery({ type: "job_site", limit: 100 });
  const { data: projectsData } = trpc.project.list.useQuery({});

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [jobSiteLocationId, setJobSiteLocationId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [market, setMarket] = useState("");
  const [validFor, setValidFor] = useState("30");
  const [notesInternal, setNotesInternal] = useState("");
  const [notesCustomer, setNotesCustomer] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    createEmptyLineItem(),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create mutation
  const createEstimate = trpc.estimate.create.useMutation({
    onSuccess: (data) => {
      toast.success("Estimate created successfully");
      router.push(`/estimates/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsSubmitting(false);
    },
  });

  // Line item helpers
  const addLineItem = () =>
    setLineItems((prev) => [...prev, createEmptyLineItem()]);

  const removeLineItem = (id: string) =>
    setLineItems((prev) =>
      prev.length > 1 ? prev.filter((li) => li.id !== id) : prev,
    );

  const updateLineItem = useCallback(
    (id: string, updates: Partial<LineItem>) => {
      setLineItems((prev) =>
        prev.map((li) => {
          if (li.id !== id) return li;
          const updated = { ...li, ...updates };
          updated.fuelSurcharge = computeFuelSurcharge(updated);
          updated.lineTotal = computeLineTotal(updated);
          return updated;
        }),
      );
    },
    [],
  );

  // Summary
  const subtotal = lineItems.reduce(
    (sum, li) => sum + (li.materialRate + li.haulRate) * li.quantity,
    0,
  );
  const fuelSurchargeTotal = lineItems.reduce(
    (sum, li) => sum + computeFuelSurcharge(li) * li.quantity,
    0,
  );
  const grandTotal = subtotal + fuelSurchargeTotal;

  // Submit
  const handleSubmit = () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    const incompleteItems = lineItems.filter(
      (li) =>
        li.lineType === "material" &&
        (!li.materialId || !li.originId || !li.destinationId),
    );
    if (incompleteItems.length > 0) {
      toast.error("Please fill in all material line item fields");
      return;
    }

    setIsSubmitting(true);
    createEstimate.mutate({
      customerId,
      validUntilDays: parseInt(validFor),
      notes: notesInternal || undefined,
      lineItems: lineItems.map((li) => ({
        materialId: li.materialId || undefined as any,
        originId: li.originId || undefined as any,
        destinationId: li.destinationId || undefined as any,
        quantity: li.quantity,
        materialRate: li.materialRate,
        haulRate: li.haulRate,
        fuelSurcharge: computeFuelSurcharge(li),
        lineTotal: computeLineTotal(li),
      })),
    });
  };

  const customers = customersData?.items ?? [];
  const materials = materialsData?.items ?? [];
  const origins = originsData?.items ?? [];
  const destinations = destinationsData?.items ?? [];
  const projects = (projectsData as any)?.items ?? projectsData ?? [];

  const refDataLoading =
    customersLoading || materialsLoading || originsLoading || destinationsLoading;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/estimates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create New Estimate
          </h1>
          <p className="text-sm text-muted-foreground">
            Build a detailed estimate for your customer
          </p>
        </div>
      </div>

      {refDataLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading reference data…
        </div>
      )}

      {/* Customer & Context */}
      <Card>
        <CardHeader>
          <CardTitle>Estimate Details</CardTitle>
          <CardDescription>
            Customer, job site, project, and market information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Job Site</Label>
              <Select value={jobSiteLocationId} onValueChange={setJobSiteLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {destinations.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(Array.isArray(projects) ? projects : []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Market</Label>
              <Select value={market} onValueChange={setMarket}>
                <SelectTrigger>
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {MARKETS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>
                Add materials, hauling, hourly, fees, or discounts
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Line Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((li, idx) => (
            <LineItemRow
              key={li.id}
              item={li}
              index={idx}
              materials={materials}
              origins={origins}
              destinations={destinations}
              onUpdate={updateLineItem}
              onRemove={removeLineItem}
              canRemove={lineItems.length > 1}
            />
          ))}
        </CardContent>
      </Card>

      {/* Summary & Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Summary & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fuel Surcharge</span>
                <span className="tabular-nums">
                  {formatCurrency(fuelSurchargeTotal)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Grand Total</span>
                <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Valid for</Label>
              <Select value={validFor} onValueChange={setValidFor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="45">45 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Internal Notes (admin only)</Label>
              <Textarea
                placeholder="Internal notes, not visible to customer..."
                value={notesInternal}
                onChange={(e) => setNotesInternal(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Notes (visible to customer)</Label>
              <Textarea
                placeholder="Terms, conditions, or notes for the customer..."
                value={notesCustomer}
                onChange={(e) => setNotesCustomer(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Link href="/estimates">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save as Draft
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Line Item Row Component
// ═══════════════════════════════════════════════════════════════════════════

interface LineItemRowProps {
  item: LineItem;
  index: number;
  materials: Array<{ id: string; name: string }>;
  origins: Array<{
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  }>;
  destinations: Array<{
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  }>;
  onUpdate: (id: string, updates: Partial<LineItem>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

function LineItemRow({
  item,
  index,
  materials,
  origins,
  destinations,
  onUpdate,
  onRemove,
  canRemove,
}: LineItemRowProps) {
  const [distanceInfo, setDistanceInfo] = useState<{
    distanceMiles: number;
    durationMinutes: number;
  } | null>(null);

  const distanceMutation = trpc.maps.distance.useMutation({
    onSuccess: (result) => {
      if (result) {
        setDistanceInfo({
          distanceMiles: result.distanceMiles,
          durationMinutes: result.durationMinutes,
        });
      }
    },
  });

  const calculateRoute = () => {
    const origin = origins.find((o) => o.id === item.originId);
    const dest = destinations.find((d) => d.id === item.destinationId);
    if (!origin || !dest) return;

    const originAddr = [origin.address, origin.city, origin.state, origin.zip]
      .filter(Boolean)
      .join(", ");
    const destAddr = [dest.address, dest.city, dest.state, dest.zip]
      .filter(Boolean)
      .join(", ");

    if (!originAddr || !destAddr) {
      toast.error("Origin or destination is missing address information");
      return;
    }

    distanceMutation.mutate({ origin: originAddr, destination: destAddr });
  };

  const {
    data: rateCard,
    isError: rateNotFound,
    isFetching: rateFetching,
  } = useRateLookup(item.materialId, item.originId);

  useEffect(() => {
    if (rateCard) {
      onUpdate(item.id, {
        materialRate: parseFloat(rateCard.materialRate),
        haulRate: parseFloat(rateCard.haulRate),
        fuelSurchargePercent: parseFloat(
          rateCard.fuelSurchargePercent ?? "0.12",
        ),
        rateFound: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateCard?.id]);

  useEffect(() => {
    if (rateNotFound && item.materialId && item.originId) {
      onUpdate(item.id, { rateFound: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateNotFound, item.materialId, item.originId]);

  const fuelSurcharge = computeFuelSurcharge(item);
  const lineTotal = computeLineTotal(item);
  const isMaterial = item.lineType === "material" || item.lineType === "hauling";

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            #{index + 1}
          </span>
          <Select
            value={item.lineType}
            onValueChange={(v) => onUpdate(item.id, { lineType: v })}
          >
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LINE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={item.unit}
            onValueChange={(v) => onUpdate(item.id, { unit: v })}
          >
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {rateFetching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          {item.rateFound === true && (
            <Badge variant="success" size="sm">
              Rate found
            </Badge>
          )}
          {item.rateFound === false && (
            <Badge variant="warning" size="sm">
              <AlertCircle className="mr-1 h-3 w-3" />
              Manual
            </Badge>
          )}
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-600"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Description field */}
      <Input
        placeholder="Line item description (optional)"
        value={item.description}
        onChange={(e) => onUpdate(item.id, { description: e.target.value })}
        className="h-8 text-sm"
      />

      {/* Material/Origin/Destination selectors — only for material/hauling types */}
      {isMaterial && (
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Material</Label>
            <Select
              value={item.materialId}
              onValueChange={(v) =>
                onUpdate(item.id, { materialId: v, rateFound: null })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Origin</Label>
            <Select
              value={item.originId}
              onValueChange={(v) =>
                onUpdate(item.id, { originId: v, rateFound: null })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select origin" />
              </SelectTrigger>
              <SelectContent>
                {origins.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Destination</Label>
            <Select
              value={item.destinationId}
              onValueChange={(v) =>
                onUpdate(item.id, { destinationId: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Quantity</Label>
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) =>
                onUpdate(item.id, {
                  quantity: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>
        </div>
      )}

      {/* Non-material types: simpler quantity input */}
      {!isMaterial && (
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Quantity</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={item.quantity}
              onChange={(e) =>
                onUpdate(item.id, {
                  quantity: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
      )}

      {/* Distance calculation */}
      {isMaterial && item.originId && item.destinationId && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {distanceMutation.isPending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Calculating route...
            </>
          ) : distanceInfo ? (
            <>
              <span className="font-medium text-zinc-700">
                {distanceInfo.distanceMiles} mi
              </span>
              <span>·</span>
              <span className="font-medium text-zinc-700">
                ~{distanceInfo.durationMinutes} min
              </span>
              <button
                type="button"
                className="ml-1 text-amber-600 hover:text-amber-700 underline"
                onClick={calculateRoute}
              >
                Recalculate
              </button>
            </>
          ) : (
            <button
              type="button"
              className="text-amber-600 hover:text-amber-700 underline"
              onClick={calculateRoute}
            >
              Calculate distance
            </button>
          )}
        </div>
      )}

      {/* Pricing row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Material Rate ($/unit)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={item.materialRate}
            onChange={(e) =>
              onUpdate(item.id, {
                materialRate: parseFloat(e.target.value) || 0,
              })
            }
            disabled={item.rateFound === true}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Haul Rate ($/unit)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={item.haulRate}
            onChange={(e) =>
              onUpdate(item.id, {
                haulRate: parseFloat(e.target.value) || 0,
              })
            }
            disabled={item.rateFound === true}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Fuel Surcharge</Label>
          <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm tabular-nums">
            {formatCurrency(fuelSurcharge)}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Line Total</Label>
          <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm font-medium tabular-nums">
            {formatCurrency(lineTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}
