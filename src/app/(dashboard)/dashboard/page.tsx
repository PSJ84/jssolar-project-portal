import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";

export default async function DashboardPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // ADMIN/SUPER_ADMIN은 어드민 대시보드로
  if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }

  // CLIENT용 대시보드 데이터 조회
  const userId = session.user.id;

  // 프로젝트 목록 조회
  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId } },
      status: { not: "ARCHIVED" },
    },
    include: {
      // 진행단계 태스크
      tasks: {
        where: { parentId: null },
        include: {
          children: {
            select: {
              phase: true,
              completedDate: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      // 공정표
      constructionPhases: {
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      // 최근 활동
      activities: {
        take: 3,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      // 사업주 할 일
      todos: {
        where: {
          assigneeId: userId,
          completedDate: null,
        },
        take: 3,
        orderBy: { dueDate: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 회사 정보 조회 (담당자 전화번호용) - systemConfig에서 가져옴
  const companyConfigs = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: ["COMPANY_NAME", "COMPANY_CEO", "COMPANY_PHONE"],
      },
    },
  });
  const companyConfigMap = Object.fromEntries(
    companyConfigs.map((c) => [c.key, c.value])
  );
  const companyInfo = {
    companyName: companyConfigMap.COMPANY_NAME || "",
    ceoName: companyConfigMap.COMPANY_CEO || null,
    phone: companyConfigMap.COMPANY_PHONE || null,
  };

  // 프로젝트 데이터 변환
  const projectsData = projects.map((project) => ({
    id: project.id,
    name: project.name,
    location: project.location,
    capacityKw: project.capacityKw,
    status: project.status,
    tasks: project.tasks.map((task) => ({
      id: task.id,
      name: task.name,
      phase: task.phase,
      completedDate: task.completedDate?.toISOString() ?? null,
      children: task.children.map((child) => ({
        phase: child.phase,
        completedDate: child.completedDate?.toISOString() ?? null,
      })),
    })),
    constructionPhases: project.constructionPhases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      items: phase.items.map((item) => ({
        id: item.id,
        name: item.name,
        startDate: item.startDate?.toISOString() ?? null,
        status: item.status,
        progress: item.progress,
      })),
    })),
    activities: project.activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
      user: activity.user,
    })),
    todos: project.todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      dueDate: todo.dueDate?.toISOString() ?? null,
    })),
  }));

  return (
    <div className="container max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">내 프로젝트</h1>
      <ClientDashboard
        projects={projectsData}
        companyInfo={companyInfo}
        userId={userId}
      />
    </div>
  );
}
