import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Alert } from "@/models/Alert";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

// GET all alerts
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(currentUser.userId);
    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "Please complete onboarding first" },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "open";
    const type = searchParams.get("type");
    const severity = searchParams.get("severity");
    const warehouseId = searchParams.get("warehouseId");

    // Build query
    const query: any = { companyId: user.companyId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (severity) {
      query.severity = severity;
    }

    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };

    const rawAlerts = await Alert.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      // Lookup product — preserveNullAndEmptyArrays so warehouse_full alerts survive
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, sku: 1 } }],
          as: "_product",
        },
      },
      {
        $addFields: {
          productId: { $ifNull: [{ $arrayElemAt: ["$_product", 0] }, null] },
        },
      },
      // Lookup warehouse
      {
        $lookup: {
          from: "warehouses",
          localField: "warehouseId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1 } }],
          as: "_warehouse",
        },
      },
      {
        $addFields: {
          warehouseId: { $ifNull: [{ $arrayElemAt: ["$_warehouse", 0] }, null] },
        },
      },
      // Lookup acknowledgedBy
      {
        $lookup: {
          from: "users",
          localField: "acknowledgedBy",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1 } }],
          as: "_ackBy",
        },
      },
      {
        $addFields: {
          acknowledgedBy: { $ifNull: [{ $arrayElemAt: ["$_ackBy", 0] }, null] },
        },
      },
      // Lookup resolvedBy
      {
        $lookup: {
          from: "users",
          localField: "resolvedBy",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1 } }],
          as: "_resolvedBy",
        },
      },
      {
        $addFields: {
          resolvedBy: { $ifNull: [{ $arrayElemAt: ["$_resolvedBy", 0] }, null] },
        },
      },
      // Strip temp fields
      { $project: { _product: 0, _warehouse: 0, _ackBy: 0, _resolvedBy: 0 } },
    ]);

    // Sort critical → warning → info
    const alerts = rawAlerts.sort(
      (a: any, b: any) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3)
    );

    const counts = {
      critical: alerts.filter((a: any) => a.severity === "critical").length,
      warning:  alerts.filter((a: any) => a.severity === "warning").length,
      info:     alerts.filter((a: any) => a.severity === "info").length,
    };

    return NextResponse.json({
      success: true,
      alerts,
      total: alerts.length,
      counts,
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch alerts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
