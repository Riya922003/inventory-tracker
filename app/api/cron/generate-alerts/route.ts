import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { generateCronAlerts } from "@/lib/alert-generator";
import { supabaseAdmin } from "@/lib/supabase";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // Get all unique active company IDs
    const companyIds: mongoose.Types.ObjectId[] = await User.distinct("companyId", {
      companyId: { $exists: true, $ne: null },
      isActive: true,
    });

    let processed = 0;
    const errors: string[] = [];

    for (const companyId of companyIds) {
      try {
        await generateCronAlerts(companyId);
        processed++;
      } catch (err) {
        console.error(`Alert generation failed for company ${companyId}:`, err);
        errors.push(`${companyId}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }

    // Keep Supabase project active (prevents free-tier auto-pause after 7 days inactivity)
    await supabaseAdmin.from("user_warehouse_permissions").select("id").limit(1);

    return NextResponse.json({
      success: true,
      processed,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron alert generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate alerts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
