import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToUser, sendPushToOrgAdmins } from '@/lib/push-notification';

// Vercel Cron: 매일 오전 9시 (KST) = 0시 (UTC)
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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    // 이번주 마지막 (일요일)
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));

    const results = {
      todayDeadlineTodos: 0,
      tomorrowDeadlineTodos: 0,
      overdueTodos: 0,
      weekDeadlineTasks: 0,
      overdueTasks: 0,
    };

    // 1. 오늘 마감 할일 - 담당자에게 알림
    const todayTodos = await prisma.todo.findMany({
      where: {
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
        completedDate: null,
        assigneeId: { not: null },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    // 담당자별로 그룹화
    const todayByAssignee = todayTodos.reduce((acc, todo) => {
      if (todo.assigneeId) {
        if (!acc[todo.assigneeId]) acc[todo.assigneeId] = [];
        acc[todo.assigneeId].push(todo);
      }
      return acc;
    }, {} as Record<string, typeof todayTodos>);

    for (const [assigneeId, todos] of Object.entries(todayByAssignee)) {
      await sendPushToUser(assigneeId, {
        title: '오늘 마감 할일',
        body: `오늘 마감 할일 ${todos.length}건이 있습니다.`,
        url: '/admin/todos',
        type: 'DEADLINE',
        tag: 'deadline-today',
      });
      results.todayDeadlineTodos += todos.length;
    }

    // 2. 내일 마감 할일 - 담당자에게 알림
    const tomorrowTodos = await prisma.todo.findMany({
      where: {
        dueDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
        completedDate: null,
        assigneeId: { not: null },
      },
    });

    const tomorrowByAssignee = tomorrowTodos.reduce((acc, todo) => {
      if (todo.assigneeId) {
        if (!acc[todo.assigneeId]) acc[todo.assigneeId] = [];
        acc[todo.assigneeId].push(todo);
      }
      return acc;
    }, {} as Record<string, typeof tomorrowTodos>);

    for (const [assigneeId, todos] of Object.entries(tomorrowByAssignee)) {
      await sendPushToUser(assigneeId, {
        title: '내일 마감 할일',
        body: `내일 마감 할일 ${todos.length}건이 있습니다.`,
        url: '/admin/todos',
        type: 'DEADLINE',
        tag: 'deadline-tomorrow',
      });
      results.tomorrowDeadlineTodos += todos.length;
    }

    // 3. 기한 초과 할일 - 담당자 + 관리자에게 알림
    const overdueTodos = await prisma.todo.findMany({
      where: {
        dueDate: { lt: today },
        completedDate: null,
      },
      include: {
        assignee: { select: { id: true, organizationId: true } },
        project: { select: { organizationId: true } },
      },
    });

    // 조직별로 그룹화
    const overdueByOrg = overdueTodos.reduce((acc, todo) => {
      const orgId = todo.assignee?.organizationId || todo.project?.organizationId;
      if (orgId) {
        if (!acc[orgId]) acc[orgId] = [];
        acc[orgId].push(todo);
      }
      return acc;
    }, {} as Record<string, typeof overdueTodos>);

    for (const [orgId, todos] of Object.entries(overdueByOrg)) {
      await sendPushToOrgAdmins(orgId, {
        title: '기한 초과 할일',
        body: `⚠️ 기한 초과 할일 ${todos.length}건이 있습니다.`,
        url: '/admin/todos?filter=overdue',
        type: 'DEADLINE',
        tag: 'deadline-overdue',
      });
      results.overdueTodos += todos.length;
    }

    // 4. 이번주 마감 태스크 - 관리자에게 알림
    const weekTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: today,
          lt: weekEnd,
        },
        completedDate: null,
        parentId: null, // 대공정만
      },
      include: {
        project: { select: { organizationId: true } },
      },
    });

    const weekTasksByOrg = weekTasks.reduce((acc, task) => {
      const orgId = task.project.organizationId;
      if (!acc[orgId]) acc[orgId] = [];
      acc[orgId].push(task);
      return acc;
    }, {} as Record<string, typeof weekTasks>);

    for (const [orgId, tasks] of Object.entries(weekTasksByOrg)) {
      await sendPushToOrgAdmins(orgId, {
        title: '이번주 마감 태스크',
        body: `이번주 마감 태스크 ${tasks.length}건이 있습니다.`,
        url: '/admin/projects',
        type: 'DEADLINE',
        tag: 'deadline-week-tasks',
      });
      results.weekDeadlineTasks += tasks.length;
    }

    // 5. 기한 초과 태스크 - 관리자에게 알림
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: today },
        completedDate: null,
        parentId: null,
      },
      include: {
        project: { select: { organizationId: true } },
      },
    });

    const overdueTasksByOrg = overdueTasks.reduce((acc, task) => {
      const orgId = task.project.organizationId;
      if (!acc[orgId]) acc[orgId] = [];
      acc[orgId].push(task);
      return acc;
    }, {} as Record<string, typeof overdueTasks>);

    for (const [orgId, tasks] of Object.entries(overdueTasksByOrg)) {
      await sendPushToOrgAdmins(orgId, {
        title: '기한 초과 태스크',
        body: `⚠️ 기한 초과 태스크 ${tasks.length}건이 있습니다.`,
        url: '/admin/projects?filter=overdue',
        type: 'DEADLINE',
        tag: 'deadline-overdue-tasks',
      });
      results.overdueTasks += tasks.length;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error('[Cron Daily] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run daily notifications' },
      { status: 500 }
    );
  }
}
