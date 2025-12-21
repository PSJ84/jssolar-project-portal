import { PrismaClient } from "@prisma/client";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * 템플릿 → Task 복사 서비스
 * 프로젝트 생성 시 시스템 기본 템플릿(또는 조직 기본 템플릿)을 Task로 복사
 *
 * 최적화: createMany를 사용하여 DB 호출 횟수 최소화
 */
export async function copyTemplateToProject(
  tx: TransactionClient,
  projectId: string,
  organizationId: string
): Promise<{ mainCount: number; childCount: number }> {
  // 1. 조직의 defaultTemplateId 확인
  const organization = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { defaultTemplateId: true },
  });

  let mainTemplates;

  if (organization?.defaultTemplateId) {
    // 조직 기본 템플릿이 있는 경우 → 해당 조직의 템플릿 사용
    mainTemplates = await tx.taskTemplate.findMany({
      where: {
        organizationId: organizationId,
        parentId: null,
      },
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  // 조직 템플릿이 없거나 비어있으면 시스템 기본 템플릿 사용
  if (!mainTemplates || mainTemplates.length === 0) {
    mainTemplates = await tx.taskTemplate.findMany({
      where: {
        isSystem: true,
        organizationId: null,
        parentId: null,
      },
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  if (mainTemplates.length === 0) {
    return { mainCount: 0, childCount: 0 };
  }

  // 2. 메인 태스크 일괄 생성 (createMany)
  const mainTasksData = mainTemplates.map((template) => ({
    projectId,
    name: template.name,
    description: template.description,
    sortOrder: template.sortOrder,
    originTemplateTaskId: template.id,
    alertEnabled: template.defaultAlertEnabled,
    isActive: true,
    parentId: null,
    isPermitTask: template.isPermitTask,
    processingDays: template.processingDays,
  }));

  await tx.task.createMany({
    data: mainTasksData,
  });

  // 3. 생성된 메인 태스크 조회 (originTemplateTaskId로 매핑)
  const createdMainTasks = await tx.task.findMany({
    where: {
      projectId,
      parentId: null,
    },
    select: {
      id: true,
      originTemplateTaskId: true,
    },
  });

  // originTemplateTaskId → taskId 매핑
  const templateToTaskMap = new Map<string, string>();
  for (const task of createdMainTasks) {
    if (task.originTemplateTaskId) {
      templateToTaskMap.set(task.originTemplateTaskId, task.id);
    }
  }

  // 4. 하위 태스크 데이터 준비 및 일괄 생성
  const childTasksData: {
    projectId: string;
    name: string;
    description: string | null;
    sortOrder: number;
    originTemplateTaskId: string;
    alertEnabled: boolean;
    isActive: boolean;
    parentId: string;
  }[] = [];

  for (const mainTemplate of mainTemplates) {
    const parentTaskId = templateToTaskMap.get(mainTemplate.id);
    if (!parentTaskId) continue;

    for (const childTemplate of mainTemplate.children) {
      childTasksData.push({
        projectId,
        name: childTemplate.name,
        description: childTemplate.description,
        sortOrder: childTemplate.sortOrder,
        originTemplateTaskId: childTemplate.id,
        alertEnabled: childTemplate.defaultAlertEnabled,
        isActive: true,
        parentId: parentTaskId,
      });
    }
  }

  if (childTasksData.length > 0) {
    await tx.task.createMany({
      data: childTasksData,
    });
  }

  return {
    mainCount: mainTasksData.length,
    childCount: childTasksData.length,
  };
}
