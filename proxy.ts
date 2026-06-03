import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "aasa-med-super-secret-development-key-12345"
);

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  const { pathname } = request.nextUrl;

  // Paths that require authentication
  const isAdminPath = pathname.startsWith("/admin");
  const isSellerPath = pathname.startsWith("/seller");
  const isBuyerPath = pathname.startsWith("/buyer");
  const isDashboardPath = pathname.startsWith("/dashboard");

  if (isAdminPath || isSellerPath || isBuyerPath || isDashboardPath) {
    if (!token) {
      // Redirect to login page if no token is found
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const userRole = payload.role as string;

      // Role check for admin paths
      if (isAdminPath && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      // Role check for seller paths
      if (isSellerPath && userRole !== "SELLER" && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      // Role check for buyer paths
      if (isBuyerPath && userRole !== "BUYER" && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    } catch (error) {
      // Invalid token, redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If logged in and trying to access login/register, redirect to dashboard or home
  if (pathname === "/login" || pathname === "/register") {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userRole = payload.role as string;
        if (userRole === "ADMIN") {
          return NextResponse.redirect(new URL("/admin", request.url));
        } else if (userRole === "SELLER") {
          return NextResponse.redirect(new URL("/seller", request.url));
        } else {
          return NextResponse.redirect(new URL("/buyer", request.url));
        }
      } catch (e) {
        // Invalid token, let them access login/register
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/seller/:path*",
    "/buyer/:path*",
    "/dashboard/:path*",
    "/login",
    "/register",
  ],
};
