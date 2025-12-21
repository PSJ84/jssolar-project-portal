import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>;
}

// 프로젝트 접근 권한 확인
async function checkProjectAccess(
  projectId: string,
  userId: string,
  role: string,
  organizationId: string | null
) {
  if (role === UserRole.SUPER_ADMIN) {
    return true;
  }

  if (role === UserRole.ADMIN) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });
    return project?.organizationId === organizationId;
  }

  // CLIENT: 멤버로 등록된 프로젝트만
  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });
  return !!membership;
}

// GET /api/projects/[id]/tasks-v2/[taskId] - 태스크 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;
    const { id: userId, role, organizationId } = session.user;

    // 접근 권한 확인
    const hasAccess = await checkProjectAccess(projectId, userId, role, organizationId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: No access to this project" },
        { status: 403 }
      );
    }

    // 태스크 조회 (체크리스트 포함)
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
      include: {
        checklists: {
          orderBy: { sortOrder: "asc" },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: task.id,
      name: task.name,
      description: task.description,
      sortOrder: task.sortOrder,
      isActive: task.isActive,
      startDate: task.startDate?.toISOString() ?? null,
      dueDate: task.dueDate?.toISOString() ?? null,
      completedDate: task.completedDate?.toISOString() ?? null,
      memo: task.memo,
      alertEnabled: task.alertEnabled,
      version: task.version,
      parentId: task.parentId,
      parent: task.parent,
      assignee: task.assignee,
      assigneeId: task.assigneeId,
      // 인허가 필드
      isPermitTask: task.isPermitTask,
      processingDays: task.processingDays,
      submittedDate: task.submittedDate?.toISOString() ?? null,
      checklists: task.checklists.map((cl) => ({
        id: cl.id,
        content: cl.name,
        status: cl.status,
        sortOrder: cl.sortOrder,
      })),
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/tasks-v2/[taskId] - 태스크 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;
    const { role, organizationId } = session.user;

    // ADMIN/SUPER_ADMIN만 수정 가능
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    // 프로젝트 조직 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 조직 권한 확인 (ADMIN인 경우)
    if (role === UserRole.ADMIN && project.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Forbidden: No access to this project" },
        { status: 403 }
      );
    }

    // 담당자 검증 시 사용할 조직 ID (프로젝트의 조직)
    const projectOrgId = project.organizationId;

    const body = await request.json();
    const {
      name,
      description,
      startDate,
      dueDate,
      completedDate,
      memo,
      alertEnabled,
      assigneeId,
      version,
      // 인허가 필드
      submittedDate,
      processingDays,
    } = body;

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

    // 낙관적 동시성 제어
    if (version !== undefined && task.version !== version) {
      return NextResponse.json(
        { error: "Conflict: Task has been modified. Please refresh." },
        { status: 409 }
      );
    }

    // 업데이트 데이터 구성
    const updateData: {
      name?: string;
      description?: string | null;
      startDate?: Date | null;
      dueDate?: Date | null;
      completedDate?: Date | null;
      memo?: string | null;
      alertEnabled?: boolean;
      assigneeId?: string | null;
      submittedDate?: Date | null;
      processingDays?: number | null;
      version: { increment: number };
    } = {
      version: { increment: 1 },
    };

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

    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (completedDate !== undefined) {
      updateData.completedDate = completedDate ? new Date(completedDate) : null;
    }

    // 인허가 필드 처리
    if (submittedDate !== undefined) {
      updateData.submittedDate = submittedDate ? new Date(submittedDate) : null;
    }

    if (processingDays !== undefined) {
      updateData.processingDays = processingDays ?? null;
    }

    // 인허가 단계: 접수일 + 처리기한으로 완료예정일(dueDate) 자동 계산
    // submittedDate 또는 processingDays가 변경되면 재계산
    if (task.isPermitTask && (submittedDate !== undefined || processingDays !== undefined)) {
      const finalSubmittedDate = submittedDate !== undefined
        ? (submittedDate ? new Date(submittedDate) : null)
        : task.submittedDate;
      const finalProcessingDays = processingDays !== undefined
        ? processingDays
        : task.processingDays;

      if (finalSubmittedDate && finalProcessingDays) {
        const calculatedDueDate = new Date(finalSubmittedDate);
        calculatedDueDate.setDate(calculatedDueDate.getDate() + finalProcessingDays);
        updateData.dueDate = calculatedDueDate;
      }
    }

    if (memo !== undefined) {
      updateData.memo = memo?.trim() || null;
    }

    if (alertEnabled !== undefined) {
      updateData.alertEnabled = !!alertEnabled;
    }

    if (assigneeId !== undefined) {
      if (assigneeId) {
        // 담당자 검증: 조직 ADMIN/SUPER_ADMIN 또는 프로젝트 멤버
        const isOrgAdmin = await prisma.user.findFirst({
          where: {
            id: assigneeId,
            organizationId: projectOrgId,
            role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
          },
        });

        const isProjectMember = await prisma.projectMember.findFirst({
          where: {
            projectId,
            userId: assigneeId,
          },
        });

        if (!isOrgAdmin && !isProjectMember) {
          return NextResponse.json(
            { error: "Invalid assignee: 조직 관리자 또는 프로젝트 멤버만 지정 가능합니다" },
            { status: 400 }
          );
        }
      }
      updateData.assigneeId = assigneeId || null;
    }

    // 업데이트 실행
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        checklists: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      startDate: updated.startDate?.toISOString() ?? null,
      dueDate: updated.dueDate?.toISOString() ?? null,
      completedDate: updated.completedDate?.toISOString() ?? null,
      memo: updated.memo,
      alertEnabled: updated.alertEnabled,
      assignee: updated.assignee,
      assigneeId: updated.assigneeId,
      version: updated.version,
      // 인허가 필드
      isPermitTask: updated.isPermitTask,
      processingDays: updated.processingDays,
      submittedDate: updated.submittedDate?.toISOString() ?? null,
      checklists: updated.checklists.map((cl) => ({
        id: cl.id,
        content: cl.name,
        status: cl.status,
        sortOrder: cl.sortOrder,
      })),
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
