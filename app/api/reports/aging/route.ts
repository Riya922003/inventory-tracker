import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Stock } from "@/models/Stock";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(currentUser.userId);
    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "Please complete onboarding first" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const warehouseFilter = searchParams.get("warehouse");
    const categoryFilter = searchParams.get("category");
    const statusFilter = searchParams.get("status");

    // Build query
    const query: any = {
      companyId: user.companyId,
      quantityAvailable: { $gt: 0 },
    };

    if (warehouseFilter && warehouseFilter !== "all") {
      query.warehouseId = warehouseFilter;
    }

    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }

    // Fetch all stocks with product and warehouse details
    let stocks = await Stock.find(query)
      .populate("productId", "name sku unitPrice category")
      .populate("warehouseId", "name")
      .sort({ ageInDays: -1 })
      .lean();

    // Filter by category if specified
    if (categoryFilter && categoryFilter !== "all") {
      stocks = stocks.filter(
        (stock: any) => stock.productId?.category?.toString() === categoryFilter
      );
    }

    // Calculate summary statistics
    const totalItems = stocks.length;
    const healthyStocks = stocks.filter((s: any) => s.status === "healthy");
    const atRiskStocks = stocks.filter((s: any) => s.status === "at_risk");
    const deadStocks = stocks.filter((s: any) => s.status === "dead");

    const calculateValue = (stockList: any[]) =>
      stockList.reduce(
        (sum, s) => sum + s.quantityAvailable * (s.productId?.unitPrice || 0),
        0
      );

    const healthyValue = calculateValue(healthyStocks);
    const atRiskValue = calculateValue(atRiskStocks);
    const deadValue = calculateValue(deadStocks);
    const totalValue = healthyValue + atRiskValue + deadValue;

    // Generate recommendations
    const generateRecommendation = (stock: any) => {
      const age = stock.ageInDays;
      const value = stock.quantityAvailable * (stock.productId?.unitPrice || 0);

      if (stock.status === "dead") {
        if (age > 300) {
          return "Liquidate @ 50% off - extremely aged inventory";
        } else if (age > 200) {
          return "Liquidate @ 40% off or promotional campaign";
        } else {
          return "Clear stock - run clearance sale";
        }
      } else if (stock.status === "at_risk") {
        if (age > 120) {
          return "Urgent: Run promotional campaign in next 15 days";
        } else if (age > 90) {
          return "Run promotional campaign in next 30 days";
        } else if (value > 100000) {
          return "Consider transferring to high-demand location";
        } else {
          return "Market to new client segments";
        }
      } else {
        return "Monitor regularly - currently healthy";
      }
    };

    // Add recommendations to stocks
    const stocksWithRecommendations = stocks.map((stock: any) => ({
      ...stock,
      recommendation: generateRecommendation(stock),
      value: stock.quantityAvailable * (stock.productId?.unitPrice || 0),
    }));

    // Group by status
    const groupedStocks = {
      dead: stocksWithRecommendations.filter((s: any) => s.status === "dead"),
      atRisk: stocksWithRecommendations.filter((s: any) => s.status === "at_risk"),
      healthy: stocksWithRecommendations.filter((s: any) => s.status === "healthy"),
    };

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalItems,
          totalValue,
          healthy: {
            count: healthyStocks.length,
            value: healthyValue,
            percentage: totalItems > 0 ? Math.round((healthyStocks.length / totalItems) * 100) : 0,
          },
          atRisk: {
            count: atRiskStocks.length,
            value: atRiskValue,
            percentage: totalItems > 0 ? Math.round((atRiskStocks.length / totalItems) * 100) : 0,
          },
          dead: {
            count: deadStocks.length,
            value: deadValue,
            percentage: totalItems > 0 ? Math.round((deadStocks.length / totalItems) * 100) : 0,
          },
        },
        stocks: groupedStocks,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating aging report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate aging report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
