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
            { projectName: { contains: search, mode: "insensitive" } },
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
      .filter(q => q.validUntil && new Date(q.validUntil) < now)
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
      customerAddress,
      customerPhone,
      customerEmail,
      address,
      projectName,
      quotationDate,
      validUntil,
      specialNotes,
      vatIncluded,
      roundingType,
      subtotal,
      roundingAmount,
      totalAmount,
      execSubtotal,
      execTotal,
      projectId,
      items,
      // 레거시 호환
      capacityKw,
      moduleType,
      moduleCount,
      inverterType,
      inverterCount,
      structureType,
    } = body;

    // 필수 필드 검증
    if (!customerName) {
      return NextResponse.json(
        { error: "고객명은 필수입니다" },
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

    // 유효기간 설정
    let finalValidUntil: Date | null = null;
    if (validUntil) {
      finalValidUntil = new Date(validUntil);
    } else {
      // SystemConfig에서 기본 유효기간
      const validDaysConfig = await prisma.systemConfig.findUnique({
        where: { key: "QUOTATION_VALID_DAYS" },
      });
      const validDays = parseInt(validDaysConfig?.value || "30");
      finalValidUntil = new Date();
      finalValidUntil.setDate(finalValidUntil.getDate() + validDays);
    }

    // 금액 계산 (새 방식 우선, 레거시 방식 fallback)
    let finalSubtotal = subtotal || 0;
    let finalTotalAmount = totalAmount || 0;
    let finalVatAmount = 0;
    let finalGrandTotal = 0;

    if (items && Array.isArray(items) && items.length > 0) {
      finalSubtotal = items.reduce(
        (sum: number, item: { amount: number }) => sum + (item.amount || 0),
        0
      );
      finalTotalAmount = finalSubtotal + (roundingAmount || 0);
    }

    finalVatAmount = vatIncluded ? 0 : Math.round(finalTotalAmount * 0.1);
    finalGrandTotal = finalTotalAmount + finalVatAmount;

    // 견적 생성
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerName,
        customerAddress: customerAddress || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        address: address || null,
        projectName: projectName || null,
        quotationDate: quotationDate ? new Date(quotationDate) : new Date(),
        validUntil: finalValidUntil,
        specialNotes: specialNotes || null,
        vatIncluded: vatIncluded || false,
        roundingType: roundingType || "NONE",
        subtotal: finalSubtotal,
        roundingAmount: roundingAmount || 0,
        totalAmount: finalTotalAmount,
        vatAmount: finalVatAmount,
        grandTotal: finalGrandTotal,
        execSubtotal: execSubtotal || null,
        execTotal: execTotal || null,
        // 레거시 호환
        capacityKw: capacityKw || null,
        moduleType: moduleType || null,
        moduleCount: moduleCount || null,
        inverterType: inverterType || null,
        inverterCount: inverterCount || null,
        structureType: structureType || null,
        status: "DRAFT",
        projectId: projectId || null,
        organizationId: session.user.organizationId,
        createdById: session.user.id,
        items: items && items.length > 0 ? {
          create: items.map(
            (
              item: {
                name: string;
                unit: string;
                quantity: number;
                unitPrice: number;
                amount: number;
                note?: string;
                execUnitPrice?: number;
                execAmount?: number;
                category?: string;
                spec?: string;
                sortOrder?: number;
              },
              index: number
            ) => ({
              name: item.name,
              unit: item.unit || "식",
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              amount: item.amount || 0,
              note: item.note || null,
              execUnitPrice: item.execUnitPrice || null,
              execAmount: item.execAmount || null,
              category: item.category || null,
              spec: item.spec || null,
              sortOrder: item.sortOrder ?? index,
            })
          ),
        } : undefined,
      },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
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
