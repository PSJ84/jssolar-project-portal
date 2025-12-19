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
import {
  Check,
  Circle,
  Square,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  StickyNote,
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
  PPA_APPLICATION: "PPA신청",
  PRE_USE_INSPECTION: "사용전검사",
  DEVELOPMENT_COMPLETION: "개발행위준공",
  BUSINESS_START: "사업개시신고",
  FACILITY_CONFIRM: "설비확인",
};

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

  // Sort tasks by displayOrder
  const sortedTasks = [...tasks].sort((a, b) => a.displayOrder - b.displayOrder);

  // Calculate progress
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const updateTask = useCallback(
    async (taskId: string, data: { status?: string; note?: string }) => {
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
    updateTask(taskId, { status });
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
                    {taskTypeLabels[task.taskType] || task.taskType}
                  </span>
                  {task.completedAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.completedAt).toLocaleDateString("ko-KR")}
                    </div>
                  )}
                </div>

                {/* Note indicator */}
                {task.note && !isExpanded && (
                  <StickyNote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}

                {/* Status Dropdown */}
                <div className="flex-shrink-0">
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
      </CardContent>
    </Card>
  );
}
