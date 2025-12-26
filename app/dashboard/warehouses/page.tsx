"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FaWarehouse,
  FaPlus,
  FaEdit,
  FaExchangeAlt,
  FaChartBar,
  FaExclamationTriangle,
  FaCheckCircle,
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
  metrics: {
    productCount: number;
    totalValue: number;
    totalQuantity: number;
    utilization: number;
    atRiskCount: number;
    deadCount: number;
    lastActivity: string;
    weeklyMovements: number;
  };
}

export default function WarehousesPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await fetch("/api/warehouses", {
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.href = "/";
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.warehouses || []);
      } else {
        toast.error("Failed to load warehouses");
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      toast.error("Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return "bg-red-500";
    if (utilization >= 70) return "bg-orange-500";
    if (utilization >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getUtilizationStatus = (utilization: number) => {
    if (utilization >= 90)
      return { text: "Critical Capacity", icon: FaExclamationTriangle, color: "text-red-600" };
    if (utilization >= 70)
      return { text: "High Occupancy", icon: FaExclamationTriangle, color: "text-orange-600" };
    return { text: "Active", icon: FaCheckCircle, color: "text-green-600" };
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading warehouses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-600 mt-1">Manage your storage locations</p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/warehouses/new")}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <FaPlus className="mr-2" />
          Add Warehouse
        </Button>
      </div>

      {/* Warehouses List */}
      {warehouses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FaWarehouse className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No warehouses yet
            </h3>
            <p className="text-gray-600 mb-6">
              Add your first warehouse to start managing inventory
            </p>
            <Button
              onClick={() => router.push("/dashboard/warehouses/new")}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <FaPlus className="mr-2" />
              Add Warehouse
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {warehouses.map((warehouse) => {
            const status = getUtilizationStatus(warehouse.metrics.utilization);
            const StatusIcon = status.icon;

            return (
              <Card key={warehouse._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Warehouse Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
                          <FaWarehouse className="text-2xl text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {warehouse.name}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3">
                            {warehouse.address.street && `${warehouse.address.street}, `}
                            {warehouse.address.city}, {warehouse.address.state}
                            {warehouse.address.pin && ` - ${warehouse.address.pin}`}
                          </p>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-500">Inventory</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {warehouse.metrics.productCount} products •{" "}
                                {formatValue(warehouse.metrics.totalValue)} value
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Manager</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {warehouse.manager?.name || "Not assigned"}
                              </p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <FaChartBar className="text-purple-600" />
                              <span className="font-semibold text-gray-900">
                                Performance
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Health Status</p>
                                <p className="font-semibold text-gray-900">
                                  {warehouse.metrics.atRiskCount} at risk,{" "}
                                  {warehouse.metrics.deadCount} dead
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Last Activity</p>
                                <p className="font-semibold text-gray-900">
                                  {formatDate(warehouse.metrics.lastActivity)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">This Week</p>
                                <p className="font-semibold text-gray-900">
                                  {warehouse.metrics.weeklyMovements} movements
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Metrics & Actions */}
                    <div className="space-y-4">
                      {/* Utilization */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Utilization
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {warehouse.metrics.utilization}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full ${getUtilizationColor(
                              warehouse.metrics.utilization
                            )} transition-all duration-300`}
                            style={{ width: `${warehouse.metrics.utilization}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {warehouse.metrics.totalQuantity} / {warehouse.capacity} units
                        </p>
                      </div>

                      {/* Status */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Status</p>
                        <div className={`flex items-center gap-2 ${status.color}`}>
                          <StatusIcon />
                          <span className="font-semibold">{status.text}</span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Quick Actions
                        </p>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() =>
                              router.push(`/dashboard/warehouses/${warehouse._id}`)
                            }
                          >
                            <FaChartBar className="mr-2" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() =>
                              router.push(`/dashboard/warehouses/${warehouse._id}/edit`)
                            }
                          >
                            <FaEdit className="mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() =>
                              router.push(
                                `/dashboard/stock/transfer?warehouseId=${warehouse._id}`
                              )
                            }
                          >
                            <FaExchangeAlt className="mr-2" />
                            {warehouse.manager ? "Transfer Stock" : "Assign Manager"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
