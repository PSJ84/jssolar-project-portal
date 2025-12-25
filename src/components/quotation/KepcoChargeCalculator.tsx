"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, ChevronDown, ChevronUp, Save, Zap, Info } from "lucide-react";
import { toast } from "sonner";
import {
  calculateKepcoCharge,
  VoltageType,
  SupplyType,
  PaymentType,
  VOLTAGE_OPTIONS,
  SUPPLY_OPTIONS,
  PAYMENT_OPTIONS,
  KEPCO_RATES,
} from "@/lib/kepco-charge";

interface KepcoChargeData {
  id?: string;
  capacityKw: number;
  voltageType: string;
  supplyType: string;
  basicCharge: number;
  distanceCharge: number;
  totalCharge: number;
  paymentType: string;
  downPayment: number | null;
  totalInterest: number | null;
  totalWithInterest: number | null;
  applyToProfit: boolean;
}

interface KepcoChargeCalculatorProps {
  quotationId: string;
  defaultCapacityKw?: number;
  onSave?: (data: KepcoChargeData) => void;
}

export function KepcoChargeCalculator({
  quotationId,
  defaultCapacityKw = 0,
  onSave,
}: KepcoChargeCalculatorProps) {
  // 입력 상태
  const [capacityKw, setCapacityKw] = useState(defaultCapacityKw);
  const [voltageType, setVoltageType] = useState<VoltageType>("저압");
  const [supplyType, setSupplyType] = useState<SupplyType>("공중");
  const [distanceCharge, setDistanceCharge] = useState(0);
  const [paymentType, setPaymentType] = useState<PaymentType>("LUMP_SUM");
  const [applyToProfit, setApplyToProfit] = useState(true);

  // UI 상태
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // 계산 결과
  const calculation = useMemo(() => {
    return calculateKepcoCharge(
      capacityKw,
      voltageType,
      supplyType,
      distanceCharge,
      paymentType
    );
  }, [capacityKw, voltageType, supplyType, distanceCharge, paymentType]);

  // 기존 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/quotations/${quotationId}/kepco-charge`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setExistingId(data.id);
            setCapacityKw(data.capacityKw);
            setVoltageType(data.voltageType as VoltageType);
            setSupplyType(data.supplyType as SupplyType);
            setDistanceCharge(data.distanceCharge);
            setPaymentType(data.paymentType as PaymentType);
            setApplyToProfit(data.applyToProfit);
          }
        }
      } catch (error) {
        console.error("Failed to fetch kepco charge:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [quotationId]);

  // 견적서 용량 변경 시 업데이트
  useEffect(() => {
    if (defaultCapacityKw > 0 && capacityKw === 0) {
      setCapacityKw(defaultCapacityKw);
    }
  }, [defaultCapacityKw, capacityKw]);

  // 저장
  const handleSave = useCallback(async () => {
    if (capacityKw <= 0) {
      toast.error("계약전력을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        capacityKw,
        voltageType,
        supplyType,
        basicCharge: calculation.basicCharge,
        distanceCharge,
        totalCharge: calculation.totalCharge,
        paymentType,
        downPayment: calculation.installment?.downPayment || null,
        totalInterest: calculation.installment?.totalInterest || null,
        totalWithInterest: calculation.installment?.totalWithInterest || null,
        applyToProfit,
      };

      const res = await fetch(`/api/quotations/${quotationId}/kepco-charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      const data = await res.json();
      setExistingId(data.id);
      toast.success("한전불입금이 저장되었습니다.");
      onSave?.(data);
    } catch (error) {
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }, [
    quotationId,
    capacityKw,
    voltageType,
    supplyType,
    distanceCharge,
    paymentType,
    applyToProfit,
    calculation,
    onSave,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 계약전력 */}
          <div className="space-y-2">
            <Label htmlFor="capacityKw">계약전력 (kW)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="capacityKw"
                type="number"
                step="0.01"
                value={capacityKw || ""}
                onChange={(e) => setCapacityKw(parseFloat(e.target.value) || 0)}
                className="max-w-[200px]"
              />
              {defaultCapacityKw > 0 && capacityKw !== defaultCapacityKw && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCapacityKw(defaultCapacityKw)}
                >
                  견적서 값 ({defaultCapacityKw} kW)
                </Button>
              )}
            </div>
          </div>

          {/* 전압구분 */}
          <div className="space-y-2">
            <Label>전압구분</Label>
            <RadioGroup
              value={voltageType}
              onValueChange={(v) => setVoltageType(v as VoltageType)}
              className="flex gap-4"
            >
              {VOLTAGE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`voltage-${opt.value}`} />
                  <Label htmlFor={`voltage-${opt.value}`} className="cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 공급방식 */}
          <div className="space-y-2">
            <Label>공급방식</Label>
            <RadioGroup
              value={supplyType}
              onValueChange={(v) => setSupplyType(v as SupplyType)}
              className="flex gap-4"
            >
              {SUPPLY_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`supply-${opt.value}`} />
                  <Label htmlFor={`supply-${opt.value}`} className="cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* 기본시설부담금 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">기본시설부담금 (자동 계산)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {calculation.basicChargeDetails.map((detail, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{detail.description}</span>
                <span>{detail.amount.toLocaleString()}원</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>소계</span>
              <span>{calculation.basicCharge.toLocaleString()}원</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 거리시설부담금 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">거리시설부담금 (직접 입력)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={distanceCharge || ""}
              onChange={(e) => setDistanceCharge(parseInt(e.target.value) || 0)}
              className="max-w-[200px]"
              placeholder="0"
            />
            <span className="text-sm text-muted-foreground">원</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            한전 고지서에 명시된 거리시설부담금을 입력하세요.
          </p>
        </CardContent>
      </Card>

      {/* 청구금액 합계 */}
      <Card className="bg-primary/5">
        <CardContent className="py-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">청구금액 합계</span>
            <span className="text-2xl font-bold">
              {calculation.totalCharge.toLocaleString()}원
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">부가세 불포함</p>
        </CardContent>
      </Card>

      {/* 납부방식 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">납부방식</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={paymentType}
            onValueChange={(v) => setPaymentType(v as PaymentType)}
            className="space-y-2"
          >
            {PAYMENT_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={`payment-${opt.value}`} />
                <Label htmlFor={`payment-${opt.value}`} className="cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* 분할납부 상세 */}
          {paymentType === "INSTALLMENT" && calculation.installment && (
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">선납금 (30%):</span>
                  <span className="font-medium ml-2">
                    {calculation.installment.downPayment.toLocaleString()}원
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">잔여금:</span>
                  <span className="font-medium ml-2">
                    {calculation.installment.remaining.toLocaleString()}원
                  </span>
                </div>
              </div>

              <Collapsible open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    {isScheduleOpen ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        월별 납부 스케줄 닫기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        월별 납부 스케줄 보기
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">회차</TableHead>
                        <TableHead className="text-right">원금</TableHead>
                        <TableHead className="text-right">이자</TableHead>
                        <TableHead className="text-right">납부액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculation.installment.schedule.map((item) => (
                        <TableRow key={item.month}>
                          <TableCell>{item.month}차</TableCell>
                          <TableCell className="text-right">
                            {item.principal.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.interest.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.total.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">총 이자:</span>
                  <span className="text-orange-600 font-medium">
                    +{calculation.installment.totalInterest.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="font-medium">총 납부금액:</span>
                  <span className="font-bold">
                    {calculation.installment.totalWithInterest.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 수익분석 반영 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">수익분석 반영</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="applyToProfit"
              checked={applyToProfit}
              onCheckedChange={(checked) => setApplyToProfit(checked === true)}
            />
            <Label htmlFor="applyToProfit" className="cursor-pointer">
              수익분석에 반영하기
            </Label>
          </div>
          {applyToProfit && (
            <div className="text-sm text-muted-foreground">
              반영금액:{" "}
              <span className="font-medium text-foreground">
                {calculation.totalCharge.toLocaleString()}원
              </span>{" "}
              (일시불 기준)
            </div>
          )}
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            저장 중...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            저장
          </>
        )}
      </Button>
    </div>
  );
}
