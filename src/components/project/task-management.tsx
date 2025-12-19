"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check,
  Circle,
  Square,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  StickyNote,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Task type labels in Korean
const taskTypeLabels: Record<string, string> = {
  SITE_SURVEY: "현장실측/조사",
  BUSINESS_PERMIT: "발전사업허가",
  DEVELOPMENT_PERMIT: "개발행위허가",
  CONTRACT: "도급계약",
  STRUCTURE_DRAWING: "구조물도면/구조검토",
  ELECTRICAL_DRAWING: "전기도면",
  CONSTRUCTION_PLAN: "공사계획신고",
  CONSTRUCTION: "시공",
  PPA_APPLICATION: "PPA신청",
  PRE_USE_INSPECTION: "사용전검사",
  DEVELOPMENT_COMPLETION: "개발행위준공",
  BUSINESS_START: "사업개시신고",
  FACILITY_CONFIRM: "설비확인",
  CUSTOM: "커스텀 단계",
};

// Get display name for a task (use customName if available)
function getTaskDisplayName(taskType: string, customName?: string | null): string {
  if (customName) {
    return customName;
  }
  return taskTypeLabels[taskType] || taskType;
}

// Task status labels in Korean
const taskStatusLabels: Record<string, string> = {
  NOT_STARTED: "대기",
  IN_PROGRESS: "진행중",
  SUBMITTED: "접수",
  COMPLETED: "완료",
};

// Status colors
const statusColors: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-700 border-gray-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  SUBMITTED: "bg-amber-100 text-amber-700 border-amber-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
};

interface Task {
  id: string;
  taskType: string;
  customName: string | null;
  status: string;
  displayOrder: number;
  note: string | null;
  completedAt: string | null;
}

interface TaskManagementProps {
  projectId: string;
  tasks: Task[];
}

