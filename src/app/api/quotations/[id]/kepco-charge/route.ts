import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/quotations/[id]/kepco-charge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quotationId } = await params;

    // 견적서 권한 확인
    const quotation = await prisma.quotation.findFirst({
      where: {
        id: quotationId,
        organizationId: session.user.organizationId!,
      },
      select: { id: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: "견적서를 찾을 수 없습니다." }, { status: 404 });
    }

    // 한전불입금 조회
    const kepcoCharge = await prisma.kepcoCharge.findUnique({
      where: { quotationId },
    });

    return NextResponse.json(kepcoCharge);
  } catch (error) {
    console.error("Error fetching kepco charge:", error);
    return NextResponse.json(
      { error: "한전불입금 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/quotations/[id]/kepco-charge
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: quotationId } = await params;

    // 견적서 권한 확인
    const quotation = await prisma.quotation.findFirst({
      where: {
        id: quotationId,
        organizationId: session.user.organizationId!,
      },
      select: { id: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: "견적서를 찾을 수 없습니다." }, { status: 404 });
    }

    const body = await request.json();
    const {
      capacityKw,
      voltageType,
      supplyType,
      basicCharge,
      distanceCharge,
      totalCharge,
      paymentType,
      downPayment,
      totalInterest,
      totalWithInterest,
      applyToProfit,
    } = body;

    // 필수값 검증
    if (!capacityKw || capacityKw <= 0) {
      return NextResponse.json(
        { error: "계약전력을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!voltageType || !supplyType) {
      return NextResponse.json(
        { error: "전압구분과 공급방식을 선택해주세요." },
        { status: 400 }
      );
    }

    // 기존 데이터가 있으면 업데이트, 없으면 생성
    const kepcoCharge = await prisma.kepcoCharge.upsert({
      where: { quotationId },
      create: {
        quotationId,
        capacityKw,
        voltageType,
        supplyType,
        basicCharge,
        distanceCharge: distanceCharge || 0,
        totalCharge,
        paymentType: paymentType || "LUMP_SUM",
        downPayment: downPayment || null,
        totalInterest: totalInterest || null,
        totalWithInterest: totalWithInterest || null,
        applyToProfit: applyToProfit ?? true,
      },
      update: {
        capacityKw,
        voltageType,
        supplyType,
        basicCharge,
        distanceCharge: distanceCharge || 0,
        totalCharge,
        paymentType: paymentType || "LUMP_SUM",
        downPayment: downPayment || null,
        totalInterest: totalInterest || null,
        totalWithInterest: totalWithInterest || null,
        applyToProfit: applyToProfit ?? true,
      },
    });

    return NextResponse.json(kepcoCharge);
  } catch (error) {
    console.error("Error saving kepco charge:", error);
    return NextResponse.json(
      { error: "한전불입금 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/quotations/[id]/kepco-charge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: quotationId } = await params;

    // 견적서 권한 확인
    const quotation = await prisma.quotation.findFirst({
      where: {
        id: quotationId,
        organizationId: session.user.organizationId!,
      },
      select: { id: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: "견적서를 찾을 수 없습니다." }, { status: 404 });
    }

    // 한전불입금 삭제
    await prisma.kepcoCharge.delete({
      where: { quotationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting kepco charge:", error);
    return NextResponse.json(
      { error: "한전불입금 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
