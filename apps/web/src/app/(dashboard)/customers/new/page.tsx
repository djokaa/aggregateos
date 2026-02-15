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
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { createCustomerSchema } from "@aggregateos/shared";
import { toast } from "sonner";
import type { z } from "zod";

type FormData = {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  creditTerms: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const INITIAL_FORM: FormData = {
  name: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  billingAddress: "",
  billingCity: "",
  billingState: "",
  billingZip: "",
  creditTerms: "net_30",
  notes: "",
};

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const createMutation = trpc.customer.create.useMutation({
    onSuccess: () => {
      toast.success("Customer created successfully");
      router.push("/customers");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build the payload, mapping form fields to schema fields
    const payload = {
      name: form.name,
      contactName: form.contactName,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone,
      billingAddress: form.billingAddress,
      billingCity: form.billingCity,
      billingState: form.billingState,
      billingZip: form.billingZip,
      creditTerms: form.creditTerms as z.infer<typeof createCustomerSchema>["creditTerms"],
      notes: form.notes || undefined,
    };

    // Client-side validation
    const result = createCustomerSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormData;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    createMutation.mutate(result.data);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back Button & Title */}
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Add New Customer
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a new customer account
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
            <CardDescription>
              Enter the customer information below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Smith Construction"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contactName">
                Contact Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contactName"
                placeholder="Primary contact"
                value={form.contactName}
                onChange={(e) => update("contactName", e.target.value)}
              />
              {errors.contactName && (
                <p className="text-sm text-red-500">{errors.contactName}</p>
              )}
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="email@example.com"
                  value={form.contactEmail}
                  onChange={(e) => update("contactEmail", e.target.value)}
                />
                {errors.contactEmail && (
                  <p className="text-sm text-red-500">{errors.contactEmail}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactPhone"
                  placeholder="(555) 000-0000"
                  value={form.contactPhone}
                  onChange={(e) => update("contactPhone", e.target.value)}
                />
                {errors.contactPhone && (
                  <p className="text-sm text-red-500">{errors.contactPhone}</p>
                )}
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-2">
              <Label htmlFor="billingAddress">
                Billing Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="billingAddress"
                placeholder="Street address"
                value={form.billingAddress}
                onChange={(e) => update("billingAddress", e.target.value)}
              />
              {errors.billingAddress && (
                <p className="text-sm text-red-500">{errors.billingAddress}</p>
              )}
            </div>

            {/* City, State, ZIP */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingCity">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billingCity"
                  placeholder="City"
                  value={form.billingCity}
                  onChange={(e) => update("billingCity", e.target.value)}
                />
                {errors.billingCity && (
                  <p className="text-sm text-red-500">{errors.billingCity}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingState">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billingState"
                  placeholder="State"
                  value={form.billingState}
                  onChange={(e) => update("billingState", e.target.value)}
                />
                {errors.billingState && (
                  <p className="text-sm text-red-500">{errors.billingState}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingZip">
                  ZIP <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billingZip"
                  placeholder="ZIP Code"
                  value={form.billingZip}
                  onChange={(e) => update("billingZip", e.target.value)}
                />
                {errors.billingZip && (
                  <p className="text-sm text-red-500">{errors.billingZip}</p>
                )}
              </div>
            </div>

            {/* Credit Terms */}
            <div className="space-y-2">
              <Label htmlFor="creditTerms">Credit Terms</Label>
              <Select
                value={form.creditTerms}
                onValueChange={(v) => update("creditTerms", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select credit terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">COD</SelectItem>
                  <SelectItem value="net_15">Net 15</SelectItem>
                  <SelectItem value="net_30">Net 30</SelectItem>
                  <SelectItem value="net_45">Net 45</SelectItem>
                  <SelectItem value="net_60">Net 60</SelectItem>
                </SelectContent>
              </Select>
              {errors.creditTerms && (
                <p className="text-sm text-red-500">{errors.creditTerms}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this customer..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={4}
              />
              {errors.notes && (
                <p className="text-sm text-red-500">{errors.notes}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Link href="/customers">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Customer"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
