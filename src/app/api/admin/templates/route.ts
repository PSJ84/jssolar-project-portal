import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// GET /api/admin/templates - 조직 템플릿 목록 조회
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, organizationId } = session.user;

    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }

    // 조직 템플릿 조회 (메인 + 하위)
    const templates = await prisma.taskTemplate.findMany({
      where: {
        isSystem: false,
        organizationId,
        parentId: null,
      },
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            sortOrder: true,
            defaultAlertEnabled: true,
            phase: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching organization templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/templates - 조직 메인 템플릿 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, organizationId } = session.user;

    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, defaultAlertEnabled, phase } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // 현재 최대 sortOrder 조회
    const maxSortOrder = await prisma.taskTemplate.findFirst({
      where: {
        isSystem: false,
        organizationId,
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
        isSystem: false,
        organizationId,
        parentId: null,
        defaultAlertEnabled: defaultAlertEnabled ?? false,
        phase: phase || "PERMIT",
      },
      include: {
        children: true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating organization template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
