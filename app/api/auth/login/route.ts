import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { CommonErrors, jsonSuccess } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return CommonErrors.badRequest(
        "Email and password are required",
        "Both email and password fields must be provided"
      );
    }

    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).lean();

    if (!user) {
      return CommonErrors.unauthorized("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {  
      return CommonErrors.unauthorized("Invalid email or password");
    }

    
    // Generate JWT token with role and companyId
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString(),
    });

  
    // Build response and set cookie explicitly so browser receives it
    // Check if user needs onboarding
    const needsOnboarding = !user.companyId;
    
    const res = jsonSuccess(
      {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId?.toString(),
        },
        needsOnboarding,
      }
    );

    // Set cookie on response
    res.cookies.set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return CommonErrors.serverError(
      "An error occurred during login",
      error instanceof Error ? error.message : undefined
    );
  }
}
