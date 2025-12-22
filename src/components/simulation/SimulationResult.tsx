"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AnalysisResult } from "@/lib/profit-analysis";
import { SimulationCompareChart } from "./SimulationCompareChart";
import {
  Wallet,
  Building2,
  Landmark,
  FileCheck,
  TrendingUp,
  Clock,
  Percent,
  Trophy,
} from "lucide-react";

interface SimulationResults {
  selfFunding: AnalysisResult;
  bankLoan: AnalysisResult;
  governmentLoan: AnalysisResult;
  factoring: AnalysisResult;
}

interface SimulationResultProps {
  result: SimulationResults;
  totalInvestment: number;
  capacityKw: number;
}

type ModelKey = keyof SimulationResults;

const modelConfig: Record<
  ModelKey,
  {
    label: string;
    description: string;
    icon: typeof Wallet;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  selfFunding: {
    label: "자부담 100%",
    description: "전액 자기자본",
    icon: Wallet,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  bankLoan: {
    label: "은행 80%",
    description: "자부담 20% + 은행대출 80%",
    icon: Building2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  governmentLoan: {
    label: "금융지원사업",
    description: "저금리 1.75%, 거치 1년",
    icon: Landmark,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  factoring: {
    label: "팩토링",
    description: "무자본 + 보증료/팩토링비",
    icon: FileCheck,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

export function SimulationResult({
  result,
  totalInvestment,
  capacityKw,
}: SimulationResultProps) {
  const [selectedModel, setSelectedModel] = useState<ModelKey>("selfFunding");

  // 초기 투자금 계산
  const getInitialCost = (model: ModelKey): number => {
    switch (model) {
      case "selfFunding":
        return totalInvestment;
      case "bankLoan":
      case "governmentLoan":
        return totalInvestment * 0.2;
      case "factoring":
        return 0;
      default:
        return totalInvestment;
    }
  };

  // 최적 모델 찾기 (20년 수익 기준)
  const getBestModel = (): ModelKey => {
    let best: ModelKey = "selfFunding";
    let maxProfit = result.selfFunding.totalProfit20y;

    (Object.keys(result) as ModelKey[]).forEach((key) => {
      if (result[key].totalProfit20y > maxProfit) {
        maxProfit = result[key].totalProfit20y;
        best = key;
      }
    });

    return best;
  };

  const bestModel = getBestModel();

  return (
    <div className="space-y-6">
      {/* 4가지 모델 비교 카드 */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {(Object.keys(result) as ModelKey[]).map((key) => {
          const config = modelConfig[key];
          const data = result[key];
          const Icon = config.icon;
          const isBest = key === bestModel;
          const isSelected = key === selectedModel;

          return (
            <Card
              key={key}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md relative",
                isSelected && "ring-2 ring-primary shadow-md",
                config.bgColor,
                config.borderColor
              )}
              onClick={() => setSelectedModel(key)}
            >
              {isBest && (
                <Badge className="absolute -top-2 -right-2 bg-yellow-500">
                  <Trophy className="h-3 w-3 mr-1" />
                  추천
                </Badge>
              )}
              <CardHeader className="pb-2 p-3 md:p-4 md:pb-2">
                <CardTitle
                  className={cn(
                    "text-sm md:text-base flex items-center gap-2",
                    config.color
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {config.label}
                </CardTitle>
                <CardDescription className="text-xs hidden md:block">
                  {config.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">초기 투자금</span>
                    <span className="font-medium">
                      {getInitialCost(key).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">회수 기간</span>
                    <span className="font-medium">
                      {data.paybackPeriod > 0
                        ? `${data.paybackPeriod.toFixed(1)}년`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">20년 수익</span>
                    <span
                      className={cn(
                        "font-bold",
                        data.totalProfit20y >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {data.totalProfit20y.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">ROI</span>
                    <span className="font-medium">{data.roi.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 비교 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            20년 누적 수익 비교
          </CardTitle>
          <CardDescription>
            4가지 금융 모델별 누적 수익 추이를 비교합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimulationCompareChart data={result} />
        </CardContent>
      </Card>

      {/* 선택된 모델 상세 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const Icon = modelConfig[selectedModel].icon;
              return <Icon className="h-5 w-5" />;
            })()}
            {modelConfig[selectedModel].label} 상세 분석
          </CardTitle>
          <CardDescription>
            {modelConfig[selectedModel].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary">
            <TabsList className="mb-4">
              <TabsTrigger value="summary">요약</TabsTrigger>
              <TabsTrigger value="yearly">연도별</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Wallet className="h-4 w-4" />
                    <span className="text-xs">초기 투자금</span>
                  </div>
                  <p className="text-lg font-bold">
                    {getInitialCost(selectedModel).toLocaleString()}원
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">투자금 회수</span>
                  </div>
                  <p className="text-lg font-bold">
                    {result[selectedModel].paybackPeriod > 0
                      ? `${result[selectedModel].paybackPeriod.toFixed(1)}년`
                      : "-"}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">20년 순수익</span>
                  </div>
                  <p
                    className={cn(
                      "text-lg font-bold",
                      result[selectedModel].totalProfit20y >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {result[selectedModel].totalProfit20y.toLocaleString()}원
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Percent className="h-4 w-4" />
                    <span className="text-xs">투자수익률</span>
                  </div>
                  <p className="text-lg font-bold">
                    {result[selectedModel].roi.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">수익 항목</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        20년 총 매출
                      </span>
                      <span>
                        {result[selectedModel].totalRevenue20y.toLocaleString()}
                        원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">연평균 수익</span>
                      <span>
                        {Math.round(
                          result[selectedModel].totalProfit20y / 20
                        ).toLocaleString()}
                        원
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">설치 정보</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">설치 용량</span>
                      <span>{capacityKw.toLocaleString()}kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">총 투자금</span>
                      <span>{totalInvestment.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="yearly">
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">년차</TableHead>
                      <TableHead className="text-right">매출</TableHead>
                      <TableHead className="text-right">비용</TableHead>
                      <TableHead className="text-right">순이익</TableHead>
                      <TableHead className="text-right">누적</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result[selectedModel].yearlyData.map((year, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {idx + 1}년
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round(year.totalRevenue).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round(year.totalExpense).toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            year.netProfit >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {Math.round(year.netProfit).toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            year.cumulative >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          {Math.round(year.cumulative).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
