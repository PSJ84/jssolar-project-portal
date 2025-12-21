import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>;
}

// POST /api/projects/[id]/tasks-v2/[taskId]/checklists/import-template
// 템플릿에서 체크리스트 가져오기
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;
    const { role, organizationId } = session.user;

    // ADMIN/SUPER_ADMIN만 가능
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
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
    if (role === "ADMIN" && project.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Forbidden: No access to this project" },
        { status: 403 }
      );
    }

    // 태스크 조회 (originTemplateTaskId 필요)
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
      select: {
        id: true,
        name: true,
        originTemplateTaskId: true,
        parentId: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 기존 체크리스트 이름 조회 (중복 방지)
    const existingChecklists = await prisma.checklist.findMany({
      where: { taskId },
      select: { name: true },
    });
    const existingNames = new Set(existingChecklists.map((cl) => cl.name));

    // 템플릿 찾기
    let templateTask = null;

    if (task.originTemplateTaskId) {
      // originTemplateTaskId로 먼저 찾기
      templateTask = await prisma.taskTemplate.findUnique({
        where: { id: task.originTemplateTaskId },
        include: {
          checklistTemplates: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    }

    // 템플릿을 못 찾았으면 이름으로 매칭 시도
    if (!templateTask) {
      // 시스템 템플릿에서 이름으로 찾기
      templateTask = await prisma.taskTemplate.findFirst({
        where: {
          isSystem: true,
          organizationId: null,
          name: task.name,
        },
        include: {
          checklistTemplates: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    }

    if (!templateTask) {
      return NextResponse.json(
        { error: "No matching template found for this task" },
        { status: 404 }
      );
    }

    if (!templateTask.checklistTemplates || templateTask.checklistTemplates.length === 0) {
      return NextResponse.json(
        { error: "Template has no checklists" },
        { status: 404 }
      );
    }

    // 현재 최대 sortOrder 조회
    const maxSortOrder = await prisma.checklist.findFirst({
      where: { taskId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    let nextSortOrder = (maxSortOrder?.sortOrder ?? 0) + 1;
    let addedCount = 0;
    const addedChecklists: { id: string; content: string; status: string; sortOrder: number }[] = [];

    // 중복 없는 체크리스트만 추가
    for (const clTemplate of templateTask.checklistTemplates) {
      if (!existingNames.has(clTemplate.name)) {
        const created = await prisma.checklist.create({
          data: {
            taskId,
            name: clTemplate.name,
            sortOrder: nextSortOrder,
          },
        });
        addedChecklists.push({
          id: created.id,
          content: created.name,
          status: created.status,
          sortOrder: created.sortOrder,
        });
        nextSortOrder++;
        addedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      addedCount,
      skippedCount: templateTask.checklistTemplates.length - addedCount,
      checklists: addedChecklists,
    });
  } catch (error) {
    console.error("Error importing checklists from template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
