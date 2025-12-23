import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ProfitAnalysisPdf,
  ProfitAnalysisPdfData,
  QuotationBasicInfo,
  CompanyInfo,
  YearlyDataItem,
} from "@/components/pdf/ProfitAnalysisPdf";

interface RouteParams {
  params: Promise<{ id: string; analysisId: string }>;
}

// 회사 정보 (나중에 DB 또는 환경변수로 관리)
const companyInfo: CompanyInfo = {
  name: "JS Solar",
  ceo: "대표이사",
  address: "경상북도 영덕군",
  phone: "054-XXX-XXXX",
  email: "info@jssolar.kr",
  businessNumber: "XXX-XX-XXXXX",
};

// GET: 수익분석 PDF 다운로드
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, analysisId } = await params;

    // 견적 정보 조회
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      select: {
        quotationNumber: true,
        customerName: true,
        capacityKw: true,
        grandTotal: true,
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // 수익분석 조회
    const analysis = await prisma.profitAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // 견적과 분석이 연결되어 있는지 확인
    if (analysis.quotationId !== id) {
      return NextResponse.json(
        { error: "Analysis does not belong to this quotation" },
        { status: 400 }
      );
    }

    // PDF용 데이터 변환
    const quotationInfo: QuotationBasicInfo = {
      quotationNumber: quotation.quotationNumber,
      customerName: quotation.customerName,
      capacityKw: quotation.capacityKw || 0,  // Legacy field - may be null in new quotations
      grandTotal: quotation.grandTotal,
    };

    const analysisData: ProfitAnalysisPdfData = {
      id: analysis.id,
      financingType: analysis.financingType,
      totalInvestment: analysis.totalInvestment,
      selfFundingRate: analysis.selfFundingRate,
      loanAmount: analysis.loanAmount,
      interestRate: analysis.interestRate,
      loanPeriod: analysis.loanPeriod,
      gracePeriod: analysis.gracePeriod,
      guaranteeFeeRate: analysis.guaranteeFeeRate,
      factoringFeeRate: analysis.factoringFeeRate,
      peakHours: analysis.peakHours,
      degradationRate: analysis.degradationRate,
      smpPrice: analysis.smpPrice,
      recPrice: analysis.recPrice,
      recWeight: analysis.recWeight,
      maintenanceCost: analysis.maintenanceCost,
      monitoringCost: analysis.monitoringCost,
      yearlyData: analysis.yearlyData as unknown as YearlyDataItem[],
      paybackPeriod: analysis.paybackPeriod,
      totalProfit20y: analysis.totalProfit20y,
      roi: analysis.roi,
      createdAt: analysis.createdAt,
    };

    // PDF 생성
    const pdfBuffer = await renderToBuffer(
      <ProfitAnalysisPdf
        quotation={quotationInfo}
        analysis={analysisData}
        company={companyInfo}
      />
    );

    // 금융유형 라벨
    const financingTypeLabels: Record<string, string> = {
      SELF_FUNDING: "자부담",
      BANK_LOAN: "은행대출",
      GOVERNMENT_LOAN: "금융지원",
      FACTORING: "팩토링",
    };

    // 파일명 생성 (한글 인코딩 처리)
    const financingLabel =
      financingTypeLabels[analysis.financingType] || analysis.financingType;
    const filename = `수익분석_${quotation.quotationNumber}_${quotation.customerName}_${financingLabel}.pdf`;
    const encodedFilename = encodeURIComponent(filename);

    // Buffer를 Uint8Array로 변환
    const pdfData = new Uint8Array(pdfBuffer);

    return new NextResponse(pdfData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("Error generating profit analysis PDF:", error);
    return NextResponse.json(
      { error: "PDF 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
