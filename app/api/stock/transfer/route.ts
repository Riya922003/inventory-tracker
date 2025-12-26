import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Stock } from "@/models/Stock";
import { StockMovement } from "@/models/StockMovement";
import { User } from "@/models/User";
import { Warehouse } from "@/models/Warehouse";
import { getCurrentUser } from "@/lib/auth";

// POST create stock transfer
export async function POST(req: NextRequest) {
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

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { error: "Source and destination warehouses must be different" },
        { status: 400 }
      );
    }

    // Verify stock exists and belongs to source warehouse
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

    // Check if sufficient quantity available
    if (stock.quantityAvailable < quantity) {
      return NextResponse.json(
        {
          error: `Insufficient quantity. Only ${stock.quantityAvailable} units available`,
        },
        { status: 400 }
      );
    }

    // Verify both warehouses exist and belong to company
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

    // Check destination warehouse capacity
    const destinationStocks = await Stock.find({
      warehouseId: toWarehouseId,
      companyId: user.companyId,
    });
    const currentOccupancy = destinationStocks.reduce(
      (sum, s) => sum + s.quantityAvailable,
      0
    );
    const availableCapacity = (toWarehouse.capacity || 1000) - currentOccupancy;

    if (quantity > availableCapacity) {
      return NextResponse.json(
        {
          error: `Destination warehouse has insufficient capacity. Only ${availableCapacity} units available`,
        },
        { status: 400 }
      );
    }

    // Update source stock (reduce quantity)
    stock.quantityAvailable -= quantity;
    await stock.save();

    // Create or update destination stock
    let destinationStock = await Stock.findOne({
      productId: stock.productId._id,
      warehouseId: toWarehouseId,
      companyId: user.companyId,
      batchId: stock.batchId,
    });

    if (destinationStock) {
      // Add to existing stock
      destinationStock.quantityAvailable += quantity;
      await destinationStock.save();
    } else {
      // Create new stock entry at destination
      destinationStock = await Stock.create({
        companyId: user.companyId,
        productId: stock.productId._id,
        warehouseId: toWarehouseId,
        createdBy: currentUser.userId,
        batchId: stock.batchId,
        quantityReceived: quantity,
        quantityAvailable: quantity,
        quantityDamaged: 0,
        entryDate: transferDate || new Date(),
        expiryDate: stock.expiryDate,
        ageInDays: stock.ageInDays,
        status: stock.status,
        entryPhotos: entryPhoto
          ? [
              {
                url: entryPhoto,
                uploadedBy: currentUser.userId,
                timestamp: new Date(),
              },
            ]
          : [],
      });
    }

    // Create stock movement records with enhanced transfer tracking
    const transferData = {
      productId: stock.productId._id,
      performedBy: currentUser.userId,
      quantity,
      unitPrice: (stock.productId as any).unitPrice,
      totalValue: quantity * (stock.productId as any).unitPrice,
      reason: reason || "Stock transfer",
      timestamp: transferDate || new Date(),
      movementType: "transfer" as const,
      fromWarehouse: fromWarehouse.name,
      fromStockId: stock._id,
      toWarehouse: toWarehouse.name,
      toStockId: destinationStock._id,
      exitPhoto,
      entryPhoto,
      transportDetails: {
        vehicleNumber,
        driverName,
        driverPhone: "",
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
      },
      transferStatus: entryPhoto ? ("completed" as const) : ("in_transit" as const),
      initiatedAt: new Date(),
      completedAt: entryPhoto ? new Date() : undefined,
      initiatedBy: currentUser.userId,
      completedBy: entryPhoto ? currentUser.userId : undefined,
    };

    // Create single comprehensive transfer movement record
    await StockMovement.create({
      ...transferData,
      stockId: stock._id,
      warehouseId: fromWarehouseId.toString(),
      photos: [
        ...(exitPhoto ? [{ url: exitPhoto, type: "exit" as const }] : []),
        ...(entryPhoto ? [{ url: entryPhoto, type: "entry" as const }] : []),
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Stock transferred successfully",
        transfer: {
          fromWarehouse: fromWarehouse.name,
          toWarehouse: toWarehouse.name,
          product: stock.productId,
          quantity,
          sourceStock: stock,
          destinationStock,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error transferring stock:", error);
    return NextResponse.json(
      {
        error: "Failed to transfer stock",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET transfer history
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

    // Get all transfer movements
    const transfers = await StockMovement.find({
      movementType: "transfer",
    })
      .populate("productId", "name sku unitPrice")
      .populate("performedBy", "name email")
      .populate("stockId", "warehouseId")
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(
      {
        success: true,
        transfers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch transfers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
