import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Warehouse } from "@/models/Warehouse";
import { User } from "@/models/User";
import { Stock } from "@/models/Stock";
import { getCurrentUser } from "@/lib/auth";

// GET single warehouse with details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const warehouse = await Warehouse.findOne({
      _id: id,
      companyId: user.companyId,
    }).populate("manager", "name email");

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, warehouse }, { status: 200 });
  } catch (error) {
    console.error("Error fetching warehouse:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch warehouse",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT update warehouse
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, address, manager, capacity, contactPhone, contactEmail, notes } = body;

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

    // Check if warehouse exists and belongs to user's company
    const warehouse = await Warehouse.findOne({
      _id: id,
      companyId: user.companyId,
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // If name is being changed, check if new name already exists
    if (name && name !== warehouse.name) {
      const existingWarehouse = await Warehouse.findOne({
        name,
        companyId: user.companyId,
        _id: { $ne: id },
        isActive: true,
      });
      if (existingWarehouse) {
        return NextResponse.json(
          { error: "A warehouse with this name already exists" },
          { status: 400 }
        );
      }
    }

    // If manager is being changed, verify they exist
    if (manager) {
      const managerUser = await User.findOne({
        _id: manager,
        companyId: user.companyId,
      });
      if (!managerUser) {
        return NextResponse.json(
          { error: "Invalid manager selected" },
          { status: 400 }
        );
      }
    }

    // Update warehouse
    const updatedWarehouse = await Warehouse.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(address && { address }),
        ...(manager !== undefined && { manager: manager || null }),
        ...(capacity !== undefined && { capacity }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(notes !== undefined && { notes }),
      },
      { new: true, runValidators: true }
    ).populate("manager", "name email");

    return NextResponse.json(
      {
        success: true,
        message: "Warehouse updated successfully",
        warehouse: updatedWarehouse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return NextResponse.json(
      {
        error: "Failed to update warehouse",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE (Archive) warehouse
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Check if warehouse exists and belongs to user's company
    const warehouse = await Warehouse.findOne({
      _id: id,
      companyId: user.companyId,
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Check if warehouse has active stock
    const hasStock = await Stock.findOne({
      warehouseId: id,
      quantityAvailable: { $gt: 0 },
    });

    if (hasStock) {
      return NextResponse.json(
        {
          error:
            "Cannot delete warehouse with active stock. Please transfer or remove all stock first.",
        },
        { status: 400 }
      );
    }

    // Soft delete - set isActive to false
    await Warehouse.findByIdAndUpdate(id, { isActive: false });

    return NextResponse.json(
      {
        success: true,
        message: "Warehouse archived successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return NextResponse.json(
      {
        error: "Failed to delete warehouse",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
