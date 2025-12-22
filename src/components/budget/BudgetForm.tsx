"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Budget {
  id: string;
  category: string;
  description: string;
  plannedAmount: number;
  actualAmount: number;
}

interface BudgetFormProps {
  onSubmit: (data: {
    category: string;
    description: string;
    plannedAmount: number;
    actualAmount: number;
  }) => Promise<void>;
  onCancel?: () => void;
  initialData?: Budget;
  isEdit?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: "MATERIAL", label: "자재비" },
  { value: "LABOR", label: "인건비" },
  { value: "EQUIPMENT", label: "장비비" },
  { value: "PERMIT", label: "인허가비용" },
  { value: "TRANSPORT", label: "운송비" },
  { value: "OTHER", label: "기타" },
];

export function BudgetForm({
  onSubmit,
  onCancel,
  initialData,
  isEdit = false,
}: BudgetFormProps) {
  const [category, setCategory] = useState(initialData?.category || "OTHER");
  const [description, setDescription] = useState(initialData?.description || "");
  const [plannedAmount, setPlannedAmount] = useState(
    initialData?.plannedAmount?.toString() || ""
  );
  const [actualAmount, setActualAmount] = useState(
    initialData?.actualAmount?.toString() || "0"
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !plannedAmount) return;

    setIsLoading(true);
    try {
      await onSubmit({
        category,
        description: description.trim(),
        plannedAmount: parseFloat(plannedAmount),
        actualAmount: parseFloat(actualAmount) || 0,
      });
      if (!isEdit) {
        setCategory("OTHER");
        setDescription("");
        setPlannedAmount("");
        setActualAmount("0");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (value: string) => {
    const num = value.replace(/[^0-9]/g, "");
    return num ? parseInt(num).toLocaleString() : "";
  };

  const parseNumber = (value: string) => {
    return value.replace(/,/g, "");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">카테고리</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="description">설명</Label>
          <Input
            id="description"
            placeholder="예산 항목 설명"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="plannedAmount">계획 금액 (원)</Label>
          <Input
            id="plannedAmount"
            placeholder="0"
            value={formatNumber(plannedAmount)}
            onChange={(e) => setPlannedAmount(parseNumber(e.target.value))}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="actualAmount">실제 금액 (원)</Label>
          <Input
            id="actualAmount"
            placeholder="0"
            value={formatNumber(actualAmount)}
            onChange={(e) => setActualAmount(parseNumber(e.target.value))}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" disabled={isLoading || !description.trim() || !plannedAmount}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "수정" : "추가"}
        </Button>
      </div>
    </form>
  );
}
