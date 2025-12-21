import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChecklistStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>;
}

// GET /api/projects/[id]/tasks-v2/[taskId]/checklists - 체크리스트 목록
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;
    const { id: userId, role, organizationId } = session.user;

    // 접근 권한 확인
    if (role === "CLIENT") {
      const membership = await prisma.projectMember.findFirst({
        where: { projectId, userId },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "Forbidden: No access to this project" },
          { status: 403 }
        );
      }
    } else if (role === "ADMIN") {
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

    // 체크리스트 조회
    const checklists = await prisma.checklist.findMany({
      where: { taskId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(
      checklists.map((cl) => ({
        id: cl.id,
        content: cl.name,
        status: cl.status,
        sortOrder: cl.sortOrder,
      }))
    );
  } catch (error) {
    console.error("Error fetching checklists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/tasks-v2/[taskId]/checklists - 체크리스트 추가
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;
    const { role, organizationId } = session.user;

    // ADMIN/SUPER_ADMIN만 추가 가능
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
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json(
        { error: "content is required" },
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

    // 현재 최대 sortOrder 조회
    const maxSortOrder = await prisma.checklist.findFirst({
      where: { taskId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const newSortOrder = (maxSortOrder?.sortOrder ?? 0) + 1;

    // 체크리스트 생성
    const checklist = await prisma.checklist.create({
      data: {
        taskId,
        name: content.trim(),
        status: ChecklistStatus.PENDING,
        sortOrder: newSortOrder,
      },
    });

    return NextResponse.json(
      {
        id: checklist.id,
        content: checklist.name,
        status: checklist.status,
        sortOrder: checklist.sortOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating checklist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/tasks-v2/[taskId]/checklists - 체크리스트 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;
    const { id: userId, role, organizationId } = session.user;

    // ADMIN/SUPER_ADMIN만 수정 가능
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
    const { checklistId, content, status, sortOrder } = body;

    if (!checklistId) {
      return NextResponse.json(
        { error: "checklistId is required" },
        { status: 400 }
      );
    }

    // 체크리스트 존재 확인
    const checklist = await prisma.checklist.findFirst({
      where: {
        id: checklistId,
        taskId,
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    // 업데이트 데이터 구성
    const updateData: {
      name?: string;
      status?: ChecklistStatus;
      sortOrder?: number;
      statusChangedAt?: Date;
      statusChangedById?: string;
    } = {};

    if (content !== undefined) {
      if (typeof content !== "string" || content.trim() === "") {
        return NextResponse.json(
          { error: "content cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = content.trim();
    }

    if (status !== undefined) {
      // Validate status
      const validStatuses = Object.values(ChecklistStatus);
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Valid values: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.status = status;
      updateData.statusChangedAt = new Date();
      updateData.statusChangedById = userId;
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

    // 업데이트 실행
    const updated = await prisma.checklist.update({
      where: { id: checklistId },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      content: updated.name,
      status: updated.status,
      sortOrder: updated.sortOrder,
    });
  } catch (error) {
    console.error("Error updating checklist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/tasks-v2/[taskId]/checklists - 체크리스트 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;
    const { role, organizationId } = session.user;

    // ADMIN/SUPER_ADMIN만 삭제 가능
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

    const { searchParams } = new URL(request.url);
    const checklistId = searchParams.get("checklistId");

    if (!checklistId) {
      return NextResponse.json(
        { error: "checklistId query parameter is required" },
        { status: 400 }
      );
    }

    // 체크리스트 존재 확인
    const checklist = await prisma.checklist.findFirst({
      where: {
        id: checklistId,
        taskId,
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    // 삭제
    await prisma.checklist.delete({
      where: { id: checklistId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
