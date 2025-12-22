import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PriceCategory } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: 단가 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { category, name, unit, unitPrice, spec, isActive, sortOrder } = body;

    // 존재 여부 확인
    const existingPrice = await prisma.priceTable.findUnique({
      where: { id },
    });

    if (!existingPrice) {
      return NextResponse.json(
        { error: "Price not found" },
        { status: 404 }
      );
    }

    // 카테고리 검증 (변경되는 경우)
    if (category) {
      const validCategories: PriceCategory[] = ["MODULE", "INVERTER", "STRUCTURE", "LABOR", "ETC"];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
    }

    const price = await prisma.priceTable.update({
      where: { id },
      data: {
        ...(category !== undefined && { category }),
        ...(name !== undefined && { name }),
        ...(unit !== undefined && { unit }),
        ...(unitPrice !== undefined && { unitPrice: Math.round(unitPrice) }),
        ...(spec !== undefined && { spec: spec || null }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(price);
  } catch (error) {
    console.error("Error updating price:", error);
    return NextResponse.json(
      { error: "Failed to update price" },
      { status: 500 }
    );
  }
}

// DELETE: 단가 삭제 (비활성화 또는 완전 삭제)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get("hard") === "true";

    // 존재 여부 확인
    const existingPrice = await prisma.priceTable.findUnique({
      where: { id },
    });

    if (!existingPrice) {
      return NextResponse.json(
        { error: "Price not found" },
        { status: 404 }
      );
    }

    if (hard) {
      // 완전 삭제
      await prisma.priceTable.delete({
        where: { id },
      });
      return NextResponse.json({ message: "Price permanently deleted" });
    } else {
      // 비활성화 (소프트 삭제)
      await prisma.priceTable.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: "Price deactivated" });
    }
  } catch (error) {
    console.error("Error deleting price:", error);
    return NextResponse.json(
      { error: "Failed to delete price" },
      { status: 500 }
    );
  }
}
