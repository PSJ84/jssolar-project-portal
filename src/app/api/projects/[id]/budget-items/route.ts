import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 프로젝트 예산 품목 목록 (거래 내역 포함)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const budgetItems = await prisma.budgetItem.findMany({
      where: { projectId },
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json(budgetItems);
  } catch (error) {
    console.error("Error fetching budget items:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget items" },
      { status: 500 }
    );
  }
}

// POST: 새 예산 품목 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { type, category, plannedAmount, memo } = body;

    if (!type || !category || plannedAmount === undefined) {
      return NextResponse.json(
        { error: "type, category, plannedAmount are required" },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // sortOrder 계산
    const maxSortOrder = await prisma.budgetItem.aggregate({
      where: { projectId, type },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    const budgetItem = await prisma.budgetItem.create({
      data: {
        projectId,
        type,
        category,
        plannedAmount,
        memo,
        sortOrder,
      },
      include: {
        transactions: true,
      },
    });

    return NextResponse.json(budgetItem, { status: 201 });
  } catch (error) {
    console.error("Error creating budget item:", error);
    return NextResponse.json(
      { error: "Failed to create budget item" },
      { status: 500 }
    );
  }
}
