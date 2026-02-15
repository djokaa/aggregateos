"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Save,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════
// Types (same as new page)
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
  fuelSurcharge: number;
  lineTotal: number;
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════

export default function EditEstimatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  // Fetch current estimate data
  const { data: estimate, isLoading: estimateLoading } =
    trpc.estimate.getById.useQuery({ id });

  // Reference data
  const { data: customersData } = trpc.customer.list.useQuery({ limit: 100 });
  const { data: materialsData } = trpc.material.list.useQuery({ limit: 100 });
  const { data: originsData } = trpc.location.list.useQuery({
    type: "quarry",
    limit: 100,
  });
  const { data: destinationsData } = trpc.location.list.useQuery({
    type: "job_site",
    limit: 100,
  });
  const { data: projectsData } = trpc.project.list.useQuery({});

  // Form state
  const [initialized, setInitialized] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [jobSiteLocationId, setJobSiteLocationId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [market, setMarket] = useState("");
  const [validFor, setValidFor] = useState("30");
  const [notesInternal, setNotesInternal] = useState("");
  const [notesCustomer, setNotesCustomer] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Initialize form from fetched data
  useEffect(() => {
    if (estimate && !initialized) {
      setCustomerId(estimate.customerId ?? "");
      setJobSiteLocationId(estimate.jobSiteLocationId ?? "");
      setProjectId(estimate.projectId ?? "");
      setMarket(estimate.market ?? "");
      setNotesInternal(estimate.notesInternal || estimate.notes || "");
      setNotesCustomer(estimate.notesCustomer || "");

      // Convert line items from API to local format
      const items: LineItem[] = (estimate.lineItems ?? []).map((li: any) => ({
        id: li.id,
        lineType: li.lineType || "material",
        description: li.description || "",
        unit: li.unit || "ton",
        materialId: li.materialId || "",
        originId: li.originId || "",
        destinationId: li.destinationId || "",
        quantity: parseFloat(li.quantity || "0"),
        materialRate: parseFloat(li.materialRate || "0"),
        haulRate: parseFloat(li.haulRate || "0"),
        fuelSurcharge: parseFloat(li.fuelSurcharge || "0"),
        lineTotal: parseFloat(li.lineTotal || "0"),
      }));

      setLineItems(items.length > 0 ? items : [createEmptyLineItem()]);
      setInitialized(true);
    }
  }, [estimate, initialized]);

  // Mutations
  const updateEstimate = trpc.estimate.update.useMutation({
    onSuccess: () => {
      toast.success("Estimate updated");
      utils.estimate.getById.invalidate({ id });
      utils.estimate.list.invalidate();
      router.push(`/estimates/${id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Line item helpers
  const addLineItem = () =>
    setLineItems((prev) => [...prev, createEmptyLineItem()]);

  const removeLineItem = (itemId: string) =>
    setLineItems((prev) =>
      prev.length > 1 ? prev.filter((li) => li.id !== itemId) : prev,
    );

  const updateLineItem = useCallback(
    (itemId: string, updates: Partial<LineItem>) => {
      setLineItems((prev) =>
        prev.map((li) => {
          if (li.id !== itemId) return li;
          const updated = { ...li, ...updates };
          // Recalculate totals
          updated.lineTotal =
            (updated.materialRate + updated.haulRate + updated.fuelSurcharge) *
            updated.quantity;
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
    (sum, li) => sum + li.fuelSurcharge * li.quantity,
    0,
  );
  const grandTotal = subtotal + fuelSurchargeTotal;

  // Submit
  const handleSubmit = () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    updateEstimate.mutate({
      id,
      customerId,
      jobSiteLocationId: jobSiteLocationId || null,
      projectId: projectId || null,
      market: market || null,
      notesInternal: notesInternal || null,
      notesCustomer: notesCustomer || null,
      lineItems: lineItems.map((li) => ({
        id: li.id.includes("-") ? li.id : undefined, // only pass valid UUIDs
        lineType: li.lineType,
        description: li.description || null,
        unit: li.unit,
        materialId: li.materialId || null,
        originId: li.originId || null,
        destinationId: li.destinationId || null,
        quantity: li.quantity,
        materialRate: li.materialRate,
        haulRate: li.haulRate,
        fuelSurcharge: li.fuelSurcharge,
        lineTotal:
          (li.materialRate + li.haulRate + li.fuelSurcharge) * li.quantity,
      })),
    });
  };

  // Guard — not draft
  if (estimate && estimate.status !== "draft") {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/estimates/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Cannot Edit Estimate
            </h1>
            <p className="text-sm text-muted-foreground">
              Only estimates in <Badge variant="secondary">Draft</Badge> status
              can be edited. This estimate is currently{" "}
              <Badge>{estimate.status}</Badge>.
            </p>
          </div>
        </div>
        <Link href={`/estimates/${id}`}>
          <Button variant="outline">Back to Estimate Detail</Button>
        </Link>
      </div>
    );
  }

  // Loading
  if (estimateLoading || !initialized) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-48 animate-pulse rounded-lg border bg-muted" />
      </div>
    );
  }

  const customers = customersData?.items ?? [];
  const materials = materialsData?.items ?? [];
  const origins = originsData?.items ?? [];
  const destinations = destinationsData?.items ?? [];
  const projects = (projectsData as any)?.items ?? projectsData ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/estimates/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Edit {estimate?.estimateNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            Modify this draft estimate
          </p>
        </div>
      </div>

      {/* Estimate Details */}
      <Card>
        <CardHeader>
          <CardTitle>Estimate Details</CardTitle>
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
              <Select
                value={jobSiteLocationId}
                onValueChange={setJobSiteLocationId}
              >
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
                {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((li, idx) => (
            <div key={li.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    #{idx + 1}
                  </span>
                  <Select
                    value={li.lineType}
                    onValueChange={(v) =>
                      updateLineItem(li.id, { lineType: v })
                    }
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
                    value={li.unit}
                    onValueChange={(v) => updateLineItem(li.id, { unit: v })}
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
                {lineItems.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    onClick={() => removeLineItem(li.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Input
                placeholder="Line item description"
                value={li.description}
                onChange={(e) =>
                  updateLineItem(li.id, { description: e.target.value })
                }
                className="h-8 text-sm"
              />

              {(li.lineType === "material" || li.lineType === "hauling") && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Material</Label>
                    <Select
                      value={li.materialId}
                      onValueChange={(v) =>
                        updateLineItem(li.id, { materialId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
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
                      value={li.originId}
                      onValueChange={(v) =>
                        updateLineItem(li.id, { originId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
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
                      value={li.destinationId}
                      onValueChange={(v) =>
                        updateLineItem(li.id, { destinationId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
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
                      min={0}
                      step="0.01"
                      value={li.quantity}
                      onChange={(e) =>
                        updateLineItem(li.id, {
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {li.lineType !== "material" && li.lineType !== "hauling" && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={li.quantity}
                      onChange={(e) =>
                        updateLineItem(li.id, {
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Material Rate</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={li.materialRate}
                    onChange={(e) =>
                      updateLineItem(li.id, {
                        materialRate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Haul Rate</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={li.haulRate}
                    onChange={(e) =>
                      updateLineItem(li.id, {
                        haulRate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fuel Surcharge</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={li.fuelSurcharge}
                    onChange={(e) =>
                      updateLineItem(li.id, {
                        fuelSurcharge: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Line Total</Label>
                  <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm font-medium tabular-nums">
                    {formatCurrency(li.lineTotal)}
                  </div>
                </div>
              </div>
            </div>
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
                <span className="tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
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
                <span className="tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                placeholder="Internal notes..."
                value={notesInternal}
                onChange={(e) => setNotesInternal(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Notes</Label>
              <Textarea
                placeholder="Notes visible to customer..."
                value={notesCustomer}
                onChange={(e) => setNotesCustomer(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Link href={`/estimates/${id}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={updateEstimate.isPending}
          >
            {updateEstimate.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Helper
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
    fuelSurcharge: 0,
    lineTotal: 0,
  };
}
