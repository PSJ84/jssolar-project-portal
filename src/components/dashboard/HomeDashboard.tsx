"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  Plus,
  FolderKanban,
  CheckSquare,
  Calendar,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getDday } from "@/lib/date-utils";

interface Project {
  id: string;
  name: string;
  phase: string;
  total: number;
  completed: number;
  percent: number;
  isOverdue: boolean;
}

interface Todo {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  projectName: string | null;
}

interface WeekTask {
  id: string;
  name: string;
  dueDate: string;
  projectId: string;
  projectName: string;
}

interface BudgetSummary {
  confirmedRevenue: number;
  confirmedExpense: number;
  pendingRevenue: number;
  pendingExpense: number;
}

interface HomeDashboardProps {
  userName: string;
  greeting: string;
  todayDueCount: number;
  weekDueCount: number;
  projects: Project[];
  todos: Todo[];
  weekTasks: WeekTask[];
  budgetSummary: BudgetSummary;
}

const PHASE_LABELS: Record<string, string> = {
  PERMITTING: "인허가",
  CONSTRUCTION: "시공",
  COMPLETION: "준공",
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  LOW: "bg-gray-100 text-gray-800",
};

function formatCurrency(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  } else if (amount >= 10000) {
    return `${Math.round(amount / 10000).toLocaleString()}만`;
  }
  return amount.toLocaleString();
}

export function HomeDashboard({
  userName,
  greeting,
  todayDueCount,
  weekDueCount,
  projects,
  todos: initialTodos,
  weekTasks,
  budgetSummary,
}: HomeDashboardProps) {
  const [todos, setTodos] = useState(initialTodos);

  const handleToggleTodo = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/todos/${id}`, {
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

  const confirmedProfit = budgetSummary.confirmedRevenue - budgetSummary.confirmedExpense;
  const pendingProfit = budgetSummary.pendingRevenue - budgetSummary.pendingExpense;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 1. 상단 배너 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, {userName}님</h1>
          <p className="text-muted-foreground">
            {todayDueCount > 0 || weekDueCount > 0 ? (
              <>
                오늘 마감 <span className="font-semibold text-orange-600">{todayDueCount}건</span>
                {" · "}
                이번주 마감 <span className="font-semibold text-blue-600">{weekDueCount}건</span>
              </>
            ) : (
              "오늘 마감 일정이 없습니다"
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/solution/company-todos">
            <Plus className="h-4 w-4 mr-2" />
            할 일 추가
          </Link>
        </Button>
      </div>

      {/* 2. 프로젝트 현황 카드 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderKanban className="h-5 w-5" />
            프로젝트 현황
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/projects">
              전체 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              진행중인 프로젝트가 없습니다.
            </p>
          ) : (
            projects.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                href={`/admin/projects/${project.id}`}
                className="block group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {project.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {PHASE_LABELS[project.phase] || project.phase}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground">
                      {project.percent}%
                    </span>
                  </div>
                  <Progress
                    value={project.percent}
                    className={cn(
                      "h-2",
                      project.percent === 100 && "[&>div]:bg-green-500",
                      project.percent >= 50 && project.percent < 100 && "[&>div]:bg-blue-500",
                      project.percent < 50 && "[&>div]:bg-yellow-500"
                    )}
                  />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 3. 할 일 카드 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-5 w-5" />
              할 일
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/solution/company-todos">
                전체 <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todos.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                미완료 할 일이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {todos.map((todo) => {
                  const dday = getDday(todo.dueDate);
                  return (
                    <div
                      key={todo.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={false}
                        onCheckedChange={() => handleToggleTodo(todo.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{todo.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {todo.projectName && (
                            <Badge variant="outline" className="text-xs">
                              {todo.projectName}
                            </Badge>
                          )}
                          <Badge className={`text-xs ${PRIORITY_COLORS[todo.priority]}`}>
                            {todo.priority === "HIGH" ? "높음" : todo.priority === "MEDIUM" ? "보통" : "낮음"}
                          </Badge>
                          {dday && (
                            <Badge variant={dday.variant} className="text-xs">
                              {dday.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. 이번주 프로젝트 일정 카드 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5" />
              이번주 프로젝트 일정
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/projects">
                전체 <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {weekTasks.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                이번주 일정이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {weekTasks.map((task) => {
                  const dday = getDday(task.dueDate);
                  return (
                    <Link
                      key={task.id}
                      href={`/admin/projects/${task.projectId}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.name}</p>
                        <p className="text-xs text-muted-foreground">{task.projectName}</p>
                      </div>
                      {dday && (
                        <Badge variant={dday.variant} className="text-xs ml-2">
                          {dday.label}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. 예산 현황 카드 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5" />
            예산 현황
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/solution/budget">
              상세 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium"></th>
                  <th className="text-right py-2 font-medium text-green-600">확정</th>
                  <th className="text-right py-2 font-medium text-blue-600">예정</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium">매출</td>
                  <td className="text-right py-2">{formatCurrency(budgetSummary.confirmedRevenue)}원</td>
                  <td className="text-right py-2 text-muted-foreground">{formatCurrency(budgetSummary.pendingRevenue)}원</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">매입</td>
                  <td className="text-right py-2">{formatCurrency(budgetSummary.confirmedExpense)}원</td>
                  <td className="text-right py-2 text-muted-foreground">{formatCurrency(budgetSummary.pendingExpense)}원</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold">이익</td>
                  <td className={cn("text-right py-2 font-bold", confirmedProfit >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(confirmedProfit)}원
                  </td>
                  <td className={cn("text-right py-2 font-medium", pendingProfit >= 0 ? "text-blue-600" : "text-red-600")}>
                    {formatCurrency(pendingProfit)}원
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
