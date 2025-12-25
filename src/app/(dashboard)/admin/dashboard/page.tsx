import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { calculateWeightedProgress } from "@/lib/progress-utils";

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    redirect("/");
  }

  const organizationId = session.user.organizationId;
  if (!organizationId) {
    redirect("/");
  }

  // 1. 기한 있는 미완료 태스크 (시작된 태스크만)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alertTasks = await prisma.task.findMany({
    where: {
      project: { organizationId, status: "ACTIVE" },
      isActive: true,
      completedDate: null,
      dueDate: { not: null },
      startDate: { lte: today }, // 시작된 태스크만 (startDate <= 오늘)
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      dueDate: true,
      assigneeId: true,
      project: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  // 2. 프로젝트 목록 + 진행률 (가중치 기반)
  const projects = await prisma.project.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      tasks: {
        where: { parentId: null, isActive: true },
        select: { completedDate: true, phase: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const projectsWithProgress = projects.map((p) => ({
    id: p.id,
    name: p.name,
    total: p.tasks.length,
    completed: p.tasks.filter((t) => t.completedDate).length,
    percent: calculateWeightedProgress(p.tasks),
  }));

  // 3. KPI 데이터
  const totalProjects = projects.length;
  const inProgressProjects = projects.filter((p) => {
    const completed = p.tasks.filter((t) => t.completedDate).length;
    return completed > 0 && completed < p.tasks.length;
  }).length;

  // 이번 주 완료된 태스크 수
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const completedThisWeek = await prisma.task.count({
    where: {
      project: { organizationId, status: "ACTIVE" },
      isActive: true,
      completedDate: { gte: startOfWeek },
    },
  });

  // 기한 초과 태스크 수 (today는 위에서 이미 선언됨)
  const overdueCount = alertTasks.filter(
    (t) => new Date(t.dueDate!) < today
  ).length;

  const kpiData = {
    totalProjects,
    inProgressProjects,
    overdueCount,
    completedThisWeek,
  };

  // 4. 할 일 목록 (기한 있거나 우선순위 높은 것)
  const alertTodos = await prisma.todo.findMany({
    where: {
      project: { organizationId, status: "ACTIVE" },
      completedDate: null,
      OR: [
        { dueDate: { not: null } },
        { priority: "HIGH" },
      ],
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      priority: true,
      assigneeId: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: [
      { priority: "asc" }, // HIGH first
      { dueDate: "asc" },
    ],
    take: 20,
  });

  // 날짜를 문자열로 변환
  const formattedTasks = alertTasks.map((task) => ({
    id: task.id,
    name: task.name,
    startDate: task.startDate?.toISOString() ?? null,
    dueDate: task.dueDate!.toISOString(),
    assigneeId: task.assigneeId,
    project: task.project,
    parent: task.parent,
  }));

  const formattedTodos = alertTodos
    .filter((todo) => todo.project !== null)
    .map((todo) => ({
      id: todo.id,
      title: todo.title,
      dueDate: todo.dueDate?.toISOString() ?? null,
      priority: todo.priority,
      assigneeId: todo.assigneeId,
      project: todo.project!,
    }));

  return (
    <DashboardContent
      userName={session.user.name || "관리자"}
      currentUserId={session.user.id}
      alertTasks={formattedTasks}
      alertTodos={formattedTodos}
      projectsWithProgress={projectsWithProgress}
      kpiData={kpiData}
    />
  );
}
