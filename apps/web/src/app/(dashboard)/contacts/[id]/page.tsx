"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Button,
  Input,
  Label,
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
  User,
  Bot,
  Plus,
  Trash2,
  Building2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CONTACT_ROLE_LABELS,
  CONTACT_ROLE_BADGE_VARIANT,
  CONTACT_EVENT_LABELS,
  type ContactRole,
  type ContactEventType,
} from "@aggregateos/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  department: string;
  companyId: string;
};

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({
  contact,
  contactId,
}: {
  contact: any;
  contactId: string;
}) {
  const utils = trpc.useUtils();
  const { data: companiesData } = trpc.company.list.useQuery({ limit: 100 });

  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    title: "",
    department: "",
    companyId: "",
  });

  useEffect(() => {
    setForm({
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      title: contact.title ?? "",
      department: contact.department ?? "",
      companyId: contact.companyId ?? "",
    });
  }, [contact]);

  const updateMutation = trpc.contact.update.useMutation({
    onSuccess: () => {
      toast.success("Contact updated");
      utils.contact.getById.invalidate({ id: contactId });
      utils.contact.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: contactId,
      data: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        title: form.title || undefined,
        department: form.department || undefined,
        companyId: form.companyId || undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={form.department}
                onChange={(e) => update("department", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Company</Label>
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
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Link href="/contacts">
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
// Accounts Tab
// ---------------------------------------------------------------------------

function AccountsTab({ contactId }: { contactId: string }) {
  const utils = trpc.useUtils();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const { data: accounts, isLoading } = trpc.contact.getAccounts.useQuery({ contactId });

  const unlinkMutation = trpc.contact.unlinkFromAccount.useMutation({
    onSuccess: () => {
      toast.success("Account unlinked");
      utils.contact.getAccounts.invalidate({ contactId });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUnlink = (customerId: string, name: string) => {
    if (window.confirm(`Unlink contact from "${name}"?`)) {
      unlinkMutation.mutate({ contactId, customerId });
    }
  };

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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Linked Accounts</CardTitle>
            <CardDescription>Customer accounts this contact is linked to</CardDescription>
          </div>
          <Button size="sm" onClick={() => setLinkDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Link Account
          </Button>
        </CardHeader>
        <CardContent>
          {!accounts || accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium">No linked accounts</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Link this contact to customer accounts.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acct) => (
                    <TableRow key={acct.id}>
                      <TableCell className="font-medium">
                        <Link href={`/customers/${acct.customerId}`} className="hover:underline">
                          {acct.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={CONTACT_ROLE_BADGE_VARIANT[acct.role as ContactRole] ?? "secondary"}
                          size="sm"
                        >
                          {CONTACT_ROLE_LABELS[acct.role as ContactRole] ?? acct.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {acct.isPrimary && (
                          <Badge variant="warning" size="sm">Primary</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleUnlink(acct.customerId, acct.customerName)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <LinkAccountDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        contactId={contactId}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Link Account Dialog
// ---------------------------------------------------------------------------

function LinkAccountDialog({
  open,
  onOpenChange,
  contactId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
}) {
  const utils = trpc.useUtils();
  const [customerId, setCustomerId] = useState("");
  const [role, setRole] = useState("other");
  const [isPrimary, setIsPrimary] = useState(false);

  const { data: customersData } = trpc.customer.list.useQuery({ limit: 100 });

  const linkMutation = trpc.contact.linkToAccount.useMutation({
    onSuccess: () => {
      toast.success("Account linked");
      utils.contact.getAccounts.invalidate({ contactId });
      onOpenChange(false);
      setCustomerId("");
      setRole("other");
      setIsPrimary(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!customerId) {
      toast.error("Select an account");
      return;
    }
    linkMutation.mutate({
      contactId,
      customerId,
      role: role as any,
      isPrimary,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link to Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Account <span className="text-red-500">*</span></Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {customersData?.items.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ap">Accounts Payable</SelectItem>
                <SelectItem value="pm">Project Manager</SelectItem>
                <SelectItem value="dispatch">Dispatch</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="site_contact">Site Contact</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isPrimary" className="cursor-pointer">Primary Contact</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={linkMutation.isPending}>
            {linkMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking...
              </>
            ) : "Link Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Activity Tab
// ---------------------------------------------------------------------------

const ACTOR_ICONS: Record<string, typeof User> = {
  user: User,
  system: Bot,
};

function ActivityTab({ contactId }: { contactId: string }) {
  const { data: events, isLoading } = trpc.contact.getHistory.useQuery({ contactId });

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
        <CardDescription>History of events for this contact</CardDescription>
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
                      {CONTACT_EVENT_LABELS[event.eventType as ContactEventType] ?? event.eventType}
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

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: contact, isLoading, error } = trpc.contact.getById.useQuery({ id });

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
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Contact</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/50 bg-destructive/5 py-16">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="mt-4 text-lg font-medium text-destructive">Contact not found</p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
          <Link href="/contacts" className="mt-4">
            <Button variant="outline">Back to Contacts</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!contact) return null;

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
              <Badge variant={contact.isActive ? "success" : "secondary"}>
                {contact.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {contact.title && <span className="mr-3">{contact.title}</span>}
              {contact.companyName && (
                <Link
                  href={`/companies/${contact.companyId}`}
                  className="text-primary hover:underline"
                >
                  {contact.companyName}
                </Link>
              )}
              {!contact.companyName && !contact.title && (
                <span>Created {formatDate(contact.createdAt)}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab contact={contact} contactId={id} />
        </TabsContent>
        <TabsContent value="accounts" className="mt-4">
          <AccountsTab contactId={id} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab contactId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
