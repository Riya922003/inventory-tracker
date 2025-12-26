import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Alert } from "@/models/Alert";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

// GET single alert
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const alert = await Alert.findOne({
      _id: id,
      companyId: user.companyId,
    })
      .populate("productId", "name sku unitPrice")
      .populate("warehouseId", "name address")
      .populate("stockId", "batchId quantityAvailable ageInDays")
      .populate("acknowledgedBy", "name email")
      .populate("resolvedBy", "name email");

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error("Error fetching alert:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch alert",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update alert status (acknowledge, resolve, dismiss)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json();
    const { action, notes } = body;

    if (!["acknowledge", "resolve", "dismiss"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use: acknowledge, resolve, or dismiss" },
        { status: 400 }
      );
    }

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

    const { id } = await params;

    const alert = await Alert.findOne({
      _id: id,
      companyId: user.companyId,
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Update based on action
    const updateData: any = {};

    if (action === "acknowledge") {
      updateData.status = "acknowledged";
      updateData.acknowledgedBy = user._id;
      updateData.acknowledgedAt = new Date();
    } else if (action === "resolve") {
      updateData.status = "resolved";
      updateData.resolvedBy = user._id;
      updateData.resolvedAt = new Date();
      if (notes) {
        updateData.resolvedNotes = notes;
      }
    } else if (action === "dismiss") {
      updateData.status = "dismissed";
    }

    const updatedAlert = await Alert.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
      .populate("productId", "name sku")
      .populate("warehouseId", "name");

    return NextResponse.json({
      success: true,
      message: `Alert ${action}d successfully`,
      alert: updatedAlert,
    });
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json(
      {
        error: "Failed to update alert",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
