import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Stock } from "@/models/Stock";
import { Warehouse } from "@/models/Warehouse";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch product
    const product = await Product.findById(id)
      .populate("category", "name")
      .lean();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Fetch stock for this product
    const stock = await Stock.findOne({ productId: id })
      .populate("warehouseId", "name address")
      .lean();

    // Format response
    const response: any = {
      _id: product._id,
      name: product.name,
      sku: product.sku,
      unitPrice: product.unitPrice,
      unitType: product.unitType,
    };

    if (stock) {
      const warehouse = stock.warehouseId as any;
      response.stock = {
        warehouseName: warehouse?.name || "Unknown Warehouse",
        quantity: stock.quantityAvailable,
        ageInDays: stock.ageInDays,
        status: stock.status,
      };
    }

    return NextResponse.json(
      {
        success: true,
        product: response,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching product details:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch product details",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
