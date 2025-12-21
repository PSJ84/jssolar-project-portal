import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// GET /api/templates - 시스템 템플릿 목록 조회 (메인 템플릿만)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN/SUPER_ADMIN만 조회 가능
    const isAdmin =
      session.user.role === UserRole.ADMIN ||
      session.user.role === UserRole.SUPER_ADMIN;

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    // 시스템 템플릿 중 메인 템플릿만 (parentId: null)
    const templates = await prisma.taskTemplate.findMany({
      where: {
        isSystem: true,
        organizationId: null,
        parentId: null,
      },
      select: {
        id: true,
        name: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
