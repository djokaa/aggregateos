import { DashboardStats } from "@/components/dashboard-stats";
import { DashboardActions } from "@/components/dashboard-actions";
import { RecentLoadsTable } from "@/components/recent-loads-table";
import { LoadVolumeChart, MaterialDistributionChart } from "@/components/dashboard-charts";
import { ActivityFeed } from "@/components/activity-feed";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Overview of your aggregate logistics operations
        </p>
      </div>

      {/* KPI Stats */}
      <DashboardStats />

      {/* Quick Actions */}
      <DashboardActions />

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LoadVolumeChart />
        <MaterialDistributionChart />
      </div>

      {/* Content Row: Recent Loads + Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            Recent Loads
          </h2>
          <RecentLoadsTable />
        </div>
        <div>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
