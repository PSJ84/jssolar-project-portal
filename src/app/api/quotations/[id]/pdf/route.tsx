import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  QuotationPdf,
  QuotationPdfData,
  CompanyInfo,
} from "@/components/pdf/QuotationPdf";

interface RouteParams {
  params: Promise<{ id: string }>;
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

// GET: 견적서 PDF 다운로드
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
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // PDF용 데이터 변환
    const pdfData: QuotationPdfData = {
      quotationNumber: quotation.quotationNumber,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      customerEmail: quotation.customerEmail,
      address: quotation.address,
      capacityKw: quotation.capacityKw,
      moduleType: quotation.moduleType,
      moduleCount: quotation.moduleCount,
      inverterType: quotation.inverterType,
      inverterCount: quotation.inverterCount,
      structureType: quotation.structureType,
      items: quotation.items.map((item) => ({
        category: item.category,
        name: item.name,
        spec: item.spec,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
      totalAmount: quotation.totalAmount,
      vatAmount: quotation.vatAmount,
      grandTotal: quotation.grandTotal,
      validUntil: quotation.validUntil,
      createdAt: quotation.createdAt,
    };

    // PDF 생성
    const pdfBuffer = await renderToBuffer(
      <QuotationPdf quotation={pdfData} company={companyInfo} />
    );

    // 파일명 생성 (한글 인코딩 처리)
    const filename = `견적서_${quotation.quotationNumber}_${quotation.customerName}.pdf`;
    const encodedFilename = encodeURIComponent(filename);

    // Buffer를 Uint8Array로 변환
    const pdfData2 = new Uint8Array(pdfBuffer);

    return new NextResponse(pdfData2, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("Error generating quotation PDF:", error);
    return NextResponse.json(
      { error: "PDF 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
