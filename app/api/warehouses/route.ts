import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
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
      return NextResponse.json(
        {
          success: true,
          warehouses: [],
        },
        { status: 200 }
      );
    }

    // Fetch only user's warehouses
    const warehouses = await Warehouse.find({
      _id: { $in: user.assignedWarehouses },
      isActive: true,
    })
      .select("_id name address")
      .sort({ name: 1 });

    return NextResponse.json(
      {
        success: true,
        warehouses,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch warehouses",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
