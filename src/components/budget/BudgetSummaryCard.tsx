"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface BudgetSummary {
  totalPlanned: number;
  totalActual: number;
  byCategory: Record<string, { planned: number; actual: number }>;
}

interface BudgetSummaryCardProps {
  summary: BudgetSummary;
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

export function BudgetSummaryCard({ summary }: BudgetSummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const usagePercent =
    summary.totalPlanned > 0
      ? Math.round((summary.totalActual / summary.totalPlanned) * 100)
      : 0;

  const chartData = Object.entries(summary.byCategory).map(([category, data]) => ({
    name: CATEGORY_LABELS[category] || category,
    value: data.planned,
    actual: data.actual,
    color: CATEGORY_COLORS[category] || "#6B7280",
  }));

  const getUsageStatus = () => {
    if (usagePercent < 80) return { label: "양호", color: "text-green-500" };
    if (usagePercent < 100) return { label: "주의", color: "text-yellow-500" };
    return { label: "초과", color: "text-red-500" };
  };

  const status = getUsageStatus();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">예산 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>총 계획 예산</span>
              <span className="font-medium">{formatCurrency(summary.totalPlanned)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>실제 지출</span>
              <span className="font-medium">{formatCurrency(summary.totalActual)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>잔여 예산</span>
              <span
                className={`font-medium ${
                  summary.totalPlanned - summary.totalActual < 0
                    ? "text-red-500"
                    : "text-green-500"
                }`}
              >
                {formatCurrency(summary.totalPlanned - summary.totalActual)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>예산 사용률</span>
              <span className={`font-medium ${status.color}`}>
                {usagePercent}% ({status.label})
              </span>
            </div>
            <Progress
              value={Math.min(usagePercent, 100)}
              className={usagePercent > 100 ? "bg-red-100" : ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">카테고리별 예산</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ name, percent }) =>
                    `${name || ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
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
            <div className="text-center py-8 text-muted-foreground">
              카테고리별 데이터가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
