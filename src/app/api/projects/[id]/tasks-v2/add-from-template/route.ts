import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/projects/[id]/tasks-v2/add-from-template
// 템플릿에서 단계 추가
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

    // 프로젝트 존재 및 권한 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // ADMIN은 같은 조직의 프로젝트만
    if (role === UserRole.ADMIN && project.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Forbidden: No access to this project" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "templateId is required" },
        { status: 400 }
      );
    }

    // 템플릿 존재 확인 (메인 템플릿만)
    const template = await prisma.taskTemplate.findFirst({
      where: {
        id: templateId,
        isSystem: true,
        organizationId: null,
        parentId: null,
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

    // 이미 해당 템플릿에서 추가된 태스크가 있는지 확인
    const existing = await prisma.task.findFirst({
      where: {
        projectId,
        originTemplateTaskId: templateId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 추가된 단계입니다" },
        { status: 409 }
      );
    }

    // 현재 최대 sortOrder 조회
    const maxSortOrder = await prisma.task.findFirst({
      where: { projectId, parentId: null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const newSortOrder = (maxSortOrder?.sortOrder ?? 0) + 1;

    // 트랜잭션으로 태스크 생성
    const result = await prisma.$transaction(async (tx) => {
      // 메인 태스크 생성
      const mainTask = await tx.task.create({
        data: {
          projectId,
          name: template.name,
          description: template.description,
          sortOrder: newSortOrder,
          originTemplateTaskId: template.id,
          alertEnabled: template.defaultAlertEnabled,
          isActive: true,
          parentId: null,
        },
      });

      // 하위 태스크 생성
      let childCount = 0;
      for (const child of template.children) {
        await tx.task.create({
          data: {
            projectId,
            name: child.name,
            description: child.description,
            sortOrder: child.sortOrder,
            originTemplateTaskId: child.id,
            alertEnabled: child.defaultAlertEnabled,
            isActive: true,
            parentId: mainTask.id,
          },
        });
        childCount++;
      }

      return { mainTask, childCount };
    });

    return NextResponse.json(
      {
        id: result.mainTask.id,
        name: result.mainTask.name,
        childCount: result.childCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding task from template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
