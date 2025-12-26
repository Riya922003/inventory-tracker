"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FaArrowLeft, FaSave, FaWarehouse } from "react-icons/fa";

const warehouseSchema = z.object({
  name: z.string().min(2, "Warehouse name must be at least 2 characters"),
  street: z.string().min(2, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pin: z.string().min(5, "PIN code is required"),
  country: z.string(),
  manager: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

interface User {
  _id: string;
  name: string;
  email: string;
}

export default function NewWarehousePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [warehouseCode, setWarehouseCode] = useState("WH001");

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      country: "India",
      capacity: 1000,
      contactPhone: "",
      contactEmail: "",
      notes: "",
    },
  });

  useEffect(() => {
    fetchUsers();
    generateWarehouseCode();
  }, []);

  const generateWarehouseCode = async () => {
    try {
      const response = await fetch("/api/warehouses", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        const count = data.warehouses?.length || 0;
        setWarehouseCode(`WH${String(count + 1).padStart(3, "0")}`);
      }
    } catch (error) {
      console.error("Error generating warehouse code:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const onSubmit = async (data: WarehouseFormData) => {
    setSaving(true);
    try {
      const response = await fetch("/api/warehouses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          address: {
            street: data.street,
            city: data.city,
            state: data.state,
            pin: data.pin,
            country: data.country,
          },
          manager: data.manager || null,
          capacity: data.capacity,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          notes: data.notes,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Warehouse created successfully!");
        router.push("/dashboard/warehouses");
      } else {
        toast.error(result.error || "Failed to create warehouse");
      }
    } catch (error) {
      console.error("Error creating warehouse:", error);
      toast.error("Failed to create warehouse");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/warehouses")}
          className="mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Back to Warehouses
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
            <FaWarehouse className="text-2xl text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Warehouse</h1>
            <p className="text-gray-600 mt-1">Create a new storage location</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Warehouse Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Basic Information
              </h3>

              {/* Warehouse Name */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="name">Warehouse Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Delhi Central Warehouse"
                  {...form.register("name")}
                  className={form.formState.errors.name ? "border-red-500" : ""}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Warehouse Code */}
              <div className="space-y-2">
                <Label htmlFor="warehouseCode">
                  Warehouse Code (Auto-generated: {warehouseCode})
                </Label>
                <Input
                  id="warehouseCode"
                  value={warehouseCode}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  💡 Unique identifier for this warehouse
                </p>
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900">Address Details</h3>

              {/* Street */}
              <div className="space-y-2">
                <Label htmlFor="street">Street Address *</Label>
                <Input
                  id="street"
                  placeholder="Plot 45, Industrial Area Phase 2"
                  {...form.register("street")}
                  className={form.formState.errors.street ? "border-red-500" : ""}
                />
                {form.formState.errors.street && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.street.message}
                  </p>
                )}
              </div>

              {/* City & State */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="e.g., New Delhi"
                    {...form.register("city")}
                    className={form.formState.errors.city ? "border-red-500" : ""}
                  />
                  {form.formState.errors.city && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.city.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State/Province *</Label>
                  <Input
                    id="state"
                    placeholder="e.g., Delhi"
                    {...form.register("state")}
                    className={form.formState.errors.state ? "border-red-500" : ""}
                  />
                  {form.formState.errors.state && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.state.message}
                    </p>
                  )}
                </div>
              </div>

              {/* PIN & Country */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN/ZIP Code *</Label>
                  <Input
                    id="pin"
                    placeholder="e.g., 110020"
                    {...form.register("pin")}
                    className={form.formState.errors.pin ? "border-red-500" : ""}
                  />
                  {form.formState.errors.pin && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.pin.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <select
                    id="country"
                    {...form.register("country")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="India">India</option>
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                    <option value="Canada">Canada</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Storage Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Storage Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="capacity">Storage Capacity (Optional)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="e.g., 5000"
                    {...form.register("capacity", { valueAsNumber: true })}
                    className={form.formState.errors.capacity ? "border-red-500" : ""}
                  />
                  <span className="text-gray-600">units</span>
                </div>
                {form.formState.errors.capacity && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.capacity.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  💡 Maximum units this warehouse can hold
                </p>
              </div>
            </div>

            {/* Management */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Management</h3>

              <div className="space-y-2">
                <Label htmlFor="manager">Warehouse Manager (Optional)</Label>
                <select
                  id="manager"
                  {...form.register("manager")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">• Assign later</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      • {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Contact Information
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <Input
                    id="contactPhone"
                    placeholder="+91 98765 43210"
                    {...form.register("contactPhone")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="delhi@heritagestore.com"
                    {...form.register("contactEmail")}
                    className={
                      form.formState.errors.contactEmail ? "border-red-500" : ""
                    }
                  />
                  {form.formState.errors.contactEmail && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.contactEmail.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Additional Notes (Optional)
              </h3>

              <div className="space-y-2">
                <textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Climate-controlled section available&#10;Temperature range: 15-25°C"
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/warehouses")}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <FaSave className="mr-2" />
                {saving ? "Creating..." : "Save Warehouse"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