export function TaskManagement({ projectId, tasks }: TaskManagementProps) {
  const router = useRouter();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [datePickerTaskId, setDatePickerTaskId] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ taskId: string; status: string } | null>(null);

  // Add task dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Delete task dialog
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit name dialog
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingName, setEditingName] = useState("");

  // Sort tasks by displayOrder
  const sortedTasks = [...tasks].sort((a, b) => a.displayOrder - b.displayOrder);

  // Calculate progress
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const updateTask = useCallback(
    async (taskId: string, data: { status?: string; note?: string; completedAt?: string }) => {
      setUpdatingTasks((prev) => new Set(prev).add(taskId));

      try {
        const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update task");
        }

        router.refresh();
      } catch (error) {
        console.error("Update task error:", error);
        alert(error instanceof Error ? error.message : "작업 업데이트에 실패했습니다.");
      } finally {
        setUpdatingTasks((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [projectId, router]
  );

  const handleStatusChange = (taskId: string, status: string) => {
    if (status === "COMPLETED") {
      // Show date picker for completion date
      setPendingStatusChange({ taskId, status });
      setDatePickerTaskId(taskId);
    } else {
      updateTask(taskId, { status });
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (pendingStatusChange && date) {
      // Complete with selected date
      updateTask(pendingStatusChange.taskId, {
        status: pendingStatusChange.status,
        completedAt: date.toISOString(),
      });
      setPendingStatusChange(null);
      setDatePickerTaskId(null);
    } else if (datePickerTaskId && date) {
      // Update only completedAt for already completed task
      updateTask(datePickerTaskId, {
        completedAt: date.toISOString(),
      });
      setDatePickerTaskId(null);
    }
  };

  const handleDatePickerClose = () => {
    if (pendingStatusChange) {
      // If closing without selecting date, complete with today
      updateTask(pendingStatusChange.taskId, {
        status: pendingStatusChange.status,
        completedAt: new Date().toISOString(),
      });
    }
    setPendingStatusChange(null);
    setDatePickerTaskId(null);
  };

  const handleReorder = useCallback(
    async (taskId: string, direction: "up" | "down") => {
      const currentIndex = sortedTasks.findIndex((t) => t.id === taskId);
      if (currentIndex === -1) return;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= sortedTasks.length) return;

      // Create new order by swapping
      const newOrder = [...sortedTasks];
      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
      const taskIds = newOrder.map((t) => t.id);

      setUpdatingTasks((prev) => new Set(prev).add(taskId));

      try {
        const response = await fetch(`/api/projects/${projectId}/tasks/reorder`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIds }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to reorder tasks");
        }

        router.refresh();
      } catch (error) {
        console.error("Reorder error:", error);
        alert(error instanceof Error ? error.message : "순서 변경에 실패했습니다.");
      } finally {
        setUpdatingTasks((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [sortedTasks, projectId, router]
  );

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customName: newTaskName.trim(),
          taskType: "CUSTOM",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add task");
      }

      setIsAddDialogOpen(false);
      setNewTaskName("");
      router.refresh();
    } catch (error) {
      console.error("Add task error:", error);
      alert(error instanceof Error ? error.message : "단계 추가에 실패했습니다.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${deleteTaskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete task");
      }

      setDeleteTaskId(null);
      router.refresh();
    } catch (error) {
      console.error("Delete task error:", error);
      alert(error instanceof Error ? error.message : "단계 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateTaskName = async () => {
    if (!editingTask || !editingName.trim()) return;

    setUpdatingTasks((prev) => new Set(prev).add(editingTask.id));
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customName: editingName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update task name");
      }

      setEditingTask(null);
      setEditingName("");
      router.refresh();
    } catch (error) {
      console.error("Update task name error:", error);
      alert(error instanceof Error ? error.message : "단계명 수정에 실패했습니다.");
    } finally {
      setUpdatingTasks((prev) => {
        const next = new Set(prev);
        next.delete(editingTask.id);
        return next;
      });
    }
  };

  const handleNoteBlur = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const localNote = localNotes[taskId];

    // Only update if note has changed
    if (localNote !== undefined && localNote !== (task?.note || "")) {
      updateTask(taskId, { note: localNote });
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Check className="h-4 w-4 text-green-600" />;
      case "IN_PROGRESS":
      case "SUBMITTED":
        return <Circle className="h-4 w-4 text-blue-600" />;
      default:
        return <Square className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">작업 진행 현황</CardTitle>
          <Badge variant="outline" className="text-sm">
            {completedCount} / {tasks.length} 완료
          </Badge>
        </div>
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">전체 진행률</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedTasks.map((task, index) => {
          const isExpanded = expandedTaskId === task.id;
          const isUpdating = updatingTasks.has(task.id);
          const noteValue = localNotes[task.id] ?? task.note ?? "";

          return (
            <div
              key={task.id}
              className={cn(
                "border rounded-lg transition-all",
                isExpanded ? "bg-muted/30" : "bg-background hover:bg-muted/20"
              )}
            >
              {/* Task Row */}
              <div className="flex items-center gap-3 p-3">
                {/* Order Number */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {index + 1}
                </div>

                {/* Status Icon */}
                <div className="flex-shrink-0">{getStatusIcon(task.status)}</div>

                {/* Task Name */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm truncate block">
                    {getTaskDisplayName(task.taskType, task.customName)}
                  </span>
                  {task.completedAt && (
                    <Popover
                      open={datePickerTaskId === task.id && !pendingStatusChange}
                      onOpenChange={(open) => {
                        if (!open) {
                          setDatePickerTaskId(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 hover:text-foreground transition-colors cursor-pointer"
                          onClick={() => setDatePickerTaskId(task.id)}
                        >
                          <Calendar className="h-3 w-3" />
                          {new Date(task.completedAt).toLocaleDateString("ko-KR")}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={task.completedAt ? new Date(task.completedAt) : undefined}
                          onSelect={handleDateSelect}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Note indicator */}
                {task.note && !isExpanded && (
                  <StickyNote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}

                {/* Status Dropdown */}
                <div className="flex-shrink-0">
                  <Popover
                    open={datePickerTaskId === task.id && !!pendingStatusChange}
                    onOpenChange={(open) => {
                      if (!open) {
                        handleDatePickerClose();
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <div>
                        <Select
                          value={task.status}
                          onValueChange={(value) => handleStatusChange(task.id, value)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger
                            className={cn(
                              "w-24 h-8 text-xs font-medium border",
                              statusColors[task.status]
                            )}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(taskStatusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value} className="text-xs">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium">완료 날짜 선택</p>
                        <p className="text-xs text-muted-foreground">날짜를 선택하거나 닫으면 오늘 날짜로 저장됩니다</p>
                      </div>
                      <CalendarComponent
                        mode="single"
                        selected={new Date()}
                        onSelect={handleDateSelect}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Expand Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => toggleExpand(task.id)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {/* Reorder Buttons */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-6 p-0"
                    onClick={() => handleReorder(task.id, "up")}
                    disabled={index === 0 || isUpdating}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-6 p-0"
                    onClick={() => handleReorder(task.id, "down")}
                    disabled={index === sortedTasks.length - 1 || isUpdating}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Edit Name Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => {
                    setEditingTask(task);
                    setEditingName(task.customName || taskTypeLabels[task.taskType] || task.taskType);
                  }}
                  disabled={isUpdating}
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0 hover:text-destructive"
                  onClick={() => setDeleteTaskId(task.id)}
                  disabled={isUpdating}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>

              {/* Expanded Note Section */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-0">
                  <div className="pl-9">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      메모
                    </label>
                    <Textarea
                      placeholder="작업에 대한 메모를 입력하세요..."
                      value={noteValue}
                      onChange={(e) =>
                        setLocalNotes((prev) => ({
                          ...prev,
                          [task.id]: e.target.value,
                        }))
                      }
                      onBlur={() => handleNoteBlur(task.id)}
                      className="min-h-20 text-sm resize-none"
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            등록된 작업이 없습니다.
          </div>
        )}

        {/* Add Task Button */}
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          단계 추가
        </Button>
      </CardContent>

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>단계 추가</DialogTitle>
            <DialogDescription>
              새로운 작업 단계를 추가합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="단계명 입력 (예: 추가 인허가)"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddTask();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddTask} disabled={!newTaskName.trim() || isAdding}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Name Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>단계명 수정</DialogTitle>
            <DialogDescription>
              단계의 이름을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="단계명 입력"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUpdateTaskName();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>
              취소
            </Button>
            <Button
              onClick={handleUpdateTaskName}
              disabled={!editingName.trim() || !!(editingTask && updatingTasks.has(editingTask.id))}
            >
              {editingTask && updatingTasks.has(editingTask.id) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>단계 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTaskId && tasks.find((t) => t.id === deleteTaskId)?.status === "COMPLETED" ? (
                <span className="text-destructive font-medium">
                  주의: 이미 완료된 단계입니다. 삭제하면 복구할 수 없습니다.
                </span>
              ) : (
                "이 단계를 삭제하시겠습니까? 삭제된 단계는 복구할 수 없습니다."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
