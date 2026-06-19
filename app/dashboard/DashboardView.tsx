"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FaBox,
  FaWarehouse,
  FaRupeeSign,
  FaExclamationTriangle,
  FaExclamationCircle,
} from "react-icons/fa";
import { MdPlayCircleOutline } from "react-icons/md";
import { HiTrendingUp } from "react-icons/hi";
import type { DashboardData } from "@/lib/dashboard-data";

interface DashboardViewProps {
  data: DashboardData;
  initialError: string | null;
}

export default function DashboardView({
  data,
  initialError,
}: DashboardViewProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError);

  const { stats, warehouses, alerts, activities } = data;

  // Clear the ?error=... query param from the URL without a page reload
  useEffect(() => {
    if (initialError) {
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [initialError]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (stats.totalProducts === 0) {
    return (
      <div className="p-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
            <div className="flex items-center gap-2">
              <FaExclamationCircle className="text-red-600" />
              <span className="text-sm font-medium text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome to your inventory management system
          </p>
        </div>

        <Card className="mb-8 border-2 border-dashed border-gray-300 bg-white">
          <CardContent className="py-16 text-center">
            <div className="mb-6">
              <FaBox className="text-6xl text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Your Inventory Tracker is Ready!
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto mb-6">
                Start tracking by adding your first product. It takes just 2
                minutes and you&apos;ll immediately see how aging alerts and
                photo verification work.
              </p>
            </div>
            <Button
              onClick={() => router.push("/dashboard/products/new")}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 mb-4"
            >
              + Add Your First Product
            </Button>
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <MdPlayCircleOutline className="text-lg" />
              or watch a quick demo
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">₹0</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">
                Warehouses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {warehouses.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">No activity yet</p>
              <p className="text-sm text-gray-400">
                Products you add will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Full dashboard ────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaExclamationCircle className="text-red-600" />
              <span className="text-sm font-medium text-red-800">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your inventory</p>
      </div>

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaExclamationTriangle className="text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                {alerts.length} alerts need attention
              </span>
            </div>
            <Button variant="outline" size="sm">
              View All Alerts →
            </Button>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Products</p>
                <FaBox className="text-purple-600 text-xl" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {stats.totalProducts}
              </p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <HiTrendingUp /> {stats.weeklyChange} this week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Value</p>
                <FaRupeeSign className="text-blue-600 text-xl" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                ₹{(stats.totalValue / 100000).toFixed(1)}L
              </p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <HiTrendingUp /> ₹{(stats.valueAdded / 100000).toFixed(1)}L
                added
              </p>
            </CardContent>
          </Card>

          <Card className={`hover:shadow-lg transition-shadow ${stats.deadStock.count > 0 ? "bg-red-50 border-red-200" : "bg-white"}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm ${stats.deadStock.count > 0 ? "text-red-700" : "text-gray-600"}`}>Dead Stock</p>
                <FaExclamationCircle className={`text-xl ${stats.deadStock.count > 0 ? "text-red-600" : "text-gray-400"}`} />
              </div>
              <p className={`text-3xl font-bold mb-1 ${stats.deadStock.count > 0 ? "text-red-900" : "text-gray-900"}`}>
                {stats.deadStock.count}{" "}
                <span className="text-base">
                  (₹{(stats.deadStock.value / 100000).toFixed(0)}L)
                </span>
              </p>
              <p className={`text-xs font-medium ${stats.deadStock.count > 0 ? "text-red-600" : "text-gray-400"}`}>
                {stats.deadStock.count > 0 ? "Action needed" : "No dead stock"}
              </p>
            </CardContent>
          </Card>

          <Card className={`hover:shadow-lg transition-shadow ${stats.atRisk.count > 0 ? "bg-orange-50 border-orange-200" : "bg-white"}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm ${stats.atRisk.count > 0 ? "text-orange-700" : "text-gray-600"}`}>At Risk</p>
                <FaExclamationTriangle className={`text-xl ${stats.atRisk.count > 0 ? "text-orange-600" : "text-gray-400"}`} />
              </div>
              <p className={`text-3xl font-bold mb-1 ${stats.atRisk.count > 0 ? "text-orange-900" : "text-gray-900"}`}>
                {stats.atRisk.count}{" "}
                <span className="text-base">
                  (₹{(stats.atRisk.value / 100000).toFixed(0)}L)
                </span>
              </p>
              <p className={`text-xs font-medium ${stats.atRisk.count > 0 ? "text-orange-600" : "text-gray-400"}`}>
                {stats.atRisk.count > 0 ? "Watch closely" : "All healthy"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Warehouse Snapshot */}
      <Card className="mb-8 bg-white">
        <CardHeader>
          <CardTitle>Warehouse Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {warehouses.map((warehouse) => (
              <div
                key={warehouse._id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FaWarehouse className="text-purple-600 text-xl" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {warehouse.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {warehouse.productsCount} products, ₹
                        {(warehouse.totalValue / 100000).toFixed(1)}L
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                          style={{ width: `${Math.max(warehouse.capacityUsed, 3)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {warehouse.capacityUsed}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {warehouse.atRiskCount} at risk,{" "}
                      {warehouse.deadStockCount} dead
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/dashboard/warehouses/${warehouse._id}`)
                    }
                  >
                    View →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Critical Alerts */}
        {alerts.length > 0 && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert._id}
                    className={`p-4 border-l-4 rounded ${
                      alert.severity === "critical"
                        ? "border-red-500 bg-red-50"
                        : "border-orange-500 bg-orange-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 mb-1 text-sm uppercase">
                          {alert.type.replace("_", " ")}
                        </p>
                        <p className="text-sm font-medium text-gray-800">
                          {alert.productName} ({alert.productSku})
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">
                      {alert.details}
                    </p>
                    <p className="text-xs text-gray-600 mb-3">
                      <span className="font-medium">Recommendation:</span>{" "}
                      {alert.recommendation}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.slice(0, 5).map((activity) => (
                <div
                  key={activity._id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.timestamp}
                      {activity.user && ` • By ${activity.user}`}
                      {activity.location && ` • ${activity.location}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
