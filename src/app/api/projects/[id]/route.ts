import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// Helper function to check project access
async function checkProjectAccess(projectId: string, userId: string, role: UserRole) {
  if (role === UserRole.ADMIN) {
    return true;
  }

  // CLIENT: 본인이 멤버인지 확인
  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
  });

  return !!membership;
}

// GET /api/projects/[id] - 프로젝트 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: userId, role } = session.user;
    const { id: projectId } = await params;

    // 접근 권한 확인
    const hasAccess = await checkProjectAccess(projectId, userId, role);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: No access to this project" },
        { status: 403 }
      );
    }

    // 프로젝트 상세 조회
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        activities: {
          take: 10, // 최근 10개 활동
          orderBy: {
            createdAt: "desc",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - 프로젝트 수정 (ADMIN만)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: projectId } = await params;
    const body = await request.json();
    const {
      name,
      description,
      location,
      capacityKw,
      currentPhase,
      progressPercent,
      status,
    } = body;

    // 기존 프로젝트 확인
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // 변경 사항 추적
    const changes: string[] = [];
    const metadata: Record<string, any> = {};

    if (name && name !== existingProject.name) {
      changes.push(`프로젝트명: "${existingProject.name}" → "${name}"`);
      metadata.oldName = existingProject.name;
      metadata.newName = name;
    }
    if (currentPhase && currentPhase !== existingProject.currentPhase) {
      changes.push(`단계: ${existingProject.currentPhase} → ${currentPhase}`);
      metadata.oldPhase = existingProject.currentPhase;
      metadata.newPhase = currentPhase;
    }
    if (progressPercent !== undefined && progressPercent !== existingProject.progressPercent) {
      changes.push(`진행률: ${existingProject.progressPercent}% → ${progressPercent}%`);
      metadata.oldProgress = existingProject.progressPercent;
      metadata.newProgress = progressPercent;
    }
    if (status && status !== existingProject.status) {
      changes.push(`상태: ${existingProject.status} → ${status}`);
      metadata.oldStatus = existingProject.status;
      metadata.newStatus = status;
    }

    // 프로젝트 업데이트 및 Activity 로그 기록
    const project = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(location !== undefined && { location }),
          ...(capacityKw !== undefined && { capacityKw: capacityKw ? parseFloat(capacityKw) : null }),
          ...(currentPhase && { currentPhase }),
          ...(progressPercent !== undefined && { progressPercent }),
          ...(status && { status }),
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

      // 변경 사항이 있으면 Activity 로그 생성
      if (changes.length > 0) {
        await tx.activity.create({
          data: {
            projectId,
            userId: session.user.id,
            type: "project_updated",
            title: "프로젝트 정보 변경",
            description: changes.join("\n"),
            metadata,
          },
        });
      }

      return updatedProject;
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - 프로젝트 삭제 (ADMIN만)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hard") === "true";

    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (hardDelete) {
      // 하드 삭제: 실제로 데이터베이스에서 삭제
      await prisma.project.delete({
        where: { id: projectId },
      });

      return NextResponse.json({
        message: "Project permanently deleted",
        projectId,
      });
    } else {
      // 소프트 삭제: ARCHIVED 상태로 변경
      const project = await prisma.$transaction(async (tx) => {
        const archivedProject = await tx.project.update({
          where: { id: projectId },
          data: { status: "ARCHIVED" },
        });

        await tx.activity.create({
          data: {
            projectId,
            userId: session.user.id,
            type: "project_archived",
            title: "프로젝트 아카이브",
            description: `"${existingProject.name}" 프로젝트가 아카이브되었습니다.`,
          },
        });

        return archivedProject;
      });

      return NextResponse.json({
        message: "Project archived",
        project,
      });
    }
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
