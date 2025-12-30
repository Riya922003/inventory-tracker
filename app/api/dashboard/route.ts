import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Stock } from "@/models/Stock";
import { Warehouse } from "@/models/Warehouse";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { CommonErrors, jsonSuccess } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return CommonErrors.unauthorized();
    }

    await connectDB();

    // Get user data
    const user = await User.findById(currentUser.userId).lean();
    
    if (!user) {
      return CommonErrors.notFound("User");
    }

    // Use companyId
    const companyId = user.companyId;
    
    if (!companyId) {
      return CommonErrors.badRequest(
        "Please complete onboarding first",
        "User account is missing company information"
      );
    }

    // Get all products for the company
    const products = await Product.find({
      companyId: companyId,
      isActive: true,
    }).lean();

    // Get all stock entries for the company
    const stocks = await Stock.find({
      companyId: companyId,
    })
      .populate("productId", "name sku unitPrice unitType")
      .populate("warehouseId", "name address warehouseCode")
      .populate("createdBy", "name")
      .lean();

    // Filter by assigned warehouses if user is warehouse_manager
    let filteredStocks = stocks;
    if (user.role === "warehouse_manager" && user.assignedWarehouses && user.assignedWarehouses.length > 0) {
      filteredStocks = stocks.filter((stock: any) => 
        user.assignedWarehouses.some((whId: any) => 
          stock.warehouseId?._id?.toString() === whId.toString()
        )
      );
    }

    // Calculate total products
    const totalProducts = products.length;

    // Calculate total value and categorize stock
    let totalValue = 0;
    let deadStockValue = 0;
    let atRiskValue = 0;
    let deadStockCount = 0;
    let atRiskCount = 0;

    const deadStockProducts: any[] = [];
    const atRiskProducts: any[] = [];

    filteredStocks.forEach((stock: any) => {
      const stockValue = stock.quantityAvailable * stock.productId.unitPrice;
      totalValue += stockValue;

      if (stock.status === "dead") {
        deadStockValue += stockValue;
        deadStockCount++;
        deadStockProducts.push({
          _id: stock._id,
          productName: stock.productId.name,
          sku: stock.productId.sku,
          batchId: stock.batchId,
          quantity: stock.quantityAvailable,
          value: stockValue,
          ageInDays: stock.ageInDays,
          warehouse: stock.warehouseId.name,
        });
      } else if (stock.status === "at_risk") {
        atRiskValue += stockValue;
        atRiskCount++;
        atRiskProducts.push({
          _id: stock._id,
          productName: stock.productId.name,
          sku: stock.productId.sku,
          batchId: stock.batchId,
          quantity: stock.quantityAvailable,
          value: stockValue,
          ageInDays: stock.ageInDays,
          warehouse: stock.warehouseId.name,
        });
      }
    });

    // Calculate weekly change
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentProducts = products.filter(
      (p: any) => new Date(p.createdAt) >= oneWeekAgo
    );
    const weeklyChange = recentProducts.length;

    // Calculate value added this week
    const recentStocks = filteredStocks.filter(
      (s: any) => new Date(s.entryDate) >= oneWeekAgo
    );
    const valueAdded = recentStocks.reduce(
      (sum: number, stock: any) =>
        sum + stock.quantityReceived * stock.productId.unitPrice,
      0
    );

    // Get warehouse breakdown
    const warehouses = await Warehouse.find({
      companyId: companyId,
      isActive: true,
    }).lean();

    // Filter warehouses for warehouse_manager
    let filteredWarehouses = warehouses;
    if (user.role === "warehouse_manager" && user.assignedWarehouses && user.assignedWarehouses.length > 0) {
      filteredWarehouses = warehouses.filter((wh: any) => 
        user.assignedWarehouses.some((whId: any) => 
          wh._id.toString() === whId.toString()
        )
      );
    }

    const warehouseStats = await Promise.all(
      filteredWarehouses.map(async (warehouse: any) => {
        const warehouseStocks = filteredStocks.filter(
          (s: any) => s.warehouseId._id.toString() === warehouse._id.toString()
        );

        const warehouseProducts = new Set(
          warehouseStocks.map((s: any) => s.productId._id.toString())
        ).size;

        const warehouseValue = warehouseStocks.reduce(
          (sum: number, stock: any) =>
            sum + stock.quantityAvailable * stock.productId.unitPrice,
          0
        );

        const warehouseDeadCount = warehouseStocks.filter(
          (s: any) => s.status === "dead"
        ).length;

        const warehouseAtRiskCount = warehouseStocks.filter(
          (s: any) => s.status === "at_risk"
        ).length;

        // Calculate capacity used
        const totalQuantity = warehouseStocks.reduce(
          (sum: number, stock: any) => sum + stock.quantityAvailable,
          0
        );
        const capacityUsed = warehouse.capacity
          ? Math.min(Math.round((totalQuantity / warehouse.capacity) * 100), 100)
          : 0;

        return {
          _id: warehouse._id,
          name: warehouse.name,
          productsCount: warehouseProducts,
          totalValue: warehouseValue,
          capacityUsed,
          atRiskCount: warehouseAtRiskCount,
          deadStockCount: warehouseDeadCount,
        };
      })
    );

    // Generate alerts
    const alerts = [
      ...deadStockProducts.slice(0, 3).map((item) => ({
        _id: item._id,
        type: "dead_inventory" as const,
        productName: item.productName,
        productSku: item.sku,
        details: `${item.quantity} units have been in stock for ${item.ageInDays} days`,
        recommendation: "Consider discount sale or liquidation",
        severity: "critical" as const,
      })),
      ...atRiskProducts.slice(0, 2).map((item) => ({
        _id: item._id,
        type: "aging" as const,
        productName: item.productName,
        productSku: item.sku,
        details: `${item.quantity} units aging for ${item.ageInDays} days`,
        recommendation: "Promote or bundle with fast-moving items",
        severity: "warning" as const,
      })),
    ];

    // Generate recent activities
    const recentActivities = filteredStocks
      .sort((a: any, b: any) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
      .slice(0, 10)
      .map((stock: any) => ({
        _id: stock._id,
        type: "stock_in" as const,
        description: `${stock.quantityReceived} ${stock.productId.unitType}s of ${stock.productId.name} received`,
        timestamp: new Date(stock.entryDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        location: stock.warehouseId.name,
        user: stock.createdBy?.name || "System",
      }));

    return jsonSuccess({
      stats: {
        totalProducts,
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
      activities: recentActivities,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return CommonErrors.serverError(
      "Failed to fetch dashboard data",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
