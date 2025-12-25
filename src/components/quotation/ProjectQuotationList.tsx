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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileText, Download, Plus, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { QuotationStatus } from "@prisma/client";

interface QuotationItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  note: string | null;
}

interface QuotationDetail {
  id: string;
  quotationNumber: string;
  customerName: string;
  projectName: string | null;
  quotationDate: string;
  subtotal: number;
  roundingAmount: number;
  totalAmount: number;
  vatIncluded: boolean;
  grandTotal: number;
  status: QuotationStatus;
  specialNotes: string | null;
  items: QuotationItem[];
}

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
  initialQuotations?: Quotation[];
  initialDetails?: QuotationDetail[];
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

export function ProjectQuotationList({
  projectId,
  isAdmin = false,
  initialQuotations,
  initialDetails,
}: ProjectQuotationListProps) {
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations || []);
  const [isLoading, setIsLoading] = useState(!initialQuotations);
  // 견적서가 1개일 경우 기본으로 펼치기
  const [expandedId, setExpandedId] = useState<string | null>(
    initialQuotations?.length === 1 ? initialQuotations[0].id : null
  );
  const [detailsCache, setDetailsCache] = useState<Record<string, QuotationDetail>>(() => {
    if (initialDetails) {
      return Object.fromEntries(initialDetails.map(d => [d.id, d]));
    }
    return {};
  });
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!initialQuotations) {
      fetchQuotations();
    }
  }, [projectId, initialQuotations]);

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

  const fetchQuotationDetail = async (id: string) => {
    if (detailsCache[id]) return;

    setLoadingDetail(id);
    try {
      const response = await fetch(`/api/quotations/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setDetailsCache((prev) => ({ ...prev, [id]: data }));
    } catch (error) {
      console.error("Error fetching quotation detail:", error);
      toast.error("견적서 상세 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoadingDetail(null);
    }
  };

  const handleToggle = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      await fetchQuotationDetail(id);
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
          <div className="space-y-2">
            {quotations.map((q) => {
              const detail = detailsCache[q.id];
              const isExpanded = expandedId === q.id;
              const isLoadingThis = loadingDetail === q.id;

              return (
                <Collapsible
                  key={q.id}
                  open={isExpanded}
                  onOpenChange={() => handleToggle(q.id)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              {isAdmin ? (
                                <Link
                                  href={`/admin/quotations/${q.id}`}
                                  className="font-medium text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {q.quotationNumber}
                                </Link>
                              ) : (
                                <span className="font-medium">{q.quotationNumber}</span>
                              )}
                              <Badge variant={statusVariants[q.status]} className="text-xs">
                                {statusLabels[q.status]}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(q.quotationDate)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(q.grandTotal)}</div>
                            <div className="text-xs text-muted-foreground">
                              VAT {q.vatIncluded ? "포함" : "별도"}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPdf(q.id, q.quotationNumber);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t p-3 bg-muted/30">
                        {isLoadingThis ? (
                          <div className="text-center py-4 text-muted-foreground">
                            불러오는 중...
                          </div>
                        ) : detail ? (
                          <div className="space-y-4">
                            {/* 품목 테이블 */}
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-12">NO</TableHead>
                                    <TableHead>품명</TableHead>
                                    <TableHead className="w-16">단위</TableHead>
                                    <TableHead className="w-20 text-right">수량</TableHead>
                                    <TableHead className="w-28 text-right">단가</TableHead>
                                    <TableHead className="w-28 text-right">금액</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {detail.items.map((item, idx) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="text-center">{idx + 1}</TableCell>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell>{item.unit}</TableCell>
                                      <TableCell className="text-right">{item.quantity}</TableCell>
                                      <TableCell className="text-right">
                                        {item.unitPrice.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {item.amount.toLocaleString()}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>

                            {/* 합계 */}
                            <div className="flex justify-end">
                              <div className="w-64 space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span>소계</span>
                                  <span>{detail.subtotal.toLocaleString()}원</span>
                                </div>
                                {detail.roundingAmount !== 0 && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>잔액정리</span>
                                    <span>{detail.roundingAmount.toLocaleString()}원</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-medium">
                                  <span>공급가액</span>
                                  <span>{detail.totalAmount.toLocaleString()}원</span>
                                </div>
                                {!detail.vatIncluded && (
                                  <div className="flex justify-between">
                                    <span>부가세 (10%)</span>
                                    <span>
                                      {Math.round(detail.totalAmount * 0.1).toLocaleString()}원
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold text-base border-t pt-1">
                                  <span>합계</span>
                                  <span>{detail.grandTotal.toLocaleString()}원</span>
                                </div>
                              </div>
                            </div>

                            {/* 특기사항 */}
                            {detail.specialNotes && (
                              <div className="text-sm">
                                <div className="font-medium mb-1">특기사항</div>
                                <div className="text-muted-foreground whitespace-pre-wrap">
                                  {detail.specialNotes}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
