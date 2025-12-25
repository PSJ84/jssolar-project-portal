"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  AlertCircle,
  Clock,
  ListChecks,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AddTaskFromTemplate } from "./AddTaskFromTemplate";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { ClientProgressSummary } from "./ClientProgressSummary";
import { AdminTaskAlert } from "./AdminTaskAlert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface ChecklistCount {
  total: number;
  checked: number;
}

export interface TaskWithChildren {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  version: number;
  originTemplateTaskId: string | null;
  checklistCount?: ChecklistCount;
  // 인허가 필드
  isPermitTask?: boolean;
  submittedDate?: string | null;
  processingDays?: number | null;
  children: TaskWithChildren[];
}

interface TaskListV2Props {
  projectId: string;
  tasks: TaskWithChildren[];
  isAdmin?: boolean;
  isClient?: boolean;
  hideProgressSummary?: boolean;
  defaultAllExpanded?: boolean;
}

// D-day 계산
function getDday(dueDate: string | null, completedDate: string | null): { text: string; status: "overdue" | "soon" | "normal" | "completed" } | null {
  if (completedDate) {
    return { text: "완료", status: "completed" };
  }
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `D+${Math.abs(diffDays)}`, status: "overdue" };
  } else if (diffDays === 0) {
    return { text: "D-Day", status: "soon" };
  } else if (diffDays <= 3) {
    return { text: `D-${diffDays}`, status: "soon" };
  } else {
    return { text: `D-${diffDays}`, status: "normal" };
  }
}

// 날짜 포맷
function formatDateRange(startDate: string | null, dueDate: string | null): string {
  if (!startDate && !dueDate) return "대기";

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (startDate && dueDate) {
    return `${formatDate(startDate)}~${formatDate(dueDate)}`;
  }
  if (startDate) return `${formatDate(startDate)}~`;
  if (dueDate) return `~${formatDate(dueDate)}`;
  return "대기";
}

// 메인 태스크 상태 인터페이스
interface MainTaskStatus {
  status: "completed" | "submitted" | "in_progress" | "waiting";
  label: string;
  iconColor: string;
  bgColor: string;
  badgeColor: string;
}

// 메인 태스크 상태 계산
function getMainTaskStatus(task: TaskWithChildren): MainTaskStatus {
  // 활성화된 하위 태스크만 필터링
  const activeChildren = task.children.filter(c => c.isActive);

  // 완료: 본인 completedDate 있으면
  if (task.completedDate) {
    return {
      status: "completed",
      label: "완료",
      iconColor: "text-green-500",
      bgColor: "bg-green-50 border-green-200",
      badgeColor: "bg-green-500 text-white",
    };
  }

  // 인허가 + 접수완료
  if (task.isPermitTask && task.submittedDate) {
    return {
      status: "submitted",
      label: "접수",
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50 border-blue-200",
      badgeColor: "bg-blue-500 text-white",
    };
  }

  // 진행중: startDate가 오늘 이하거나 활성 하위 중 진행/완료된 것 있음
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isStarted = task.startDate && new Date(task.startDate).setHours(0, 0, 0, 0) <= today.getTime();
  const hasChildProgress = activeChildren.some((c) => {
    if (c.completedDate) return true;
    if (!c.startDate) return false;
    const start = new Date(c.startDate);
    start.setHours(0, 0, 0, 0);
    return start <= today;
  });

  if (isStarted || hasChildProgress) {
    return {
      status: "in_progress",
      label: "진행중",
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-50 border-yellow-200",
      badgeColor: "bg-yellow-500 text-white",
    };
  }

  // 대기
  return {
    status: "waiting",
    label: "대기",
    iconColor: "text-gray-300",
    bgColor: "border-gray-200",
    badgeColor: "bg-gray-400 text-white",
  };
}

