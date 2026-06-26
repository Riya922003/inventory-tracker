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

    const rawAlerts = await Alert.find(query)
      .populate("productId", "name sku")
      .populate("warehouseId", "name")
      .populate("acknowledgedBy", "name")
      .populate("resolvedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Sort critical → warning → info, then newest first within each severity
    const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    const alerts = rawAlerts.sort(
      (a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3)
    );

    const counts = {
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning:  alerts.filter((a) => a.severity === "warning").length,
      info:     alerts.filter((a) => a.severity === "info").length,
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
