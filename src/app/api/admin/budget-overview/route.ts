import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDisplayAmount } from "@/lib/vat-utils";

// GET: 전체 프로젝트 예산 현황 (통합 솔루션용)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // 활성 프로젝트들과 예산 정보 조회 (필요한 필드만 선택)
    const projects = await prisma.project.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        budgetItems: {
          select: {
            type: true,
            plannedAmount: true,
            vatIncluded: true,
            transactions: {
              where: { isCompleted: true },
              select: {
                amount: true,
                vatIncluded: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 프로젝트별 손익 계산 (VAT 포함 금액으로)
    const projectBudgets = projects.map((project) => {
      const incomeItems = project.budgetItems.filter((item) => item.type === "INCOME");
      const expenseItems = project.budgetItems.filter((item) => item.type === "EXPENSE");

      // 매출 계획 (VAT 포함)
      const totalIncomePlanned = incomeItems.reduce(
        (sum, item) => sum + getDisplayAmount(item.plannedAmount, item.vatIncluded),
        0
      );
      // 매출 실제 (VAT 포함, 완료된 거래만 - 쿼리에서 이미 필터됨)
      const totalIncomeActual = incomeItems.reduce(
        (sum, item) =>
          sum +
          item.transactions.reduce((txSum, tx) => txSum + getDisplayAmount(tx.amount, tx.vatIncluded), 0),
        0
      );

      // 지출 계획 (VAT 포함)
      const totalExpensePlanned = expenseItems.reduce(
        (sum, item) => sum + getDisplayAmount(item.plannedAmount, item.vatIncluded),
        0
      );
      // 지출 실제 (VAT 포함, 완료된 거래만 - 쿼리에서 이미 필터됨)
      const totalExpenseActual = expenseItems.reduce(
        (sum, item) =>
          sum +
          item.transactions.reduce((txSum, tx) => txSum + getDisplayAmount(tx.amount, tx.vatIncluded), 0),
        0
      );

      const currentProfit = totalIncomeActual - totalExpenseActual;
      const expectedProfit = totalIncomePlanned - totalExpensePlanned;
      const profitRate =
        totalIncomePlanned > 0
          ? Math.round((expectedProfit / totalIncomePlanned) * 100)
          : 0;

      return {
        id: project.id,
        name: project.name,
        income: {
          planned: totalIncomePlanned,
          actual: totalIncomeActual,
        },
        expense: {
          planned: totalExpensePlanned,
          actual: totalExpenseActual,
        },
        profit: {
          current: currentProfit,
          expected: expectedProfit,
          rate: profitRate,
        },
      };
    });

    // 전체 합계
    const totals = projectBudgets.reduce(
      (acc, p) => ({
        incomePlanned: acc.incomePlanned + p.income.planned,
        incomeActual: acc.incomeActual + p.income.actual,
        expensePlanned: acc.expensePlanned + p.expense.planned,
        expenseActual: acc.expenseActual + p.expense.actual,
        currentProfit: acc.currentProfit + p.profit.current,
        expectedProfit: acc.expectedProfit + p.profit.expected,
      }),
      {
        incomePlanned: 0,
        incomeActual: 0,
        expensePlanned: 0,
        expenseActual: 0,
        currentProfit: 0,
        expectedProfit: 0,
      }
    );

    return NextResponse.json({
      projects: projectBudgets,
      totals: {
        income: {
          planned: totals.incomePlanned,
          actual: totals.incomeActual,
        },
        expense: {
          planned: totals.expensePlanned,
          actual: totals.expenseActual,
        },
        profit: {
          current: totals.currentProfit,
          expected: totals.expectedProfit,
          rate:
            totals.incomePlanned > 0
              ? Math.round((totals.expectedProfit / totals.incomePlanned) * 100)
              : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching budget overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget overview" },
      { status: 500 }
    );
  }
}