// 완료일 포맷
function formatCompletedDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. 완료`;
}

// 접수 정보 포맷
function formatSubmittedInfo(submittedDate: string, dueDate: string | null): string {
  const submitted = new Date(submittedDate);
  const submittedStr = `${submitted.getMonth() + 1}/${submitted.getDate()}`;

  if (dueDate) {
    const due = new Date(dueDate);
    const dueStr = `${due.getMonth() + 1}/${due.getDate()}`;
    return `접수: ${submittedStr} → 완료예정: ${dueStr}`;
  }

  return `접수: ${submittedStr}`;
}

export function TaskListV2({ projectId, tasks, isAdmin = false, isClient = false, hideProgressSummary = false, defaultAllExpanded = false }: TaskListV2Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL에서 taskId, expand 파라미터 읽기
  const highlightTaskId = searchParams.get("taskId");
  const shouldExpand = searchParams.get("expand") === "true";

  // ADMIN용 진행단계 접기/펼치기 (기본: 펼침)
  const [isTaskListExpanded, setIsTaskListExpanded] = useState(true);

  const [showHidden, setShowHidden] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    // defaultAllExpanded면 모든 태스크 펼침, 아니면 완료되지 않은 태스크만 기본으로 펼침
    () => new Set(
      defaultAllExpanded
        ? tasks.map((t) => t.id)
        : tasks.filter((t) => !t.completedDate).map((t) => t.id)
    )
  );
  const [localTasks, setLocalTasks] = useState<TaskWithChildren[]>(tasks);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Sheet 상태
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hasTaskDetailFeature, setHasTaskDetailFeature] = useState(false);

  // 하위 태스크 추가 상태
  const [addingToParentId, setAddingToParentId] = useState<string | null>(null);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // CLIENT용 목록 접기/펼치기 (기본: 펼침)
  const [isListExpanded, setIsListExpanded] = useState(true);

  // tasks prop 변경 시 동기화
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Feature flag 조회
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await fetch("/api/features");
        if (res.ok) {
          const data = await res.json();
          setHasTaskDetailFeature(data.features?.includes("TASK_DETAIL") ?? false);
        }
      } catch (error) {
        console.error("Failed to fetch features:", error);
      }
    };
    fetchFeatures();
  }, []);

  // 하이라이트 태스크가 있으면 스크롤 + 부모 펼침
  useEffect(() => {
    if (highlightTaskId) {
      // 진행단계 펼치기
      setIsTaskListExpanded(true);

      // 해당 태스크의 부모 찾아서 펼치기
      const parentTask = localTasks.find((t) =>
        t.children.some((c) => c.id === highlightTaskId)
      );
      if (parentTask) {
        setExpandedTasks((prev) => new Set([...prev, parentTask.id]));
      }

      // 메인 태스크인 경우 해당 태스크 펼치기
      const isMainTask = localTasks.some((t) => t.id === highlightTaskId);
      if (isMainTask) {
        setExpandedTasks((prev) => new Set([...prev, highlightTaskId]));
      }

      // 스크롤 (약간 딜레이 후)
      setTimeout(() => {
        const element = document.getElementById(`task-${highlightTaskId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // 하이라이트 효과
          element.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          }, 2000);
        }
      }, 100);

      // URL 파라미터 정리 (히스토리 안 남기고)
      const url = new URL(window.location.href);
      url.searchParams.delete("taskId");
      url.searchParams.delete("expand");
      router.replace(url.pathname, { scroll: false });
    }
  }, [highlightTaskId, localTasks, router]);

  // 태스크 클릭 핸들러
  const handleTaskClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setIsSheetOpen(true);
  }, []);

  // Sheet 닫기
  const handleSheetClose = useCallback(() => {
    setIsSheetOpen(false);
    setSelectedTaskId(null);
  }, []);

  // 태스크 업데이트 후 새로고침
  const handleTaskUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  // 이미 추가된 템플릿 ID 추출
  const existingTemplateIds = localTasks
    .filter((t) => t.originTemplateTaskId)
    .map((t) => t.originTemplateTaskId as string);

  // 태스크 추가 성공 시 페이지 새로고침
  const handleAddSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  // 메인 태스크 접기/펼치기
  const toggleExpand = useCallback((taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // isActive 토글
  const toggleActive = useCallback(
    async (task: TaskWithChildren) => {
      if (!isAdmin) return;

      setTogglingIds((prev) => new Set(prev).add(task.id));

      try {
        const res = await fetch(`/api/projects/${projectId}/tasks-v2`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: task.id,
            isActive: !task.isActive,
            version: task.version,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update task");
        }

        const updated = await res.json();

        // 로컬 상태 업데이트
        setLocalTasks((prev) =>
          prev.map((t) => {
            if (t.id === task.id) {
              return { ...t, isActive: updated.isActive, version: updated.version };
            }
            if (t.children.some((c) => c.id === task.id)) {
              return {
                ...t,
                children: t.children.map((c) =>
                  c.id === task.id
                    ? { ...c, isActive: updated.isActive, version: updated.version }
                    : c
                ),
              };
            }
            return t;
          })
        );

        toast.success(updated.isActive ? "단계가 표시됩니다" : "단계가 숨겨집니다");
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error ? error.message : "업데이트에 실패했습니다"
        );
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }
    },
    [isAdmin, projectId]
  );

  // completedDate 빠른 토글 (완료/취소)
  const toggleComplete = useCallback(
    async (task: TaskWithChildren) => {
      if (!isAdmin) return;

      setTogglingIds((prev) => new Set(prev).add(task.id));

      // 현재 완료 상태의 반대로 설정
      const newCompletedDate = task.completedDate ? null : new Date().toISOString();

      // 낙관적 업데이트
      setLocalTasks((prev) =>
        prev.map((t) => {
          if (t.id === task.id) {
            return { ...t, completedDate: newCompletedDate };
          }
          if (t.children.some((c) => c.id === task.id)) {
            return {
              ...t,
              children: t.children.map((c) =>
                c.id === task.id ? { ...c, completedDate: newCompletedDate } : c
              ),
            };
          }
          return t;
        })
      );

      try {
        const res = await fetch(`/api/projects/${projectId}/tasks-v2/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completedDate: newCompletedDate,
            version: task.version,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update task");
        }

        const updated = await res.json();

        // 서버 응답으로 상태 갱신 (version 등)
        setLocalTasks((prev) =>
          prev.map((t) => {
            if (t.id === task.id) {
              return { ...t, completedDate: updated.completedDate, version: updated.version };
            }
            if (t.children.some((c) => c.id === task.id)) {
              return {
                ...t,
                children: t.children.map((c) =>
                  c.id === task.id
                    ? { ...c, completedDate: updated.completedDate, version: updated.version }
                    : c
                ),
              };
            }
            return t;
          })
        );

        toast.success(updated.completedDate ? "완료 처리되었습니다" : "완료가 취소되었습니다");
      } catch (error) {
        console.error(error);
        // 실패 시 원래 상태로 복원
        setLocalTasks((prev) =>
          prev.map((t) => {
            if (t.id === task.id) {
              return { ...t, completedDate: task.completedDate };
            }
            if (t.children.some((c) => c.id === task.id)) {
              return {
                ...t,
                children: t.children.map((c) =>
                  c.id === task.id ? { ...c, completedDate: task.completedDate } : c
                ),
              };
            }
            return t;
          })
        );
        toast.error(
          error instanceof Error ? error.message : "업데이트에 실패했습니다"
        );
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }
    },
    [isAdmin, projectId]
  );

  // 하위 태스크 추가
  const handleAddSubtask = useCallback(
    async (parentId: string) => {
      if (!newSubtaskName.trim()) return;

      setIsAddingSubtask(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks-v2`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId,
            name: newSubtaskName.trim(),
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to add subtask");
        }

        const newTask = await res.json();

        // 로컬 상태 업데이트
        setLocalTasks((prev) =>
          prev.map((t) =>
            t.id === parentId
              ? { ...t, children: [...t.children, newTask] }
              : t
          )
        );

        setNewSubtaskName("");
        setAddingToParentId(null);
        toast.success("하위 태스크가 추가되었습니다");
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error ? error.message : "추가에 실패했습니다"
        );
      } finally {
        setIsAddingSubtask(false);
      }
    },
    [projectId, newSubtaskName]
  );

  // 활성/숨김 태스크 분리
  const activeTasks = localTasks.filter((t) => t.isActive);
  const hiddenTasks = localTasks.filter((t) => !t.isActive);

  // 하위 태스크의 완료 개수 계산
  const getProgress = (task: TaskWithChildren) => {
    const activeChildren = task.children.filter((c) => c.isActive);
    const completed = activeChildren.filter((c) => c.completedDate !== null).length;
    return { completed, total: activeChildren.length };
  };

  // CLIENT 뷰
  if (isClient) {
    return (
      <>
        {/* 상단 요약 (hideProgressSummary가 false일 때만 표시) */}
        {!hideProgressSummary && <ClientProgressSummary tasks={localTasks} />}

        {/* 전체 단계 목록 (접기/펼치기) */}
        <Card>
          <Collapsible open={isListExpanded} onOpenChange={setIsListExpanded}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">전체 단계</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {isListExpanded ? "접기" : "펼치기"}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isListExpanded && "rotate-180"
                      )}
                    />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-2 pt-0">
                {activeTasks.map((task) => (
                  <ClientTaskItem key={task.id} task={task} />
                ))}
                {activeTasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    등록된 단계가 없습니다
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </>
    );
  }

  // ADMIN 뷰
  return (
    <div className="space-y-4">
      {/* ADMIN 상단: 주의 필요 */}
      <AdminTaskAlert tasks={localTasks} />

      {/* 진행단계 - 접기/펼치기 */}
      <Card>
        <Collapsible open={isTaskListExpanded} onOpenChange={setIsTaskListExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">진행 단계</CardTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {isTaskListExpanded ? "접기" : "펼치기"}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isTaskListExpanded && "rotate-180"
                      )}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {hiddenTasks.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="showHidden"
                        checked={showHidden}
                        onCheckedChange={(checked) => setShowHidden(checked === true)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label
                        htmlFor="showHidden"
                        className="text-sm text-muted-foreground cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        숨긴 단계 ({hiddenTasks.length})
                      </label>
                    </div>
                  )}
                  {isAdmin && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <AddTaskFromTemplate
                        projectId={projectId}
                        existingTemplateIds={existingTemplateIds}
                        onSuccess={handleAddSuccess}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-2 pt-0">
              {/* 활성 태스크 */}
              {activeTasks.map((task) => (
                <MainTaskItem
                  key={task.id}
                  task={task}
                  isExpanded={expandedTasks.has(task.id)}
                  onToggleExpand={() => toggleExpand(task.id)}
                  onToggleActive={() => toggleActive(task)}
                  isAdmin={isAdmin}
                  isClient={isClient}
                  isToggling={togglingIds.has(task.id)}
                  getProgress={getProgress}
                  togglingIds={togglingIds}
                  onToggleChildActive={toggleActive}
                  onToggleChildComplete={toggleComplete}
                  onTaskClick={handleTaskClick}
                  addingToParentId={addingToParentId}
                  setAddingToParentId={setAddingToParentId}
                  newSubtaskName={newSubtaskName}
                  setNewSubtaskName={setNewSubtaskName}
                  isAddingSubtask={isAddingSubtask}
                  onAddSubtask={handleAddSubtask}
                  highlightTaskId={highlightTaskId}
                />
              ))}

              {/* 숨긴 태스크 섹션 */}
              {showHidden && hiddenTasks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed">
                  <p className="text-sm text-muted-foreground mb-2">
                    숨긴 항목 ({hiddenTasks.length}개)
                  </p>
                  <div className="space-y-2 opacity-60">
                    {hiddenTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded">
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm line-through">{task.name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(task)}
                          disabled={togglingIds.has(task.id)}
                        >
                          {togglingIds.has(task.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "복원"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {localTasks.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  등록된 단계가 없습니다
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* 태스크 상세 Sheet - Card 밖에 */}
      {selectedTaskId && (
        <TaskDetailSheet
          projectId={projectId}
          taskId={selectedTaskId}
          isOpen={isSheetOpen}
          onClose={handleSheetClose}
          onUpdate={handleTaskUpdate}
          isAdmin={isAdmin}
          hasTaskDetailFeature={hasTaskDetailFeature}
        />
      )}
    </div>
  );
}

// 메인 태스크 아이템
interface MainTaskItemProps {
  task: TaskWithChildren;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  isAdmin: boolean;
  isClient: boolean;
  isToggling: boolean;
  isHidden?: boolean;
  getProgress: (task: TaskWithChildren) => { completed: number; total: number };
  togglingIds: Set<string>;
  onToggleChildActive: (task: TaskWithChildren) => void;
  onToggleChildComplete: (task: TaskWithChildren) => void;
  onTaskClick: (taskId: string) => void;
  addingToParentId: string | null;
  setAddingToParentId: (id: string | null) => void;
  newSubtaskName: string;
  setNewSubtaskName: (name: string) => void;
  isAddingSubtask: boolean;
  onAddSubtask: (parentId: string) => void;
  highlightTaskId?: string | null;
}

function MainTaskItem({
  task,
  isExpanded,
  onToggleExpand,
  onToggleActive,
  isAdmin,
  isClient,
  isToggling,
  isHidden = false,
  getProgress,
  togglingIds,
  onToggleChildActive,
  onToggleChildComplete,
  onTaskClick,
  addingToParentId,
  setAddingToParentId,
  newSubtaskName,
  setNewSubtaskName,
  isAddingSubtask,
  onAddSubtask,
  highlightTaskId,
}: MainTaskItemProps) {
  const progress = getProgress(task);
  const mainStatus = getMainTaskStatus(task);
  const dday = getDday(task.dueDate, task.completedDate);

  return (
    <div
      id={`task-${task.id}`}
      className={cn(
        "border rounded-lg overflow-hidden transition-all",
        isHidden ? "opacity-50 bg-muted/30" : mainStatus.bgColor,
        highlightTaskId === task.id && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* 메인 태스크 헤더 */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3",
          !isClient && task.children.length > 0 && "cursor-pointer"
        )}
        onClick={() => !isClient && task.children.length > 0 && onToggleExpand()}
      >
        {/* 펼침/접힘 아이콘 - CLIENT면 숨김 */}
        {!isClient && task.children.length > 0 ? (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-6" />
        )}

        {/* 상태 아이콘 - 크게 */}
        {mainStatus.status === "completed" ? (
          <CheckCircle2 className={cn("h-6 w-6 shrink-0", mainStatus.iconColor)} />
        ) : mainStatus.status === "submitted" ? (
          <FileCheck className={cn("h-6 w-6 shrink-0", mainStatus.iconColor)} />
        ) : mainStatus.status === "in_progress" ? (
          <Clock className={cn("h-6 w-6 shrink-0", mainStatus.iconColor)} />
        ) : (
          <Circle className={cn("h-6 w-6 shrink-0", mainStatus.iconColor)} />
        )}

        {/* 단계명 + 날짜 정보 */}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-medium truncate",
              !isClient && "hover:underline cursor-pointer",
              isClient && "cursor-default",
              isHidden && "line-through text-muted-foreground",
              mainStatus.status === "completed" && "text-green-700"
            )}
            onClick={(e) => {
              if (!isClient) {
                e.stopPropagation();
                onTaskClick(task.id);
              }
            }}
          >
            {task.name}
          </div>

          {/* 완료일 표시 */}
          {mainStatus.status === "completed" && task.completedDate && (
            <div className="text-sm text-green-600">
              {formatCompletedDate(task.completedDate)}
            </div>
          )}

          {/* 접수 정보 표시 (인허가) */}
          {mainStatus.status === "submitted" && task.submittedDate && (
            <div className="text-sm text-blue-600">
              {formatSubmittedInfo(task.submittedDate, task.dueDate)}
            </div>
          )}
        </div>

        {/* 상태 Badge */}
        <Badge className={cn("shrink-0", mainStatus.badgeColor)}>
          {mainStatus.label}
        </Badge>

        {/* D-day (접수완료 인허가만) */}
        {mainStatus.status === "submitted" && dday && (
          <Badge
            variant={dday.status === "overdue" ? "destructive" : "outline"}
            className={cn(
              "shrink-0",
              dday.status === "soon" && "bg-yellow-500 text-white border-yellow-500"
            )}
          >
            {dday.text}
          </Badge>
        )}

        {/* 진행률 [n/m] - ADMIN만 */}
        {!isClient && task.children.length > 0 && (
          <span className="text-sm text-muted-foreground shrink-0">
            [{progress.completed}/{progress.total}]
          </span>
        )}

        {/* 숨김/보임 토글 - ADMIN만, 데스크톱만 */}
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 hidden md:flex",
              !task.isActive && "bg-muted"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive();
            }}
            disabled={isToggling}
            title={task.isActive ? "숨기기" : "다시 보이기"}
          >
            {isToggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : task.isActive ? (
              <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            ) : (
              <EyeOff className="h-4 w-4 text-orange-500" />
            )}
          </Button>
        )}
      </div>

      {/* 하위 태스크 - CLIENT면 숨김 */}
      {!isClient && isExpanded && task.children.length > 0 && (
        <div className="border-t bg-white">
          {task.children
            .filter((child) => child.isActive || isHidden)
            .map((child, index, arr) => (
              <ChildTaskItem
                key={child.id}
                task={child}
                isLast={index === arr.length - 1 && !isAdmin}
                isAdmin={isAdmin}
                isToggling={togglingIds.has(child.id)}
                onToggleActive={() => onToggleChildActive(child)}
                onToggleComplete={() => onToggleChildComplete(child)}
                isParentHidden={isHidden}
                onTaskClick={onTaskClick}
                highlightTaskId={highlightTaskId}
              />
            ))}

          {/* 하위 태스크 추가 */}
          {isAdmin && isExpanded && (
            <div className="px-3 py-2 pl-11 border-t border-dashed">
              {addingToParentId === task.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm w-4">+</span>
                  <Input
                    value={newSubtaskName}
                    onChange={(e) => setNewSubtaskName(e.target.value)}
                    placeholder="새 하위 태스크명"
                    className="h-8 text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onAddSubtask(task.id);
                      } else if (e.key === "Escape") {
                        setAddingToParentId(null);
                        setNewSubtaskName("");
                      }
                    }}
                    autoFocus
                    disabled={isAddingSubtask}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAddSubtask(task.id)}
                    disabled={isAddingSubtask || !newSubtaskName.trim()}
                  >
                    {isAddingSubtask ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "추가"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAddingToParentId(null);
                      setNewSubtaskName("");
                    }}
                    disabled={isAddingSubtask}
                  >
                    취소
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setAddingToParentId(task.id)}
                >
                  <Plus className="h-4 w-4" />
                  태스크 추가
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 하위 태스크 아이템
interface ChildTaskItemProps {
  task: TaskWithChildren;
  isLast: boolean;
  isAdmin: boolean;
  isToggling: boolean;
  onToggleActive: () => void;
  onToggleComplete: () => void;
  isParentHidden?: boolean;
  onTaskClick: (taskId: string) => void;
  highlightTaskId?: string | null;
}

