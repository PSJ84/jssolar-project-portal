import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/projects/[id]/construction-phases - 대공정 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;

    const phases = await prisma.constructionPhase.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(phases);
  } catch (error) {
    console.error("Error fetching construction phases:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/construction-phases - 대공정 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: projectId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // 마지막 sortOrder 가져오기
    const lastPhase = await prisma.constructionPhase.findFirst({
      where: { projectId },
      orderBy: { sortOrder: "desc" },
    });

    const phase = await prisma.constructionPhase.create({
      data: {
        projectId,
        name,
        sortOrder: lastPhase ? lastPhase.sortOrder + 1 : 0,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(phase, { status: 201 });
  } catch (error) {
    console.error("Error creating construction phase:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
