"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FaSearch,
  FaPlus,
  FaBox,
  FaWarehouse,
  FaCalendar,
  FaImage,
} from "react-icons/fa";

interface StockEntry {
  _id: string;
  batchId: string;
  productId: {
    _id: string;
    name: string;
    sku: string;
    unitType: string;
  };
  warehouseId: {
    _id: string;
    name: string;
  };
  createdBy: {
    _id: string;
    name: string;
  };
  quantityReceived: number;
  quantityAvailable: number;
  quantityDamaged: number;
  entryDate: string;
  expiryDate: string | null;
  ageInDays: number;
  status: "healthy" | "at_risk" | "dead";
  entryPhotos: Array<{
    url: string;
    uploadedBy: string;
    timestamp: string;
  }>;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface Warehouse {
  _id: string;
  name: string;
}

export default function StockPage() {
  const router = useRouter();
  const [stocks, setStocks] = useState<StockEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Filters
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  
  // Photo modal
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user.role);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    fetchStocks();
    fetchProducts();
    if (userRole === "super_admin") {
      fetchWarehouses();
    }
  }, [selectedProduct, selectedWarehouse, userRole]);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedProduct) params.append("productId", selectedProduct);
      if (selectedWarehouse) params.append("warehouseId", selectedWarehouse);

      const response = await fetch(`/api/stock/entry?${params.toString()}`, {
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.href = "/";
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setStocks(data.stocks || []);
      }
    } catch (error) {
      console.error("Error fetching stocks:", error);
      toast.error("Failed to load stock entries");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?status=active", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
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
    }
  };

  const clearFilters = () => {
    setSelectedProduct("");
    setSelectedWarehouse("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
            Healthy
          </span>
        );
      case "at_risk":
        return (
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
            At Risk
          </span>
        );
      case "dead":
        return (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
            Dead Stock
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-600 mt-1">Track and manage your inventory stock</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push("/dashboard/stock/exit")}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <FaPlus className="mr-2" />
            Record Exit
          </Button>
          <Button
            onClick={() => router.push("/dashboard/stock/entry")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <FaPlus className="mr-2" />
            Record Entry
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className={`grid grid-cols-1 ${userRole === "super_admin" ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
            {/* Product Filter */}
            <div>
              <Label htmlFor="product">Filter by Product</Label>
              <select
                id="product"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Warehouse Filter - Only for Super Admin */}
            {userRole === "super_admin" && (
              <div>
                <Label htmlFor="warehouse">Filter by Warehouse</Label>
                <select
                  id="warehouse"
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Entries ({stocks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading stock entries...</p>
            </div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-12">
              <FaBox className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No stock entries found</p>
              <Button
                onClick={() => router.push("/dashboard/stock/entry")}
                className="bg-gradient-to-r from-purple-600 to-blue-600"
              >
                <FaPlus className="mr-2" />
                Record Your First Stock Entry
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {stocks.map((stock) => (
                <Card key={stock._id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Product Info */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Product</p>
                        <p className="font-semibold text-gray-900">
                          {stock.productId.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          SKU: {stock.productId.sku}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Batch: {stock.batchId}
                        </p>
                      </div>

                      {/* Warehouse & Quantity */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Location & Quantity</p>
                        <div className="flex items-center gap-2 mb-2">
                          <FaWarehouse className="text-purple-600" />
                          <p className="text-sm font-medium">
                            {stock.warehouseId.name}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700">
                          Available:{" "}
                          <span className="font-semibold">
                            {stock.quantityAvailable}
                          </span>{" "}
                          / {stock.quantityReceived}{" "}
                          <span className="capitalize">{stock.productId.unitType}s</span>
                        </p>
                        {stock.quantityDamaged > 0 && (
                          <p className="text-sm text-red-600">
                            Damaged: {stock.quantityDamaged}
                          </p>
                        )}
                      </div>

                      {/* Dates & Status */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Dates & Status</p>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-700">
                            Entry: {formatDate(stock.entryDate)}
                          </p>
                          {stock.expiryDate && (
                            <p className="text-sm text-gray-700">
                              Expiry: {formatDate(stock.expiryDate)}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            Age: {stock.ageInDays} days
                          </p>
                          <div className="mt-2">{getStatusBadge(stock.status)}</div>
                        </div>
                      </div>

                      {/* Photo & Actions */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Entry Photo</p>
                        {stock.entryPhotos.length > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedPhoto(stock.entryPhotos[0].url);
                              setPhotoModalOpen(true);
                            }}
                            className="relative group"
                          >
                            <img
                              src={stock.entryPhotos[0].url}
                              alt="Entry"
                              className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 group-hover:border-purple-500 transition-colors"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                              <FaImage className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            <FaImage className="text-gray-400" />
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          By: {stock.createdBy.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {photoModalOpen && selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setPhotoModalOpen(false);
            setSelectedPhoto(null);
          }}
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img
              src={selectedPhoto}
              alt="Stock entry"
              className="max-w-full max-h-[90vh] rounded-lg"
            />
            <Button
              variant="outline"
              className="absolute top-4 right-4 bg-white"
              onClick={() => {
                setPhotoModalOpen(false);
                setSelectedPhoto(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
