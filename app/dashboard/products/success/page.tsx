"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaCheckCircle, FaBox, FaWarehouse, FaCubes, FaClock, FaRupeeSign } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";
import { MdNotifications } from "react-icons/md";

interface ProductData {
  _id: string;
  name: string;
  sku: string;
  unitPrice: number;
  unitType: string;
  stock?: {
    warehouseName: string;
    quantity: number;
    ageInDays: number;
    status: "healthy" | "at_risk" | "dead";
  };
}

function ProductSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId");
  
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      router.push("/dashboard");
      return;
    }

    const fetchProductDetails = async () => {
      try {
        const response = await fetch(`/api/products/${productId}/details`);
        if (response.ok) {
          const data = await response.json();
          setProduct(data.product);
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [productId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return { text: "Healthy", color: "text-green-600 bg-green-100" };
      case "at_risk":
        return { text: "⚠️ At Risk", color: "text-orange-600 bg-orange-100" };
      case "dead":
        return { text: "❌ Dead Stock", color: "text-red-600 bg-red-100" };
      default:
        return { text: "Unknown", color: "text-gray-600 bg-gray-100" };
    }
  };

  const totalValue = product.stock
    ? product.unitPrice * product.stock.quantity
    : 0;

  const statusBadge = product.stock ? getStatusBadge(product.stock.status) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardContent className="pt-12 pb-8 px-8">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full mb-4">
              <HiSparkles className="text-5xl text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Perfect! Your First Product is Live
            </h1>
          </div>

          {/* Product Summary Card */}
          <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FaBox className="text-xl text-purple-600" />
                  <div>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                  </div>
                </div>

                {product.stock && (
                  <>
                    <div className="flex items-center gap-3">
                      <FaWarehouse className="text-xl text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Warehouse:</p>
                        <p className="font-medium text-gray-900">{product.stock.warehouseName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <FaCubes className="text-xl text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Quantity:</p>
                        <p className="font-medium text-gray-900">
                          {product.stock.quantity} {product.unitType}s
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <FaClock className="text-xl text-orange-600" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Age:</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {product.stock.ageInDays} days
                          </p>
                          {statusBadge && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge.color}`}>
                              {statusBadge.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <FaRupeeSign className="text-xl text-emerald-600" />
                      <div>
                        <p className="text-sm text-gray-600">Value:</p>
                        <p className="font-medium text-gray-900">
                          ₹{totalValue.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alert Notification */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <MdNotifications className="text-2xl text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              You'll receive your first alert tomorrow at 6 AM if any action is needed on this product.
            </p>
          </div>

          {/* Next Steps */}
          <Card className="mb-8 border-2 border-gray-200">
            <CardContent className="pt-6">
              <p className="font-semibold text-gray-900 mb-4">What would you like to do next?</p>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                  <span className="text-purple-600">→</span>
                  <span>Add more products (Recommended)</span>
                </div>
                <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                  <span className="text-purple-600">→</span>
                  <span>View dashboard</span>
                </div>
                <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                  <span className="text-purple-600">→</span>
                  <span>Take a product tour</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push("/dashboard/products/new")}
              className="px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Add Another Product
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="px-8"
            >
              Go to Dashboard →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProductSuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>}>
      <ProductSuccessContent />
    </Suspense>
  );
}
