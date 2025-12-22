import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanyTodoCategory, TodoPriority } from "@prisma/client";

// GET: 회사 할일 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as CompanyTodoCategory | null;
    const assigneeId = searchParams.get("assigneeId");
    const completed = searchParams.get("completed"); // "true", "false", or null for all
    const limit = searchParams.get("limit");

    // 필터 조건 구성
    const where: {
      organizationId: string;
      category?: CompanyTodoCategory;
      assigneeId?: string | null;
      completedDate?: { not: null } | null;
    } = {
      organizationId: session.user.organizationId,
    };

    if (category) {
      where.category = category;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId === "none" ? null : assigneeId;
    }

    if (completed === "true") {
      where.completedDate = { not: null };
    } else if (completed === "false") {
      where.completedDate = null;
    }

    const todos = await prisma.companyTodo.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { completedDate: "asc" }, // 미완료 먼저
        { dueDate: "asc" }, // 마감일 순
        { priority: "asc" }, // HIGH -> MEDIUM -> LOW
        { createdAt: "desc" },
      ],
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json(todos);
  } catch (error) {
    console.error("Error fetching company todos:", error);
    return NextResponse.json(
      { error: "회사 할일 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST: 회사 할일 생성
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
    const {
      title,
      description,
      dueDate,
      priority = "MEDIUM",
      category = "OTHER",
      assigneeId,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "제목을 입력해주세요." },
        { status: 400 }
      );
    }

    const todo = await prisma.companyTodo.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority as TodoPriority,
        category: category as CompanyTodoCategory,
        assigneeId: assigneeId || null,
        organizationId: session.user.organizationId,
        createdById: session.user.id,
      },
      include: {
        assignee: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("Error creating company todo:", error);
    return NextResponse.json(
      { error: "회사 할일 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
