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
import { FaArrowLeft, FaSave } from "react-icons/fa";

const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  category: z.string().min(1, "Please select a category"),
  unitPrice: z.number().positive("Price must be greater than 0"),
  unitType: z.enum(["piece", "kilogram", "liter", "box", "meter"]),
  isFragile: z.boolean(),
  hasExpiryDate: z.boolean(),
  reorderLevel: z.number().min(0, "Reorder level must be 0 or greater"),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
  _id: string;
  name: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      unitType: "piece",
      isFragile: false,
      hasExpiryDate: false,
      reorderLevel: 10,
    },
  });

  useEffect(() => {
    fetchProduct();
    fetchCategories();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.href = "/";
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const product = data.product;

        form.reset({
          name: product.name,
          sku: product.sku,
          category: product.category._id,
          unitPrice: product.unitPrice,
          unitType: product.unitType,
          isFragile: product.isFragile,
          hasExpiryDate: product.hasExpiryDate,
          reorderLevel: product.reorderLevel,
        });
      } else {
        toast.error("Product not found");
        router.push("/dashboard/inventory");
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Product updated successfully!");
        router.push("/dashboard/inventory");
      } else {
        toast.error(result.error || "Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading product...</p>
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
          onClick={() => router.push("/dashboard/inventory")}
          className="mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Back to Inventory
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <p className="text-gray-600 mt-1">Update product information</p>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                placeholder="Enter product name"
                {...form.register("name")}
                className={form.formState.errors.name ? "border-red-500" : ""}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <Label htmlFor="sku">SKU / Product Code *</Label>
              <Input
                id="sku"
                placeholder="Enter SKU or product code"
                {...form.register("sku")}
                className={form.formState.errors.sku ? "border-red-500" : ""}
              />
              {form.formState.errors.sku && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.sku.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                {...form.register("category")}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                  form.formState.errors.category ? "border-red-500" : ""
                }`}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.category && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.category.message}
                </p>
              )}
            </div>

            {/* Unit Price */}
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price (INR) *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                placeholder="Enter unit price"
                {...form.register("unitPrice", { valueAsNumber: true })}
                className={form.formState.errors.unitPrice ? "border-red-500" : ""}
              />
              {form.formState.errors.unitPrice && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.unitPrice.message}
                </p>
              )}
            </div>

            {/* Unit Type */}
            <div className="space-y-2">
              <Label htmlFor="unitType">Unit Type *</Label>
              <select
                id="unitType"
                {...form.register("unitType")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="piece">Piece</option>
                <option value="kilogram">Kilogram</option>
                <option value="liter">Liter</option>
                <option value="box">Box</option>
                <option value="meter">Meter</option>
              </select>
            </div>

            {/* Reorder Level */}
            <div className="space-y-2">
              <Label htmlFor="reorderLevel">Reorder Level *</Label>
              <Input
                id="reorderLevel"
                type="number"
                placeholder="Minimum quantity before reorder alert"
                {...form.register("reorderLevel", { valueAsNumber: true })}
                className={form.formState.errors.reorderLevel ? "border-red-500" : ""}
              />
              {form.formState.errors.reorderLevel && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.reorderLevel.message}
                </p>
              )}
            </div>

            {/* Is Fragile */}
            <div className="space-y-2">
              <Label>Is this product fragile? (Requires photo verification)</Label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="true"
                    checked={form.watch("isFragile") === true}
                    onChange={() => form.setValue("isFragile", true)}
                    className="w-4 h-4"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="false"
                    checked={form.watch("isFragile") === false}
                    onChange={() => form.setValue("isFragile", false)}
                    className="w-4 h-4"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            {/* Has Expiry Date */}
            <div className="space-y-2">
              <Label>Does this product have an expiry date?</Label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="true"
                    checked={form.watch("hasExpiryDate") === true}
                    onChange={() => form.setValue("hasExpiryDate", true)}
                    className="w-4 h-4"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="false"
                    checked={form.watch("hasExpiryDate") === false}
                    onChange={() => form.setValue("hasExpiryDate", false)}
                    className="w-4 h-4"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/inventory")}
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
