import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanyTodoCategory, TodoPriority } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 회사 할일 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const todo = await prisma.companyTodo.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!todo) {
      return NextResponse.json(
        { error: "할일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 같은 조직만 접근 가능
    if (todo.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(todo);
  } catch (error) {
    console.error("Error fetching company todo:", error);
    return NextResponse.json(
      { error: "할일을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// PATCH: 회사 할일 수정 (완료 처리 포함)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingTodo = await prisma.companyTodo.findUnique({
      where: { id },
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "할일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (existingTodo.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      dueDate,
      priority,
      category,
      assigneeId,
      completed, // boolean for toggle
    } = body;

    // 업데이트 데이터 구성
    const updateData: {
      title?: string;
      description?: string | null;
      dueDate?: Date | null;
      priority?: TodoPriority;
      category?: CompanyTodoCategory;
      assigneeId?: string | null;
      completedDate?: Date | null;
    } = {};

    if (title !== undefined) {
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (priority !== undefined) {
      updateData.priority = priority as TodoPriority;
    }

    if (category !== undefined) {
      updateData.category = category as CompanyTodoCategory;
    }

    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId || null;
    }

    // 완료 상태 토글
    if (completed !== undefined) {
      updateData.completedDate = completed ? new Date() : null;
    }

    const todo = await prisma.companyTodo.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(todo);
  } catch (error) {
    console.error("Error updating company todo:", error);
    return NextResponse.json(
      { error: "할일 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 회사 할일 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existingTodo = await prisma.companyTodo.findUnique({
      where: { id },
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "할일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (existingTodo.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.companyTodo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting company todo:", error);
    return NextResponse.json(
      { error: "할일 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
