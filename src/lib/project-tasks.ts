import { TaskType, TaskStatus, ProjectTask, PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

// Default task order for new projects
export const DEFAULT_TASK_ORDER: TaskType[] = [
  "SITE_SURVEY",
  "BUSINESS_PERMIT",
  "DEVELOPMENT_PERMIT",
  "CONTRACT",
  "STRUCTURE_DRAWING",
  "ELECTRICAL_DRAWING",
  "CONSTRUCTION_PLAN",
  "PPA_APPLICATION",
  "PRE_USE_INSPECTION",
  "DEVELOPMENT_COMPLETION",
  "BUSINESS_START",
  "FACILITY_CONFIRM",
];

// Korean labels for task types
export const taskTypeLabels: Record<TaskType, string> = {
  SITE_SURVEY: "현장실측/조사",
  BUSINESS_PERMIT: "발전사업허가",
  DEVELOPMENT_PERMIT: "개발행위허가",
  CONTRACT: "도급계약",
  STRUCTURE_DRAWING: "구조물도면/구조검토",
  ELECTRICAL_DRAWING: "전기도면",
  CONSTRUCTION_PLAN: "공사계획신고",
  PPA_APPLICATION: "PPA신청",
  PRE_USE_INSPECTION: "사용전검사",
  DEVELOPMENT_COMPLETION: "개발행위준공",
  BUSINESS_START: "사업개시신고",
  FACILITY_CONFIRM: "설비확인",
};

// Korean labels for task statuses
export const taskStatusLabels: Record<TaskStatus, string> = {
  NOT_STARTED: "대기",
  IN_PROGRESS: "진행중",
  SUBMITTED: "접수",
  COMPLETED: "완료",
};

// Type for Prisma transaction client
type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Creates default tasks for a new project
 * @param prisma - Prisma client or transaction client
 * @param projectId - The project ID to create tasks for
 * @returns Array of created tasks
 */
export async function createDefaultTasks(
  prisma: PrismaClient | TransactionClient,
  projectId: string
): Promise<ProjectTask[]> {
  const tasksData = DEFAULT_TASK_ORDER.map((taskType, index) => ({
    projectId,
    taskType,
    status: "NOT_STARTED" as TaskStatus,
    displayOrder: index,
  }));

  // Use createMany for efficiency
  await prisma.projectTask.createMany({
    data: tasksData,
  });

  // Fetch and return the created tasks
  const tasks = await prisma.projectTask.findMany({
    where: { projectId },
    orderBy: { displayOrder: "asc" },
  });

  return tasks;
}

/**
 * Calculates project progress percentage based on completed tasks
 * @param tasks - Array of project tasks
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(tasks: Pick<ProjectTask, "status">[]): number {
  if (tasks.length === 0) {
    return 0;
  }

  const completedCount = tasks.filter(
    (task) => task.status === "COMPLETED"
  ).length;

  return Math.round((completedCount / tasks.length) * 100);
}

/**
 * Gets the label for a task type in Korean
 * @param taskType - The task type enum value
 * @returns Korean label for the task type
 */
export function getTaskTypeLabel(taskType: TaskType): string {
  return taskTypeLabels[taskType] || taskType;
}

/**
 * Gets the label for a task status in Korean
 * @param status - The task status enum value
 * @returns Korean label for the task status
 */
export function getTaskStatusLabel(status: TaskStatus): string {
  return taskStatusLabels[status] || status;
}
