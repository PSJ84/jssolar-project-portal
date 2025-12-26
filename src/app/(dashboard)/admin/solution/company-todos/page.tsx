"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Plus,
  RefreshCw,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
  FolderKanban,
  Loader2,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getDday } from "@/lib/date-utils";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
}

interface Todo {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  completedDate: string | null;
  project: { id: string; name: string } | null;
  assignee: { id: string; name: string | null } | null;
  createdBy: { id: string; name: string | null };
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string | null;
}

const PRIORITY_OPTIONS = [
  { value: "HIGH", label: "높음" },
  { value: "MEDIUM", label: "보통" },
  { value: "LOW", label: "낮음" },
];

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  LOW: "bg-gray-100 text-gray-800",
};

export default function AllTodosPage() {
  const { data: session } = useSession();
  const [allTodos, setAllTodos] = useState<Todo[]>([]); // 전체 데이터 저장
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [tab, setTab] = useState("active");

  // 폼 상태
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);

  // 새 할일 폼
  const [formProjectId, setFormProjectId] = useState("__company__"); // 기본값: 회사 할일
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDueDate, setFormDueDate] = useState<Date | undefined>();
  const [formCompletedDate, setFormCompletedDate] = useState<Date | undefined>(); // 완료일 추가
  const [formPriority, setFormPriority] = useState("MEDIUM");
  const [formAssigneeId, setFormAssigneeId] = useState("__none__");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 전체 데이터 1회 로드 (탭 변경 시 API 호출 안함)
  const fetchTodos = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter !== "ALL") {
        params.set("projectId", projectFilter);
      }
      // completed 파라미터 제거 - 전체 데이터 로드

      const res = await fetch(`/api/admin/todos?${params}`);
      if (!res.ok) throw new Error("Failed to fetch todos");
      const data = await res.json();
      setAllTodos(data.todos);
      setProjects(data.projects);
    } catch {
      toast.error("할 일 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [projectFilter]); // tab 의존성 제거

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/organization-users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch {
      console.error("Failed to fetch users");
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // 현재 사용자를 담당자 기본값으로 설정
  useEffect(() => {
    if (session?.user?.id && formAssigneeId === "__none__" && !editingTodo) {
      setFormAssigneeId(session.user.id);
    }
  }, [session?.user?.id, editingTodo]);

  // 클라이언트 필터링으로 탭별 데이터 계산
  const activeTodos = useMemo(() => allTodos.filter((t) => !t.completedDate), [allTodos]);
  const completedTodos = useMemo(() => allTodos.filter((t) => t.completedDate), [allTodos]);

  // 현재 탭에 표시할 데이터
  const displayTodos = useMemo(() => {
    switch (tab) {
      case "active":
        return activeTodos;
      case "completed":
        return completedTodos;
      default:
        return allTodos;
    }
  }, [tab, activeTodos, completedTodos, allTodos]);

  const resetForm = () => {
    setFormProjectId("__company__"); // 기본값: 회사 할일
    setFormTitle("");
    setFormDescription("");
    setFormDueDate(undefined);
    setFormCompletedDate(undefined);
    setFormPriority("MEDIUM");
    // 현재 사용자를 기본 담당자로 설정
    setFormAssigneeId(session?.user?.id || "__none__");
    setEditingTodo(null);
  };

  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setFormProjectId(todo.project?.id || "__company__");
    setFormTitle(todo.title);
    setFormDescription(todo.description || "");
    setFormDueDate(todo.dueDate ? new Date(todo.dueDate) : undefined);
    setFormCompletedDate(todo.completedDate ? new Date(todo.completedDate) : undefined);
    setFormPriority(todo.priority);
    setFormAssigneeId(todo.assignee?.id || "__none__");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        projectId: formProjectId === "__company__" ? null : formProjectId, // null로 보내야 API에서 처리됨
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        dueDate: formDueDate,
        completedDate: formCompletedDate, // 완료일 추가
        priority: formPriority,
        assigneeId: formAssigneeId !== "__none__" ? formAssigneeId : undefined,
      };

      let res;
      if (editingTodo) {
        res = await fetch(`/api/admin/todos/${editingTodo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save todo");
      }

      toast.success(editingTodo ? "할 일이 수정되었습니다." : "할 일이 추가되었습니다.");
      setIsDialogOpen(false);
      resetForm();
      fetchTodos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleComplete: true }),
      });

      if (!res.ok) throw new Error("Failed to toggle complete");
      fetchTodos();
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!deletingTodoId) return;

    try {
      const res = await fetch(`/api/admin/todos/${deletingTodoId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete todo");

      toast.success("할 일이 삭제되었습니다.");
      setDeletingTodoId(null);
      fetchTodos();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const renderTodoItem = (todo: Todo) => {
    const dday = getDday(todo.dueDate);

    return (
      <Card key={todo.id} className={todo.completedDate ? "opacity-60" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={!!todo.completedDate}
              onCheckedChange={() => handleToggleComplete(todo.id)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-medium ${
                    todo.completedDate ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {todo.title}
                </span>
                <Badge variant="outline" className="text-xs">
                  <FolderKanban className="h-3 w-3 mr-1" />
                  {todo.project?.name || "회사 할 일"}
                </Badge>
                <Badge className={`text-xs ${PRIORITY_COLORS[todo.priority]}`}>
                  {PRIORITY_OPTIONS.find((p) => p.value === todo.priority)?.label || todo.priority}
                </Badge>
                {dday && !todo.completedDate && (
                  <Badge variant={dday.variant} className="text-xs">
                    {dday.label}
                  </Badge>
                )}
              </div>

              {todo.description && (
                <p className="text-sm text-muted-foreground mt-1">{todo.description}</p>
              )}

              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {todo.dueDate && (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {format(new Date(todo.dueDate), "PPP", { locale: ko })}
                  </span>
                )}
                {todo.assignee && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {todo.assignee.name || "이름 없음"}
                  </span>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(todo)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeletingTodoId(todo.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTodoList = (todoList: Todo[]) => {
    if (todoList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          할 일이 없습니다.
        </div>
      );
    }

    return <div className="space-y-2">{todoList.map(renderTodoItem)}</div>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">전체 할 일</h1>
          <p className="text-muted-foreground">
            모든 프로젝트의 할 일을 한 곳에서 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchTodos}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                할 일 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTodo ? "할 일 수정" : "새 할 일 추가"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">소속</label>
                  <Select value={formProjectId} onValueChange={setFormProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="소속 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__company__">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>회사 할 일</span>
                        </div>
                      </SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4" />
                            <span>{project.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Input
                    placeholder="할 일 제목 *"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Textarea
                    placeholder="상세 설명 (선택)"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">마감일</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formDueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formDueDate
                            ? format(formDueDate, "PPP", { locale: ko })
                            : "날짜 선택"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formDueDate}
                          onSelect={setFormDueDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">우선순위</label>
                    <Select value={formPriority} onValueChange={setFormPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 완료일 필드 (수정 시에만 표시) */}
                {editingTodo && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      <CheckCircle2 className="inline h-4 w-4 mr-1" />
                      완료일
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formCompletedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formCompletedDate
                            ? format(formCompletedDate, "PPP", { locale: ko })
                            : "미완료"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <div className="p-2 border-b">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setFormCompletedDate(undefined)}
                          >
                            미완료로 설정
                          </Button>
                        </div>
                        <Calendar
                          mode="single"
                          selected={formCompletedDate}
                          onSelect={setFormCompletedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1 block">담당자</label>
                  <Select value={formAssigneeId} onValueChange={setFormAssigneeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="담당자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">미지정</SelectItem>
                      {users
                        .filter((user) => user.id)
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || "이름 없음"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formTitle.trim()}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingTodo ? "수정" : "추가"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>할 일 목록</CardTitle>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 프로젝트</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="active">진행 중 ({activeTodos.length})</TabsTrigger>
              <TabsTrigger value="completed">완료 ({completedTodos.length})</TabsTrigger>
              <TabsTrigger value="all">전체 ({allTodos.length})</TabsTrigger>
            </TabsList>

            {/* 단일 렌더링으로 탭 전환 시 로딩 없음 */}
            <div className="mt-4">
              {renderTodoList(displayTodos)}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingTodoId} onOpenChange={() => setDeletingTodoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>할 일 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 할 일을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
