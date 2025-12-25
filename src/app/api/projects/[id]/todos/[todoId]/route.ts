import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodoPriority } from "@prisma/client";

// PATCH /api/projects/[id]/todos/[todoId] - 할 일 수정/완료
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; todoId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, todoId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 할 일 존재 확인
    const existingTodo = await prisma.todo.findFirst({
      where: { id: todoId, projectId },
      include: { project: { select: { organizationId: true } } },
    });

    if (!existingTodo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    // 권한 확인: CLIENT는 수정 불가 (또는 완료 체크만 가능하게 할 수도 있음)
    if (user.role === "CLIENT") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // ADMIN은 같은 조직만
    if (user.role === "ADMIN" && existingTodo.project?.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, dueDate, priority, assigneeId, completed, completedDate } = body;

    // 업데이트 데이터 구성
    const updateData: {
      title?: string;
      description?: string | null;
      dueDate?: Date | null;
      priority?: TodoPriority;
      assigneeId?: string | null;
      completedDate?: Date | null;
      completedById?: string | null;
    } = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (priority !== undefined) {
      updateData.priority = priority;
    }

    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId || null;
    }

    // 완료 처리 - completedDate 직접 지정 또는 completed 토글
    if (completedDate !== undefined) {
      // 직접 날짜 지정
      if (completedDate) {
        updateData.completedDate = new Date(completedDate);
        updateData.completedById = session.user.id;
      } else {
        updateData.completedDate = null;
        updateData.completedById = null;
      }
    } else if (completed !== undefined) {
      // 기존 토글 방식 (호환성)
      if (completed) {
        updateData.completedDate = new Date();
        updateData.completedById = session.user.id;
      } else {
        updateData.completedDate = null;
        updateData.completedById = null;
      }
    }

    const todo = await prisma.todo.update({
      where: { id: todoId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(todo);
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json(
      { error: "Failed to update todo" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/todos/[todoId] - 할 일 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; todoId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, todoId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 할 일 존재 확인
    const existingTodo = await prisma.todo.findFirst({
      where: { id: todoId, projectId },
      include: { project: { select: { organizationId: true } } },
    });

    if (!existingTodo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    // CLIENT는 삭제 불가
    if (user.role === "CLIENT") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // ADMIN은 같은 조직만
    if (user.role === "ADMIN" && existingTodo.project?.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.todo.delete({
      where: { id: todoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json(
      { error: "Failed to delete todo" },
      { status: 500 }
    );
  }
}
