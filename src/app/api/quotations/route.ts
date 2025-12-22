import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 견적 목록 조회
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
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // 조직 필터 (SUPER_ADMIN이 아니면 자기 조직만)
    const organizationFilter = session.user.role === "SUPER_ADMIN"
      ? {}
      : session.user.organizationId
        ? { organizationId: session.user.organizationId }
        : {};

    const quotations = await prisma.quotation.findMany({
      where: {
        ...organizationFilter,
        ...(status && { status: status as "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" }),
        ...(search && {
          OR: [
            { quotationNumber: { contains: search, mode: "insensitive" } },
            { customerName: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        organization: {
          select: { id: true, name: true },
        },
        _count: {
          select: { items: true, analyses: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 유효기간 체크하여 EXPIRED 상태 업데이트
    const now = new Date();
    const expiredIds = quotations
      .filter(q => q.status === "DRAFT" || q.status === "SENT")
      .filter(q => new Date(q.validUntil) < now)
      .map(q => q.id);

    if (expiredIds.length > 0) {
      await prisma.quotation.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: "EXPIRED" },
      });
    }

    // 상태 업데이트 반영
    const updatedQuotations = quotations.map(q => ({
      ...q,
      status: expiredIds.includes(q.id) ? "EXPIRED" : q.status,
    }));

    return NextResponse.json(updatedQuotations);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotations" },
      { status: 500 }
    );
  }
}

// POST: 견적 생성
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

    if (!session.user.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      address,
      capacityKw,
      moduleType,
      moduleCount,
      inverterType,
      inverterCount,
      structureType,
      items,
    } = body;

    // 필수 필드 검증
    if (!customerName || !capacityKw || !moduleType || !inverterType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 견적 번호 생성
    const year = new Date().getFullYear();
    const count = await prisma.quotation.count({
      where: {
        quotationNumber: { startsWith: `Q-${year}-` },
      },
    });
    const quotationNumber = `Q-${year}-${String(count + 1).padStart(3, "0")}`;

    // 유효기간 설정 (SystemConfig에서)
    const validDaysConfig = await prisma.systemConfig.findUnique({
      where: { key: "QUOTATION_VALID_DAYS" },
    });
    const validDays = parseInt(validDaysConfig?.value || "30");
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    // 금액 계산
    const totalAmount = items.reduce(
      (sum: number, item: { amount: number }) => sum + item.amount,
      0
    );
    const vatAmount = Math.round(totalAmount * 0.1);
    const grandTotal = totalAmount + vatAmount;

    // 견적 생성
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerName,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        address: address || null,
        capacityKw,
        moduleType,
        moduleCount: moduleCount || 0,
        inverterType,
        inverterCount: inverterCount || 0,
        structureType: structureType || null,
        totalAmount,
        vatAmount,
        grandTotal,
        vatIncluded: false,
        validUntil,
        status: "DRAFT",
        organizationId: session.user.organizationId,
        createdById: session.user.id,
        items: {
          create: items.map(
            (
              item: {
                category: string;
                name: string;
                spec?: string;
                unit: string;
                quantity: number;
                unitPrice: number;
                amount: number;
              },
              index: number
            ) => ({
              category: item.category,
              name: item.name,
              spec: item.spec || null,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              sortOrder: index,
            })
          ),
        },
      },
      include: {
        items: true,
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error("Error creating quotation:", error);
    return NextResponse.json(
      { error: "Failed to create quotation" },
      { status: 500 }
    );
  }
}
