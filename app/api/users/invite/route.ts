import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Invitation } from "@/models/Invitation";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get current user details
    const inviter = await User.findById(currentUser.userId);
    if (!inviter) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only super_admin can invite users
    if (inviter.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admins can invite users" },
        { status: 403 }
      );
    }

    // Check if user has companyId
    const companyId = inviter.companyId;
    
    if (!companyId) {
      return NextResponse.json(
        { error: "Please complete onboarding first" },
        { status: 400 }
      );
    }

    const { email, name, phone, role, assignedWarehouses, message } =
      await req.json();

    // Validate required fields
    if (!email || !name || !role) {
      return NextResponse.json(
        { error: "Email, name, and role are required" },
        { status: 400 }
      );
    }

    // Validate warehouse assignments for warehouse_manager role
    if (role === "warehouse_manager" && (!assignedWarehouses || assignedWarehouses.length === 0)) {
      return NextResponse.json(
        { error: "Warehouse managers must be assigned at least one warehouse" },
        { status: 400 }
      );
    }

    // Convert warehouse IDs to ObjectIds
    let warehouseIds: mongoose.Types.ObjectId[] = [];
    if (assignedWarehouses && assignedWarehouses.length > 0) {
      const { Warehouse } = await import("@/models/Warehouse");
      
      // Validate that all warehouse IDs exist and belong to the company
      const warehouses = await Warehouse.find({
        _id: { $in: assignedWarehouses },
        companyId: companyId,
      });

      // Check if all warehouse IDs were found
      if (warehouses.length !== assignedWarehouses.length) {
        return NextResponse.json(
          {
            error: "Invalid warehouse codes",
          },
          { status: 400 }
        );
      }

      warehouseIds = warehouses.map((w) => w._id);
    }

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // 2. Check if invitation already sent
    const existingInvite = await Invitation.findOne({
      email,
      status: "pending",
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "Invitation already sent to this email" },
        { status: 400 }
      );
    }

    // 3. Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // 4. Create invitation with warehouse ObjectIds
    const invitation = await Invitation.create({
      email,
      role,
      assignedWarehouses: warehouseIds,
      token,
      invitedBy: inviter._id,
      companyId: companyId,
      status: "pending",
      sentAt: new Date(),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      personalMessage: message || "",
    });

    // 5. Send invitation email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=${token}`;

    const roleDisplayNames: Record<string, string> = {
      super_admin: "Super Admin",
      warehouse_manager: "Warehouse Manager",
      sales: "Sales Representative",
      auditor: "Auditor",
      viewer: "Viewer",
    };

    // Get warehouse names for email
    let warehouseNamesForEmail = "";
    if (warehouseIds.length > 0) {
      const { Warehouse } = await import("@/models/Warehouse");
      const warehouseDocs = await Warehouse.find({ _id: { $in: warehouseIds } });
      warehouseNamesForEmail = warehouseDocs.map((w) => w.name).join(", ");
    }

    await sendEmail({
      to: email,
      subject: "You're invited to join InsydTracker",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p><strong>${inviter.name}</strong> has invited you to join their organization on <strong>InsydTracker</strong>.</p>
              
              <div class="info-box">
                <p><strong>Your Role:</strong> ${roleDisplayNames[role] || role}</p>
                ${
                  warehouseNamesForEmail
                    ? `<p><strong>Assigned Warehouses:</strong> ${warehouseNamesForEmail}</p>`
                    : ""
                }
              </div>
              
              ${message ? `<p style="font-style: italic; color: #6b7280;">"${message}"</p>` : ""}
              
              <p>Click the button below to accept the invitation and set up your account:</p>
              
              <a href="${inviteLink}" class="button">Accept Invitation</a>
              
              <p style="color: #6b7280; font-size: 14px;">Or copy this link: ${inviteLink}</p>
              
              <div class="footer">
                <p>This invitation expires in 3 days.</p>
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Invitation sent successfully",
        invitation: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error sending invitation:", error);
    return NextResponse.json(
      {
        error: "Failed to send invitation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
