import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodoPriority } from "@prisma/client";

// PATCH /api/admin/todos/[id] - Todo 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Todo 존재 확인 및 조직 확인
    const existingTodo = await prisma.todo.findUnique({
      where: { id },
      include: { project: { select: { organizationId: true } } },
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "할 일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (existingTodo.project.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { projectId, title, description, dueDate, priority, assigneeId, toggleComplete } = body;

    // 업데이트 데이터 구성
    const updateData: {
      projectId?: string;
      title?: string;
      description?: string | null;
      dueDate?: Date | null;
      priority?: TodoPriority;
      assigneeId?: string | null;
      completedDate?: Date | null;
      completedById?: string | null;
    } = {};

    // 프로젝트 이전
    if (projectId !== undefined && projectId !== existingTodo.projectId) {
      // 새 프로젝트가 같은 조직에 속하는지 확인
      const newProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          organizationId: session.user.organizationId,
        },
      });

      if (!newProject) {
        return NextResponse.json(
          { error: "이전할 프로젝트를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      updateData.projectId = projectId;
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json(
          { error: "제목을 입력해주세요." },
          { status: 400 }
        );
      }
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

    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId || null;
    }

    // 완료 토글
    if (toggleComplete) {
      if (existingTodo.completedDate) {
        // 완료 → 미완료
        updateData.completedDate = null;
        updateData.completedById = null;
      } else {
        // 미완료 → 완료
        updateData.completedDate = new Date();
        updateData.completedById = session.user.id;
      }
    }

    const todo = await prisma.todo.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(todo);
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json(
      { error: "할 일 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/todos/[id] - Todo 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Todo 존재 확인 및 조직 확인
    const existingTodo = await prisma.todo.findUnique({
      where: { id },
      include: { project: { select: { organizationId: true } } },
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "할 일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (existingTodo.project.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.todo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json(
      { error: "할 일 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
