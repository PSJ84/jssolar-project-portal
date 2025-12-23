import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 프로젝트의 견적서 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // 프로젝트 확인
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId },
    });

    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
    }

    // 해당 프로젝트에 연결된 견적서 + 같은 조직의 전체 견적서 목록
    const quotations = await prisma.quotation.findMany({
      where: {
        organizationId: session.user.organizationId,
        OR: [
          { projectId },
          { projectId: null }, // 프로젝트에 연결되지 않은 견적서도 포함
        ],
      },
      select: {
        id: true,
        quotationNumber: true,
        customerName: true,
        projectName: true,
        totalAmount: true,
        vatIncluded: true,
        status: true,
        createdAt: true,
        projectId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotations);
  } catch (error) {
    console.error("Get quotations error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
