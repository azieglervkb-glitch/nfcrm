import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Auth config without Prisma adapter for Edge middleware compatibility
const authConfig = {
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Authorize is only called during sign-in, not in middleware
      // So we can safely import prisma dynamically there
      async authorize(credentials) {
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
        };
      },
    }),
  ],
  callbacks: {
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

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