function ChildTaskItem({
  task,
  isLast,
  isAdmin,
  isToggling,
  onToggleActive,
  onToggleComplete,
  isParentHidden = false,
  onTaskClick,
  highlightTaskId,
}: ChildTaskItemProps) {
  const isCompleted = task.completedDate !== null;
  const isHidden = !task.isActive;
  const dday = getDday(task.dueDate, task.completedDate);
  const dateRange = formatDateRange(task.startDate, task.dueDate);
  const checklistCount = task.checklistCount || { total: 0, checked: 0 };

  return (
    <div
      id={`task-${task.id}`}
      className={cn(
        "flex items-center gap-2 px-3 py-2 pl-4 md:pl-8 transition-all",
        !isLast && "border-b border-dashed",
        (isHidden || isParentHidden) && "opacity-50 bg-muted/20",
        highlightTaskId === task.id && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* 완료 상태 - Admin이면 클릭 가능 */}
      {isAdmin ? (
        <button
          type="button"
          onClick={onToggleComplete}
          disabled={isToggling}
          className={cn(
            "shrink-0 transition-transform hover:scale-110 disabled:opacity-50",
            isCompleted && "text-green-500 hover:text-green-600",
            !isCompleted && "text-muted-foreground hover:text-foreground"
          )}
          title={isCompleted ? "완료 취소" : "완료 처리"}
        >
          {isToggling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : dday?.status === "overdue" ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : dday?.status === "soon" ? (
            <Clock className="h-4 w-4 text-yellow-500" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>
      ) : (
        // Admin이 아닌 경우 기존처럼 아이콘만 표시
        isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        ) : dday?.status === "overdue" ? (
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
        ) : dday?.status === "soon" ? (
          <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
        )
      )}

      {/* 태스크명 - 모바일 2줄, 데스크톱 1줄 */}
      <button
        type="button"
        className={cn(
          "flex-1 text-sm text-left hover:underline",
          "line-clamp-2 md:line-clamp-1",
          isCompleted && "text-muted-foreground",
          isHidden && "line-through text-muted-foreground"
        )}
        onClick={() => onTaskClick(task.id)}
      >
        {task.name}
      </button>

      {/* 체크리스트 카운트 - 클릭 시 상세 시트 열기 */}
      {checklistCount.total > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTaskClick(task.id);
          }}
          className="text-xs text-blue-500 hover:text-blue-700 hover:underline shrink-0 flex items-center gap-0.5"
          title="체크리스트 보기"
        >
          <ListChecks className="h-3 w-3" />
          {checklistCount.checked}/{checklistCount.total}
        </button>
      )}

      {/* 날짜 */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {dateRange}
      </span>

      {/* D-day 표시 */}
      {dday && (
        <Badge
          variant={
            dday.status === "completed"
              ? "default"
              : dday.status === "overdue"
              ? "destructive"
              : dday.status === "soon"
              ? "secondary"
              : "outline"
          }
          className={cn(
            "text-xs shrink-0",
            dday.status === "completed" && "bg-green-500",
            dday.status === "soon" && "bg-yellow-500 text-yellow-950"
          )}
        >
          {dday.text}
        </Badge>
      )}

      {/* 숨김/보임 토글 (ADMIN만, 데스크톱만) */}
      {isAdmin && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 shrink-0 hidden md:flex",
            !task.isActive && "bg-muted"
          )}
          onClick={onToggleActive}
          disabled={isToggling}
          title={task.isActive ? "숨기기" : "다시 보이기"}
        >
          {isToggling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : task.isActive ? (
            <Eye className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          ) : (
            <EyeOff className="h-3 w-3 text-orange-500" />
          )}
        </Button>
      )}
    </div>
  );
}

