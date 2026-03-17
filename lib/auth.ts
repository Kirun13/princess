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
type AppJwtFields = {
  role?: AppRole;
  username?: string;
};

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
      const appToken = token as typeof token & AppJwtFields;
      const userId = user?.id ?? token.sub;
      if (userId) {
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: { username: true, role: true },
        });
        appToken.name = dbUser?.username ?? appToken.name ?? "";
        appToken.username = dbUser?.username ?? appToken.username ?? "";
        appToken.role = dbUser?.role ?? appToken.role ?? "USER";
      }
      return appToken;
    },
    // Exposes token data to the client-side session object.
    async session({ session, token }) {
      const appToken = token as typeof token & AppJwtFields;
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.username = appToken.username ?? appToken.name ?? "";
        session.user.role = appToken.role ?? "USER";
      }
      return session;
    },
  },
});
