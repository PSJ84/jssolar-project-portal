import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BudgetCategory } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 프로젝트 예산 목록 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // 프로젝트 접근 권한 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (project.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const budgets = await prisma.budget.findMany({
      where: { projectId },
      orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    });

    // 카테고리별 집계
    const summary = {
      totalPlanned: 0,
      totalActual: 0,
      byCategory: {} as Record<
        BudgetCategory,
        { planned: number; actual: number }
      >,
    };

    budgets.forEach((budget) => {
      summary.totalPlanned += budget.plannedAmount;
      summary.totalActual += budget.actualAmount;

      if (!summary.byCategory[budget.category]) {
        summary.byCategory[budget.category] = { planned: 0, actual: 0 };
      }
      summary.byCategory[budget.category].planned += budget.plannedAmount;
      summary.byCategory[budget.category].actual += budget.actualAmount;
    });

    return NextResponse.json({ budgets, summary });
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "예산 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST: 예산 항목 생성
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: projectId } = await params;

    // 프로젝트 접근 권한 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (project.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      category = "OTHER",
      description,
      plannedAmount,
      actualAmount = 0,
    } = body;

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "설명을 입력해주세요." },
        { status: 400 }
      );
    }

    if (plannedAmount === undefined || plannedAmount < 0) {
      return NextResponse.json(
        { error: "계획 금액을 입력해주세요." },
        { status: 400 }
      );
    }

    const budget = await prisma.budget.create({
      data: {
        projectId,
        category: category as BudgetCategory,
        description: description.trim(),
        plannedAmount: parseFloat(plannedAmount),
        actualAmount: parseFloat(actualAmount),
      },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "예산 항목 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
