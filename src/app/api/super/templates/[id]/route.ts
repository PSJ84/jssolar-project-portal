import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/super/templates/[id] - 단일 템플릿 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    const template = await prisma.taskTemplate.findFirst({
      where: {
        id,
        isSystem: true,
        organizationId: null,
      },
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/super/templates/[id] - 템플릿 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();
    const { name, description, sortOrder, defaultAlertEnabled } = body;

    // 템플릿 존재 확인
    const existing = await prisma.taskTemplate.findFirst({
      where: {
        id,
        isSystem: true,
        organizationId: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // 업데이트 데이터 구성
    const updateData: {
      name?: string;
      description?: string | null;
      sortOrder?: number;
      defaultAlertEnabled?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { error: "name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (sortOrder !== undefined) {
      if (typeof sortOrder !== "number" || sortOrder < 1) {
        return NextResponse.json(
          { error: "sortOrder must be a positive number" },
          { status: 400 }
        );
      }
      updateData.sortOrder = sortOrder;
    }

    if (defaultAlertEnabled !== undefined) {
      updateData.defaultAlertEnabled = !!defaultAlertEnabled;
    }

    // 업데이트 실행
    const updated = await prisma.taskTemplate.update({
      where: { id },
      data: updateData,
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/super/templates/[id] - 템플릿 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // 템플릿 존재 확인
    const existing = await prisma.taskTemplate.findFirst({
      where: {
        id,
        isSystem: true,
        organizationId: null,
      },
      include: {
        children: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // 하위 템플릿과 함께 삭제 (cascade)
    await prisma.$transaction(async (tx) => {
      // 먼저 하위 템플릿 삭제
      if (existing.children.length > 0) {
        await tx.taskTemplate.deleteMany({
          where: { parentId: id },
        });
      }
      // 메인 템플릿 삭제
      await tx.taskTemplate.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
