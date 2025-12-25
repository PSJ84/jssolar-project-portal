import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseVisibleTabs, DEFAULT_VISIBLE_TABS } from "@/lib/constants";

// GET: 사용자의 탭 설정 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SUPER_ADMIN만 접근 가능
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        visibleTabs: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const visibleTabs = parseVisibleTabs(user.visibleTabs);

    return NextResponse.json({ visibleTabs });
  } catch (error) {
    console.error("Error fetching user tabs:", error);
    return NextResponse.json(
      { error: "Failed to fetch user tabs" },
      { status: 500 }
    );
  }
}

// PATCH: 사용자의 탭 설정 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SUPER_ADMIN만 접근 가능
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { visibleTabs } = body;

    // 유효성 검사
    if (!visibleTabs || typeof visibleTabs !== "object") {
      return NextResponse.json(
        { error: "Invalid visibleTabs format" },
        { status: 400 }
      );
    }

    // 안전하게 파싱하여 저장
    const parsedTabs = parseVisibleTabs(visibleTabs);

    await prisma.user.update({
      where: { id },
      data: {
        visibleTabs: parsedTabs,
      },
    });

    return NextResponse.json({ success: true, visibleTabs: parsedTabs });
  } catch (error) {
    console.error("Error updating user tabs:", error);
    return NextResponse.json(
      { error: "Failed to update user tabs" },
      { status: 500 }
    );
  }
}
