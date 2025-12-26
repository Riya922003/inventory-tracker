"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FaArrowLeft,
  FaArrowRight,
  FaSearch,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaCamera,
  FaExchangeAlt,
} from "react-icons/fa";

interface Stock {
  _id: string;
  productId: {
    _id: string;
    name: string;
    sku: string;
    unitPrice: number;
  };
  batchId: string;
  quantityAvailable: number;
  ageInDays: number;
  status: "healthy" | "at_risk" | "dead";
}

interface Warehouse {
  _id: string;
  name: string;
  capacity: number;
}

export default function StockTransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceWarehouseId = searchParams.get("warehouseId");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Product Selection
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  // Step 2: Transfer Details
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [fromWarehouse, setFromWarehouse] = useState(sourceWarehouseId || "");
  const [toWarehouse, setToWarehouse] = useState("");
  const [quantity, setQuantity] = useState("");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");

  // Step 3: Photo Verification
  const [exitPhoto, setExitPhoto] = useState("");
  const [entryPhoto, setEntryPhoto] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = stocks.filter(
        (stock) =>
          stock.productId.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stock.productId.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStocks(filtered);
    } else {
      setFilteredStocks(stocks);
    }
  }, [searchQuery, stocks]);

  const fetchData = async () => {
    try {
      const [warehousesRes, stocksRes] = await Promise.all([
        fetch("/api/warehouses", { credentials: "include" }),
        sourceWarehouseId
          ? fetch(`/api/stock/entry?warehouseId=${sourceWarehouseId}`, {
              credentials: "include",
            })
          : Promise.resolve({ ok: true, json: async () => ({ stocks: [] }) }),
      ]);

      if (warehousesRes.ok) {
        const data = await warehousesRes.json();
        setWarehouses(data.warehouses || []);
      }

      if (stocksRes.ok) {
        const data = await stocksRes.json();
        setStocks(data.stocks || []);
        setFilteredStocks(data.stocks || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "exit" | "entry"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === "exit") {
        setExitPhoto(base64);
      } else {
        setEntryPhoto(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedStock || !fromWarehouse || !toWarehouse || !quantity) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!exitPhoto) {
      toast.error("Exit photo is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/stock/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          stockId: selectedStock._id,
          fromWarehouseId: fromWarehouse,
          toWarehouseId: toWarehouse,
          quantity: parseInt(quantity),
          transferDate,
          reason,
          vehicleNumber,
          driverName,
          expectedDelivery,
          exitPhoto,
          entryPhoto,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Stock transferred successfully!");
        router.push("/dashboard/warehouses");
      } else {
        toast.error(result.error || "Failed to transfer stock");
      }
    } catch (error) {
      console.error("Error transferring stock:", error);
      toast.error("Failed to transfer stock");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <FaCheckCircle className="text-green-600" />;
      case "at_risk":
        return <FaExclamationTriangle className="text-orange-600" />;
      case "dead":
        return <FaExclamationTriangle className="text-red-600" />;
      default:
        return null;
    }
  };

  const formatValue = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const getDestinationWarehouseInfo = () => {
    const warehouse = warehouses.find((w) => w._id === toWarehouse);
    if (!warehouse) return null;

    const warehouseStocks = stocks.filter((s) => s._id === warehouse._id);
    const currentStock = warehouseStocks.reduce(
      (sum, s) => sum + s.quantityAvailable,
      0
    );
    const availableCapacity = warehouse.capacity - currentStock;

    return { warehouse, currentStock, availableCapacity };
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading...</p>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Transfer Stock Between Warehouses
            </h1>
            <p className="text-gray-600 mt-1">Step {step}/3</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              1
            </div>
            <div className="w-12 h-1 bg-gray-200">
              <div
                className={`h-full ${
                  step >= 2 ? "bg-purple-600" : "bg-gray-200"
                }`}
              />
            </div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              2
            </div>
            <div className="w-12 h-1 bg-gray-200">
              <div
                className={`h-full ${
                  step >= 3 ? "bg-purple-600" : "bg-gray-200"
                }`}
              />
            </div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              3
            </div>
          </div>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>
            {step === 1 && "Select Product to Transfer"}
            {step === 2 && "Transfer Details"}
            {step === 3 && "Photo Verification"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Product Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="search">Select Product to Transfer *</Label>
                <div className="relative mt-2">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Available Products at Source Warehouse:
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredStocks.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">
                      No products available for transfer
                    </p>
                  ) : (
                    filteredStocks.map((stock) => (
                      <div
                        key={stock._id}
                        onClick={() => setSelectedStock(stock)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedStock?._id === stock._id
                            ? "border-purple-600 bg-purple-50"
                            : "border-gray-200 hover:border-purple-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {selectedStock?._id === stock._id ? (
                                <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {stock.productId.name} ({stock.productId.sku})
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Available: {stock.quantityAvailable} units •{" "}
                                {formatValue(
                                  stock.quantityAvailable *
                                    stock.productId.unitPrice
                                )}{" "}
                                value
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="text-gray-600">
                                  Age: {stock.ageInDays} days
                                </span>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(stock.status)}
                                  <span
                                    className={
                                      stock.status === "healthy"
                                        ? "text-green-600"
                                        : stock.status === "at_risk"
                                        ? "text-orange-600"
                                        : "text-red-600"
                                    }
                                  >
                                    {stock.status === "healthy"
                                      ? "Healthy"
                                      : stock.status === "at_risk"
                                      ? "At Risk"
                                      : "Dead"}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/warehouses")}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedStock}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Continue
                  <FaArrowRight className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Transfer Details */}
          {step === 2 && selectedStock && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Product:</p>
                <p className="font-semibold text-gray-900">
                  {selectedStock.productId.name} ({selectedStock.productId.sku})
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Available: {selectedStock.quantityAvailable} units
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fromWarehouse">From Warehouse *</Label>
                  <select
                    id="fromWarehouse"
                    value={fromWarehouse}
                    onChange={(e) => setFromWarehouse(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  {fromWarehouse && (
                    <p className="text-xs text-gray-500">
                      Current Stock: {selectedStock.quantityAvailable} units
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="toWarehouse">To Warehouse *</Label>
                  <select
                    id="toWarehouse"
                    value={toWarehouse}
                    onChange={(e) => setToWarehouse(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select warehouse</option>
                    {warehouses
                      .filter((w) => w._id !== fromWarehouse)
                      .map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.name}
                        </option>
                      ))}
                  </select>
                  {toWarehouse && getDestinationWarehouseInfo() && (
                    <div className="text-xs text-gray-500">
                      <p>
                        Current Stock:{" "}
                        {getDestinationWarehouseInfo()?.currentStock} units
                      </p>
                      <p>
                        Available Capacity:{" "}
                        {getDestinationWarehouseInfo()?.availableCapacity} units
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity to Transfer *</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    max={selectedStock.quantityAvailable}
                  />
                  <span className="text-gray-600">units</span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  💡 Max: {selectedStock.quantityAvailable} units available
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferDate">Transfer Date</Label>
                <Input
                  id="transferDate"
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Transfer (Optional)</Label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Rebalancing inventory - Bangalore needs more stock"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                <h3 className="font-semibold text-gray-900">
                  Transport Details (Optional)
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                    <Input
                      id="vehicleNumber"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="KA-01-AB-5678"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driverName">Driver Name</Label>
                    <Input
                      id="driverName"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Ramesh Kumar"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedDelivery">Expected Delivery</Label>
                  <Input
                    id="expectedDelivery"
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <FaArrowLeft className="mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!fromWarehouse || !toWarehouse || !quantity}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Continue
                  <FaArrowRight className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Photo Verification */}
          {step === 3 && selectedStock && (
            <div className="space-y-6">
              <div>
                <Label>Upload Exit Photo (From Source) *</Label>
                <div className="mt-2">
                  {exitPhoto ? (
                    <div className="relative">
                      <img
                        src={exitPhoto}
                        alt="Exit"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setExitPhoto("")}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                      <FaCamera className="text-4xl text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload or drag & drop image here
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "exit")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  💡 Photo of goods before loading for transport
                </p>
              </div>

              <div>
                <Label>Upload Entry Photo (To Destination) - Optional</Label>
                <div className="mt-2">
                  {entryPhoto ? (
                    <div className="relative">
                      <img
                        src={entryPhoto}
                        alt="Entry"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setEntryPhoto("")}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                      <FaCamera className="text-4xl text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload or drag & drop image here
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "entry")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  💡 Photo after goods received (can be added later)
                </p>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FaExchangeAlt className="text-purple-600" />
                  Transfer Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product:</span>
                    <span className="font-medium text-gray-900">
                      {selectedStock.productId.name} (
                      {selectedStock.productId.sku})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium text-gray-900">
                      {quantity} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">From:</span>
                    <span className="font-medium text-gray-900">
                      {warehouses.find((w) => w._id === fromWarehouse)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">To:</span>
                    <span className="font-medium text-gray-900">
                      {warehouses.find((w) => w._id === toWarehouse)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transfer Date:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(transferDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-purple-200">
                    <span className="text-gray-600">Value:</span>
                    <span className="font-bold text-gray-900">
                      {formatValue(
                        parseInt(quantity || "0") *
                          selectedStock.productId.unitPrice
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <FaArrowLeft className="mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !exitPhoto}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {submitting ? "Processing..." : "Complete Transfer"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
