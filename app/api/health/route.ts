import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

/**
 * Health Check Endpoint
 * Used for monitoring and uptime checks
 * 
 * Returns:
 * - 200: All systems operational
 * - 503: Service unavailable (database connection failed)
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check database connection
    await connectDB();
    
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const responseTime = Date.now() - startTime;
    
    if (dbStatus !== "connected") {
      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          checks: {
            database: "disconnected",
          },
          responseTime: `${responseTime}ms`,
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks: {
          database: "connected",
          api: "operational",
        },
        responseTime: `${responseTime}ms`,
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
      },
      { status: 200 }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        checks: {
          database: "error",
        },
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: `${responseTime}ms`,
      },
      { status: 503 }
    );
  }
}
