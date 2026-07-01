/**
 * Dashboard data fetcher — optimised for minimal round trips.
 *
 * Old approach (7 sequential round trips):
 *   User → Product → Stock (+ 3 .populate() sub-queries) → Warehouse
 *
 * New approach (4 round trips, first 3 in parallel):
 *   Promise.all(Product, Stock, Warehouse) → then User lookup (creators only)
 *   + in-memory join with lookup maps instead of Mongoose populate
 */

import { Product } from "@/models/Product";
import { Stock } from "@/models/Stock";
import { Warehouse } from "@/models/Warehouse";
import { User } from "@/models/User";
import { Alert } from "@/models/Alert";

// ── Exported types ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  deadStock: { count: number; value: number; products: any[] };
  atRisk: { count: number; value: number; products: any[] };
  weeklyChange: number;
  valueAdded: number;
}

export interface WarehouseStat {
  _id: string;
  name: string;
  productsCount: number;
  totalValue: number;
  capacityUsed: number;
  atRiskCount: number;
  deadStockCount: number;
}

export interface DashboardAlert {
  _id: string;
  type: "dead_inventory" | "aging" | "low_stock" | "expiry_warning" | "warehouse_full";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  recommendation: string;
  createdAt: string;
}

export interface DashboardActivity {
  _id: string;
  type: "stock_in";
  description: string;
  timestamp: string;
  location: string;
  user: string;
}

export interface DashboardData {
  stats: DashboardStats;
  warehouses: WarehouseStat[];
  alerts: DashboardAlert[];
  activities: DashboardActivity[];
}

// ── Main function ────────────────────────────────────────────────────────────

