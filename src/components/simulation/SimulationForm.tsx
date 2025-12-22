"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calculator, Sun, Zap, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AnalysisResult } from "@/lib/profit-analysis";
import { SimulationResult } from "./SimulationResult";

interface SimulationResults {
  selfFunding: AnalysisResult;
  bankLoan: AnalysisResult;
  governmentLoan: AnalysisResult;
  factoring: AnalysisResult;
}

export function SimulationForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResults | null>(null);

  // 입력값
  const [capacityKw, setCapacityKw] = useState<number>(100);
  const [pricePerKw, setPricePerKw] = useState<number>(1200000); // kW당 120만원
  const [smpPrice, setSmpPrice] = useState<number>(120);
  const [recPrice, setRecPrice] = useState<number>(40000);

  // 계산된 총 투자금
  const totalInvestment = capacityKw * pricePerKw;

  // 자동 시뮬레이션 (debounce)
  const [autoSimulate, setAutoSimulate] = useState(false);

  const handleSimulate = useCallback(async () => {
    if (!capacityKw || capacityKw <= 0) {
      toast.error("설치 용량을 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacityKw,
          totalInvestment,
          smpPrice,
          recPrice,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "시뮬레이션에 실패했습니다.");
      }

      const data = await response.json();
      setResult(data);
      setAutoSimulate(true);
    } catch (error) {
      console.error("Simulation error:", error);
      toast.error(error instanceof Error ? error.message : "시뮬레이션에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [capacityKw, totalInvestment, smpPrice, recPrice]);

  // SMP/REC 변경 시 자동 재계산 (debounce)
  useEffect(() => {
    if (!autoSimulate) return;

    const timer = setTimeout(() => {
      handleSimulate();
    }, 500);

    return () => clearTimeout(timer);
  }, [smpPrice, recPrice, autoSimulate, handleSimulate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 입력 폼 */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-500" />
            설치 정보
          </CardTitle>
          <CardDescription>
            태양광 발전소 정보를 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 설치 용량 */}
          <div className="space-y-2">
            <Label htmlFor="capacity">설치 용량 (kW)</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              step={10}
              value={capacityKw}
              onChange={(e) => {
                setCapacityKw(Number(e.target.value));
                setAutoSimulate(false);
              }}
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground">
              예: 100kW, 500kW, 1MW(1000kW)
            </p>
          </div>

          {/* kW당 단가 */}
          <div className="space-y-2">
            <Label htmlFor="pricePerKw">kW당 단가 (원)</Label>
            <Input
              id="pricePerKw"
              type="number"
              min={500000}
              step={50000}
              value={pricePerKw}
              onChange={(e) => {
                setPricePerKw(Number(e.target.value));
                setAutoSimulate(false);
              }}
            />
            <p className="text-xs text-muted-foreground">
              일반적으로 100~150만원/kW
            </p>
          </div>

          {/* 총 투자금 */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">예상 총 투자금</span>
              <span className="text-lg font-bold text-primary">
                {totalInvestment.toLocaleString()}원
              </span>
            </div>
          </div>

          <Separator />

          {/* SMP 단가 슬라이더 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-blue-500" />
                SMP 단가 (원/kWh)
              </Label>
              <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {smpPrice}원
              </span>
            </div>
            <Slider
              value={[smpPrice]}
              onValueChange={(v) => setSmpPrice(v[0])}
              min={80}
              max={200}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>80원</span>
              <span>200원</span>
            </div>
          </div>

          {/* REC 단가 슬라이더 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                REC 단가 (원/REC)
              </Label>
              <span className="text-sm font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded">
                {recPrice.toLocaleString()}원
              </span>
            </div>
            <Slider
              value={[recPrice]}
              onValueChange={(v) => setRecPrice(v[0])}
              min={20000}
              max={80000}
              step={1000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2만원</span>
              <span>8만원</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSimulate}
            disabled={loading || !capacityKw}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                계산 중...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                수익 시뮬레이션
              </>
            )}
          </Button>

          {autoSimulate && (
            <p className="text-xs text-center text-muted-foreground">
              SMP/REC 단가 변경 시 자동으로 재계산됩니다
            </p>
          )}
        </CardContent>
      </Card>

      {/* 결과 */}
      <div className="lg:col-span-2">
        {result ? (
          <SimulationResult
            result={result}
            totalInvestment={totalInvestment}
            capacityKw={capacityKw}
          />
        ) : (
          <Card className="h-full flex items-center justify-center min-h-[400px]">
            <CardContent className="text-center">
              <Sun className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                설치 정보를 입력하고 시뮬레이션을 실행하세요
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                4가지 금융 모델별 20년 예상 수익을 비교할 수 있습니다
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
