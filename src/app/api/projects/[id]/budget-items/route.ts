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

    console.log("=== Budget Item Create Debug ===");
    console.log("Body:", JSON.stringify(body, null, 2));

    // 타입 안전하게 변환
    const type = body.type as "INCOME" | "EXPENSE";
    const category = body.category || "";
    const plannedAmount = typeof body.plannedAmount === "string"
      ? parseInt(body.plannedAmount, 10)
      : (body.plannedAmount || 0);
    const vatIncluded = body.vatIncluded === true;
    const memo = body.memo || null;

    if (!type || !["INCOME", "EXPENSE"].includes(type)) {
      return NextResponse.json(
        { error: "type must be INCOME or EXPENSE" },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "category is required" },
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

    console.log("Creating budget item:", { projectId, type, category, plannedAmount, vatIncluded, memo, sortOrder });

    const budgetItem = await prisma.budgetItem.create({
      data: {
        projectId,
        type,
        category,
        plannedAmount,
        vatIncluded,
        memo,
        sortOrder,
      },
      include: {
        transactions: true,
      },
    });

    console.log("Budget item created:", budgetItem.id);
    return NextResponse.json(budgetItem, { status: 201 });
  } catch (error) {
    console.error("=== Budget Item Create Error ===");
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to create budget item" },
      { status: 500 }
    );
  }
}
