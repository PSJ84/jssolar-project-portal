import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectTable } from "@/components/project/project-table";
import { prisma } from "@/lib/prisma";
import {
  Plus,
  FolderKanban,
  Flame,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { calculateWeightedProgress } from "@/lib/progress-utils";
import { cn } from "@/lib/utils";
import { ProjectAlertTasks } from "@/components/project/ProjectAlertTasks";

// 진행률 계산 함수 (하위 태스크 기준, 활성화된 것만, 가중치 적용)
function calculateProgress(tasks: { isActive: boolean; children: { isActive: boolean; completedDate: Date | null; phase: "PERMIT" | "CONSTRUCTION" | "OTHER" | "COMPLETION" }[] }[]): number {
  const activeTasks = tasks.filter(t => t.isActive);
  const allChildTasks = activeTasks.flatMap(t => t.children.filter(c => c.isActive));

  if (allChildTasks.length === 0) return 0;

  return calculateWeightedProgress(allChildTasks);
}

async function getProjects(organizationId: string) {
  try {
    const projects = await prisma.project.findMany({
      where: {
        organizationId,
        status: {
          not: "ARCHIVED",
        },
      },
      include: {
        _count: {
          select: {
            members: true,
            documents: true,
          },
        },
        // 진행률 계산을 위한 태스크 조회 (가중치 계산용 phase 포함)
        tasks: {
          where: { parentId: null },
          select: {
            isActive: true,
            children: {
              select: {
                isActive: true,
                completedDate: true,
                phase: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // 진행률 계산하여 반환
    return projects.map(project => ({
      ...project,
      calculatedProgress: calculateProgress(project.tasks),
    }));
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

async function getKpiData(organizationId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  // 프로젝트 통계
  const [totalProjects, activeProjects] = await Promise.all([
    prisma.project.count({
      where: { organizationId, status: { not: "ARCHIVED" } },
    }),
    prisma.project.count({
      where: { organizationId, status: "ACTIVE" },
    }),
  ]);

  // 기한 초과 태스크 수
  const overdueCount = await prisma.task.count({
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
  });

  // 이번주 완료 태스크 수
  const completedThisWeek = await prisma.task.count({
    where: {
      project: { organizationId, status: "ACTIVE" },
      isActive: true,
      completedDate: { gte: startOfWeek },
      OR: [
        { parentId: null },
        { parent: { isActive: true } },
      ],
    },
  });

  // 기한 임박/초과 태스크 (7일 이내 + 초과)
  const alertTasks = await prisma.task.findMany({
    where: {
      project: { organizationId, status: "ACTIVE" },
      isActive: true,
      completedDate: null,
      dueDate: { lte: weekLater },
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
    take: 20,
  });

  return {
    totalProjects,
    activeProjects,
    overdueCount,
    completedThisWeek,
    alertTasks: alertTasks.map(t => ({
      id: t.id,
      name: t.name,
      dueDate: t.dueDate!.toISOString(),
      projectId: t.project.id,
      projectName: t.project.name,
    })),
  };
}

export default async function AdminProjectsPage() {
  const session = await auth();

  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    redirect("/");
  }

  const organizationId = session.user.organizationId;
  if (!organizationId) {
    redirect("/");
  }

  const [projects, kpiData] = await Promise.all([
    getProjects(organizationId),
    getKpiData(organizationId),
  ]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">프로젝트 관리</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            모든 프로젝트를 관리할 수 있습니다.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            새 프로젝트
          </Link>
        </Button>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<FolderKanban className="h-5 w-5" />}
          value={kpiData.totalProjects}
          label="총 프로젝트"
          color="blue"
        />
        <KpiCard
          icon={<Flame className="h-5 w-5" />}
          value={kpiData.activeProjects}
          label="진행 중"
          color="yellow"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          value={kpiData.overdueCount}
          label="기한 초과"
          color="red"
          highlight={kpiData.overdueCount > 0}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          value={kpiData.completedThisWeek}
          label="이번주 완료"
          color="green"
        />
      </div>

      {/* 기한 임박/초과 태스크 */}
      {kpiData.alertTasks.length > 0 && (
        <ProjectAlertTasks tasks={kpiData.alertTasks} />
      )}

      {/* 프로젝트 목록 */}
      <ProjectTable projects={projects} />
    </div>
  );
}

// KPI 카드 컴포넌트
interface KpiCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: "blue" | "yellow" | "red" | "green";
  highlight?: boolean;
}

function KpiCard({ icon, value, label, color, highlight }: KpiCardProps) {
  const iconBgStyles = {
    blue: "bg-blue-100 text-blue-600",
    yellow: "bg-yellow-100 text-yellow-600",
    red: "bg-red-100 text-red-600",
    green: "bg-green-100 text-green-600",
  };

  return (
    <Card
      className={cn(
        "border transition-all hover:shadow-md",
        highlight && "ring-2 ring-red-400 ring-offset-2"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", iconBgStyles[color])}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
