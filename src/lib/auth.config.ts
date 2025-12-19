import type { NextAuthConfig } from "next-auth";

// Auth config - route protection is handled in page components
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login/error",
  },
  providers: [], // Providers are added in auth.ts
} satisfies NextAuthConfig;
