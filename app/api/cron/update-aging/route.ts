import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Stock } from "@/models/Stock";
import { Alert } from "@/models/Alert";
import { Product } from "@/models/Product";

// This endpoint should be called by a cron job daily at 6 AM
// You can use services like Vercel Cron, GitHub Actions, or external cron services
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return NextResponse.json(
        { error: "Cron job not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const today = new Date();
    let updatedCount = 0;
    let alertsGenerated = 0;

    // Get all active stock entries
    const stocks = await Stock.find({})
      .populate("productId", "name sku unitPrice")
      .populate("warehouseId", "name");

    console.log(`[Aging Update] Processing ${stocks.length} stock entries...`);

    for (const stock of stocks) {
      // Calculate age in days
      const entryDate = new Date(stock.entryDate);
      const ageInDays = Math.floor(
        (today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine status based on age
      let newStatus: "healthy" | "at_risk" | "dead" = "healthy";
      
      // Get aging thresholds (you can make these configurable per category)
      const atRiskThreshold = 60; // 60 days
      const deadThreshold = 90; // 90 days

      if (ageInDays >= deadThreshold) {
        newStatus = "dead";
      } else if (ageInDays >= atRiskThreshold) {
        newStatus = "at_risk";
      }

      const oldStatus = stock.status;

      // Update stock if status changed or age needs update
      if (stock.ageInDays !== ageInDays || stock.status !== newStatus) {
        await Stock.updateOne(
          { _id: stock._id },
          {
            $set: {
              ageInDays,
              status: newStatus,
            },
          }
        );
        updatedCount++;

        // Generate alert if status changed to at_risk or dead
        if (newStatus !== "healthy" && oldStatus !== newStatus) {
          await generateAlert(stock, newStatus, ageInDays);
          alertsGenerated++;
        }
      }
    }

    console.log(
      `[Aging Update] Updated ${updatedCount} stocks, generated ${alertsGenerated} alerts`
    );

    return NextResponse.json({
      success: true,
      message: "Aging update completed",
      stats: {
        totalProcessed: stocks.length,
        updated: updatedCount,
        alertsGenerated,
      },
    });
  } catch (error) {
    console.error("Aging update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update aging",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to generate alerts
async function generateAlert(
  stock: any,
  status: "at_risk" | "dead",
  ageInDays: number
) {
  try {
    const product = stock.productId;
    const warehouse = stock.warehouseId;
    const stockValue = stock.quantityAvailable * product.unitPrice;

    // Check if alert already exists for this stock
    const existingAlert = await Alert.findOne({
      stockId: stock._id,
      type: status === "dead" ? "dead_inventory" : "aging",
      status: { $in: ["open", "acknowledged"] },
    });

    // Don't create duplicate alerts
    if (existingAlert) {
      return;
    }

    const alertData = {
      companyId: stock.companyId,
      stockId: stock._id,
      productId: product._id,
      warehouseId: warehouse._id,
      type: status === "dead" ? ("dead_inventory" as const) : ("aging" as const),
      severity: status === "dead" ? ("critical" as const) : ("warning" as const),
      title:
        status === "dead"
          ? `Dead Stock Alert: ${product.name}`
          : `Aging Stock Alert: ${product.name}`,
      message:
        status === "dead"
          ? `${stock.quantityAvailable} units have been idle for ${ageInDays} days in ${warehouse.name}. Value locked: ₹${stockValue.toLocaleString()}`
          : `${stock.quantityAvailable} units are aging (${ageInDays} days) in ${warehouse.name}. Take action before it becomes dead stock.`,
      recommendation:
        status === "dead"
          ? "Consider liquidation at 40-50% discount, bundle with fast-moving items, or donate for tax benefits."
          : "Promote with discounts, bundle with popular items, or move to high-traffic location.",
      metadata: {
        ageInDays,
        quantity: stock.quantityAvailable,
        value: stockValue,
      },
    };

    await Alert.create(alertData);
    console.log(`[Alert Generated] ${alertData.title} - ${warehouse.name}`);
  } catch (error) {
    console.error("Error generating alert:", error);
  }
}

// GET endpoint for manual trigger (development/testing)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Cron job not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized - Use POST with Bearer token" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    message: "Use POST method to trigger aging update",
    endpoint: "/api/cron/update-aging",
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });
}
