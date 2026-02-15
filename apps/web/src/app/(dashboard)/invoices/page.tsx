"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
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
} from "@aggregateos/ui";
import {
  Plus,
  FileText,
  DollarSign,
  Send,
  CheckCircle2,
  Ban,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Receipt,
  AlertCircle,
  AlertTriangle,
  CalendarRange,
  Clock,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE_VARIANT,
  QB_SYNC_STATUS_LABELS,
  QB_SYNC_BADGE_VARIANT,
  type InvoiceStatus,
  type QbSyncStatus,
} from "@aggregateos/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number | string | null | undefined) {
  if (amount == null) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";
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
    year: "numeric",
  });
}

function isOverdue(dueDate: string, status: string | null) {
  if (status === "paid" || status === "void") return false;
  return new Date(dueDate) < new Date();
}

const QB_DOT_COLORS: Record<string, string> = {
  not_synced: "bg-gray-400",
  synced: "bg-green-500",
  sync_failed: "bg-red-500",
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="space-y-0 divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create Invoice Dialog
// ---------------------------------------------------------------------------

function CreateInvoiceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();

  const [customerId, setCustomerId] = useState("");
  const [selectedLoadIds, setSelectedLoadIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: customerData } = trpc.customer.list.useQuery(
    { limit: 100 },
    { enabled: open },
  );

  const { data: billableData } = trpc.load.list.useQuery(
    { status: "billable", limit: 100 },
    { enabled: open },
  );

  const createInvoice = trpc.invoice.create.useMutation({
    onSuccess: () => {
      utils.invoice.list.invalidate();
      utils.invoice.stats.invalidate();
      utils.load.list.invalidate();
      toast.success("Invoice created successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });

  const resetForm = () => {
    setCustomerId("");
    setSelectedLoadIds([]);
    setDueDate("");
    setNotes("");
  };

  const toggleLoad = (loadId: string) => {
    setSelectedLoadIds((prev) =>
      prev.includes(loadId)
        ? prev.filter((id) => id !== loadId)
        : [...prev, loadId],
    );
  };

  const handleSubmit = () => {
    if (!customerId || selectedLoadIds.length === 0 || !dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    createInvoice.mutate({
      customerId,
      loadIds: selectedLoadIds,
      dueDate,
      notes: notes || undefined,
    });
  };

  const customers = customerData?.items ?? [];
  const billableLoads = billableData?.items ?? [];

  const filteredLoads = customerId
    ? billableLoads.filter((l: any) => l.customerId === customerId)
    : billableLoads;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Select a customer and billable loads to generate an invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Customer *</Label>
            <Select
              value={customerId}
              onValueChange={(val) => {
                setCustomerId(val);
                setSelectedLoadIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer..." />
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
            <Label>Loads to Invoice *</Label>
            {!customerId ? (
              <p className="text-sm text-muted-foreground py-2">
                Select a customer first to see billable loads.
              </p>
            ) : filteredLoads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No billable loads available for this customer.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                {filteredLoads.map((load: any) => (
                  <label
                    key={load.id}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLoadIds.includes(load.id)}
                      onChange={() => toggleLoad(load.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="font-mono font-medium">
                      {load.loadNumber}
                    </span>
                    <span className="text-muted-foreground text-xs ml-auto">
                      {load.createdAt
                        ? new Date(load.createdAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selectedLoadIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedLoadIds.length} load(s) selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createInvoice.isPending ||
              !customerId ||
              selectedLoadIds.length === 0 ||
              !dueDate
            }
          >
            {createInvoice.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Generate Drafts Dialog
// ---------------------------------------------------------------------------

function GenerateDraftsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [market, setMarket] = useState("");
  const [customerId, setCustomerId] = useState("");

  const { data: customers } = trpc.customer.list.useQuery(
    { limit: 100 },
    { enabled: open },
  );

  const { data: exceptionsData } = trpc.invoice.getExceptions.useQuery(
    {
      periodStart: periodStart || undefined,
      periodEnd: periodEnd || undefined,
      limit: 1,
    },
    { enabled: open && !!periodStart && !!periodEnd },
  );

  const generateDrafts = trpc.invoice.generateDrafts.useMutation({
    onSuccess: (data) => {
      utils.invoice.list.invalidate();
      utils.invoice.stats.invalidate();
      utils.load.list.invalidate();
      toast.success(
        data.invoicesCreated > 0
          ? `Generated ${data.invoicesCreated} invoice(s)`
          : "No billable loads found for this period",
      );
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to generate invoices: ${error.message}`);
    },
  });

  const resetForm = () => {
    setPeriodStart("");
    setPeriodEnd("");
    setMarket("");
    setCustomerId("");
  };

  const handleSubmit = () => {
    if (!periodStart || !periodEnd) {
      toast.error("Please select both start and end dates");
      return;
    }
    if (new Date(periodEnd) < new Date(periodStart)) {
      toast.error("End date must be after start date");
      return;
    }
    generateDrafts.mutate({
      periodStart,
      periodEnd,
      market: market || undefined,
      customerId: customerId || undefined,
    });
  };

  const exceptionCount = exceptionsData?.totalCount ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Draft Invoices</DialogTitle>
          <DialogDescription>
            Automatically group billable loads by customer and create draft
            invoices for the selected period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Period End</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Market (optional)</Label>
            <Input
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="e.g. TN, FL, GA"
            />
          </div>

          <div className="space-y-2">
            <Label>Customer (optional)</Label>
            <Select
              value={customerId || "all"}
              onValueChange={(v) =>
                setCustomerId(v === "all" ? "" : v)
              }
            >
              <SelectTrigger>
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

          {exceptionCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
              <p className="text-sm text-orange-700">
                <Link
                  href="/invoices/exceptions"
                  className="font-medium underline"
                >
                  {exceptionCount} load{exceptionCount !== 1 ? "s" : ""}{" "}
                  blocked
                </Link>{" "}
                from billing in this period
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              generateDrafts.isPending || !periodStart || !periodEnd
            }
          >
            {generateDrafts.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <CalendarRange className="mr-2 h-4 w-4" />
                Generate Invoices
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InvoicesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [qbFilter, setQbFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data, isLoading } = trpc.invoice.list.useQuery({
    status: activeTab === "all" ? undefined : activeTab,
    customerId: customerFilter !== "all" ? customerFilter : undefined,
    qbStatus: qbFilter !== "all" ? qbFilter : undefined,
    page,
    limit: PAGE_SIZE,
  });

  const { data: stats } = trpc.invoice.stats.useQuery();

  const { data: customers } = trpc.customer.list.useQuery({ limit: 100 });

  const { data: exceptionsData } = trpc.invoice.getExceptions.useQuery({
    limit: 1,
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const updateStatus = trpc.invoice.updateStatus.useMutation({
    onSuccess: () => {
      utils.invoice.list.invalidate();
      utils.invoice.stats.invalidate();
      utils.load.list.invalidate();
    },
  });

  const markOverdue = trpc.invoice.markOverdue.useMutation({
    onSuccess: () => {
      utils.invoice.list.invalidate();
      utils.invoice.stats.invalidate();
      toast.success("Overdue invoices have been marked");
    },
    onError: (error) => {
      toast.error(`Failed to mark overdue: ${error.message}`);
    },
  });

  const voidInvoice = trpc.invoice.voidInvoice.useMutation({
    onSuccess: () => {
      utils.invoice.list.invalidate();
      utils.invoice.stats.invalidate();
      utils.load.list.invalidate();
      toast.success("Invoice voided");
    },
    onError: (error) => {
      toast.error(`Failed to void invoice: ${error.message}`);
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStatusChange = (
    id: string,
    status: string,
    invoiceNumber: string,
  ) => {
    updateStatus.mutate(
      {
        id,
        status: status as any,
      },
      {
        onSuccess: () => {
          toast.success(`${invoiceNumber} updated to ${INVOICE_STATUS_LABELS[status as InvoiceStatus] ?? status}`);
        },
        onError: (error) => {
          toast.error(`Failed to update: ${error.message}`);
        },
      },
    );
  };

  const handleVoid = (id: string, invoiceNumber: string) => {
    voidInvoice.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success(`${invoiceNumber} voided`);
        },
      },
    );
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
  };

  const handleCustomerFilterChange = (value: string) => {
    setCustomerFilter(value);
    setPage(1);
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;
  const exceptionCount = exceptionsData?.totalCount ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Manage billing, payment tracking, and invoice generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {exceptionCount > 0 && (
            <Link href="/invoices/exceptions">
              <Button variant="outline" size="sm" className="text-orange-600">
                <AlertTriangle className="mr-2 h-4 w-4" />
                {exceptionCount} Exception{exceptionCount !== 1 ? "s" : ""}
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => markOverdue.mutate()}
            disabled={markOverdue.isPending}
          >
            {markOverdue.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Clock className="mr-2 h-4 w-4" />
            )}
            Mark Overdue
          </Button>
          <Button
            variant="outline"
            onClick={() => setGenerateDialogOpen(true)}
          >
            <CalendarRange className="mr-2 h-4 w-4" />
            Generate Drafts
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Draft"
          value={stats?.totalDraft ?? 0}
          icon={FileText}
          iconBg="bg-zinc-100"
          iconColor="text-zinc-600"
        />
        <StatCard
          title="Sent"
          value={stats?.totalSent ?? 0}
          icon={Send}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Paid"
          value={stats?.totalPaid ?? 0}
          icon={CheckCircle2}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Overdue"
          value={stats?.totalOverdue ?? 0}
          icon={AlertCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          title="Outstanding"
          value={stats ? formatCurrency(stats.totalOutstanding) : "—"}
          icon={DollarSign}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="ready_to_send">Ready</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={customerFilter}
          onValueChange={handleCustomerFilterChange}
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

        <Select
          value={qbFilter}
          onValueChange={(v) => {
            setQbFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="QB Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All QB Status</SelectItem>
            <SelectItem value="not_synced">Not Synced</SelectItem>
            <SelectItem value="synced">Synced</SelectItem>
            <SelectItem value="sync_failed">Sync Failed</SelectItem>
          </SelectContent>
        </Select>

        {totalCount > 0 && (
          <p className="ml-auto text-sm text-muted-foreground">
            {totalCount} invoice{totalCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16 text-muted-foreground">
          <Receipt className="h-10 w-10" />
          <p className="mt-4 text-lg font-medium">No invoices found</p>
          <p className="mt-1 text-sm">
            {activeTab === "all" && customerFilter === "all"
              ? "Create your first invoice to get started."
              : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">QB</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Billing Period</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((inv: any) => {
                  const status = (inv.status ?? "draft") as InvoiceStatus;
                  const qbSyncStatus = (inv.qbStatus ?? "not_synced") as QbSyncStatus;
                  const overdue = isOverdue(inv.dueDate, inv.status);

                  return (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                    >
                      <TableCell className="font-medium font-mono">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        {inv.customerName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            INVOICE_STATUS_BADGE_VARIANT[status] ?? "secondary"
                          }
                          className={
                            status === "void"
                              ? "line-through opacity-60"
                              : undefined
                          }
                        >
                          {INVOICE_STATUS_LABELS[status] ?? status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div
                          className={`inline-block h-2.5 w-2.5 rounded-full ${QB_DOT_COLORS[qbSyncStatus] ?? "bg-gray-400"}`}
                          title={
                            QB_SYNC_STATUS_LABELS[qbSyncStatus] ?? qbSyncStatus
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {formatCurrency(inv.total)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            overdue ? "text-red-600 font-medium" : ""
                          }
                        >
                          {formatDate(inv.dueDate)}
                          {overdue && (
                            <AlertCircle className="ml-1 inline h-3.5 w-3.5 text-red-500" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inv.billingPeriodStart && inv.billingPeriodEnd
                          ? `${formatDate(inv.billingPeriodStart)} – ${formatDate(inv.billingPeriodEnd)}`
                          : inv.weekStart
                            ? formatDate(inv.weekStart)
                            : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inv.market ?? "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/invoices/${inv.id}`);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {inv.status === "draft" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(
                                    inv.id,
                                    "ready_to_send",
                                    inv.invoiceNumber,
                                  );
                                }}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Mark Ready
                              </DropdownMenuItem>
                            )}
                            {inv.status === "ready_to_send" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(
                                    inv.id,
                                    "sent",
                                    inv.invoiceNumber,
                                  );
                                }}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Mark Sent
                              </DropdownMenuItem>
                            )}
                            {(inv.status === "sent" ||
                              inv.status === "overdue") && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(
                                    inv.id,
                                    "paid",
                                    inv.invoiceNumber,
                                  );
                                }}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Mark Paid
                              </DropdownMenuItem>
                            )}
                            {inv.status !== "void" &&
                              inv.status !== "paid" && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVoid(inv.id, inv.invoiceNumber);
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Void
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

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
      <CreateInvoiceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <GenerateDraftsDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
      />
    </div>
  );
}
