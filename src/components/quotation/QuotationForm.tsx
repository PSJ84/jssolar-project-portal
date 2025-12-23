"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { PriceCategory } from "@prisma/client";

interface PriceItem {
  id: string;
  category: PriceCategory;
  name: string;
  unit: string;
  unitPrice: number;
  spec: string | null;
}

interface QuotationItem {
  category: string;
  name: string;
  spec: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface QuotationFormProps {
  quotationId?: string;
  initialData?: {
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    address: string | null;
    capacityKw: number;
    moduleType: string;
    moduleCount: number;
    inverterType: string;
    inverterCount: number;
    structureType: string | null;
    items: QuotationItem[];
  };
}

export function QuotationForm({ quotationId, initialData }: QuotationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(true);

  // 단가 데이터
  const [modules, setModules] = useState<PriceItem[]>([]);
  const [inverters, setInverters] = useState<PriceItem[]>([]);
  const [structures, setStructures] = useState<PriceItem[]>([]);
  const [labors, setLabors] = useState<PriceItem[]>([]);
  const [etcs, setEtcs] = useState<PriceItem[]>([]);

  // 폼 데이터
  const [customerName, setCustomerName] = useState(initialData?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone || "");
  const [customerEmail, setCustomerEmail] = useState(initialData?.customerEmail || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [capacityKw, setCapacityKw] = useState(initialData?.capacityKw?.toString() || "");
  const [moduleType, setModuleType] = useState(initialData?.moduleType || "");
  const [moduleCount, setModuleCount] = useState(initialData?.moduleCount?.toString() || "");
  const [inverterType, setInverterType] = useState(initialData?.inverterType || "");
  const [inverterCount, setInverterCount] = useState(initialData?.inverterCount?.toString() || "");
  const [structureType, setStructureType] = useState(initialData?.structureType || "");

  // 견적 항목
  const [items, setItems] = useState<QuotationItem[]>(initialData?.items || []);

  // 단가표 로드
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch("/api/admin/price-table");
        if (!response.ok) throw new Error("Failed to fetch prices");
        const data: PriceItem[] = await response.json();

        setModules(data.filter(p => p.category === "MODULE"));
        setInverters(data.filter(p => p.category === "INVERTER"));
        setStructures(data.filter(p => p.category === "STRUCTURE"));
        setLabors(data.filter(p => p.category === "LABOR"));
        setEtcs(data.filter(p => p.category === "ETC"));
      } catch (error) {
        console.error("Error fetching prices:", error);
        toast.error("단가표를 불러오는데 실패했습니다.");
      } finally {
        setPricesLoading(false);
      }
    };
    fetchPrices();
  }, []);

  // 자동 계산
  const calculateItems = useCallback(() => {
    if (!capacityKw || !moduleType || !inverterType) return;

    const capacity = parseFloat(capacityKw);
    if (isNaN(capacity) || capacity <= 0) return;

    const module = modules.find(m => m.name === moduleType);
    const inverter = inverters.find(i => i.name === inverterType);
    const structure = structures.find(s => s.name === structureType) || structures[0];

    if (!module || !inverter) return;

    // 모듈 수량 계산 (spec에서 와트 추출)
    const moduleWattMatch = module.spec?.match(/(\d+)\s*W/i);
    const moduleWatt = moduleWattMatch ? parseFloat(moduleWattMatch[1]) : 550;
    const calcModuleCount = Math.ceil((capacity * 1000) / moduleWatt);

    // 인버터 수량 계산 (spec에서 kW 추출)
    const inverterKwMatch = inverter.spec?.match(/(\d+)\s*kW/i);
    const inverterKw = inverterKwMatch ? parseFloat(inverterKwMatch[1]) : 50;
    const calcInverterCount = Math.ceil(capacity / inverterKw);

    setModuleCount(calcModuleCount.toString());
    setInverterCount(calcInverterCount.toString());

    // 견적 항목 생성
    const newItems: QuotationItem[] = [
      {
        category: "MODULE",
        name: module.name,
        spec: module.spec,
        unit: module.unit,
        quantity: calcModuleCount,
        unitPrice: module.unitPrice,
        amount: calcModuleCount * module.unitPrice,
      },
      {
        category: "INVERTER",
        name: inverter.name,
        spec: inverter.spec,
        unit: inverter.unit,
        quantity: calcInverterCount,
        unitPrice: inverter.unitPrice,
        amount: calcInverterCount * inverter.unitPrice,
      },
    ];

    // 구조물
    if (structure) {
      newItems.push({
        category: "STRUCTURE",
        name: structure.name,
        spec: structure.spec,
        unit: structure.unit,
        quantity: capacity,
        unitPrice: structure.unitPrice,
        amount: capacity * structure.unitPrice,
      });
    }

    // 인건비 (첫 번째 항목 사용)
    const labor = labors[0];
    if (labor) {
      newItems.push({
        category: "LABOR",
        name: labor.name,
        spec: labor.spec,
        unit: labor.unit,
        quantity: capacity,
        unitPrice: labor.unitPrice,
        amount: capacity * labor.unitPrice,
      });
    }

    setItems(newItems);
  }, [capacityKw, moduleType, inverterType, structureType, modules, inverters, structures, labors]);

  // 용량 또는 선택 변경 시 자동 계산
  useEffect(() => {
    if (modules.length > 0 && inverters.length > 0) {
      calculateItems();
    }
  }, [capacityKw, moduleType, inverterType, structureType, calculateItems, modules.length, inverters.length]);

  // 금액 계산
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = Math.round(totalAmount * 0.1);
  const grandTotal = totalAmount + vatAmount;

  // 항목 수량 변경
  const handleQuantityChange = (index: number, quantity: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          quantity,
          amount: quantity * item.unitPrice,
        };
      }
      return item;
    }));
  };

  // 항목 삭제
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // 항목 추가
  const handleAddItem = (category: PriceCategory) => {
    let priceList: PriceItem[] = [];
    switch (category) {
      case "MODULE": priceList = modules; break;
      case "INVERTER": priceList = inverters; break;
      case "STRUCTURE": priceList = structures; break;
      case "LABOR": priceList = labors; break;
      case "ETC": priceList = etcs; break;
    }

    // 단가표에 없는 경우 기본 빈 항목 추가
    if (priceList.length === 0) {
      setItems(prev => [...prev, {
        category,
        name: "기타 항목",
        spec: null,
        unit: "식",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      }]);
      return;
    }

    const price = priceList[0];
    setItems(prev => [...prev, {
      category,
      name: price.name,
      spec: price.spec,
      unit: price.unit,
      quantity: 1,
      unitPrice: price.unitPrice,
      amount: price.unitPrice,
    }]);
  };

  // 저장
  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.error("고객명을 입력해주세요.");
      return;
    }
    if (!capacityKw || parseFloat(capacityKw) <= 0) {
      toast.error("올바른 설치 용량을 입력해주세요.");
      return;
    }
    if (!moduleType) {
      toast.error("모듈을 선택해주세요.");
      return;
    }
    if (!inverterType) {
      toast.error("인버터를 선택해주세요.");
      return;
    }
    if (items.length === 0) {
      toast.error("견적 항목이 없습니다.");
      return;
    }

    try {
      setLoading(true);

      const data = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        customerEmail: customerEmail.trim() || null,
        address: address.trim() || null,
        capacityKw: parseFloat(capacityKw),
        moduleType,
        moduleCount: parseInt(moduleCount) || 0,
        inverterType,
        inverterCount: parseInt(inverterCount) || 0,
        structureType: structureType || null,
        items,
      };

      const url = quotationId
        ? `/api/quotations/${quotationId}`
        : "/api/quotations";
      const method = quotationId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "저장에 실패했습니다.");
      }

      const result = await response.json();
      toast.success(quotationId ? "견적서가 수정되었습니다." : "견적서가 생성되었습니다.");
      router.push(`/admin/quotations/${result.id}`);
    } catch (error) {
      console.error("Error saving quotation:", error);
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (pricesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 좌측: 고객 정보 + 설치 정보 */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>고객 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">고객명 *</Label>
              <Input
                id="customerName"
                placeholder="홍길동"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">연락처</Label>
              <Input
                id="customerPhone"
                placeholder="010-1234-5678"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">이메일</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="email@example.com"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">설치 주소</Label>
              <Input
                id="address"
                placeholder="서울시 강남구..."
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>설치 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="capacityKw">설치 용량 (kW) *</Label>
              <Input
                id="capacityKw"
                type="number"
                step="0.1"
                placeholder="100"
                value={capacityKw}
                onChange={e => setCapacityKw(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>모듈 *</Label>
              <Select value={moduleType} onValueChange={setModuleType}>
                <SelectTrigger>
                  <SelectValue placeholder="모듈 선택" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(m => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name} - {m.unitPrice.toLocaleString()}원/{m.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="moduleCount">모듈 수량</Label>
              <Input
                id="moduleCount"
                type="number"
                value={moduleCount}
                onChange={e => setModuleCount(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>인버터 *</Label>
              <Select value={inverterType} onValueChange={setInverterType}>
                <SelectTrigger>
                  <SelectValue placeholder="인버터 선택" />
                </SelectTrigger>
                <SelectContent>
                  {inverters.map(i => (
                    <SelectItem key={i.id} value={i.name}>
                      {i.name} - {i.unitPrice.toLocaleString()}원/{i.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inverterCount">인버터 수량</Label>
              <Input
                id="inverterCount"
                type="number"
                value={inverterCount}
                onChange={e => setInverterCount(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>구조물</Label>
              <Select value={structureType} onValueChange={setStructureType}>
                <SelectTrigger>
                  <SelectValue placeholder="구조물 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {structures.map(s => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name} - {s.unitPrice.toLocaleString()}원/{s.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 우측: 견적 항목 + 합계 */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>견적 항목</CardTitle>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddItem("ETC")}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  기타 추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>항목</TableHead>
                    <TableHead className="w-[100px]">수량</TableHead>
                    <TableHead className="text-right">단가</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        설치 정보를 입력하면 항목이 자동 계산됩니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          {item.spec && (
                            <div className="text-xs text-muted-foreground">{item.spec}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={e => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                            className="w-20 h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {item.unitPrice.toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.amount.toLocaleString()}원
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>합계</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">공급가액</span>
                <span className="font-mono">{totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (10%)</span>
                <span className="font-mono">{vatAmount.toLocaleString()}원</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>총액</span>
                <span className="font-mono text-primary">{grandTotal.toLocaleString()}원</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {quotationId ? "견적서 수정" : "견적서 저장"}
        </Button>
      </div>
    </div>
  );
}
