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

    const alerts = await Alert.find(query)
      .populate("productId", "name sku")
      .populate("warehouseId", "name")
      .populate("acknowledgedBy", "name")
      .populate("resolvedBy", "name")
      .sort({ severity: 1, createdAt: -1 }); // Critical first, then by date

    // Group by severity for better UX
    const grouped = {
      critical: alerts.filter((a) => a.severity === "critical"),
      warning: alerts.filter((a) => a.severity === "warning"),
      info: alerts.filter((a) => a.severity === "info"),
    };

    return NextResponse.json({
      success: true,
      alerts,
      grouped,
      total: alerts.length,
      counts: {
        critical: grouped.critical.length,
        warning: grouped.warning.length,
        info: grouped.info.length,
      },
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
