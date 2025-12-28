import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

// Full auth config WITH Prisma - for API routes only (not Edge runtime)
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Dynamic import to avoid Edge runtime issues
        const { prisma } = await import("./prisma");
        const bcrypt = await import("bcryptjs");

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!passwordMatch) {
          return null;
        }

        // Check 2FA if enabled
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          // Check if 2FA was verified (cookie set by /api/auth/2fa/verify)
          const cookieHeader = request?.headers?.get?.("cookie") || "";
          const match = cookieHeader.match(/(?:^|;\s*)2fa-verified=([^;]+)/);
          const verifiedUserId = match ? decodeURIComponent(match[1]) : null;

          if (verifiedUserId !== user.id) {
            // 2FA not verified yet - deny login
            return null;
          }
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: `${user.vorname} ${user.nachname}`,
          vorname: user.vorname,
          nachname: user.nachname,
          role: user.role,
          avatarUrl: user.avatarUrl,
          permissions: user.permissions,
        };
      },
    }),
  ],
});
