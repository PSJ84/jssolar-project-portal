import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: 핀 토글
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

    // 핀 상태 토글
    const note = await prisma.knowledgeNote.update({
      where: { id },
      data: {
        isPinned: !existingNote.isPinned,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error toggling pin:", error);
    return NextResponse.json(
      { error: "핀 상태 변경에 실패했습니다." },
      { status: 500 }
    );
  }
}
