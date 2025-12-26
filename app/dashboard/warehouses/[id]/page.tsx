"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FaArrowLeft,
  FaEdit,
  FaWarehouse,
  FaBox,
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTrash,
  FaMapMarkerAlt,
  FaUser,
  FaPlus,
  FaExchangeAlt,
  FaPhone,
  FaCalendar,
  FaBoxOpen,
  FaTruck,
  FaClock,
  FaEllipsisV,
} from "react-icons/fa";

interface Warehouse {
  _id: string;
  name: string;
  address: {
    street?: string;
    city: string;
    state: string;
    pin?: string;
    country: string;
  };
  manager?: {
    _id: string;
    name: string;
    email: string;
  };
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

interface Stock {
  _id: string;
  productId: {
    _id: string;
    name: string;
    sku: string;
    unitPrice: number;
    unitType: string;
  };
  batchId: string;
  quantityAvailable: number;
  ageInDays: number;
  status: "healthy" | "at_risk" | "dead";
  entryDate: string;
}

interface Movement {
  _id: string;
  movementType: "in" | "out" | "transfer" | "damage" | "adjustment";
  quantity: number;
  productId: {
    name: string;
  };
  performedBy: {
    name: string;
  };
  timestamp: string;
  reason: string;
}

export default function WarehouseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const warehouseId = params.id as string;

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWarehouseDetails();
  }, [warehouseId]);

  const fetchWarehouseDetails = async () => {
    try {
      const [warehouseRes, stocksRes] = await Promise.all([
        fetch(`/api/warehouses/${warehouseId}`, { credentials: "include" }),
        fetch(`/api/stock/entry?warehouseId=${warehouseId}`, {
          credentials: "include",
        }),
      ]);

      if (warehouseRes.status === 401) {
        window.location.href = "/";
        return;
      }

      if (warehouseRes.ok) {
        const warehouseData = await warehouseRes.json();
        setWarehouse(warehouseData.warehouse);
      }

      if (stocksRes.ok) {
        const stocksData = await stocksRes.json();
        setStocks(stocksData.stocks || []);
      }

      // Fetch recent movements
      fetchRecentMovements();
    } catch (error) {
      console.error("Error fetching warehouse details:", error);
      toast.error("Failed to load warehouse details");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentMovements = async () => {
    try {
      // This would need a new API endpoint or filter on existing
      // For now, we'll simulate with stock entry data
      const response = await fetch(`/api/stock/entry?warehouseId=${warehouseId}&limit=5`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        // Transform stock entries to movement format
        const mockMovements = (data.stocks || []).slice(0, 5).map((stock: any) => ({
          _id: stock._id,
          movementType: "in",
          quantity: stock.quantityReceived,
          productId: stock.productId,
          performedBy: stock.createdBy,
          timestamp: stock.entryDate,
          reason: "Stock received",
        }));
        setMovements(mockMovements);
      }
    } catch (error) {
      console.error("Error fetching movements:", error);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/warehouses/${warehouseId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Warehouse deleted successfully!");
        router.push("/dashboard/warehouses");
      } else {
        toast.error(result.error || "Failed to delete warehouse");
      }
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      toast.error("Failed to delete warehouse");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading warehouse details...</p>
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Warehouse not found</p>
          <Button
            onClick={() => router.push("/dashboard/warehouses")}
            className="mt-4"
          >
            Back to Warehouses
          </Button>
        </div>
      </div>
    );
  }

  const totalQuantity = stocks.reduce((sum, s) => sum + s.quantityAvailable, 0);
  const totalValue = stocks.reduce(
    (sum, s) => sum + s.quantityAvailable * s.productId.unitPrice,
    0
  );
  const uniqueProducts = new Set(stocks.map((s) => s.productId._id)).size;
  const utilization = Math.min(
    Math.round((totalQuantity / warehouse.capacity) * 100),
    100
  );
  const availableSpace = warehouse.capacity - totalQuantity;
  const healthyCount = stocks.filter((s) => s.status === "healthy").length;
  const atRiskCount = stocks.filter((s) => s.status === "at_risk").length;
  const deadCount = stocks.filter((s) => s.status === "dead").length;

  // Calculate 30-day metrics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentStocks = stocks.filter(
    (s) => new Date(s.entryDate) >= thirtyDaysAgo
  );
  const stockReceived = recentStocks.reduce((sum, s) => sum + s.quantityAvailable, 0);
  const stockMovements = movements.length;

  const formatValue = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const getUtilizationColor = (util: number) => {
    if (util >= 90) return "bg-red-500";
    if (util >= 70) return "bg-orange-500";
    if (util >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      healthy: "bg-green-100 text-green-800",
      at_risk: "bg-orange-100 text-orange-800",
      dead: "bg-red-100 text-red-800",
    };
    return styles[status as keyof typeof styles] || styles.healthy;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "in":
        return "📦";
      case "out":
        return "📤";
      case "transfer":
        return "🔄";
      case "damage":
        return "⚠️";
      default:
        return "📋";
    }
  };

  const getMovementText = (movement: Movement) => {
    const action = movement.movementType === "in" ? "received" : "dispatched";
    return `${movement.quantity} ${movement.productId.name} ${action}`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/warehouses")}
          className="mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Back to Warehouses
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
                <FaWarehouse className="text-2xl text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {warehouse.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-gray-600 ml-14">
              <FaMapMarkerAlt />
              <span>
                {warehouse.address.city}, {warehouse.address.state}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/warehouses/${warehouseId}/edit`)
              }
            >
              <FaEdit className="mr-2" />
              Edit
            </Button>
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                <FaEllipsisV />
              </Button>
              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 rounded-lg"
                  >
                    <FaTrash className="inline mr-2" />
                    Delete Warehouse
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Products</p>
              <p className="text-3xl font-bold text-gray-900">{uniqueProducts}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Total Value</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatValue(totalValue)}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Capacity</p>
              <p className="text-3xl font-bold text-gray-900">
                {warehouse.capacity}
              </p>
              <p className="text-xs text-gray-500 mt-1">units</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Occupancy</p>
              <p className="text-3xl font-bold text-gray-900">{utilization}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-full ${getUtilizationColor(
                    utilization
                  )} rounded-full transition-all`}
                  style={{ width: `${utilization}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warehouse Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Warehouse Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Address */}
          <div>
            <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
              <FaMapMarkerAlt className="text-purple-600" />
              <span>Address</span>
            </div>
            <div className="ml-6 text-gray-600">
              {warehouse.address.street && (
                <p>{warehouse.address.street}</p>
              )}
              <p>
                {warehouse.address.city}, {warehouse.address.state}
                {warehouse.address.pin && `, ${warehouse.address.pin}`}
              </p>
              <p>{warehouse.address.country}</p>
            </div>
          </div>

          {/* Manager */}
          <div>
            <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
              <FaUser className="text-purple-600" />
              <span>Warehouse Manager</span>
            </div>
            <div className="ml-6 text-gray-600">
              {warehouse.manager ? (
                <>
                  <p className="font-medium text-gray-900">
                    {warehouse.manager.name} ({warehouse.manager.email})
                  </p>
                  <p className="text-sm flex items-center gap-2 mt-1">
                    <FaPhone className="text-gray-400" />
                    <span>+91 98765 43210</span>
                  </p>
                </>
              ) : (
                <p className="text-gray-500 italic">No manager assigned</p>
              )}
            </div>
          </div>

          {/* Storage Information */}
          <div>
            <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
              <FaBoxOpen className="text-purple-600" />
              <span>Storage Information</span>
            </div>
            <div className="ml-6 text-gray-600 space-y-1">
              <p>Capacity: {warehouse.capacity} units</p>
              <p>Current Stock: {totalQuantity} units</p>
              <p>Available Space: {availableSpace} units</p>
            </div>
          </div>

          {/* Dates */}
          <div>
            <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2">
              <FaCalendar className="text-purple-600" />
              <span>Timeline</span>
            </div>
            <div className="ml-6 text-gray-600 space-y-1">
              <p>Created: {formatDate(warehouse.createdAt)}</p>
              <p>Last Updated: {formatDate(warehouse.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock List */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Inventory at This Location ({stocks.length} items)</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/stock/entry")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <FaPlus className="mr-2" />
                Add Stock
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(
                    `/dashboard/stock/transfer?warehouseId=${warehouseId}`
                  )
                }
              >
                <FaExchangeAlt className="mr-2" />
                Transfer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stocks.length === 0 ? (
            <div className="text-center py-12">
              <FaBox className="mx-auto text-6xl text-gray-300 mb-4" />
              <p className="text-gray-600">No stock in this warehouse yet</p>
              <Button
                onClick={() => router.push("/dashboard/stock/entry")}
                className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <FaPlus className="mr-2" />
                Add Stock
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Product Name
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      SKU
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      Qty
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      Age
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock) => (
                    <tr key={stock._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">
                          {stock.productId.name}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-sm">
                        {stock.productId.sku}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-semibold text-gray-900">
                          {stock.quantityAvailable}
                        </p>
                        <p className="text-xs text-gray-500">
                          {stock.productId.unitType}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {stock.ageInDays}d
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                            stock.status
                          )}`}
                        >
                          {stock.status === "healthy" && "✅"}
                          {stock.status === "at_risk" && "⚠️"}
                          {stock.status === "dead" && "❌"}
                          {stock.status === "healthy" ? "Good" : stock.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        {formatValue(
                          stock.quantityAvailable * stock.productId.unitPrice
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Activity at This Warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          ) : (
            <div className="space-y-3">
              {movements.map((movement) => (
                <div
                  key={movement._id}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="text-2xl">{getMovementIcon(movement.movementType)}</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Stock {movement.movementType === "in" ? "Added" : "Removed"}:{" "}
                      {getMovementText(movement)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDateTime(movement.timestamp)} • By{" "}
                      {movement.performedBy?.name || "System"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Performance Metrics (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaTruck className="text-xl text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Stock Received</p>
                <p className="text-xl font-bold text-gray-900">
                  {stockReceived} units
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaBoxOpen className="text-xl text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Stock Dispatched</p>
                <p className="text-xl font-bold text-gray-900">0 units</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaExchangeAlt className="text-xl text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Stock Movements</p>
                <p className="text-xl font-bold text-gray-900">{stockMovements}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <FaClock className="text-xl text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Fulfillment</p>
                <p className="text-xl font-bold text-gray-900">N/A</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inventory Turnover</p>
                <p className="text-2xl font-bold text-gray-900">0x</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  Calculated as: Stock Dispatched / Average Inventory
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">Delete Warehouse</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this warehouse? This action cannot
                be undone. You can only delete warehouses with no active stock.
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
