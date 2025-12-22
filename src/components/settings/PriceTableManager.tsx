"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { PriceCategory } from "@prisma/client";

interface PriceItem {
  id: string;
  category: PriceCategory;
  name: string;
  unit: string;
  unitPrice: number;
  spec: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PriceTableManagerProps {
  category: PriceCategory;
}

const categoryLabels: Record<PriceCategory, string> = {
  MODULE: "모듈",
  INVERTER: "인버터",
  STRUCTURE: "구조물",
  LABOR: "인건비/공사비",
  ETC: "기타",
};

const defaultUnits: Record<PriceCategory, string> = {
  MODULE: "장",
  INVERTER: "대",
  STRUCTURE: "kW",
  LABOR: "식",
  ETC: "식",
};

export function PriceTableManager({ category }: PriceTableManagerProps) {
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<PriceItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    spec: "",
    unit: defaultUnits[category],
    unitPrice: "",
  });

  // Fetch prices
  const fetchPrices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/price-table?category=${category}`);
      if (!response.ok) throw new Error("Failed to fetch prices");
      const data = await response.json();
      setPrices(data);
    } catch (error) {
      console.error("Error fetching prices:", error);
      toast.error("단가 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, [category]);

  // Reset form
  const resetForm = () => {
    setForm({
      name: "",
      spec: "",
      unit: defaultUnits[category],
      unitPrice: "",
    });
    setSelectedPrice(null);
  };

  // Open dialog for add
  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Open dialog for edit
  const handleEdit = (price: PriceItem) => {
    setSelectedPrice(price);
    setForm({
      name: price.name,
      spec: price.spec || "",
      unit: price.unit,
      unitPrice: price.unitPrice.toString(),
    });
    setDialogOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (price: PriceItem) => {
    setSelectedPrice(price);
    setDeleteDialogOpen(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("품명을 입력해주세요.");
      return;
    }
    if (!form.unit.trim()) {
      toast.error("단위를 입력해주세요.");
      return;
    }
    if (!form.unitPrice || isNaN(Number(form.unitPrice))) {
      toast.error("올바른 단가를 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      if (selectedPrice) {
        // Update
        const response = await fetch(`/api/admin/price-table/${selectedPrice.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            spec: form.spec.trim() || null,
            unit: form.unit.trim(),
            unitPrice: Number(form.unitPrice),
          }),
        });

        if (!response.ok) throw new Error("Failed to update price");
        toast.success("단가가 수정되었습니다.");
      } else {
        // Create
        const response = await fetch("/api/admin/price-table", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            name: form.name.trim(),
            spec: form.spec.trim() || null,
            unit: form.unit.trim(),
            unitPrice: Number(form.unitPrice),
          }),
        });

        if (!response.ok) throw new Error("Failed to create price");
        toast.success("단가가 추가되었습니다.");
      }

      setDialogOpen(false);
      resetForm();
      fetchPrices();
    } catch (error) {
      console.error("Error saving price:", error);
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!selectedPrice) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/price-table/${selectedPrice.id}?hard=true`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete price");
      toast.success("단가가 삭제되었습니다.");

      setDeleteDialogOpen(false);
      setSelectedPrice(null);
      fetchPrices();
    } catch (error) {
      console.error("Error deleting price:", error);
      toast.error("삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {categoryLabels[category]} 단가 목록 ({prices.length}개)
        </p>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          추가
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>품명</TableHead>
              <TableHead>사양</TableHead>
              <TableHead className="text-center">단위</TableHead>
              <TableHead className="text-right">단가</TableHead>
              <TableHead className="text-right w-[100px]">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  등록된 단가가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              prices.map((price) => (
                <TableRow key={price.id}>
                  <TableCell className="font-medium">{price.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {price.spec || "-"}
                  </TableCell>
                  <TableCell className="text-center">{price.unit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {price.unitPrice.toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(price)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(price)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPrice ? "단가 수정" : "단가 추가"}
            </DialogTitle>
            <DialogDescription>
              {categoryLabels[category]} 단가 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">품명 *</Label>
              <Input
                id="name"
                placeholder="예: OO모듈 550W"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spec">사양</Label>
              <Input
                id="spec"
                placeholder="예: 효율 21.5%"
                value={form.spec}
                onChange={(e) => setForm({ ...form, spec: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">단위 *</Label>
                <Input
                  id="unit"
                  placeholder="예: 장, 대, kW"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">단가 (원) *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  placeholder="예: 150000"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedPrice ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>단가 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{selectedPrice?.name}&quot; 단가를 삭제하시겠습니까?
              <br />
              삭제된 단가는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
