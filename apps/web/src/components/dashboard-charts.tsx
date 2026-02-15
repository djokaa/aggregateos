"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { trpc } from "@/lib/trpc";

const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "12px",
};

/** Weekly load volume – dispatched vs delivered over the last 7 days. */
export function LoadVolumeChart() {
  const { data, isLoading } = trpc.dashboard.weeklyLoads.useQuery(undefined, {
    retry: false,
  });

  const chartData = data ?? [];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-900">
        Weekly Load Volume
      </h3>
      {isLoading ? (
        <div className="flex h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        </div>
      ) : chartData.length === 0 || chartData.every((d) => d.loads === 0) ? (
        <div className="flex h-[240px] items-center justify-center text-sm text-zinc-400">
          No load data for the past week
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barGap={4}>
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
            <Bar
              dataKey="loads"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              name="Dispatched"
            />
            <Bar
              dataKey="delivered"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              name="Delivered"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** Material distribution – pie chart showing % of loads by material type. */
export function MaterialDistributionChart() {
  const { data, isLoading } = trpc.dashboard.materialDistribution.useQuery(
    undefined,
    { retry: false },
  );

  const chartData = data ?? [];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-900">
        Material Distribution
      </h3>
      {isLoading ? (
        <div className="flex h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center text-sm text-zinc-400">
          No material data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [`${value}%`, ""]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
