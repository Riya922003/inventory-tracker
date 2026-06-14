import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

// GET all users in the company
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

    // Optional role filter — e.g. /api/users?role=warehouse_manager
    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");

    const query: any = { companyId: user.companyId };
    if (roleFilter) query.role = roleFilter;

    // Fetch users in the same company (optionally filtered by role)
    const users = await User.find(query)
      .select("_id name email role")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        users,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch users",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
