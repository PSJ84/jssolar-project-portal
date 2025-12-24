import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const { itemId } = await params;
    const body = await request.json();
    const { name, startDate, endDate, actualStart, actualEnd, progress, status, memo, sortOrder } = body;

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
