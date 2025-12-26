import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Stock } from "@/models/Stock";
import { ProductCategory } from "@/models/ProductCategory";
import { Warehouse } from "@/models/Warehouse";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    const body = await req.json();
    const {
      name,
      sku,
      category,
      unitPrice,
      unitType,
      isFragile,
      hasExpiryDate,
      hasStock,
      warehouseId,
      quantity,
      receivedDate,
      entryPhoto,
    } = body;

    // Validate required product fields
    if (!name || !sku || !category || !unitPrice || !unitType) {
      return NextResponse.json(
        { error: "Missing required product fields" },
        { status: 400 }
      );
    }

    // If hasStock is true, validate stock fields
    if (hasStock && (!warehouseId || !quantity)) {
      return NextResponse.json(
        { error: "Warehouse and quantity are required when adding stock" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get authenticated user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data to get companyId
    const user = await User.findById(currentUser.userId);
    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "Please complete onboarding first" },
        { status: 400 }
      );
    }

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

    // If hasStock, verify warehouse exists
    if (hasStock) {
      const warehouseExists = await Warehouse.findById(warehouseId);
      if (!warehouseExists) {
        return NextResponse.json(
          { error: "Invalid warehouse selected" },
          { status: 400 }
        );
      }
    }

    // Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create the product
      const [newProduct] = await Product.create(
        [
          {
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
          },
        ],
        { session }
      );

      let stockEntry = null;

      // Create stock entry if hasStock is true
      if (hasStock) {
        // Generate batch ID
        const batchId = `${sku}-${Date.now()}`;

        // Parse received date or use current date
        const entryDate = receivedDate ? new Date(receivedDate) : new Date();

        // Create stock entry
        const entryPhotos = entryPhoto
          ? [
              {
                url: entryPhoto,
                uploadedBy: user._id,
                timestamp: new Date(),
              },
            ]
          : [];

        [stockEntry] = await Stock.create(
          [
            {
              companyId: user.companyId,
              productId: newProduct._id,
              warehouseId,
              createdBy: user._id,
              batchId,
              quantityReceived: quantity,
              quantityAvailable: quantity,
              quantityDamaged: 0,
              entryDate,
              expiryDate: null,
              ageInDays: 0,
              status: "healthy",
              entryPhotos,
            },
          ],
          { session }
        );
      }

      // Commit transaction
      await session.commitTransaction();

      return NextResponse.json(
        {
          success: true,
          message: "Product created successfully",
          product: {
            _id: newProduct._id,
            name: newProduct.name,
            sku: newProduct.sku,
          },
          stock: stockEntry
            ? {
                _id: stockEntry._id,
                batchId: stockEntry.batchId,
                quantity: stockEntry.quantityAvailable,
              }
            : null,
        },
        { status: 201 }
      );
    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    }
  } catch (error) {
    console.error("Error creating product with stock:", error);
    return NextResponse.json(
      {
        error: "Failed to create product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    if (session) {
      session.endSession();
    }
  }
}
