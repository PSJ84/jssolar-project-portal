import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodoPriority } from "@prisma/client";

// GET /api/admin/todos - 전체 Todo 조회 (조직 기준)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const completed = searchParams.get("completed"); // "true", "false", or null
    const limit = searchParams.get("limit");

    // 조직의 모든 프로젝트 ID 조회
    const projects = await prisma.project.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, name: true },
    });

    const projectIds = projects.map((p) => p.id);

    // 필터 조건 구성
    const where: {
      projectId: { in: string[] } | string;
      completedDate?: { not: null } | null;
    } = {
      projectId: projectId ? projectId : { in: projectIds },
    };

    if (completed === "true") {
      where.completedDate = { not: null };
    } else if (completed === "false") {
      where.completedDate = null;
    }

    const todos = await prisma.todo.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
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
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({
      todos,
      projects, // 프로젝트 목록도 함께 반환 (필터 드롭다운용)
    });
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json(
      { error: "할 일 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/admin/todos - 새 Todo 생성
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { projectId, title, description, dueDate, priority, assigneeId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트를 선택해주세요." },
        { status: 400 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "제목을 입력해주세요." },
        { status: 400 }
      );
    }

    // 프로젝트가 해당 조직에 속하는지 확인
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: session.user.organizationId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const todo = await prisma.todo.create({
      data: {
        projectId,
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: (priority as TodoPriority) || TodoPriority.MEDIUM,
        assigneeId: assigneeId || null,
        createdById: session.user.id,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json(
      { error: "할 일 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
