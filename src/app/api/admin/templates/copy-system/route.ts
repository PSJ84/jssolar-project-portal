import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// POST /api/admin/templates/copy-system - 시스템 템플릿을 조직 템플릿으로 복사
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, organizationId } = session.user;

    // ADMIN 또는 SUPER_ADMIN만 접근 가능
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }

    // 이미 조직 템플릿이 있는지 확인
    const existingTemplates = await prisma.taskTemplate.count({
      where: {
        isSystem: false,
        organizationId,
      },
    });

    if (existingTemplates > 0) {
      return NextResponse.json(
        { error: "이미 조직 템플릿이 존재합니다. 기존 템플릿을 삭제하고 다시 시도하세요." },
        { status: 409 }
      );
    }

    // 시스템 템플릿 조회
    const systemTemplates = await prisma.taskTemplate.findMany({
      where: {
        isSystem: true,
        organizationId: null,
        parentId: null,
      },
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    if (systemTemplates.length === 0) {
      return NextResponse.json(
        { error: "복사할 시스템 템플릿이 없습니다." },
        { status: 404 }
      );
    }

    // 트랜잭션으로 복사
    const result = await prisma.$transaction(async (tx) => {
      let mainCount = 0;
      let childCount = 0;

      for (const mainTemplate of systemTemplates) {
        // 메인 템플릿 복사
        const newMain = await tx.taskTemplate.create({
          data: {
            name: mainTemplate.name,
            description: mainTemplate.description,
            sortOrder: mainTemplate.sortOrder,
            isSystem: false,
            organizationId,
            parentId: null,
            defaultAlertEnabled: mainTemplate.defaultAlertEnabled,
          },
        });
        mainCount++;

        // 하위 템플릿 복사
        for (const child of mainTemplate.children) {
          await tx.taskTemplate.create({
            data: {
              name: child.name,
              description: child.description,
              sortOrder: child.sortOrder,
              isSystem: false,
              organizationId,
              parentId: newMain.id,
              defaultAlertEnabled: child.defaultAlertEnabled,
            },
          });
          childCount++;
        }
      }

      return { mainCount, childCount };
    });

    return NextResponse.json(
      {
        message: "시스템 템플릿이 복사되었습니다.",
        mainCount: result.mainCount,
        childCount: result.childCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error copying system templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
