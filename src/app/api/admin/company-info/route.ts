import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COMPANY_CONFIG_KEYS = [
  "COMPANY_NAME",
  "COMPANY_CEO",
  "COMPANY_BUSINESS_NUMBER",
  "COMPANY_ADDRESS",
  "COMPANY_PHONE",
  "COMPANY_EMAIL",
] as const;

// GET: 공급자 정보 조회
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [...COMPANY_CONFIG_KEYS],
        },
      },
    });

    const result = Object.fromEntries(
      configs.map((c) => [c.key, c.value])
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching company info:", error);
    return NextResponse.json(
      { error: "Failed to fetch company info" },
      { status: 500 }
    );
  }
}

// POST: 공급자 정보 저장
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, ceo, businessNumber, address, phone, email } = body;

    const updates = [
      { key: "COMPANY_NAME", value: name || "" },
      { key: "COMPANY_CEO", value: ceo || "" },
      { key: "COMPANY_BUSINESS_NUMBER", value: businessNumber || "" },
      { key: "COMPANY_ADDRESS", value: address || "" },
      { key: "COMPANY_PHONE", value: phone || "" },
      { key: "COMPANY_EMAIL", value: email || "" },
    ];

    // upsert each config
    for (const update of updates) {
      await prisma.systemConfig.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving company info:", error);
    return NextResponse.json(
      { error: "Failed to save company info" },
      { status: 500 }
    );
  }
}
