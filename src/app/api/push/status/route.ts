import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 구독 수 확인
    const subscriptionCount = await prisma.pushSubscription.count({
      where: { userId: session.user.id },
    });

    // 알림 설정 확인
    const setting = await prisma.notificationSetting.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      isSubscribed: subscriptionCount > 0,
      subscriptionCount,
      pushEnabled: setting?.pushEnabled ?? true,
    });
  } catch (error) {
    console.error('[Push Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
