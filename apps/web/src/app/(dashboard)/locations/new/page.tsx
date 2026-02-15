"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Label,
  Textarea,
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
} from "@aggregateos/ui";
import { ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { createLocationSchema } from "@aggregateos/shared";

export default function NewLocationPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    type: "" as string,
    address: "",
    city: "",
    state: "",
    zip: "",
    lat: "",
    lng: "",
    geofenceRadius: "200",
    contactName: "",
    contactPhone: "",
    operatingHoursStart: "",
    operatingHoursEnd: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const createMutation = trpc.location.create.useMutation({
    onSuccess: () => {
      toast.success("Location created successfully");
      router.push("/locations");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create location");
    },
  });

  const geocodeMutation = trpc.maps.geocode.useMutation({
    onSuccess: (result) => {
      if (result) {
        setForm((prev) => ({
          ...prev,
          lat: String(result.lat),
          lng: String(result.lng),
        }));
        toast.success(`Address geocoded: ${result.formattedAddress}`);
      } else {
        toast.error("Could not geocode this address. Enter coordinates manually.");
      }
    },
    onError: () => {
      toast.error("Geocoding failed. Enter coordinates manually.");
    },
  });

  const handleGeocode = () => {
    const fullAddress = `${form.address}, ${form.city}, ${form.state} ${form.zip}`;
    geocodeMutation.mutate({ address: fullAddress });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload = {
      name: form.name,
      type: form.type as "quarry" | "job_site" | "plant" | "yard",
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      lat: form.lat ? parseFloat(form.lat) : undefined,
      lng: form.lng ? parseFloat(form.lng) : undefined,
      geofenceRadius: form.geofenceRadius
        ? parseInt(form.geofenceRadius, 10)
        : 200,
      contactName: form.contactName || undefined,
      contactPhone: form.contactPhone || undefined,
      operatingHoursStart: form.operatingHoursStart || undefined,
      operatingHoursEnd: form.operatingHoursEnd || undefined,
      notes: form.notes || undefined,
    };

    const result = createLocationSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    createMutation.mutate(result.data);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back Button & Title */}
      <div className="flex items-center gap-4">
        <Link href="/locations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Add New Location
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a new quarry, job site, plant, or yard
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Location Details</CardTitle>
            <CardDescription>
              Enter the location information below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name</Label>
              <Input
                id="name"
                placeholder="e.g. Eagle Rock Quarry"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Location Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => update("type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarry">Quarry</SelectItem>
                  <SelectItem value="job_site">Job Site</SelectItem>
                  <SelectItem value="plant">Plant</SelectItem>
                  <SelectItem value="yard">Yard</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Street address"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
                {errors.city && (
                  <p className="text-sm text-red-500">{errors.city}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                />
                {errors.state && (
                  <p className="text-sm text-red-500">{errors.state}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  placeholder="ZIP Code"
                  value={form.zip}
                  onChange={(e) => update("zip", e.target.value)}
                />
                {errors.zip && (
                  <p className="text-sm text-red-500">{errors.zip}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude (optional)</Label>
                <Input
                  id="lat"
                  placeholder="e.g. 35.2271"
                  value={form.lat}
                  onChange={(e) => update("lat", e.target.value)}
                />
                {errors.lat && (
                  <p className="text-sm text-red-500">{errors.lat}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude (optional)</Label>
                <Input
                  id="lng"
                  placeholder="e.g. -80.8431"
                  value={form.lng}
                  onChange={(e) => update("lng", e.target.value)}
                />
                {errors.lng && (
                  <p className="text-sm text-red-500">{errors.lng}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="geofenceRadius">Geofence Radius (meters)</Label>
              <Input
                id="geofenceRadius"
                type="number"
                placeholder="200"
                value={form.geofenceRadius}
                onChange={(e) => update("geofenceRadius", e.target.value)}
              />
              {errors.geofenceRadius && (
                <p className="text-sm text-red-500">{errors.geofenceRadius}</p>
              )}
            </div>

            {/* Geocoding */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!form.address || !form.city || !form.state || !form.zip || geocodeMutation.isPending}
                  onClick={handleGeocode}
                >
                  {geocodeMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="mr-2 h-4 w-4" />
                  )}
                  Geocode Address
                </Button>
                {form.lat && form.lng && (
                  <span className="text-sm text-green-600">
                    Coordinates: {form.lat}, {form.lng}
                  </span>
                )}
              </div>
              {!form.lat && !form.lng && (
                <p className="text-xs text-muted-foreground">
                  Enter an address above and click &quot;Geocode Address&quot; to auto-fill coordinates
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  placeholder="Site contact"
                  value={form.contactName}
                  onChange={(e) => update("contactName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  placeholder="(555) 000-0000"
                  value={form.contactPhone}
                  onChange={(e) => update("contactPhone", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="operatingHoursStart">
                  Operating Hours Start
                </Label>
                <Input
                  id="operatingHoursStart"
                  type="time"
                  value={form.operatingHoursStart}
                  onChange={(e) =>
                    update("operatingHoursStart", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operatingHoursEnd">Operating Hours End</Label>
                <Input
                  id="operatingHoursEnd"
                  type="time"
                  value={form.operatingHoursEnd}
                  onChange={(e) => update("operatingHoursEnd", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this location..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Link href="/locations">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Location
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
