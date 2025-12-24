import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 프로젝트에 연결된 견적서 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("includeAll") === "true"; // 예산 불러오기용

    // 프로젝트 확인 및 권한 체크
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { select: { userId: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
    }

    // ADMIN/SUPER_ADMIN이거나 프로젝트 멤버인 경우에만 접근 가능
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    const isMember = project.members.some((m) => m.userId === session.user.id);

    if (!isAdmin && !isMember) {
      return NextResponse.json({ error: "접근 권한이 없습니다" }, { status: 403 });
    }

    // 예산 불러오기용 (includeAll=true): 조직의 전체 견적서
    // 일반 조회: 프로젝트에 연결된 견적서만
    const whereClause = includeAll && isAdmin
      ? {
          organizationId: project.organizationId,
          OR: [
            { projectId },
            { projectId: null },
          ],
        }
      : { projectId };

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      select: {
        id: true,
        quotationNumber: true,
        customerName: true,
        projectName: true,
        quotationDate: true,
        validUntil: true,
        totalAmount: true,
        vatIncluded: true,
        grandTotal: true,
        status: true,
        createdAt: true,
        projectId: true,
        // 관리자만 실행금액 표시
        ...(isAdmin && { execTotal: true }),
      },
      orderBy: { quotationDate: "desc" },
    });

    return NextResponse.json(quotations);
  } catch (error) {
    console.error("Get quotations error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
