import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 알림 설정 조회
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 설정이 없으면 기본값 반환
    let setting = await prisma.notificationSetting.findUnique({
      where: { userId: session.user.id },
    });

    if (!setting) {
      setting = await prisma.notificationSetting.create({
        data: { userId: session.user.id },
      });
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error('[Notification Settings GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// 알림 설정 변경
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      pushEnabled,
      todoNotify,
      projectNotify,
      constructionNotify,
      deadlineNotify,
      weeklySummary,
      quietHoursStart,
      quietHoursEnd,
    } = body;

    const setting = await prisma.notificationSetting.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        pushEnabled: pushEnabled ?? true,
        todoNotify: todoNotify ?? true,
        projectNotify: projectNotify ?? true,
        constructionNotify: constructionNotify ?? true,
        deadlineNotify: deadlineNotify ?? true,
        weeklySummary: weeklySummary ?? true,
        quietHoursStart: quietHoursStart ?? null,
        quietHoursEnd: quietHoursEnd ?? null,
      },
      update: {
        ...(pushEnabled !== undefined && { pushEnabled }),
        ...(todoNotify !== undefined && { todoNotify }),
        ...(projectNotify !== undefined && { projectNotify }),
        ...(constructionNotify !== undefined && { constructionNotify }),
        ...(deadlineNotify !== undefined && { deadlineNotify }),
        ...(weeklySummary !== undefined && { weeklySummary }),
        ...(quietHoursStart !== undefined && { quietHoursStart }),
        ...(quietHoursEnd !== undefined && { quietHoursEnd }),
      },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error('[Notification Settings PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
