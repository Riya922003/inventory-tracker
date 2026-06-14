import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Warehouse } from "@/models/Warehouse";
import { User } from "@/models/User";
import { Stock } from "@/models/Stock";
import { StockMovement } from "@/models/StockMovement";
import { Product } from "@/models/Product";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin, forbiddenResponse } from "@/lib/permissions";
import { getUserWarehouseIds } from "@/lib/pg-permissions";

// GET all warehouses with metrics
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

    // Fetch all company warehouses with manager info
    let warehouseQuery: any = { companyId: user.companyId, isActive: true };

    // Warehouse managers only see their assigned warehouses (PostgreSQL check)
    if (user.role === "warehouse_manager") {
      const assignedIds = await getUserWarehouseIds(user._id.toString());
      warehouseQuery._id = { $in: assignedIds };
    }

    const warehouses = await Warehouse.find(warehouseQuery)
      .populate("managers", "name email")
      .sort({ name: 1 })
      .lean();

    // Ensure Product model is registered for populate
    Product;

    // Calculate metrics for each warehouse
    const warehousesWithMetrics = await Promise.all(
      warehouses.map(async (warehouse) => {
        // Get all stock in this warehouse
        const stocks = await Stock.find({
          warehouseId: warehouse._id,
          companyId: user.companyId,
        }).populate("productId", "unitPrice");

        // Calculate metrics
        const uniqueProducts = new Set(
          stocks.map((s) => s.productId._id.toString())
        ).size;

        const totalValue = stocks.reduce((sum, stock) => {
          const price = (stock.productId as any)?.unitPrice || 0;
          return sum + stock.quantityAvailable * price;
        }, 0);

        const totalQuantity = stocks.reduce(
          (sum, stock) => sum + stock.quantityAvailable,
          0
        );

        const atRiskCount = stocks.filter((s) => s.status === "at_risk").length;
        const deadCount = stocks.filter((s) => s.status === "dead").length;

        // Calculate utilization
        const capacity = warehouse.capacity || 1000;
        const utilization = Math.min(
          Math.round((totalQuantity / capacity) * 100),
          100
        );

        // Get last activity (most recent stock movement)
        const lastMovement = await StockMovement.findOne({
          warehouseId: warehouse._id.toString(),
        })
          .sort({ timestamp: -1 })
          .lean();

        // Get movements this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklyMovements = await StockMovement.countDocuments({
          warehouseId: warehouse._id.toString(),
          timestamp: { $gte: weekAgo },
        });

        return {
          _id: warehouse._id,
          name: warehouse.name,
          address: warehouse.address,
          managers: warehouse.managers,
          capacity: warehouse.capacity,
          metrics: {
            productCount: uniqueProducts,
            totalValue,
            totalQuantity,
            utilization,
            atRiskCount,
            deadCount,
            lastActivity: lastMovement?.timestamp || warehouse.createdAt,
            weeklyMovements,
          },
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        warehouses: warehousesWithMetrics,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch warehouses",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST create new warehouse
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

    // Only super admins can create warehouses
    if (!isSuperAdmin(user)) {
      return forbiddenResponse("Only admins can create warehouses");
    }

    const body = await req.json();
    // Accept either a single managerId string or an array; normalise to array
    const { name, address, manager, capacity, contactPhone, contactEmail, notes } = body;
    const managerIds: string[] = manager
      ? Array.isArray(manager) ? manager : [manager]
      : [];

    // Validate required fields
    if (!name || !address?.street || !address?.city || !address?.state || !address?.pin) {
      return NextResponse.json(
        { error: "Name, street, city, state, and PIN are required" },
        { status: 400 }
      );
    }

    // Check if warehouse name already exists for this company
    const existingWarehouse = await Warehouse.findOne({
      companyId: user.companyId,
      name,
      isActive: true,
    });

    if (existingWarehouse) {
      return NextResponse.json(
        { error: "A warehouse with this name already exists" },
        { status: 400 }
      );
    }

    // Generate unique warehouse code
    // Find ALL warehouses (not just for this company) to ensure global uniqueness
    const allWarehouses = await Warehouse.find({ 
      warehouseCode: { $exists: true, $ne: null }
    })
      .select("warehouseCode companyId")
      .lean();
    
    let nextNumber = 1;
    if (allWarehouses.length > 0) {
      // Extract all numbers from existing codes and find the max
      const numbers = allWarehouses
        .map(w => {
          const match = w.warehouseCode?.match(/WH(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(n => n > 0);
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }
    
    const warehouseCode = `WH${String(nextNumber).padStart(3, "0")}`;

    // Double-check that this code doesn't exist globally
    const codeExists = await Warehouse.findOne({
      warehouseCode: warehouseCode
    });

    if (codeExists) {
      console.error("Code conflict detected for:", warehouseCode);
      // Generate a timestamp-based unique code
      const timestamp = Date.now().toString().slice(-4);
      const fallbackCode = `WH${timestamp}`;
      
      return NextResponse.json(
        { 
          error: "Warehouse code conflict detected. Please try again.",
          suggestedCode: fallbackCode,
          debug: {
            attemptedCode: warehouseCode,
            existingCompany: codeExists.companyId,
            yourCompany: user.companyId
          }
        },
        { status: 409 }
      );
    }

    // If managers are provided, verify each exists, belongs to the company, and is a warehouse_manager
    if (managerIds.length > 0) {
      const managerUsers = await User.find({
        _id: { $in: managerIds },
        companyId: user.companyId,
      }).select("_id role");

      if (managerUsers.length !== managerIds.length) {
        return NextResponse.json(
          { error: "One or more selected managers are invalid" },
          { status: 400 }
        );
      }

      const nonManager = managerUsers.find((u) => u.role !== "warehouse_manager");
      if (nonManager) {
        return NextResponse.json(
          { error: "Only users with the Warehouse Manager role can be assigned as managers" },
          { status: 400 }
        );
      }
    }

    // Create warehouse
    const warehouse = await Warehouse.create({
      companyId: user.companyId,
      name,
      warehouseCode,
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        pin: address.pin,
        country: address.country || "India",
      },
      managers: managerIds,
      capacity: capacity || 1000,
      contactPhone: contactPhone || "",
      contactEmail: contactEmail || "",
      notes: notes || "",
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Warehouse created successfully",
        warehouse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return NextResponse.json(
      {
        error: "Failed to create warehouse",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
