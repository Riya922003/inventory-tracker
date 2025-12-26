import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Stock } from "@/models/Stock";
import { StockMovement } from "@/models/StockMovement";
import { Product } from "@/models/Product";
import { Warehouse } from "@/models/Warehouse";
import { User } from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    const body = await req.json();
    const {
      stockId,
      productId,
      warehouseId,
      quantity,
      customerName,
      exitPhoto,
      orderReference,
      exitDate,
    } = body;

    // Validate required fields
    if (!stockId || !productId || !warehouseId || !quantity) {
      return NextResponse.json(
        { error: "Stock, product, warehouse, and quantity are required" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0" },
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

    // Verify stock exists and belongs to company
    const stock = await Stock.findOne({
      _id: stockId,
      companyId: user.companyId,
    });

    if (!stock) {
      return NextResponse.json(
        { error: "Stock entry not found" },
        { status: 404 }
      );
    }

    // Check if enough quantity is available
    if (stock.quantityAvailable < quantity) {
      return NextResponse.json(
        {
          error: `Insufficient stock. Available: ${stock.quantityAvailable}, Requested: ${quantity}`,
        },
        { status: 400 }
      );
    }

    // Verify product and warehouse match
    if (
      stock.productId.toString() !== productId ||
      stock.warehouseId.toString() !== warehouseId
    ) {
      return NextResponse.json(
        { error: "Product or warehouse mismatch" },
        { status: 400 }
      );
    }

    // Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update stock quantity
      stock.quantityAvailable -= quantity;
      await stock.save({ session });

      // Create exit photos array
      const exitPhotos = exitPhoto
        ? [
            {
              url: exitPhoto,
              type: "exit" as const,
            },
          ]
        : [];

      // Create stock movement record
      const [movement] = await StockMovement.create(
        [
          {
            stockId: stock._id,
            productId: stock.productId,
            warehouseId: stock.warehouseId,
            performedBy: user._id,
            movementType: "out",
            quantity,
            reason: customerName
              ? `Sale to ${customerName}${orderReference ? ` (${orderReference})` : ""}`
              : `Stock dispatch${orderReference ? ` (${orderReference})` : ""}`,
            photos: exitPhotos,
            timestamp: exitDate ? new Date(exitDate) : new Date(),
          },
        ],
        { session }
      );

      // Commit transaction
      await session.commitTransaction();

      // Populate product and warehouse for response
      const product = await Product.findById(stock.productId).select("name sku");
      const warehouse = await Warehouse.findById(stock.warehouseId).select("name");

      return NextResponse.json(
        {
          success: true,
          message: "Stock exit recorded successfully",
          stockExit: {
            _id: movement._id,
            batchId: stock.batchId,
            quantity,
            remainingQuantity: stock.quantityAvailable,
            product: {
              _id: product?._id,
              name: product?.name,
              sku: product?.sku,
            },
            warehouse: {
              _id: warehouse?._id,
              name: warehouse?.name,
            },
            customerName,
            orderReference,
          },
        },
        { status: 201 }
      );
    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    }
  } catch (error) {
    console.error("Stock exit error:", error);
    return NextResponse.json(
      {
        error: "Failed to record stock exit",
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

// GET all stock movements
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
    const movementType = searchParams.get("type");

    // Build query - need to get stocks first to filter by company
    const stockQuery: any = { companyId: user.companyId };
    if (productId) stockQuery.productId = productId;
    if (warehouseId) stockQuery.warehouseId = warehouseId;

    const stocks = await Stock.find(stockQuery).select("_id");
    const stockIds = stocks.map((s) => s._id);

    // Build movement query
    const movementQuery: any = { stockId: { $in: stockIds } };
    if (movementType) movementQuery.movementType = movementType;

    const movements = await StockMovement.find(movementQuery)
      .populate("productId", "name sku unitType")
      .populate("warehouseId", "name")
      .populate("performedBy", "name email")
      .sort({ timestamp: -1 });

    return NextResponse.json(
      {
        success: true,
        movements,
        total: movements.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch stock movements",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
