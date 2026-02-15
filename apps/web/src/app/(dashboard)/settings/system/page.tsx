"use client";

import Link from "next/link";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Separator,
} from "@aggregateos/ui";
import {
  ArrowLeft,
  Activity,
  Database,
  Globe,
  Bell,
  ScanLine,
  CheckCircle,
  AlertTriangle,
  Server,
  Cpu,
  HardDrive,
  Zap,
} from "lucide-react";

// --- Mock Data ---

interface StatusCard {
  name: string;
  status: "operational" | "degraded" | "down";
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const systemStatuses: StatusCard[] = [
  { name: "API", status: "operational", icon: Globe, description: "REST & tRPC endpoints" },
  { name: "Database", status: "operational", icon: Database, description: "PostgreSQL primary" },
  { name: "OCR Pipeline", status: "degraded", icon: ScanLine, description: "Ticket processing" },
  { name: "Notifications", status: "operational", icon: Bell, description: "Email & SMS delivery" },
];

const statusBadge: Record<string, { label: string; variant: "success" | "warning" | "error" }> = {
  operational: { label: "Operational", variant: "success" },
  degraded: { label: "Degraded", variant: "warning" },
  down: { label: "Down", variant: "error" },
};

// 30 days uptime - all green except day 22 is amber
const uptimeDays = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  status: i === 21 ? "degraded" : "up" as "up" | "degraded" | "down",
}));

interface Integration {
  name: string;
  status: "connected" | "error" | "configured";
  lastCheck: string;
  responseTime: string;
}

const integrations: Integration[] = [
  { name: "Clerk Auth", status: "connected", lastCheck: "1 min ago", responseTime: "45ms" },
  { name: "PostgreSQL", status: "connected", lastCheck: "30s ago", responseTime: "12ms" },
  { name: "Google Maps", status: "connected", lastCheck: "5 min ago", responseTime: "120ms" },
  { name: "Twilio", status: "connected", lastCheck: "2 min ago", responseTime: "89ms" },
  { name: "QuickBooks", status: "connected", lastCheck: "10 min ago", responseTime: "230ms" },
];

const systemInfo = [
  { label: "Environment", value: "Production" },
  { label: "Version", value: "0.1.0" },
  { label: "Region", value: "us-east-1" },
  { label: "Node Version", value: "v20.11.0" },
  { label: "Database Size", value: "2.4 GB" },
  { label: "Active Connections", value: "14" },
];

const uptimeColor: Record<string, string> = {
  up: "bg-green-500",
  degraded: "bg-amber-500",
  down: "bg-red-500",
};

export default function SystemPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
          <p className="text-sm text-muted-foreground">
            Monitor system status, uptime, and integration health
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {systemStatuses.map((item) => {
          const IconComp = item.icon;
          const badge = statusBadge[item.status];
          return (
            <Card key={item.name}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                      <IconComp className="h-5 w-5 text-zinc-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Uptime Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Uptime &mdash; Last 30 Days
          </CardTitle>
          <CardDescription>
            99.7% uptime over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1">
            {uptimeDays.map((day) => (
              <div
                key={day.day}
                className={`h-8 flex-1 rounded-sm ${uptimeColor[day.status]} transition-colors`}
                title={`Day ${day.day}: ${day.status === "up" ? "Operational" : day.status === "degraded" ? "Degraded" : "Down"}`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>30 days ago</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
                Operational
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />
                Degraded
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
                Down
              </span>
            </div>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Integration Status
          </CardTitle>
          <CardDescription>
            Health check results for connected services
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Integration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Check</TableHead>
                <TableHead>Response Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.map((integration) => (
                <TableRow key={integration.name}>
                  <TableCell className="font-medium">{integration.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm capitalize">{integration.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {integration.lastCheck}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{integration.responseTime}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            System Information
          </CardTitle>
          <CardDescription>
            Current environment and resource details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {systemInfo.map((info) => (
              <div key={info.label} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{info.label}</p>
                <p className="mt-1 font-semibold font-mono text-sm">{info.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
