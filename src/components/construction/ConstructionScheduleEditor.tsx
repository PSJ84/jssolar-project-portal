"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Calendar,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface ConstructionItem {
  id: string;
  phaseId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  progress: number;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
  memo: string | null;
  sortOrder: number;
}

interface ConstructionPhase {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  items: ConstructionItem[];
}

interface ConstructionScheduleEditorProps {
  projectId: string;
  initialPhases?: ConstructionPhase[];
}

const statusOptions = [
  { value: "PLANNED", label: "예정", color: "bg-gray-100 text-gray-700" },
  { value: "IN_PROGRESS", label: "진행중", color: "bg-blue-100 text-blue-700" },
  { value: "COMPLETED", label: "완료", color: "bg-green-100 text-green-700" },
  { value: "DELAYED", label: "지연", color: "bg-red-100 text-red-700" },
];

export function ConstructionScheduleEditor({
  projectId,
  initialPhases = [],
}: ConstructionScheduleEditorProps) {
  const [phases, setPhases] = useState<ConstructionPhase[]>(initialPhases);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(initialPhases.map((p) => p.id))
  );
  const [isLoading, setIsLoading] = useState(false);

  // 대공정 추가/수정 다이얼로그
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ConstructionPhase | null>(null);
  const [phaseName, setPhaseName] = useState("");

  // 세부공정 추가/수정 다이얼로그
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConstructionItem | null>(null);
  const [targetPhaseId, setTargetPhaseId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    actualStart: "",
    actualEnd: "",
    progress: 0,
    status: "PLANNED" as ConstructionItem["status"],
    memo: "",
  });

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  // 대공정 추가
  const handleAddPhase = () => {
    setEditingPhase(null);
    setPhaseName("");
    setPhaseDialogOpen(true);
  };

  // 대공정 수정
  const handleEditPhase = (phase: ConstructionPhase) => {
    setEditingPhase(phase);
    setPhaseName(phase.name);
    setPhaseDialogOpen(true);
  };

  // 대공정 저장
  const handleSavePhase = async () => {
    if (!phaseName.trim()) return;

    setIsLoading(true);
    try {
      if (editingPhase) {
        // 수정
        const res = await fetch(
          `/api/projects/${projectId}/construction-phases/${editingPhase.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: phaseName }),
          }
        );
        if (res.ok) {
          const updated = await res.json();
          setPhases((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }
      } else {
        // 추가
        const res = await fetch(
          `/api/projects/${projectId}/construction-phases`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: phaseName }),
          }
        );
        if (res.ok) {
          const newPhase = await res.json();
          setPhases((prev) => [...prev, newPhase]);
          setExpandedPhases((prev) => new Set([...prev, newPhase.id]));
        }
      }
      setPhaseDialogOpen(false);
    } catch (error) {
      console.error("Error saving phase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 대공정 삭제
  const handleDeletePhase = async (phaseId: string) => {
    if (!confirm("이 대공정과 모든 세부공정이 삭제됩니다. 계속하시겠습니까?")) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/construction-phases/${phaseId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setPhases((prev) => prev.filter((p) => p.id !== phaseId));
      }
    } catch (error) {
      console.error("Error deleting phase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 세부공정 추가
  const handleAddItem = (phaseId: string) => {
    setEditingItem(null);
    setTargetPhaseId(phaseId);
    setItemForm({
      name: "",
      startDate: "",
      endDate: "",
      actualStart: "",
      actualEnd: "",
      progress: 0,
      status: "PLANNED",
      memo: "",
    });
    setItemDialogOpen(true);
  };

  // 세부공정 수정
  const handleEditItem = (item: ConstructionItem) => {
    setEditingItem(item);
    setTargetPhaseId(item.phaseId);
    setItemForm({
      name: item.name,
      startDate: item.startDate ? item.startDate.split("T")[0] : "",
      endDate: item.endDate ? item.endDate.split("T")[0] : "",
      actualStart: item.actualStart ? item.actualStart.split("T")[0] : "",
      actualEnd: item.actualEnd ? item.actualEnd.split("T")[0] : "",
      progress: item.progress,
      status: item.status,
      memo: item.memo || "",
    });
    setItemDialogOpen(true);
  };

  // 세부공정 저장
  const handleSaveItem = async () => {
    if (!itemForm.name.trim() || !targetPhaseId) return;

    setIsLoading(true);
    try {
      if (editingItem) {
        // 수정
        const res = await fetch(
          `/api/projects/${projectId}/construction-items/${editingItem.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...itemForm,
              startDate: itemForm.startDate || null,
              endDate: itemForm.endDate || null,
              actualStart: itemForm.actualStart || null,
              actualEnd: itemForm.actualEnd || null,
            }),
          }
        );
        if (res.ok) {
          const updated = await res.json();
          setPhases((prev) =>
            prev.map((p) => ({
              ...p,
              items: p.items.map((i) => (i.id === updated.id ? updated : i)),
            }))
          );
        }
      } else {
        // 추가
        const res = await fetch(
          `/api/projects/${projectId}/construction-phases/${targetPhaseId}/items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...itemForm,
              startDate: itemForm.startDate || null,
              endDate: itemForm.endDate || null,
              actualStart: itemForm.actualStart || null,
              actualEnd: itemForm.actualEnd || null,
            }),
          }
        );
        if (res.ok) {
          const newItem = await res.json();
          setPhases((prev) =>
            prev.map((p) =>
              p.id === targetPhaseId
                ? { ...p, items: [...p.items, newItem] }
                : p
            )
          );
        }
      }
      setItemDialogOpen(false);
    } catch (error) {
      console.error("Error saving item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 세부공정 삭제
  const handleDeleteItem = async (itemId: string, phaseId: string) => {
    if (!confirm("이 세부공정을 삭제하시겠습니까?")) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/construction-items/${itemId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setPhases((prev) =>
          prev.map((p) =>
            p.id === phaseId
              ? { ...p, items: p.items.filter((i) => i.id !== itemId) }
              : p
          )
        );
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: ConstructionItem["status"]) => {
    const option = statusOptions.find((o) => o.value === status);
    return option ? (
      <Badge variant="secondary" className={cn("text-xs", option.color)}>
        {option.label}
      </Badge>
    ) : null;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "M/d", { locale: ko });
    } catch {
      return "-";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">공정표 관리</h3>
        <Button onClick={handleAddPhase} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          대공정 추가
        </Button>
      </div>

      {phases.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>등록된 공정이 없습니다.</p>
            <p className="text-sm">대공정을 추가하여 공정표를 시작하세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {phases.map((phase) => (
            <Card key={phase.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePhase(phase.id)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {expandedPhases.has(phase.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <CardTitle className="text-base">{phase.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {phase.items.length}개
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleAddItem(phase.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEditPhase(phase)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeletePhase(phase.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedPhases.has(phase.id) && phase.items.length > 0 && (
                <CardContent className="pt-0 px-4 pb-3">
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium">공정명</th>
                          <th className="text-center py-2 px-2 font-medium w-20">계획</th>
                          <th className="text-center py-2 px-2 font-medium w-20">실제</th>
                          <th className="text-center py-2 px-2 font-medium w-24">진행률</th>
                          <th className="text-center py-2 px-2 font-medium w-16">상태</th>
                          <th className="w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {phase.items.map((item) => (
                          <tr key={item.id} className="border-t hover:bg-muted/30">
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                                <span>{item.name}</span>
                              </div>
                            </td>
                            <td className="text-center py-2 px-2 text-xs text-muted-foreground">
                              {formatDate(item.startDate)}~{formatDate(item.endDate)}
                            </td>
                            <td className="text-center py-2 px-2 text-xs text-muted-foreground">
                              {formatDate(item.actualStart)}~{formatDate(item.actualEnd)}
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1">
                                <Progress value={item.progress} className="h-2 flex-1" />
                                <span className="text-xs w-8 text-right">{item.progress}%</span>
                              </div>
                            </td>
                            <td className="text-center py-2 px-2">
                              {getStatusBadge(item.status)}
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteItem(item.id, phase.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}

              {expandedPhases.has(phase.id) && phase.items.length === 0 && (
                <CardContent className="pt-0 px-4 pb-3">
                  <div className="text-center py-4 text-sm text-muted-foreground border rounded-md">
                    세부공정이 없습니다.
                    <Button
                      variant="link"
                      size="sm"
                      className="px-1"
                      onClick={() => handleAddItem(phase.id)}
                    >
                      추가하기
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 대공정 다이얼로그 */}
      <Dialog open={phaseDialogOpen} onOpenChange={setPhaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPhase ? "대공정 수정" : "대공정 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phaseName">대공정명</Label>
              <Input
                id="phaseName"
                value={phaseName}
                onChange={(e) => setPhaseName(e.target.value)}
                placeholder="예: 인허가, 시공, 준공"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhaseDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSavePhase} disabled={isLoading || !phaseName.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 세부공정 다이얼로그 */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "세부공정 수정" : "세부공정 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">공정명 *</Label>
              <Input
                id="itemName"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="세부 공정명 입력"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>계획 시작일</Label>
                <Input
                  type="date"
                  value={itemForm.startDate}
                  onChange={(e) => setItemForm({ ...itemForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>계획 종료일</Label>
                <Input
                  type="date"
                  value={itemForm.endDate}
                  onChange={(e) => setItemForm({ ...itemForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>실제 시작일</Label>
                <Input
                  type="date"
                  value={itemForm.actualStart}
                  onChange={(e) => setItemForm({ ...itemForm, actualStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>실제 종료일</Label>
                <Input
                  type="date"
                  value={itemForm.actualEnd}
                  onChange={(e) => setItemForm({ ...itemForm, actualEnd: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>진행률 ({itemForm.progress}%)</Label>
                <Input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={itemForm.progress}
                  onChange={(e) => setItemForm({ ...itemForm, progress: parseInt(e.target.value) })}
                  className="cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label>상태</Label>
                <Select
                  value={itemForm.status}
                  onValueChange={(value) =>
                    setItemForm({ ...itemForm, status: value as ConstructionItem["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={itemForm.memo}
                onChange={(e) => setItemForm({ ...itemForm, memo: e.target.value })}
                placeholder="추가 메모 (선택)"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveItem} disabled={isLoading || !itemForm.name.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
