"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CompanyTodoForm } from "@/components/company-todo/CompanyTodoForm";
import { CompanyTodoList } from "@/components/company-todo/CompanyTodoList";
import { toast } from "sonner";

interface CompanyTodo {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  category: string;
  completedDate: string | null;
  assignee: { id: string; name: string | null } | null;
  createdBy: { id: string; name: string | null };
  createdAt: string;
}

interface User {
  id: string;
  name: string | null;
}

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "ADMIN", label: "행정" },
  { value: "FINANCE", label: "재무" },
  { value: "SALES", label: "영업" },
  { value: "HR", label: "인사" },
  { value: "OTHER", label: "기타" },
];

export default function CompanyTodosPage() {
  const [todos, setTodos] = useState<CompanyTodo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [category, setCategory] = useState("ALL");
  const [tab, setTab] = useState("active");

  const fetchTodos = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "ALL") {
        params.set("category", category);
      }
      if (tab === "completed") {
        params.set("completed", "true");
      } else if (tab === "active") {
        params.set("completed", "false");
      }

      const res = await fetch(`/api/company-todos?${params}`);
      if (!res.ok) throw new Error("Failed to fetch todos");
      const data = await res.json();
      setTodos(data);
    } catch {
      toast.error("할 일 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [category, tab]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
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

  const handleCreate = async (data: {
    title: string;
    description?: string;
    dueDate?: Date;
    priority: string;
    category: string;
    assigneeId?: string;
  }) => {
    try {
      const res = await fetch("/api/company-todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create todo");
      }

      toast.success("할 일이 추가되었습니다.");
      setIsDialogOpen(false);
      fetchTodos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "할 일 추가에 실패했습니다.");
    }
  };

  const handleToggleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/company-todos/${id}`, {
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

  const handleUpdate = async (id: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/company-todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update todo");

      toast.success("할 일이 수정되었습니다.");
      fetchTodos();
    } catch {
      toast.error("수정에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/company-todos/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete todo");

      toast.success("할 일이 삭제되었습니다.");
      fetchTodos();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const activeTodos = todos.filter((t) => !t.completedDate);
  const completedTodos = todos.filter((t) => t.completedDate);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">회사 할 일</h1>
          <p className="text-muted-foreground">
            프로젝트와 무관한 회사 업무를 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchTodos}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                할 일 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 할 일 추가</DialogTitle>
              </DialogHeader>
              <CompanyTodoForm
                users={users}
                onSubmit={handleCreate}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>할 일 목록</CardTitle>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="active">
                진행 중 ({activeTodos.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                완료 ({completedTodos.length})
              </TabsTrigger>
              <TabsTrigger value="all">전체 ({todos.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <CompanyTodoList
                todos={activeTodos}
                users={users}
                onToggleComplete={handleToggleComplete}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </TabsContent>

            <TabsContent value="completed">
              <CompanyTodoList
                todos={completedTodos}
                users={users}
                onToggleComplete={handleToggleComplete}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </TabsContent>

            <TabsContent value="all">
              <CompanyTodoList
                todos={todos}
                users={users}
                onToggleComplete={handleToggleComplete}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
