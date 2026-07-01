"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaExclamationCircle, FaMagic } from "react-icons/fa";
import type { DashboardData, DashboardAlert } from "@/lib/dashboard-data";
import { buildRuleBasedSuggestions, type AISuggestion } from "@/lib/ai-suggestions";

interface DashboardViewProps {
  data: DashboardData;
  initialError: string | null;
  userName: string;
  companyName: string;
}

export default function DashboardView({ data, initialError, userName, companyName }: DashboardViewProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError);
  const { stats, warehouses, activities, alerts } = data;

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>(() => buildRuleBasedSuggestions(data));
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    if (initialError) window.history.replaceState({}, "", "/dashboard");
  }, [initialError]);

  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);

    fetch("/api/dashboard/ai-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ stats, warehouses, alerts }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (!cancelled && result?.suggestions?.length) {
          setAiSuggestions(result.suggestions);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, warehouses, alerts]);

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

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = userName?.split(" ")[0] || "there";
  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const severityLabel = (severity: DashboardAlert["severity"]) =>
    severity === "critical" ? "Urgent" : severity === "warning" ? "Watch" : "Info";

  const severityClass = (severity: DashboardAlert["severity"]) =>
    severity === "critical"
      ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
      : severity === "warning"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
      : "bg-blue-100 text-blue-700 dark:bg-cyan-500/15 dark:text-cyan-400";

  const formatValue = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toFixed(0)}`;
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (stats.totalProducts === 0) {
    return (
      <div className="p-4 md:p-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-400 p-4 mb-6 rounded">
            <div className="flex items-center gap-2">
              <FaExclamationCircle className="text-red-600" />
              <span className="text-sm font-medium text-red-800 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {companyName ? `${companyName} · ` : ""}Welcome to your inventory management system
          </p>
        </div>
        <Card className="mb-8 border-2 border-dashed border-gray-300 dark:border-gray-700">
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Your Inventory Tracker is Ready!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-6">
              Start tracking by adding your first product. It takes just 2
              minutes.
            </p>
            <Button
              onClick={() => router.push("/dashboard/products/new")}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-gray-950 px-8"
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
    <div className="p-4 md:p-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-400 p-4 mb-6 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaExclamationCircle className="text-red-600" />
              <span className="text-sm font-medium text-red-800 dark:text-red-300">{error}</span>
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

      {/* Header: greeting + company + top actions */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting}, <span className="text-indigo-600 dark:text-cyan-400">{firstName}</span> 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {todayStr}
            {companyName ? ` · ${companyName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => router.push("/dashboard/stock/entry")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 dark:from-cyan-500 dark:to-cyan-500 dark:hover:from-cyan-400 dark:hover:to-cyan-400 dark:text-gray-950"
          >
            + Record Stock Entry
          </Button>
          <Button
            onClick={() => router.push("/dashboard/stock/exit")}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            − Record Stock Exit
          </Button>
          <Button
            onClick={() => router.push("/dashboard/inventory")}
            variant="outline"
          >
            View All Products
          </Button>
        </div>
      </div>

      {/* Health Score Banner */}
      <div className="bg-gray-900 dark:bg-gray-950 dark:border dark:border-cyan-500/10 rounded-2xl p-5 md:p-8 mb-6 text-white">
        <div className="flex items-center gap-6 md:gap-12 flex-wrap">
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
          <div className="flex gap-6 md:gap-10 flex-wrap">
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
        {/* Left: Action required — driven by live alerts (aging, low stock, expiry, capacity) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Action required
              {alerts.length > 0 && (
                <span className="text-sm font-normal text-red-500">
                  · {alerts.length} items
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  All clear
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  No items need attention
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y dark:divide-white/5">
                  {alerts.map((alert) => (
                    <div key={alert._id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {alert.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {alert.message}
                          </p>
                        </div>
                        <span
                          className={`flex-shrink-0 px-2.5 py-1 rounded text-xs font-semibold ${severityClass(
                            alert.severity
                          )}`}
                        >
                          {severityLabel(alert.severity)}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-600 dark:text-cyan-400 mt-1">
                        → {alert.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-3">
                  <button
                    onClick={() => router.push("/dashboard/alerts")}
                    className="text-xs text-indigo-600 dark:text-cyan-400 font-medium hover:underline"
                  >
                    View all alerts →
                  </button>
                </div>
              </>
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
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
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
                        <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                          {wh.name}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {wh.capacityUsed}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            wh.capacityUsed >= 90
                              ? "bg-red-500"
                              : wh.capacityUsed >= 70
                              ? "bg-orange-500"
                              : "bg-blue-500 dark:bg-cyan-500"
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
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No activity yet
                </p>
              ) : (
                <div className="divide-y dark:divide-white/5">
                  {activities.slice(0, 5).map((activity) => (
                    <p
                      key={activity._id}
                      className="text-sm text-gray-700 dark:text-gray-300 py-2"
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

      {/* AI Suggestions */}
      <Card className="mt-6 border-indigo-100 dark:border-cyan-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaMagic className="text-indigo-500 dark:text-cyan-400" />
            AI Suggestions
            {aiLoading && (
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500 animate-pulse">
                thinking…
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiSuggestions.map((s, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-indigo-50/60 dark:bg-white/5 border border-indigo-100 dark:border-white/10"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {s.title}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {s.detail}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
