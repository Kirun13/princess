import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config: no Node.js built-ins (no Prisma, no bcrypt).
// Used directly by middleware; spread into the full auth config in lib/auth.ts.
export const authConfig = {
  providers: [],
  pages: { signIn: "/auth/sign-in" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/profile") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/admin");
      if (isProtected && !isLoggedIn) return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
