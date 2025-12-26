import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HomeDashboard } from "@/components/dashboard/HomeDashboard";
import { calculateWeightedProgress } from "@/lib/progress-utils";

export default async function AdminHomePage() {
  const session = await auth();

  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    redirect("/");
  }

  const organizationId = session.user.organizationId;
  if (!organizationId) {
    redirect("/");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  // 1. 프로젝트 현황 (진행중인 것만)
  const projects = await prisma.project.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      phase: true,
      tasks: {
        where: { parentId: null, isActive: true },
        select: { completedDate: true, phase: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const projectsWithProgress = projects.map((p) => {
    const percent = calculateWeightedProgress(p.tasks);
    const isOverdue = p.tasks.some((t) => !t.completedDate); // 간단한 체크
    return {
      id: p.id,
      name: p.name,
      phase: p.phase,
      total: p.tasks.length,
      completed: p.tasks.filter((t) => t.completedDate).length,
      percent,
      isOverdue: false, // 추후 기한 초과 체크 추가
    };
  });

  // 2. 할 일 목록 (미완료, 기한순)
  const todos = await prisma.todo.findMany({
    where: {
      OR: [
        { project: { organizationId, status: "ACTIVE" } },
        { organizationId, projectId: null },
      ],
      completedDate: null,
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      priority: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
    take: 10,
  });

  // 오늘 마감, 이번주 마감 카운트
  const todayDueTodos = todos.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime();
  }).length;

  const weekDueTodos = todos.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= today && due <= weekLater;
  }).length;

  // 3. 이번주 프로젝트 일정 (7일 이내 기한인 태스크)
  const weekTasks = await prisma.task.findMany({
    where: {
      project: { organizationId, status: "ACTIVE" },
      isActive: true,
      completedDate: null,
      dueDate: {
        gte: today,
        lte: weekLater,
      },
      OR: [
        { parentId: null },
        { parent: { isActive: true } },
      ],
    },
    select: {
      id: true,
      name: true,
      dueDate: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  // 기한 초과 태스크도 포함
  const overdueTasks = await prisma.task.findMany({
    where: {
      project: { organizationId, status: "ACTIVE" },
      isActive: true,
      completedDate: null,
      dueDate: { lt: today },
      OR: [
        { parentId: null },
        { parent: { isActive: true } },
      ],
    },
    select: {
      id: true,
      name: true,
      dueDate: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  // 4. 예산 현황 (전체 프로젝트 거래 합계)
  const budgetTransactions = await prisma.budgetTransaction.findMany({
    where: {
      budgetItem: {
        project: { organizationId, status: "ACTIVE" },
      },
    },
    select: {
      amount: true,
      isCompleted: true,
      budgetItem: {
        select: { type: true },
      },
    },
  });

  const budgetSummary = {
    confirmedRevenue: 0,
    confirmedExpense: 0,
    pendingRevenue: 0,
    pendingExpense: 0,
  };

  budgetTransactions.forEach((tx) => {
    if (tx.budgetItem.type === "INCOME") {
      if (tx.isCompleted) {
        budgetSummary.confirmedRevenue += tx.amount;
      } else {
        budgetSummary.pendingRevenue += tx.amount;
      }
    } else {
      if (tx.isCompleted) {
        budgetSummary.confirmedExpense += tx.amount;
      } else {
        budgetSummary.pendingExpense += tx.amount;
      }
    }
  });

  // 날짜 직렬화
  const formattedTodos = todos.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate?.toISOString() ?? null,
    priority: t.priority,
    projectName: t.project?.name || null,
  }));

  const formattedWeekTasks = [...overdueTasks, ...weekTasks].map((t) => ({
    id: t.id,
    name: t.name,
    dueDate: t.dueDate!.toISOString(),
    projectId: t.project.id,
    projectName: t.project.name,
  }));

  // 인사말 시간대 체크
  const hour = new Date().getHours();
  let greeting = "안녕하세요";
  if (hour < 12) greeting = "좋은 아침이에요";
  else if (hour < 18) greeting = "좋은 오후에요";
  else greeting = "좋은 저녁이에요";

  return (
    <HomeDashboard
      userName={session.user.name || "관리자"}
      greeting={greeting}
      todayDueCount={todayDueTodos}
      weekDueCount={weekDueTodos}
      projects={projectsWithProgress}
      todos={formattedTodos}
      weekTasks={formattedWeekTasks}
      budgetSummary={budgetSummary}
    />
  );
}
