import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// GET /api/admin/assignees - 담당자 목록 조회
// ?projectId=xxx 파라미터 필수: 조직 ADMIN/SUPER_ADMIN + 프로젝트 멤버(CLIENT 포함)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // ADMIN은 자기 조직 프로젝트만 접근 가능
    if (role === UserRole.ADMIN && project.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Forbidden: No access to this project" },
        { status: 403 }
      );
    }

    // 1. 조직 내 ADMIN/SUPER_ADMIN
    const orgAdmins = await prisma.user.findMany({
      where: {
        organizationId: project.organizationId,
        role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // 2. 프로젝트 멤버 (CLIENT 포함)
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // 중복 제거하면서 합치기
    const userMap = new Map<string, { id: string; name: string | null; email: string | null; role: string }>();

    orgAdmins.forEach((u) => {
      userMap.set(u.id, { ...u, role: u.role as string });
    });

    projectMembers.forEach((pm) => {
      if (pm.user && !userMap.has(pm.user.id)) {
        userMap.set(pm.user.id, { ...pm.user, role: pm.user.role as string });
      }
    });

    const users = Array.from(userMap.values()).sort((a, b) =>
      (a.name || a.email || "").localeCompare(b.name || b.email || "")
    );

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching assignees:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
