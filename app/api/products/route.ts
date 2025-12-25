import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { ProductCategory } from "@/models/ProductCategory";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, sku, category, unitPrice, unitType, isFragile, hasExpiryDate } = body;

    // Validate required fields
    if (!name || !sku || !category || !unitPrice || !unitType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this SKU already exists" },
        { status: 400 }
      );
    }

    // Verify category exists
    const categoryExists = await ProductCategory.findById(category);
    if (!categoryExists) {
      return NextResponse.json(
        { error: "Invalid category selected" },
        { status: 400 }
      );
    }

    // Create the product
    const newProduct = await Product.create({
      name,
      sku,
      category,
      unitPrice,
      unitType: unitType || "piece",
      isFragile: isFragile || false,
      hasExpiryDate: hasExpiryDate || false,
      reorderLevel: 10, // Default reorder level
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Product created successfully",
        product: {
          _id: newProduct._id,
          name: newProduct.name,
          sku: newProduct.sku,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      {
        error: "Failed to create product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const products = await Product.find({ isActive: true })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        products,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
