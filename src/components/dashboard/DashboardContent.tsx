"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  FolderKanban,
  Flame,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { DashboardTaskList } from "./DashboardTaskList";

interface DashboardTask {
  id: string;
  name: string;
  startDate: string | null;
  dueDate: string;
  assigneeId: string | null;
  project: { id: string; name: string };
  parent: { id: string; name: string } | null;
}

interface ProjectProgress {
  id: string;
  name: string;
  total: number;
  completed: number;
  percent: number;
}

interface KpiData {
  totalProjects: number;
  inProgressProjects: number;
  overdueCount: number;
  completedThisWeek: number;
}

interface DashboardContentProps {
  userName: string;
  currentUserId: string;
  alertTasks: DashboardTask[];
  projectsWithProgress: ProjectProgress[];
  kpiData: KpiData;
}

// 날짜 포맷
function formatDate(date: Date): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
}

export function DashboardContent({
  userName,
  currentUserId,
  alertTasks,
  projectsWithProgress,
  kpiData,
}: DashboardContentProps) {
  const today = new Date();

  return (
    <div className="container py-6 space-y-6">
      {/* 인사말 */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">안녕하세요, {userName}님!</h1>
        <p className="text-muted-foreground">
          오늘의 업무 현황입니다 · {formatDate(today)}
        </p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<FolderKanban className="h-5 w-5" />}
          value={kpiData.totalProjects}
          label="전체 프로젝트"
          color="blue"
        />
        <KpiCard
          icon={<Flame className="h-5 w-5" />}
          value={kpiData.inProgressProjects}
          label="진행중"
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
          label="이번 주 완료"
          color="green"
        />
      </div>

      {/* 프로젝트 진행률 */}
      {projectsWithProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              프로젝트 진행률
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectsWithProgress.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                href={`/admin/projects/${project.id}`}
                className="block group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {project.name}
                    </span>
                    <span className="text-muted-foreground">
                      {project.percent}% ({project.completed}/{project.total})
                    </span>
                  </div>
                  <Progress
                    value={project.percent}
                    className={cn(
                      "h-2",
                      project.percent === 100 && "[&>div]:bg-green-500",
                      project.percent >= 50 &&
                        project.percent < 100 &&
                        "[&>div]:bg-blue-500",
                      project.percent < 50 && "[&>div]:bg-yellow-500"
                    )}
                  />
                </div>
              </Link>
            ))}
            {projectsWithProgress.length > 5 && (
              <Link
                href="/admin/projects"
                className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors pt-2"
              >
                전체 프로젝트 보기 <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* 기존 태스크 목록 */}
      <DashboardTaskList tasks={alertTasks} currentUserId={currentUserId} />
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
