"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProjectBudget {
  id: string;
  name: string;
  income: { planned: number; actual: number };
  expense: { planned: number; actual: number };
  profit: { current: number; expected: number; rate: number };
}

interface BudgetOverview {
  projects: ProjectBudget[];
  totals: {
    income: { planned: number; actual: number };
    expense: { planned: number; actual: number };
    profit: { current: number; expected: number; rate: number };
  };
}

export default function BudgetOverviewPage() {
  const [data, setData] = useState<BudgetOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/budget-overview");
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

  const formatCurrencyShort = (amount: number) => {
    if (Math.abs(amount) >= 100000000) {
      return (amount / 100000000).toFixed(1) + "억";
    }
    if (Math.abs(amount) >= 10000) {
      return Math.round(amount / 10000).toLocaleString() + "만";
    }
    return amount.toLocaleString();
  };

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
            전체 프로젝트의 매출/매입 및 손익 현황을 확인합니다.
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
            <CardTitle className="text-sm font-medium">총 매출 (계획)</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(data.totals.income.planned)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              입금 {formatCurrency(data.totals.income.actual)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 지출 (계획)</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {formatCurrency(data.totals.expense.planned)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              지출 {formatCurrency(data.totals.expense.actual)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">현재 손익</CardTitle>
            {data.totals.profit.current >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-orange-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              data.totals.profit.current >= 0 ? "text-green-700" : "text-orange-700"
            )}>
              {data.totals.profit.current >= 0 ? "+" : ""}{formatCurrency(data.totals.profit.current)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              입금 - 지출
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">예상 최종 이익</CardTitle>
            {data.totals.profit.expected >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-orange-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              data.totals.profit.expected >= 0 ? "text-green-700" : "text-orange-700"
            )}>
              {data.totals.profit.expected >= 0 ? "+" : ""}{formatCurrency(data.totals.profit.expected)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              이익률 {data.totals.profit.rate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 프로젝트별 손익 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">프로젝트별 손익 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {data.projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              예산이 등록된 프로젝트가 없습니다.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>프로젝트</TableHead>
                    <TableHead className="text-right">매출 (계획)</TableHead>
                    <TableHead className="text-right">매출 (입금)</TableHead>
                    <TableHead className="text-right">지출 (계획)</TableHead>
                    <TableHead className="text-right">지출 (실제)</TableHead>
                    <TableHead className="text-right">예상 이익</TableHead>
                    <TableHead className="text-right">이익률</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.projects.map((project) => {
                    const hasBudget = project.income.planned > 0 || project.expense.planned > 0;

                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          {project.name}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {hasBudget ? formatCurrencyShort(project.income.planned) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {hasBudget ? formatCurrencyShort(project.income.actual) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {hasBudget ? formatCurrencyShort(project.expense.planned) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {hasBudget ? formatCurrencyShort(project.expense.actual) : "-"}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          project.profit.expected >= 0 ? "text-green-600" : "text-orange-600"
                        )}>
                          {hasBudget ? (
                            <>
                              {project.profit.expected >= 0 ? "+" : ""}
                              {formatCurrencyShort(project.profit.expected)}
                            </>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {hasBudget ? (
                            <Badge variant={project.profit.rate >= 0 ? "secondary" : "destructive"}>
                              {project.profit.rate}%
                            </Badge>
                          ) : "-"}
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
