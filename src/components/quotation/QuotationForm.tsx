"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GripVertical, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

interface QuotationItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  note: string;
  execUnitPrice: number;
  execAmount: number;
}

const UNITS = ["EA", "식", "kW", "m", "m²", "SET", "LOT", "개", "대"];

const DEFAULT_ITEMS: Omit<QuotationItem, "id">[] = [
  { name: "태양광 모듈", unit: "kW", quantity: 0, unitPrice: 0, amount: 0, note: "", execUnitPrice: 0, execAmount: 0 },
  { name: "인버터", unit: "EA", quantity: 0, unitPrice: 0, amount: 0, note: "", execUnitPrice: 0, execAmount: 0 },
  { name: "계량기함", unit: "식", quantity: 1, unitPrice: 0, amount: 0, note: "", execUnitPrice: 0, execAmount: 0 },
  { name: "전기공사", unit: "kW", quantity: 0, unitPrice: 0, amount: 0, note: "", execUnitPrice: 0, execAmount: 0 },
  { name: "구조물 제작", unit: "kW", quantity: 0, unitPrice: 0, amount: 0, note: "", execUnitPrice: 0, execAmount: 0 },
  { name: "구조물 설치", unit: "kW", quantity: 0, unitPrice: 0, amount: 0, note: "", execUnitPrice: 0, execAmount: 0 },
  { name: "구조물 도면 및 구조검토비", unit: "식", quantity: 1, unitPrice: 0, amount: 0, note: "", execUnitPrice: 0, execAmount: 0 },
  { name: "모니터링 시스템", unit: "식", quantity: 1, unitPrice: 0, amount: 0, note: "", execUnitPrice: 0, execAmount: 0 },
  { name: "전기 설계 및 관리", unit: "식", quantity: 1, unitPrice: 0, amount: 0, note: "", execUnitPrice: 0, execAmount: 0 },
  { name: "인허가 대행 및 수수료", unit: "식", quantity: 1, unitPrice: 0, amount: 0, note: "", execUnitPrice: 0, execAmount: 0 },
  { name: "일반관리비 및 이윤", unit: "식", quantity: 1, unitPrice: 0, amount: 0, note: "", execUnitPrice: 0, execAmount: 0 },
];

type RoundingType = "NONE" | "THOUSAND" | "TEN_THOUSAND";

function calculateRounding(amount: number, type: RoundingType): number {
  if (type === "NONE") return 0;
  if (type === "THOUSAND") return -(amount % 1000);
  if (type === "TEN_THOUSAND") return -(amount % 10000);
  return 0;
}

