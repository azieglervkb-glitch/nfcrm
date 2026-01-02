import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Use edge-compatible auth config (no Prisma)
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user as any;
  const { pathname } = req.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/setup-2fa",
    "/form",
    "/member",
    "/api/auth",
    "/api/webhooks",
    "/api/forms",
    "/api/setup",
    "/api/cron",
    "/api/member",
    "/api/kpi/tracking-window", // Public for weekly KPI form
  ];

  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // Paths that are allowed without 2FA (for 2FA setup)
  const twoFASetupPaths = [
    "/setup-2fa",
    "/api/settings/profile/2fa",
    "/api/auth/signout",
  ];

  const isTwoFASetupPath = twoFASetupPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // Redirect logged in users away from login page
  if (isLoggedIn && pathname === "/login") {
    // Check if 2FA is enabled, if not redirect to setup
    if (!user?.twoFactorEnabled) {
      return NextResponse.redirect(new URL("/setup-2fa", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Redirect unauthenticated users to login (for protected routes)
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2FA ENFORCEMENT: Redirect users without 2FA to setup page
  if (isLoggedIn && !user?.twoFactorEnabled && !isTwoFASetupPath && !isPublicPath) {
    return NextResponse.redirect(new URL("/setup-2fa", req.url));
  }

  // Redirect users with 2FA away from setup page
  if (isLoggedIn && user?.twoFactorEnabled && pathname === "/setup-2fa") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Redirect root to dashboard (or setup-2fa if needed)
  if (pathname === "/" && isLoggedIn) {
    if (!user?.twoFactorEnabled) {
      return NextResponse.redirect(new URL("/setup-2fa", req.url));
    }
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
