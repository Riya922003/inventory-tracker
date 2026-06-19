"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaExclamationCircle } from "react-icons/fa";
import type { DashboardData } from "@/lib/dashboard-data";

interface DashboardViewProps {
  data: DashboardData;
  initialError: string | null;
}

export default function DashboardView({ data, initialError }: DashboardViewProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError);
  const { stats, warehouses, activities } = data;

  useEffect(() => {
    if (initialError) window.history.replaceState({}, "", "/dashboard");
  }, [initialError]);

  // Health score: start at 100, deduct for dead/at-risk stock
  const healthScore = (() => {
    if (stats.totalProducts === 0) return 100;
    const penalty = Math.min(
      stats.deadStock.count * 15 + stats.atRisk.count * 5,
      80
    );
    return Math.max(10, 100 - penalty);
  })();

  const scoreColor =
    healthScore >= 80 ? "#22c55e" : healthScore >= 60 ? "#f59e0b" : "#ef4444";

  // SVG ring
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  // Action required: dead (urgent) + at-risk (watch), oldest first
  const actionItems = [
    ...(stats.deadStock.products as any[]).map((p) => ({
      ...p,
      urgency: "urgent" as const,
    })),
    ...(stats.atRisk.products as any[]).map((p) => ({
      ...p,
      urgency: "watch" as const,
    })),
  ].sort((a, b) => b.ageInDays - a.ageInDays);

  const formatValue = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
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
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your Inventory Tracker is Ready!
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto mb-6">
              Start tracking by adding your first product. It takes just 2
              minutes.
            </p>
            <Button
              onClick={() => router.push("/dashboard/products/new")}
              className="bg-indigo-600 hover:bg-indigo-700 px-8"
            >
              + Add Your First Product
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Full dashboard ──────────────────────────────────────────────────────────
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

      {/* Health Score Banner */}
      <div className="bg-gray-900 rounded-2xl p-8 mb-6 text-white">
        <div className="flex items-center gap-12 flex-wrap">
          {/* Ring */}
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#374151"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={scoreColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{healthScore}</span>
              <span className="text-xs text-gray-400 uppercase tracking-widest">
                health
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-10 flex-wrap">
            <div>
              <p
                className="text-3xl font-bold"
                style={{
                  color: stats.atRisk.count > 0 ? "#fb923c" : "#6b7280",
                }}
              >
                {stats.atRisk.count}
              </p>
              <p className="text-sm text-gray-400 mt-1">At risk</p>
            </div>
            <div>
              <p
                className="text-3xl font-bold"
                style={{
                  color: stats.deadStock.count > 0 ? "#f87171" : "#6b7280",
                }}
              >
                {stats.deadStock.count}
              </p>
              <p className="text-sm text-gray-400 mt-1">Dead stock</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">
                {stats.totalProducts}
              </p>
              <p className="text-sm text-gray-400 mt-1">Total SKUs</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-400">
                {formatValue(stats.totalValue)}
              </p>
              <p className="text-sm text-gray-400 mt-1">Total value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Action required */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Action required
              {actionItems.length > 0 && (
                <span className="text-sm font-normal text-red-500">
                  · {actionItems.length} items
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {actionItems.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-lg font-semibold text-green-600">
                  All clear
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  No items need attention
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {actionItems.map((item: any) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="font-medium text-gray-900 text-sm">
                        {item.productName}{" "}
                        <span className="text-gray-400 font-normal">
                          #{item.sku}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.ageInDays} days in stock · {item.warehouse}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 px-2.5 py-1 rounded text-xs font-semibold ${
                        item.urgency === "urgent"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {item.urgency === "urgent" ? "Urgent" : "Watch"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Warehouses + Recent activity */}
        <div className="space-y-6">
          {/* Warehouses */}
          <Card>
            <CardHeader>
              <CardTitle>Warehouses</CardTitle>
            </CardHeader>
            <CardContent>
              {warehouses.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No warehouses yet
                </p>
              ) : (
                <div className="space-y-5">
                  {warehouses.map((wh) => (
                    <div
                      key={wh._id}
                      className="cursor-pointer group"
                      onClick={() =>
                        router.push(`/dashboard/warehouses/${wh._id}`)
                      }
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {wh.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {wh.capacityUsed}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            wh.capacityUsed >= 90
                              ? "bg-red-500"
                              : wh.capacityUsed >= 70
                              ? "bg-orange-500"
                              : "bg-blue-500"
                          }`}
                          style={{
                            width: `${Math.max(wh.capacityUsed, 3)}%`,
                          }}
                        />
                      </div>
                      {(wh.atRiskCount > 0 || wh.deadStockCount > 0) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {wh.atRiskCount > 0 &&
                            `${wh.atRiskCount} at risk`}
                          {wh.atRiskCount > 0 &&
                            wh.deadStockCount > 0 &&
                            " · "}
                          {wh.deadStockCount > 0 &&
                            `${wh.deadStockCount} dead`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No activity yet
                </p>
              ) : (
                <div className="divide-y">
                  {activities.slice(0, 5).map((activity) => (
                    <p
                      key={activity._id}
                      className="text-sm text-gray-700 py-2"
                    >
                      {activity.description}
                      <span className="text-gray-400">
                        {" "}
                        · {activity.location}
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
