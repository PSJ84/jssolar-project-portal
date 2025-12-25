import type { NextAuthConfig } from "next-auth";

// Auth config - route protection is handled in page components
export const authConfig = {
  trustHost: true, // Vercel 등 프록시 환경에서 필요
  pages: {
    signIn: "/login",
    error: "/login/error",
  },
  providers: [], // Providers are added in auth.ts
} satisfies NextAuthConfig;
