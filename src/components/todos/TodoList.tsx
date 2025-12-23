"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
  ListTodo,
  Edit,
  CalendarIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { TodoPriority } from "@prisma/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface TodoUser {
  id: string;
  name: string | null;
}

interface Todo {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TodoPriority;
  assignee: TodoUser | null;
  createdBy: TodoUser;
  completedBy: TodoUser | null;
  completedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMember {
  id: string;
  name: string | null;
}

interface TodoListProps {
  projectId: string;
  isAdmin: boolean;
  members?: ProjectMember[];
  initialTodos?: Todo[];
}

const priorityConfig: Record<
  TodoPriority,
  { label: string; color: string; icon: string }
> = {
  HIGH: { label: "높음", color: "text-red-500", icon: "🔴" },
  MEDIUM: { label: "보통", color: "text-yellow-500", icon: "🟡" },
  LOW: { label: "낮음", color: "text-green-500", icon: "🟢" },
};

export function TodoList({ projectId, isAdmin, members = [], initialTodos }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos || []);
  const [loading, setLoading] = useState(!initialTodos);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"priority" | "dueDate" | "createdAt">(
    "priority"
  );

  // 폼 상태
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDueDate, setFormDueDate] = useState<Date | undefined>(undefined);
  const [formPriority, setFormPriority] = useState<TodoPriority>("MEDIUM");
  const [formAssigneeId, setFormAssigneeId] = useState<string>("__none__");
  const [formCompletedDate, setFormCompletedDate] = useState<string | null>(null);

  // 할 일 목록 조회
  const fetchTodos = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/todos`);
      if (!res.ok) throw new Error("Failed to fetch todos");
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.error("Error fetching todos:", error);
      toast.error("할 일 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initialTodos가 제공되면 fetch 건너뜀 (서버에서 이미 데이터 로드됨)
    if (!initialTodos) {
      fetchTodos();
    }
  }, [projectId]);

  // 정렬된 할 일 목록
  const sortedTodos = [...todos].sort((a, b) => {
    // 완료된 항목은 항상 맨 아래
    if (a.completedDate && !b.completedDate) return 1;
    if (!a.completedDate && b.completedDate) return -1;

    if (sortBy === "priority") {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    } else if (sortBy === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // 기한 초과 여부 확인
  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  // 폼 초기화
  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormDueDate(undefined);
    setFormPriority("MEDIUM");
    setFormAssigneeId("__none__");
    setFormCompletedDate(null);
  };

  // 할 일 추가
  const handleAdd = async () => {
    if (!formTitle.trim()) {
      toast.error("제목을 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          dueDate: formDueDate?.toISOString() || null,
          priority: formPriority,
          assigneeId: formAssigneeId === "__none__" ? null : formAssigneeId,
        }),
      });

      if (!res.ok) throw new Error("Failed to create todo");

      const newTodo = await res.json();
      setTodos((prev) => [newTodo, ...prev]);
      setAddDialogOpen(false);
      resetForm();
      toast.success("할 일이 추가되었습니다");
    } catch (error) {
      console.error("Error creating todo:", error);
      toast.error("할 일 추가에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  // 할 일 수정
  const handleEdit = async () => {
    if (!editingTodo || !formTitle.trim()) {
      toast.error("제목을 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/todos/${editingTodo.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            description: formDescription.trim() || null,
            dueDate: formDueDate?.toISOString() || null,
            priority: formPriority,
            assigneeId: formAssigneeId === "__none__" ? null : formAssigneeId,
            completedDate: formCompletedDate,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to update todo");

      const updatedTodo = await res.json();
      setTodos((prev) =>
        prev.map((t) => (t.id === updatedTodo.id ? updatedTodo : t))
      );
      setEditingTodo(null);
      resetForm();
      toast.success("할 일이 수정되었습니다");
    } catch (error) {
      console.error("Error updating todo:", error);
      toast.error("할 일 수정에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  // 완료 토글
  const handleToggleComplete = async (todo: Todo) => {
    setCompletingIds((prev) => new Set([...prev, todo.id]));

    try {
      const res = await fetch(`/api/projects/${projectId}/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !todo.completedDate }),
      });

      if (!res.ok) throw new Error("Failed to update todo");

      const updatedTodo = await res.json();
      setTodos((prev) =>
        prev.map((t) => (t.id === updatedTodo.id ? updatedTodo : t))
      );
      toast.success(
        todo.completedDate ? "완료 취소되었습니다" : "완료 처리되었습니다"
      );
    } catch (error) {
      console.error("Error toggling todo:", error);
      toast.error("상태 변경에 실패했습니다");
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(todo.id);
        return next;
      });
    }
  };

  // 삭제
  const handleDelete = async (todoId: string) => {
    setDeletingIds((prev) => new Set([...prev, todoId]));

    try {
      const res = await fetch(`/api/projects/${projectId}/todos/${todoId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete todo");

      setTodos((prev) => prev.filter((t) => t.id !== todoId));
      toast.success("할 일이 삭제되었습니다");
    } catch (error) {
      console.error("Error deleting todo:", error);
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(todoId);
        return next;
      });
    }
  };

  // 수정 다이얼로그 열기
  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setFormTitle(todo.title);
    setFormDescription(todo.description || "");
    setFormDueDate(todo.dueDate ? new Date(todo.dueDate) : undefined);
    setFormPriority(todo.priority);
    setFormAssigneeId(todo.assignee?.id || "__none__");
    setFormCompletedDate(todo.completedDate);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>할 일 목록 로딩 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = todos.filter((t) => t.completedDate).length;
  const pendingCount = todos.length - completedCount;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />할 일
            <Badge variant="outline">
              {pendingCount}개 진행중 / {completedCount}개 완료
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* 정렬 옵션 */}
            <Select
              value={sortBy}
              onValueChange={(v) =>
                setSortBy(v as "priority" | "dueDate" | "createdAt")
              }
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">우선순위순</SelectItem>
                <SelectItem value="dueDate">기한순</SelectItem>
                <SelectItem value="createdAt">최신순</SelectItem>
              </SelectContent>
            </Select>

            {/* 추가 버튼 - ADMIN만 */}
            {isAdmin && (
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>할 일 추가</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>
                        제목 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="할 일 제목"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>기한</Label>
                        <DatePicker
                          value={formDueDate}
                          onChange={setFormDueDate}
                          placeholder="기한 선택"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>우선순위</Label>
                        <Select
                          value={formPriority}
                          onValueChange={(v) =>
                            setFormPriority(v as TodoPriority)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorityConfig).map(
                              ([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  {config.icon} {config.label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {members.length > 0 && (
                      <div className="space-y-2">
                        <Label>담당자</Label>
                        <Select
                          value={formAssigneeId}
                          onValueChange={setFormAssigneeId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="담당자 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">미지정</SelectItem>
                            {members.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name || "이름 없음"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>메모</Label>
                      <Textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="상세 내용"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">취소</Button>
                    </DialogClose>
                    <Button onClick={handleAdd} disabled={submitting}>
                      {submitting && (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      )}
                      추가
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {todos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>등록된 할 일이 없습니다</p>
            {isAdmin && (
              <p className="text-sm mt-1">
                위의 &quot;추가&quot; 버튼을 눌러 할 일을 추가하세요
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTodos.map((todo) => (
              <div
                key={todo.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  todo.completedDate
                    ? "bg-muted/50 opacity-60"
                    : isOverdue(todo.dueDate)
                    ? "bg-red-50 border-red-200"
                    : "bg-card hover:bg-muted/50"
                )}
              >
                {/* 완료 체크박스 - ADMIN만 */}
                {isAdmin ? (
                  <button
                    onClick={() => handleToggleComplete(todo)}
                    disabled={completingIds.has(todo.id)}
                    className="mt-0.5 shrink-0"
                  >
                    {completingIds.has(todo.id) ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : todo.completedDate ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-green-500" />
                    )}
                  </button>
                ) : (
                  <div className="mt-0.5 shrink-0">
                    {todo.completedDate ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "font-medium",
                        todo.completedDate && "line-through"
                      )}
                    >
                      {todo.title}
                    </span>
                    <span className="text-sm">
                      {priorityConfig[todo.priority].icon}
                    </span>
                    {todo.assignee && (
                      <Badge variant="secondary" className="text-xs">
                        {todo.assignee.name || "담당자"}
                      </Badge>
                    )}
                  </div>
                  {todo.description && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {todo.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {todo.dueDate && (
                      <span
                        className={cn(
                          isOverdue(todo.dueDate) &&
                            !todo.completedDate &&
                            "text-red-500 font-medium"
                        )}
                      >
                        기한:{" "}
                        {new Date(todo.dueDate).toLocaleDateString("ko-KR")}
                        {isOverdue(todo.dueDate) &&
                          !todo.completedDate &&
                          " (초과)"}
                      </span>
                    )}
                    {todo.completedDate && (
                      <span className="text-green-600">
                        완료:{" "}
                        {new Date(todo.completedDate).toLocaleDateString(
                          "ko-KR"
                        )}
                        {todo.completedBy && ` (${todo.completedBy.name})`}
                      </span>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 - ADMIN만 */}
                {isAdmin && !todo.completedDate && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(todo)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={deletingIds.has(todo.id)}
                        >
                          {deletingIds.has(todo.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>할 일 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            &quot;{todo.title}&quot;을(를) 삭제하시겠습니까?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(todo.id)}
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* 수정 다이얼로그 */}
      <Dialog
        open={!!editingTodo}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTodo(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>할 일 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 완료일 선택 */}
            <div className="space-y-2">
              <Label>완료일</Label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formCompletedDate
                        ? format(new Date(formCompletedDate), "yyyy년 MM월 dd일", { locale: ko })
                        : "완료일 선택 (미완료)"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formCompletedDate ? new Date(formCompletedDate) : undefined}
                      onSelect={(date) => setFormCompletedDate(date?.toISOString() || null)}
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
                {formCompletedDate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormCompletedDate(null)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                제목 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="할 일 제목"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>기한</Label>
                <DatePicker
                  value={formDueDate}
                  onChange={setFormDueDate}
                  placeholder="기한 선택"
                />
              </div>
              <div className="space-y-2">
                <Label>우선순위</Label>
                <Select
                  value={formPriority}
                  onValueChange={(v) => setFormPriority(v as TodoPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.icon} {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {members.length > 0 && (
              <div className="space-y-2">
                <Label>담당자</Label>
                <Select
                  value={formAssigneeId}
                  onValueChange={setFormAssigneeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="담당자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">미지정</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || "이름 없음"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="상세 내용"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingTodo(null);
                resetForm();
              }}
            >
              취소
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
