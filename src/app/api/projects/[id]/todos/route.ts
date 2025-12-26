import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodoPriority } from "@prisma/client";
import { notifyTodoAssigned } from "@/lib/push-notification";

// GET /api/projects/[id]/todos - 할 일 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // 프로젝트 접근 권한 확인
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // CLIENT는 멤버십 확인
    if (user.role === "CLIENT") {
      const membership = await prisma.projectMember.findFirst({
        where: { projectId, userId: session.user.id },
      });
      if (!membership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else if (user.role === "ADMIN") {
      // ADMIN은 같은 조직의 프로젝트만
      const project = await prisma.project.findFirst({
        where: { id: projectId, organizationId: user.organizationId! },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }
    // SUPER_ADMIN은 모든 프로젝트 접근 가능

    const todos = await prisma.todo.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } },
      },
      orderBy: [
        { completedDate: "asc" }, // 미완료 먼저
        { priority: "asc" }, // HIGH, MEDIUM, LOW 순
        { dueDate: "asc" }, // 기한 빠른 순
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/todos - 할 일 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // ADMIN, SUPER_ADMIN만 생성 가능
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, organizationId: true },
    });

    if (!user || user.role === "CLIENT") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // ADMIN은 같은 조직의 프로젝트만
    if (user.role === "ADMIN") {
      const project = await prisma.project.findFirst({
        where: { id: projectId, organizationId: user.organizationId! },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    const body = await request.json();
    const { title, description, dueDate, priority, assigneeId } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const todo = await prisma.todo.create({
      data: {
        projectId,
        title: title.trim(),
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || TodoPriority.MEDIUM,
        assigneeId: assigneeId || null,
        createdById: session.user.id,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } },
      },
    });

    // 할일 배정 시 알림 발송
    if (assigneeId && assigneeId !== session.user.id) {
      notifyTodoAssigned(todo.id, assigneeId, title.trim(), projectId).catch(console.error);
    }

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}
