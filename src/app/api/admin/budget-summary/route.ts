import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BudgetCategory } from "@prisma/client";

// GET: 전체 예산 현황 조회
export async function GET() {
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

    // 조직의 모든 프로젝트와 예산 조회
    const projects = await prisma.project.findMany({
      where: { organizationId: session.user.organizationId },
      select: {
        id: true,
        name: true,
        status: true,
        budgets: true,
      },
      orderBy: { name: "asc" },
    });

    // 프로젝트별 예산 집계
    const projectSummaries = projects.map((project) => {
      const totalPlanned = project.budgets.reduce(
        (sum, b) => sum + b.plannedAmount,
        0
      );
      const totalActual = project.budgets.reduce(
        (sum, b) => sum + b.actualAmount,
        0
      );
      const executionRate =
        totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        totalPlanned,
        totalActual,
        executionRate: Math.round(executionRate * 10) / 10,
        budgetCount: project.budgets.length,
      };
    });

    // 전체 집계
    const overallSummary = {
      totalPlanned: projectSummaries.reduce((sum, p) => sum + p.totalPlanned, 0),
      totalActual: projectSummaries.reduce((sum, p) => sum + p.totalActual, 0),
      projectCount: projects.length,
      projectsWithBudget: projectSummaries.filter((p) => p.budgetCount > 0).length,
    };

    const overallExecutionRate =
      overallSummary.totalPlanned > 0
        ? (overallSummary.totalActual / overallSummary.totalPlanned) * 100
        : 0;

    // 카테고리별 전체 집계
    const allBudgets = projects.flatMap((p) => p.budgets);
    const categoryTotals: Record<
      BudgetCategory,
      { planned: number; actual: number }
    > = {} as Record<BudgetCategory, { planned: number; actual: number }>;

    allBudgets.forEach((budget) => {
      if (!categoryTotals[budget.category]) {
        categoryTotals[budget.category] = { planned: 0, actual: 0 };
      }
      categoryTotals[budget.category].planned += budget.plannedAmount;
      categoryTotals[budget.category].actual += budget.actualAmount;
    });

    return NextResponse.json({
      overall: {
        ...overallSummary,
        executionRate: Math.round(overallExecutionRate * 10) / 10,
        remaining: overallSummary.totalPlanned - overallSummary.totalActual,
      },
      projects: projectSummaries,
      byCategory: categoryTotals,
    });
  } catch (error) {
    console.error("Error fetching budget summary:", error);
    return NextResponse.json(
      { error: "예산 현황을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
