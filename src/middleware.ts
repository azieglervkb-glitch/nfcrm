import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Use edge-compatible auth config (no Prisma)
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Redirect logged in users away from login page
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Redirect unauthenticated users to login (for protected routes)
  if (!isLoggedIn) {
    // Public paths are handled by the authorized callback in auth.config
    const publicPaths = [
      "/login",
      "/forgot-password",
      "/reset-password",
      "/form",
      "/api/auth",
      "/api/webhooks",
      "/api/forms",
      "/api/setup",
      "/api/cron",
    ];

    const isPublicPath = publicPaths.some(
      (path) => pathname === path || pathname.startsWith(path + "/")
    );

    if (!isPublicPath) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect root to dashboard
  if (pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/health).*)",
  ],
};
