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
import { HiLightBulb } from "react-icons/hi";
import { FaCamera } from "react-icons/fa";

// Schema for Step 1 - Basic Product Info
const step1Schema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  category: z.string().min(1, "Please select a category"),
  unitPrice: z.number().positive("Price must be greater than 0"),
  unitType: z.enum(["piece", "kilogram", "liter", "box", "meter"]),
  isFragile: z.boolean(),
  hasExpiryDate: z.boolean(),
});

// Schema for Step 2 - Stock Info
const step2Schema = z.object({
  hasStock: z.boolean(),
  warehouseId: z.string().optional(),
  quantity: z.number().positive("Quantity must be greater than 0").optional(),
  receivedDate: z.string().optional(),
  entryPhoto: z.string().optional(),
}).refine(
  (data) => {
    // If hasStock is true, warehouseId and quantity must be provided
    if (data.hasStock) {
      return !!data.warehouseId && !!data.quantity && data.quantity > 0;
    }
    return true;
  },
  {
    message: "Warehouse and quantity are required when adding stock",
    path: ["warehouseId"], // Show error on warehouse field
  }
);

type Step1FormData = z.infer<typeof step1Schema>;
type Step2FormData = z.infer<typeof step2Schema>;
type FullFormData = Step1FormData & Step2FormData;

interface Category {
  _id: string;
  name: string;
}

interface Warehouse {
  _id: string;
  name: string;
  address: {
    city: string;
  };
}

