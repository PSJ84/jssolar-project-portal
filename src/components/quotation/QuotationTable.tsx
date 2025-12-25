"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Pencil, Trash2, Send, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { QuotationStatus } from "@prisma/client";

interface Quotation {
  id: string;
  quotationNumber: string;
  version: number;
  customerName: string;
  customerPhone: string | null;
  capacityKw: number;
  totalAmount: number;
  grandTotal: number;
  status: QuotationStatus;
  validUntil: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
  };
  organization?: {
    id: string;
    name: string;
  };
}

interface QuotationTableProps {
  quotations: Quotation[];
  showOrganization?: boolean;
}

const statusLabels: Record<QuotationStatus, string> = {
  DRAFT: "작성중",
  SENT: "발송됨",
  ACCEPTED: "계약완료",
  REJECTED: "거절됨",
  EXPIRED: "만료됨",
};

const statusVariants: Record<QuotationStatus, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "default",
  ACCEPTED: "default",
  REJECTED: "destructive",
  EXPIRED: "outline",
};

export function QuotationTable({ quotations, showOrganization = false }: QuotationTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStatusChange = async (id: string, status: QuotationStatus) => {
    try {
      const response = await fetch(`/api/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("상태 변경에 실패했습니다.");
      }

      toast.success(`상태가 '${statusLabels[status]}'(으)로 변경되었습니다.`);
      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/quotations/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "삭제에 실패했습니다.");
      }

      toast.success("견적서가 삭제되었습니다.");
      router.refresh();
    } catch (error) {
      console.error("Error deleting quotation:", error);
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>견적번호</TableHead>
              <TableHead>고객명</TableHead>
              {showOrganization && <TableHead>조직</TableHead>}
              <TableHead className="text-right">용량</TableHead>
              <TableHead className="text-right">총액</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>유효기간</TableHead>
              <TableHead>작성일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showOrganization ? 9 : 8}
                  className="text-center text-muted-foreground py-8"
                >
                  등록된 견적서가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              quotations.map((quotation) => (
                <TableRow
                  key={quotation.id}
                  className={quotation.status === "EXPIRED" ? "opacity-60" : ""}
                >
                  <TableCell>
                    <Link
                      href={`/admin/quotations/${quotation.id}`}
                      className="font-medium hover:underline"
                    >
                      {quotation.quotationNumber}
                      {quotation.version > 1 && (
                        <span className="text-muted-foreground ml-1">
                          v{quotation.version}
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{quotation.customerName}</div>
                    {quotation.customerPhone && (
                      <div className="text-xs text-muted-foreground">
                        {quotation.customerPhone}
                      </div>
                    )}
                  </TableCell>
                  {showOrganization && (
                    <TableCell className="text-muted-foreground">
                      {quotation.organization?.name || "-"}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono">
                    {quotation.capacityKw ? `${quotation.capacityKw.toLocaleString()} kW` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {quotation.grandTotal.toLocaleString()}원
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariants[quotation.status]}
                      className={quotation.status === "ACCEPTED" ? "bg-green-600" : ""}
                    >
                      {statusLabels[quotation.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        isExpired(quotation.validUntil) && quotation.status !== "ACCEPTED"
                          ? "text-destructive"
                          : ""
                      }
                    >
                      {new Date(quotation.validUntil).toLocaleDateString("ko-KR")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(quotation.createdAt).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/quotations/${quotation.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            상세 보기
                          </Link>
                        </DropdownMenuItem>
                        {(quotation.status === "DRAFT" || quotation.status === "ACCEPTED") && (
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/quotations/${quotation.id}/edit`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              수정
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {quotation.status === "DRAFT" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(quotation.id, "SENT")}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            발송 처리
                          </DropdownMenuItem>
                        )}
                        {quotation.status === "SENT" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(quotation.id, "ACCEPTED")}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              계약 완료
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(quotation.id, "REJECTED")}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              거절됨
                            </DropdownMenuItem>
                          </>
                        )}
                        {quotation.status !== "ACCEPTED" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(quotation)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>견적서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.quotationNumber}&quot; 견적서를 삭제하시겠습니까?
              <br />
              삭제된 견적서는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
