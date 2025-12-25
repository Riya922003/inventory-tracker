import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Stock } from "@/models/Stock";
import { Warehouse } from "@/models/Warehouse";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user data to find their warehouses
    const user = await User.findById(currentUser.userId).lean();
    if (!user || !user.assignedWarehouses || user.assignedWarehouses.length === 0) {
      // User has no warehouses yet (probably hasn't completed onboarding)
      return NextResponse.json({
        stats: {
          totalProducts: 0,
          totalValue: 0,
          deadStock: { count: 0, value: 0 },
          atRisk: { count: 0, value: 0 },
          weeklyChange: 0,
          valueAdded: 0,
        },
        warehouses: [],
        alerts: [],
        activities: [],
      });
    }

    // Get only user's warehouses
    const warehouses = await Warehouse.find({
      _id: { $in: user.assignedWarehouses },
      isActive: true,
    }).lean();

    // Fetch stocks only from user's warehouses
    const stocks = await Stock.find({
      warehouseId: { $in: user.assignedWarehouses },
    })
      .populate("warehouseId", "name")
      .lean();

    // Get product IDs from stocks
    const productIds = [...new Set(stocks.map((s) => s.productId.toString()))];

    // Fetch only products that are in user's warehouses
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    }).lean();

    // Calculate stats
    const totalProducts = products.length;
    let totalValue = 0;
    let deadStockCount = 0;
    let deadStockValue = 0;
    let atRiskCount = 0;
    let atRiskValue = 0;

    // Calculate stock-based metrics
    stocks.forEach((stock) => {
      const product = products.find((p) => p._id.toString() === stock.productId.toString());
      if (product) {
        const stockValue = product.unitPrice * stock.quantityAvailable;
        totalValue += stockValue;

        if (stock.status === "dead") {
          deadStockCount++;
          deadStockValue += stockValue;
        } else if (stock.status === "at_risk") {
          atRiskCount++;
          atRiskValue += stockValue;
        }
      }
    });

    // Prepare warehouse data
    const warehouseData = warehouses.map((wh) => {
      const warehouseStocks = stocks.filter(
        (s) => s.warehouseId && (s.warehouseId as any)._id.toString() === wh._id.toString()
      );

      const productsCount = new Set(warehouseStocks.map((s) => s.productId.toString())).size;

      let whTotalValue = 0;
      let whAtRiskCount = 0;
      let whDeadStockCount = 0;

      warehouseStocks.forEach((stock) => {
        const product = products.find((p) => p._id.toString() === stock.productId.toString());
        if (product) {
          whTotalValue += product.unitPrice * stock.quantityAvailable;
        }

        if (stock.status === "at_risk") whAtRiskCount++;
        if (stock.status === "dead") whDeadStockCount++;
      });

      // Calculate capacity used (mock calculation based on products)
      const capacityUsed = Math.min(95, productsCount * 15 + Math.floor(Math.random() * 20));

      return {
        _id: wh._id.toString(),
        name: wh.name,
        productsCount,
        totalValue: whTotalValue,
        capacityUsed,
        atRiskCount: whAtRiskCount,
        deadStockCount: whDeadStockCount,
      };
    });

    // Generate mock alerts based on real data
    const alerts: any[] = [];
    const deadStocks = stocks.filter((s) => s.status === "dead").slice(0, 2);
    const atRiskStocks = stocks.filter((s) => s.status === "at_risk").slice(0, 2);

    deadStocks.forEach((stock) => {
      const product = products.find((p) => p._id.toString() === stock.productId.toString());
      if (product) {
        const stockValue = product.unitPrice * stock.quantityAvailable;
        alerts.push({
          _id: stock._id.toString(),
          type: "dead_inventory",
          productName: product.name,
          productSku: product.sku,
          details: `Idle for ${stock.ageInDays} days • ₹${(stockValue / 100000).toFixed(1)}L locked • ${
            (stock.warehouseId as any)?.name || "Unknown"
          }`,
          recommendation: "Liquidate at 40% discount",
          severity: "critical",
        });
      }
    });

    atRiskStocks.forEach((stock) => {
      const product = products.find((p) => p._id.toString() === stock.productId.toString());
      if (product) {
        alerts.push({
          _id: stock._id.toString(),
          type: "aging",
          productName: product.name,
          productSku: product.sku,
          details: `Aging for ${stock.ageInDays} days • ${stock.quantityAvailable} units • ${
            (stock.warehouseId as any)?.name || "Unknown"
          }`,
          recommendation: "Consider promotional pricing",
          severity: "warning",
        });
      }
    });

    // Generate mock activities based on recent stocks
    const activities = stocks.slice(-5).map((stock, index) => {
      const product = products.find((p) => p._id.toString() === stock.productId.toString());
      const daysAgo = index === 0 ? "2 hours ago" : index === 1 ? "5 hours ago" : `${index} days ago`;

      return {
        _id: stock._id.toString(),
        type: "stock_in",
        description: `📦 Stock Added: ${product?.name || "Product"} (${stock.quantityReceived} units)`,
        timestamp: daysAgo,
        location: (stock.warehouseId as any)?.name || "Unknown",
        user: "Admin",
      };
    });

    // Stats object
    const stats = {
      totalProducts,
      totalValue,
      deadStock: {
        count: deadStockCount,
        value: deadStockValue,
      },
      atRisk: {
        count: atRiskCount,
        value: atRiskValue,
      },
      weeklyChange: Math.floor(totalProducts * 0.3), // Mock: 30% added this week
      valueAdded: Math.floor(totalValue * 0.25), // Mock: 25% value added
    };

    return NextResponse.json(
      {
        success: true,
        stats,
        warehouses: warehouseData,
        alerts,
        activities,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
