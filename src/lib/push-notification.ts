import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

// VAPID 설정
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:psj@jssolar.kr',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string; // 같은 태그면 기존 알림 대체
  type?: NotificationType;
}

// 알림 유형별 체크 매핑
const typeToSettingMap: Record<NotificationType, keyof {
  todoNotify: boolean;
  projectNotify: boolean;
  constructionNotify: boolean;
  deadlineNotify: boolean;
  weeklySummary: boolean;
}> = {
  TODO: 'todoNotify',
  PROJECT: 'projectNotify',
  PERMIT: 'projectNotify', // 인허가도 프로젝트 알림으로 처리
  CONSTRUCTION: 'constructionNotify',
  DEADLINE: 'deadlineNotify',
  WEEKLY: 'weeklySummary',
};

// 방해금지 시간 체크
function isQuietHours(setting: { quietHoursStart: number | null; quietHoursEnd: number | null } | null): boolean {
  if (!setting?.quietHoursStart || !setting?.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const start = setting.quietHoursStart;
  const end = setting.quietHoursEnd;

  // 예: 22시 ~ 8시 (자정을 걸치는 경우)
  if (start > end) {
    return currentHour >= start || currentHour < end;
  }
  // 예: 8시 ~ 18시 (같은 날)
  return currentHour >= start && currentHour < end;
}

// 단일 사용자에게 푸시 발송
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 사용자 알림 설정 확인
    const setting = await prisma.notificationSetting.findUnique({
      where: { userId },
    });

    // 알림 비활성화 체크
    if (setting && !setting.pushEnabled) {
      return { success: false, error: 'Push notifications disabled' };
    }

    // 방해금지 시간 체크
    if (isQuietHours(setting)) {
      return { success: false, error: 'Quiet hours active' };
    }

    // 해당 유형 알림 비활성화 체크
    if (payload.type && setting) {
      const settingKey = typeToSettingMap[payload.type];
      if (settingKey && !setting[settingKey]) {
        return { success: false, error: `${payload.type} notifications disabled` };
      }
    }

    // 2. PushSubscription 조회
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return { success: false, error: 'No push subscriptions found' };
    }

    // 3. 알림 이력 저장
    await prisma.notification.create({
      data: {
        userId,
        type: payload.type || 'PROJECT',
        title: payload.title,
        body: payload.body,
        url: payload.url,
      },
    });

    // 4. web-push로 발송
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      icon: payload.icon || '/icons/icon-192x192.svg',
      tag: payload.tag || `notification-${Date.now()}`,
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload
          );
          return { success: true, subscriptionId: sub.id };
        } catch (error: unknown) {
          // 5. 실패한 구독 삭제 (410 Gone 또는 404)
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          }
          throw error;
        }
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    return { success: successCount > 0 };
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

// 다중 사용자에게 푸시 발송
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ successCount: number; failCount: number }> {
  const results = await Promise.allSettled(
    userIds.map((userId) => sendPushToUser(userId, payload))
  );

  const successCount = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;

  return {
    successCount,
    failCount: userIds.length - successCount,
  };
}

// 프로젝트 관련 사용자에게 푸시 발송
export async function sendPushToProjectMembers(
  projectId: string,
  payload: PushPayload,
  options?: {
    excludeUserId?: string;
    onlyOwners?: boolean;
    onlyAdmins?: boolean;
  }
): Promise<{ successCount: number; failCount: number }> {
  const members = await prisma.projectMember.findMany({
    where: {
      projectId,
      userId: options?.excludeUserId ? { not: options.excludeUserId } : undefined,
      ...(options?.onlyOwners ? { isOwner: true } : {}),
    },
    include: {
      user: true,
    },
  });

  let userIds = members
    .filter((m) => m.userId)
    .map((m) => m.userId as string);

  // 관리자만 필터
  if (options?.onlyAdmins) {
    const admins = members.filter(
      (m) => m.user?.role === 'ADMIN' || m.user?.role === 'SUPER_ADMIN'
    );
    userIds = admins.map((m) => m.userId as string);
  }

  return sendPushToUsers(userIds, payload);
}

// 조직 관리자에게 푸시 발송
export async function sendPushToOrgAdmins(
  organizationId: string,
  payload: PushPayload
): Promise<{ successCount: number; failCount: number }> {
  const admins = await prisma.user.findMany({
    where: {
      organizationId,
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
    },
    select: { id: true },
  });

  const userIds = admins.map((a) => a.id);
  return sendPushToUsers(userIds, payload);
}

// 할일 배정 알림
export async function notifyTodoAssigned(
  todoId: string,
  assigneeId: string,
  todoTitle: string,
  projectId?: string
): Promise<void> {
  const url = projectId
    ? `/projects/${projectId}?tab=todos`
    : '/admin/todos';

  await sendPushToUser(assigneeId, {
    title: '새 할일 배정',
    body: `새 할일: ${todoTitle}`,
    url,
    type: 'TODO',
    tag: `todo-${todoId}`,
  });
}

// 할일 완료 알림 (프로젝트 관리자에게)
export async function notifyTodoCompleted(
  todoId: string,
  projectId: string,
  todoTitle: string,
  completedByName: string
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });

  if (!project) return;

  await sendPushToOrgAdmins(project.organizationId, {
    title: '할일 완료',
    body: `${completedByName}님이 '${todoTitle}' 완료`,
    url: `/admin/projects/${projectId}?tab=todos`,
    type: 'TODO',
    tag: `todo-complete-${todoId}`,
  });
}

// 프로젝트 상태 변경 알림
export async function notifyProjectStatusChanged(
  projectId: string,
  projectName: string,
  newStatus: string
): Promise<void> {
  await sendPushToProjectMembers(
    projectId,
    {
      title: '프로젝트 상태 변경',
      body: `${projectName} → ${newStatus}`,
      url: `/projects/${projectId}`,
      type: 'PROJECT',
      tag: `project-status-${projectId}`,
    },
    { onlyOwners: true }
  );
}

// 프로젝트 초대 알림
export async function notifyProjectInvite(
  userId: string,
  projectId: string,
  projectName: string
): Promise<void> {
  await sendPushToUser(userId, {
    title: '프로젝트 초대',
    body: `${projectName}에 초대되었습니다`,
    url: `/projects/${projectId}`,
    type: 'PROJECT',
    tag: `project-invite-${projectId}`,
  });
}

// 인허가 단계 완료 알림
export async function notifyPermitCompleted(
  projectId: string,
  projectName: string,
  taskName: string
): Promise<void> {
  await sendPushToProjectMembers(
    projectId,
    {
      title: '인허가 완료',
      body: `${projectName} - ${taskName} 완료`,
      url: `/projects/${projectId}?tab=tasks`,
      type: 'PERMIT',
      tag: `permit-${projectId}-${Date.now()}`,
    },
    { onlyOwners: true }
  );
}

// 시공 공정 상태 변경 알림
export async function notifyConstructionStatusChanged(
  projectId: string,
  projectName: string,
  itemName: string,
  status: 'started' | 'completed'
): Promise<void> {
  const statusText = status === 'started' ? '시공 시작' : '시공 완료';

  await sendPushToProjectMembers(
    projectId,
    {
      title: `공정 ${statusText}`,
      body: `${projectName} - ${itemName} ${statusText}`,
      url: `/projects/${projectId}?tab=construction`,
      type: 'CONSTRUCTION',
      tag: `construction-${projectId}-${Date.now()}`,
    },
    { onlyOwners: true }
  );
}
