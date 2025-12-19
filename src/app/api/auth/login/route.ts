import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { loginRateLimiter, getClientIP } from "@/lib/rate-limit";

// Rate limit: 5 failed attempts per 15 minutes per IP
const MAX_LOGIN_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    // Check rate limit
    const rateLimitResult = loginRateLimiter.check(ip, MAX_LOGIN_ATTEMPTS);

    if (!rateLimitResult.success) {
      const resetTime = new Date(rateLimitResult.reset);
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);

      return NextResponse.json(
        {
          error: "너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": MAX_LOGIN_ATTEMPTS.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetTime.toISOString(),
          },
        }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        password: true,
        role: true,
      },
    });

    // Generic error message to prevent user enumeration
    const invalidCredentialsError = "아이디 또는 비밀번호가 올바르지 않습니다.";

    if (!user || !user.password) {
      // Don't reveal whether user exists
      return NextResponse.json(
        { error: invalidCredentialsError },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: invalidCredentialsError },
        { status: 401 }
      );
    }

    // Success - reset rate limit for this IP
    loginRateLimiter.reset(ip);

    // Return user data (password excluded)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
