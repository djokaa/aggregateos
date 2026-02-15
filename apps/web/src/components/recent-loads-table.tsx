"use client";

import { trpc } from "@/lib/trpc";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@aggregateos/ui";
import { LOAD_STATUS_LABELS, LOAD_STATUS_VARIANT } from "@aggregateos/shared";
import type { LoadStatus } from "@aggregateos/shared";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function RecentLoadsTable() {
  const { data, isLoading, error } = trpc.load.list.useQuery(
    { limit: 10, page: 1 },
    { refetchInterval: 30_000, retry: false }
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="mb-3 h-10 animate-pulse rounded bg-zinc-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.items?.length) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
        <p className="text-sm text-zinc-500">
          {error
            ? "Unable to load recent loads. Connect a database to get started."
            : "No loads yet. Create your first order to see loads here."}
        </p>
        <Link
          href="/loads"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Go to Loads <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Load #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((load) => {
            const status = load.status as LoadStatus;
            return (
              <TableRow key={load.id}>
                <TableCell className="font-medium">
                  {load.loadNumber}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={LOAD_STATUS_VARIANT[status] ?? "secondary"}
                  >
                    {LOAD_STATUS_LABELS[status] ?? load.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-zinc-500">
                  {load.driverId
                    ? load.driverId.slice(0, 8) + "..."
                    : "Unassigned"}
                </TableCell>
                <TableCell className="text-zinc-500">
                  {load.createdAt
                    ? new Date(load.createdAt).toLocaleDateString()
                    : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="border-t border-zinc-200 p-3 text-center">
        <Link
          href="/loads"
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          View all loads <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
