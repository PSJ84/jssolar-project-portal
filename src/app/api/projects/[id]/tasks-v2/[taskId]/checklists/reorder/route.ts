import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>;
}

// PATCH /api/projects/[id]/tasks-v2/[taskId]/checklists/reorder
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;
    const { role, organizationId } = session.user;

    // ADMIN/SUPER_ADMIN만 순서 변경 가능
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    // 조직 권한 확인 (ADMIN인 경우)
    if (role === "ADMIN") {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { organizationId: true },
      });
      if (project?.organizationId !== organizationId) {
        return NextResponse.json(
          { error: "Forbidden: No access to this project" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds array is required" },
        { status: 400 }
      );
    }

    // 태스크 존재 확인
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 해당 태스크의 체크리스트들이 맞는지 확인
    const existingChecklists = await prisma.checklist.findMany({
      where: { taskId },
      select: { id: true },
    });

    const existingIds = new Set(existingChecklists.map((cl) => cl.id));
    const invalidIds = orderedIds.filter((id: string) => !existingIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Some checklist IDs do not belong to this task" },
        { status: 400 }
      );
    }

    // 트랜잭션으로 sortOrder 일괄 업데이트
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.checklist.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering checklists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
