import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// GET /api/projects/[id]/members - 프로젝트 멤버 목록 조회
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

    const { id: projectId } = await params;
    const { id: userId, role } = session.user;

    // 접근 권한 확인
    if (role !== UserRole.ADMIN) {
      const membership = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Forbidden: No access to this project" },
          { status: 403 }
        );
      }
    }

    // 멤버 목록 조회
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching project members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/members - 프로젝트 멤버 초대 (ADMIN만)
export async function POST(
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
    const { email, userId, isOwner = false } = body;

    if (!email && !userId) {
      return NextResponse.json(
        { error: "Email or userId is required" },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // userId가 직접 제공된 경우
    let existingUser = null;
    if (userId) {
      existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });
      if (!existingUser) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
    } else if (email) {
      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
      // 기존 User가 있는지 확인 (이메일로 검색)
      existingUser = await prisma.user.findFirst({
        where: { email },
        select: { id: true, name: true, email: true },
      });
    }

    // 이미 멤버인지 확인
    if (existingUser) {
      const existingMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: existingUser.id,
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this project" },
          { status: 409 }
        );
      }
    } else if (email) {
      // invitedEmail로 이미 초대되었는지 확인
      const existingInvite = await prisma.projectMember.findFirst({
        where: {
          projectId,
          invitedEmail: email,
        },
      });

      if (existingInvite) {
        return NextResponse.json(
          { error: "User is already invited to this project" },
          { status: 409 }
        );
      }
    }

    // 멤버 추가 및 Activity 로그 기록
    const member = await prisma.$transaction(async (tx) => {
      const newMember = await tx.projectMember.create({
        data: {
          projectId,
          userId: existingUser?.id,
          invitedEmail: existingUser ? null : email,
          isOwner,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
      });

      // Activity 로그 생성
      await tx.activity.create({
        data: {
          projectId,
          userId: session.user.id,
          type: "member_added",
          title: "멤버 추가",
          description: `${email}이(가) 프로젝트에 ${isOwner ? "사업주로" : "멤버로"} 추가되었습니다.`,
          metadata: {
            memberEmail: email,
            memberId: existingUser?.id,
            isOwner,
            isNewUser: !existingUser,
          },
        },
      });

      return newMember;
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Error adding project member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/members - 프로젝트 멤버 제거 (ADMIN만)
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
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId query parameter is required" },
        { status: 400 }
      );
    }

    // 멤버 존재 확인
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    if (member.projectId !== projectId) {
      return NextResponse.json(
        { error: "Member does not belong to this project" },
        { status: 400 }
      );
    }

    // 멤버 제거 및 Activity 로그 기록
    await prisma.$transaction(async (tx) => {
      await tx.projectMember.delete({
        where: { id: memberId },
      });

      const memberEmail = member.user?.email || member.invitedEmail || "Unknown";

      await tx.activity.create({
        data: {
          projectId,
          userId: session.user.id,
          type: "member_removed",
          title: "멤버 제거",
          description: `${memberEmail}이(가) 프로젝트에서 제거되었습니다.`,
          metadata: {
            memberEmail,
            memberId: member.userId,
          },
        },
      });
    });

    return NextResponse.json({
      message: "Member removed successfully",
      memberId,
    });
  } catch (error) {
    console.error("Error removing project member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
