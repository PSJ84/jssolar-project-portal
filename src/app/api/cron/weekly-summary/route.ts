import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToUser, sendPushToOrgAdmins } from '@/lib/push-notification';

// Vercel Cron: 매주 월요일 오전 9시 (KST) = 일요일 자정 (UTC)
// vercel.json에 설정 필요

export async function GET(request: NextRequest) {
  try {
    // Cron 비밀키 검증
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 지난주 시작 (지난 월요일)
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7 - ((lastWeekStart.getDay() + 6) % 7));

    // 지난주 끝 (지난 일요일)
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 7);

    // 이번주 끝 (이번 일요일)
    const thisWeekEnd = new Date(today);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + (7 - thisWeekEnd.getDay()));

    const results = {
      adminSummaries: 0,
      ownerSummaries: 0,
    };

    // 1. 관리자에게 주간 요약 발송
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    });

    for (const org of organizations) {
      // 지난주 완료된 할일/태스크 수
      const lastWeekCompletedTodos = await prisma.todo.count({
        where: {
          OR: [
            { project: { organizationId: org.id } },
            { organizationId: org.id },
          ],
          completedDate: {
            gte: lastWeekStart,
            lt: lastWeekEnd,
          },
        },
      });

      const lastWeekCompletedTasks = await prisma.task.count({
        where: {
          project: { organizationId: org.id },
          completedDate: {
            gte: lastWeekStart,
            lt: lastWeekEnd,
          },
        },
      });

      const lastWeekCompleted = lastWeekCompletedTodos + lastWeekCompletedTasks;

      // 이번주 마감 예정 할일/태스크 수
      const thisWeekDueTodos = await prisma.todo.count({
        where: {
          OR: [
            { project: { organizationId: org.id } },
            { organizationId: org.id },
          ],
          dueDate: {
            gte: today,
            lt: thisWeekEnd,
          },
          completedDate: null,
        },
      });

      const thisWeekDueTasks = await prisma.task.count({
        where: {
          project: { organizationId: org.id },
          dueDate: {
            gte: today,
            lt: thisWeekEnd,
          },
          completedDate: null,
        },
      });

      const thisWeekDue = thisWeekDueTodos + thisWeekDueTasks;

      if (lastWeekCompleted > 0 || thisWeekDue > 0) {
        await sendPushToOrgAdmins(org.id, {
          title: '주간 요약',
          body: `지난주 완료 ${lastWeekCompleted}건, 이번주 예정 ${thisWeekDue}건`,
          url: '/admin',
          type: 'WEEKLY',
          tag: 'weekly-summary-admin',
        });
        results.adminSummaries++;
      }
    }

    // 2. 사업주에게 프로젝트 진행률 발송
    const projectOwners = await prisma.projectMember.findMany({
      where: {
        isOwner: true,
        userId: { not: null },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            progressPercent: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            notificationSetting: {
              select: { weeklySummary: true },
            },
          },
        },
      },
    });

    // 사용자별로 프로젝트 그룹화
    const projectsByOwner = projectOwners.reduce((acc, member) => {
      if (member.userId && member.project.status === 'ACTIVE') {
        if (!acc[member.userId]) acc[member.userId] = [];
        acc[member.userId].push(member.project);
      }
      return acc;
    }, {} as Record<string, typeof projectOwners[0]['project'][]>);

    for (const [userId, projects] of Object.entries(projectsByOwner)) {
      // 가장 진행 중인 프로젝트 하나 선택
      const mainProject = projects.sort((a, b) => b.progressPercent - a.progressPercent)[0];

      let body = `${mainProject.name} 진행률 ${mainProject.progressPercent}%`;
      if (projects.length > 1) {
        body += ` 외 ${projects.length - 1}건`;
      }

      await sendPushToUser(userId, {
        title: '주간 프로젝트 현황',
        body,
        url: `/projects/${mainProject.id}`,
        type: 'WEEKLY',
        tag: 'weekly-summary-owner',
      });
      results.ownerSummaries++;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error('[Cron Weekly] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run weekly summary' },
      { status: 500 }
    );
  }
}
