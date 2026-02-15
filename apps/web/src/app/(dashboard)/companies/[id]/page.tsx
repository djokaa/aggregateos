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
} from "@aggregateos/ui";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  User,
  Bot,
  Mail,
  Phone,
  Building2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  COMPANY_TYPE_LABELS,
  COMPANY_TYPE_BADGE_VARIANT,
  COMPANY_EVENT_LABELS,
  CONTACT_ROLE_LABELS,
  CONTACT_ROLE_BADGE_VARIANT,
  type CompanyType,
  type CompanyEventType,
  type ContactRole,
} from "@aggregateos/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type FormData = {
  name: string;
  legalName: string;
  type: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
};

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({
  company,
  companyId,
}: {
  company: any;
  companyId: string;
}) {
  const utils = trpc.useUtils();

  const [form, setForm] = useState<FormData>({
    name: "",
    legalName: "",
    type: "customer",
    industry: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  useEffect(() => {
    setForm({
      name: company.name ?? "",
      legalName: company.legalName ?? "",
      type: company.type ?? "customer",
      industry: company.industry ?? "",
      website: company.website ?? "",
      phone: company.phone ?? "",
      email: company.email ?? "",
      address: company.address ?? "",
      city: company.city ?? "",
      state: company.state ?? "",
      zip: company.zip ?? "",
      notes: company.notes ?? "",
    });
  }, [company]);

  const updateMutation = trpc.company.update.useMutation({
    onSuccess: () => {
      toast.success("Company updated");
      utils.company.getById.invalidate({ id: companyId });
      utils.company.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: companyId,
      data: {
        name: form.name,
        legalName: form.legalName || undefined,
        type: form.type as CompanyType,
        industry: form.industry || undefined,
        website: form.website || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zip: form.zip || undefined,
        notes: form.notes || undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Basic details about the company</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Legal Name</Label>
              <Input
                value={form.legalName}
                onChange={(e) => update("legalName", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="broker">Broker</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Street Address</Label>
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
            placeholder="Internal notes about this company..."
          />
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Link href="/companies">
            <Button variant="outline" type="button">Cancel</Button>
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
// Contacts Tab
// ---------------------------------------------------------------------------

function ContactsTab({ companyId }: { companyId: string }) {
  const { data: contacts, isLoading } = trpc.company.getContacts.useQuery({ companyId });

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
        <CardTitle>Contacts</CardTitle>
        <CardDescription>People associated with this company</CardDescription>
      </CardHeader>
      <CardContent>
        {!contacts || contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <User className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">No contacts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create contacts and link them to this company.
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
                  <TableHead>Title</TableHead>
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
                    <TableCell className="text-muted-foreground">
                      {contact.title || "\u2014"}
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
// Accounts Tab
// ---------------------------------------------------------------------------

function AccountsTab({ companyId }: { companyId: string }) {
  const { data: accounts, isLoading } = trpc.company.getAccounts.useQuery({ companyId });

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
        <CardTitle>Accounts</CardTitle>
        <CardDescription>Customer accounts linked to this company</CardDescription>
      </CardHeader>
      <CardContent>
        {!accounts || accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">No accounts linked</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Link customer accounts to this company from the account detail page.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Primary Contact</TableHead>
                  <TableHead>Credit Terms</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      <Link href={`/customers/${account.id}`} className="hover:underline">
                        {account.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.contactName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {account.creditTerms ?? "Net 30"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? "success" : "secondary"} size="sm">
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
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
// Projects Tab
// ---------------------------------------------------------------------------

function ProjectsTab({ companyId }: { companyId: string }) {
  const { data: projects, isLoading } = trpc.company.getProjects.useQuery({ companyId });

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
        <CardTitle>Projects</CardTitle>
        <CardDescription>Projects across all accounts</CardDescription>
      </CardHeader>
      <CardContent>
        {!projects || projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-medium text-muted-foreground">No projects found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project: any) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>
                      <Badge variant={project.status === "active" ? "success" : "secondary"} size="sm">
                        {(project.status as string)?.charAt(0).toUpperCase() + (project.status as string)?.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(project.createdAt)}
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
// Orders Tab
// ---------------------------------------------------------------------------

function OrdersTab({ companyId }: { companyId: string }) {
  const { data: orders, isLoading } = trpc.company.getOrders.useQuery({ companyId });

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
        <CardTitle>Orders</CardTitle>
        <CardDescription>Orders across all accounts</CardDescription>
      </CardHeader>
      <CardContent>
        {!orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-medium text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Qty Ordered</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-semibold">
                      <Link href={`/orders/${order.id}`} className="hover:underline">
                        {order.orderNumber ?? "\u2014"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.status === "active" ? "info" : "secondary"} size="sm">
                        {(order.status as string)?.charAt(0).toUpperCase() + (order.status as string)?.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {order.quantityOrdered ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.createdAt)}
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
// Invoices Tab
// ---------------------------------------------------------------------------

function InvoicesTab({ companyId }: { companyId: string }) {
  const { data: invoices, isLoading } = trpc.company.getInvoices.useQuery({ companyId });

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
        <CardDescription>Invoices across all accounts</CardDescription>
      </CardHeader>
      <CardContent>
        {!invoices || invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-medium text-muted-foreground">No invoices found</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-semibold">
                      {invoice.invoiceNumber ?? "\u2014"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[invoice.status] ?? "secondary"} size="sm">
                        {(invoice.status as string)?.charAt(0).toUpperCase() + (invoice.status as string)?.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.dueDate)}
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
// Activity Tab
// ---------------------------------------------------------------------------

const ACTOR_ICONS: Record<string, typeof User> = {
  user: User,
  system: Bot,
};

function ActivityTab({ companyId }: { companyId: string }) {
  const { data: events, isLoading } = trpc.company.getHistory.useQuery({ companyId });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
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
        <CardTitle>Activity</CardTitle>
        <CardDescription>History of events for this company</CardDescription>
      </CardHeader>
      <CardContent>
        {!events || events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const ActorIcon = ACTOR_ICONS[event.actorType] ?? User;
              return (
                <div key={event.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <ActorIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{event.actorLabel}</span>
                      {" \u2014 "}
                      {COMPANY_EVENT_LABELS[event.eventType as CompanyEventType] ?? event.eventType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: company, isLoading, error } = trpc.company.getById.useQuery({ id });

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

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/companies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Company</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">Company not found</p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
          <Link href="/companies" className="mt-4">
            <Button variant="outline">Back to Companies</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/companies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
              <Badge
                variant={COMPANY_TYPE_BADGE_VARIANT[company.type as CompanyType] ?? "secondary"}
              >
                {COMPANY_TYPE_LABELS[company.type as CompanyType] ?? company.type}
              </Badge>
              <Badge variant={company.isActive ? "success" : "secondary"}>
                {company.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {company.legalName && <span className="mr-3">{company.legalName}</span>}
              Created {formatDate(company.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab company={company} companyId={id} />
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <ContactsTab companyId={id} />
        </TabsContent>
        <TabsContent value="accounts" className="mt-4">
          <AccountsTab companyId={id} />
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          <ProjectsTab companyId={id} />
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <OrdersTab companyId={id} />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab companyId={id} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab companyId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
