"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function EditWarehousePage() {
  const router = useRouter();
  const params = useParams();
  const warehouseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [warehouseCode, setWarehouseCode] = useState("");

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
    fetchWarehouse();
    fetchUsers();
  }, [warehouseId]);

  const fetchWarehouse = async () => {
    try {
      const response = await fetch(`/api/warehouses/${warehouseId}`, {
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.href = "/";
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const warehouse = data.warehouse;

        setWarehouseCode(warehouse.warehouseCode || "N/A");

        form.reset({
          name: warehouse.name,
          street: warehouse.address.street || "",
          city: warehouse.address.city,
          state: warehouse.address.state,
          pin: warehouse.address.pin || "",
          country: warehouse.address.country,
          manager: warehouse.manager?._id || "",
          capacity: warehouse.capacity || 1000,
          contactPhone: warehouse.contactPhone || "",
          contactEmail: warehouse.contactEmail || "",
          notes: warehouse.notes || "",
        });
      } else {
        toast.error("Warehouse not found");
        router.push("/dashboard/warehouses");
      }
    } catch (error) {
      console.error("Error fetching warehouse:", error);
      toast.error("Failed to load warehouse");
    } finally {
      setLoading(false);
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
      const response = await fetch(`/api/warehouses/${warehouseId}`, {
        method: "PUT",
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
        toast.success("Warehouse updated successfully!");
        router.push("/dashboard/warehouses");
      } else {
        toast.error(result.error || "Failed to update warehouse");
      }
    } catch (error) {
      console.error("Error updating warehouse:", error);
      toast.error("Failed to update warehouse");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading warehouse...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Edit Warehouse</h1>
            <p className="text-gray-600 mt-1">Update warehouse information</p>
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
            {/* Warehouse Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Warehouse Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Main Distribution Center"
                {...form.register("name")}
                className={form.formState.errors.name ? "border-red-500" : ""}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Address Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900">Address</h3>

              {/* Street */}
              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  placeholder="Building number, street name"
                  {...form.register("street")}
                />
              </div>

              {/* City & State */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Bangalore"
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
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="e.g., Karnataka"
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
                  <Label htmlFor="pin">PIN Code</Label>
                  <Input
                    id="pin"
                    placeholder="e.g., 560001"
                    {...form.register("pin")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    {...form.register("country")}
                    className="bg-gray-100"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Manager */}
            <div className="space-y-2">
              <Label htmlFor="manager">Warehouse Manager</Label>
              <select
                id="manager"
                {...form.register("manager")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a manager (optional)</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Assign a user to manage this warehouse
              </p>
            </div>

            {/* Capacity */}
            <div className="space-y-2">
              <Label htmlFor="capacity">Storage Capacity (units) *</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="e.g., 1000"
                {...form.register("capacity", { valueAsNumber: true })}
                className={form.formState.errors.capacity ? "border-red-500" : ""}
              />
              {form.formState.errors.capacity && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.capacity.message}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Maximum number of units this warehouse can store
              </p>
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
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
