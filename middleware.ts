import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenEdge } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const { pathname } = request.nextUrl;
  
  // Log for debugging
  if (pathname === "/dashboard" || pathname === "/") {
    console.log(`[Middleware] ${pathname} - Token present: ${!!token}`);
    if (token) {
      console.log(`[Middleware] Token value (first 20 chars): ${token.substring(0, 20)}...`);
    }
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/api/auth/login", "/onboarding", "/api/onboarding"];

  // Check if current path is public (exact or nested under a public route)
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // If trying to access protected route without token
  if (!isPublicRoute && !token) {
    console.log(`[Middleware] Redirecting ${pathname} to / (no token)`);
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If has token, verify it
  if (token) {
    console.log(`[Middleware] Verifying token (first 20 chars): ${token.substring(0, 20)}...`);
    const payload = await verifyTokenEdge(token);
    console.log(`[Middleware] Verification result:`, payload);
    
    // Invalid token, redirect to login
    if (!payload) {
      console.log(`[Middleware] Invalid token, redirecting to /`);
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete("auth-token");
      return response;
    }

    // If logged in and trying to access login page, redirect to dashboard
    if (pathname === "/") {
      console.log(`[Middleware] Logged in user on /, redirecting to /dashboard`);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
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
