"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, RefreshCw } from "lucide-react";
import { BudgetForm } from "./BudgetForm";
import { BudgetTable } from "./BudgetTable";
import { BudgetSummaryCard } from "./BudgetSummaryCard";
import { toast } from "sonner";

interface Budget {
  id: string;
  category: string;
  description: string;
  plannedAmount: number;
  actualAmount: number;
  createdAt: string;
}

interface BudgetSummary {
  totalPlanned: number;
  totalActual: number;
  byCategory: Record<string, { planned: number; actual: number }>;
}

interface ProjectBudgetSectionProps {
  projectId: string;
}

export function ProjectBudgetSection({ projectId }: ProjectBudgetSectionProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary>({
    totalPlanned: 0,
    totalActual: 0,
    byCategory: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/budgets`);
      if (!res.ok) throw new Error("Failed to fetch budgets");
      const data = await res.json();
      setBudgets(data.budgets);
      setSummary(data.summary);
    } catch {
      toast.error("예산 정보를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleCreate = async (data: {
    category: string;
    description: string;
    plannedAmount: number;
    actualAmount: number;
  }) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create budget");
      }

      toast.success("예산 항목이 추가되었습니다.");
      setIsDialogOpen(false);
      fetchBudgets();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "예산 추가에 실패했습니다.");
    }
  };

  const handleUpdate = async (
    id: string,
    data: {
      category: string;
      description: string;
      plannedAmount: number;
      actualAmount: number;
    }
  ) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/budgets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update budget");

      toast.success("예산 항목이 수정되었습니다.");
      fetchBudgets();
    } catch {
      toast.error("수정에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/budgets/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete budget");

      toast.success("예산 항목이 삭제되었습니다.");
      fetchBudgets();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">예산 관리</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchBudgets}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                항목 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>예산 항목 추가</DialogTitle>
              </DialogHeader>
              <BudgetForm
                onSubmit={handleCreate}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
      ) : (
        <>
          <BudgetSummaryCard summary={summary} />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">예산 항목</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetTable
                budgets={budgets}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
