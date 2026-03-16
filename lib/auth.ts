import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { DefaultSession } from "next-auth";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

type AppRole = "USER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: AppRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    username?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  // JWT strategy: sessions live in a signed cookie — no DB needed in middleware.
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.passwordHash) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.username,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Runs on sign-in and token refresh. `user` is only present on initial sign-in.
    // We store the DB username in token.name (an existing JWT field).
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;
      if (userId) {
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: { username: true, role: true },
        });
        token.name = dbUser?.username ?? token.name ?? "";
        token.username = dbUser?.username ?? token.username ?? "";
        token.role = dbUser?.role ?? token.role ?? "USER";
      }
      return token;
    },
    // Exposes token data to the client-side session object.
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.username = token.username ?? token.name ?? "";
        session.user.role = token.role ?? "USER";
      }
      return session;
    },
  },
});
