"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Button,
  Input,
  Badge,
} from "@aggregateos/ui";
import {
  Download,
  TrendingUp,
  Truck,
  DollarSign,
  Users,
  BarChart3,
  CalendarDays,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "12px",
};

// ---------------------------------------------------------------------------
// CSV Export helper
// ---------------------------------------------------------------------------

function exportCSV(filename: string, columns: string[], rows: (string | number)[][]) {
  const header = columns.join(",");
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          // Escape cells that contain commas or quotes
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(","),
    )
    .join("\n");

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${filename}`);
}

// ---------------------------------------------------------------------------
// Loading spinner
// ---------------------------------------------------------------------------

function LoadingState({ height = "h-[300px]" }: { height?: string }) {
  return (
    <div className={`flex ${height} items-center justify-center`}>
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center">
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
            <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section header with export button
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  description,
  onExport,
}: {
  title: string;
  description?: string;
  onExport?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {description && (
          <p className="text-xs text-zinc-500">{description}</p>
        )}
      </div>
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export CSV
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PIE CHART COLORS
// ---------------------------------------------------------------------------

const PIE_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f97316",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  // ── Date range (cosmetic) ──────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } =
    trpc.dashboard.stats.useQuery(undefined, { retry: false });

  const { data: weeklyLoads, isLoading: weeklyLoading } =
    trpc.dashboard.weeklyLoads.useQuery(undefined, { retry: false });

  const { data: materialDist, isLoading: materialLoading } =
    trpc.dashboard.materialDistribution.useQuery(undefined, { retry: false });

  const { data: monthlyRevenue, isLoading: revenueLoading } =
    trpc.dashboard.monthlyRevenue.useQuery(undefined, { retry: false });

  const { data: arAgingRaw, isLoading: agingLoading } =
    trpc.dashboard.arAging.useQuery(undefined, { retry: false });

  const { data: topCustomers, isLoading: customersLoading } =
    trpc.dashboard.topCustomers.useQuery(undefined, { retry: false });

  const { data: routeMargins, isLoading: routesLoading } =
    trpc.dashboard.routeMargins.useQuery(undefined, { retry: false });

  // ── Derived data ───────────────────────────────────────────────────────
  const weeklyData = weeklyLoads ?? [];
  const materialData = materialDist ?? [];
  const revenueData = monthlyRevenue ?? [];
  const agingRows = arAgingRaw ?? [];
  const customers = topCustomers ?? [];
  const routes = routeMargins ?? [];

  // Aggregate AR aging into bucket totals for the horizontal bar chart
  const agingBuckets = useMemo(() => {
    const totals = agingRows.reduce(
      (acc, row) => ({
        current: acc.current + row.current,
        "1-30 Days": acc["1-30 Days"] + row.days30,
        "31-60 Days": acc["31-60 Days"] + row.days60,
        "61-90 Days": acc["61-90 Days"] + row.days90,
        "90+ Days": acc["90+ Days"] + row.days90plus,
      }),
      {
        current: 0,
        "1-30 Days": 0,
        "31-60 Days": 0,
        "61-90 Days": 0,
        "90+ Days": 0,
      },
    );

    return [
      { bucket: "Current", amount: totals.current },
      { bucket: "1-30 Days", amount: totals["1-30 Days"] },
      { bucket: "31-60 Days", amount: totals["31-60 Days"] },
      { bucket: "61-90 Days", amount: totals["61-90 Days"] },
      { bucket: "90+ Days", amount: totals["90+ Days"] },
    ];
  }, [agingRows]);

  // Revenue data with estimated cost/margin for AreaChart
  const revenueChartData = useMemo(
    () =>
      revenueData.map((r) => ({
        month: r.month,
        revenue: r.revenue,
        cost: Math.round(r.revenue * 0.62),
        margin: Math.round(r.revenue * 0.38),
      })),
    [revenueData],
  );

  // Customer chart data
  const customerChartData = useMemo(
    () => customers.slice(0, 8).map((c) => ({ name: c.name, revenue: c.revenue })),
    [customers],
  );

  // ── Export callbacks ───────────────────────────────────────────────────
  const exportWeeklyLoads = useCallback(() => {
    exportCSV(
      `weekly-loads-${startDate}-to-${endDate}.csv`,
      ["Day", "Total Loads", "Delivered"],
      weeklyData.map((d) => [d.day, d.loads, d.delivered]),
    );
  }, [weeklyData, startDate, endDate]);

  const exportMaterialDist = useCallback(() => {
    exportCSV(
      `material-distribution-${startDate}-to-${endDate}.csv`,
      ["Material", "Percentage"],
      materialData.map((d) => [d.name, `${d.value}%`]),
    );
  }, [materialData, startDate, endDate]);

  const exportMonthlyRevenue = useCallback(() => {
    exportCSV(
      `monthly-revenue-${startDate}-to-${endDate}.csv`,
      ["Month", "Revenue", "Est. Cost", "Est. Margin"],
      revenueChartData.map((d) => [d.month, d.revenue, d.cost, d.margin]),
    );
  }, [revenueChartData, startDate, endDate]);

  const exportArAging = useCallback(() => {
    exportCSV(
      `ar-aging-${startDate}-to-${endDate}.csv`,
      ["Customer", "Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total"],
      agingRows.map((r) => [
        r.customer,
        r.current,
        r.days30,
        r.days60,
        r.days90,
        r.days90plus,
        r.current + r.days30 + r.days60 + r.days90 + r.days90plus,
      ]),
    );
  }, [agingRows, startDate, endDate]);

  const exportRouteMargins = useCallback(() => {
    exportCSV(
      `route-margins-${startDate}-to-${endDate}.csv`,
      ["Route", "Loads", "Revenue", "Cost", "Margin %"],
      routes.map((r) => {
        const margin = r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : 0;
        return [`${r.origin} → ${r.destination}`, r.loads, r.revenue, r.cost, margin.toFixed(1)];
      }),
    );
  }, [routes, startDate, endDate]);

  const exportTopCustomers = useCallback(() => {
    exportCSV(
      `top-customers-${startDate}-to-${endDate}.csv`,
      ["Customer", "Revenue"],
      customers.map((c) => [c.name, c.revenue]),
    );
  }, [customers, startDate, endDate]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header + Date range picker ─────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Reports
          </h1>
          <p className="text-sm text-zinc-500">
            Operational, financial, and customer analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 shadow-sm">
            <CalendarDays className="h-4 w-4 text-zinc-400" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-7 w-[130px] border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
            <span className="text-xs text-zinc-400">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-7 w-[130px] border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
          <Badge variant="secondary" size="sm">
            Preview
          </Badge>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="operations">
        <TabsList>
          <TabsTrigger value="operations">
            <Truck className="mr-1.5 h-3.5 w-3.5" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="finance">
            <DollarSign className="mr-1.5 h-3.5 w-3.5" />
            Finance
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Customers
          </TabsTrigger>
        </TabsList>

        {/* ============================================================= */}
        {/* OPERATIONS TAB                                                 */}
        {/* ============================================================= */}
        <TabsContent value="operations" className="space-y-6">
          {/* Stats summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statsLoading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5">
                      <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
                      <div className="mt-3 h-7 w-32 animate-pulse rounded bg-zinc-100" />
                      <div className="mt-2 h-3 w-20 animate-pulse rounded bg-zinc-100" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <StatCard
                  label="Total Loads Today"
                  value={String(stats?.totalLoadsToday ?? 0)}
                  subtitle="Loads created today"
                  icon={Truck}
                  iconBg="bg-blue-100"
                  iconColor="text-blue-600"
                />
                <StatCard
                  label="Active Drivers"
                  value={String(stats?.activeDrivers ?? 0)}
                  subtitle="Currently active"
                  icon={Users}
                  iconBg="bg-green-100"
                  iconColor="text-green-600"
                />
                <StatCard
                  label="Pending Tickets"
                  value={String(stats?.pendingTickets ?? 0)}
                  subtitle="Awaiting review"
                  icon={BarChart3}
                  iconBg="bg-amber-100"
                  iconColor="text-amber-600"
                />
                <StatCard
                  label="Revenue This Month"
                  value={formatCurrency(stats?.totalRevenueThisMonth ?? 0)}
                  subtitle="Paid invoices"
                  icon={DollarSign}
                  iconBg="bg-indigo-100"
                  iconColor="text-indigo-600"
                />
              </>
            )}
          </div>

          {/* Weekly Load Volume Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Weekly Load Volume</CardTitle>
                <CardDescription>
                  Loads created vs delivered over the last 7 days
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportWeeklyLoads}
                disabled={weeklyData.length === 0}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {weeklyLoading ? (
                <LoadingState />
              ) : weeklyData.length === 0 ? (
                <EmptyState message="No load data for the past week" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={weeklyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Bar
                      dataKey="loads"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      name="Total Loads"
                    />
                    <Bar
                      dataKey="delivered"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      name="Delivered"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Material Distribution Pie Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Material Distribution</CardTitle>
                <CardDescription>
                  Load volume breakdown by material type
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportMaterialDist}
                disabled={materialData.length === 0}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {materialLoading ? (
                <LoadingState />
              ) : materialData.length === 0 ? (
                <EmptyState message="No material data available" />
              ) : (
                <div className="flex flex-col items-center gap-6 md:flex-row">
                  <ResponsiveContainer width="100%" height={280} className="max-w-[340px]">
                    <PieChart>
                      <Pie
                        data={materialData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        innerRadius={60}
                        paddingAngle={2}
                        strokeWidth={2}
                        stroke="#fff"
                      >
                        {materialData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={entry.color ?? PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [`${value}%`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3">
                    {materialData.map((m, i) => (
                      <div key={m.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              m.color ?? PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span className="text-sm text-zinc-700">
                          {m.name}{" "}
                          <span className="font-semibold text-zinc-900">
                            {m.value}%
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* FINANCE TAB                                                    */}
        {/* ============================================================= */}
        <TabsContent value="finance" className="space-y-6">
          {/* Monthly Revenue Area Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Monthly Revenue</CardTitle>
                <CardDescription>
                  Revenue, estimated cost, and margin over the last 6 months
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportMonthlyRevenue}
                disabled={revenueChartData.length === 0}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <LoadingState />
              ) : revenueChartData.length === 0 ? (
                <EmptyState message="No invoice data yet — revenue will appear once invoices are created" />
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradMargin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                      }
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [formatCurrency(value), ""]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      fill="url(#gradRevenue)"
                      strokeWidth={2}
                      name="Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="#f59e0b"
                      fill="none"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Est. Cost"
                    />
                    <Area
                      type="monotone"
                      dataKey="margin"
                      stroke="#10b981"
                      fill="url(#gradMargin)"
                      strokeWidth={2}
                      name="Est. Margin"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* AR Aging Horizontal Bar Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">
                  Accounts Receivable Aging
                </CardTitle>
                <CardDescription>
                  Outstanding balances by aging bucket
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportArAging}
                disabled={agingRows.length === 0}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {agingLoading ? (
                <LoadingState />
              ) : agingRows.length === 0 ? (
                <EmptyState message="No outstanding invoices — all caught up!" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={agingBuckets} layout="vertical" barSize={28}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e4e4e7"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="bucket"
                      tick={{ fontSize: 12, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [formatCurrency(value), "Amount"]}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} name="Amount">
                      {agingBuckets.map((entry, index) => {
                        const colors = [
                          "#10b981",
                          "#3b82f6",
                          "#f59e0b",
                          "#f97316",
                          "#ef4444",
                        ];
                        return (
                          <Cell key={entry.bucket} fill={colors[index]} />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Route Margins Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Route Margins</CardTitle>
                <CardDescription>
                  Profitability analysis by origin → destination
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportRouteMargins}
                disabled={routes.length === 0}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {routesLoading ? (
                <LoadingState height="h-[200px]" />
              ) : routes.length === 0 ? (
                <EmptyState message="No route data yet" />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route</TableHead>
                        <TableHead className="text-right">Loads</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routes.map((r) => {
                        const margin = r.revenue - r.cost;
                        const marginPct =
                          r.revenue > 0
                            ? ((r.revenue - r.cost) / r.revenue) * 100
                            : 0;
                        const marginColor =
                          marginPct >= 35
                            ? "text-green-600"
                            : marginPct >= 25
                              ? "text-amber-600"
                              : "text-red-600";

                        return (
                          <TableRow key={`${r.origin}-${r.destination}`}>
                            <TableCell>
                              <span className="text-sm font-medium text-zinc-900">
                                {r.origin}
                              </span>
                              <span className="mx-1.5 text-zinc-400">→</span>
                              <span className="text-sm text-zinc-600">
                                {r.destination}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.loads}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(r.revenue)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(r.cost)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(margin)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-semibold tabular-nums ${marginColor}`}
                            >
                              {formatPercent(marginPct)}
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
        </TabsContent>

        {/* ============================================================= */}
        {/* CUSTOMERS TAB                                                  */}
        {/* ============================================================= */}
        <TabsContent value="customers" className="space-y-6">
          {/* Top Customers Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Top Customers</CardTitle>
                <CardDescription>
                  Ranked by total invoiced revenue
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportTopCustomers}
                disabled={customers.length === 0}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <LoadingState height="h-[200px]" />
              ) : customers.length === 0 ? (
                <EmptyState message="No customer data yet" />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">
                          Share
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const totalRev = customers.reduce(
                          (sum, c) => sum + c.revenue,
                          0,
                        );
                        return customers.map((c, idx) => {
                          const share =
                            totalRev > 0 ? (c.revenue / totalRev) * 100 : 0;
                          return (
                            <TableRow key={c.name}>
                              <TableCell>
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
                                  {idx + 1}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium text-zinc-900">
                                {c.name}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-semibold">
                                {formatCurrency(c.revenue)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-100">
                                    <div
                                      className="h-full rounded-full bg-amber-500"
                                      style={{ width: `${share}%` }}
                                    />
                                  </div>
                                  <span className="w-12 text-right text-xs text-zinc-500">
                                    {formatPercent(share)}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Revenue Bar Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">
                  Customer Revenue Comparison
                </CardTitle>
                <CardDescription>
                  Revenue breakdown across top customers
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportTopCustomers}
                disabled={customerChartData.length === 0}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <LoadingState />
              ) : customerChartData.length === 0 ? (
                <EmptyState message="No customer data available" />
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={customerChartData} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                      }
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Revenue",
                      ]}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      radius={[4, 4, 0, 0]}
                    >
                      {customerChartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
