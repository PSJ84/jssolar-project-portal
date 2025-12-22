"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckSquare,
  BookOpen,
  DollarSign,
  ArrowRight,
  Pin,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";

interface CompanyTodo {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  category: string;
  completedDate: string | null;
}

interface KnowledgeNote {
  id: string;
  title: string;
  category: string;
  isPinned: boolean;
  updatedAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const CATEGORY_LABELS: Record<string, string> = {
  CONSTRUCTION: "시공노하우",
  PERMIT: "인허가팁",
  MATERIAL: "자재정보",
  REGULATION: "법규",
  CONTACT: "연락처",
  OTHER: "기타",
};

export default function SolutionHubPage() {
  const [todos, setTodos] = useState<CompanyTodo[]>([]);
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [todosRes, notesRes] = await Promise.all([
          fetch("/api/company-todos?completed=false&limit=5"),
          fetch("/api/knowledge?pinned=true&limit=5"),
        ]);

        if (todosRes.ok) {
          const todosData = await todosRes.json();
          setTodos(todosData);
        }

        if (notesRes.ok) {
          const notesData = await notesRes.json();
          setNotes(notesData);
        }
      } catch {
        toast.error("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleToggleTodo = async (id: string) => {
    try {
      const res = await fetch(`/api/company-todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleComplete: true }),
      });

      if (!res.ok) throw new Error("Failed to toggle");

      setTodos(todos.filter((t) => t.id !== id));
      toast.success("완료 처리되었습니다.");
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const urgentTodos = todos.filter(
    (t) => t.priority === "URGENT" || t.priority === "HIGH" || isOverdue(t.dueDate)
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">통합 솔루션</h1>
        <p className="text-muted-foreground">
          회사 업무, 지식 관리, 예산 관리를 한 곳에서 확인하세요.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">미완료 할 일</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todos.length}</div>
            {urgentTodos.length > 0 && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                긴급/지연 {urgentTodos.length}건
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">고정된 노트</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              중요 참고 자료
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">예산 관리</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">프로젝트별</div>
            <p className="text-xs text-muted-foreground mt-1">
              각 프로젝트에서 확인
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Todos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              회사 할 일
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/solution/company-todos">
                전체 보기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                로딩 중...
              </div>
            ) : todos.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                미완료 할 일이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {todos.slice(0, 5).map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => handleToggleTodo(todo.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{todo.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={`text-xs ${PRIORITY_COLORS[todo.priority]}`}
                        >
                          {todo.priority === "URGENT"
                            ? "긴급"
                            : todo.priority === "HIGH"
                            ? "높음"
                            : todo.priority === "MEDIUM"
                            ? "보통"
                            : "낮음"}
                        </Badge>
                        {todo.dueDate && (
                          <span
                            className={`text-xs flex items-center gap-1 ${
                              isOverdue(todo.dueDate) ? "text-red-500" : "text-muted-foreground"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {format(new Date(todo.dueDate), "M/d", { locale: ko })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Knowledge Notes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              지식노트
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/solution/knowledge">
                전체 보기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                로딩 중...
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                고정된 노트가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {notes.slice(0, 5).map((note) => (
                  <Link
                    key={note.id}
                    href={`/admin/solution/knowledge/${note.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <Pin className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{note.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[note.category] || note.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.updatedAt), "M/d", { locale: ko })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 이동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link
                href="/admin/solution/company-todos"
                className="flex flex-col items-center gap-2"
              >
                <CheckSquare className="h-8 w-8" />
                <span>회사 할 일 관리</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link
                href="/admin/solution/knowledge"
                className="flex flex-col items-center gap-2"
              >
                <BookOpen className="h-8 w-8" />
                <span>지식노트 관리</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4" asChild>
              <Link
                href="/admin/projects"
                className="flex flex-col items-center gap-2"
              >
                <DollarSign className="h-8 w-8" />
                <span>프로젝트 예산 관리</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
