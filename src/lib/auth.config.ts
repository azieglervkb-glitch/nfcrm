import type { NextAuthConfig } from "next-auth";

// Base auth config WITHOUT Prisma - safe for Edge Runtime (middleware)
export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [], // Providers added in auth.ts (not edge-compatible)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public paths that don't require authentication
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

      // Allow public paths
      if (isPublicPath) {
        return true;
      }

      // Require auth for protected paths
      return isLoggedIn;
    },
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.vorname = user.vorname;
        token.nachname = user.nachname;
        token.avatarUrl = user.avatarUrl;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.vorname = token.vorname as string;
        session.user.nachname = token.nachname as string;
        session.user.avatarUrl = token.avatarUrl as string | null;
      }
      return session;
    },
  },
};
