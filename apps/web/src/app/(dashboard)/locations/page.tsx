"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@aggregateos/ui";
import {
  Plus,
  Search,
  MoreHorizontal,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type LocationType = "quarry" | "job_site" | "plant" | "yard";

const typeLabels: Record<LocationType, string> = {
  quarry: "Quarry",
  job_site: "Job Site",
  plant: "Plant",
  yard: "Yard",
};

const typeBadgeVariant: Record<LocationType, "warning" | "info" | "purple" | "secondary"> = {
  quarry: "warning",
  job_site: "info",
  plant: "purple",
  yard: "secondary",
};

const TAB_TO_TYPE: Record<string, string | undefined> = {
  all: undefined,
  quarry: "quarry",
  job_site: "job_site",
  plant: "plant",
  yard: "yard",
};

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>City/State</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 7 }).map((_, j) => (
                <TableCell key={j}>
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function LocationsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const utils = trpc.useUtils();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const { data, isLoading } = trpc.location.list.useQuery({
    type: TAB_TO_TYPE[activeTab],
    search: debouncedSearch || undefined,
    page,
    limit,
  });

  const deleteMutation = trpc.location.delete.useMutation({
    onSuccess: () => {
      utils.location.list.invalidate();
      toast.success("Location deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete location");
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">
            Manage quarries, job sites, plants, and yards
          </p>
        </div>
        <Link href="/locations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="quarry">Quarries</TabsTrigger>
          <TabsTrigger value="job_site">Job Sites</TabsTrigger>
          <TabsTrigger value="plant">Plants</TabsTrigger>
          <TabsTrigger value="yard">Yards</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16">
          <MapPin className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            No locations found
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            {debouncedSearch
              ? "Try adjusting your search terms"
              : "Get started by adding your first location"}
          </p>
          {!debouncedSearch && (
            <Link href="/locations/new" className="mt-4">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City/State</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={typeBadgeVariant[loc.type as LocationType] ?? "secondary"}
                      >
                        {typeLabels[loc.type as LocationType] ?? loc.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{loc.address}</TableCell>
                    <TableCell>
                      {[loc.city, loc.state].filter(Boolean).join(", ")}
                    </TableCell>
                    <TableCell>{loc.contactName ?? "—"}</TableCell>
                    <TableCell>
                      {loc.operatingHoursStart && loc.operatingHoursEnd
                        ? `${loc.operatingHoursStart} – ${loc.operatingHoursEnd}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/locations/${loc.id}/edit`}>Edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(loc.id, loc.name)}
                          >
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
                Page {page} of {totalPages} ({data?.totalCount ?? 0} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
