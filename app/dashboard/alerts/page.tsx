"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FaBell,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaInfoCircle,
  FaCheck,
  FaTimes,
  FaEye,
} from "react-icons/fa";

interface Alert {
  _id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  recommendation: string;
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  productId: { _id: string; name: string; sku: string };
  warehouseId: { _id: string; name: string };
  metadata: { ageInDays?: number; quantity?: number; value?: number; capacityPercent?: number };
  acknowledgedBy?: { name: string };
  acknowledgedAt?: string;
  resolvedBy?: { name: string };
  resolvedAt?: string;
  resolvedNotes?: string;
  createdAt: string;
}

interface Warehouse {
  _id: string;
  name: string;
}

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("open");
  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");

  const [counts, setCounts] = useState({ critical: 0, warning: 0, info: 0 });
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchWarehouses();
  }, [statusFilter, typeFilter, severityFilter, warehouseFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("type", typeFilter);
      if (severityFilter) params.append("severity", severityFilter);
      if (warehouseFilter) params.append("warehouseId", warehouseFilter);

      const response = await fetch(`/api/alerts?${params.toString()}`, { credentials: "include" });
      if (response.status === 401) { window.location.href = "/"; return; }
      const data = await response.json();
      if (response.ok) {
        setAlerts(data.alerts || []);
        setCounts(data.counts || { critical: 0, warning: 0, info: 0 });
      } else {
        toast.error(`Failed to load alerts: ${data.error || data.details || response.status}`);
        console.error("Alerts API error:", data);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast.error("Failed to load alerts — check console for details");
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await fetch("/api/warehouses?minimal=true", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    }
  };

  const handleAlertAction = async (alertId: string, action: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        toast.success(`Alert ${action}d successfully`);
        setDetailModalOpen(false);
        setSelectedAlert(null);
        fetchAlerts();
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to ${action} alert`);
      }
    } catch (error) {
      console.error(`Error ${action}ing alert:`, error);
      toast.error(`Failed to ${action} alert`);
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <FaExclamationCircle className="text-red-500 dark:text-red-400 text-xl" />;
      case "warning":  return <FaExclamationTriangle className="text-orange-500 dark:text-orange-400 text-xl" />;
      case "info":     return <FaInfoCircle className="text-blue-500 dark:text-cyan-400 text-xl" />;
      default:         return <FaBell className="text-gray-500 dark:text-gray-400 text-xl" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <span className="text-xs bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 px-2 py-1 rounded font-medium">Critical</span>;
      case "warning":  return <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 px-2 py-1 rounded font-medium">Warning</span>;
      case "info":     return <span className="text-xs bg-blue-100 text-blue-700 dark:bg-cyan-500/15 dark:text-cyan-400 px-2 py-1 rounded font-medium">Info</span>;
      default:         return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":         return <span className="text-xs bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 px-2 py-1 rounded">Open</span>;
      case "acknowledged": return <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400 px-2 py-1 rounded">Acknowledged</span>;
      case "resolved":     return <span className="text-xs bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400 px-2 py-1 rounded">Resolved</span>;
      case "dismissed":    return <span className="text-xs bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-400 px-2 py-1 rounded">Dismissed</span>;
      default:             return null;
    }
  };

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alerts & Notifications</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor and manage inventory alerts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">Critical Alerts</p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-300 mt-2">{counts.critical}</p>
              </div>
              <FaExclamationCircle className="text-4xl text-red-500 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">Warnings</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-300 mt-2">{counts.warning}</p>
              </div>
              <FaExclamationTriangle className="text-4xl text-orange-500 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:border-cyan-500/20 dark:bg-cyan-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-cyan-400 font-medium">Info</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-cyan-300 mt-2">{counts.info}</p>
              </div>
              <FaInfoCircle className="text-4xl text-blue-500 dark:text-cyan-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
                <option value="open">Open</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
                <option value="all">All</option>
              </select>
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <select id="type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
                <option value="">All Types</option>
                <option value="dead_inventory">Dead Inventory</option>
                <option value="aging">Aging Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="expiry_warning">Expiry Warning</option>
                <option value="warehouse_full">Warehouse Capacity</option>
              </select>
            </div>
            <div>
              <Label htmlFor="severity">Severity</Label>
              <select id="severity" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className={selectClass}>
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <Label htmlFor="warehouse">Warehouse</Label>
              <select id="warehouse" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className={selectClass}>
                <option value="">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>{wh.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setStatusFilter("open"); setTypeFilter(""); setSeverityFilter(""); setWarehouseFilter(""); }} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts ({alerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <FaBell className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">No alerts found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {statusFilter === "open" ? "Great! No open alerts at the moment." : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card
                  key={alert._id}
                  className={`border-l-4 ${
                    alert.severity === "critical" ? "border-l-red-500"
                    : alert.severity === "warning" ? "border-l-orange-500"
                    : "border-l-cyan-500"
                  } hover:shadow-md transition-shadow`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{alert.title}</h3>
                            {getSeverityBadge(alert.severity)}
                            {getStatusBadge(alert.status)}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{alert.message}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            {alert.productId && <span>📦 {alert.productId.name}</span>}
                            <span>🏢 {alert.warehouseId?.name}</span>
                            {alert.metadata.ageInDays && <span>📅 {alert.metadata.ageInDays} days old</span>}
                            {alert.metadata.capacityPercent && <span>📊 {alert.metadata.capacityPercent}% full</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedAlert(alert); setDetailModalOpen(true); }}>
                          <FaEye className="mr-1" /> View
                        </Button>
                        {alert.status === "open" && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleAlertAction(alert._id, "acknowledge")} disabled={actionLoading}>
                              <FaCheck className="mr-1" /> Acknowledge
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleAlertAction(alert._id, "dismiss")} disabled={actionLoading}>
                              <FaTimes className="mr-1" /> Dismiss
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {detailModalOpen && selectedAlert && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getSeverityIcon(selectedAlert.severity)}
                  {selectedAlert.title}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setDetailModalOpen(false); setSelectedAlert(null); }}>
                  <FaTimes />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {getSeverityBadge(selectedAlert.severity)}
                  {getStatusBadge(selectedAlert.status)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Details</h4>
                  <p className="text-gray-700 dark:text-gray-300">{selectedAlert.message}</p>
                </div>
                <div className="bg-blue-50 dark:bg-cyan-500/10 border border-blue-200 dark:border-cyan-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-cyan-300 mb-2">💡 Recommendation</h4>
                  <p className="text-blue-800 dark:text-cyan-400/80">{selectedAlert.recommendation}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedAlert.productId && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Product</p>
                      <p className="font-medium dark:text-white">{selectedAlert.productId.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {selectedAlert.productId.sku}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Warehouse</p>
                    <p className="font-medium dark:text-white">{selectedAlert.warehouseId?.name}</p>
                  </div>
                </div>
                {selectedAlert.metadata && (
                  <div className="grid grid-cols-3 gap-4">
                    {selectedAlert.metadata.ageInDays && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Age</p>
                        <p className="font-medium dark:text-white">{selectedAlert.metadata.ageInDays} days</p>
                      </div>
                    )}
                    {selectedAlert.metadata.quantity !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Quantity</p>
                        <p className="font-medium dark:text-white">{selectedAlert.metadata.quantity} units</p>
                      </div>
                    )}
                    {selectedAlert.metadata.value !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Value</p>
                        <p className="font-medium dark:text-white">₹{selectedAlert.metadata.value.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedAlert.metadata.capacityPercent !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Capacity Used</p>
                        <p className="font-medium dark:text-white">{selectedAlert.metadata.capacityPercent}%</p>
                      </div>
                    )}
                  </div>
                )}
                {selectedAlert.status === "open" && (
                  <div className="flex gap-3 pt-4 border-t dark:border-white/10">
                    <Button onClick={() => handleAlertAction(selectedAlert._id, "acknowledge")} disabled={actionLoading} className="flex-1">
                      <FaCheck className="mr-2" />{actionLoading ? "Processing..." : "Acknowledge"}
                    </Button>
                    <Button onClick={() => handleAlertAction(selectedAlert._id, "resolve")} disabled={actionLoading} className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30">
                      <FaCheck className="mr-2" />{actionLoading ? "Processing..." : "Resolve"}
                    </Button>
                    <Button variant="outline" onClick={() => handleAlertAction(selectedAlert._id, "dismiss")} disabled={actionLoading}>
                      <FaTimes className="mr-2" />Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
