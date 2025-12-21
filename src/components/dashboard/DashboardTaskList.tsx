"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";

interface DashboardTask {
  id: string;
  name: string;
  dueDate: string;
  project: { id: string; name: string };
  parent: { id: string; name: string } | null;
}

interface DashboardTaskListProps {
  tasks: DashboardTask[];
}

function getDdayNumber(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDdayText(dday: number): string {
  if (dday < 0) return `D+${Math.abs(dday)}`;
  if (dday === 0) return "D-Day";
  return `D-${dday}`;
}

export function DashboardTaskList({ tasks }: DashboardTaskListProps) {
  // D-day 계산 및 분류
  const tasksWithDday = tasks.map((task) => ({
    ...task,
    dday: getDdayNumber(task.dueDate),
  }));

  const overdueTasks = tasksWithDday
    .filter((t) => t.dday < 0)
    .sort((a, b) => a.dday - b.dday); // 가장 오래된 것 먼저

  const thisWeekTasks = tasksWithDday
    .filter((t) => t.dday >= 0 && t.dday <= 7)
    .sort((a, b) => a.dday - b.dday);

  const hasAlerts = overdueTasks.length > 0 || thisWeekTasks.length > 0;

  if (!hasAlerts) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-2 text-green-700">
            <CheckCircle2 className="h-12 w-12" />
            <p className="text-lg font-medium">모든 일정이 정상입니다</p>
            <p className="text-sm text-green-600">기한 초과나 임박한 태스크가 없습니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 기한 초과 */}
      {overdueTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              기한 초과 ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueTasks.map((task) => (
              <TaskItem key={task.id} task={task} variant="overdue" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 이번 주 마감 */}
      {thisWeekTasks.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              이번 주 마감 ({thisWeekTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {thisWeekTasks.map((task) => (
              <TaskItem key={task.id} task={task} variant="soon" />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TaskItem({
  task,
  variant,
}: {
  task: DashboardTask & { dday: number };
  variant: "overdue" | "soon";
}) {
  const isOverdue = variant === "overdue";

  return (
    <Link
      href={`/admin/projects/${task.project.id}?taskId=${task.id}&expand=true`}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        isOverdue
          ? "bg-red-100 hover:bg-red-200"
          : "bg-yellow-100 hover:bg-yellow-200"
      )}
    >
      {/* 프로젝트 > 부모 > 태스크명 */}
      <div className="flex-1 min-w-0 text-sm">
        <span className="text-muted-foreground">{task.project.name}</span>
        <span className="text-muted-foreground mx-1">›</span>
        {task.parent && (
          <>
            <span className="text-muted-foreground">{task.parent.name}</span>
            <span className="text-muted-foreground mx-1">›</span>
          </>
        )}
        <span className="font-medium">{task.name}</span>
      </div>

      {/* D-day */}
      <Badge
        variant={isOverdue ? "destructive" : "secondary"}
        className={cn(!isOverdue && "bg-yellow-500 text-white")}
      >
        {getDdayText(task.dday)}
      </Badge>

      {/* 링크 아이콘 */}
      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}
