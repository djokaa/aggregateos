"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@aggregateos/ui";
import {
  Plus,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  Pencil,
  Trash2,
  Loader2,
  Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CREDIT_TERMS_LABEL: Record<string, string> = {
  cod: "COD",
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
};

function formatCurrency(amount: number | string | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(typeof amount === "string" ? parseFloat(amount) : amount);
}

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// New Customer Dialog
// ---------------------------------------------------------------------------

function NewCustomerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    creditTerms: "net_30",
    notes: "",
  });

  const createMutation = trpc.customer.create.useMutation({
    onSuccess: () => {
      toast.success("Customer created successfully");
      utils.customer.list.invalidate();
      resetForm();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(`Failed to create customer: ${err.message}`);
    },
  });

  const resetForm = () => {
    setForm({
      name: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      billingAddress: "",
      billingCity: "",
      billingState: "",
      billingZip: "",
      creditTerms: "net_30",
      notes: "",
    });
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.contactName || !form.contactPhone || !form.billingAddress) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate({
      name: form.name,
      contactName: form.contactName,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone,
      billingAddress: form.billingAddress,
      billingCity: form.billingCity,
      billingState: form.billingState,
      billingZip: form.billingZip,
      creditTerms: form.creditTerms as "cod" | "net_15" | "net_30" | "net_45" | "net_60",
      notes: form.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Smith Construction"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Contact Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Primary contact"
                value={form.contactName}
                onChange={(e) => update("contactName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="(555) 000-0000"
                value={form.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={form.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Billing Address <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Street address"
              value={form.billingAddress}
              onChange={(e) => update("billingAddress", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                placeholder="City"
                value={form.billingCity}
                onChange={(e) => update("billingCity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                placeholder="State"
                value={form.billingState}
                onChange={(e) => update("billingState", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input
                placeholder="ZIP"
                value={form.billingZip}
                onChange={(e) => update("billingZip", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Credit Terms</Label>
            <Select value={form.creditTerms} onValueChange={(v) => update("creditTerms", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cod">COD</SelectItem>
                <SelectItem value="net_15">Net 15</SelectItem>
                <SelectItem value="net_30">Net 30</SelectItem>
                <SelectItem value="net_45">Net 45</SelectItem>
                <SelectItem value="net_60">Net 60</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Customer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-10 w-80 animate-pulse rounded bg-muted" />
      <div className="rounded-md border">
        <div className="space-y-0 divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-44 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
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

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.customer.list.useQuery({
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const deleteMutation = trpc.customer.delete.useMutation({
    onSuccess: () => {
      toast.success("Customer deleted");
      utils.customer.list.invalidate();
    },
    onError: () => {
      toast.error("Failed to delete customer");
    },
  });

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  // Loading skeleton
  if (isLoading) {
    return <TableSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
            <p className="text-sm text-muted-foreground">
              Manage your customer accounts
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">
            Failed to load customers
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  const customers = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your customer accounts
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Customer
        </Button>
      </div>

      {/* Search / Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {totalCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {totalCount} customer{totalCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Empty state */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No customers found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {debouncedSearch
              ? "Try adjusting your search terms"
              : "Get started by adding your first customer"}
          </p>
          {!debouncedSearch && (
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Customer
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Data Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Legal Name</TableHead>
                  <TableHead>Primary Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Credit Terms</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <TableCell className="font-medium">
                      {customer.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.legalName || "—"}
                    </TableCell>
                    <TableCell>{customer.contactName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.contactPhone}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.contactEmail || "—"}
                    </TableCell>
                    <TableCell>
                      {CREDIT_TERMS_LABEL[customer.creditTerms ?? "net_30"] ??
                        customer.creditTerms}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(customer.creditLimit)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.isActive ? "success" : "secondary"}>
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
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
                              router.push(`/customers/${customer.id}`);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/customers/${customer.id}`);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={(e) =>
                              handleDelete(e, customer.id, customer.name)
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
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

      {/* New Customer Dialog */}
      <NewCustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
