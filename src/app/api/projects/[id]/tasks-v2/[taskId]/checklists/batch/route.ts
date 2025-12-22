import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChecklistStatus } from "@prisma/client";

// POST /api/projects/[id]/tasks-v2/[taskId]/checklists/batch
// 체크리스트 일괄 상태 변경 (전체 완료 / 전체 대기)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN 권한 확인
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: projectId, taskId } = await params;
    const { action } = await request.json();

    // action 유효성 검사
    if (action !== "COMPLETED" && action !== "PENDING") {
      return NextResponse.json(
        { error: "Invalid action. Must be COMPLETED or PENDING" },
        { status: 400 }
      );
    }

    // 태스크가 해당 프로젝트에 속하는지 확인
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId: projectId,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 체크리스트 일괄 업데이트
    const result = await prisma.checklist.updateMany({
      where: { taskId: taskId },
      data: {
        status: action as ChecklistStatus,
        statusChangedAt: new Date(),
        statusChangedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Error batch updating checklists:", error);
    return NextResponse.json(
      { error: "Failed to batch update checklists" },
      { status: 500 }
    );
  }
}
