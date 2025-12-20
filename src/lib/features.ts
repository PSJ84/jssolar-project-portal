import { prisma } from './prisma'
import { Feature, Plan } from '@prisma/client'

// 플랜별 기본 Feature 정의
export const PLAN_FEATURES: Record<Plan, Feature[]> = {
  BASIC: [Feature.DASHBOARD],
  PRO: [
    Feature.DASHBOARD,
    Feature.GANTT_CHART,
    Feature.TASK_DETAIL,
    Feature.AI_WEEKLY_REPORT,
    Feature.PWA_PUSH,
  ],
  ENTERPRISE: [
    Feature.DASHBOARD,
    Feature.GANTT_CHART,
    Feature.TASK_DETAIL,
    Feature.AI_WEEKLY_REPORT,
    Feature.PWA_PUSH,
    Feature.VENDOR_MANAGEMENT,
    Feature.BUDGET,
    Feature.TELEGRAM_ALERT,
  ],
}

/**
 * DB에서 해당 조직의 활성화된 Feature 목록 반환
 */
export async function getOrganizationFeatures(
  organizationId: string
): Promise<Feature[]> {
  const features = await prisma.organizationFeature.findMany({
    where: {
      organizationId,
      enabled: true,
    },
    select: {
      feature: true,
    },
  })

  return features.map((f) => f.feature)
}

/**
 * 특정 기능 사용 가능 여부 체크
 */
export async function hasFeature(
  organizationId: string,
  feature: Feature
): Promise<boolean> {
  const orgFeature = await prisma.organizationFeature.findUnique({
    where: {
      organizationId_feature: {
        organizationId,
        feature,
      },
    },
  })

  return orgFeature?.enabled ?? false
}

/**
 * 새 조직 생성 시 플랜에 맞는 기본 Feature 활성화
 */
export async function initializeOrganizationFeatures(
  organizationId: string,
  plan: Plan
): Promise<void> {
  const features = PLAN_FEATURES[plan]

  await prisma.$transaction(
    features.map((feature) =>
      prisma.organizationFeature.upsert({
        where: {
          organizationId_feature: {
            organizationId,
            feature,
          },
        },
        update: { enabled: true },
        create: {
          organizationId,
          feature,
          enabled: true,
        },
      })
    )
  )
}

/**
 * 플랜 업그레이드 시 새 Feature 활성화
 */
export async function upgradePlan(
  organizationId: string,
  newPlan: Plan
): Promise<void> {
  // 조직 플랜 업데이트
  await prisma.organization.update({
    where: { id: organizationId },
    data: { plan: newPlan },
  })

  // 새 플랜의 Feature 활성화
  const newFeatures = PLAN_FEATURES[newPlan]

  await prisma.$transaction(
    newFeatures.map((feature) =>
      prisma.organizationFeature.upsert({
        where: {
          organizationId_feature: {
            organizationId,
            feature,
          },
        },
        update: { enabled: true },
        create: {
          organizationId,
          feature,
          enabled: true,
        },
      })
    )
  )
}

/**
 * 특정 Feature 수동 활성화/비활성화
 */
export async function setFeature(
  organizationId: string,
  feature: Feature,
  enabled: boolean
): Promise<void> {
  await prisma.organizationFeature.upsert({
    where: {
      organizationId_feature: {
        organizationId,
        feature,
      },
    },
    update: { enabled },
    create: {
      organizationId,
      feature,
      enabled,
    },
  })
}
