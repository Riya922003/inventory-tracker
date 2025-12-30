import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { ProductCategory } from "@/models/ProductCategory";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

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

    // Get authenticated user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user data to get companyId
    const user = await User.findById(currentUser.userId);
    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "Please complete onboarding first" },
        { status: 400 }
      );
    }

    // Check if SKU already exists for this company
    const existingProduct = await Product.findOne({ 
      sku,
      companyId: user.companyId 
    });
    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this SKU already exists in your company" },
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
      companyId: user.companyId,
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

    // Get authenticated user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user data to get companyId
    const user = await User.findById(currentUser.userId);
    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "Please complete onboarding first" },
        { status: 400 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const warehouse = searchParams.get("warehouse") || "";
    const status = searchParams.get("status") || "active";

    // Build query
    const query: any = { companyId: user.companyId };
    
    // Filter by status
    if (status === "active") {
      query.isActive = true;
    } else if (status === "archived") {
      query.isActive = false;
    }

    // Search by name or SKU
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // const limit = parseInt(searchParams.get("limit") || "2");

    const products = await Product.find(query)
      .populate("category", "name agingConcern")
      .sort({ createdAt: -1 })
      // .limit(limit);

    // If warehouse filter is provided, we need to check stock
    let filteredProducts = products;
    if (warehouse) {
      const { Stock } = await import("@/models/Stock");
      const productIds = products.map(p => p._id);
      const stocks = await Stock.find({
        productId: { $in: productIds },
        warehouseId: warehouse,
      }).distinct("productId");
      
      filteredProducts = products.filter(p => 
        stocks.some(stockProdId => stockProdId.toString() === p._id.toString())
      );
    }

    return NextResponse.json(
      {
        success: true,
        products: filteredProducts,
        total: filteredProducts.length,
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
