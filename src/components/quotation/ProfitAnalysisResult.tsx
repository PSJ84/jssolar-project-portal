"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  TrendingUp,
  Wallet,
  PiggyBank,
} from "lucide-react";
import {
  FinancingType,
  AnalysisResult,
  financingTypeLabels,
} from "@/lib/profit-analysis";
import { ProfitAnalysisChart } from "./ProfitAnalysisChart";

interface ProfitAnalysisResultProps {
  result: AnalysisResult;
  financingType: FinancingType;
  totalInvestment: number;
}

export function ProfitAnalysisResult({
  result,
  financingType,
  totalInvestment,
}: ProfitAnalysisResultProps) {
  const { yearlyData, paybackPeriod, totalProfit20y, roi, initialCost } = result;

  // 연평균 수익
  const avgYearlyProfit = Math.round(totalProfit20y / 20);

  // kW당 수익
  const profitPerKw = yearlyData.length > 0
    ? Math.round(yearlyData[0].totalRevenue / (yearlyData[0].generation / 1000))
    : 0;

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">투자 회수 기간</span>
            </div>
            <div className="text-2xl font-bold">
              {paybackPeriod > 0 ? `${paybackPeriod}년` : "-"}
            </div>
            {paybackPeriod > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                약 {Math.ceil(paybackPeriod * 12)}개월
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">20년 총 수익</span>
            </div>
            <div className={`text-2xl font-bold ${totalProfit20y >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalProfit20y.toLocaleString()}원
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              연평균 {avgYearlyProfit.toLocaleString()}원
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">ROI</span>
            </div>
            <div className={`text-2xl font-bold ${roi >= 0 ? "text-green-600" : "text-red-600"}`}>
              {roi}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              투자 대비 수익률
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">초기 투자금</span>
            </div>
            <div className="text-2xl font-bold">
              {initialCost.toLocaleString()}원
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {financingTypeLabels[financingType]}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">20년 누적 수익 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfitAnalysisChart yearlyData={yearlyData} />
        </CardContent>
      </Card>

      {/* 상세 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">20년 상세 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">년차</TableHead>
                  <TableHead className="text-right">발전량</TableHead>
                  <TableHead className="text-right">SMP 수익</TableHead>
                  <TableHead className="text-right">REC 수익</TableHead>
                  <TableHead className="text-right">총 수익</TableHead>
                  <TableHead className="text-right">대출 상환</TableHead>
                  <TableHead className="text-right">유지비</TableHead>
                  <TableHead className="text-right">순이익</TableHead>
                  <TableHead className="text-right">누적</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearlyData.map((year) => (
                  <TableRow
                    key={year.year}
                    className={year.cumulative >= 0 && yearlyData[year.year - 2]?.cumulative < 0 ? "bg-green-50" : ""}
                  >
                    <TableCell className="text-center font-medium">
                      {year.year}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {year.generation.toLocaleString()} kWh
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {year.smpRevenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {year.recRevenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {year.totalRevenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {(year.loanRepayment + year.interestPayment).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {(year.maintenanceCost + year.monitoringCost).toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm font-medium ${year.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {year.netProfit.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm font-medium ${year.cumulative >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {year.cumulative.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 추가 통계 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">요약 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">총 투자금액</p>
              <p className="text-lg font-semibold">{totalInvestment.toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">20년 총 매출</p>
              <p className="text-lg font-semibold">{result.totalRevenue20y.toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">20년 총 비용</p>
              <p className="text-lg font-semibold">{result.totalExpense20y.toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">1년차 발전량</p>
              <p className="text-lg font-semibold">
                {yearlyData[0]?.generation.toLocaleString() || 0} kWh
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
