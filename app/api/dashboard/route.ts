import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";
import { CommonErrors, jsonSuccess } from "@/lib/api-response";
import { getDashboardData } from "@/lib/dashboard-data";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return CommonErrors.unauthorized();

    await connectDB();

    const user = await User.findById(currentUser.userId).lean();
    if (!user) return CommonErrors.notFound("User");

    const u = user as any;
    if (!u.companyId) {
      return CommonErrors.badRequest(
        "Please complete onboarding first",
        "User account is missing company information"
      );
    }

    const data = await getDashboardData(
      u.companyId.toString(),
      u.role ?? "warehouse_manager",
      (u.assignedWarehouses ?? []).map((id: any) => id.toString())
    );

    return jsonSuccess(data);
  } catch (error) {
    console.error("Dashboard error:", error);
    return CommonErrors.serverError(
      "Failed to fetch dashboard data",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
