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

// GET: 견적서 PDF 다운로드
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        organization: true,
        project: {
          include: {
            members: { select: { userId: true } },
          },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // 권한 확인: 관리자이거나 프로젝트 멤버인 경우
    const isMember = quotation.project?.members.some(
      (m) => m.userId === session.user.id
    );

    if (!isAdmin && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 공급자 정보 가져오기 (SystemConfig에서)
    const companyConfigs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            "COMPANY_NAME",
            "COMPANY_CEO",
            "COMPANY_ADDRESS",
            "COMPANY_PHONE",
            "COMPANY_EMAIL",
            "COMPANY_BUSINESS_NUMBER",
          ],
        },
      },
    });

    const configMap = Object.fromEntries(
      companyConfigs.map((c) => [c.key, c.value])
    );

    const companyInfo: CompanyInfo = {
      name: configMap.COMPANY_NAME || quotation.organization?.name || "JS Solar",
      ceo: configMap.COMPANY_CEO || "대표이사",
      address: configMap.COMPANY_ADDRESS || "경상북도 영덕군",
      phone: configMap.COMPANY_PHONE || "054-XXX-XXXX",
      email: configMap.COMPANY_EMAIL || "info@jssolar.kr",
      businessNumber: configMap.COMPANY_BUSINESS_NUMBER || "XXX-XX-XXXXX",
    };

    // PDF용 데이터 변환
    const pdfData: QuotationPdfData = {
      quotationNumber: quotation.quotationNumber,
      customerName: quotation.customerName,
      customerAddress: quotation.customerAddress,
      customerPhone: quotation.customerPhone,
      customerEmail: quotation.customerEmail,
      address: quotation.address,
      projectName: quotation.projectName,
      items: quotation.items.map((item) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        note: item.note,
      })),
      subtotal: quotation.subtotal,
      roundingAmount: quotation.roundingAmount,
      totalAmount: quotation.totalAmount,
      vatAmount: quotation.vatAmount,
      grandTotal: quotation.grandTotal,
      vatIncluded: quotation.vatIncluded,
      specialNotes: quotation.specialNotes,
      validUntil: quotation.validUntil,
      quotationDate: quotation.quotationDate,
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
