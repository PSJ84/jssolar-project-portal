import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/templates/[id]/children - 하위 템플릿 추가
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { id: parentId } = await params;
    const body = await request.json();
    const { name, description, defaultAlertEnabled, phase } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // 부모 템플릿 존재 확인 (조직 메인 템플릿만 부모가 될 수 있음)
    const parentTemplate = await prisma.taskTemplate.findFirst({
      where: {
        id: parentId,
        isSystem: false,
        organizationId,
        parentId: null, // 메인 템플릿만
      },
    });

    if (!parentTemplate) {
      return NextResponse.json(
        { error: "Parent template not found" },
        { status: 404 }
      );
    }

    // 현재 하위 템플릿의 최대 sortOrder 조회
    const maxSortOrder = await prisma.taskTemplate.findFirst({
      where: {
        parentId,
      },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const newSortOrder = (maxSortOrder?.sortOrder ?? 0) + 1;

    // 하위 템플릿 생성
    const childTemplate = await prisma.taskTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: newSortOrder,
        isSystem: false,
        organizationId,
        parentId,
        defaultAlertEnabled: defaultAlertEnabled ?? false,
        phase: phase || "PERMIT",
      },
    });

    return NextResponse.json(childTemplate, { status: 201 });
  } catch (error) {
    console.error("Error creating child template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/templates/[id]/children - 하위 템플릿 수정
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

    const { id: parentId } = await params;
    const body = await request.json();
    const { childId, name, description, sortOrder, defaultAlertEnabled, phase } = body;

    if (!childId) {
      return NextResponse.json(
        { error: "childId is required" },
        { status: 400 }
      );
    }

    // 하위 템플릿 존재 확인
    const existing = await prisma.taskTemplate.findFirst({
      where: {
        id: childId,
        parentId,
        isSystem: false,
        organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Child template not found" },
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
      where: { id: childId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating child template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/templates/[id]/children - 하위 템플릿 삭제
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

    const { id: parentId } = await params;
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");

    if (!childId) {
      return NextResponse.json(
        { error: "childId query parameter is required" },
        { status: 400 }
      );
    }

    // 하위 템플릿 존재 확인
    const existing = await prisma.taskTemplate.findFirst({
      where: {
        id: childId,
        parentId,
        isSystem: false,
        organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Child template not found" },
        { status: 404 }
      );
    }

    // 삭제
    await prisma.taskTemplate.delete({
      where: { id: childId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting child template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