// CLIENT용 간소화된 태스크 아이템
function ClientTaskItem({ task }: { task: TaskWithChildren }) {
  const mainStatus = getMainTaskStatus(task);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border",
        mainStatus.bgColor
      )}
    >
      {/* 상태 아이콘 */}
      {mainStatus.status === "completed" ? (
        <CheckCircle2 className={cn("h-5 w-5 shrink-0", mainStatus.iconColor)} />
      ) : mainStatus.status === "submitted" ? (
        <FileCheck className={cn("h-5 w-5 shrink-0", mainStatus.iconColor)} />
      ) : mainStatus.status === "in_progress" ? (
        <Clock className={cn("h-5 w-5 shrink-0", mainStatus.iconColor)} />
      ) : (
        <Circle className={cn("h-5 w-5 shrink-0", mainStatus.iconColor)} />
      )}

      {/* 단계명 + 완료일 */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "font-medium truncate",
            mainStatus.status === "completed" && "text-green-700"
          )}
        >
          {task.name}
        </div>
        {mainStatus.status === "completed" && task.completedDate && (
          <div className="text-sm text-green-600">
            {formatCompletedDate(task.completedDate)}
          </div>
        )}
        {mainStatus.status === "submitted" && task.submittedDate && (
          <div className="text-sm text-blue-600">
            {formatSubmittedInfo(task.submittedDate, task.dueDate)}
          </div>
        )}
      </div>

      {/* 상태 배지 */}
      <Badge className={cn("shrink-0", mainStatus.badgeColor)}>
        {mainStatus.label}
      </Badge>
    </div>
  );
}
