import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Stock } from "@/models/Stock";
import { StockMovement } from "@/models/StockMovement";
import { User } from "@/models/User";
import { Warehouse } from "@/models/Warehouse";
import { getCurrentUser } from "@/lib/auth";
import { canAccessWarehouse, forbiddenResponse } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(currentUser.userId);
    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "Please complete onboarding first" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      stockId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      transferDate,
      reason,
      vehicleNumber,
      driverName,
      expectedDelivery,
      exitPhoto,
      entryPhoto,
    } = body;

    // Validate required fields
    if (!stockId || !fromWarehouseId || !toWarehouseId || !quantity) {
      return NextResponse.json(
        { error: "Stock, warehouses, and quantity are required" },
        { status: 400 }
      );
    }

    // ADDED - prevent negative or zero quantity
    if (quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0" },
        { status: 400 }
      );
    }

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { error: "Source and destination warehouses must be different" },
        { status: 400 }
      );
    }

    // --- ALL VALIDATIONS BEFORE TRANSACTION ---

    const stock = await Stock.findOne({
      _id: stockId,
      warehouseId: fromWarehouseId,
      companyId: user.companyId,
    }).populate("productId", "name sku unitPrice");

    if (!stock) {
      return NextResponse.json(
        { error: "Stock not found in source warehouse" },
        { status: 404 }
      );
    }

    if (stock.quantityAvailable < quantity) {
      return NextResponse.json(
        { error: `Insufficient quantity. Only ${stock.quantityAvailable} units available` },
        { status: 400 }
      );
    }

    const [fromWarehouse, toWarehouse] = await Promise.all([
      Warehouse.findOne({ _id: fromWarehouseId, companyId: user.companyId }),
      Warehouse.findOne({ _id: toWarehouseId, companyId: user.companyId }),
    ]);

    if (!fromWarehouse || !toWarehouse) {
      return NextResponse.json(
        { error: "Invalid warehouse selection" },
        { status: 400 }
      );
    }

    // Warehouse managers can only transfer between their assigned warehouses
    if (!canAccessWarehouse(user, fromWarehouseId)) {
      return forbiddenResponse("You do not have access to the source warehouse");
    }
    if (!canAccessWarehouse(user, toWarehouseId)) {
      return forbiddenResponse("You do not have access to the destination warehouse");
    }

    // Check destination capacity
    const destinationStocks = await Stock.find({
      warehouseId: toWarehouseId,
      companyId: user.companyId,
    });
    const currentOccupancy = destinationStocks.reduce(
      (sum, s) => sum + s.quantityAvailable, 0
    );
    const availableCapacity = (toWarehouse.capacity || 1000) - currentOccupancy;

    if (quantity > availableCapacity) {
      return NextResponse.json(
        { error: `Destination warehouse has insufficient capacity. Only ${availableCapacity} units available` },
        { status: 400 }
      );
    }

    // --- START TRANSACTION - ONLY WRITES INSIDE HERE ---

    session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Write 1 - Deduct from source stock
      const updatedSourceStock = await Stock.findByIdAndUpdate(
        stock._id,
        { $inc: { quantityAvailable: -quantity } },
        { session, new: true }
      );

      // Write 2 - Add to destination stock
      // FIXED - check for any document from the same batch family
      // not just exact batchId match
      // this handles the case where stock is transferred back to
      // a warehouse that already has the original batch document
      const existingDestStock = await Stock.findOne({
        warehouseId: toWarehouseId,
        companyId: user.companyId,
        $or: [
          { batchId: stock.batchId },
          { batchId: stock.parentBatchId },
          { parentBatchId: stock.batchId },
          { parentBatchId: stock.parentBatchId },
        ],
      }).session(session);

      let destinationStock;

      if (existingDestStock) {
        // Destination already has stock from this batch family
        // just increment quantity - no new document needed
        destinationStock = await Stock.findByIdAndUpdate(
          existingDestStock._id,
          { $inc: { quantityAvailable: quantity } },
          { session, new: true }
        );
      } else {
        // Destination has never seen this batch before
        // create new document with parentBatchId linking to origin
        // FIXED - new unique batchId to avoid duplicate key error
        // FIXED - parentBatchId always points to the ORIGINAL batch
        //         not the intermediate transfer document
        //         this keeps the chain flat no matter how many transfers happen
        [destinationStock] = await Stock.create([{
          companyId: user.companyId,
          productId: stock.productId._id,
          warehouseId: toWarehouseId,
          createdBy: currentUser.userId,
          batchId: `${stock.batchId}-T${Date.now()}`,
          parentBatchId: stock.parentBatchId || stock.batchId,
          quantityReceived: quantity,
          quantityAvailable: quantity,
          quantityDamaged: 0,
          entryDate: stock.entryDate,       // PRESERVE original entry date for aging
          expiryDate: stock.expiryDate,
          ageInDays: stock.ageInDays,       // PRESERVE original age for cron job
          status: stock.status,
          entryPhotos: entryPhoto ? [{
            url: entryPhoto,
            uploadedBy: currentUser.userId,
            timestamp: new Date(),
          }] : [],
        }], { session });
      }

      // Write 3 - Create StockMovement audit record
      await StockMovement.create([{
        stockId: stock._id,
        productId: stock.productId._id,
        warehouseId: fromWarehouseId,
        performedBy: currentUser.userId,
        quantity,
        unitPrice: (stock.productId as any).unitPrice,
        totalValue: quantity * (stock.productId as any).unitPrice,
        reason: reason || "Stock transfer",
        timestamp: transferDate || new Date(),
        movementType: "transfer",
        fromWarehouse: fromWarehouse.name,
        fromStockId: stock._id,
        toWarehouse: toWarehouse.name,
        toStockId: destinationStock._id,
        transportDetails: {
          vehicleNumber,
          driverName,
          expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
        },
        transferStatus: entryPhoto ? "completed" : "in_transit",
        initiatedAt: new Date(),
        completedAt: entryPhoto ? new Date() : undefined,
        initiatedBy: currentUser.userId,
        completedBy: entryPhoto ? currentUser.userId : undefined,
        photos: [
          ...(exitPhoto ? [{ url: exitPhoto, type: "exit" }] : []),
          ...(entryPhoto ? [{ url: entryPhoto, type: "entry" }] : []),
        ],
      }], { session });

      // All writes succeeded - commit
      await session.commitTransaction();

      return NextResponse.json({
        success: true,
        message: "Stock transferred successfully",
        transfer: {
          fromWarehouse: fromWarehouse.name,
          toWarehouse: toWarehouse.name,
          product: stock.productId,
          quantity,
          sourceStock: updatedSourceStock,
          destinationStock,
        },
      }, { status: 200 });

    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    }

  } catch (error) {
    console.error("Error transferring stock:", error);
    return NextResponse.json({
      error: "Failed to transfer stock",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });

  } finally {
    if (session) session.endSession();
  }
}

// GET transfer history - already fixed tenant isolation
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(currentUser.userId);
    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "Please complete onboarding first" },
        { status: 400 }
      );
    }

    const companyStocks = await Stock.find({
      companyId: user.companyId
    }).select("_id");

    const stockIds = companyStocks.map(s => s._id);

    const transfers = await StockMovement.find({
      movementType: "transfer",
      stockId: { $in: stockIds },
    })
      .populate("productId", "name sku unitPrice")
      .populate("performedBy", "name email")
      .populate("stockId", "warehouseId")
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      transfers,
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json({
      error: "Failed to fetch transfers",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}