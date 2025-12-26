import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // 기존 구독 확인 (endpoint 기준)
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      // 같은 사용자면 업데이트
      if (existing.userId === session.user.id) {
        await prisma.pushSubscription.update({
          where: { endpoint },
          data: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        });
      } else {
        // 다른 사용자면 삭제 후 새로 생성
        await prisma.pushSubscription.delete({
          where: { endpoint },
        });
        await prisma.pushSubscription.create({
          data: {
            userId: session.user.id,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        });
      }
    } else {
      // 새로 생성
      await prisma.pushSubscription.create({
        data: {
          userId: session.user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });
    }

    // 알림 설정이 없으면 기본값으로 생성
    await prisma.notificationSetting.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Push Subscribe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
