import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodoPriority } from "@prisma/client";
import { notifyTodoAssigned, notifyTodoCompleted } from "@/lib/push-notification";

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

    // 조직 확인: 프로젝트가 있으면 프로젝트의 조직, 없으면 직접 조직 확인
    const todoOrgId = existingTodo.project?.organizationId ?? existingTodo.organizationId;
    if (todoOrgId !== session.user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { projectId, title, description, dueDate, priority, assigneeId, toggleComplete, completedDate } = body;

    // 업데이트 데이터 구성
    const updateData: {
      projectId?: string | null;
      organizationId?: string | null;
      title?: string;
      description?: string | null;
      dueDate?: Date | null;
      priority?: TodoPriority;
      assigneeId?: string | null;
      completedDate?: Date | null;
      completedById?: string | null;
    } = {};

    // 프로젝트 변경 (null이면 회사 할 일로 변경)
    if (projectId !== undefined) {
      if (projectId === null || projectId === "") {
        // 회사 할 일로 변경
        updateData.projectId = null;
        updateData.organizationId = session.user.organizationId;
      } else if (projectId !== existingTodo.projectId) {
        // 다른 프로젝트로 이전
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
        updateData.organizationId = null; // 프로젝트에 속하면 조직 직접 연결 해제
      }
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

    // 완료일 직접 설정 (수정 폼에서)
    if (completedDate !== undefined) {
      if (completedDate) {
        updateData.completedDate = new Date(completedDate);
        updateData.completedById = session.user.id;
      } else {
        updateData.completedDate = null;
        updateData.completedById = null;
      }
    }
    // 완료 토글 (체크박스에서)
    else if (toggleComplete) {
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

    // 담당자 변경 시 알림 (새로운 담당자에게)
    if (assigneeId && assigneeId !== existingTodo.assigneeId && assigneeId !== session.user.id) {
      notifyTodoAssigned(todo.id, assigneeId, todo.title, todo.projectId || undefined).catch(console.error);
    }

    // 완료 시 알림 (관리자에게)
    if (updateData.completedDate && !existingTodo.completedDate && todo.projectId) {
      const completedByName = session.user.name || "사용자";
      notifyTodoCompleted(todo.id, todo.projectId, todo.title, completedByName).catch(console.error);
    }

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

    // 조직 확인: 프로젝트가 있으면 프로젝트의 조직, 없으면 직접 조직 확인
    const todoOrgId = existingTodo.project?.organizationId ?? existingTodo.organizationId;
    if (todoOrgId !== session.user.organizationId) {
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
