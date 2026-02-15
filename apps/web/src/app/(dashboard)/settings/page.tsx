"use client";

import Link from "next/link";
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Separator,
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
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@aggregateos/ui";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Hash,
  Plug,
  Shield,
  Users,
  ScrollText,
  Activity,
  ArrowRight,
  Info,
  CreditCard,
  MessageSquare,
  Mail,
  MapPin,
} from "lucide-react";
import {
  USER_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  type UserRole,
  type UserPermissions,
} from "@aggregateos/shared";

// ── Canonical (non-legacy) roles for the permissions matrix ────────────────
const CANONICAL_ROLES: UserRole[] = [
  "super_admin",
  "ops_manager",
  "dispatcher",
  "estimator",
  "accounting",
  "customer_user",
  "driver_user",
];

// ── Permission column definitions ──────────────────────────────────────────
const PERMISSION_COLUMNS: { key: keyof UserPermissions; label: string; shortLabel: string }[] = [
  { key: "canManageEntities", label: "Manage Entities", shortLabel: "Entities" },
  { key: "canManageUsers", label: "Manage Users", shortLabel: "Users" },
  { key: "canViewAllEntities", label: "View All Entities", shortLabel: "View All" },
  { key: "canDispatch", label: "Dispatch", shortLabel: "Dispatch" },
  { key: "canDrive", label: "Drive", shortLabel: "Drive" },
  { key: "canViewFinancials", label: "View Financials", shortLabel: "Financials" },
  { key: "canManageRates", label: "Manage Rates", shortLabel: "Rates" },
  { key: "canApproveTickets", label: "Approve Tickets", shortLabel: "Tickets" },
  { key: "canGenerateInvoices", label: "Generate Invoices", shortLabel: "Invoices" },
  { key: "canViewCustomerPortal", label: "View Customer Portal", shortLabel: "Portal" },
  { key: "canCreateEstimates", label: "Create Estimates", shortLabel: "Estimates" },
];

// ── Numbering schemes ──────────────────────────────────────────────────────
const NUMBERING_SCHEMES = [
  { entity: "Load", prefix: "LD", format: "LD-XXXXXX", description: "Auto-incrementing 6-digit load numbers" },
  { entity: "Order", prefix: "ORD", format: "ORD-XXXXXX", description: "Auto-incrementing 6-digit order numbers" },
  { entity: "Invoice", prefix: "INV", format: "INV-XXXXXX", description: "Auto-incrementing 6-digit invoice numbers" },
  { entity: "Estimate", prefix: "EST", format: "EST-XXXXXX", description: "Auto-incrementing 6-digit estimate numbers" },
];

// ── Integration definitions ────────────────────────────────────────────────
const INTEGRATIONS = [
  {
    name: "QuickBooks Online",
    description: "Accounting sync — invoices, payments, and chart of accounts",
    status: "not_connected" as const,
    icon: CreditCard,
  },
  {
    name: "Twilio SMS",
    description: "SMS notifications for dispatch alerts and driver updates",
    status: "not_connected" as const,
    icon: MessageSquare,
  },
  {
    name: "Resend Email",
    description: "Transactional email delivery for invoices and notifications",
    status: "not_connected" as const,
    icon: Mail,
  },
  {
    name: "Google Maps",
    description: "Route optimization, geocoding, and distance calculations",
    status: "not_connected" as const,
    icon: MapPin,
  },
];

// ── Quick-link definitions ─────────────────────────────────────────────────
const QUICK_LINKS = [
  {
    href: "/settings/users",
    icon: Users,
    title: "User Management",
    description: "Manage users, roles, and invitations",
  },
  {
    href: "/settings/audit-log",
    icon: ScrollText,
    title: "Audit Log",
    description: "View system activity history",
  },
  {
    href: "/settings/system",
    icon: Activity,
    title: "System Health",
    description: "Monitor status and uptime",
  },
];

// ── Role badge color helper ────────────────────────────────────────────────
function roleBadgeVariant(role: UserRole): "error" | "purple" | "info" | "success" | "warning" | "secondary" {
  const map: Partial<Record<UserRole, "error" | "purple" | "info" | "success" | "warning">> = {
    super_admin: "error",
    ops_manager: "purple",
    dispatcher: "info",
    estimator: "warning",
    accounting: "success",
    customer_user: "secondary" as any,
    driver_user: "success",
  };
  return map[role] ?? "secondary";
}

