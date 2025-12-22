"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
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
import { MoreHorizontal, Pencil, Trash2, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CompanyTodoForm } from "./CompanyTodoForm";

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

interface CompanyTodoListProps {
  todos: CompanyTodo[];
  users: User[];
  onToggleComplete: (id: string) => Promise<void>;
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CATEGORY_LABELS: Record<string, string> = {
  ADMIN: "행정",
  FINANCE: "재무",
  SALES: "영업",
  HR: "인사",
  OTHER: "기타",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
};

export function CompanyTodoList({
  todos,
  users,
  onToggleComplete,
  onUpdate,
  onDelete,
}: CompanyTodoListProps) {
  const [editingTodo, setEditingTodo] = useState<CompanyTodo | null>(null);
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (editingTodo) {
      await onUpdate(editingTodo.id, data);
      setEditingTodo(null);
    }
  };

  const handleDelete = async () => {
    if (deletingTodoId) {
      await onDelete(deletingTodoId);
      setDeletingTodoId(null);
    }
  };

  const isOverdue = (dueDate: string | null, completedDate: string | null) => {
    if (!dueDate || completedDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (todos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        할 일이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {todos.map((todo) => (
          <Card
            key={todo.id}
            className={todo.completedDate ? "opacity-60" : ""}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={!!todo.completedDate}
                  onCheckedChange={() => onToggleComplete(todo.id)}
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
                      {CATEGORY_LABELS[todo.category] || todo.category}
                    </Badge>
                    <Badge className={`text-xs ${PRIORITY_COLORS[todo.priority]}`}>
                      {PRIORITY_LABELS[todo.priority] || todo.priority}
                    </Badge>
                  </div>

                  {todo.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {todo.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {todo.dueDate && (
                      <span
                        className={`flex items-center gap-1 ${
                          isOverdue(todo.dueDate, todo.completedDate)
                            ? "text-red-500"
                            : ""
                        }`}
                      >
                        <Calendar className="h-3 w-3" />
                        {format(new Date(todo.dueDate), "PPP", { locale: ko })}
                        {isOverdue(todo.dueDate, todo.completedDate) && " (지연)"}
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
                    <DropdownMenuItem onClick={() => setEditingTodo(todo)}>
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
        ))}
      </div>

      <Dialog open={!!editingTodo} onOpenChange={() => setEditingTodo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>할 일 수정</DialogTitle>
          </DialogHeader>
          {editingTodo && (
            <CompanyTodoForm
              users={users}
              onSubmit={handleUpdate}
              onCancel={() => setEditingTodo(null)}
              initialData={{
                title: editingTodo.title,
                description: editingTodo.description,
                dueDate: editingTodo.dueDate
                  ? new Date(editingTodo.dueDate)
                  : null,
                priority: editingTodo.priority,
                category: editingTodo.category,
                assigneeId: editingTodo.assignee?.id,
              }}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingTodoId}
        onOpenChange={() => setDeletingTodoId(null)}
      >
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
    </>
  );
}
