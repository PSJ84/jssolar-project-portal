"use client";

import { useState, useEffect, useCallback } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calculator, Save, Download } from "lucide-react";
import { toast } from "sonner";
import {
  FinancingType,
  AnalysisInput,
  AnalysisResult,
  calculateProfitAnalysis,
  getFinancingDefaults,
  financingTypeLabels,
  financingTypeDescriptions,
} from "@/lib/profit-analysis";
import { ProfitAnalysisResult } from "./ProfitAnalysisResult";

interface Quotation {
  id: string;
  quotationNumber: string;
  capacityKw: number;
  grandTotal: number;
}

interface KepcoChargeData {
  totalCharge: number;
  applyToProfit: boolean;
}

interface SystemConfig {
  smpPrice: number;
  recPrice: number;
  recWeight: number;
  peakHours: number;
  degradationRate: number;
  maintenanceCost: number;
  monitoringCost: number;
}

interface ProfitAnalysisFormProps {
  quotation: Quotation;
}

export function ProfitAnalysisForm({ quotation }: ProfitAnalysisFormProps) {
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 금융 모델
  const [financingType, setFinancingType] = useState<FinancingType>("SELF_FUNDING");

  // 한전불입금 및 추가 투자비
  const [kepcoCharge, setKepcoCharge] = useState<KepcoChargeData | null>(null);
  const [monitoringEquipmentFee, setMonitoringEquipmentFee] = useState("0");

  // 공통 파라미터
  const [peakHours, setPeakHours] = useState("3.7");
  const [degradationRate, setDegradationRate] = useState("0.8");
  const [smpPrice, setSmpPrice] = useState("120");
  const [recPrice, setRecPrice] = useState("40000");
  const [recWeight, setRecWeight] = useState("1.0");
  const [maintenanceCost, setMaintenanceCost] = useState("41667");  // 월간 (연간 500,000 / 12)
  const [monitoringCost, setMonitoringCost] = useState("25000");    // 월간 (연간 300,000 / 12)

  // 대출 관련
  const [selfFundingRate, setSelfFundingRate] = useState("20");
  const [interestRate, setInterestRate] = useState("5.5");
  const [loanPeriod, setLoanPeriod] = useState("10");

  // 팩토링
  const [factoringFeeRate, setFactoringFeeRate] = useState("8");

  // 설치 용량
  const [capacityKw, setCapacityKw] = useState(quotation.capacityKw.toString());

  // 결과
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);

  // 시스템 설정 및 한전불입금 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 시스템 설정 로드
        const configResponse = await fetch("/api/admin/system-config");
        if (configResponse.ok) {
          const configs = await configResponse.json();
          const configMap: Record<string, string> = {};
          configs.forEach((c: { key: string; value: string }) => {
            configMap[c.key] = c.value;
          });

          if (configMap.SMP_PRICE) setSmpPrice(configMap.SMP_PRICE);
          if (configMap.REC_PRICE) setRecPrice(configMap.REC_PRICE);
          if (configMap.REC_WEIGHT) setRecWeight(configMap.REC_WEIGHT);
          if (configMap.PEAK_HOURS) setPeakHours(configMap.PEAK_HOURS);
          if (configMap.DEGRADATION_RATE) {
            setDegradationRate((parseFloat(configMap.DEGRADATION_RATE) * 100).toString());
          }
          if (configMap.MAINTENANCE_COST) setMaintenanceCost(Math.round(parseFloat(configMap.MAINTENANCE_COST) / 12).toString());
          if (configMap.MONITORING_COST) setMonitoringCost(Math.round(parseFloat(configMap.MONITORING_COST) / 12).toString());
        }

        // 한전불입금 로드
        const kepcoResponse = await fetch(`/api/quotations/${quotation.id}/kepco-charge`);
        if (kepcoResponse.ok) {
          const kepcoData = await kepcoResponse.json();
          if (kepcoData && kepcoData.applyToProfit) {
            setKepcoCharge({
              totalCharge: kepcoData.totalCharge,
              applyToProfit: kepcoData.applyToProfit,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchData();
  }, [quotation.id]);

  // 금융 모델 변경 시 기본값 설정
  useEffect(() => {
    const defaults = getFinancingDefaults(financingType, quotation.grandTotal);

    if (financingType === "SELF_FUNDING") {
      setSelfFundingRate("100");
    } else if (financingType === "FACTORING") {
      setSelfFundingRate("0");
    } else {
      setSelfFundingRate("20");
    }

    if (financingType === "GOVERNMENT_LOAN") {
      setInterestRate("1.75");
      setLoanPeriod("11");
    } else if (financingType === "FACTORING") {
      setLoanPeriod("5");
    } else {
      setLoanPeriod("10");
    }
  }, [financingType, quotation.grandTotal]);

  // 총 투자금액 계산 (공급가액 + 한전불입금 + 감시제어)
  const totalInvestment =
    quotation.grandTotal +
    (kepcoCharge?.applyToProfit ? kepcoCharge.totalCharge : 0) +
    (parseFloat(monitoringEquipmentFee) || 0);

  // 계산 실행
  const handleCalculate = useCallback(() => {
    setLoading(true);

    try {
      const selfRate = parseFloat(selfFundingRate) / 100;
      const loanAmount = totalInvestment * (1 - selfRate);

      const input: AnalysisInput = {
        capacityKw: parseFloat(capacityKw) || 0,
        totalInvestment,
        financingType,
        peakHours: parseFloat(peakHours),
        degradationRate: parseFloat(degradationRate) / 100,
        smpPrice: parseFloat(smpPrice),
        recPrice: parseFloat(recPrice),
        recWeight: parseFloat(recWeight),
        maintenanceCost: parseFloat(maintenanceCost) * 12,  // 월간 → 연간
        monitoringCost: parseFloat(monitoringCost) * 12,   // 월간 → 연간
        selfFundingRate: selfRate,
        loanAmount,
        interestRate: parseFloat(interestRate),
        loanPeriod: parseInt(loanPeriod),
        gracePeriod: financingType === "GOVERNMENT_LOAN" ? 1 : 0,
        guaranteeFeeRate: financingType === "FACTORING" ? 0.05 : undefined,
        factoringFeeRate: financingType === "FACTORING" ? parseFloat(factoringFeeRate) / 100 : undefined,
      };

      const analysisResult = calculateProfitAnalysis(input);
      setResult(analysisResult);
      setSavedAnalysisId(null); // 재계산시 저장 ID 초기화
    } catch (error) {
      console.error("Calculation error:", error);
      toast.error("계산 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [
    totalInvestment,
    capacityKw,
    financingType,
    peakHours,
    degradationRate,
    smpPrice,
    recPrice,
    recWeight,
    maintenanceCost,
    monitoringCost,
    selfFundingRate,
    interestRate,
    loanPeriod,
    factoringFeeRate,
  ]);

  // 저장
  const handleSave = async () => {
    if (!result) {
      toast.error("먼저 수익 분석을 실행해주세요.");
      return;
    }

    try {
      setSaving(true);

      const selfRate = parseFloat(selfFundingRate) / 100;
      const loanAmount = quotation.grandTotal * (1 - selfRate);

      const response = await fetch(`/api/quotations/${quotation.id}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financingType,
          peakHours: parseFloat(peakHours),
          degradationRate: parseFloat(degradationRate) / 100,
          smpPrice: parseFloat(smpPrice),
          recPrice: parseFloat(recPrice),
          recWeight: parseFloat(recWeight),
          maintenanceCost: parseFloat(maintenanceCost) * 12,  // 월간 → 연간
          monitoringCost: parseFloat(monitoringCost) * 12,   // 월간 → 연간
          selfFundingRate: selfRate,
          loanAmount,
          interestRate: parseFloat(interestRate),
          loanPeriod: parseInt(loanPeriod),
          gracePeriod: financingType === "GOVERNMENT_LOAN" ? 1 : 0,
          guaranteeFeeRate: financingType === "FACTORING" ? 0.05 : null,
          factoringFeeRate: financingType === "FACTORING" ? parseFloat(factoringFeeRate) / 100 : null,
          yearlyData: result.yearlyData,
          paybackPeriod: result.paybackPeriod,
          totalProfit20y: result.totalProfit20y,
          roi: result.roi,
        }),
      });

      if (!response.ok) {
        throw new Error("저장에 실패했습니다.");
      }

      const savedAnalysis = await response.json();
      setSavedAnalysisId(savedAnalysis.id);
      toast.success("수익분석이 저장되었습니다.");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">투자비용</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">견적번호</span>
              <p className="font-medium">{quotation.quotationNumber}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">설치 용량 (kW)</Label>
              <Input
                type="number"
                step="0.1"
                value={capacityKw}
                onChange={(e) => setCapacityKw(e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">견적 공급가액</span>
              <span>{quotation.grandTotal.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                한전불입금
                {kepcoCharge?.applyToProfit ? "" : " (미반영)"}
              </span>
              <span className={kepcoCharge?.applyToProfit ? "" : "text-muted-foreground"}>
                {kepcoCharge ? `${kepcoCharge.totalCharge.toLocaleString()}원` : "미입력"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground text-sm">감시제어 장비비</Label>
              <Input
                type="number"
                value={monitoringEquipmentFee}
                onChange={(e) => setMonitoringEquipmentFee(e.target.value)}
                className="h-8 w-40 text-right"
                placeholder="0"
              />
            </div>
            <Separator />
            <div className="flex justify-between font-medium pt-1">
              <span>총 투자금액</span>
              <span className="text-primary">{totalInvestment.toLocaleString()}원</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 금융 모델 선택 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">금융 모델 선택</CardTitle>
              <CardDescription>투자 방식을 선택하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={financingType}
                onValueChange={(v: string) => setFinancingType(v as FinancingType)}
                className="space-y-3"
              >
                {(Object.keys(financingTypeLabels) as FinancingType[]).map((type) => (
                  <div key={type} className="flex items-start space-x-3">
                    <RadioGroupItem value={type} id={type} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={type} className="font-medium cursor-pointer">
                        {financingTypeLabels[type]}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {financingTypeDescriptions[type]}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 금융 모델별 입력 필드 */}
          {financingType !== "SELF_FUNDING" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">대출 조건</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>자부담 비율 (%)</Label>
                    <Input
                      type="number"
                      value={selfFundingRate}
                      onChange={(e) => setSelfFundingRate(e.target.value)}
                      disabled={financingType === "FACTORING"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>대출 금액</Label>
                    <Input
                      value={`${Math.round(totalInvestment * (1 - parseFloat(selfFundingRate) / 100)).toLocaleString()}원`}
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>금리 (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      disabled={financingType === "GOVERNMENT_LOAN"}
                    />
                    {financingType === "GOVERNMENT_LOAN" && (
                      <p className="text-xs text-muted-foreground">
                        금융지원사업 고정 금리
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>상환 기간 (년)</Label>
                    <Input
                      type="number"
                      value={loanPeriod}
                      onChange={(e) => setLoanPeriod(e.target.value)}
                      disabled={financingType === "GOVERNMENT_LOAN"}
                    />
                    {financingType === "GOVERNMENT_LOAN" && (
                      <p className="text-xs text-muted-foreground">
                        거치 1년 + 상환 10년
                      </p>
                    )}
                  </div>
                </div>

                {financingType === "FACTORING" && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>서울보증 보증료 (%)</Label>
                        <Input type="number" value="5" disabled />
                        <p className="text-xs text-muted-foreground">고정 5%</p>
                      </div>
                      <div className="space-y-2">
                        <Label>동부화재 수수료 (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={factoringFeeRate}
                          onChange={(e) => setFactoringFeeRate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">7~9%</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 오른쪽: 공통 파라미터 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">수익 계산 파라미터</CardTitle>
            <CardDescription>설정 &gt; 단가표 관리에서 기본값 변경 가능</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>일조 시간 (h/day)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={peakHours}
                  onChange={(e) => setPeakHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>효율 저하율 (%/년)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={degradationRate}
                  onChange={(e) => setDegradationRate(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMP 단가 (원/kWh)</Label>
                <Input
                  type="number"
                  value={smpPrice}
                  onChange={(e) => setSmpPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>REC 단가 (원/REC)</Label>
                <Input
                  type="number"
                  value={recPrice}
                  onChange={(e) => setRecPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>REC 가중치</Label>
              <Input
                type="number"
                step="0.1"
                value={recWeight}
                onChange={(e) => setRecWeight(e.target.value)}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>월간 안전관리비 (원)</Label>
                <Input
                  type="number"
                  value={maintenanceCost}
                  onChange={(e) => setMaintenanceCost(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">연간: {(parseFloat(maintenanceCost || "0") * 12).toLocaleString()}원</p>
              </div>
              <div className="space-y-2">
                <Label>월간 모니터링비 (원)</Label>
                <Input
                  type="number"
                  value={monitoringCost}
                  onChange={(e) => setMonitoringCost(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">연간: {(parseFloat(monitoringCost || "0") * 12).toLocaleString()}원</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 계산 버튼 */}
      <div className="flex gap-3">
        <Button onClick={handleCalculate} disabled={loading} className="flex-1">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4 mr-2" />
          )}
          수익 분석
        </Button>
        {result && (
          <>
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              결과 저장
            </Button>
            {savedAnalysisId && (
              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    `/api/quotations/${quotation.id}/analysis/${savedAnalysisId}/pdf`,
                    "_blank"
                  )
                }
              >
                <Download className="h-4 w-4 mr-2" />
                PDF 다운로드
              </Button>
            )}
          </>
        )}
      </div>

      {/* 결과 표시 */}
      {result && (
        <ProfitAnalysisResult
          result={result}
          financingType={financingType}
          totalInvestment={totalInvestment}
        />
      )}
    </div>
  );
}
