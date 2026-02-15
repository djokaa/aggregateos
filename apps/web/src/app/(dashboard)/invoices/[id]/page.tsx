"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Separator,
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@aggregateos/ui";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Send,
  Ban,
  FileDown,
  Clock,
  History,
  Paperclip,
  User,
  Bot,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE_VARIANT,
  QB_SYNC_STATUS_LABELS,
  QB_SYNC_BADGE_VARIANT,
  SOURCE_TYPE_LABELS,
  INVOICE_TERMS_LABELS,
  type InvoiceStatus,
  type QbSyncStatus,
} from "@aggregateos/shared";

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function formatCurrency(amount: string | number | null | undefined) {
  if (amount == null) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Event formatting
// ═══════════════════════════════════════════════════════════════════════════

const EVENT_LABELS: Record<string, string> = {
  created: "Invoice Created",
  generated_from_loads: "Generated from Loads",
  line_item_added: "Line Item Added",
  line_item_updated: "Line Item Updated",
  line_item_removed: "Line Item Removed",
  attachment_added: "Attachment Added",
  attachment_removed: "Attachment Removed",
  sent: "Invoice Sent",
  synced_to_quickbooks: "Synced to QuickBooks",
  sync_failed: "QB Sync Failed",
  voided: "Invoice Voided",
  payment_recorded: "Payment Recorded",
  status_changed: "Status Changed",
};

function formatEventMeta(
  eventType: string,
  meta: Record<string, unknown> | null | undefined,
): string | null {
  if (!meta || typeof meta !== "object" || Object.keys(meta).length === 0) {
    return null;
  }

  const m = meta as Record<string, any>;

  switch (eventType) {
    case "status_changed": {
      const from = m.from;
      const to = m.to;
      if (m.action === "draft_updated" && m.fields) {
        return `Updated: ${(m.fields as string[]).join(", ")}`;
      }
      if (from && to) {
        const fromLabel = INVOICE_STATUS_LABELS[from as InvoiceStatus] || from;
        const toLabel = INVOICE_STATUS_LABELS[to as InvoiceStatus] || to;
        return `${fromLabel} → ${toLabel}`;
      }
      return null;
    }
    case "generated_from_loads":
      return `${m.loadCount} load(s), ${m.periodStart} – ${m.periodEnd}`;
    case "line_item_added":
    case "line_item_updated":
    case "line_item_removed":
      return m.description ? String(m.description) : null;
    case "voided":
      return m.reason
        ? `Reason: ${m.reason}`
        : `${m.loadCount ?? 0} load(s) released`;
    case "synced_to_quickbooks":
      return m.quickbooksId ? `QB ID: ${m.quickbooksId}` : null;
    case "sync_failed":
      return m.error ? `Error: ${m.error}` : null;
    case "payment_recorded":
      return m.source ? `Source: ${m.source}` : null;
    case "attachment_added":
    case "attachment_removed":
      return m.fileName ? String(m.fileName) : null;
    default:
      return null;
  }
}

const ACTOR_ICONS: Record<string, typeof User> = {
  user: User,
  system: Bot,
};

// ═══════════════════════════════════════════════════════════════════════════
// Add Line Item Dialog
// ═══════════════════════════════════════════════════════════════════════════

function AddLineItemDialog({
  invoiceId,
  open,
  onOpenChange,
  defaultSourceType = "adjustment",
}: {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSourceType?: string;
}) {
  const utils = trpc.useUtils();
  const [sourceType, setSourceType] = useState(defaultSourceType);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("tons");
  const [unitPrice, setUnitPrice] = useState("");

  const addLineItem = trpc.invoice.addLineItem.useMutation({
    onSuccess: () => {
      toast.success("Line item added");
      utils.invoice.getById.invalidate({ id: invoiceId });
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setDescription("");
    setQuantity("1");
    setUnit("tons");
    setUnitPrice("");
    setSourceType(defaultSourceType);
  };

  const handleSubmit = () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    const lineTotal = sourceType === "discount" ? -(qty * price) : qty * price;

    addLineItem.mutate({
      invoiceId,
      sourceType: sourceType as any,
      description,
      quantity: qty,
      unit,
      unitPrice: price,
      lineTotal,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
          <DialogDescription>
            Add an adjustment, fee, or discount line to this invoice.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="fee">Fee</SelectItem>
                <SelectItem value="discount">Discount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fuel surcharge adjustment"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tons">Tons</SelectItem>
                  <SelectItem value="loads">Loads</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="each">Each</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit Price</Label>
              <Input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>
          {unitPrice && quantity && (
            <p className="text-sm text-muted-foreground">
              Line total:{" "}
              {formatCurrency(
                sourceType === "discount"
                  ? -(parseFloat(quantity) * parseFloat(unitPrice))
                  : parseFloat(quantity) * parseFloat(unitPrice),
              )}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addLineItem.isPending || !description.trim() || !unitPrice}
          >
            {addLineItem.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Add Line Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════════════

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [activityExpanded, setActivityExpanded] = useState(true);
  const [addLineDialogOpen, setAddLineDialogOpen] = useState(false);
  const [addLineSourceType, setAddLineSourceType] = useState("adjustment");

  // ─── Data fetching ───────────────────────────────────────────────────
  const {
    data: invoice,
    isLoading,
    error,
  } = trpc.invoice.getById.useQuery({ id });

  // ─── Mutations ───────────────────────────────────────────────────────
  const updateStatus = trpc.invoice.updateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Status updated to ${INVOICE_STATUS_LABELS[data.status as InvoiceStatus] ?? data.status}`,
      );
      utils.invoice.getById.invalidate({ id });
      utils.invoice.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const voidInvoice = trpc.invoice.voidInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice voided");
      utils.invoice.getById.invalidate({ id });
      utils.invoice.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeLineItem = trpc.invoice.removeLineItem.useMutation({
    onSuccess: () => {
      toast.success("Line item removed");
      utils.invoice.getById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message),
  });

  const removeAttachment = trpc.invoice.removeAttachment.useMutation({
    onSuccess: () => {
      toast.success("Attachment removed");
      utils.invoice.getById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message),
  });

  const syncToQb = trpc.invoice.syncToQuickBooks.useMutation({
    onSuccess: () => {
      toast.success("Synced to QuickBooks");
      utils.invoice.getById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message),
  });

  const checkQb = trpc.invoice.checkQbStatus.useMutation({
    onSuccess: (data) => {
      if (data.paid) {
        toast.success("Payment detected — invoice marked as paid");
      } else {
        toast.info("No payment detected yet");
      }
      utils.invoice.getById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 animate-pulse rounded-lg border bg-muted" />
            <div className="h-64 animate-pulse rounded-lg border bg-muted" />
          </div>
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-lg border bg-muted" />
            <div className="h-64 animate-pulse rounded-lg border bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────
  if (error || !invoice) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Invoice</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">
            Invoice not found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error?.message ?? "The invoice could not be loaded."}
          </p>
          <Link href="/invoices" className="mt-4">
            <Button variant="outline">Back to Invoices</Button>
          </Link>
        </div>
      </div>
    );
  }

  const status = (invoice.status as InvoiceStatus) || "draft";
  const qbStatus = (invoice.qbStatus as QbSyncStatus) || "not_synced";
  const lineItems = invoice.lineItems ?? [];
  const historyEvents = invoice.historyEvents ?? [];
  const attachments = invoice.attachments ?? [];
  const loadLinks = invoice.loadLinks ?? [];
  const isDraft = status === "draft";
  const isActioning =
    updateStatus.isPending || voidInvoice.isPending || syncToQb.isPending;

  function openAddLine(type: string) {
    setAddLineSourceType(type);
    setAddLineDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                {invoice.invoiceNumber}
              </h1>
              <Badge
                variant={INVOICE_STATUS_BADGE_VARIANT[status] ?? "secondary"}
              >
                {INVOICE_STATUS_LABELS[status] ?? status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {invoice.customerName ?? "Unknown Customer"}
              {invoice.market ? ` · ${invoice.market}` : ""}
              {invoice.terms
                ? ` · ${INVOICE_TERMS_LABELS[invoice.terms as keyof typeof INVOICE_TERMS_LABELS] ?? invoice.terms}`
                : ""}
            </p>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateStatus.mutate({ id, status: "ready_to_send" })
              }
              disabled={isActioning}
            >
              <Send className="mr-2 h-4 w-4" />
              Mark Ready
            </Button>
          )}
          {status === "ready_to_send" && (
            <Button
              size="sm"
              onClick={() => updateStatus.mutate({ id, status: "sent" })}
              disabled={isActioning}
            >
              {updateStatus.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Mark Sent
            </Button>
          )}
          {(status === "sent" || status === "overdue") && (
            <Button
              size="sm"
              onClick={() => updateStatus.mutate({ id, status: "paid" })}
              disabled={isActioning}
            >
              Mark Paid
            </Button>
          )}
          <Link href={`/api/invoices/${id}/pdf`} target="_blank">
            <Button variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </Link>
          {status !== "void" && status !== "paid" && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => voidInvoice.mutate({ id })}
              disabled={isActioning}
            >
              <Ban className="mr-2 h-4 w-4" />
              Void
            </Button>
          )}
        </div>
      </div>

      {/* ═══ Two-column layout ═══ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ─── LEFT COLUMN: Main content ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer + Invoice Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Customer
                  </label>
                  <p className="mt-1 text-sm font-medium">
                    {invoice.customerName ?? "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Terms
                  </label>
                  <p className="mt-1 text-sm">
                    {INVOICE_TERMS_LABELS[
                      invoice.terms as keyof typeof INVOICE_TERMS_LABELS
                    ] ??
                      invoice.terms ??
                      "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Issue Date
                  </label>
                  <p className="mt-1 text-sm">
                    {formatDate(invoice.issueDate)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Due Date
                  </label>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
                {(invoice.billingPeriodStart || invoice.billingPeriodEnd) && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Billing Period
                    </label>
                    <p className="mt-1 text-sm">
                      {formatDate(invoice.billingPeriodStart)} –{" "}
                      {formatDate(invoice.billingPeriodEnd)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs: Line Items / Loads */}
          <Tabs defaultValue="line_items">
            <TabsList>
              <TabsTrigger value="line_items">
                Line Items ({lineItems.length})
              </TabsTrigger>
              <TabsTrigger value="loads">
                Loads ({loadLinks.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab: Line Items */}
            <TabsContent value="line_items">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-center">Unit</TableHead>
                          <TableHead className="text-right">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          {isDraft && <TableHead className="w-[50px]" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={isDraft ? 7 : 6}
                              className="h-24 text-center text-muted-foreground"
                            >
                              No line items
                            </TableCell>
                          </TableRow>
                        ) : (
                          lineItems.map((li: any) => (
                            <TableRow key={li.id}>
                              <TableCell>
                                <Badge variant="secondary" size="sm">
                                  {SOURCE_TYPE_LABELS[
                                    li.sourceType as keyof typeof SOURCE_TYPE_LABELS
                                  ] ??
                                    li.sourceType ??
                                    "Load"}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate">
                                {li.description ?? "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {Number(li.quantity).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground">
                                {li.unit ?? "tons"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(li.unitPrice)}
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {formatCurrency(li.lineTotal)}
                              </TableCell>
                              {isDraft && (
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-600"
                                    onClick={() =>
                                      removeLineItem.mutate({
                                        id: li.id,
                                        invoiceId: id,
                                      })
                                    }
                                    disabled={removeLineItem.isPending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>

                {/* Totals */}
                <CardFooter className="border-t pt-4 flex items-end justify-between">
                  {isDraft && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddLine("adjustment")}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Adjustment
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddLine("fee")}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Fee
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddLine("discount")}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Discount
                      </Button>
                    </div>
                  )}
                  {!isDraft && <div />}
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">
                        {formatCurrency(invoice.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="tabular-nums">
                        {formatCurrency(invoice.taxAmount)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="tabular-nums">
                        {formatCurrency(invoice.total)}
                      </span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Tab: Loads */}
            <TabsContent value="loads">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Load #</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead className="text-right">Tons</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Linked</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadLinks.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-24 text-center text-muted-foreground"
                            >
                              No linked loads
                            </TableCell>
                          </TableRow>
                        ) : (
                          loadLinks.map((link: any) => (
                            <TableRow key={link.id}>
                              <TableCell className="font-mono font-medium">
                                <Link
                                  href={`/loads/${link.loadId}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {link.loadNumber ?? "—"}
                                </Link>
                              </TableCell>
                              <TableCell>{link.driverName ?? "—"}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {link.billableTons
                                  ? Number(link.billableTons).toFixed(2)
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" size="sm">
                                  {link.loadStatus ?? "—"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(link.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Notes */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {invoice.notesInternal || invoice.notes || "No internal notes."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Customer Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {invoice.notesCustomer || "No customer-facing notes."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Sidebar ─── */}
        <div className="space-y-6">
          {/* Totals Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(invoice.taxAmount)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
                {invoice.paidAt && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Paid</span>
                    <span>{formatDate(invoice.paidAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* QB Sync Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                QuickBooks
                <Badge
                  variant={QB_SYNC_BADGE_VARIANT[qbStatus] ?? "secondary"}
                  size="sm"
                >
                  {QB_SYNC_STATUS_LABELS[qbStatus] ?? qbStatus}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.quickbooksId && (
                <p className="text-xs text-muted-foreground">
                  QB ID: {invoice.quickbooksId}
                </p>
              )}
              {(status === "sent" || status === "ready_to_send") &&
                qbStatus !== "synced" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => syncToQb.mutate({ id })}
                    disabled={syncToQb.isPending}
                  >
                    {syncToQb.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    {qbStatus === "sync_failed" ? "Retry Sync" : "Sync to QB"}
                  </Button>
                )}
              {qbStatus === "synced" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => checkQb.mutate({ id })}
                  disabled={checkQb.isPending}
                >
                  {checkQb.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Check Payment Status
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between cursor-pointer"
                onClick={() => setActivityExpanded(!activityExpanded)}
              >
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-3.5 w-3.5" />
                  Activity ({historyEvents.length})
                </CardTitle>
                {activityExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {activityExpanded && (
              <CardContent>
                {historyEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No activity yet
                  </p>
                ) : (
                  <div className="relative max-h-80 overflow-y-auto">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-3">
                      {historyEvents.map((event: any) => {
                        const IconComponent =
                          ACTOR_ICONS[event.actorType] ?? User;
                        const metaText = formatEventMeta(
                          event.eventType,
                          event.meta as Record<string, unknown>,
                        );
                        return (
                          <div
                            key={event.id}
                            className="relative flex gap-3 pl-7"
                          >
                            <div className="absolute left-1.5 top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-background border-2 border-muted-foreground/30" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-xs truncate">
                                  {EVENT_LABELS[event.eventType] ??
                                    event.eventType}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {event.actorLabel} ·{" "}
                                {formatDateTime(event.timestamp)}
                              </p>
                              {metaText && (
                                <p className="mt-1 text-xs text-muted-foreground/80 italic">
                                  {metaText}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5" />
                Attachments ({attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No attachments yet
                </p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att: any) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">
                            {att.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(att.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <FileDown className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() =>
                            removeAttachment.mutate({
                              id: att.id,
                              invoiceId: id,
                            })
                          }
                          disabled={removeAttachment.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ Dialogs ═══ */}
      <AddLineItemDialog
        invoiceId={id}
        open={addLineDialogOpen}
        onOpenChange={setAddLineDialogOpen}
        defaultSourceType={addLineSourceType}
      />
    </div>
  );
}
