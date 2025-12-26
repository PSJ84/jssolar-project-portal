import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyConstructionStatusChanged } from "@/lib/push-notification";

// PATCH /api/projects/[id]/construction-items/[itemId] - 세부공정 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = session.user.role as string;
    if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    const { id: projectId, itemId } = await params;
    const body = await request.json();
    const { name, startDate, endDate, actualStart, actualEnd, progress, status, memo, sortOrder } = body;

    // 기존 상태 확인 (알림용)
    const existingItem = await prisma.constructionItem.findUnique({
      where: { id: itemId },
      select: { status: true, name: true },
    });

    const item = await prisma.constructionItem.update({
      where: { id: itemId },
      data: {
        ...(name !== undefined && { name }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(actualStart !== undefined && { actualStart: actualStart ? new Date(actualStart) : null }),
        ...(actualEnd !== undefined && { actualEnd: actualEnd ? new Date(actualEnd) : null }),
        ...(progress !== undefined && { progress }),
        ...(status !== undefined && { status }),
        ...(memo !== undefined && { memo }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    // 시공 상태 변경 알림 (시작 또는 완료)
    if (status && existingItem && status !== existingItem.status) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      });
      if (project) {
        if (status === 'IN_PROGRESS' && existingItem.status === 'PLANNED') {
          notifyConstructionStatusChanged(projectId, project.name, item.name, 'started').catch(console.error);
        } else if (status === 'COMPLETED') {
          notifyConstructionStatusChanged(projectId, project.name, item.name, 'completed').catch(console.error);
        }
      }
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating construction item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/construction-items/[itemId] - 세부공정 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = session.user.role as string;
    if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    const { itemId } = await params;

    await prisma.constructionItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ message: "Item deleted" });
  } catch (error) {
    console.error("Error deleting construction item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