export async function getDashboardData(
  companyId: string,
  userRole: string,
  assignedWarehouses: string[]
): Promise<DashboardData> {
  // ── Round trips 1, 2, 3, 4 — all in parallel ─────────────────────────────
  const [products, allStocks, warehouses, openAlerts] = await Promise.all([
    Product.find({ companyId, isActive: true })
      .select("_id name sku unitPrice unitType createdAt")
      .lean(),

    Stock.find({ companyId })
      .select("-entryPhotos") // photos aren't needed on the dashboard
      .lean(),

    Warehouse.find({ companyId, isActive: true })
      .select("_id name capacity")
      .lean(),

    Alert.find({ companyId, status: { $in: ["open", "acknowledged"] } })
      .select("type severity title message recommendation warehouseId createdAt")
      .lean(),
  ]);

  // ── Build O(1) lookup maps — replaces the 3 populate() round trips ──────
  const productMap = new Map(
    (products as any[]).map((p) => [p._id.toString(), p])
  );
  const warehouseMap = new Map(
    (warehouses as any[]).map((w) => [w._id.toString(), w])
  );

  // ── Round trip 5 — fetch only the unique user IDs referenced in stocks ──
  const uniqueCreatorIds = [
    ...new Set(
      (allStocks as any[])
        .map((s) => s.createdBy?.toString())
        .filter(Boolean)
    ),
  ];
  const creators = await User.find({ _id: { $in: uniqueCreatorIds } })
    .select("_id name")
    .lean();
  const userMap = new Map(
    (creators as any[]).map((u) => [u._id.toString(), u.name as string])
  );

  // ── Filter stocks for warehouse managers ────────────────────────────────
  const assignedSet = new Set(assignedWarehouses);
  const filteredStocks =
    userRole === "warehouse_manager" && assignedWarehouses.length > 0
      ? (allStocks as any[]).filter((s) =>
          assignedSet.has(s.warehouseId?.toString())
        )
      : (allStocks as any[]);

  // ── Single-pass aggregation over filtered stocks ─────────────────────────
  let totalValue = 0;
  let deadStockValue = 0;
  let atRiskValue = 0;
  let deadStockCount = 0;
  let atRiskCount = 0;
  const deadStockProducts: any[] = [];
  const atRiskProducts: any[] = [];

  for (const stock of filteredStocks) {
    const product = productMap.get(stock.productId?.toString());
    if (!product) continue; // product deactivated or deleted

    const stockValue = stock.quantityAvailable * product.unitPrice;
    totalValue += stockValue;

    if (stock.status === "dead") {
      deadStockValue += stockValue;
      deadStockCount++;
      deadStockProducts.push({
        _id: stock._id.toString(),
        productName: product.name,
        sku: product.sku,
        batchId: stock.batchId,
        quantity: stock.quantityAvailable,
        value: stockValue,
        ageInDays: stock.ageInDays,
        warehouse:
          warehouseMap.get(stock.warehouseId?.toString())?.name ?? "Unknown",
      });
    } else if (stock.status === "at_risk") {
      atRiskValue += stockValue;
      atRiskCount++;
      atRiskProducts.push({
        _id: stock._id.toString(),
        productName: product.name,
        sku: product.sku,
        batchId: stock.batchId,
        quantity: stock.quantityAvailable,
        value: stockValue,
        ageInDays: stock.ageInDays,
        warehouse:
          warehouseMap.get(stock.warehouseId?.toString())?.name ?? "Unknown",
      });
    }
  }

  // ── Weekly metrics ───────────────────────────────────────────────────────
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const weeklyChange = (products as any[]).filter(
    (p) => new Date(p.createdAt) >= oneWeekAgo
  ).length;

  const valueAdded = filteredStocks
    .filter((s) => new Date(s.entryDate) >= oneWeekAgo)
    .reduce((sum, s) => {
      const product = productMap.get(s.productId?.toString());
      return sum + (product ? s.quantityReceived * product.unitPrice : 0);
    }, 0);

  // ── Per-warehouse breakdown (pure in-memory, no extra DB calls) ──────────
  const visibleWarehouses =
    userRole === "warehouse_manager" && assignedWarehouses.length > 0
      ? (warehouses as any[]).filter((w) => assignedSet.has(w._id.toString()))
      : (warehouses as any[]);

  const warehouseStats: WarehouseStat[] = visibleWarehouses.map((warehouse) => {
    const whStocks = filteredStocks.filter(
      (s) => s.warehouseId?.toString() === warehouse._id.toString()
    );

    const productsCount = new Set(
      whStocks.map((s) => s.productId?.toString())
    ).size;

    const whValue = whStocks.reduce((sum, s) => {
      const product = productMap.get(s.productId?.toString());
      return sum + (product ? s.quantityAvailable * product.unitPrice : 0);
    }, 0);

    const totalQty = whStocks.reduce((sum, s) => sum + s.quantityAvailable, 0);
    const capacityUsed = warehouse.capacity
      ? Math.min(Math.round((totalQty / warehouse.capacity) * 100), 100)
      : 0;

    return {
      _id: warehouse._id.toString(),
      name: warehouse.name,
      productsCount,
      totalValue: whValue,
      capacityUsed,
      atRiskCount: whStocks.filter((s) => s.status === "at_risk").length,
      deadStockCount: whStocks.filter((s) => s.status === "dead").length,
    };
  });

  // ── Action-required alerts — real Alert docs, so recommendations reflect
  // low stock, aging, dead stock, expiry and warehouse-capacity signals ────
  const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  const visibleAlerts =
    userRole === "warehouse_manager" && assignedWarehouses.length > 0
      ? (openAlerts as any[]).filter((a) => assignedSet.has(a.warehouseId?.toString()))
      : (openAlerts as any[]);

  const alerts: DashboardAlert[] = visibleAlerts
    .sort(
      (a, b) =>
        (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 8)
    .map((a) => ({
      _id: a._id.toString(),
      type: a.type,
      severity: a.severity,
      title: a.title,
      message: a.message,
      recommendation: a.recommendation,
      createdAt: new Date(a.createdAt).toISOString(),
    }));

  // ── Recent activity feed ─────────────────────────────────────────────────
  const activities: DashboardActivity[] = [...filteredStocks]
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
    .slice(0, 10)
    .map((stock) => {
      const product = productMap.get(stock.productId?.toString());
      const warehouse = warehouseMap.get(stock.warehouseId?.toString());
      return {
        _id: stock._id.toString(),
        type: "stock_in" as const,
        description: `${stock.quantityReceived} ${product?.unitType ?? "unit"}s of ${product?.name ?? "Unknown"} received`,
        timestamp: new Date(stock.entryDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        location: warehouse?.name ?? "Unknown",
        user: userMap.get(stock.createdBy?.toString()) ?? "System",
      };
    });

  return {
    stats: {
      totalProducts: (products as any[]).length,
      totalValue,
      deadStock: {
        count: deadStockCount,
        value: deadStockValue,
        products: deadStockProducts,
      },
      atRisk: {
        count: atRiskCount,
        value: atRiskValue,
        products: atRiskProducts,
      },
      weeklyChange,
      valueAdded,
    },
    warehouses: warehouseStats,
    alerts,
    activities,
  };
}
