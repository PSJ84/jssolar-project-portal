import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// DELETE /api/projects/[id]/members/[memberId] - 프로젝트 멤버 제거 (ADMIN만)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
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

    const { id: projectId, memberId } = await params;

    // 멤버 존재 확인
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
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
      const memberName = member.user?.name || memberEmail;

      await tx.activity.create({
        data: {
          projectId,
          userId: session.user.id,
          type: "member_removed",
          title: "멤버 제거",
          description: `${memberName}님이 프로젝트에서 제거되었습니다.`,
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

// PATCH /api/projects/[id]/members/[memberId] - 멤버 정보 수정 (ADMIN만)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
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

    const { id: projectId, memberId } = await params;
    const body = await request.json();
    const { isOwner } = body;

    // 멤버 존재 확인
    const member = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
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

    // 멤버 정보 업데이트
    const updatedMember = await prisma.$transaction(async (tx) => {
      const updated = await tx.projectMember.update({
        where: { id: memberId },
        data: { isOwner },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (isOwner !== undefined && isOwner !== member.isOwner) {
        const memberName = member.user?.name || member.user?.email || member.invitedEmail || "Unknown";
        await tx.activity.create({
          data: {
            projectId,
            userId: session.user.id,
            type: "member_updated",
            title: isOwner ? "소유자 지정" : "소유자 해제",
            description: `${memberName}님이 ${isOwner ? "프로젝트 소유자로 지정" : "소유자에서 해제"}되었습니다.`,
            metadata: {
              memberEmail: member.user?.email || member.invitedEmail,
              memberId: member.userId,
              isOwner,
            },
          },
        });
      }

      return updated;
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating project member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
