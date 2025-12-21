import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardTaskList } from "@/components/dashboard/DashboardTaskList";

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    redirect("/");
  }

  const organizationId = session.user.organizationId;
  if (!organizationId) {
    redirect("/");
  }

  // 조직의 모든 프로젝트에서 기한 있는 미완료 태스크 조회
  const tasks = await prisma.task.findMany({
    where: {
      project: {
        organizationId: organizationId,
        status: "ACTIVE",
      },
      isActive: true,
      completedDate: null,
      dueDate: { not: null },
    },
    select: {
      id: true,
      name: true,
      dueDate: true,
      project: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  // 날짜를 문자열로 변환
  const formattedTasks = tasks.map((task) => ({
    id: task.id,
    name: task.name,
    dueDate: task.dueDate!.toISOString(),
    project: task.project,
    parent: task.parent,
  }));

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">내일 뭐하지?</h1>
      </div>

      <DashboardTaskList tasks={formattedTasks} />
    </div>
  );
}
