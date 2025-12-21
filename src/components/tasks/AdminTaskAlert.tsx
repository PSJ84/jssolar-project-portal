"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface TaskWithChildren {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  isPermitTask?: boolean;
  children: TaskWithChildren[];
}

interface AdminTaskAlertProps {
  tasks: TaskWithChildren[];
}

// 오늘 날짜 (시간 제외)
function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// 태스크가 시작되었는지 확인 (startDate <= 오늘)
function isTaskStarted(startDate: string | null): boolean {
  if (!startDate) return false; // startDate 없으면 아직 시작 안 함
  const today = getToday();
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return start <= today;
}

// D-day 숫자 계산
function getDdayNumber(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const today = getToday();
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface AlertTask {
  id: string;
  name: string;
  parentName: string | null;
  dueDate: string;
  dday: number;
  isOverdue: boolean;
  isPermitTask: boolean;
}

export function AdminTaskAlert({ tasks }: AdminTaskAlertProps) {
  // 기한 있는 미완료 태스크 추출 (메인 + 하위)
  const alertTasks: AlertTask[] = [];

  tasks.filter(t => t.isActive).forEach((mainTask) => {
    // 메인 태스크 체크: 시작된 태스크만 (startDate <= 오늘)
    if (!mainTask.completedDate && mainTask.dueDate && isTaskStarted(mainTask.startDate)) {
      const dday = getDdayNumber(mainTask.dueDate);
      if (dday !== null && dday <= 7) { // D-7 이내만
        alertTasks.push({
          id: mainTask.id,
          name: mainTask.name,
          parentName: null,
          dueDate: mainTask.dueDate,
          dday,
          isOverdue: dday < 0,
          isPermitTask: mainTask.isPermitTask ?? false,
        });
      }
    }

    // 하위 태스크 체크: 시작된 태스크만 (startDate <= 오늘)
    mainTask.children.filter(c => c.isActive).forEach((child) => {
      if (!child.completedDate && child.dueDate && isTaskStarted(child.startDate)) {
        const dday = getDdayNumber(child.dueDate);
        if (dday !== null && dday <= 7) {
          alertTasks.push({
            id: child.id,
            name: child.name,
            parentName: mainTask.name,
            dueDate: child.dueDate,
            dday,
            isOverdue: dday < 0,
            isPermitTask: child.isPermitTask ?? false,
          });
        }
      }
    });
  });

  // 정렬: 기한 초과 먼저, 그 다음 D-day 순
  alertTasks.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return a.dday - b.dday;
  });

  const overdueCount = alertTasks.filter(t => t.isOverdue).length;

  return (
    <Card className={cn(
      alertTasks.length > 0 && overdueCount > 0 && "border-red-300 bg-red-50/50",
      alertTasks.length > 0 && overdueCount === 0 && "border-yellow-300 bg-yellow-50/50",
      alertTasks.length === 0 && "border-green-300 bg-green-50/50"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {alertTasks.length > 0 ? (
            <>
              <AlertTriangle className={cn(
                "h-5 w-5",
                overdueCount > 0 ? "text-red-500" : "text-yellow-500"
              )} />
              주의 필요 ({alertTasks.length})
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              모든 일정이 정상입니다
            </>
          )}
        </CardTitle>
      </CardHeader>

      {alertTasks.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {alertTasks.slice(0, 5).map((task) => ( // 최대 5개
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg",
                  task.isOverdue ? "bg-red-100" : "bg-yellow-100"
                )}
              >
                {/* 상태 아이콘 */}
                <span className={cn(
                  "text-lg shrink-0",
                  task.isOverdue ? "text-red-500" : "text-yellow-500"
                )}>
                  {task.isOverdue ? "🔴" : "🟡"}
                </span>

                {/* 태스크명 */}
                <div className="flex-1 min-w-0 text-sm">
                  {task.parentName ? (
                    <span>
                      <span className="text-muted-foreground">{task.parentName}</span>
                      <span className="text-muted-foreground mx-1">›</span>
                      <span className="font-medium">{task.name}</span>
                    </span>
                  ) : (
                    <span className="font-medium">{task.name}</span>
                  )}
                </div>

                {/* D-day 배지 */}
                <Badge
                  variant={task.isOverdue ? "destructive" : "secondary"}
                  className={cn(
                    "shrink-0",
                    !task.isOverdue && "bg-yellow-500 text-white"
                  )}
                >
                  {task.isOverdue ? `D+${Math.abs(task.dday)}` : task.dday === 0 ? "D-Day" : `D-${task.dday}`}
                </Badge>
              </div>
            ))}

            {alertTasks.length > 5 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                외 {alertTasks.length - 5}개 더...
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
