"use client";

import { useState } from "react";
import {
  Button,
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
  Textarea,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Separator,
} from "@aggregateos/ui";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  BarChart3,
  Inbox,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Ban,
  CheckCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REJECT_REASONS = [
  { value: "unreadable", label: "Unreadable" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "tonnage_mismatch", label: "Tonnage Mismatch" },
  { value: "wrong_material", label: "Wrong Material" },
  { value: "wrong_job", label: "Wrong Job" },
  { value: "duplicate", label: "Duplicate" },
  { value: "other", label: "Other" },
] as const;

type RejectReason = (typeof REJECT_REASONS)[number]["value"];

type TicketStatus = "pending_review" | "approved" | "rejected";

const STATUS_BADGE: Record<
  string,
  { variant: "warning" | "success" | "error" | "secondary"; label: string }
> = {
  pending_review: { variant: "warning", label: "Pending" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "error", label: "Rejected" },
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
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
// Progress Bar
// ---------------------------------------------------------------------------

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const color =
    pct >= 90
      ? "bg-emerald-500"
      : pct >= 70
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reject Dialog
// ---------------------------------------------------------------------------

function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: RejectReason, notes?: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState<RejectReason | "">("");
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm(reason, notes || undefined);
    setReason("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Ticket</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this ticket.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as RejectReason)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REJECT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason || isPending}
            onClick={handleConfirm}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Reject Ticket
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
            <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-2 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            <div className="ml-auto h-8 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TicketsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingTicketId, setRejectingTicketId] = useState<string | null>(
    null
  );

  const utils = trpc.useUtils();

  // ---------- Queries ----------

  const statusFilter: TicketStatus | undefined =
    activeTab === "all"
      ? undefined
      : (activeTab as TicketStatus);

  const { data, isLoading, error } = trpc.ticket.reviewQueue.useQuery(
    { status: statusFilter, page, limit: PAGE_SIZE },
    { refetchInterval: 15_000 }
  );

  const { data: stats } = trpc.ticket.reviewStats.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  // ---------- Mutations ----------

  const approveMutation = trpc.ticket.approve.useMutation({
    onSuccess: () => {
      toast.success("Ticket approved");
      utils.ticket.reviewQueue.invalidate();
      utils.ticket.reviewStats.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to approve: ${err.message}`);
    },
  });

  const rejectMutation = trpc.ticket.reject.useMutation({
    onSuccess: () => {
      toast.success("Ticket rejected");
      setRejectDialogOpen(false);
      setRejectingTicketId(null);
      utils.ticket.reviewQueue.invalidate();
      utils.ticket.reviewStats.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to reject: ${err.message}`);
    },
  });

  const bulkApproveMutation = trpc.ticket.bulkApprove.useMutation({
    onSuccess: () => {
      toast.success(`${selectedIds.size} ticket(s) approved`);
      setSelectedIds(new Set());
      utils.ticket.reviewQueue.invalidate();
      utils.ticket.reviewStats.invalidate();
    },
    onError: (err) => {
      toast.error(`Bulk approve failed: ${err.message}`);
    },
  });

  // ---------- Handlers ----------

  const handleApprove = (ticketId: string) => {
    approveMutation.mutate({ ticketId });
  };

  const handleOpenReject = (ticketId: string) => {
    setRejectingTicketId(ticketId);
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = (reason: RejectReason, notes?: string) => {
    if (!rejectingTicketId) return;
    rejectMutation.mutate({ ticketId: rejectingTicketId, reason, notes });
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    bulkApproveMutation.mutate({ ticketIds: Array.from(selectedIds) });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  // ---------- Derived ----------

  const tickets = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  const allVisibleIds = tickets.map((t) => t.id);
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  };

  // ---------- Error state ----------

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Ticket Review Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and verify delivery tickets
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">
            Failed to load tickets
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
          <h1 className="text-2xl font-bold tracking-tight">
            Ticket Review Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and verify delivery tickets
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              onClick={handleBulkApprove}
              disabled={bulkApproveMutation.isPending}
            >
              {bulkApproveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 h-4 w-4" />
              )}
              Approve {selectedIds.size} Selected
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              utils.ticket.reviewQueue.invalidate();
              utils.ticket.reviewStats.invalidate();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Review"
          value={stats?.pendingReview ?? "—"}
          icon={Clock}
          description="Tickets awaiting verification"
        />
        <StatCard
          title="Total Processed"
          value={stats?.totalProcessed ?? "—"}
          icon={ShieldCheck}
        />
        <StatCard
          title="Auto-Approved %"
          value={
            stats?.autoApprovalRate != null
              ? `${(stats.autoApprovalRate * 100).toFixed(1)}%`
              : "—"
          }
          icon={BarChart3}
        />
        <StatCard
          title="Rejected"
          value={stats?.rejected ?? "—"}
          icon={XCircle}
        />
      </div>

      <Separator />

      {/* Tabs & Table */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending_review">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Results count */}
          {!isLoading && totalCount > 0 && (
            <p className="mb-4 text-sm text-muted-foreground">
              {totalCount} ticket{totalCount !== 1 ? "s" : ""}
            </p>
          )}

          {isLoading ? (
            <TableSkeleton />
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16">
              <Inbox className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No tickets found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab !== "all"
                  ? "No tickets match this filter"
                  : "New tickets will appear here when drivers upload them."}
              </p>
            </div>
          ) : (
            <>
              {/* Data Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Photo</TableHead>
                      <TableHead>Load #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead className="text-right">
                        Extracted Weight
                      </TableHead>
                      <TableHead>Extracted Ticket #</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => {
                      const badge =
                        STATUS_BADGE[ticket.status ?? "pending_review"] ??
                        STATUS_BADGE.pending_review;

                      return (
                        <TableRow key={ticket.id}>
                          {/* Checkbox */}
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(ticket.id)}
                              onChange={() => toggleSelect(ticket.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </TableCell>

                          {/* Photo */}
                          <TableCell>
                            {ticket.photoUrl ? (
                              <a
                                href={ticket.photoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block h-10 w-10 overflow-hidden rounded border hover:opacity-80 transition-opacity"
                              >
                                <img
                                  src={ticket.photoUrl}
                                  alt="Ticket"
                                  className="h-full w-full object-cover"
                                />
                              </a>
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>

                          {/* Load # */}
                          <TableCell className="font-mono font-semibold">
                            {ticket.loadNumber ?? "—"}
                          </TableCell>

                          {/* Customer */}
                          <TableCell>{ticket.customerName ?? "—"}</TableCell>

                          {/* Material */}
                          <TableCell>{ticket.materialName ?? "—"}</TableCell>

                          {/* Driver */}
                          <TableCell>{ticket.driverName ?? "—"}</TableCell>

                          {/* Extracted Weight */}
                          <TableCell className="text-right tabular-nums">
                            {ticket.extractedWeight != null
                              ? `${Number(ticket.extractedWeight).toLocaleString()} lbs`
                              : "—"}
                          </TableCell>

                          {/* Extracted Ticket # */}
                          <TableCell className="font-mono text-sm">
                            {ticket.extractedTicketNumber ?? "—"}
                          </TableCell>

                          {/* Confidence */}
                          <TableCell>
                            {ticket.confidence != null ? (
                              <ConfidenceBar value={ticket.confidence} />
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

                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-green-600 hover:text-green-700"
                                onClick={() => handleApprove(ticket.id)}
                                disabled={
                                  approveMutation.isPending ||
                                  ticket.status === "approved"
                                }
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-red-600 hover:text-red-700"
                                onClick={() => handleOpenReject(ticket.id)}
                                disabled={
                                  rejectMutation.isPending ||
                                  ticket.status === "rejected"
                                }
                              >
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </div>
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

      {/* Reject Dialog */}
      <RejectDialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) setRejectingTicketId(null);
        }}
        onConfirm={handleConfirmReject}
        isPending={rejectMutation.isPending}
      />
    </div>
  );
}
