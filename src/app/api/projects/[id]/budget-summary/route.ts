import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 프로젝트 손익 요약
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

    // 모든 예산 품목과 거래 내역 조회
    const budgetItems = await prisma.budgetItem.findMany({
      where: { projectId },
      include: {
        transactions: true,
      },
    });

    // 매출 (INCOME) 품목
    const incomeItems = budgetItems.filter((item) => item.type === "INCOME");
    // 매입 (EXPENSE) 품목
    const expenseItems = budgetItems.filter((item) => item.type === "EXPENSE");

    // 매출 계산
    const totalIncomePlanned = incomeItems.reduce(
      (sum, item) => sum + item.plannedAmount,
      0
    );
    const totalIncomeActual = incomeItems.reduce(
      (sum, item) =>
        sum +
        item.transactions
          .filter((tx) => tx.isCompleted)
          .reduce((txSum, tx) => txSum + tx.amount, 0),
      0
    );
    const totalIncomePending = incomeItems.reduce(
      (sum, item) =>
        sum +
        item.transactions
          .filter((tx) => !tx.isCompleted)
          .reduce((txSum, tx) => txSum + tx.amount, 0),
      0
    );

    // 매입 계산
    const totalExpensePlanned = expenseItems.reduce(
      (sum, item) => sum + item.plannedAmount,
      0
    );
    const totalExpenseActual = expenseItems.reduce(
      (sum, item) =>
        sum +
        item.transactions
          .filter((tx) => tx.isCompleted)
          .reduce((txSum, tx) => txSum + tx.amount, 0),
      0
    );
    const totalExpensePending = expenseItems.reduce(
      (sum, item) =>
        sum +
        item.transactions
          .filter((tx) => !tx.isCompleted)
          .reduce((txSum, tx) => txSum + tx.amount, 0),
      0
    );

    // 손익 계산
    const currentProfit = totalIncomeActual - totalExpenseActual;
    const expectedProfit = totalIncomePlanned - totalExpensePlanned;
    const profitRate =
      totalIncomePlanned > 0
        ? Math.round((expectedProfit / totalIncomePlanned) * 100)
        : 0;

    return NextResponse.json({
      income: {
        planned: totalIncomePlanned,
        actual: totalIncomeActual,
        pending: totalIncomePending,
      },
      expense: {
        planned: totalExpensePlanned,
        actual: totalExpenseActual,
        pending: totalExpensePending,
      },
      profit: {
        current: currentProfit,
        expected: expectedProfit,
        rate: profitRate,
      },
    });
  } catch (error) {
    console.error("Error fetching budget summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget summary" },
      { status: 500 }
    );
  }
}
