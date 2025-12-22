"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  RefreshCw,
  DollarSign,
  TrendingUp,
  FolderKanban,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface ProjectBudget {
  id: string;
  name: string;
  status: string;
  totalPlanned: number;
  totalActual: number;
  executionRate: number;
  budgetCount: number;
}

interface BudgetSummary {
  overall: {
    totalPlanned: number;
    totalActual: number;
    executionRate: number;
    remaining: number;
    projectCount: number;
    projectsWithBudget: number;
  };
  projects: ProjectBudget[];
  byCategory: Record<string, { planned: number; actual: number }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  MATERIAL: "자재비",
  LABOR: "인건비",
  EQUIPMENT: "장비비",
  PERMIT: "인허가비용",
  TRANSPORT: "운송비",
  OTHER: "기타",
};

const CATEGORY_COLORS: Record<string, string> = {
  MATERIAL: "#3B82F6",
  LABOR: "#22C55E",
  EQUIPMENT: "#A855F7",
  PERMIT: "#F97316",
  TRANSPORT: "#EAB308",
  OTHER: "#6B7280",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "진행중",
  COMPLETED: "완료",
  ARCHIVED: "보관",
};

export default function BudgetSummaryPage() {
  const [data, setData] = useState<BudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/budget-summary");
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
    } catch {
      toast.error("예산 현황을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const getExecutionStatus = (rate: number) => {
    if (rate < 50) return { label: "초기", color: "text-blue-500" };
    if (rate < 80) return { label: "진행중", color: "text-yellow-500" };
    if (rate < 100) return { label: "마무리", color: "text-green-500" };
    return { label: "초과", color: "text-red-500" };
  };

  const pieChartData = data
    ? Object.entries(data.byCategory).map(([category, amounts]) => ({
        name: CATEGORY_LABELS[category] || category,
        value: amounts.planned,
        actual: amounts.actual,
        color: CATEGORY_COLORS[category] || "#6B7280",
      }))
    : [];

  const barChartData = data
    ? data.projects
        .filter((p) => p.budgetCount > 0)
        .slice(0, 10)
        .map((p) => ({
          name: p.name.length > 10 ? p.name.slice(0, 10) + "..." : p.name,
          계획: p.totalPlanned / 10000,
          실제: p.totalActual / 10000,
        }))
    : [];

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">
          데이터를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">예산 현황</h1>
          <p className="text-muted-foreground">
            전체 프로젝트의 예산 및 집행 현황을 확인합니다.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* 전체 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 계획 예산</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.overall.totalPlanned)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overall.projectsWithBudget}개 프로젝트
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 실제 지출</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.overall.totalActual)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              집행률 {data.overall.executionRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">잔여 예산</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                data.overall.remaining < 0 ? "text-red-500" : "text-green-500"
              }`}
            >
              {formatCurrency(data.overall.remaining)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overall.remaining >= 0 ? "예산 내 집행" : "예산 초과"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 집행률</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overall.executionRate}%</div>
            <Progress
              value={Math.min(data.overall.executionRate, 100)}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* 차트 섹션 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 카테고리별 파이 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">카테고리별 예산 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name || ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                예산 데이터가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 프로젝트별 바 차트 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">프로젝트별 예산 현황 (만원)</CardTitle>
          </CardHeader>
          <CardContent>
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip
                    formatter={(value) =>
                      `${(value as number).toLocaleString()}만원`
                    }
                  />
                  <Legend />
                  <Bar dataKey="계획" fill="#3B82F6" />
                  <Bar dataKey="실제" fill="#22C55E" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                예산 데이터가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 프로젝트별 예산 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">프로젝트별 예산 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {data.projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              프로젝트가 없습니다.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>프로젝트</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">계획 예산</TableHead>
                    <TableHead className="text-right">실제 지출</TableHead>
                    <TableHead className="text-right">집행률</TableHead>
                    <TableHead className="text-right">잔여</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.projects.map((project) => {
                    const status = getExecutionStatus(project.executionRate);
                    const remaining = project.totalPlanned - project.totalActual;
                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          {project.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {STATUS_LABELS[project.status] || project.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {project.budgetCount > 0
                            ? formatCurrency(project.totalPlanned)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {project.budgetCount > 0
                            ? formatCurrency(project.totalActual)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {project.budgetCount > 0 ? (
                            <span className={status.color}>
                              {project.executionRate}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right ${
                            remaining < 0 ? "text-red-500" : ""
                          }`}
                        >
                          {project.budgetCount > 0
                            ? formatCurrency(remaining)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/projects/${project.id}?tab=budget`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
