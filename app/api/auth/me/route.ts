// this route is needed for fetching the user info and is used in the sidebar 
// and dashboard to hide and show features on the basis of role 


import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Warehouse } from "@/models/Warehouse";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    // Fetch full user details
    const user = await User.findById(currentUser.userId)
      .select("-password") // Exclude password
      .populate("assignedWarehouses", "name warehouseCode"); // Populate warehouse details

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        assignedWarehouses: user.assignedWarehouses,
        companyId: user.companyId,
        status: user.status,
        emailVerified: user.emailVerified,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
