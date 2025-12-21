import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/super/templates/[id]/checklists/reorder
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: SUPER_ADMIN role required" },
        { status: 403 }
      );
    }

    const { id: taskTemplateId } = await params;
    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds array is required" },
        { status: 400 }
      );
    }

    // TaskTemplate 존재 확인
    const template = await prisma.taskTemplate.findUnique({
      where: { id: taskTemplateId },
      select: { id: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: "TaskTemplate not found" },
        { status: 404 }
      );
    }

    // 해당 템플릿의 체크리스트들이 맞는지 확인
    const existingChecklists = await prisma.checklistTemplate.findMany({
      where: { taskTemplateId },
      select: { id: true },
    });

    const existingIds = new Set(existingChecklists.map((cl) => cl.id));
    const invalidIds = orderedIds.filter((id: string) => !existingIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Some checklist IDs do not belong to this template" },
        { status: 400 }
      );
    }

    // 트랜잭션으로 sortOrder 일괄 업데이트
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.checklistTemplate.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering checklist templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
