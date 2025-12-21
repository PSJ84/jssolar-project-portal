import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// GET /api/super/templates - 시스템 템플릿 전체 목록 (계층 포함)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SUPER_ADMIN만 접근 가능
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: SUPER_ADMIN role required" },
        { status: 403 }
      );
    }

    // 시스템 템플릿 조회 (메인 + 하위 + 체크리스트)
    const templates = await prisma.taskTemplate.findMany({
      where: {
        isSystem: true,
        organizationId: null,
        parentId: null,
      },
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
          include: {
            checklistTemplates: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
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

// POST /api/super/templates - 메인 템플릿 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SUPER_ADMIN만 접근 가능
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: SUPER_ADMIN role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, defaultAlertEnabled } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // 현재 최대 sortOrder 조회
    const maxSortOrder = await prisma.taskTemplate.findFirst({
      where: {
        isSystem: true,
        organizationId: null,
        parentId: null,
      },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const newSortOrder = (maxSortOrder?.sortOrder ?? 0) + 1;

    // 템플릿 생성
    const template = await prisma.taskTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: newSortOrder,
        isSystem: true,
        organizationId: null,
        parentId: null,
        defaultAlertEnabled: defaultAlertEnabled ?? false,
      },
      include: {
        children: true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
