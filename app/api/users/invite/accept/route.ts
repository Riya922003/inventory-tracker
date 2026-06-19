import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Invitation } from "@/models/Invitation";
import { Warehouse } from "@/models/Warehouse";
import { AuditLog } from "@/models/AuditLog";
import { sendEmail } from "@/lib/email";
import { signToken } from "@/lib/auth";
import { seedUserPermissions } from "@/lib/pg-permissions";
import bcrypt from "bcryptjs";

// GET - Verify invitation token and get details
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find invitation without populate first to debug
    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (invitation.status === "expired" || invitation.expiresAt < new Date()) {
      await Invitation.findByIdAndUpdate(invitation._id, { status: "expired" });
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Check if already accepted
    if (invitation.status === "accepted") {
      return NextResponse.json(
        { error: "This invitation has already been accepted" },
        { status: 400 }
      );
    }

    // Get inviter details and warehouse names in parallel
    let inviterName = "Admin";
    let warehouseNames: string[] = [];

    const [inviter, warehouses] = await Promise.all([
      User.findById(invitation.invitedBy).select("name").lean(),
      invitation.assignedWarehouses?.length > 0
        ? Warehouse.find({ _id: { $in: invitation.assignedWarehouses } }).select("name").lean()
        : Promise.resolve([]),
    ]);

    if (inviter) inviterName = (inviter as any).name;
    warehouseNames = (warehouses as any[]).map((w) => w.name);

    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        assignedWarehouses: invitation.assignedWarehouses,
        warehouseNames,
        personalMessage: invitation.personalMessage,
        inviterName,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error verifying invitation:", error);
    return NextResponse.json(
      { error: "Failed to verify invitation" },
      { status: 500 }
    );
  }
}

// POST - Accept invitation and create user account
export async function POST(req: NextRequest) {
  try {
    const { token, name, phone, password } = await req.json();

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: "Token, name, and password are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Find invitation
    const invitation = await Invitation.findOne({
      token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // 2. Create user account
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: invitation.email,
      password: hashedPassword,
      name,
      phone: phone || "",
      role: invitation.role,
      assignedWarehouses: invitation.assignedWarehouses,
      companyId: invitation.companyId,
      invitedBy: invitation.invitedBy,
      status: "active",
      emailVerified: true,
      preferences: {
        emailNotifications: true,
        dailyDigest: true,
        criticalAlertsOnly: false,
      },
    });

    // 3. Seed warehouse permissions into PostgreSQL permission store
    if (user.role === "warehouse_manager" && invitation.assignedWarehouses?.length > 0) {
      await seedUserPermissions(
        user._id.toString(),
        invitation.assignedWarehouses.map((id: any) => id.toString()),
        "warehouse_manager",
        invitation.companyId.toString()
      );
    }

    // 4. Mark invitation as accepted
    await Invitation.updateOne(
      { _id: invitation._id },
      {
        status: "accepted",
        acceptedAt: new Date(),
      }
    );

    // 5. Create audit log
    await AuditLog.create({
      action: "user_joined",
      userId: user._id,
      entityType: "user",
      entityId: user._id,
      metadata: {
        role: user.role,
        invitedBy: invitation.invitedBy,
        email: user.email,
      },
      timestamp: new Date(),
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
    });

    // 6. Notify super admin
    try {
      const superAdmin = await User.findById(invitation.invitedBy);
      if (superAdmin) {
        await sendEmail({
          to: superAdmin.email,
          subject: "New team member joined Inventory Tracker",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                .info-box { background: white; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✅ New Team Member Joined!</h1>
                </div>
                <div class="content">
                  <p>Hi ${superAdmin.name},</p>
                  <p><strong>${name}</strong> has accepted your invitation and joined Inventory Tracker.</p>
                  
                  <div class="info-box">
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Role:</strong> ${user.role}</p>
                    ${user.assignedWarehouses.length > 0 ? `<p><strong>Assigned Warehouses:</strong> ${user.assignedWarehouses.join(", ")}</p>` : ""}
                  </div>
                  
                  <p>They can now access the system and start working.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      }
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error("Failed to send notification email:", emailError);
    }

    // 7. Generate JWT token
    const jwtToken = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString(),
    });

    return NextResponse.json(
      {
        success: true,
        token: jwtToken,
        message: "Account created successfully",
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      {
        error: "Failed to create account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
