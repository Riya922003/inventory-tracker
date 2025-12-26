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
import { FaArrowLeft, FaCamera, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { HiLightBulb } from "react-icons/hi";

const stockExitSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  warehouseId: z.string().min(1, "Please select a warehouse"),
  stockId: z.string().min(1, "Please select a batch"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  exitDate: z.string().min(1, "Exit date is required"),
  customerName: z.string().optional(),
  orderReference: z.string().optional(),
  exitPhoto: z.string().optional(),
});

type StockExitFormData = z.infer<typeof stockExitSchema>;

interface Product {
  _id: string;
  name: string;
  sku: string;
  unitType: string;
}

interface Warehouse {
  _id: string;
  name: string;
  address: {
    city: string;
  };
}

interface StockBatch {
  _id: string;
  batchId: string;
  quantityAvailable: number;
  entryDate: string;
  ageInDays: number;
  status: string;
}

export default function StockExitPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockBatches, setStockBatches] = useState<StockBatch[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const form = useForm<StockExitFormData>({
    resolver: zodResolver(stockExitSchema),
    defaultValues: {
      exitDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedProductId = form.watch("productId");
  const selectedWarehouseId = form.watch("warehouseId");
  const selectedStockId = form.watch("stockId");
  const selectedProduct = products.find((p) => p._id === selectedProductId);
  const selectedBatch = stockBatches.find((b) => b._id === selectedStockId);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedProductId && selectedWarehouseId) {
      fetchStockBatches();
    } else {
      setStockBatches([]);
      form.setValue("stockId", "");
    }
  }, [selectedProductId, selectedWarehouseId]);

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

  const fetchStockBatches = async () => {
    setLoadingBatches(true);
    try {
      const params = new URLSearchParams({
        productId: selectedProductId,
        warehouseId: selectedWarehouseId,
      });

      const response = await fetch(`/api/stock/entry?${params.toString()}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        // Filter only batches with available quantity
        const availableBatches = (data.stocks || []).filter(
          (stock: StockBatch) => stock.quantityAvailable > 0
        );
        setStockBatches(availableBatches);

        if (availableBatches.length === 0) {
          toast.error("No stock available for this product in selected warehouse");
        }
      }
    } catch (error) {
      console.error("Error fetching stock batches:", error);
      toast.error("Failed to load stock batches");
    } finally {
      setLoadingBatches(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        form.setValue("exitPhoto", base64String);
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

  const onSubmit = async (data: StockExitFormData) => {
    // Validate quantity against available
    if (selectedBatch && data.quantity > selectedBatch.quantityAvailable) {
      toast.error(
        `Quantity exceeds available stock (${selectedBatch.quantityAvailable})`
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/stock/exit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Stock exit recorded successfully! 🎉");
        setTimeout(() => {
          router.push("/dashboard/stock");
        }, 1500);
      } else {
        toast.error(result.error || "Failed to record stock exit");
      }
    } catch (error) {
      console.error("Error recording stock exit:", error);
      toast.error("Failed to record stock exit");
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
        <h1 className="text-2xl font-bold text-gray-900">Record Stock Exit</h1>
        <p className="text-gray-600 mt-1">Record sales, dispatch, or stock removal</p>
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <HiLightBulb className="text-2xl text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 font-medium mb-1">
                Stock Exit Best Practices
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Select the oldest batch first (FIFO - First In, First Out)</li>
                <li>• Upload exit photo for verification and audit trail</li>
                <li>• Add customer name for sales tracking</li>
                <li>• Reference order number for easy lookup</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Stock Exit Details</CardTitle>
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

            {/* Batch Selection */}
            <div className="space-y-2">
              <Label htmlFor="stockId">Select Batch *</Label>
              <select
                id="stockId"
                {...form.register("stockId")}
                disabled={loadingBatches || !selectedProductId || !selectedWarehouseId}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                  form.formState.errors.stockId ? "border-red-500" : ""
                }`}
              >
                <option value="">
                  {loadingBatches
                    ? "Loading batches..."
                    : !selectedProductId || !selectedWarehouseId
                    ? "Select product and warehouse first"
                    : stockBatches.length === 0
                    ? "No stock available"
                    : "Select a batch"}
                </option>
                {stockBatches.map((batch) => (
                  <option key={batch._id} value={batch._id}>
                    {batch.batchId} - Available: {batch.quantityAvailable} (
                    {batch.ageInDays} days old)
                  </option>
                ))}
              </select>
              {form.formState.errors.stockId && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.stockId.message}
                </p>
              )}
              {selectedBatch && (
                <div className="flex items-center gap-2 text-sm">
                  <FaExclamationTriangle
                    className={
                      selectedBatch.status === "dead"
                        ? "text-red-600"
                        : selectedBatch.status === "at_risk"
                        ? "text-orange-600"
                        : "text-green-600"
                    }
                  />
                  <span className="text-gray-700">
                    Available: <strong>{selectedBatch.quantityAvailable}</strong>{" "}
                    {selectedProduct?.unitType}s | Age: {selectedBatch.ageInDays} days
                  </span>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity to Dispatch *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="quantity"
                  type="number"
                  step="1"
                  min="1"
                  max={selectedBatch?.quantityAvailable || undefined}
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

            {/* Exit Date */}
            <div className="space-y-2">
              <Label htmlFor="exitDate">Exit Date *</Label>
              <Input
                id="exitDate"
                type="date"
                {...form.register("exitDate")}
                className={form.formState.errors.exitDate ? "border-red-500" : ""}
              />
              {form.formState.errors.exitDate && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.exitDate.message}
                </p>
              )}
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name (Optional)</Label>
              <Input
                id="customerName"
                placeholder="Enter customer or recipient name"
                {...form.register("customerName")}
              />
              <p className="text-sm text-gray-500">
                For sales tracking and customer history
              </p>
            </div>

            {/* Order Reference */}
            <div className="space-y-2">
              <Label htmlFor="orderReference">Order/Invoice Reference (Optional)</Label>
              <Input
                id="orderReference"
                placeholder="e.g., ORD-2024-156, INV-789"
                {...form.register("orderReference")}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label htmlFor="photo">Exit Photo (Recommended)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {photoPreview ? (
                  <div className="space-y-4">
                    <img
                      src={photoPreview}
                      alt="Exit preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhotoPreview(null);
                        form.setValue("exitPhoto", "");
                      }}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div>
                    <FaCamera className="text-4xl text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-3">
                      Upload a photo of the dispatched stock
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
                disabled={
                  submitting ||
                  loadingProducts ||
                  loadingWarehouses ||
                  loadingBatches ||
                  stockBatches.length === 0
                }
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <FaCheck className="mr-2" />
                {submitting ? "Recording..." : "Record Stock Exit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
