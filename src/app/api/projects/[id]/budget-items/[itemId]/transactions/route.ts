import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 해당 품목의 거래 내역
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;

    const transactions = await prisma.budgetTransaction.findMany({
      where: { budgetItemId: itemId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// POST: 새 거래 내역 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, itemId } = await params;
    const body = await request.json();
    const { date, description, amount, isCompleted = true } = body;

    if (!date || !description || amount === undefined) {
      return NextResponse.json(
        { error: "date, description, amount are required" },
        { status: 400 }
      );
    }

    // 품목 존재 및 프로젝트 확인
    const budgetItem = await prisma.budgetItem.findFirst({
      where: { id: itemId, projectId },
    });

    if (!budgetItem) {
      return NextResponse.json({ error: "Budget item not found" }, { status: 404 });
    }

    const transaction = await prisma.budgetTransaction.create({
      data: {
        budgetItemId: itemId,
        date: new Date(date),
        description,
        amount,
        isCompleted,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
