import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenEdge } from "@/lib/auth";

// Role-based access control configuration
const rolePermissions = {
  super_admin: ["*"], // Full access to everything
  warehouse_manager: [
    "/dashboard",
    "/inventory",
    "/stock",
    "/warehouses",
    "/alerts",
    "/reports",
    "/api/auth/me",
    "/api/dashboard",
    "/api/products",
    "/api/stock",
    "/api/warehouses",
    "/api/alerts",
    "/api/reports",
    "/api/notifications",
  ],
};

function hasAccess(role: string, pathname: string): boolean {
  const permissions = rolePermissions[role as keyof typeof rolePermissions];
  
  if (!permissions) return false;
  
  // Super admin has access to everything
  if (permissions.includes("*")) return true;
  
  // Check if the pathname matches any allowed permission
  return permissions.some((permission) => 
    pathname === permission || pathname.startsWith(permission + "/")
  );
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const { pathname } = request.nextUrl;

  // Determine if this is an API route
  const isApiRoute = pathname.startsWith("/api/");

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/api/auth/login",
    "/api/auth/signup",
    "/onboarding",
    "/api/onboarding",
    "/invite/accept",
    "/api/users/invite/accept",
  ];

  // Check if current path is public (exact or nested under a public route)
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // If trying to access protected route without token
  if (!isPublicRoute && !token) {
    if (isApiRoute) {
      // Return JSON error for API routes
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }
    // Redirect to login for page routes
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If has token, verify it and check permissions
  if (token) {
    const payload = await verifyTokenEdge(token);
    
    // Invalid token
    if (!payload) {
      if (isApiRoute) {
        // Return JSON error for API routes and clear cookie
        const response = NextResponse.json(
          { error: "Unauthorized - Invalid or expired token" },
          { status: 401 }
        );
        response.cookies.delete("auth-token");
        return response;
      }
      // Redirect to login for page routes and clear cookie
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete("auth-token");
      return response;
    }

    // If logged in and trying to access login page, redirect to dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Check role-based access for protected routes
    if (!isPublicRoute) {
      // Get user role from token - default to warehouse_manager if not present
      const userRole = (payload as any).role || "warehouse_manager";
      
      // Only check access if role exists in our system
      if (userRole === "super_admin" || userRole === "warehouse_manager") {
        // Check if user has access to this route
        if (!hasAccess(userRole, pathname)) {
          if (isApiRoute) {
            // Return JSON error for API routes
            return NextResponse.json(
              { error: "Forbidden - Insufficient permissions" },
              { status: 403 }
            );
          }
          // Redirect to dashboard with error message for page routes
          const url = new URL("/dashboard", request.url);
          url.searchParams.set("error", "unauthorized");
          return NextResponse.redirect(url);
        }
      }
    }

    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId);
    requestHeaders.set("x-user-email", payload.email);
    
    // Add role and companyId if available in token
    if ((payload as any).role) {
      requestHeaders.set("x-user-role", (payload as any).role);
    }
    if ((payload as any).companyId) {
      requestHeaders.set("x-company-id", (payload as any).companyId);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
