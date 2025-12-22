import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/templates/[id] - 단일 조직 템플릿 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    const template = await prisma.taskTemplate.findFirst({
      where: {
        id,
        isSystem: false,
        organizationId,
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
    console.error("Error fetching organization template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/templates/[id] - 조직 템플릿 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();
    const { name, description, sortOrder, defaultAlertEnabled, phase } = body;

    // 템플릿 존재 확인
    const existing = await prisma.taskTemplate.findFirst({
      where: {
        id,
        isSystem: false,
        organizationId,
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
      phase?: "PERMIT" | "CONSTRUCTION" | "OTHER";
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

    if (phase !== undefined) {
      const validPhases = ["PERMIT", "CONSTRUCTION", "OTHER"];
      if (validPhases.includes(phase)) {
        updateData.phase = phase;
      }
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
    console.error("Error updating organization template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/templates/[id] - 조직 템플릿 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // 템플릿 존재 확인
    const existing = await prisma.taskTemplate.findFirst({
      where: {
        id,
        isSystem: false,
        organizationId,
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
    console.error("Error deleting organization template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
