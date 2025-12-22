import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KnowledgeCategory } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 지식노트 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const note = await prisma.knowledgeNote.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: "지식노트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 같은 조직만 접근 가능
    if (note.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error fetching knowledge note:", error);
    return NextResponse.json(
      { error: "지식노트를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// PATCH: 지식노트 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existingNote = await prisma.knowledgeNote.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: "지식노트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (existingNote.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, category, tags, isPinned } = body;

    // 업데이트 데이터 구성
    const updateData: {
      title?: string;
      content?: string;
      category?: KnowledgeCategory;
      tags?: string[];
      isPinned?: boolean;
    } = {};

    if (title !== undefined) {
      updateData.title = title.trim();
    }

    if (content !== undefined) {
      updateData.content = content.trim();
    }

    if (category !== undefined) {
      updateData.category = category as KnowledgeCategory;
    }

    if (tags !== undefined) {
      updateData.tags = tags.filter((t: string) => t.trim());
    }

    if (isPinned !== undefined) {
      updateData.isPinned = isPinned;
    }

    const note = await prisma.knowledgeNote.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error updating knowledge note:", error);
    return NextResponse.json(
      { error: "지식노트 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 지식노트 삭제
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

    const existingNote = await prisma.knowledgeNote.findUnique({
      where: { id },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: "지식노트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (existingNote.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.knowledgeNote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge note:", error);
    return NextResponse.json(
      { error: "지식노트 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
