import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuotationStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 견적 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        analyses: true,
        createdBy: {
          select: { id: true, name: true },
        },
        organization: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // 조직 권한 체크
    if (
      session.user.role !== "SUPER_ADMIN" &&
      quotation.organizationId !== session.user.organizationId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 유효기간 체크하여 EXPIRED 상태 업데이트
    if (
      (quotation.status === "DRAFT" || quotation.status === "SENT") &&
      new Date(quotation.validUntil) < new Date()
    ) {
      await prisma.quotation.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      quotation.status = "EXPIRED";
    }

    return NextResponse.json(quotation);
  } catch (error) {
    console.error("Error fetching quotation:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotation" },
      { status: 500 }
    );
  }
}

// PATCH: 견적 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingQuotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existingQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // 조직 권한 체크
    if (
      session.user.role !== "SUPER_ADMIN" &&
      existingQuotation.organizationId !== session.user.organizationId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      status,
      items,
    } = body;

    // 상태 변경 검증
    if (status) {
      const validStatuses: QuotationStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
    }

    // 항목이 포함된 경우 금액 재계산
    let totalAmount = existingQuotation.totalAmount;
    let vatAmount = existingQuotation.vatAmount;
    let grandTotal = existingQuotation.grandTotal;

    if (items && Array.isArray(items)) {
      totalAmount = items.reduce(
        (sum: number, item: { amount: number }) => sum + item.amount,
        0
      );
      vatAmount = Math.round(totalAmount * 0.1);
      grandTotal = totalAmount + vatAmount;

      // 기존 항목 삭제 후 새로 생성
      await prisma.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      await prisma.quotationItem.createMany({
        data: items.map(
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
            quotationId: id,
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
      });
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        ...(customerName !== undefined && { customerName }),
        ...(customerPhone !== undefined && { customerPhone: customerPhone || null }),
        ...(customerEmail !== undefined && { customerEmail: customerEmail || null }),
        ...(address !== undefined && { address: address || null }),
        ...(capacityKw !== undefined && { capacityKw }),
        ...(moduleType !== undefined && { moduleType }),
        ...(moduleCount !== undefined && { moduleCount }),
        ...(inverterType !== undefined && { inverterType }),
        ...(inverterCount !== undefined && { inverterCount }),
        ...(structureType !== undefined && { structureType: structureType || null }),
        ...(status !== undefined && { status }),
        ...(items && { totalAmount, vatAmount, grandTotal }),
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

    return NextResponse.json(quotation);
  } catch (error) {
    console.error("Error updating quotation:", error);
    return NextResponse.json(
      { error: "Failed to update quotation" },
      { status: 500 }
    );
  }
}

// DELETE: 견적 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existingQuotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!existingQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // 조직 권한 체크
    if (
      session.user.role !== "SUPER_ADMIN" &&
      existingQuotation.organizationId !== session.user.organizationId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ACCEPTED 상태의 견적은 삭제 불가
    if (existingQuotation.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Cannot delete accepted quotation" },
        { status: 400 }
      );
    }

    await prisma.quotation.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Quotation deleted" });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    return NextResponse.json(
      { error: "Failed to delete quotation" },
      { status: 500 }
    );
  }
}
