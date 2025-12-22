"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { TodoPriority } from "@prisma/client";

interface DashboardTodo {
  id: string;
  title: string;
  dueDate: string | null;
  priority: TodoPriority;
  assigneeId: string | null;
  project: { id: string; name: string };
}

interface DashboardTodoListProps {
  todos: DashboardTodo[];
  currentUserId: string;
}

const priorityConfig: Record<
  TodoPriority,
  { label: string; color: string; icon: string; bgColor: string }
> = {
  HIGH: { label: "높음", color: "text-red-500", icon: "🔴", bgColor: "bg-red-50" },
  MEDIUM: { label: "보통", color: "text-yellow-500", icon: "🟡", bgColor: "bg-yellow-50" },
  LOW: { label: "낮음", color: "text-green-500", icon: "🟢", bgColor: "bg-green-50" },
};

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

export function DashboardTodoList({
  todos,
  currentUserId,
}: DashboardTodoListProps) {
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  // 필터링
  const filteredTodos = showOnlyMine
    ? todos.filter((t) => t.assigneeId === currentUserId)
    : todos;

  // 완료 처리 함수
  const handleComplete = async (todo: DashboardTodo) => {
    setCompletingIds((prev) => new Set([...prev, todo.id]));

    try {
      const res = await fetch(
        `/api/projects/${todo.project.id}/todos/${todo.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        }
      );

      if (!res.ok) throw new Error("Failed to complete todo");

      toast.success(`"${todo.title}" 완료!`);
      window.location.reload();
    } catch (error) {
      toast.error("완료 처리에 실패했습니다");
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(todo.id);
        return next;
      });
    }
  };

  if (filteredTodos.length === 0) {
    return null;
  }

  // 기한 초과 / 이번 주 / 나머지로 분류
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTodos = filteredTodos.filter((t) => {
    if (!t.dueDate) return false;
    return getDdayNumber(t.dueDate) < 0;
  });

  const thisWeekTodos = filteredTodos.filter((t) => {
    if (!t.dueDate) return false;
    const dday = getDdayNumber(t.dueDate);
    return dday >= 0 && dday <= 7;
  });

  const highPriorityTodos = filteredTodos.filter((t) => {
    if (t.dueDate) {
      const dday = getDdayNumber(t.dueDate);
      if (dday < 0 || (dday >= 0 && dday <= 7)) return false;
    }
    return t.priority === "HIGH";
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />할 일
            <Badge variant="outline">{filteredTodos.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox
              id="showOnlyMineTodo"
              checked={showOnlyMine}
              onCheckedChange={(checked) => setShowOnlyMine(checked === true)}
            />
            <label htmlFor="showOnlyMineTodo" className="text-sm cursor-pointer">
              내 담당만
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 기한 초과 */}
        {overdueTodos.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600 flex items-center gap-1">
              기한 초과 ({overdueTodos.length})
            </p>
            {overdueTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                variant="overdue"
                onComplete={() => handleComplete(todo)}
                isCompleting={completingIds.has(todo.id)}
              />
            ))}
          </div>
        )}

        {/* 이번 주 마감 */}
        {thisWeekTodos.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-yellow-600 flex items-center gap-1">
              이번 주 마감 ({thisWeekTodos.length})
            </p>
            {thisWeekTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                variant="soon"
                onComplete={() => handleComplete(todo)}
                isCompleting={completingIds.has(todo.id)}
              />
            ))}
          </div>
        )}

        {/* 높은 우선순위 */}
        {highPriorityTodos.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-500 flex items-center gap-1">
              🔴 높은 우선순위 ({highPriorityTodos.length})
            </p>
            {highPriorityTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                variant="high"
                onComplete={() => handleComplete(todo)}
                isCompleting={completingIds.has(todo.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TodoItem({
  todo,
  variant,
  onComplete,
  isCompleting,
}: {
  todo: DashboardTodo;
  variant: "overdue" | "soon" | "high";
  onComplete: () => void;
  isCompleting: boolean;
}) {
  const bgColors = {
    overdue: "bg-red-100 hover:bg-red-200",
    soon: "bg-yellow-100 hover:bg-yellow-200",
    high: "bg-red-50 hover:bg-red-100",
  };

  const dday = todo.dueDate ? getDdayNumber(todo.dueDate) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        bgColors[variant]
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

      {/* 프로젝트 > 할 일 */}
      <Link
        href={`/admin/projects/${todo.project.id}?tab=todos`}
        className="flex-1 min-w-0 text-sm"
      >
        <span className="text-muted-foreground">{todo.project.name}</span>
        <span className="text-muted-foreground mx-1">›</span>
        <span className="font-medium hover:underline">{todo.title}</span>
        <span className="ml-2">{priorityConfig[todo.priority].icon}</span>
      </Link>

      {/* D-day */}
      {dday !== null && (
        <Badge
          variant={variant === "overdue" ? "destructive" : "secondary"}
          className={cn(variant === "soon" && "bg-yellow-500 text-white")}
        >
          {getDdayText(dday)}
        </Badge>
      )}
    </div>
  );
}
