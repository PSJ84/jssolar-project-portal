import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createDefaultTasks } from "@/lib/project-tasks";
import { copyTemplateToProject } from "@/lib/services/template-copy";

// GET /api/projects - 프로젝트 목록 조회
// SUPER_ADMIN: 전체 프로젝트
// ADMIN: 같은 조직의 프로젝트
// CLIENT: 본인이 멤버로 등록된 프로젝트만
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { role, id: userId } = session.user;

    // 사용자의 organizationId 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    let projects;

    if (role === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN: 모든 프로젝트 조회
      projects = await prisma.project.findMany({
        where: {
          status: {
            not: "ARCHIVED",
          },
        },
        include: {
          organization: {
            select: { name: true, slug: true },
          },
          _count: {
            select: {
              members: true,
              documents: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else if (role === UserRole.ADMIN) {
      // ADMIN: 같은 조직의 프로젝트만 조회
      projects = await prisma.project.findMany({
        where: {
          status: {
            not: "ARCHIVED",
          },
          organizationId: user?.organizationId ?? undefined,
        },
        include: {
          _count: {
            select: {
              members: true,
              documents: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else {
      // CLIENT: 본인이 멤버인 프로젝트만 조회
      projects = await prisma.project.findMany({
        where: {
          status: {
            not: "ARCHIVED",
          },
          members: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          _count: {
            select: {
              members: true,
              documents: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects - 프로젝트 생성 (ADMIN, SUPER_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isAdmin = session.user.role === UserRole.ADMIN || session.user.role === UserRole.SUPER_ADMIN;
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    // 사용자의 organizationId 조회
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "User is not associated with an organization" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, location, capacityKw } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // 프로젝트 생성, 기본 태스크 생성 및 Activity 로그 기록을 트랜잭션으로 처리
    // 태스크 템플릿 복사가 많아 타임아웃 연장 (기본 5초 → 30초)
    const project = await prisma.$transaction(
      async (tx) => {
        const newProject = await tx.project.create({
          data: {
            name,
            description,
            location,
            capacityKw: capacityKw ? parseFloat(capacityKw) : null,
            organizationId: user.organizationId!,
          },
          include: {
            _count: {
              select: {
                members: true,
                documents: true,
              },
            },
          },
        });

        // 레거시 기본 태스크 생성 (ProjectTask)
        await createDefaultTasks(tx, newProject.id);

        // Phase 2 태스크 생성 (Task) - 템플릿에서 복사
        await copyTemplateToProject(tx, newProject.id, user.organizationId!);

        // Activity 로그 생성
        await tx.activity.create({
          data: {
            projectId: newProject.id,
            userId: session.user.id,
            type: "project_created",
            title: "프로젝트 생성",
            description: `"${name}" 프로젝트가 생성되었습니다.`,
            metadata: {
              projectName: name,
              location,
              capacityKw,
            },
          },
        });

        return newProject;
      },
      {
        maxWait: 10000, // 최대 대기 시간 10초
        timeout: 30000, // 트랜잭션 타임아웃 30초
      }
    );

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
