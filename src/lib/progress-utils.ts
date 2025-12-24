/**
 * 가중치 기반 진행률 계산 유틸리티
 *
 * v2: 시공(CONSTRUCTION) 60%, 나머지(PERMIT, OTHER) 40%
 * v3: 인허가(PERMIT) 20%, 시공(공정표) 60%, 준공(COMPLETION) 20%
 */

interface TaskForProgress {
  phase: "PERMIT" | "CONSTRUCTION" | "COMPLETION" | "OTHER";
  completedDate: Date | null;
}

interface ConstructionItemForProgress {
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
  progress: number;
}

export interface DashboardProgress {
  permit: { total: number; completed: number; percent: number };
  construction: { total: number; completed: number; percent: number };
  completion: { total: number; completed: number; percent: number };
  totalProgress: number;
  currentPhase: "PERMIT" | "CONSTRUCTION" | "COMPLETION";
  isDelayed: boolean;
}

/**
 * 가중치 기반 진행률 계산
 * - 시공 태스크: 전체 진행률의 60%
 * - 나머지 태스크 (인허가/기타): 전체 진행률의 40%
 * - 시공 태스크가 없으면 전체 100% 균등 계산
 *
 * @param tasks 태스크 목록 (phase, completedDate 필요)
 * @returns 진행률 (0-100)
 */
export function calculateWeightedProgress(tasks: TaskForProgress[]): number {
  if (tasks.length === 0) return 0;

  const constructionTasks = tasks.filter((t) => t.phase === "CONSTRUCTION");
  const otherTasks = tasks.filter((t) => t.phase !== "CONSTRUCTION");

  // 시공 60%, 나머지 40%
  const CONSTRUCTION_WEIGHT = 60;
  const OTHER_WEIGHT = 40;

  let progress = 0;

  // 시공 태스크가 없으면 전체 100% 균등
  if (constructionTasks.length === 0) {
    const completed = tasks.filter((t) => t.completedDate).length;
    progress = (completed / tasks.length) * 100;
    return Math.round(progress);
  }

  // 시공 진행률
  if (constructionTasks.length > 0) {
    const completed = constructionTasks.filter((t) => t.completedDate).length;
    progress += (completed / constructionTasks.length) * CONSTRUCTION_WEIGHT;
  }

  // 나머지 진행률 (균등 분배)
  if (otherTasks.length > 0) {
    const completed = otherTasks.filter((t) => t.completedDate).length;
    progress += (completed / otherTasks.length) * OTHER_WEIGHT;
  }

  return Math.round(progress);
}

/**
 * 진행률 세부 정보 계산
 * @param tasks 태스크 목록
 * @returns 진행률 세부 정보
 */
export function getProgressDetails(tasks: TaskForProgress[]): {
  total: number;
  construction: { total: number; completed: number; percent: number };
  other: { total: number; completed: number; percent: number };
  weightedProgress: number;
} {
  const constructionTasks = tasks.filter((t) => t.phase === "CONSTRUCTION");
  const otherTasks = tasks.filter((t) => t.phase !== "CONSTRUCTION");

  const constructionCompleted = constructionTasks.filter(
    (t) => t.completedDate
  ).length;
  const otherCompleted = otherTasks.filter((t) => t.completedDate).length;

  return {
    total: tasks.length,
    construction: {
      total: constructionTasks.length,
      completed: constructionCompleted,
      percent:
        constructionTasks.length > 0
          ? Math.round((constructionCompleted / constructionTasks.length) * 100)
          : 0,
    },
    other: {
      total: otherTasks.length,
      completed: otherCompleted,
      percent:
        otherTasks.length > 0
          ? Math.round((otherCompleted / otherTasks.length) * 100)
          : 0,
    },
    weightedProgress: calculateWeightedProgress(tasks),
  };
}

/**
 * 대시보드용 3단계 진행률 계산
 * - 인허가(PERMIT): 20%
 * - 시공(공정표 기반): 60%
 * - 준공(COMPLETION): 20%
 *
 * @param tasks 진행단계 태스크 목록
 * @param constructionItems 공정표 항목 목록
 * @returns 대시보드 진행률 정보
 */
export function calculateDashboardProgress(
  tasks: TaskForProgress[],
  constructionItems: ConstructionItemForProgress[]
): DashboardProgress {
  // 인허가 태스크
  const permitTasks = tasks.filter(
    (t) => t.phase === "PERMIT" || t.phase === "OTHER"
  );
  const permitCompleted = permitTasks.filter((t) => t.completedDate).length;
  const permitPercent =
    permitTasks.length > 0
      ? Math.round((permitCompleted / permitTasks.length) * 100)
      : 0;

  // 시공 진행률 (공정표 기반)
  const constructionCompleted = constructionItems.filter(
    (item) => item.status === "COMPLETED"
  ).length;
  const constructionPercent =
    constructionItems.length > 0
      ? Math.round((constructionCompleted / constructionItems.length) * 100)
      : 0;

  // 준공 태스크
  const completionTasks = tasks.filter((t) => t.phase === "COMPLETION");
  const completionCompleted = completionTasks.filter(
    (t) => t.completedDate
  ).length;
  const completionPercent =
    completionTasks.length > 0
      ? Math.round((completionCompleted / completionTasks.length) * 100)
      : 0;

  // 가중치 적용 전체 진행률
  const PERMIT_WEIGHT = 20;
  const CONSTRUCTION_WEIGHT = 60;
  const COMPLETION_WEIGHT = 20;

  let totalProgress = 0;

  // 인허가 (20%)
  if (permitTasks.length > 0) {
    totalProgress += (permitPercent / 100) * PERMIT_WEIGHT;
  }

  // 시공 (60%)
  if (constructionItems.length > 0) {
    totalProgress += (constructionPercent / 100) * CONSTRUCTION_WEIGHT;
  }

  // 준공 (20%)
  if (completionTasks.length > 0) {
    totalProgress += (completionPercent / 100) * COMPLETION_WEIGHT;
  }

  // 현재 단계 판단
  let currentPhase: "PERMIT" | "CONSTRUCTION" | "COMPLETION" = "PERMIT";
  if (permitPercent >= 100) {
    currentPhase = "CONSTRUCTION";
  }
  if (constructionPercent >= 100) {
    currentPhase = "COMPLETION";
  }
  if (completionPercent >= 100) {
    currentPhase = "COMPLETION";
  }

  // 지연 여부 (공정표에 DELAYED 상태가 있으면)
  const isDelayed = constructionItems.some((item) => item.status === "DELAYED");

  return {
    permit: {
      total: permitTasks.length,
      completed: permitCompleted,
      percent: permitPercent,
    },
    construction: {
      total: constructionItems.length,
      completed: constructionCompleted,
      percent: constructionPercent,
    },
    completion: {
      total: completionTasks.length,
      completed: completionCompleted,
      percent: completionPercent,
    },
    totalProgress: Math.round(totalProgress),
    currentPhase,
    isDelayed,
  };
}
