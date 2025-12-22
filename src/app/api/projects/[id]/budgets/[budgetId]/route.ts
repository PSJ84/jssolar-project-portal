import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BudgetCategory } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string; budgetId: string }>;
}

// PATCH: 예산 항목 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: projectId, budgetId } = await params;

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

    // 예산 항목 확인
    const existingBudget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!existingBudget || existingBudget.projectId !== projectId) {
      return NextResponse.json(
        { error: "예산 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { category, description, plannedAmount, actualAmount } = body;

    // 업데이트 데이터 구성
    const updateData: {
      category?: BudgetCategory;
      description?: string;
      plannedAmount?: number;
      actualAmount?: number;
    } = {};

    if (category !== undefined) {
      updateData.category = category as BudgetCategory;
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (plannedAmount !== undefined) {
      updateData.plannedAmount = parseFloat(plannedAmount);
    }

    if (actualAmount !== undefined) {
      updateData.actualAmount = parseFloat(actualAmount);
    }

    const budget = await prisma.budget.update({
      where: { id: budgetId },
      data: updateData,
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "예산 항목 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 예산 항목 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: projectId, budgetId } = await params;

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

    // 예산 항목 확인
    const existingBudget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!existingBudget || existingBudget.projectId !== projectId) {
      return NextResponse.json(
        { error: "예산 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.budget.delete({
      where: { id: budgetId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "예산 항목 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