// 드래그 가능한 행 컴포넌트
function SortableRow({ item, index, onUpdate, onRemove, showExec }: {
  item: QuotationItem;
  index: number;
  onUpdate: (id: string, field: keyof QuotationItem, value: string | number) => void;
  onRemove: (id: string) => void;
  showExec: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <div {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">{index + 1}</TableCell>
      <TableCell>
        <Input
          value={item.name}
          onChange={(e) => onUpdate(item.id, "name", e.target.value)}
          className="min-w-[200px]"
        />
      </TableCell>
      <TableCell>
        <Select value={item.unit} onValueChange={(v) => onUpdate(item.id, "unit", v)}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map(unit => (
              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.001"
          value={item.quantity || ""}
          onChange={(e) => onUpdate(item.id, "quantity", parseFloat(e.target.value) || 0)}
          className="w-24 text-right"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={item.unitPrice || ""}
          onChange={(e) => onUpdate(item.id, "unitPrice", parseInt(e.target.value) || 0)}
          className="w-28 text-right"
        />
      </TableCell>
      <TableCell className="text-right font-medium w-32">
        {item.amount.toLocaleString()}
      </TableCell>
      <TableCell>
        <Input
          value={item.note}
          onChange={(e) => onUpdate(item.id, "note", e.target.value)}
          className="min-w-[100px]"
          placeholder="비고"
        />
      </TableCell>
      {showExec && (
        <>
          <TableCell>
            <Input
              type="number"
              value={item.execUnitPrice || ""}
              onChange={(e) => onUpdate(item.id, "execUnitPrice", parseInt(e.target.value) || 0)}
              className="w-28 text-right"
            />
          </TableCell>
          <TableCell className="text-right font-medium w-32">
            {item.execAmount.toLocaleString()}
          </TableCell>
        </>
      )}
      <TableCell>
        <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} type="button">
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface QuotationFormProps {
  quotationId?: string;  // 수정 시
  projectId?: string;    // 프로젝트 연결 시
}

export function QuotationForm({ quotationId, projectId }: QuotationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!quotationId);
  const [showExec, setShowExec] = useState(false);  // 실행견적 표시 여부

  // 견적서 헤더 정보
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [projectName, setProjectName] = useState("");
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [vatIncluded, setVatIncluded] = useState(false);
  const [roundingType, setRoundingType] = useState<RoundingType>("NONE");

  // 견적 항목
  const [items, setItems] = useState<QuotationItem[]>(() =>
    DEFAULT_ITEMS.map(item => ({ ...item, id: crypto.randomUUID() }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 기존 견적서 불러오기
  useEffect(() => {
    if (quotationId) {
      fetchQuotation();
    }
  }, [quotationId]);

  const fetchQuotation = async () => {
    try {
      const res = await fetch(`/api/quotations/${quotationId}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerName(data.customerName || "");
        setCustomerAddress(data.customerAddress || "");
        setProjectName(data.projectName || "");
        setQuotationDate(data.quotationDate?.split("T")[0] || new Date().toISOString().split("T")[0]);
        setValidUntil(data.validUntil?.split("T")[0] || "");
        setSpecialNotes(data.specialNotes || "");
        setVatIncluded(data.vatIncluded || false);
        setRoundingType(data.roundingType || "NONE");
        if (data.items?.length > 0) {
          setItems(data.items.map((item: {
            id?: string;
            name: string;
            unit: string;
            quantity: number;
            unitPrice: number;
            amount: number;
            note?: string;
            execUnitPrice?: number;
            execAmount?: number;
          }) => ({
            id: item.id || crypto.randomUUID(),
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            note: item.note || "",
            execUnitPrice: item.execUnitPrice || 0,
            execAmount: item.execAmount || 0,
          })));
        }
      }
    } catch (error) {
      console.error("Error fetching quotation:", error);
      toast.error("견적서를 불러오는데 실패했습니다.");
    } finally {
      setInitialLoading(false);
    }
  };

  // 항목 추가
  const addItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      name: "",
      unit: "식",
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      note: "",
      execUnitPrice: 0,
      execAmount: 0,
    }]);
  };

  // 항목 삭제
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // 항목 수정
  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // 금액 자동 계산
      if (field === "quantity" || field === "unitPrice") {
        updated.amount = Math.round(updated.quantity * updated.unitPrice);
      }
      if (field === "quantity" || field === "execUnitPrice") {
        updated.execAmount = Math.round(updated.quantity * updated.execUnitPrice);
      }

      return updated;
    }));
  };

  // 드래그 끝
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // 합계 계산
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const execSubtotal = items.reduce((sum, item) => sum + item.execAmount, 0);
  const rounding = calculateRounding(subtotal, roundingType);
  const execRounding = calculateRounding(execSubtotal, roundingType);
  const total = subtotal + rounding;
  const execTotal = execSubtotal + execRounding;
  const profit = total - execTotal;
  const profitRate = total > 0 ? ((profit / total) * 100).toFixed(1) : "0";

  // 저장
  const handleSave = async () => {
    if (!customerName) {
      toast.error("수신(고객명)을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const url = quotationId ? `/api/quotations/${quotationId}` : "/api/quotations";
      const method = quotationId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerAddress,
          projectName,
          quotationDate,
          validUntil: validUntil || null,
          specialNotes,
          vatIncluded,
          roundingType,
          subtotal,
          roundingAmount: rounding,
          totalAmount: total,
          execSubtotal,
          execTotal,
          projectId,
          items: items.map((item, index) => ({
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            note: item.note,
            execUnitPrice: item.execUnitPrice,
            execAmount: item.execAmount,
            sortOrder: index,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("견적서가 저장되었습니다.");
        router.push(`/admin/quotations/${data.id}`);
      } else {
        throw new Error("저장 실패");
      }
    } catch (error) {
      console.error("Error saving quotation:", error);
      toast.error("견적서 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>견적 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>수신 (고객명) *</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="고객명"
            />
          </div>
          <div className="space-y-2">
            <Label>고객 주소</Label>
            <Input
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="주소"
            />
          </div>
          <div className="space-y-2">
            <Label>건명</Label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="프로젝트명"
            />
          </div>
          <div className="space-y-2">
            <Label>견적일자</Label>
            <Input
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>유효기간</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
          <div className="space-y-2 flex items-center gap-4">
            <Label>부가세</Label>
            <Select value={vatIncluded ? "included" : "excluded"} onValueChange={(v) => setVatIncluded(v === "included")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excluded">별도</SelectItem>
                <SelectItem value="included">포함</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 견적 항목 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>견적 항목</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExec(!showExec)}
              type="button"
            >
              {showExec ? "실행견적 숨기기" : "실행견적 보기"}
            </Button>
            <Button variant="outline" size="sm" onClick={addItem} type="button">
              <Plus className="h-4 w-4 mr-1" /> 항목 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-12 text-center">NO</TableHead>
                    <TableHead>품명 및 규격</TableHead>
                    <TableHead className="w-20">단위</TableHead>
                    <TableHead className="w-24">수량</TableHead>
                    <TableHead className="w-28">단가</TableHead>
                    <TableHead className="w-32 text-right">금액</TableHead>
                    <TableHead>비고</TableHead>
                    {showExec && (
                      <>
                        <TableHead className="w-28 bg-blue-50">실행단가</TableHead>
                        <TableHead className="w-32 text-right bg-blue-50">실행금액</TableHead>
                      </>
                    )}
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {items.map((item, index) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        index={index}
                        onUpdate={updateItem}
                        onRemove={removeItem}
                        showExec={showExec}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>

          {/* 합계 영역 */}
          <div className="mt-6 border-t pt-4">
            <div className="flex flex-col md:flex-row md:justify-between gap-4">
              {/* 잔액정리 선택 */}
              <div className="flex items-center gap-2">
                <Label>잔액정리:</Label>
                <Select value={roundingType} onValueChange={(v) => setRoundingType(v as RoundingType)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">없음</SelectItem>
                    <SelectItem value="THOUSAND">천단위 절삭</SelectItem>
                    <SelectItem value="TEN_THOUSAND">만단위 절삭</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 합계 */}
              <div className="space-y-2 text-right">
                <div className="flex justify-end gap-8">
                  <span>소계:</span>
                  <span className="font-medium w-32">{subtotal.toLocaleString()}원</span>
                  {showExec && <span className="font-medium w-32 text-blue-600">{execSubtotal.toLocaleString()}원</span>}
                </div>
                {rounding !== 0 && (
                  <div className="flex justify-end gap-8 text-sm text-muted-foreground">
                    <span>잔액정리:</span>
                    <span className="w-32">{rounding.toLocaleString()}원</span>
                    {showExec && <span className="w-32">{execRounding.toLocaleString()}원</span>}
                  </div>
                )}
                <div className="flex justify-end gap-8 text-lg font-bold">
                  <span>합계:</span>
                  <span className="w-32">{total.toLocaleString()}원</span>
                  {showExec && <span className="w-32 text-blue-600">{execTotal.toLocaleString()}원</span>}
                </div>
                <div className="text-sm text-muted-foreground">
                  (부가세{vatIncluded ? "포함" : "별도"})
                </div>
              </div>
            </div>

            {/* 예상 이익 (실행견적 표시 시) */}
            {showExec && execSubtotal > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">예상 이익:</span>
                  <span className={`text-lg font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {profit >= 0 ? "+" : ""}{profit.toLocaleString()}원 ({profitRate}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 특기사항 */}
      <Card>
        <CardHeader>
          <CardTitle>특기사항</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            placeholder="특기사항을 입력하세요..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()} type="button">
          취소
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}
