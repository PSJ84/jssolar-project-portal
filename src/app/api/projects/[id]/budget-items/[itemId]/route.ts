import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH: 예산 품목 수정
export async function PATCH(
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
    const { type, category, plannedAmount, memo, sortOrder } = body;

    // 품목 존재 및 프로젝트 확인
    const existing = await prisma.budgetItem.findFirst({
      where: { id: itemId, projectId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Budget item not found" }, { status: 404 });
    }

    const updated = await prisma.budgetItem.update({
      where: { id: itemId },
      data: {
        ...(type !== undefined && { type }),
        ...(category !== undefined && { category }),
        ...(plannedAmount !== undefined && { plannedAmount }),
        ...(memo !== undefined && { memo }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        transactions: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating budget item:", error);
    return NextResponse.json(
      { error: "Failed to update budget item" },
      { status: 500 }
    );
  }
}

// DELETE: 예산 품목 삭제 (관련 거래 내역도 삭제)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, itemId } = await params;

    // 품목 존재 및 프로젝트 확인
    const existing = await prisma.budgetItem.findFirst({
      where: { id: itemId, projectId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Budget item not found" }, { status: 404 });
    }

    await prisma.budgetItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget item:", error);
    return NextResponse.json(
      { error: "Failed to delete budget item" },
      { status: 500 }
    );
  }
}
