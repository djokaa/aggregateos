"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
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
} from "@aggregateos/ui";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  User,
  Mail,
  Phone,
  Star,
  Building2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CONTACT_ROLE_LABELS,
  CONTACT_ROLE_BADGE_VARIANT,
  type ContactRole,
} from "@aggregateos/shared";

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

const ROLE_LABELS: Record<string, string> = {
  ap: "Accounts Payable",
  pm: "Project Manager",
  dispatch: "Dispatch",
  executive: "Executive",
  other: "Other",
};

const ROLE_BADGE_VARIANT: Record<string, "info" | "purple" | "orange" | "success" | "secondary"> = {
  ap: "info",
  pm: "purple",
  dispatch: "orange",
  executive: "success",
  other: "secondary",
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

type FormData = {
  name: string;
  legalName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  creditTerms: string;
  creditLimit: string;
  notes: string;
  companyId: string;
};

type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
};

// ---------------------------------------------------------------------------
// Contact Dialog
// ---------------------------------------------------------------------------

function ContactDialog({
  open,
  onOpenChange,
  customerId,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  contact?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    isPrimary: boolean | null;
  } | null;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!contact;

  const [form, setForm] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    role: "other",
    isPrimary: false,
  });

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        role: contact.role ?? "other",
        isPrimary: contact.isPrimary ?? false,
      });
    } else {
      setForm({ name: "", email: "", phone: "", role: "other", isPrimary: false });
    }
  }, [contact, open]);

  const createMutation = trpc.customerContact.create.useMutation({
    onSuccess: () => {
      toast.success("Contact added");
      utils.customerContact.list.invalidate({ customerId });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.customerContact.update.useMutation({
    onSuccess: () => {
      toast.success("Contact updated");
      utils.customerContact.list.invalidate({ customerId });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.name) {
      toast.error("Contact name is required");
      return;
    }
    if (isEdit && contact) {
      updateMutation.mutate({
        id: contact.id,
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role as "ap" | "pm" | "dispatch" | "executive" | "other",
        isPrimary: form.isPrimary,
      });
    } else {
      createMutation.mutate({
        customerId,
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role as "ap" | "pm" | "dispatch" | "executive" | "other",
        isPrimary: form.isPrimary,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Contact name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ap">Accounts Payable</SelectItem>
                <SelectItem value="pm">Project Manager</SelectItem>
                <SelectItem value="dispatch">Dispatch</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={form.isPrimary}
              onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isPrimary" className="cursor-pointer">
              Primary Contact
            </Label>
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
              "Add Contact"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Contacts Tab
// ---------------------------------------------------------------------------

function ContactsTab({ customerId }: { customerId: string }) {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    isPrimary: boolean | null;
  } | null>(null);

  const { data: contacts, isLoading } = trpc.customerContact.list.useQuery({ customerId });

  const deleteMutation = trpc.customerContact.delete.useMutation({
    onSuccess: () => {
      toast.success("Contact deleted");
      utils.customerContact.list.invalidate({ customerId });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete contact "${name}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>
              Manage contacts for this customer
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => { setEditingContact(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </CardHeader>
        <CardContent>
          {!contacts || contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <User className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium">No contacts yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add the first contact for this customer.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.email ? (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {contact.email}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {contact.phone}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={ROLE_BADGE_VARIANT[contact.role] ?? "secondary"}
                          size="sm"
                        >
                          {ROLE_LABELS[contact.role] ?? contact.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contact.isPrimary && (
                          <Badge variant="warning" size="sm">
                            <Star className="mr-1 h-3 w-3" />
                            Primary
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingContact(contact);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(contact.id, contact.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customerId={customerId}
        contact={editingContact}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Projects Tab
// ---------------------------------------------------------------------------

function ProjectsTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = trpc.project.list.useQuery({ customerId });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const projects = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>
          Projects associated with this customer
        </CardDescription>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-medium text-muted-foreground">
              No projects found for this customer.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((row) => {
                  const project = "projects" in row ? (row as Record<string, unknown>).projects as Record<string, unknown> : row as Record<string, unknown>;
                  const id = project.id as string;
                  const name = (project.name as string) ?? "—";
                  const status = (project.status as string) ?? "active";
                  const startDate = project.startDate as string | null;
                  const endDate = project.endDate as string | null;
                  const createdAt = project.createdAt as string | null;

                  const statusVariant: Record<string, "success" | "info" | "secondary"> = {
                    active: "success",
                    completed: "info",
                    cancelled: "secondary",
                  };

                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[status] ?? "secondary"}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {startDate ? new Date(startDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {endDate ? new Date(endDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Orders Tab
// ---------------------------------------------------------------------------

function OrdersTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = trpc.order.list.useQuery({ customerId });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const orders = data?.items ?? [];

  const statusVariant: Record<string, "success" | "info" | "secondary"> = {
    active: "info",
    completed: "success",
    cancelled: "secondary",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
        <CardDescription>Orders placed by this customer</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-medium text-muted-foreground">
              No orders found for this customer.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Qty Ordered</TableHead>
                  <TableHead className="text-right">Qty Delivered</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((row) => {
                  const order = "orders" in row ? (row as Record<string, unknown>).orders as Record<string, unknown> : row as Record<string, unknown>;
                  const id = order.id as string;
                  const orderNumber = (order.orderNumber as string) ?? "—";
                  const status = (order.status as string) ?? "active";
                  const qtyOrdered = order.quantityOrdered as string | number | null;
                  const qtyDelivered = order.quantityDelivered as string | number | null;
                  const createdAt = order.createdAt as string | null;

                  return (
                    <TableRow key={id}>
                      <TableCell className="font-mono font-semibold">
                        <Link
                          href={`/orders/${id}`}
                          className="hover:underline"
                        >
                          {orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[status] ?? "secondary"}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {qtyOrdered ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {qtyDelivered ?? 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Invoices Tab
// ---------------------------------------------------------------------------

function InvoicesTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = trpc.invoice.list.useQuery({ customerId });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const invoices = data?.items ?? [];

  const statusVariant: Record<string, "secondary" | "info" | "success" | "error" | "outline"> = {
    draft: "secondary",
    sent: "info",
    paid: "success",
    overdue: "error",
    void: "outline",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>Invoices for this customer</CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-medium text-muted-foreground">
              No invoices found for this customer.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((row) => {
                  const invoice = "invoices" in row ? (row as Record<string, unknown>).invoices as Record<string, unknown> : row as Record<string, unknown>;
                  const id = invoice.id as string;
                  const invoiceNumber = (invoice.invoiceNumber as string) ?? "—";
                  const status = (invoice.status as string) ?? "draft";
                  const total = invoice.total as string | number | null;
                  const dueDate = invoice.dueDate as string | null;
                  const paidAt = invoice.paidAt as string | null;

                  return (
                    <TableRow key={id}>
                      <TableCell className="font-mono font-semibold">
                        {invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[status] ?? "secondary"}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dueDate ? new Date(dueDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {paidAt ? new Date(paidAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({
  customer,
  customerId,
}: {
  customer: {
    name: string;
    legalName: string | null;
    contactName: string;
    contactEmail: string | null;
    contactPhone: string;
    billingAddress: string;
    billingCity: string | null;
    billingState: string | null;
    billingZip: string | null;
    creditTerms: string | null;
    creditLimit: string | null;
    notes: string | null;
  };
  customerId: string;
}) {
  const utils = trpc.useUtils();
  const { data: companiesData } = trpc.company.list.useQuery({ limit: 100 });

  const [form, setForm] = useState<FormData>({
    name: "",
    legalName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    creditTerms: "net_30",
    creditLimit: "",
    notes: "",
    companyId: "",
  });

  useEffect(() => {
    setForm({
      name: customer.name ?? "",
      legalName: customer.legalName ?? "",
      contactName: customer.contactName ?? "",
      contactEmail: customer.contactEmail ?? "",
      contactPhone: customer.contactPhone ?? "",
      billingAddress: customer.billingAddress ?? "",
      billingCity: customer.billingCity ?? "",
      billingState: customer.billingState ?? "",
      billingZip: customer.billingZip ?? "",
      creditTerms: customer.creditTerms ?? "net_30",
      creditLimit: customer.creditLimit ?? "",
      notes: customer.notes ?? "",
      companyId: (customer as any).linkedCompanyId ?? "",
    });
  }, [customer]);

  const updateMutation = trpc.customer.update.useMutation({
    onSuccess: () => {
      toast.success("Customer updated successfully");
      utils.customer.getById.invalidate({ id: customerId });
      utils.customer.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: customerId,
      data: {
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
        companyId: form.companyId || undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
          <CardDescription>Basic details and primary contact</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Account Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Smith Construction"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input
                id="legalName"
                placeholder="Legal entity name"
                value={form.legalName}
                onChange={(e) => update("legalName", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Parent Company</Label>
            <Select
              value={form.companyId || "none"}
              onValueChange={(v) => update("companyId", v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Company</SelectItem>
                {companiesData?.items.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="contactName">
              Contact Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contactName"
              placeholder="Primary contact"
              value={form.contactName}
              onChange={(e) => update("contactName", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="email@example.com"
                value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contactPhone"
                placeholder="(555) 000-0000"
                value={form.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Info */}
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Address and credit terms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billingAddress">
              Billing Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="billingAddress"
              placeholder="Street address"
              value={form.billingAddress}
              onChange={(e) => update("billingAddress", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billingCity">City</Label>
              <Input
                id="billingCity"
                placeholder="City"
                value={form.billingCity}
                onChange={(e) => update("billingCity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingState">State</Label>
              <Input
                id="billingState"
                placeholder="State"
                value={form.billingState}
                onChange={(e) => update("billingState", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingZip">ZIP</Label>
              <Input
                id="billingZip"
                placeholder="ZIP Code"
                value={form.billingZip}
                onChange={(e) => update("billingZip", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creditTerms">Credit Terms</Label>
              <Select
                value={form.creditTerms}
                onValueChange={(v) => update("creditTerms", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select credit terms" />
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
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit</Label>
              <Input
                id="creditLimit"
                placeholder="e.g. 50000"
                value={form.creditLimit}
                onChange={(e) => update("creditLimit", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="notes"
            placeholder="Additional notes about this customer..."
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
          />
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Link href="/customers">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Linked Contacts Tab (via junction table)
// ---------------------------------------------------------------------------

function LinkedContactsTab({ customerId }: { customerId: string }) {
  const { data: contacts, isLoading } = trpc.contact.getByAccount.useQuery({ customerId });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Contacts</CardTitle>
        <CardDescription>
          CRM contacts linked to this account via the company
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!contacts || contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <User className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">No linked contacts</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Link contacts from the contact detail page.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Primary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      <Link href={`/contacts/${contact.id}`} className="hover:underline">
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {contact.email}
                        </span>
                      ) : "\u2014"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {contact.phone}
                        </span>
                      ) : "\u2014"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={CONTACT_ROLE_BADGE_VARIANT[contact.role as ContactRole] ?? "secondary"}
                        size="sm"
                      >
                        {CONTACT_ROLE_LABELS[contact.role as ContactRole] ?? contact.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {contact.isPrimaryForAccount && (
                        <Badge variant="warning" size="sm">
                          <Star className="mr-1 h-3 w-3" />
                          Primary
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: customer, isLoading, error } = trpc.customer.getById.useQuery({ id });

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-lg border bg-muted" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Customer</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">
            Customer not found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
          <Link href="/customers" className="mt-4">
            <Button variant="outline">Back to Customers</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {customer.name}
              </h1>
              <Badge variant={customer.isActive ? "success" : "secondary"}>
                {customer.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {customer.legalName && (
                <span className="mr-3">{customer.legalName}</span>
              )}
              {(customer as any).companyName && (
                <Link
                  href={`/companies/${(customer as any).linkedCompanyId}`}
                  className="mr-3 inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {(customer as any).companyName}
                </Link>
              )}
              Customer since{" "}
              {customer.createdAt
                ? new Date(customer.createdAt).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="linked-contacts">Linked Contacts</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab customer={customer} customerId={id} />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <ContactsTab customerId={id} />
        </TabsContent>

        <TabsContent value="linked-contacts" className="mt-4">
          <LinkedContactsTab customerId={id} />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <ProjectsTab customerId={id} />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <OrdersTab customerId={id} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab customerId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
