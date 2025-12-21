"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  FolderKanban,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface DashboardTask {
  id: string;
  name: string;
  startDate: string | null;
  dueDate: string;
  project: { id: string; name: string };
  parent: { id: string; name: string } | null;
  assigneeId: string | null;
}

interface DashboardTaskListProps {
  tasks: DashboardTask[];
  currentUserId: string;
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

export function DashboardTaskList({
  tasks,
  currentUserId,
}: DashboardTaskListProps) {
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [groupByProject, setGroupByProject] = useState(false);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  // 필터링
  const filteredTasks = showOnlyMine
    ? tasks.filter((t) => t.assigneeId === currentUserId)
    : tasks;

  // D-day 계산 및 분류
  const tasksWithDday = filteredTasks.map((task) => ({
    ...task,
    dday: getDdayNumber(task.dueDate),
  }));

  const overdueTasks = tasksWithDday
    .filter((t) => t.dday < 0)
    .sort((a, b) => a.dday - b.dday);

  const thisWeekTasks = tasksWithDday
    .filter((t) => t.dday >= 0 && t.dday <= 7)
    .sort((a, b) => a.dday - b.dday);

  // 프로젝트별 그룹핑
  const groupedByProject = useMemo(() => {
    if (!groupByProject) return null;

    const groups: Record<
      string,
      { project: { id: string; name: string }; tasks: typeof tasksWithDday }
    > = {};

    tasksWithDday.forEach((task) => {
      const projectId = task.project.id;
      if (!groups[projectId]) {
        groups[projectId] = { project: task.project, tasks: [] };
      }
      groups[projectId].tasks.push(task);
    });

    // 가장 급한 태스크 기준으로 프로젝트 정렬
    return Object.values(groups).sort((a, b) => {
      const aMinDday = Math.min(...a.tasks.map((t) => t.dday));
      const bMinDday = Math.min(...b.tasks.map((t) => t.dday));
      return aMinDday - bMinDday;
    });
  }, [groupByProject, tasksWithDday]);

  // 완료 처리 함수
  const handleComplete = async (task: DashboardTask & { dday: number }) => {
    setCompletingIds((prev) => new Set([...prev, task.id]));

    try {
      const res = await fetch(
        `/api/projects/${task.project.id}/tasks-v2/${task.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completedDate: new Date().toISOString() }),
        }
      );

      if (!res.ok) throw new Error("Failed to complete task");

      toast.success(`"${task.name}" 완료!`);

      // 페이지 새로고침 (서버 컴포넌트 데이터 갱신)
      window.location.reload();
    } catch (error) {
      toast.error("완료 처리에 실패했습니다");
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const hasAlerts = overdueTasks.length > 0 || thisWeekTasks.length > 0;

  return (
    <div className="space-y-4">
      {/* 필터 UI */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="showOnlyMine"
              checked={showOnlyMine}
              onCheckedChange={(checked) => setShowOnlyMine(checked === true)}
            />
            <label
              htmlFor="showOnlyMine"
              className="text-sm cursor-pointer"
            >
              내 담당만 보기
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="groupByProject"
              checked={groupByProject}
              onCheckedChange={(checked) => setGroupByProject(checked === true)}
            />
            <label
              htmlFor="groupByProject"
              className="text-sm cursor-pointer"
            >
              프로젝트별 그룹
            </label>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          총 {filteredTasks.length}개
        </div>
      </div>

      {/* 주의 필요 없을 때 */}
      {!hasAlerts && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-2 text-green-700">
              <CheckCircle2 className="h-12 w-12" />
              <p className="text-lg font-medium">모든 일정이 정상입니다</p>
              <p className="text-sm text-green-600">
                기한 초과나 임박한 태스크가 없습니다
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 프로젝트별 그룹 뷰 */}
      {hasAlerts && groupByProject && groupedByProject ? (
        <div className="space-y-4">
          {groupedByProject.map((group) => (
            <Card key={group.project.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  {group.project.name}
                  <Badge variant="outline">{group.tasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    variant={task.dday < 0 ? "overdue" : "soon"}
                    onComplete={() => handleComplete(task)}
                    isCompleting={completingIds.has(task.id)}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* 기존 기한별 뷰 */
        hasAlerts && (
          <div className="space-y-6">
            {/* 기한 초과 */}
            {overdueTasks.length > 0 && (
              <Card className="border-red-200 bg-gradient-to-r from-red-50 to-red-100/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    기한 초과 ({overdueTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overdueTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      variant="overdue"
                      onComplete={() => handleComplete(task)}
                      isCompleting={completingIds.has(task.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 이번 주 마감 */}
            {thisWeekTasks.length > 0 && (
              <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
                    <Clock className="h-5 w-5" />
                    이번 주 마감 ({thisWeekTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {thisWeekTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      variant="soon"
                      onComplete={() => handleComplete(task)}
                      isCompleting={completingIds.has(task.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )
      )}
    </div>
  );
}

function TaskItem({
  task,
  variant,
  onComplete,
  isCompleting,
}: {
  task: DashboardTask & { dday: number };
  variant: "overdue" | "soon";
  onComplete: () => void;
  isCompleting: boolean;
}) {
  const isOverdue = variant === "overdue";

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        isOverdue
          ? "bg-red-100 hover:bg-red-200"
          : "bg-yellow-100 hover:bg-yellow-200"
      )}
    >
      {/* 완료 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={(e) => {
          e.preventDefault();
          onComplete();
        }}
        disabled={isCompleting}
      >
        {isCompleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground hover:text-green-500" />
        )}
      </Button>

      {/* 프로젝트 > 부모 > 태스크명 */}
      <Link
        href={`/admin/projects/${task.project.id}?taskId=${task.id}&expand=true`}
        className="flex-1 min-w-0 text-sm"
      >
        <span className="text-muted-foreground">{task.project.name}</span>
        <span className="text-muted-foreground mx-1">›</span>
        {task.parent && (
          <>
            <span className="text-muted-foreground">{task.parent.name}</span>
            <span className="text-muted-foreground mx-1">›</span>
          </>
        )}
        <span className="font-medium hover:underline">{task.name}</span>
      </Link>

      {/* D-day */}
      <Badge
        variant={isOverdue ? "destructive" : "secondary"}
        className={cn(!isOverdue && "bg-yellow-500 text-white")}
      >
        {getDdayText(task.dday)}
      </Badge>
    </div>
  );
}
