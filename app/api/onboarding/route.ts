import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { SystemConfig } from "@/models/SystemConfig";
import { Warehouse } from "@/models/Warehouse";
import { ProductCategory } from "@/models/ProductCategory";
import { getCurrentUser, signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    // Parse request body
    const body = await req.json();
    const { company, warehouses, categories, admin } = body;

    // Connect to database
    await connectDB();

    // Get authenticated user if present
    const currentUser = await getCurrentUser();

    let existingUser = null;
    let onboardingToken: string | null = null;

    if (currentUser) {
      existingUser = await User.findById(currentUser.userId);
      if (!existingUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
    } else {
      // No authenticated user — create admin user from payload
      if (!admin || !admin.name || !admin.email || !admin.password) {
        return NextResponse.json({ error: "Admin details required for signup" }, { status: 400 });
      }

      // Check existing user by email
      const existingByEmail = await User.findOne({ email: admin.email.toLowerCase() }).lean();
      if (existingByEmail) {
        return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
      }

      // Hash password and create the user (no company yet)
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      const newUser = await User.create({
        name: admin.name,
        email: admin.email.toLowerCase(),
        password: hashedPassword,
        role: "super_admin",
      });

      // Sign token so we can set cookie on final response
      const token = signToken({ userId: newUser._id.toString(), email: newUser.email });
      onboardingToken = token;

      existingUser = await User.findById(newUser._id);
    }

    // Validate required fields
    if (!company?.name) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    if (!warehouses || !Array.isArray(warehouses) || warehouses.length === 0) {
      return NextResponse.json(
        { error: "At least one warehouse is required" },
        { status: 400 }
      );
    }

    // Categories validation (ensure it's an array)
    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: "Categories must be provided as an array" },
        { status: 400 }
      );
    }

    // Ensure user hasn't already completed onboarding
    if (existingUser.companyId) {
      return NextResponse.json(
        { error: "User has already completed onboarding" },
        { status: 400 }
      );
    }

    // Start a transaction session
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Create the SystemConfig document
      const [systemConfig] = await SystemConfig.create(
        [
          {
            companyName: company.name,
            industryType: company.industryType || "Other",
            currency: company.currency || "USD",
            concerns: company.concerns || [],
            agingThresholds: {
              atRisk: 60,
              dead: 90,
            },
            alertSettings: {
              emailEnabled: true,
              smsEnabled: false,
            },
            xyzSettings: {
              xThreshold: 70,
              yThreshold: 20,
              zThreshold: 10,
            },
          },
        ],
        { session }
      );

      // 2. Create the warehouses
      const createdWarehouses = [];
      const warehouseIds = [];

      // Get the starting warehouse code number
      // Only look at warehouses with valid warehouseCode to avoid issues with old data
      const existingWarehouses = await Warehouse.find({ 
        warehouseCode: { $exists: true, $nin: [null, ""] } 
      })
        .sort({ warehouseCode: -1 })
        .limit(1);
      
      let startNumber = 1;
      if (existingWarehouses.length > 0 && existingWarehouses[0].warehouseCode) {
        const lastCode = existingWarehouses[0].warehouseCode;
        const match = lastCode.match(/WH(\d+)/);
        if (match) {
          startNumber = parseInt(match[1]) + 1;
        }
      }

      for (let i = 0; i < warehouses.length; i++) {
        const warehouse = warehouses[i];
        const warehouseCode = `WH${String(startNumber + i).padStart(3, "0")}`;

        const [newWarehouse] = await Warehouse.create(
          [
            {
              companyId: systemConfig._id,
              name: warehouse.name,
              warehouseCode,
              address: {
                street: warehouse.location?.street || "",
                city: warehouse.location?.city || "",
                state: warehouse.location?.state || "",
                pin: warehouse.location?.pin || "",
                country: warehouse.location?.country || "India",
              },
              manager: warehouse.manager ? warehouse.manager : existingUser._id,
              capacity: warehouse.capacity || undefined,
              isActive: true,
            },
          ],
          { session }
        );
        
        createdWarehouses.push(newWarehouse);
        warehouseIds.push(newWarehouse._id.toString());
      }

      // 3. Create product categories if provided
      const createdCategories = [];
      if (categories && Array.isArray(categories) && categories.length > 0) {
        for (const category of categories) {
          const [newCategory] = await ProductCategory.create(
            [
              {
                companyId: systemConfig._id,
                name: category.name,
                agingConcern: category.agingConcern,
                agingDays: category.agingDays,
                isFragile: category.isFragile,
                requiresPhotoVerification: category.requiresPhotoVerification,
                isActive: true,
              },
            ],
            { session }
          );
          createdCategories.push(newCategory);
        }
      }

      // 4. Update the user with company reference and warehouses
      existingUser.companyId = systemConfig._id;
      existingUser.assignedWarehouses = warehouseIds;
      existingUser.role = "super_admin";
      await existingUser.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      const payload = {
        success: true,
        message: "Onboarding completed successfully",
        userId: existingUser._id.toString(),
        warehouseIds: warehouseIds,
        categoryIds: createdCategories.map((cat) => cat._id.toString()),
      };

      const res = NextResponse.json(payload, { status: 201 });
      if (onboardingToken) {
        res.cookies.set({
          name: "auth-token",
          value: onboardingToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
      }

      return res;
    } catch (transactionError) {
      // Abort transaction on error
      await session.abortTransaction();
      throw transactionError;
    }
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      {
        error: "Failed to complete onboarding",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  } finally {
    // End session
    if (session) {
      session.endSession();
    }
  }
}
