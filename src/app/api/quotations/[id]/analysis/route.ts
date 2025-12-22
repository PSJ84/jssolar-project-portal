import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinancingType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 견적의 수익분석 목록 조회
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

    // 견적 존재 및 권한 확인
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (
      session.user.role !== "SUPER_ADMIN" &&
      quotation.organizationId !== session.user.organizationId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const analyses = await prisma.profitAnalysis.findMany({
      where: { quotationId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(analyses);
  } catch (error) {
    console.error("Error fetching analyses:", error);
    return NextResponse.json(
      { error: "Failed to fetch analyses" },
      { status: 500 }
    );
  }
}

// POST: 수익분석 생성
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // 견적 존재 및 권한 확인
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      select: {
        organizationId: true,
        capacityKw: true,
        grandTotal: true,
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (
      session.user.role !== "SUPER_ADMIN" &&
      quotation.organizationId !== session.user.organizationId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      financingType,
      peakHours,
      degradationRate,
      smpPrice,
      recPrice,
      recWeight,
      maintenanceCost,
      monitoringCost,
      selfFundingRate,
      loanAmount,
      interestRate,
      loanPeriod,
      gracePeriod,
      guaranteeFeeRate,
      factoringFeeRate,
      yearlyData,
      paybackPeriod,
      totalProfit20y,
      roi,
    } = body;

    // 필수 필드 검증
    if (!financingType) {
      return NextResponse.json(
        { error: "Financing type is required" },
        { status: 400 }
      );
    }

    const validFinancingTypes: FinancingType[] = [
      "SELF_FUNDING",
      "BANK_LOAN",
      "GOVERNMENT_LOAN",
      "FACTORING",
    ];
    if (!validFinancingTypes.includes(financingType)) {
      return NextResponse.json(
        { error: "Invalid financing type" },
        { status: 400 }
      );
    }

    // 수익분석 생성
    const analysis = await prisma.profitAnalysis.create({
      data: {
        quotationId: id,
        financingType,
        totalInvestment: quotation.grandTotal,
        peakHours: peakHours || 3.7,
        degradationRate: degradationRate || 0.008,
        smpPrice: smpPrice || 120,
        recPrice: recPrice || 40000,
        recWeight: recWeight || 1.0,
        maintenanceCost: maintenanceCost || 500000,
        monitoringCost: monitoringCost || 300000,
        selfFundingRate: selfFundingRate || 1,
        loanAmount: loanAmount || 0,
        interestRate: interestRate || 0,
        loanPeriod: loanPeriod || 0,
        gracePeriod: gracePeriod || 0,
        guaranteeFeeRate: guaranteeFeeRate || null,
        factoringFeeRate: factoringFeeRate || null,
        yearlyData: yearlyData || [],
        paybackPeriod: paybackPeriod || 0,
        totalProfit20y: totalProfit20y || 0,
        roi: roi || 0,
      },
    });

    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    console.error("Error creating analysis:", error);
    return NextResponse.json(
      { error: "Failed to create analysis" },
      { status: 500 }
    );
  }
}
