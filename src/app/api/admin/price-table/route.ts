import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PriceCategory } from "@prisma/client";

// GET: 단가 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as PriceCategory | null;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const prices = await prisma.priceTable.findMany({
      where: {
        ...(category && { category }),
        ...(!includeInactive && { isActive: true }),
      },
      orderBy: [
        { category: "asc" },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(prices);
  } catch (error) {
    console.error("Error fetching price table:", error);
    return NextResponse.json(
      { error: "Failed to fetch price table" },
      { status: 500 }
    );
  }
}

// POST: 단가 추가
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { category, name, unit, unitPrice, spec } = body;

    // 필수 필드 검증
    if (!category || !name || !unit || unitPrice === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: category, name, unit, unitPrice" },
        { status: 400 }
      );
    }

    // 카테고리 검증
    const validCategories: PriceCategory[] = ["MODULE", "INVERTER", "STRUCTURE", "LABOR", "ETC"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    // 같은 카테고리의 마지막 sortOrder 조회
    const lastItem = await prisma.priceTable.findFirst({
      where: { category },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const newSortOrder = (lastItem?.sortOrder ?? -1) + 1;

    const price = await prisma.priceTable.create({
      data: {
        category,
        name,
        unit,
        unitPrice: Math.round(unitPrice),
        spec: spec || null,
        sortOrder: newSortOrder,
      },
    });

    return NextResponse.json(price, { status: 201 });
  } catch (error) {
    console.error("Error creating price:", error);
    return NextResponse.json(
      { error: "Failed to create price" },
      { status: 500 }
    );
  }
}
