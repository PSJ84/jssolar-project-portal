import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware - auth checks are done in layouts/pages
export function middleware(request: NextRequest) {
  // Just pass through - auth is handled by NextAuth and page components
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
