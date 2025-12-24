"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { QuotationStatus } from "@prisma/client";

interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  projectName: string | null;
  quotationDate: string;
  totalAmount: number;
  vatIncluded: boolean;
  grandTotal: number;
  status: QuotationStatus;
  execTotal?: number | null;
}

interface ProjectQuotationListProps {
  projectId: string;
  isAdmin?: boolean;
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

export function ProjectQuotationList({ projectId, isAdmin = false }: ProjectQuotationListProps) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQuotations();
  }, [projectId]);

  const fetchQuotations = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/quotations`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setQuotations(data);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      toast.error("견적서 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async (quotationId: string, quotationNumber: string) => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}/pdf`);
      if (!response.ok) throw new Error("PDF 생성 실패");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `견적서_${quotationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF 다운로드 완료");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("PDF 다운로드에 실패했습니다.");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ko-KR") + "원";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          견적서 목록을 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>견적서</CardTitle>
        {isAdmin && (
          <Button asChild size="sm">
            <Link href={`/admin/quotations/new?projectId=${projectId}`}>
              <Plus className="h-4 w-4 mr-1" />
              새 견적서
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {quotations.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">등록된 견적서가 없습니다.</p>
            {isAdmin && (
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/admin/quotations/new?projectId=${projectId}`}>
                  <Plus className="h-4 w-4 mr-1" />
                  새 견적서 작성
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>견적번호</TableHead>
                  <TableHead>일자</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">다운로드</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      {isAdmin ? (
                        <Link
                          href={`/admin/quotations/${q.id}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {q.quotationNumber}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="font-medium">{q.quotationNumber}</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(q.quotationDate)}</TableCell>
                    <TableCell className="text-right">
                      <div>
                        {formatCurrency(q.grandTotal)}
                        <span className="text-xs text-muted-foreground ml-1">
                          (VAT {q.vatIncluded ? "포함" : "별도"})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[q.status]}>
                        {statusLabels[q.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPdf(q.id, q.quotationNumber)}
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only">PDF 다운로드</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
