import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { ProductCategory } from "@/models/ProductCategory";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

// GET single product
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const product = await Product.findOne({
      _id: id,
      companyId: user.companyId,
    }).populate("category", "name agingConcern");

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product }, { status: 200 });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// UPDATE product
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, sku, category, unitPrice, unitType, isFragile, hasExpiryDate, reorderLevel } = body;

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

    // Check if product exists and belongs to user's company
    const product = await Product.findOne({
      _id: id,
      companyId: user.companyId,
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // If SKU is being changed, check if new SKU already exists
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku, _id: { $ne: id } });
      if (existingProduct) {
        return NextResponse.json(
          { error: "A product with this SKU already exists" },
          { status: 400 }
        );
      }
    }

    // If category is being changed, verify it exists
    if (category && category !== product.category.toString()) {
      const categoryExists = await ProductCategory.findById(category);
      if (!categoryExists) {
        return NextResponse.json(
          { error: "Invalid category selected" },
          { status: 400 }
        );
      }
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(sku && { sku }),
        ...(category && { category }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(unitType && { unitType }),
        ...(isFragile !== undefined && { isFragile }),
        ...(hasExpiryDate !== undefined && { hasExpiryDate }),
        ...(reorderLevel !== undefined && { reorderLevel }),
      },
      { new: true, runValidators: true }
    ).populate("category", "name");

    return NextResponse.json(
      {
        success: true,
        message: "Product updated successfully",
        product: updatedProduct,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      {
        error: "Failed to update product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE (Archive) product
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if product exists and belongs to user's company
    const product = await Product.findOne({
      _id: id,
      companyId: user.companyId,
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Soft delete - set isActive to false
    await Product.findByIdAndUpdate(id, { isActive: false });

    return NextResponse.json(
      {
        success: true,
        message: "Product archived successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        error: "Failed to delete product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
