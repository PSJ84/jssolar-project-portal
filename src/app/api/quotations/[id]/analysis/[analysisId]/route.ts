import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; analysisId: string }>;
}

// GET: 수익분석 상세 조회
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

    const analysis = await prisma.profitAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        quotation: {
          select: {
            organizationId: true,
            quotationNumber: true,
            customerName: true,
            capacityKw: true,
            grandTotal: true,
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // 견적 ID 일치 확인
    if (analysis.quotationId !== id) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // 권한 확인
    if (
      session.user.role !== "SUPER_ADMIN" &&
      analysis.quotation.organizationId !== session.user.organizationId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 }
    );
  }
}

// DELETE: 수익분석 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, analysisId } = await params;

    const analysis = await prisma.profitAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        quotation: {
          select: { organizationId: true },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // 견적 ID 일치 확인
    if (analysis.quotationId !== id) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // 권한 확인
    if (
      session.user.role !== "SUPER_ADMIN" &&
      analysis.quotation.organizationId !== session.user.organizationId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.profitAnalysis.delete({
      where: { id: analysisId },
    });

    return NextResponse.json({ message: "Analysis deleted" });
  } catch (error) {
    console.error("Error deleting analysis:", error);
    return NextResponse.json(
      { error: "Failed to delete analysis" },
      { status: 500 }
    );
  }
}
