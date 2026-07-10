import { NextRequest, NextResponse } from "next/server";

const RouteConfiguration = {
  dashboardRoutes: [
    "/resume-generator",
    "/interviews",
    "/profiles",
  ],

  publicRoutes: [
    "/profiles/add/preview",
    "/signin",
    "/login",
  ],
};

export default function middleware(req: NextRequest) {
  const token =
    req.cookies.get("access_token")?.value;

  const pathname =
    req.nextUrl.pathname;

  const {
    dashboardRoutes,
    publicRoutes,
  } = RouteConfiguration;

  // Check if current route is public
  const isPublicRoute =
    publicRoutes.some((route) =>
      pathname.startsWith(route)
    );

  // Check if current route is protected
  const isProtectedRoute =
    dashboardRoutes.some((route) =>
      pathname.startsWith(route)
    );

  // Redirect unauthenticated users
  if (
    isProtectedRoute &&
    !isPublicRoute &&
    !token
  ) {
    return NextResponse.redirect(
      new URL("/signin", req.url)
    );
  }

  // Redirect authenticated users away from public routes
  if (token && isPublicRoute) {
    return NextResponse.redirect(
      new URL("/profiles", req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profiles",
    "/profiles/:path*",
  ],
};
