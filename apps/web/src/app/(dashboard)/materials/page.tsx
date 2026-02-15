"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Badge,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@aggregateos/ui";
import { Plus, Search, MoreHorizontal, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  MATERIAL_TYPE_LABELS,
  MATERIAL_UNIT_LABELS,
} from "@aggregateos/shared";
import type { MaterialType, MaterialUnit } from "@aggregateos/shared";

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="max-w-[300px]">Description</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 5 }).map((_, j) => (
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

export default function MaterialsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    type: "" as string,
    unit: "" as string,
    description: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.material.list.useQuery();

  const createMutation = trpc.material.create.useMutation({
    onSuccess: () => {
      utils.material.list.invalidate();
      setDialogOpen(false);
      setNewMaterial({ name: "", type: "", unit: "", description: "" });
      setFormErrors({});
      toast.success("Material created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create material");
    },
  });

  const deleteMutation = trpc.material.delete.useMutation({
    onSuccess: () => {
      utils.material.list.invalidate();
      toast.success("Material deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete material");
    },
  });

  const handleCreate = () => {
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!newMaterial.name.trim()) errors.name = "Name is required";
    if (!newMaterial.type) errors.type = "Type is required";
    if (!newMaterial.unit) errors.unit = "Unit is required";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    createMutation.mutate({
      name: newMaterial.name,
      type: newMaterial.type as MaterialType,
      unit: newMaterial.unit as MaterialUnit,
      description: newMaterial.description || undefined,
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const items = data?.items ?? [];
  const filtered = search
    ? items.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.type.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Materials</h1>
          <p className="text-sm text-muted-foreground">
            Manage material types and catalog
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Material</DialogTitle>
              <DialogDescription>
                Add a new material to the catalog.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="materialName">Name</Label>
                <Input
                  id="materialName"
                  placeholder="e.g. #57 Limestone"
                  value={newMaterial.name}
                  onChange={(e) =>
                    setNewMaterial((p) => ({ ...p, name: e.target.value }))
                  }
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialType">Type</Label>
                <Select
                  value={newMaterial.type}
                  onValueChange={(v) =>
                    setNewMaterial((p) => ({ ...p, type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(MATERIAL_TYPE_LABELS) as [
                        MaterialType,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.type && (
                  <p className="text-sm text-red-500">{formErrors.type}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialUnit">Unit</Label>
                <Select
                  value={newMaterial.unit}
                  onValueChange={(v) =>
                    setNewMaterial((p) => ({ ...p, unit: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(MATERIAL_UNIT_LABELS) as [
                        MaterialUnit,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.unit && (
                  <p className="text-sm text-red-500">{formErrors.unit}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialDesc">Description</Label>
                <Textarea
                  id="materialDesc"
                  placeholder="Material description..."
                  value={newMaterial.description}
                  onChange={(e) =>
                    setNewMaterial((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Material
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16">
          <Package className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            No materials found
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            {search
              ? "Try adjusting your search terms"
              : "Get started by adding your first material"}
          </p>
          {!search && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Material
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="max-w-[300px]">Description</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((mat) => (
                <TableRow key={mat.id}>
                  <TableCell className="font-medium">{mat.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {MATERIAL_TYPE_LABELS[mat.type as MaterialType] ??
                        mat.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {MATERIAL_UNIT_LABELS[mat.unit as MaterialUnit] ?? mat.unit}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {mat.description ?? "—"}
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
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(mat.id, mat.name)}
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
      )}
    </div>
  );
}
