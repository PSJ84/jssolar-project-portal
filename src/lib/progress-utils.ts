/**
 * 가중치 기반 진행률 계산 유틸리티
 * 시공(CONSTRUCTION) 60%, 나머지(PERMIT, OTHER) 40%
 */

interface TaskForProgress {
  phase: "PERMIT" | "CONSTRUCTION" | "OTHER";
  completedDate: Date | null;
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
