import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ProductCategory } from "@/models/ProductCategory";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Get all active categories
    const categories = await ProductCategory.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        categories,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch categories",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
