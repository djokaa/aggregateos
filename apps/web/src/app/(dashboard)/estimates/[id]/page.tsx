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
  Textarea,
  Input,
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
} from "@aggregateos/ui";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  FileOutput,
  FileDown,
  Clock,
  Pencil,
  MessageSquare,
  Paperclip,
  History,
  Copy,
  Eye,
  Mail,
  User,
  Bot,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════════════════════

type EstimateStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "approved"
  | "rejected"
  | "expired";

const statusBadgeVariant: Record<
  EstimateStatus,
  "secondary" | "info" | "success" | "error" | "orange" | "purple"
> = {
  draft: "secondary",
  sent: "info",
  viewed: "purple",
  approved: "success",
  rejected: "error",
  expired: "orange",
};

const statusLabels: Record<EstimateStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
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

const LINE_TYPE_LABELS: Record<string, string> = {
  material: "Material",
  hauling: "Hauling",
  hourly: "Hourly",
  fee: "Fee",
  discount: "Discount",
};

// ═══════════════════════════════════════════════════════════════════════════
// Humanized event meta formatter
// ═══════════════════════════════════════════════════════════════════════════

function formatEventMeta(
  eventType: string,
  meta: Record<string, unknown> | null | undefined,
): string | null {
  if (!meta || typeof meta !== "object" || Object.keys(meta).length === 0) {
    return null;
  }

  const m = meta as Record<string, any>;

  switch (eventType) {
    case "sent": {
      const emails = m.recipientEmails as string[] | undefined;
      const ver = m.versionNumber;
      const parts: string[] = [];
      if (emails?.length) parts.push(`Sent to ${emails.join(", ")}`);
      if (ver) parts.push(`Version ${ver}`);
      return parts.join(" · ") || null;
    }

    case "approved": {
      const email = m.recipientEmail || m.approvedBy;
      const ver = m.versionNumber;
      const parts: string[] = [];
      if (email) parts.push(`Approved by ${email}`);
      if (ver) parts.push(`Version ${ver}`);
      return parts.join(" · ") || null;
    }

    case "rejected": {
      const email = m.recipientEmail || m.rejectedBy;
      const reason = m.reason || m.body;
      const parts: string[] = [];
      if (email) parts.push(`Rejected by ${email}`);
      if (reason) parts.push(`Reason: "${reason}"`);
      return parts.join(" · ") || null;
    }

    case "viewed": {
      const email = m.recipientEmail;
      return email ? `Viewed by ${email}` : null;
    }

    case "commented": {
      const body = m.body;
      return body ? `"${String(body).slice(0, 200)}"` : null;
    }

    case "status_changed": {
      const from = m.from;
      const to = m.to;
      if (from && to) {
        const fromLabel =
          statusLabels[from as EstimateStatus] || String(from);
        const toLabel = statusLabels[to as EstimateStatus] || String(to);
        return `Status changed from ${fromLabel} to ${toLabel}`;
      }
      return null;
    }

    case "line_item_added":
      return m.description
        ? `Added: ${m.description}`
        : m.materialName
          ? `Added: ${m.materialName}`
          : "New line item added";

    case "line_item_removed":
      return m.description
        ? `Removed: ${m.description}`
        : m.materialName
          ? `Removed: ${m.materialName}`
          : "Line item removed";

    case "line_item_updated":
      return m.description
        ? `Updated: ${m.description}`
        : m.materialName
          ? `Updated: ${m.materialName}`
          : "Line item updated";

    case "updated": {
      const fields = m.fields as string[] | undefined;
      if (fields?.length) return `Updated fields: ${fields.join(", ")}`;
      return "Estimate details updated";
    }

    case "attachment_added":
      return m.fileName ? `Attached: ${m.fileName}` : "File attached";

    case "attachment_removed":
      return m.fileName ? `Removed: ${m.fileName}` : "Attachment removed";

    default: {
      // Fallback: clean key-value pairs
      const entries = Object.entries(m)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
      return entries.length > 0 ? entries.join(", ") : null;
    }
  }
}

const EVENT_LABELS: Record<string, string> = {
  created: "Estimate Created",
  updated: "Estimate Updated",
  line_item_added: "Line Item Added",
  line_item_updated: "Line Item Updated",
  line_item_removed: "Line Item Removed",
  sent: "Estimate Sent",
  viewed: "Estimate Viewed",
  commented: "Comment Added",
  approved: "Estimate Approved",
  rejected: "Estimate Rejected",
  attachment_added: "Attachment Added",
  attachment_removed: "Attachment Removed",
  status_changed: "Status Changed",
};

const ACTOR_ICONS: Record<string, typeof User> = {
  user: User,
  customer: Eye,
  system: Bot,
};

// ═══════════════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════════════

