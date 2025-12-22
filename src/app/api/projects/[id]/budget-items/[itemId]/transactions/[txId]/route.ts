import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH: 거래 내역 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string; txId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId, txId } = await params;
    const body = await request.json();
    const { date, description, amount, isCompleted, vatIncluded } = body;

    // 거래 내역 존재 확인
    const existing = await prisma.budgetTransaction.findFirst({
      where: { id: txId, budgetItemId: itemId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const updated = await prisma.budgetTransaction.update({
      where: { id: txId },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount }), // 음수 허용
        ...(vatIncluded !== undefined && { vatIncluded }),
        ...(isCompleted !== undefined && { isCompleted }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

// DELETE: 거래 내역 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string; txId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId, txId } = await params;

    // 거래 내역 존재 확인
    const existing = await prisma.budgetTransaction.findFirst({
      where: { id: txId, budgetItemId: itemId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await prisma.budgetTransaction.delete({
      where: { id: txId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
