"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaBox, FaWarehouse, FaRupeeSign, FaExclamationTriangle, FaExclamationCircle } from "react-icons/fa";
import { MdPlayCircleOutline } from "react-icons/md";
import { HiTrendingUp } from "react-icons/hi";
import { fetchWithErrorHandling, handleApiResponse } from "@/lib/api-client";

// Force dynamic rendering to prevent prerendering issues with useSearchParams
export const dynamic = 'force-dynamic';

interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  deadStock: { count: number; value: number };
  atRisk: { count: number; value: number };
  weeklyChange: number;
  valueAdded: number;
}

interface Warehouse {
  _id: string;
  name: string;
  productsCount: number;
  totalValue: number;
  capacityUsed: number;
  atRiskCount: number;
  deadStockCount: number;
}

interface Alert {
  _id: string;
  type: "dead_inventory" | "low_stock" | "aging";
  productName: string;
  productSku: string;
  details: string;
  recommendation: string;
  severity: "critical" | "warning";
}

interface Activity {
  _id: string;
  type: "stock_in" | "stock_out" | "alert_generated";
  description: string;
  timestamp: string;
  location?: string;
  user?: string;
}

interface DashboardData {
  stats: DashboardStats;
  warehouses: Warehouse[];
  alerts: Alert[];
  activities: Activity[];
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error parameter
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized") {
      setError("You don't have permission to access that page");
      // Clear the error parameter from URL
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetchWithErrorHandling<DashboardData>("/api/dashboard");
        
        const data = handleApiResponse(response, {
          onUnauthorized: () => {
            console.log("Dashboard - Not authenticated, redirecting to login");
            window.location.href = "/";
          },
          onForbidden: (errorMsg) => {
            setError(errorMsg);
            setLoading(false);
          },
          onServerError: (errorMsg) => {
            setError(`Server error: ${errorMsg}`);
            setLoading(false);
          },
          onNetworkError: (errorMsg) => {
            setError(`Connection error: ${errorMsg}`);
            setLoading(false);
          },
        });

        if (data) {
          setStats(data.stats);
          setWarehouses(data.warehouses || []);
          setAlerts(data.alerts || []);
          setActivities(data.activities || []);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("An unexpected error occurred while loading the dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  // Show error state if there's an error
  if (error && !stats) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
          <div className="flex items-center gap-2">
            <FaExclamationCircle className="text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty State - No Products
  if (!stats || stats.totalProducts === 0) {
    return (
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to your inventory management system</p>
        </div>

        {/* Empty State Card */}
        <Card className="mb-8 border-2 border-dashed border-gray-300 bg-white">
          <CardContent className="py-16 text-center">
            <div className="mb-6">
              <FaBox className="text-6xl text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Your Inventory Tracker is Ready!
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto mb-6">
                Start tracking by adding your first product. It takes just 2 minutes and you'll immediately
                see how aging alerts and photo verification work.
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">₹0</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Warehouses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{warehouses.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">No activity yet</p>
              <p className="text-sm text-gray-400">Products you add will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard with Data
  return (
    <div className="p-8">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
          <div className="flex items-center gap-2">
            <FaExclamationCircle className="text-red-600" />
            <span className="text-sm font-medium text-red-800">{error}</span>
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
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalProducts}</p>
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
                <HiTrendingUp /> ₹{(stats.valueAdded / 100000).toFixed(1)}L added
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Dead Stock</p>
                <FaExclamationCircle className="text-red-600 text-xl" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {stats.deadStock.count} <span className="text-base">(₹{(stats.deadStock.value / 100000).toFixed(0)}L)</span>
              </p>
              <p className="text-xs text-red-600">🔴 Action needed</p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">At Risk</p>
                <FaExclamationTriangle className="text-orange-600 text-xl" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {stats.atRisk.count} <span className="text-base">(₹{(stats.atRisk.value / 100000).toFixed(0)}L)</span>
              </p>
              <p className="text-xs text-orange-600">⚠️ Watch closely</p>
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
                      <p className="font-semibold text-gray-900">{warehouse.name}</p>
                      <p className="text-sm text-gray-600">
                        {warehouse.productsCount} products, ₹{(warehouse.totalValue / 100000).toFixed(1)}L
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
                          style={{ width: `${warehouse.capacityUsed}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{warehouse.capacityUsed}%</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {warehouse.atRiskCount} at risk, {warehouse.deadStockCount} dead
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
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
                        <p className="font-semibold text-gray-900 mb-1 text-sm">
                          {alert.severity === "critical" ? "🔴" : "⚠️"}{" "}
                          {alert.type.replace("_", " ").toUpperCase()}
                        </p>
                        <p className="text-sm font-medium text-gray-800">
                          {alert.productName} ({alert.productSku})
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">{alert.details}</p>
                    <p className="text-xs text-gray-600 mb-3">
                      <span className="font-medium">Recommendation:</span> {alert.recommendation}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        Dismiss
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
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
                <div key={activity._id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded transition-colors">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
