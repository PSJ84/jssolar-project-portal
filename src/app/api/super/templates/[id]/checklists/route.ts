import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/super/templates/[id]/checklists - 체크리스트 템플릿 목록
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: taskTemplateId } = await params;

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

    const checklists = await prisma.checklistTemplate.findMany({
      where: { taskTemplateId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(checklists);
  } catch (error) {
    console.error("Error fetching checklist templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/super/templates/[id]/checklists - 체크리스트 템플릿 추가
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: taskTemplateId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "name is required" },
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

    // 현재 최대 sortOrder 조회
    const maxSortOrder = await prisma.checklistTemplate.findFirst({
      where: { taskTemplateId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const newSortOrder = (maxSortOrder?.sortOrder ?? 0) + 1;

    const checklist = await prisma.checklistTemplate.create({
      data: {
        taskTemplateId,
        name: name.trim(),
        sortOrder: newSortOrder,
      },
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    console.error("Error creating checklist template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/super/templates/[id]/checklists - 체크리스트 템플릿 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: taskTemplateId } = await params;
    const body = await request.json();
    const { checklistId, name, sortOrder } = body;

    if (!checklistId) {
      return NextResponse.json(
        { error: "checklistId is required" },
        { status: 400 }
      );
    }

    // 체크리스트 존재 확인
    const checklist = await prisma.checklistTemplate.findFirst({
      where: {
        id: checklistId,
        taskTemplateId,
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: "Checklist template not found" },
        { status: 404 }
      );
    }

    // 업데이트 데이터 구성
    const updateData: { name?: string; sortOrder?: number } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { error: "name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
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

    const updated = await prisma.checklistTemplate.update({
      where: { id: checklistId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating checklist template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/super/templates/[id]/checklists - 체크리스트 템플릿 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: taskTemplateId } = await params;
    const { searchParams } = new URL(request.url);
    const checklistId = searchParams.get("checklistId");

    if (!checklistId) {
      return NextResponse.json(
        { error: "checklistId query parameter is required" },
        { status: 400 }
      );
    }

    // 체크리스트 존재 확인
    const checklist = await prisma.checklistTemplate.findFirst({
      where: {
        id: checklistId,
        taskTemplateId,
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: "Checklist template not found" },
        { status: 404 }
      );
    }

    await prisma.checklistTemplate.delete({
      where: { id: checklistId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
