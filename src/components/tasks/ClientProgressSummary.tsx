"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  FileCheck,
  Clock,
  Circle,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { calculateWeightedProgress } from "@/lib/progress-utils";

interface TaskWithChildren {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  isPermitTask?: boolean;
  submittedDate?: string | null;
  processingDays?: number | null;
  phase?: "PERMIT" | "CONSTRUCTION" | "OTHER";
  children: TaskWithChildren[];
}

interface ClientProgressSummaryProps {
  tasks: TaskWithChildren[];
}

// D-day 숫자 계산 (정렬용)
function getDdayNumber(task: TaskWithChildren): number {
  if (!task.dueDate) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// D-day 텍스트
function getDdayText(dueDate: string | null): { text: string; isOverdue: boolean; isSoon: boolean } | null {
  if (!dueDate) return null;
  const dday = getDdayNumber({ dueDate } as TaskWithChildren);
  if (dday < 0) return { text: `D+${Math.abs(dday)}`, isOverdue: true, isSoon: false };
  if (dday === 0) return { text: "D-Day", isOverdue: false, isSoon: true };
  if (dday <= 3) return { text: `D-${dday}`, isOverdue: false, isSoon: true };
  return { text: `D-${dday}`, isOverdue: false, isSoon: false };
}

// 상태 분류
type TaskStatus = "completed" | "submitted" | "in_progress" | "waiting";

function getTaskStatus(task: TaskWithChildren): TaskStatus {
  if (task.completedDate) return "completed";
  if (task.isPermitTask && task.submittedDate) return "submitted";

  const activeChildren = task.children.filter(c => c.isActive);
  const hasProgress = task.startDate || activeChildren.some(c => c.completedDate || c.startDate);
  if (hasProgress) return "in_progress";

  return "waiting";
}

// 날짜 포맷 헬퍼
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function ClientProgressSummary({ tasks }: ClientProgressSummaryProps) {
  // 활성 태스크만
  const activeTasks = tasks.filter(t => t.isActive);

  // 상태별 분류
  const completed = activeTasks.filter(t => getTaskStatus(t) === "completed");
  const submitted = activeTasks.filter(t => getTaskStatus(t) === "submitted");
  const inProgress = activeTasks.filter(t => getTaskStatus(t) === "in_progress");
  const waiting = activeTasks.filter(t => getTaskStatus(t) === "waiting");

  // 진행률 계산 (가중치 기반)
  const total = activeTasks.length;
  const completedCount = completed.length;
  const progressPercent = total > 0
    ? calculateWeightedProgress(activeTasks.map(t => ({
        phase: t.phase || "PERMIT",
        completedDate: t.completedDate ? new Date(t.completedDate) : null,
      })))
    : 0;

  // 현재 진행중 (접수 + 진행중) - D-day 급한 순 정렬
  const currentTasks = [...submitted, ...inProgress].sort((a, b) => {
    // 1. D-day 임박 순
    const aDday = getDdayNumber(a);
    const bDday = getDdayNumber(b);
    if (aDday !== bDday) return aDday - bDday;

    // 2. 인허가 우선
    if (a.isPermitTask !== b.isPermitTask) return b.isPermitTask ? 1 : -1;

    // 3. sortOrder
    return a.sortOrder - b.sortOrder;
  });

  // 다음 대기 (sortOrder 순 첫 번째)
  const nextWaiting = waiting.sort((a, b) => a.sortOrder - b.sortOrder)[0];

  return (
    <div className="space-y-4 mb-6">
      {/* 전체 진행률 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">전체 진행률</span>
              <span className="text-muted-foreground">
                {progressPercent}% ({completedCount}/{total} 완료)
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />

            {/* 상태별 카운트 - 모바일에서 2줄로 */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-2 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>완료 {completed.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-blue-500" />
                <span>접수 {submitted.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span>진행 {inProgress.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Circle className="h-4 w-4 text-gray-300" />
                <span>대기 {waiting.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 현재 진행중 + 다음 대기 */}
      {(currentTasks.length > 0 || nextWaiting) && (
        <Card>
          <CardContent className="pt-4 pb-4">
            {/* 현재 진행중 */}
            {currentTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-orange-500">🔥</span>
                  현재 진행중 ({currentTasks.length})
                </div>

                <div className="space-y-2">
                  {currentTasks.map((task) => {
                    const status = getTaskStatus(task);
                    const dday = getDdayText(task.dueDate);

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          status === "submitted" && "bg-blue-50 border-blue-200",
                          status === "in_progress" && "bg-yellow-50 border-yellow-200"
                        )}
                      >
                        {/* 아이콘 */}
                        {status === "submitted" ? (
                          <FileCheck className="h-5 w-5 text-blue-500 shrink-0" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
                        )}

                        {/* 내용 */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{task.name}</div>
                          {status === "submitted" && task.submittedDate && (
                            <div className="text-sm text-muted-foreground">
                              접수: {formatDate(task.submittedDate)}
                              {task.dueDate && ` → 완료예정: ${formatDate(task.dueDate)}`}
                            </div>
                          )}
                        </div>

                        {/* 상태 배지 */}
                        <Badge className={cn(
                          "shrink-0",
                          status === "submitted" && "bg-blue-500",
                          status === "in_progress" && "bg-yellow-500"
                        )}>
                          {status === "submitted" ? "접수" : "진행중"}
                        </Badge>

                        {/* D-day */}
                        {dday && (
                          <Badge
                            variant={dday.isOverdue ? "destructive" : "outline"}
                            className={cn(
                              "shrink-0",
                              dday.isSoon && !dday.isOverdue && "bg-yellow-500 text-white border-yellow-500"
                            )}
                          >
                            {dday.isOverdue && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {dday.text}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 구분선 */}
            {currentTasks.length > 0 && nextWaiting && (
              <div className="border-t my-3" />
            )}

            {/* 다음 대기 */}
            {nextWaiting && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <ArrowRight className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-muted-foreground">다음 단계</div>
                  <div className="font-medium truncate">{nextWaiting.name}</div>
                </div>
                <Badge variant="outline" className="shrink-0 bg-gray-100">
                  대기
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
