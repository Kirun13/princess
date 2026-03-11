import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Middleware only uses the edge-safe config — no Prisma, no bcrypt, no crypto.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