// ═══════════════════════════════════════════════════════════════════════════
// Settings Page
// ═══════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* ── Page Header ────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your organization configuration, roles, numbering, and integrations
          </p>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <Tabs defaultValue="company">
          <TabsList>
            <TabsTrigger value="company">
              <Building2 className="mr-2 h-4 w-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Shield className="mr-2 h-4 w-4" />
              Roles &amp; Permissions
            </TabsTrigger>
            <TabsTrigger value="numbering">
              <Hash className="mr-2 h-4 w-4" />
              Numbering
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Plug className="mr-2 h-4 w-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* ──────────────────────────────────────────────────────────
              Tab 1: Company Profile
          ────────────────────────────────────────────────────────── */}
          <TabsContent value="company" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>
                  Your organization details — contact an admin to make changes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Company Name</Label>
                  <Input
                    id="orgName"
                    defaultValue="Ryland Logistics"
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="orgType">Organization Type</Label>
                    <Input
                      id="orgType"
                      defaultValue="LLC"
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgId">Organization ID</Label>
                    <Input
                      id="orgId"
                      defaultValue="ORG-000001"
                      readOnly
                      className="bg-muted font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Company profile details are managed by your platform administrator.
                    Contact support if you need to update your organization information.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Separator />
            <div>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Links
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {QUICK_LINKS.map((link) => {
                  const IconComp = link.icon;
                  return (
                    <Link key={link.href} href={link.href}>
                      <Card className="group cursor-pointer transition-colors hover:bg-muted/50">
                        <CardContent className="flex items-center gap-3 pt-6">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 transition-colors group-hover:bg-zinc-200">
                            <IconComp className="h-5 w-5 text-zinc-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{link.title}</p>
                            <p className="text-xs text-muted-foreground">{link.description}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ──────────────────────────────────────────────────────────
              Tab 2: Role Permissions Matrix
          ────────────────────────────────────────────────────────── */}
          <TabsContent value="roles" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role Permissions Matrix
                </CardTitle>
                <CardDescription>
                  A read-only overview of what each role can do across the platform.
                  Hover over column headers for full permission names.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 z-10 bg-background min-w-[180px]">
                          Role
                        </TableHead>
                        {PERMISSION_COLUMNS.map((col) => (
                          <TableHead key={col.key} className="text-center min-w-[80px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help text-xs">
                                  {col.shortLabel}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>{col.label}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {CANONICAL_ROLES.map((role) => {
                        const perms = ROLE_PERMISSIONS[role];
                        return (
                          <TableRow key={role}>
                            <TableCell className="sticky left-0 z-10 bg-background">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant={roleBadgeVariant(role)} size="sm">
                                    {ROLE_LABELS[role]}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground leading-tight max-w-[200px]">
                                  {ROLE_DESCRIPTIONS[role]}
                                </span>
                              </div>
                            </TableCell>
                            {PERMISSION_COLUMNS.map((col) => (
                              <TableCell key={col.key} className="text-center">
                                {perms[col.key] ? (
                                  <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="mx-auto h-5 w-5 text-zinc-300" />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Role permissions are system-defined and cannot be edited from this page.
                Custom role configuration is planned for a future release.
              </span>
            </div>
          </TabsContent>

          {/* ──────────────────────────────────────────────────────────
              Tab 3: Numbering Schemes
          ────────────────────────────────────────────────────────── */}
          <TabsContent value="numbering" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Numbering Schemes
                </CardTitle>
                <CardDescription>
                  Auto-generated number formats used across the system for loads, orders, invoices, and estimates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {NUMBERING_SCHEMES.map((scheme) => (
                    <div
                      key={scheme.entity}
                      className="flex items-center gap-4 rounded-lg border p-4"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                        <span className="text-sm font-bold text-zinc-600 font-mono">
                          {scheme.prefix}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{scheme.entity}</p>
                        <p className="text-sm text-muted-foreground">{scheme.description}</p>
                        <p className="mt-1 font-mono text-xs text-zinc-500">
                          Format: <span className="font-semibold">{scheme.format}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Numbering schemes are currently fixed. Custom prefix and sequence configuration
                is coming in <strong>Phase 2</strong>.
              </span>
            </div>
          </TabsContent>

          {/* ──────────────────────────────────────────────────────────
              Tab 4: Integrations
          ────────────────────────────────────────────────────────── */}
          <TabsContent value="integrations" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {INTEGRATIONS.map((integration) => {
                const IconComp = integration.icon;
                return (
                  <Card key={integration.name}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                            <IconComp className="h-5 w-5 text-zinc-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{integration.name}</CardTitle>
                          </div>
                        </div>
                        <Badge variant="secondary">Not Connected</Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {integration.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                        <span>Configuration available after initial setup</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Integration setup requires API keys and credentials.
                Contact your platform admin to configure third-party connections.
              </span>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
