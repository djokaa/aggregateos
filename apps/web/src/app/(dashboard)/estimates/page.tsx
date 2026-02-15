"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@aggregateos/ui";
import {
  Plus,
  Search,
  MoreHorizontal,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Copy,
  Send,
  Eye,
  Trash2,
  CheckCircle,
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
    hour: "numeric",
    minute: "2-digit",
  });
}

function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 8 }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════════════

export default function EstimatesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [marketFilter, setMarketFilter] = useState("all");
  const limit = 20;

  const utils = trpc.useUtils();

  // Data
  const { data, isLoading } = trpc.estimate.list.useQuery({
    status: activeTab === "all" ? undefined : activeTab,
    customerId: customerFilter !== "all" ? customerFilter : undefined,
    market: marketFilter !== "all" ? marketFilter : undefined,
    page,
    limit,
  });

  const { data: customersData } = trpc.customer.list.useQuery({});

  // Mutations
  const updateStatus = trpc.estimate.updateStatus.useMutation({
    onSuccess: () => {
      utils.estimate.list.invalidate();
      toast.success("Estimate status updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const duplicateEstimate = trpc.estimate.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success(`Duplicated as ${data.estimateNumber}`);
      utils.estimate.list.invalidate();
      router.push(`/estimates/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteEstimate = trpc.estimate.delete.useMutation({
    onSuccess: () => {
      utils.estimate.list.invalidate();
      toast.success("Estimate deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  // Client-side search filter
  const items = (data?.items ?? []).filter((est: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      est.estimateNumber.toLowerCase().includes(q) ||
      (est.customerName ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = data?.totalPages ?? 1;
  const customers = (customersData as any)?.items ?? customersData ?? [];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
  };

  // KPI summary
  const allItems = data?.items ?? [];
  const draftCount = allItems.filter((e: any) => e.status === "draft").length;
  const sentCount = allItems.filter(
    (e: any) => e.status === "sent" || e.status === "viewed",
  ).length;
  const approvedTotal = allItems
    .filter((e: any) => e.status === "approved")
    .reduce((sum: number, e: any) => sum + parseFloat(e.total || "0"), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estimates</h1>
          <p className="text-sm text-muted-foreground">
            Create, send, and track project estimates
          </p>
        </div>
        <Link href="/estimates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Estimate
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Total
            </p>
            <p className="text-2xl font-bold">{data?.totalCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Drafts
            </p>
            <p className="text-2xl font-bold">{draftCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Pending
            </p>
            <p className="text-2xl font-bold">{sentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Approved Value
            </p>
            <p className="text-2xl font-bold">{formatCurrency(approvedTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search estimates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {(Array.isArray(customers) ? customers : []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={marketFilter} onValueChange={setMarketFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Markets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Markets</SelectItem>
            <SelectItem value="TN">Tennessee</SelectItem>
            <SelectItem value="FL">Florida</SelectItem>
            <SelectItem value="GA">Georgia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs & Table */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="viewed">Viewed</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows />
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8" />
                        <p>No estimates found</p>
                        <Link href="/estimates/new">
                          <Button variant="outline" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Create your first estimate
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((est: any) => (
                    <TableRow
                      key={est.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/estimates/${est.id}`)}
                    >
                      <TableCell className="font-medium font-mono">
                        {est.estimateNumber}
                      </TableCell>
                      <TableCell>{est.customerName ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(est.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            statusBadgeVariant[
                              est.status as EstimateStatus
                            ] ?? "secondary"
                          }
                        >
                          {statusLabels[est.status as EstimateStatus] ??
                            est.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {est.market ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(est.sentAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(est.validUntil)}
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
                            <DropdownMenuItem asChild>
                              <Link href={`/estimates/${est.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateEstimate.mutate({ id: est.id });
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            {est.status === "draft" && (
                              <DropdownMenuItem asChild>
                                <Link href={`/estimates/${est.id}/edit`}>
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {(est.status === "draft" ||
                              est.status === "sent") && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatus.mutate({
                                    id: est.id,
                                    status: "sent",
                                  });
                                }}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Send
                              </DropdownMenuItem>
                            )}
                            {(est.status === "sent" ||
                              est.status === "viewed") && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatus.mutate({
                                    id: est.id,
                                    status: "approved",
                                  });
                                }}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEstimate.mutate({ id: est.id });
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} &middot; {data?.totalCount ?? 0}{" "}
                total estimates
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
