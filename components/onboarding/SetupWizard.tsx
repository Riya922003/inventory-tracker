"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { FaLightbulb, FaRocket, FaCog, FaCheckCircle } from "react-icons/fa";
import { HiLightBulb } from "react-icons/hi";

// Zod Schema Definitions - Step 1: Admin info (for new accounts)
const step1Schema = z.object({
  adminName: z.string().min(2, "Full name must be at least 2 characters"),
  adminEmail: z.string().email("Please provide a valid email address"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const step2Schema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  industryType: z.string().min(1, "Industry type is required"),
  currency: z.string().min(1, "Currency is required"),
  concerns: z.array(z.string()).min(1, "Please select at least one concern"),
});

const warehouseSchema = z.object({
  name: z.string().min(2, "Warehouse name must be at least 2 characters"),
  street: z.string().optional().or(z.literal("")),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pin: z.string().optional().or(z.literal("")),
  country: z.string().min(1, "Country is required"),
  manager: z.string().optional().or(z.literal("")),
  capacity: z.number().positive().optional(),
});

const step3Schema = z.object({
  warehouses: z.array(warehouseSchema).min(1, "At least one warehouse is required"),
});

const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  agingConcern: z.enum(["slow", "moderate", "fast", "expiry"]),
  isFragile: z.enum(["yes", "no"]),
});

const step4Schema = z.object({
  categories: z.array(categorySchema),
});

// Combined schema including admin info
const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema).merge(step4Schema);

type FormData = z.infer<typeof fullSchema>;

// Helper function to generate default categories based on industry
const getDefaultCategoriesForIndustry = (industry: string) => {
  const industryDefaults: Record<string, any[]> = {
    "Building Materials": [
      { name: "Natural Stone", agingConcern: "slow", agingDays: 180, isFragile: true, requiresPhotoVerification: true },
      { name: "Tiles", agingConcern: "slow", agingDays: 180, isFragile: true, requiresPhotoVerification: true },
      { name: "Cement & Concrete", agingConcern: "moderate", agingDays: 90, isFragile: false, requiresPhotoVerification: false },
    ],
    "Fashion & Textiles": [
      { name: "Seasonal Apparel", agingConcern: "fast", agingDays: 60, isFragile: false, requiresPhotoVerification: false },
      { name: "Accessories", agingConcern: "moderate", agingDays: 90, isFragile: false, requiresPhotoVerification: false },
    ],
    "Electronics": [
      { name: "Consumer Electronics", agingConcern: "fast", agingDays: 60, isFragile: true, requiresPhotoVerification: true },
      { name: "Components", agingConcern: "moderate", agingDays: 90, isFragile: false, requiresPhotoVerification: false },
    ],
    "Food & Beverage": [
      { name: "Perishable Goods", agingConcern: "expiry", agingDays: null, isFragile: false, requiresPhotoVerification: false },
      { name: "Packaged Foods", agingConcern: "expiry", agingDays: null, isFragile: false, requiresPhotoVerification: false },
    ],
  };

  return industryDefaults[industry] || [
    { name: "General Products", agingConcern: "moderate", agingDays: 90, isFragile: false, requiresPhotoVerification: false },
  ];
};

