import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 시스템 설정 조회
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: "asc" },
    });

    // key-value 객체로 변환
    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = {
        id: config.id,
        value: config.value,
        description: config.description,
        updatedAt: config.updatedAt,
      };
      return acc;
    }, {} as Record<string, { id: string; value: string; description: string | null; updatedAt: Date }>);

    return NextResponse.json(configMap);
  } catch (error) {
    console.error("Error fetching system config:", error);
    return NextResponse.json(
      { error: "Failed to fetch system config" },
      { status: 500 }
    );
  }
}

// PATCH: 시스템 설정 수정
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // body는 { key: value, key: value, ... } 형태
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const updates = Object.entries(body).map(async ([key, value]) => {
      // 값이 숫자인 경우 문자열로 변환
      const stringValue = String(value);

      // upsert를 사용하여 없으면 생성, 있으면 업데이트
      return prisma.systemConfig.upsert({
        where: { key },
        update: { value: stringValue },
        create: {
          key,
          value: stringValue,
          description: getDefaultDescription(key),
        },
      });
    });

    await Promise.all(updates);

    // 업데이트된 설정 반환
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: "asc" },
    });

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = {
        id: config.id,
        value: config.value,
        description: config.description,
        updatedAt: config.updatedAt,
      };
      return acc;
    }, {} as Record<string, { id: string; value: string; description: string | null; updatedAt: Date }>);

    return NextResponse.json(configMap);
  } catch (error) {
    console.error("Error updating system config:", error);
    return NextResponse.json(
      { error: "Failed to update system config" },
      { status: 500 }
    );
  }
}

// 기본 설명 반환
function getDefaultDescription(key: string): string {
  const descriptions: Record<string, string> = {
    SMP_PRICE: "SMP 단가 (원/kWh)",
    REC_PRICE: "REC 단가 (원/REC)",
    REC_WEIGHT: "REC 가중치",
    PEAK_HOURS: "피크시간 (시간/일)",
    DEGRADATION_RATE: "연간 효율저하율",
    MAINTENANCE_COST: "안전관리비 (원/년)",
    MONITORING_COST: "모니터링비 (원/년)",
    QUOTATION_VALID_DAYS: "견적서 유효기간 (일)",
  };
  return descriptions[key] || key;
}