export default function AddFirstProduct() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const step1Form = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      unitType: "piece",
      isFragile: false,
      hasExpiryDate: false,
    },
  });

  const step2Form = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      hasStock: true,
    },
  });

  const hasStock = step2Form.watch("hasStock");

  // Fetch categories and warehouses on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, warehousesRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/warehouses"),
        ]);

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }

        if (warehousesRes.ok) {
          const data = await warehousesRes.json();
          setWarehouses(data.warehouses || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      } finally {
        setLoadingCategories(false);
        setLoadingWarehouses(false);
      }
    };

    fetchData();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploadingPhoto(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        step2Form.setValue("entryPhoto", reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleStep1Submit = async (data: Step1FormData) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const handleFinalSubmit = async (stockData: Step2FormData) => {
    if (!step1Data) return;

    setIsSubmitting(true);

    try {
      const fullData: FullFormData = {
        ...step1Data,
        ...stockData,
      };

      console.log("Submitting product data:", fullData);

      const response = await fetch("/api/products/create-with-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(fullData),
      });

      const result = await response.json();
      console.log("API response:", result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to create product");
      }

      toast.success("Product created successfully! 🎉");

      // Redirect to success page with product ID
      setTimeout(() => {
        router.push(`/dashboard/products/success?productId=${result.product._id}`);
      }, 1500);
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
      {/* Product Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Product Name *</Label>
        <Input
          id="name"
          placeholder="Enter product name"
          {...step1Form.register("name")}
          className={step1Form.formState.errors.name ? "border-red-500" : ""}
        />
        {step1Form.formState.errors.name && (
          <p className="text-sm text-red-500">{step1Form.formState.errors.name.message}</p>
        )}
      </div>

      {/* SKU */}
      <div className="space-y-2">
        <Label htmlFor="sku">SKU / Product Code *</Label>
        <Input
          id="sku"
          placeholder="Enter SKU or product code"
          {...step1Form.register("sku")}
          className={step1Form.formState.errors.sku ? "border-red-500" : ""}
        />
        {step1Form.formState.errors.sku && (
          <p className="text-sm text-red-500">{step1Form.formState.errors.sku.message}</p>
        )}
        <div className="flex items-start gap-2 mt-1">
          <HiLightBulb className="text-lg text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">
            A unique code to identify this product
          </p>
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <select
          id="category"
          {...step1Form.register("category")}
          disabled={loadingCategories}
          className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            step1Form.formState.errors.category ? "border-red-500" : ""
          }`}
        >
          <option value="">
            {loadingCategories ? "Loading categories..." : "Select a category"}
          </option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>
        {step1Form.formState.errors.category && (
          <p className="text-sm text-red-500">{step1Form.formState.errors.category.message}</p>
        )}
      </div>

      {/* Unit Price */}
      <div className="space-y-2">
        <Label htmlFor="unitPrice">Unit Price (INR) *</Label>
        <Input
          id="unitPrice"
          type="number"
          placeholder="Enter unit price"
          {...step1Form.register("unitPrice", { valueAsNumber: true })}
          className={step1Form.formState.errors.unitPrice ? "border-red-500" : ""}
        />
        {step1Form.formState.errors.unitPrice && (
          <p className="text-sm text-red-500">{step1Form.formState.errors.unitPrice.message}</p>
        )}
        <div className="flex items-start gap-2 mt-1">
          <HiLightBulb className="text-lg text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">
            Price per unit for tracking value
          </p>
        </div>
      </div>

      {/* Unit Type */}
      <div className="space-y-2">
        <Label htmlFor="unitType">Unit Type *</Label>
        <select
          id="unitType"
          {...step1Form.register("unitType")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="piece">Piece</option>
          <option value="kilogram">Kilogram (kg)</option>
          <option value="liter">Liter (L)</option>
          <option value="box">Box</option>
          <option value="meter">Meter (m)</option>
        </select>
      </div>

      {/* Is Fragile */}
      <div className="space-y-2">
        <Label>Is this product fragile? (Requires photo verification)</Label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              value="true"
              checked={step1Form.watch("isFragile") === true}
              onChange={() => step1Form.setValue("isFragile", true)}
              className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
            />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              value="false"
              checked={step1Form.watch("isFragile") === false}
              onChange={() => step1Form.setValue("isFragile", false)}
              className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
            />
            <span className="text-sm">No</span>
          </label>
        </div>
      </div>

      {/* Has Expiry Date */}
      <div className="space-y-2">
        <Label>Does this product have an expiry date?</Label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              value="true"
              checked={step1Form.watch("hasExpiryDate") === true}
              onChange={() => step1Form.setValue("hasExpiryDate", true)}
              className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
            />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              value="false"
              checked={step1Form.watch("hasExpiryDate") === false}
              onChange={() => step1Form.setValue("hasExpiryDate", false)}
              className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
            />
            <span className="text-sm">No</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="flex-1"
        >
          Skip
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          Continue →
        </Button>
      </div>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={step2Form.handleSubmit(handleFinalSubmit)} className="space-y-6">
      {/* Product Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600 mb-1">Product:</p>
        <p className="font-medium text-gray-900">
          {step1Data?.name} ({step1Data?.sku})
        </p>
      </div>

      {/* Has Stock Question */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardContent className="pt-6">
          <Label className="text-base mb-4 block">
            Do you have existing stock of this product?
          </Label>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                checked={hasStock === true}
                onChange={() => step2Form.setValue("hasStock", true)}
                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
              />
              <span className="text-sm">Yes, I have stock to record</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                checked={hasStock === false}
                onChange={() => step2Form.setValue("hasStock", false)}
                className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
              />
              <span className="text-sm">No, I'll add stock later</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Stock Details (shown if hasStock is true) */}
      {hasStock && (
        <>
          {/* Warehouse */}
          <div className="space-y-2">
            <Label htmlFor="warehouseId">Warehouse *</Label>
            <select
              id="warehouseId"
              {...step2Form.register("warehouseId")}
              disabled={loadingWarehouses}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                step2Form.formState.errors.warehouseId ? "border-red-500" : ""
              }`}
            >
              <option value="">
                {loadingWarehouses ? "Loading warehouses..." : "Select a warehouse"}
              </option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </select>
            {step2Form.formState.errors.warehouseId && (
              <p className="text-sm text-red-500">{step2Form.formState.errors.warehouseId.message}</p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="quantity"
                type="number"
                placeholder="Enter quantity"
                {...step2Form.register("quantity", { valueAsNumber: true })}
                className={`flex-1 ${step2Form.formState.errors.quantity ? "border-red-500" : ""}`}
              />
              <span className="text-sm text-gray-500">{step1Data?.unitType}s</span>
            </div>
            {step2Form.formState.errors.quantity && (
              <p className="text-sm text-red-500">{step2Form.formState.errors.quantity.message}</p>
            )}
          </div>

          {/* Received Date */}
          <div className="space-y-2">
            <Label htmlFor="receivedDate">When did you receive this stock?</Label>
            <Input
              id="receivedDate"
              type="date"
              {...step2Form.register("receivedDate")}
              max={new Date().toISOString().split("T")[0]}
            />
            <div className="flex items-start gap-2 mt-1">
              <HiLightBulb className="text-lg text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">
                This helps calculate accurate aging
              </p>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Upload Entry Photo (Optional but recommended)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-h-48 rounded-lg object-cover"
                  />
                ) : (
                  <>
                    <FaCamera className="text-4xl text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Click to upload or drag & drop image here
                    </p>
                  </>
                )}
              </label>
            </div>
            <p className="text-xs text-gray-500">JPG, PNG up to 10MB</p>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep(1)}
          disabled={isSubmitting}
          className="flex-1"
        >
          ← Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {isSubmitting ? "Creating..." : "Complete →"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Add Product</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {currentStep === 1 ? "Basic information" : "Add initial stock"}
              </p>
            </div>
            <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
              Step {currentStep}/2
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {currentStep === 1 ? renderStep1() : renderStep2()}
        </CardContent>
      </Card>
    </div>
  );
}
