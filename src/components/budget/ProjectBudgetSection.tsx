"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BudgetTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  isCompleted: boolean;
}

interface BudgetItem {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  plannedAmount: number;
  memo: string | null;
  sortOrder: number;
  transactions: BudgetTransaction[];
}

interface BudgetSummary {
  income: { planned: number; actual: number; pending: number };
  expense: { planned: number; actual: number; pending: number };
  profit: { current: number; expected: number; rate: number };
}

interface ProjectBudgetSectionProps {
  projectId: string;
}

// 금액 포맷
function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount);
}

// 날짜 포맷
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export function ProjectBudgetSection({ projectId }: ProjectBudgetSectionProps) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [editingTx, setEditingTx] = useState<{ item: BudgetItem; tx: BudgetTransaction | null } | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState({ type: "INCOME" as "INCOME" | "EXPENSE", category: "", plannedAmount: "", memo: "" });
  const [txForm, setTxForm] = useState({ date: "", description: "", amount: "", isCompleted: true });
  const [saving, setSaving] = useState(false);

  // 데이터 로드
  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, summaryRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/budget-items`),
        fetch(`/api/projects/${projectId}/budget-summary`),
      ]);

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (error) {
      console.error("Error fetching budget data:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 품목 추가/수정
  const handleSaveItem = async () => {
    if (!itemForm.category || !itemForm.plannedAmount) {
      toast.error("카테고리와 계획 금액을 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/projects/${projectId}/budget-items/${editingItem.id}`
        : `/api/projects/${projectId}/budget-items`;

      const res = await fetch(url, {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: itemForm.type,
          category: itemForm.category,
          plannedAmount: parseInt(itemForm.plannedAmount.replace(/,/g, "")),
          memo: itemForm.memo || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(editingItem ? "수정되었습니다" : "추가되었습니다");
      setItemDialogOpen(false);
      setEditingItem(null);
      setItemForm({ type: "INCOME", category: "", plannedAmount: "", memo: "" });
      fetchData();
    } catch (error) {
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  // 품목 삭제
  const handleDeleteItem = async (item: BudgetItem) => {
    if (!confirm(`"${item.category}" 품목을 삭제하시겠습니까?\n관련 거래 내역도 함께 삭제됩니다.`)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/budget-items/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("삭제되었습니다");
      fetchData();
    } catch (error) {
      toast.error("삭제에 실패했습니다");
    }
  };

  // 거래 내역 추가/수정
  const handleSaveTx = async () => {
    if (!editingTx || !txForm.date || !txForm.description || !txForm.amount) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      const url = editingTx.tx
        ? `/api/projects/${projectId}/budget-items/${editingTx.item.id}/transactions/${editingTx.tx.id}`
        : `/api/projects/${projectId}/budget-items/${editingTx.item.id}/transactions`;

      const res = await fetch(url, {
        method: editingTx.tx ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: txForm.date,
          description: txForm.description,
          amount: parseInt(txForm.amount.replace(/,/g, "")),
          isCompleted: txForm.isCompleted,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(editingTx.tx ? "수정되었습니다" : "추가되었습니다");
      setTxDialogOpen(false);
      setEditingTx(null);
      setTxForm({ date: "", description: "", amount: "", isCompleted: true });
      fetchData();
    } catch (error) {
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  // 거래 내역 삭제
  const handleDeleteTx = async (item: BudgetItem, tx: BudgetTransaction) => {
    if (!confirm(`"${tx.description}" 내역을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/budget-items/${item.id}/transactions/${tx.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("삭제되었습니다");
      fetchData();
    } catch (error) {
      toast.error("삭제에 실패했습니다");
    }
  };

  // 품목 편집 다이얼로그 열기
  const openItemDialog = (item?: BudgetItem, type?: "INCOME" | "EXPENSE") => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        type: item.type,
        category: item.category,
        plannedAmount: formatAmount(item.plannedAmount),
        memo: item.memo || "",
      });
    } else {
      setEditingItem(null);
      setItemForm({ type: type || "INCOME", category: "", plannedAmount: "", memo: "" });
    }
    setItemDialogOpen(true);
  };

  // 거래 내역 다이얼로그 열기
  const openTxDialog = (item: BudgetItem, tx?: BudgetTransaction) => {
    setEditingTx({ item, tx: tx || null });
    if (tx) {
      setTxForm({
        date: tx.date.split("T")[0],
        description: tx.description,
        amount: formatAmount(tx.amount),
        isCompleted: tx.isCompleted,
      });
    } else {
      setTxForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        isCompleted: true,
      });
    }
    setTxDialogOpen(true);
  };

  // 품목별 실제 금액 계산
  const getActualAmount = (item: BudgetItem) => {
    return item.transactions
      .filter((tx) => tx.isCompleted)
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const incomeItems = items.filter((i) => i.type === "INCOME");
  const expenseItems = items.filter((i) => i.type === "EXPENSE");

  return (
    <div className="space-y-6">
      {/* 손익 요약 카드 */}
      {summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">손익 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 총 매출 */}
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <ArrowUpCircle className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">총 매출 (계획)</p>
                <p className="text-lg font-bold text-blue-700">
                  {formatAmount(summary.income.planned)}
                </p>
                <p className="text-xs text-blue-600">
                  입금 {formatAmount(summary.income.actual)}
                </p>
              </div>

              {/* 총 지출 */}
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <ArrowDownCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">총 지출 (계획)</p>
                <p className="text-lg font-bold text-red-700">
                  {formatAmount(summary.expense.planned)}
                </p>
                <p className="text-xs text-red-600">
                  지출 {formatAmount(summary.expense.actual)}
                </p>
              </div>

              {/* 현재 이익 */}
              <div className={cn(
                "text-center p-3 rounded-lg",
                summary.profit.current >= 0 ? "bg-green-50" : "bg-orange-50"
              )}>
                {summary.profit.current >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500 mx-auto mb-1" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                )}
                <p className="text-xs text-muted-foreground">현재 손익</p>
                <p className={cn(
                  "text-lg font-bold",
                  summary.profit.current >= 0 ? "text-green-700" : "text-orange-700"
                )}>
                  {summary.profit.current >= 0 ? "+" : ""}{formatAmount(summary.profit.current)}
                </p>
              </div>

              {/* 예상 최종 이익 */}
              <div className={cn(
                "text-center p-3 rounded-lg",
                summary.profit.expected >= 0 ? "bg-green-50" : "bg-orange-50"
              )}>
                {summary.profit.expected >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500 mx-auto mb-1" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                )}
                <p className="text-xs text-muted-foreground">예상 최종 이익</p>
                <p className={cn(
                  "text-lg font-bold",
                  summary.profit.expected >= 0 ? "text-green-700" : "text-orange-700"
                )}>
                  {summary.profit.expected >= 0 ? "+" : ""}{formatAmount(summary.profit.expected)}
                </p>
                <p className={cn(
                  "text-xs",
                  summary.profit.rate >= 0 ? "text-green-600" : "text-orange-600"
                )}>
                  이익률 {summary.profit.rate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 매출 (INCOME) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-blue-500" />
              매출 (수입)
            </CardTitle>
            <Button size="sm" onClick={() => openItemDialog(undefined, "INCOME")}>
              <Plus className="h-4 w-4 mr-1" />
              품목 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {incomeItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">등록된 매출 품목이 없습니다</p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {incomeItems.map((item) => {
                const actual = getActualAmount(item);
                const diff = actual - item.plannedAmount;
                return (
                  <AccordionItem key={item.id} value={item.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center justify-between flex-1 mr-2">
                        <span className="font-medium">{item.category}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            계획: {formatAmount(item.plannedAmount)}
                          </span>
                          <span className="text-blue-600">
                            실제: {formatAmount(actual)}
                          </span>
                          <Badge variant={diff >= 0 ? "default" : "destructive"} className="text-xs">
                            {diff >= 0 ? "+" : ""}{formatAmount(diff)}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pb-3">
                        {/* 품목 액션 */}
                        <div className="flex items-center justify-between">
                          <Button variant="outline" size="sm" onClick={() => openTxDialog(item)}>
                            <Plus className="h-3 w-3 mr-1" />
                            내역 추가
                          </Button>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openItemDialog(item)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteItem(item)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* 거래 내역 */}
                        {item.transactions.length > 0 ? (
                          <div className="space-y-2">
                            {item.transactions.map((tx) => (
                              <div key={tx.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                                <div className="flex items-center gap-2">
                                  {tx.isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                  )}
                                  <span className="text-muted-foreground">{formatDate(tx.date)}</span>
                                  <span>{tx.description}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{formatAmount(tx.amount)}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openTxDialog(item, tx)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteTx(item, tx)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">거래 내역이 없습니다</p>
                        )}

                        {/* 메모 */}
                        {item.memo && (
                          <p className="text-xs text-muted-foreground italic">메모: {item.memo}</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* 매입 (EXPENSE) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
              매입 (지출)
            </CardTitle>
            <Button size="sm" onClick={() => openItemDialog(undefined, "EXPENSE")}>
              <Plus className="h-4 w-4 mr-1" />
              품목 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {expenseItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">등록된 매입 품목이 없습니다</p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {expenseItems.map((item) => {
                const actual = getActualAmount(item);
                const diff = item.plannedAmount - actual; // 예산 대비 절감이 +
                return (
                  <AccordionItem key={item.id} value={item.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center justify-between flex-1 mr-2">
                        <span className="font-medium">{item.category}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            계획: {formatAmount(item.plannedAmount)}
                          </span>
                          <span className="text-red-600">
                            실제: {formatAmount(actual)}
                          </span>
                          <Badge variant={diff >= 0 ? "secondary" : "destructive"} className="text-xs">
                            {diff >= 0 ? "절감 " : "초과 "}{formatAmount(Math.abs(diff))}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pb-3">
                        {/* 품목 액션 */}
                        <div className="flex items-center justify-between">
                          <Button variant="outline" size="sm" onClick={() => openTxDialog(item)}>
                            <Plus className="h-3 w-3 mr-1" />
                            내역 추가
                          </Button>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openItemDialog(item)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteItem(item)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* 거래 내역 */}
                        {item.transactions.length > 0 ? (
                          <div className="space-y-2">
                            {item.transactions.map((tx) => (
                              <div key={tx.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                                <div className="flex items-center gap-2">
                                  {tx.isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                  )}
                                  <span className="text-muted-foreground">{formatDate(tx.date)}</span>
                                  <span>{tx.description}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{formatAmount(tx.amount)}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openTxDialog(item, tx)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteTx(item, tx)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">거래 내역이 없습니다</p>
                        )}

                        {/* 메모 */}
                        {item.memo && (
                          <p className="text-xs text-muted-foreground italic">메모: {item.memo}</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* 품목 추가/수정 다이얼로그 */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "품목 수정" : "품목 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>구분</Label>
              <Select value={itemForm.type} onValueChange={(v) => setItemForm({ ...itemForm, type: v as "INCOME" | "EXPENSE" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">매출 (수입)</SelectItem>
                  <SelectItem value="EXPENSE">매입 (지출)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Input
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                placeholder="예: 도급계약, 구조물자재, 전기공사"
              />
            </div>
            <div className="space-y-2">
              <Label>계획 금액 (원)</Label>
              <Input
                value={itemForm.plannedAmount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "").replace(/\D/g, "");
                  setItemForm({ ...itemForm, plannedAmount: raw ? formatAmount(parseInt(raw)) : "" });
                }}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>메모 (선택)</Label>
              <Textarea
                value={itemForm.memo}
                onChange={(e) => setItemForm({ ...itemForm, memo: e.target.value })}
                placeholder="메모 입력"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveItem} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 거래 내역 추가/수정 다이얼로그 */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTx?.tx ? "거래 내역 수정" : "거래 내역 추가"}
              {editingTx && <span className="text-sm font-normal text-muted-foreground ml-2">({editingTx.item.category})</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>거래일</Label>
              <Input
                type="date"
                value={txForm.date}
                onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Input
                value={txForm.description}
                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                placeholder="예: 계약금, 중도금, 잔금"
              />
            </div>
            <div className="space-y-2">
              <Label>금액 (원)</Label>
              <Input
                value={txForm.amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "").replace(/\D/g, "");
                  setTxForm({ ...txForm, amount: raw ? formatAmount(parseInt(raw)) : "" });
                }}
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCompleted"
                checked={txForm.isCompleted}
                onChange={(e) => setTxForm({ ...txForm, isCompleted: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isCompleted" className="cursor-pointer">
                완료됨 (체크 해제 시 예정으로 표시)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveTx} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTx?.tx ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
