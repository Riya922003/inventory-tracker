import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Stock } from "@/models/Stock";
import { Product } from "@/models/Product";
import { Warehouse } from "@/models/Warehouse";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    const body = await req.json();
    const {
      productId,
      warehouseId,
      quantity,
      entryDate,
      entryPhoto,
      expiryDate,
      purchasePrice,
      supplierInvoice,
    } = body;

    // Validate required fields
    if (!productId || !warehouseId || !quantity) {
      return NextResponse.json(
        { error: "Product, warehouse, and quantity are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get authenticated user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data
    const user = await User.findById(currentUser.userId);
    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "Please complete onboarding first" },
        { status: 400 }
      );
    }

    // Verify product exists and belongs to company
    const product = await Product.findOne({
      _id: productId,
      companyId: user.companyId,
      isActive: true,
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found or inactive" },
        { status: 404 }
      );
    }

    // Verify warehouse exists and belongs to company
    const warehouse = await Warehouse.findOne({
      _id: warehouseId,
      companyId: user.companyId,
      isActive: true,
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found or inactive" },
        { status: 404 }
      );
    }

    // Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Generate batch ID
      const batchId = `${product.sku}-${Date.now()}`;

      // Parse dates
      const parsedEntryDate = entryDate ? new Date(entryDate) : new Date();
      const parsedExpiryDate = expiryDate ? new Date(expiryDate) : null;

      // Create entry photos array
      const entryPhotos = entryPhoto
        ? [
            {
              url: entryPhoto,
              uploadedBy: user._id,
              timestamp: new Date(),
            },
          ]
        : [];

      // Create stock entry
      const [stockEntry] = await Stock.create(
        [
          {
            companyId: user.companyId,
            productId: product._id,
            warehouseId: warehouse._id,
            createdBy: user._id,
            batchId,
            quantityReceived: quantity,
            quantityAvailable: quantity,
            quantityDamaged: 0,
            entryDate: parsedEntryDate,
            expiryDate: parsedExpiryDate,
            ageInDays: 0,
            status: "healthy",
            entryPhotos,
          },
        ],
        { session }
      );

      // Commit transaction
      await session.commitTransaction();

      return NextResponse.json(
        {
          success: true,
          message: "Stock entry recorded successfully",
          stock: {
            _id: stockEntry._id,
            batchId: stockEntry.batchId,
            quantity: stockEntry.quantityAvailable,
            product: {
              _id: product._id,
              name: product.name,
              sku: product.sku,
            },
            warehouse: {
              _id: warehouse._id,
              name: warehouse.name,
            },
          },
        },
        { status: 201 }
      );
    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    }
  } catch (error) {
    console.error("Stock entry error:", error);
    return NextResponse.json(
      {
        error: "Failed to record stock entry",
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

// GET all stock entries
export async function GET(req: NextRequest) {
  try {
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const warehouseId = searchParams.get("warehouseId");

    // Build query
    const query: any = { companyId: user.companyId };
    if (productId) query.productId = productId;
    if (warehouseId) query.warehouseId = warehouseId;

    const stockEntries = await Stock.find(query)
      .populate("productId", "name sku unitType")
      .populate("warehouseId", "name")
      .populate("createdBy", "name email")
      .sort({ entryDate: -1 });

    return NextResponse.json(
      {
        success: true,
        stocks: stockEntries,
        total: stockEntries.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching stock entries:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch stock entries",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