export default function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [commentText, setCommentText] = useState("");
  const [recipientEmails, setRecipientEmails] = useState("");
  const [activityExpanded, setActivityExpanded] = useState(true);

  // ─── Data fetching ───────────────────────────────────────────────────
  const {
    data: estimate,
    isLoading,
    error,
  } = trpc.estimate.getById.useQuery({ id });

  const { data: customerList } = trpc.customer.list.useQuery(
    { page: 1, limit: 100 },
  );

  // ─── Mutations ───────────────────────────────────────────────────────
  const updateStatus = trpc.estimate.updateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Status updated to ${statusLabels[data.status as EstimateStatus] ?? data.status}`,
      );
      utils.estimate.getById.invalidate({ id });
      utils.estimate.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateEstimate = trpc.estimate.update.useMutation({
    onSuccess: () => {
      toast.success("Estimate updated");
      utils.estimate.getById.invalidate({ id });
      utils.estimate.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const sendEstimate = trpc.estimate.send.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Estimate sent to ${data.tokenCount} recipient${data.tokenCount !== 1 ? "s" : ""} (v${data.versionNumber})`,
      );
      setRecipientEmails("");
      utils.estimate.getById.invalidate({ id });
      utils.estimate.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const duplicateEstimate = trpc.estimate.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success(`Estimate duplicated as ${data.estimateNumber}`);
      router.push(`/estimates/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const addComment = trpc.estimate.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comment added");
      setCommentText("");
      utils.estimate.getById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message),
  });

  const createOrders = trpc.order.createFromEstimate.useMutation({
    onSuccess: (orders) => {
      toast.success(
        `${orders.length} order${orders.length !== 1 ? "s" : ""} created`,
      );
      utils.estimate.list.invalidate();
      router.push("/orders");
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
  if (error || !estimate) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/estimates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Estimate</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">
            Estimate not found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error?.message ?? "The estimate could not be loaded."}
          </p>
          <Link href="/estimates" className="mt-4">
            <Button variant="outline">Back to Estimates</Button>
          </Link>
        </div>
      </div>
    );
  }

  const status = (estimate.status as EstimateStatus) || "draft";
  const lineItems = estimate.lineItems ?? [];
  const historyEvents = estimate.historyEvents ?? [];
  const comments = estimate.comments ?? [];
  const attachments = estimate.attachments ?? [];
  const versions = estimate.versions ?? [];
  const recipients = estimate.recipients ?? [];
  const isDraft = status === "draft";
  const canSend = isDraft || status === "sent";
  const canConvert = status === "approved";
  const isActioning =
    updateStatus.isPending ||
    createOrders.isPending ||
    sendEstimate.isPending;

  const customers = customerList?.items ?? [];

  function handleSendEstimate() {
    const emails = recipientEmails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error("Enter at least one email address");
      return;
    }
    sendEstimate.mutate({ id, recipientEmails: emails });
  }

  function handleCustomerChange(customerId: string) {
    if (customerId === "__new__") {
      router.push("/customers?action=new");
      return;
    }
    updateEstimate.mutate({ id, customerId });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/estimates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                {estimate.estimateNumber}
              </h1>
              <Badge variant={statusBadgeVariant[status] ?? "secondary"}>
                {statusLabels[status] ?? status}
              </Badge>
              {versions.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  v{versions[0]?.versionNumber ?? 1}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {estimate.market ? `${estimate.market} · ` : ""}
              {estimate.jobSiteName ? `${estimate.jobSiteName} · ` : ""}
              Valid until {formatDate(estimate.validUntil)}
            </p>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isDraft && (
            <Link href={`/estimates/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateEstimate.mutate({ id })}
            disabled={duplicateEstimate.isPending}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Link href={`/api/estimates/${id}/pdf`} target="_blank">
            <Button variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </Link>
          {canConvert && (
            <Button
              size="sm"
              onClick={() => createOrders.mutate({ estimateId: id })}
              disabled={isActioning}
            >
              {createOrders.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileOutput className="mr-2 h-4 w-4" />
              )}
              Convert to Orders
            </Button>
          )}
        </div>
      </div>

      {/* ═══ Two-column layout ═══ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ─── LEFT COLUMN: Main content ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer + Estimate Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Customer selector */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Customer
                  </label>
                  {isDraft ? (
                    <Select
                      value={estimate.customerId ?? ""}
                      onValueChange={handleCustomerChange}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__new__">
                          <span className="flex items-center gap-2 text-blue-600 font-medium">
                            <Plus className="h-3.5 w-3.5" />
                            Add New Customer
                          </span>
                        </SelectItem>
                        {customers.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-sm font-medium">
                      {estimate.customerName ?? "Unknown Customer"}
                    </p>
                  )}
                </div>

                {/* Summary fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sent
                    </label>
                    <p className="mt-1 text-sm">
                      {formatDateTime(estimate.sentAt)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {status === "approved"
                        ? "Approved"
                        : status === "rejected"
                          ? "Rejected"
                          : "Created"}
                    </label>
                    <p className="mt-1 text-sm">
                      {formatDateTime(
                        status === "approved"
                          ? estimate.approvedAt
                          : status === "rejected"
                            ? estimate.rejectedAt
                            : estimate.createdAt,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Line Items</CardTitle>
              <CardDescription>
                {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-center">Unit</TableHead>
                      <TableHead className="text-right">
                        Material Rate
                      </TableHead>
                      <TableHead className="text-right">Haul Rate</TableHead>
                      <TableHead className="text-right">
                        Fuel Surcharge
                      </TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
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
                              {LINE_TYPE_LABELS[li.lineType] ??
                                li.lineType ??
                                "Material"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {li.materialName ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {li.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {li.quantity}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {li.unit ?? "ton"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(li.materialRate ?? "0")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(li.haulRate ?? "0")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(li.fuelSurcharge ?? "0")}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCurrency(li.lineTotal ?? "0")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>

            {/* Totals */}
            <CardFooter className="border-t pt-4">
              <div className="ml-auto w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">
                    {formatCurrency(estimate.subtotal ?? "0")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Fuel Surcharge
                  </span>
                  <span className="tabular-nums">
                    {formatCurrency(estimate.fuelSurchargeTotal ?? "0")}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatCurrency(estimate.total ?? "0")}
                  </span>
                </div>
              </div>
            </CardFooter>
          </Card>

          {/* Notes */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {estimate.notesInternal ||
                    estimate.notes ||
                    "No internal notes."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Customer Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {estimate.notesCustomer || "No customer-facing notes."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Versions */}
          {versions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Versions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {versions.map((v: any) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-md border px-4 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" size="sm">
                          v{v.versionNumber}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(v.createdAt)}
                        </span>
                      </div>
                      {v.pdfUrl && (
                        <a
                          href={v.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <FileDown className="mr-1 h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── RIGHT COLUMN: Sidebar ─── */}
        <div className="space-y-6">
          {/* Send Estimate Card */}
          {canSend && (
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Estimate
                </CardTitle>
                {estimate.sentAt && (
                  <CardDescription>
                    Last sent {formatDateTime(estimate.sentAt)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Recipient Emails
                  </label>
                  <Input
                    placeholder="john@example.com, jane@example.com"
                    value={recipientEmails}
                    onChange={(e) => setRecipientEmails(e.target.value)}
                    className="mt-1 bg-white"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate multiple emails with commas
                  </p>
                </div>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={!recipientEmails.trim() || sendEstimate.isPending}
                  onClick={handleSendEstimate}
                >
                  {sendEstimate.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Estimate
                </Button>

                {/* Previous recipients */}
                {recipients.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Previously sent to:
                    </p>
                    <div className="space-y-1">
                      {recipients.map((r: any) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-foreground truncate">
                            {r.email}
                          </span>
                          <span className="text-muted-foreground ml-2 flex-shrink-0">
                            {formatDate(r.sentAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Not sendable status info */}
          {!canSend && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {status === "approved" && (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700">
                          Approved
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(estimate.approvedAt)}
                        </p>
                      </div>
                    </>
                  )}
                  {status === "rejected" && (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-red-700">
                          Rejected
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(estimate.rejectedAt)}
                        </p>
                      </div>
                    </>
                  )}
                  {status === "expired" && (
                    <>
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-orange-700">
                          Expired
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Past valid until date
                        </p>
                      </div>
                    </>
                  )}
                  {status === "viewed" && (
                    <>
                      <Eye className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-purple-700">
                          Viewed by customer
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Awaiting response
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Comments */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No comments yet
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {[...comments].reverse().map((comment: any) => (
                    <div
                      key={comment.id}
                      className={`rounded-lg border px-3 py-2 ${
                        comment.authorType === "customer"
                          ? "border-blue-200 bg-blue-50/50"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              comment.authorType === "customer"
                                ? "info"
                                : "secondary"
                            }
                            size="sm"
                          >
                            {comment.authorType === "customer"
                              ? "Customer"
                              : "Admin"}
                          </Badge>
                          <span className="text-xs font-medium">
                            {comment.authorLabel}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs whitespace-pre-wrap">
                        {comment.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment */}
              <div className="border-t pt-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    disabled={!commentText.trim() || addComment.isPending}
                    onClick={() =>
                      addComment.mutate({
                        estimateId: id,
                        body: commentText,
                      })
                    }
                  >
                    {addComment.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="mr-2 h-4 w-4" />
                    )}
                    Post
                  </Button>
                </div>
              </div>
            </CardContent>
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
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <FileDown className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
