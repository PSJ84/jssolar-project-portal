import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: 견적서를 예산으로 불러오기
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { quotationId } = await request.json();

    if (!quotationId) {
      return NextResponse.json({ error: "견적서 ID가 필요합니다" }, { status: 400 });
    }

    // 프로젝트 확인
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId },
    });
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
    }

    // 견적서 조회
    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, organizationId: session.user.organizationId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!quotation) {
      return NextResponse.json({ error: "견적서를 찾을 수 없습니다" }, { status: 404 });
    }

    // 트랜잭션으로 기존 예산 삭제 후 새로 생성
    await prisma.$transaction(async (tx) => {
      // 기존 예산 항목 삭제 (관련 거래 내역도 cascade로 삭제됨)
      await tx.budgetItem.deleteMany({
        where: { projectId },
      });

      // 부가세 포함 여부에 따른 변환
      // vatIncluded가 true이면 이미 VAT 포함된 금액, false이면 VAT 별도(공급가액)
      const vatMultiplier = quotation.vatIncluded ? 1 : 1.1;

      // 매출 항목 생성 (도급계약)
      await tx.budgetItem.create({
        data: {
          projectId,
          type: "INCOME",
          category: "도급계약",
          plannedAmount: Math.round(quotation.totalAmount * vatMultiplier),
          vatIncluded: true, // 최종 금액은 VAT 포함
          memo: `${quotation.quotationNumber} 견적서에서 불러옴`,
          sortOrder: 0,
        },
      });

      // 지출 항목 생성 (견적서 품목들)
      for (let i = 0; i < quotation.items.length; i++) {
        const item = quotation.items[i];
        // 금액이 0인 항목은 건너뜀
        if (item.amount === 0) continue;

        await tx.budgetItem.create({
          data: {
            projectId,
            type: "EXPENSE",
            category: item.name,
            plannedAmount: Math.round(item.amount * vatMultiplier),
            vatIncluded: true, // 최종 금액은 VAT 포함
            memo: item.note || null,
            sortOrder: i,
          },
        });
      }

      // 견적서와 프로젝트 연결 (아직 연결되지 않은 경우)
      if (!quotation.projectId) {
        await tx.quotation.update({
          where: { id: quotationId },
          data: { projectId },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Import quotation error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
