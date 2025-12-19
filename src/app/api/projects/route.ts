import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// GET /api/projects - 프로젝트 목록 조회
// ADMIN: 전체 프로젝트
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

    let projects;

    if (role === UserRole.ADMIN) {
      // ADMIN: 모든 프로젝트 조회
      projects = await prisma.project.findMany({
        where: {
          status: {
            not: "ARCHIVED", // 기본적으로 아카이브된 프로젝트는 제외
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

// POST /api/projects - 프로젝트 생성 (ADMIN만)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
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

    // 프로젝트 생성 및 Activity 로그 기록을 트랜잭션으로 처리
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name,
          description,
          location,
          capacityKw: capacityKw ? parseFloat(capacityKw) : null,
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
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
