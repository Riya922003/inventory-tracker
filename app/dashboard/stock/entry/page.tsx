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
import { FaArrowLeft, FaCamera, FaCheck, FaBox } from "react-icons/fa";
import { HiLightBulb } from "react-icons/hi";

const stockEntrySchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  warehouseId: z.string().min(1, "Please select a warehouse"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  entryDate: z.string().min(1, "Entry date is required"),
  expiryDate: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  supplierInvoice: z.string().optional(),
  entryPhoto: z.string().optional(),
});

type StockEntryFormData = z.infer<typeof stockEntrySchema>;

interface Product {
  _id: string;
  name: string;
  sku: string;
  unitType: string;
  hasExpiryDate: boolean;
}

interface Warehouse {
  _id: string;
  name: string;
  address: {
    city: string;
  };
}

export default function StockEntryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const form = useForm<StockEntryFormData>({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: {
      entryDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedProductId = form.watch("productId");
  const selectedProduct = products.find((p) => p._id === selectedProductId);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?status=active", {
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.href = "/";
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await fetch("/api/warehouses", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      toast.error("Failed to load warehouses");
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      // Create a compressed preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        form.setValue("entryPhoto", base64String);
        toast.success("Photo uploaded successfully");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSubmit = async (data: StockEntryFormData) => {
    setSubmitting(true);

    try {
      const response = await fetch("/api/stock/entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Stock entry recorded successfully! 🎉");
        setTimeout(() => {
          router.push("/dashboard/stock");
        }, 1500);
      } else {
        toast.error(result.error || "Failed to record stock entry");
      }
    } catch (error) {
      console.error("Error recording stock entry:", error);
      toast.error("Failed to record stock entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/stock")}
          className="mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Back to Stock
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Record Stock Entry</h1>
        <p className="text-gray-600 mt-1">Add new stock to your inventory</p>
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <HiLightBulb className="text-2xl text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 font-medium mb-1">
                Stock Entry Best Practices
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Upload a clear photo of the received stock for verification</li>
                <li>• Record the entry date accurately for aging tracking</li>
                <li>• Add expiry date for perishable items</li>
                <li>• Each entry creates a unique batch for tracking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Stock Entry Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Product Selection */}
            <div className="space-y-2">
              <Label htmlFor="productId">Select Product *</Label>
              <select
                id="productId"
                {...form.register("productId")}
                disabled={loadingProducts}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                  form.formState.errors.productId ? "border-red-500" : ""
                }`}
              >
                <option value="">
                  {loadingProducts ? "Loading products..." : "Select a product"}
                </option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
              {form.formState.errors.productId && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.productId.message}
                </p>
              )}
              {selectedProduct && (
                <p className="text-sm text-gray-600">
                  Unit Type: <span className="font-medium capitalize">{selectedProduct.unitType}</span>
                </p>
              )}
            </div>

            {/* Warehouse Selection */}
            <div className="space-y-2">
              <Label htmlFor="warehouseId">Select Warehouse *</Label>
              <select
                id="warehouseId"
                {...form.register("warehouseId")}
                disabled={loadingWarehouses}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                  form.formState.errors.warehouseId ? "border-red-500" : ""
                }`}
              >
                <option value="">
                  {loadingWarehouses ? "Loading warehouses..." : "Select a warehouse"}
                </option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse._id} value={warehouse._id}>
                    {warehouse.name} - {warehouse.address.city}
                  </option>
                ))}
              </select>
              {form.formState.errors.warehouseId && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.warehouseId.message}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity Received *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="quantity"
                  type="number"
                  step="1"
                  min="1"
                  placeholder="Enter quantity"
                  {...form.register("quantity", { valueAsNumber: true })}
                  className={`flex-1 ${
                    form.formState.errors.quantity ? "border-red-500" : ""
                  }`}
                />
                {selectedProduct && (
                  <span className="text-sm text-gray-500 capitalize">
                    {selectedProduct.unitType}s
                  </span>
                )}
              </div>
              {form.formState.errors.quantity && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.quantity.message}
                </p>
              )}
            </div>

            {/* Entry Date */}
            <div className="space-y-2">
              <Label htmlFor="entryDate">Entry Date *</Label>
              <Input
                id="entryDate"
                type="date"
                {...form.register("entryDate")}
                className={form.formState.errors.entryDate ? "border-red-500" : ""}
              />
              {form.formState.errors.entryDate && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.entryDate.message}
                </p>
              )}
            </div>

            {/* Expiry Date (conditional) */}
            {selectedProduct?.hasExpiryDate && (
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  {...form.register("expiryDate")}
                  className={form.formState.errors.expiryDate ? "border-red-500" : ""}
                />
                <p className="text-sm text-gray-500">
                  This product requires an expiry date
                </p>
              </div>
            )}

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label htmlFor="photo">Entry Photo (Recommended)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {photoPreview ? (
                  <div className="space-y-4">
                    <img
                      src={photoPreview}
                      alt="Entry preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhotoPreview(null);
                        form.setValue("entryPhoto", "");
                      }}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div>
                    <FaCamera className="text-4xl text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-3">
                      Upload a photo of the received stock
                    </p>
                    <label htmlFor="photo">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingPhoto}
                        onClick={() => document.getElementById("photo")?.click()}
                      >
                        {uploadingPhoto ? "Uploading..." : "Choose Photo"}
                      </Button>
                    </label>
                    <input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Max size: 5MB. Formats: JPG, PNG
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Fields */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Additional Information (Optional)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Purchase Price */}
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price (INR)</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    placeholder="Enter purchase price"
                    {...form.register("purchasePrice", { valueAsNumber: true })}
                  />
                </div>

                {/* Supplier Invoice */}
                <div className="space-y-2">
                  <Label htmlFor="supplierInvoice">Supplier Invoice #</Label>
                  <Input
                    id="supplierInvoice"
                    placeholder="Enter invoice number"
                    {...form.register("supplierInvoice")}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/stock")}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || loadingProducts || loadingWarehouses}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <FaCheck className="mr-2" />
                {submitting ? "Recording..." : "Record Stock Entry"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
