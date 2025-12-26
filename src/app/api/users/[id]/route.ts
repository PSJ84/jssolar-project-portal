import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - 특정 사용자 조회 (SUPER_ADMIN만)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

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

    const user = await prisma.user.findUnique({
      where: { id },
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
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - 사용자 수정 (SUPER_ADMIN만)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

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

    // 사용자 존재 확인
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { username, name, email, role, password, organizationId } = body;

    // 업데이트할 데이터 구성
    const updateData: {
      username?: string;
      name?: string;
      email?: string | null;
      role?: UserRole;
      password?: string;
      organizationId?: string;
    } = {};

    if (username !== undefined) {
      // 아이디 중복 체크 (본인 제외)
      const duplicateUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id },
        },
      });
      if (duplicateUser) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 409 }
        );
      }
      updateData.username = username;
    }

    if (name !== undefined) {
      updateData.name = name;
    }

    if (email !== undefined) {
      updateData.email = email || null;
    }

    if (role !== undefined) {
      // SUPER_ADMIN 역할로는 변경 불가 (기존 SUPER_ADMIN 유지는 가능)
      const allowedRoles = [UserRole.ADMIN, UserRole.CLIENT];
      if (role === UserRole.SUPER_ADMIN && existingUser.role !== UserRole.SUPER_ADMIN) {
        return NextResponse.json(
          { error: "Cannot assign SUPER_ADMIN role" },
          { status: 400 }
        );
      }
      if (!Object.values(UserRole).includes(role)) {
        return NextResponse.json(
          { error: "Invalid role" },
          { status: 400 }
        );
      }
      updateData.role = role;
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (organizationId !== undefined) {
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
      updateData.organizationId = organizationId;
    }

    // 업데이트할 내용이 없는 경우
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - 사용자 삭제 (SUPER_ADMIN만)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

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

    // 본인 계정 삭제 방지
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // 사용자 존재 확인
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // SUPER_ADMIN은 삭제 불가
    if (existingUser.role === UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Cannot delete SUPER_ADMIN user" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
