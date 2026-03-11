// Re-exports the NextAuth instance from lib/auth so that
// API routes can import from "@/auth" while the catch-all handler
// in app/api/auth/[...nextauth]/route.ts keeps importing from "@/lib/auth".
export { auth, handlers, signIn, signOut } from "@/lib/auth";
