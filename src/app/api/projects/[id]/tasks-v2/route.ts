import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, ChecklistStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
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
    // ADMIN은 같은 조직의 프로젝트만
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

// GET /api/projects/[id]/tasks-v2 - Phase 2 Task 목록 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { id: userId, role, organizationId } = session.user;

    // 접근 권한 확인
    const hasAccess = await checkProjectAccess(projectId, userId, role, organizationId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: No access to this project" },
        { status: 403 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 메인 태스크 (parentId: null) + children + checklist counts 조회
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        parentId: null,
      },
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
          include: {
            checklists: {
              select: { status: true },
            },
          },
        },
        checklists: {
          select: { status: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // 체크리스트 카운트 계산 헬퍼
    const getChecklistCount = (checklists: { status: ChecklistStatus }[]) => ({
      total: checklists.length,
      checked: checklists.filter((c) => c.status === ChecklistStatus.COMPLETED).length,
    });

    // 응답 형식 변환
    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      name: task.name,
      sortOrder: task.sortOrder,
      isActive: task.isActive,
      startDate: task.startDate?.toISOString() ?? null,
      dueDate: task.dueDate?.toISOString() ?? null,
      completedDate: task.completedDate?.toISOString() ?? null,
      version: task.version,
      originTemplateTaskId: task.originTemplateTaskId,
      checklistCount: getChecklistCount(task.checklists),
      // 인허가 필드
      isPermitTask: task.isPermitTask,
      processingDays: task.processingDays,
      submittedDate: task.submittedDate?.toISOString() ?? null,
      children: task.children.map((child) => ({
        id: child.id,
        name: child.name,
        sortOrder: child.sortOrder,
        isActive: child.isActive,
        startDate: child.startDate?.toISOString() ?? null,
        dueDate: child.dueDate?.toISOString() ?? null,
        completedDate: child.completedDate?.toISOString() ?? null,
        version: child.version,
        originTemplateTaskId: child.originTemplateTaskId,
        checklistCount: getChecklistCount(child.checklists),
        children: [], // 2단계까지만
      })),
    }));

    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/tasks-v2 - Task isActive 토글
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { role, organizationId } = session.user;

    // ADMIN/SUPER_ADMIN만 수정 가능
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    // 조직 권한 확인 (ADMIN인 경우)
    if (role === UserRole.ADMIN) {
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
    const { taskId, isActive, version } = body;

    if (!taskId || typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "taskId and isActive are required" },
        { status: 400 }
      );
    }

    // 태스크 존재 확인 및 프로젝트 소속 확인
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

    // 업데이트
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        isActive,
        version: { increment: 1 },
      },
    });

    return NextResponse.json({
      id: updated.id,
      isActive: updated.isActive,
      version: updated.version,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/tasks-v2 - 하위 태스크 추가
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { role, organizationId } = session.user;

    // ADMIN/SUPER_ADMIN만 추가 가능
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    // 조직 권한 확인 (ADMIN인 경우)
    if (role === UserRole.ADMIN) {
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
    const { parentId, name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    if (!parentId) {
      return NextResponse.json(
        { error: "parentId is required for subtask" },
        { status: 400 }
      );
    }

    // 부모 태스크 확인
    const parentTask = await prisma.task.findFirst({
      where: {
        id: parentId,
        projectId,
        parentId: null, // 메인 태스크만 부모가 될 수 있음
      },
    });

    if (!parentTask) {
      return NextResponse.json(
        { error: "Parent task not found or invalid" },
        { status: 404 }
      );
    }

    // 현재 최대 sortOrder 조회
    const maxSortOrder = await prisma.task.findFirst({
      where: { parentId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const newSortOrder = (maxSortOrder?.sortOrder ?? 0) + 1;

    // 하위 태스크 생성
    const newTask = await prisma.task.create({
      data: {
        projectId,
        parentId,
        name: name.trim(),
        sortOrder: newSortOrder,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        id: newTask.id,
        name: newTask.name,
        sortOrder: newTask.sortOrder,
        isActive: newTask.isActive,
        startDate: null,
        dueDate: null,
        completedDate: null,
        version: newTask.version,
        originTemplateTaskId: null,
        checklistCount: { total: 0, checked: 0 },
        children: [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating subtask:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
