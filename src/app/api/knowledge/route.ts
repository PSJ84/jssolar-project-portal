import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KnowledgeCategory } from "@prisma/client";

// GET: 지식노트 목록 조회 (검색 포함)
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
    const q = searchParams.get("q"); // 검색어
    const category = searchParams.get("category") as KnowledgeCategory | null;
    const pinned = searchParams.get("pinned"); // "true" or null
    const limit = searchParams.get("limit");

    // 필터 조건 구성
    const where: {
      organizationId: string;
      category?: KnowledgeCategory;
      isPinned?: boolean;
      OR?: Array<{
        title?: { contains: string; mode: "insensitive" };
        content?: { contains: string; mode: "insensitive" };
        tags?: { has: string };
      }>;
    } = {
      organizationId: session.user.organizationId,
    };

    if (category) {
      where.category = category;
    }

    if (pinned === "true") {
      where.isPinned = true;
    }

    // 검색어 처리
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ];
    }

    const notes = await prisma.knowledgeNote.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { isPinned: "desc" }, // 고정된 것 먼저
        { updatedAt: "desc" },
      ],
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching knowledge notes:", error);
    return NextResponse.json(
      { error: "지식노트 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST: 지식노트 생성
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
    const { title, content, category = "OTHER", tags = [], isPinned = false } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "제목을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "내용을 입력해주세요." },
        { status: 400 }
      );
    }

    const note = await prisma.knowledgeNote.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        category: category as KnowledgeCategory,
        tags: tags.filter((t: string) => t.trim()),
        isPinned,
        organizationId: session.user.organizationId,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating knowledge note:", error);
    return NextResponse.json(
      { error: "지식노트 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
