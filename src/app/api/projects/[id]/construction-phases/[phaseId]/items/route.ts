import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/projects/[id]/construction-phases/[phaseId]/items - 세부공정 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = session.user.role as string;
    if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    const { phaseId } = await params;
    const body = await request.json();
    const { name, startDate, endDate, actualStart, actualEnd, progress, status, memo } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // 마지막 sortOrder 가져오기
    const lastItem = await prisma.constructionItem.findFirst({
      where: { phaseId },
      orderBy: { sortOrder: "desc" },
    });

    const item = await prisma.constructionItem.create({
      data: {
        phaseId,
        name,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        actualStart: actualStart ? new Date(actualStart) : null,
        actualEnd: actualEnd ? new Date(actualEnd) : null,
        progress: progress || 0,
        status: status || "PLANNED",
        memo,
        sortOrder: lastItem ? lastItem.sortOrder + 1 : 0,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating construction item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
