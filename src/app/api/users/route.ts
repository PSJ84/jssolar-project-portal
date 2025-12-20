import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

// GET /api/users - 사용자 목록 조회 (SUPER_ADMIN만)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: SUPER_ADMIN role required" },
        { status: 403 }
      );
    }

    // 조직별 필터링
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    const users = await prisma.user.findMany({
      where: organizationId ? { organizationId } : undefined,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        image: true,
        emailVerified: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/users - 사용자 생성 (SUPER_ADMIN만)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: SUPER_ADMIN role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, name, email, password, role, organizationId } = body;

    // 필수 필드 검증
    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization is required" },
        { status: 400 }
      );
    }

    // 조직 존재 확인
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // 아이디 길이 검증
    if (username.length < 2) {
      return NextResponse.json(
        { error: "Username must be at least 2 characters" },
        { status: 400 }
      );
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // 아이디 중복 체크
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    // 역할 검증 (SUPER_ADMIN은 생성 불가)
    const allowedRoles = [UserRole.ADMIN, UserRole.CLIENT];
    const userRole = role && allowedRoles.includes(role) ? role : UserRole.CLIENT;

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        username,
        name,
        email: email || null,
        password: hashedPassword,
        role: userRole,
        organizationId,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
