import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 특정 알림 읽음 처리
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, notificationIds } = body;

    // 단일 또는 다중 ID 지원
    const ids = notificationIds || (notificationId ? [notificationId] : []);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'notificationId or notificationIds is required' },
        { status: 400 }
      );
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId: session.user.id, // 본인의 알림만 업데이트
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notifications Read] Error:', error);
    return NextResponse.json(
      { error: 'Failed to mark as read' },
      { status: 500 }
    );
  }
}
