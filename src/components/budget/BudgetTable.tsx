"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
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
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { BudgetForm } from "./BudgetForm";

interface Budget {
  id: string;
  category: string;
  description: string;
  plannedAmount: number;
  actualAmount: number;
  createdAt: string;
}

interface BudgetTableProps {
  budgets: Budget[];
  onUpdate: (id: string, data: {
    category: string;
    description: string;
    plannedAmount: number;
    actualAmount: number;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CATEGORY_LABELS: Record<string, string> = {
  MATERIAL: "자재비",
  LABOR: "인건비",
  EQUIPMENT: "장비비",
  PERMIT: "인허가비용",
  TRANSPORT: "운송비",
  OTHER: "기타",
};

const CATEGORY_COLORS: Record<string, string> = {
  MATERIAL: "bg-blue-100 text-blue-800",
  LABOR: "bg-green-100 text-green-800",
  EQUIPMENT: "bg-purple-100 text-purple-800",
  PERMIT: "bg-orange-100 text-orange-800",
  TRANSPORT: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-gray-100 text-gray-800",
};

export function BudgetTable({ budgets, onUpdate, onDelete }: BudgetTableProps) {
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const getDifferenceColor = (planned: number, actual: number) => {
    if (actual === 0) return "";
    const diff = ((actual - planned) / planned) * 100;
    if (diff > 10) return "text-red-500";
    if (diff < -10) return "text-green-500";
    return "";
  };

  const handleUpdate = async (data: {
    category: string;
    description: string;
    plannedAmount: number;
    actualAmount: number;
  }) => {
    if (editingBudget) {
      await onUpdate(editingBudget.id, data);
      setEditingBudget(null);
    }
  };

  const handleDelete = async () => {
    if (deletingBudgetId) {
      await onDelete(deletingBudgetId);
      setDeletingBudgetId(null);
    }
  };

  if (budgets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        예산 항목이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>카테고리</TableHead>
              <TableHead>설명</TableHead>
              <TableHead className="text-right">계획 금액</TableHead>
              <TableHead className="text-right">실제 금액</TableHead>
              <TableHead className="text-right">차이</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((budget) => {
              const difference = budget.actualAmount - budget.plannedAmount;
              return (
                <TableRow key={budget.id}>
                  <TableCell>
                    <Badge className={CATEGORY_COLORS[budget.category]}>
                      {CATEGORY_LABELS[budget.category] || budget.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{budget.description}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(budget.plannedAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(budget.actualAmount)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${getDifferenceColor(
                      budget.plannedAmount,
                      budget.actualAmount
                    )}`}
                  >
                    {difference >= 0 ? "+" : ""}
                    {formatCurrency(difference)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingBudget(budget)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingBudgetId(budget.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingBudget} onOpenChange={() => setEditingBudget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예산 항목 수정</DialogTitle>
          </DialogHeader>
          {editingBudget && (
            <BudgetForm
              onSubmit={handleUpdate}
              onCancel={() => setEditingBudget(null)}
              initialData={editingBudget}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingBudgetId}
        onOpenChange={() => setDeletingBudgetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>예산 항목 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 예산 항목을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