const STEPS = [
  { number: 1, title: "Administrator", description: "Create your admin account" },
  { number: 2, title: "Company Configuration", description: "Set up your company details" },
  { number: 3, title: "Warehouse Setup", description: "Add your storage locations" },
  { number: 4, title: "Setup Preference", description: "Choose your setup path" },
  { number: 5, title: "Product Setup", description: "Define your product categories" },
];

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupMode, setSetupMode] = useState<"quick" | "custom" | null>("quick");
  const [showSuccess, setShowSuccess] = useState(false);
  const [onboardingData, setOnboardingData] = useState<{
    companyName: string;
    warehousesCount: number;
    categoriesCount: number;
    concerns: string[];
  } | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      adminName: "",
      adminEmail: "",
      adminPassword: "",
      companyName: "",
      industryType: "",
      currency: "INR",
      concerns: [],
      warehouses: [
        {
          name: "",
          street: "",
          city: "",
          state: "",
          pin: "",
          country: "India",
          manager: "",
          capacity: undefined,
        },
      ],
      categories: [
        {
          name: "",
          agingConcern: "moderate",
          isFragile: "no",
        },
      ],
    },
    mode: "onChange",
  });

  const { fields: warehouseFields, append: appendWarehouse, remove: removeWarehouse } = useFieldArray({
    control,
    name: "warehouses",
  });

  const { fields: categoryFields, append: appendCategory, remove: removeCategory } = useFieldArray({
    control,
    name: "categories",
  });

  const progressPercentage = (currentStep / STEPS.length) * 100;

  const validateStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ["adminName", "adminEmail", "adminPassword"];
    } else if (currentStep === 2) {
      fieldsToValidate = ["companyName", "industryType", "currency", "concerns"];
    } else if (currentStep === 3) {
      fieldsToValidate = ["warehouses"];
    } else if (currentStep === 4) {
      // Step 4 is setup preference selection, no validation needed
      return true;
    } else if (currentStep === 5) {
      // Only validate categories if in custom mode
      if (setupMode === "custom") {
        fieldsToValidate = ["categories"];
      } else {
        return true;
      }
    }

    const isValid = await trigger(fieldsToValidate);
    return isValid;
  };

  const handleNext = async () => {
    // Step 4: Handle setup mode selection (Setup Preference)
    if (currentStep === 4 && !setupMode) {
      toast.error("Please select a setup option");
      return;
    }

    // If on Setup Preference and quick start is selected, submit directly
    if (currentStep === 4 && setupMode === "quick") {
      handleSubmit(onSubmit)();
      return;
    }

    const isValid = await validateStep();
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      console.log("onSubmit: starting onboarding submit", data);
      // Format data for API (no user data needed, already authenticated)
      const payload: any = {
        // If admin fields are present, include them so the server can create the user
        admin: {
          name: data.adminName,
          email: data.adminEmail,
          password: data.adminPassword,
        },
        company: {
          name: data.companyName,
          industryType: data.industryType,
          currency: data.currency,
          concerns: data.concerns,
        },
        warehouses: data.warehouses.map((warehouse) => ({
          name: warehouse.name,
          location: {
            street: warehouse.street || "",
            city: warehouse.city,
            state: warehouse.state,
            pin: warehouse.pin || "",
            country: warehouse.country,
          },
          manager: warehouse.manager || undefined,
          capacity: warehouse.capacity || undefined,
        })),
        categories: setupMode === "quick" 
          ? getDefaultCategoriesForIndustry(data.industryType)
          : (data.categories || []).map((category) => ({
              name: category.name,
              agingConcern: category.agingConcern,
              agingDays:
                category.agingConcern === "slow"
                  ? 180
                  : category.agingConcern === "moderate"
                  ? 90
                  : category.agingConcern === "fast"
                  ? 60
                  : null,
              isFragile: category.isFragile === "yes",
              requiresPhotoVerification: category.isFragile === "yes",
            })),
      };

      console.log("onSubmit: payload", payload);
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let result: any;
      const text = await response.text();
      const contentType = response.headers.get("content-type") || "";
      console.log("onSubmit: raw response text", text);

      if (contentType.includes("application/json")) {
        try {
          result = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error("onSubmit: response parse error", parseError);
          throw new Error("Invalid JSON response from server");
        }
      } else {
        console.error("onSubmit: non-JSON response", response.status, text);
        throw new Error(text || response.statusText || "Invalid response from server");
      }

      console.log("onSubmit: parsed response", response.status, result);

      if (!response.ok) {
        throw new Error(result?.error || result?.details || "Failed to complete onboarding");
      }

      // Store onboarding data for success screen
      const categoriesCount = setupMode === "quick"
        ? getDefaultCategoriesForIndustry(data.industryType).length
        : (data.categories || []).length;

      setOnboardingData({
        companyName: data.companyName,
        warehousesCount: data.warehouses.length,
        categoriesCount: categoriesCount,
        concerns: data.concerns,
      });

      // Show success screen
      setShowSuccess(true);
      toast.success("Onboarding complete — redirecting to add product...");
      // Give user a moment to see success, then take them to add-first-product page
      setTimeout(() => {
        router.push("/dashboard/products/new");
      }, 800);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete setup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="Enter your company name"
                {...register("companyName")}
                className={errors.companyName ? "border-red-500" : ""}
              />
              {errors.companyName && (
                <p className="text-sm text-red-500">{errors.companyName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industryType">Industry Type *</Label>
              <select
                id="industryType"
                {...register("industryType")}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.industryType ? "border-red-500" : ""
                }`}
              >
                <option value="">Select industry type</option>
                <option value="Building Materials">Building Materials</option>
                <option value="Fashion & Textiles">Fashion & Textiles</option>
                <option value="Electronics">Electronics</option>
                <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                <option value="Industrial Supplies">Industrial Supplies</option>
                <option value="Food & Beverage">Food & Beverage</option>
                <option value="Other">Other</option>
              </select>
              {errors.industryType && (
                <p className="text-sm text-red-500">{errors.industryType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <select
                id="currency"
                {...register("currency")}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.currency ? "border-red-500" : ""
                }`}
              >
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="JPY">JPY - Japanese Yen</option>
                <option value="CNY">CNY - Chinese Yuan</option>
              </select>
              {errors.currency && (
                <p className="text-sm text-red-500">{errors.currency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>What worries you most? (Select all) *</Label>
              <div className="space-y-3 mt-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    value="Dead inventory taking up space"
                    {...register("concerns")}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm">Dead inventory taking up space</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    value="Products getting damaged"
                    {...register("concerns")}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm">Products getting damaged</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    value="Don't know what's where"
                    {...register("concerns")}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm">Don't know what's where</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    value="Products expiring"
                    {...register("concerns")}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm">Products expiring</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    value="Seasonal overstocking"
                    {...register("concerns")}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm">Seasonal overstocking</span>
                </label>
              </div>
              {errors.concerns && (
                <p className="text-sm text-red-500">{errors.concerns.message}</p>
              )}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminName">Full Name *</Label>
              <Input
                id="adminName"
                placeholder="Enter your full name"
                {...register("adminName")}
                className={errors.adminName ? "border-red-500" : ""}
              />
              {errors.adminName && (
                <p className="text-sm text-red-500">{errors.adminName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email Address *</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="Enter your email address"
                {...register("adminEmail")}
                className={errors.adminEmail ? "border-red-500" : ""}
              />
              {errors.adminEmail && (
                <p className="text-sm text-red-500">{errors.adminEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Password *</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="Create a password (min 6 characters)"
                {...register("adminPassword")}
                className={errors.adminPassword ? "border-red-500" : ""}
              />
              {errors.adminPassword && (
                <p className="text-sm text-red-500">{errors.adminPassword.message}</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {warehouseFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-700">Warehouse {index + 1}</h3>
                  {warehouseFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWarehouse(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      × Remove
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`warehouses.${index}.name`}>Warehouse Name *</Label>
                  <Input
                    id={`warehouses.${index}.name`}
                    placeholder="Enter warehouse name"
                    {...register(`warehouses.${index}.name` as const)}
                    className={errors.warehouses?.[index]?.name ? "border-red-500" : ""}
                  />
                  {errors.warehouses?.[index]?.name && (
                    <p className="text-sm text-red-500">{errors.warehouses[index]?.name?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`warehouses.${index}.street`}>Street Address</Label>
                  <Input
                    id={`warehouses.${index}.street`}
                    placeholder="Enter street address"
                    {...register(`warehouses.${index}.street` as const)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`warehouses.${index}.city`}>City *</Label>
                    <Input
                      id={`warehouses.${index}.city`}
                      placeholder="Enter city"
                      {...register(`warehouses.${index}.city` as const)}
                      className={errors.warehouses?.[index]?.city ? "border-red-500" : ""}
                    />
                    {errors.warehouses?.[index]?.city && (
                      <p className="text-sm text-red-500">{errors.warehouses[index]?.city?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`warehouses.${index}.state`}>State/Province *</Label>
                    <Input
                      id={`warehouses.${index}.state`}
                      placeholder="Enter state or province"
                      {...register(`warehouses.${index}.state` as const)}
                      className={errors.warehouses?.[index]?.state ? "border-red-500" : ""}
                    />
                    {errors.warehouses?.[index]?.state && (
                      <p className="text-sm text-red-500">{errors.warehouses[index]?.state?.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`warehouses.${index}.pin`}>PIN/ZIP Code</Label>
                    <Input
                      id={`warehouses.${index}.pin`}
                      placeholder="Enter postal code"
                      {...register(`warehouses.${index}.pin` as const)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`warehouses.${index}.country`}>Country *</Label>
                    <select
                      id={`warehouses.${index}.country`}
                      {...register(`warehouses.${index}.country` as const)}
                      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                        errors.warehouses?.[index]?.country ? "border-red-500" : ""
                      }`}
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Singapore">Singapore</option>
                      <option value="UAE">UAE</option>
                    </select>
                    {errors.warehouses?.[index]?.country && (
                      <p className="text-sm text-red-500">{errors.warehouses[index]?.country?.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`warehouses.${index}.manager`}>Warehouse Manager (Optional)</Label>
                  <select
                    id={`warehouses.${index}.manager`}
                    {...register(`warehouses.${index}.manager` as const)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Assign later</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`warehouses.${index}.capacity`}>Storage Capacity (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`warehouses.${index}.capacity`}
                      type="number"
                      placeholder="Enter storage capacity"
                      {...register(`warehouses.${index}.capacity` as const, { valueAsNumber: true })}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">units</span>
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                appendWarehouse({
                  name: "",
                  street: "",
                  city: "",
                  state: "",
                  pin: "",
                  country: "India",
                  manager: "",
                  capacity: undefined,
                })
              }
              className="w-full border-dashed"
            >
              + Add Another Warehouse
            </Button>

            {errors.warehouses && (
              <p className="text-sm text-red-500">{errors.warehouses.message}</p>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <HiLightBulb className="text-xl text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Tip: You can add more warehouses later from Settings
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">How would you like to proceed?</h2>
            </div>

            {/* Quick Start Option */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                setupMode === "quick" ? "border-2 border-purple-500 bg-purple-50" : "border-2 border-gray-200"
              }`}
              onClick={() => setSetupMode("quick")}
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <FaRocket className="text-2xl text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Quick Start (Recommended)
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Use smart defaults for your industry ({getValues("industryType")})
                    </p>
                    <ul className="space-y-1.5 text-sm text-gray-700">
                      <li className="flex items-center gap-2">
                        <span className="text-purple-600">•</span>
                        Dead inventory: 180 days
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-600">•</span>
                        Photo verification: Enabled
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-600">•</span>
                        Low stock alerts: Enabled
                      </li>
                    </ul>
                    <Button
                      type="button"
                      className={`mt-4 w-full ${
                        setupMode === "quick" 
                          ? "bg-purple-600 hover:bg-purple-700" 
                          : "bg-gray-600 hover:bg-gray-700"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSetupMode("quick");
                      }}
                    >
                      Use Quick Start →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Setup Option */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                setupMode === "custom" ? "border-2 border-purple-500 bg-purple-50" : "border-2 border-gray-200"
              }`}
              onClick={() => setSetupMode("custom")}
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start gap-4">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <FaCog className="text-2xl text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Custom Setup
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Configure categories and thresholds manually
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className={`mt-4 w-full ${
                        setupMode === "custom" 
                          ? "border-purple-500 text-purple-600 hover:bg-purple-50" 
                          : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSetupMode("custom");
                        setCurrentStep(5);
                      }}
                    >
                      Customize Settings →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <HiLightBulb className="text-xl text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                You can always change these settings later
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                We'll help you organize your inventory. Start by adding product categories. You can add specific products later.
              </p>
            </div>

            {categoryFields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-700">Category {index + 1}</h3>
                  {categoryFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCategory(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      × Remove
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`categories.${index}.name`}>Category Name *</Label>
                  <Input
                    id={`categories.${index}.name`}
                    placeholder="Enter category name"
                    {...register(`categories.${index}.name` as const)}
                    className={errors.categories?.[index]?.name ? "border-red-500" : ""}
                  />
                  {errors.categories?.[index]?.name && (
                    <p className="text-sm text-red-500">{errors.categories[index]?.name?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>What's your main concern?</Label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        value="slow"
                        {...register(`categories.${index}.agingConcern` as const)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <span className="text-sm">Products age slowly (mark dead after 180 days)</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        value="moderate"
                        {...register(`categories.${index}.agingConcern` as const)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <span className="text-sm">Products age moderately (90 days)</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        value="fast"
                        {...register(`categories.${index}.agingConcern` as const)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <span className="text-sm">Products age quickly (60 days)</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        value="expiry"
                        {...register(`categories.${index}.agingConcern` as const)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <span className="text-sm">Products have expiry dates</span>
                    </label>
                  </div>
                  {errors.categories?.[index]?.agingConcern && (
                    <p className="text-sm text-red-500">{errors.categories[index]?.agingConcern?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Are these products fragile?</Label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        value="yes"
                        {...register(`categories.${index}.isFragile` as const)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <span className="text-sm">Yes - Require photo verification</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        value="no"
                        {...register(`categories.${index}.isFragile` as const)}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                  {errors.categories?.[index]?.isFragile && (
                    <p className="text-sm text-red-500">{errors.categories[index]?.isFragile?.message}</p>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                appendCategory({
                  name: "",
                  agingConcern: "moderate",
                  isFragile: "no",
                })
              }
              className="w-full border-dashed"
            >
              + Add Another Category
            </Button>

            {errors.categories && (
              <p className="text-sm text-red-500">{errors.categories.message}</p>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <HiLightBulb className="text-xl text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Don't worry! You'll add specific products (with SKUs, prices) after onboarding
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Success Screen
  if (showSuccess && onboardingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardContent className="pt-12 pb-8 px-8">
            {/* Success Icon */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4">
                <FaCheckCircle className="text-5xl text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Setup Complete! One Last Step...
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed max-w-xl mx-auto">
                To help you get the most out of InsydTracker, let's add your first product. 
                This will take just 2 minutes.
              </p>
            </div>

            {/* Benefits Box */}
            <Card className="mb-8 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-800">Why add a product now?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">See how aging tracking works immediately</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Understand photo verification process</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Get your first insights tomorrow morning</span>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="px-8 text-gray-600 hover:text-gray-800"
              >
                Skip for now
              </Button>
              <Button
                onClick={() => router.push("/dashboard/products/new")}
                className="px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Add First Product →
              </Button>
            </div>

            {/* Friendly Note */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <HiLightBulb className="text-lg text-yellow-500" />
              <span>Takes only 2 minutes, we promise!</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to InsydTracker</h1>
          <p className="text-gray-600">Let's set up your inventory management system</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className={`flex-1 text-center ${
                  step.number === currentStep
                    ? "text-purple-600 font-semibold"
                    : step.number < currentStep
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                <div className="text-sm">Step {step.number}</div>
                <div className="text-xs">{step.title}</div>
              </div>
            ))}
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              {renderStepContent()}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={currentStep === 1 ? "invisible" : ""}
                >
                  Back
                </Button>

                {currentStep < STEPS.length ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {currentStep === 4 && setupMode === "quick" ? "Complete Setup" : "Next"}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isSubmitting ? "Setting up..." : "Complete Setup"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Need help? Contact support@insydtracker.com</p>
        </div>
      </div>
    </div>
  );
}
