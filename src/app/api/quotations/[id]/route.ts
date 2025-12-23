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
      quotation.validUntil &&
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
      status,
      items,
      // 레거시 호환
      capacityKw,
      moduleType,
      moduleCount,
      inverterType,
      inverterCount,
      structureType,
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
    let finalSubtotal = subtotal ?? existingQuotation.subtotal;
    let finalTotalAmount = totalAmount ?? existingQuotation.totalAmount;
    let finalVatAmount = existingQuotation.vatAmount;
    let finalGrandTotal = existingQuotation.grandTotal;

    if (items && Array.isArray(items)) {
      finalSubtotal = items.reduce(
        (sum: number, item: { amount: number }) => sum + (item.amount || 0),
        0
      );
      const finalRounding = roundingAmount ?? existingQuotation.roundingAmount;
      finalTotalAmount = finalSubtotal + finalRounding;
      finalVatAmount = (vatIncluded ?? existingQuotation.vatIncluded) ? 0 : Math.round(finalTotalAmount * 0.1);
      finalGrandTotal = finalTotalAmount + finalVatAmount;

      // 기존 항목 삭제 후 새로 생성
      await prisma.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      await prisma.quotationItem.createMany({
        data: items.map(
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
            quotationId: id,
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
      });
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        ...(customerName !== undefined && { customerName }),
        ...(customerAddress !== undefined && { customerAddress: customerAddress || null }),
        ...(customerPhone !== undefined && { customerPhone: customerPhone || null }),
        ...(customerEmail !== undefined && { customerEmail: customerEmail || null }),
        ...(address !== undefined && { address: address || null }),
        ...(projectName !== undefined && { projectName: projectName || null }),
        ...(quotationDate !== undefined && { quotationDate: new Date(quotationDate) }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(specialNotes !== undefined && { specialNotes: specialNotes || null }),
        ...(vatIncluded !== undefined && { vatIncluded }),
        ...(roundingType !== undefined && { roundingType }),
        ...(roundingAmount !== undefined && { roundingAmount }),
        ...(items && { subtotal: finalSubtotal, totalAmount: finalTotalAmount, vatAmount: finalVatAmount, grandTotal: finalGrandTotal }),
        ...(execSubtotal !== undefined && { execSubtotal: execSubtotal || null }),
        ...(execTotal !== undefined && { execTotal: execTotal || null }),
        ...(status !== undefined && { status }),
        // 레거시 호환
        ...(capacityKw !== undefined && { capacityKw: capacityKw || null }),
        ...(moduleType !== undefined && { moduleType: moduleType || null }),
        ...(moduleCount !== undefined && { moduleCount }),
        ...(inverterType !== undefined && { inverterType: inverterType || null }),
        ...(inverterCount !== undefined && { inverterCount }),
        ...(structureType !== undefined && { structureType: structureType || null }),
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
