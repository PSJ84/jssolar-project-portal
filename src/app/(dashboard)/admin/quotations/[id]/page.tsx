"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
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
import {
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Download,
  Copy,
  FileText,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { QuotationStatus } from "@prisma/client";
import { ProfitAnalysisForm } from "@/components/quotation/ProfitAnalysisForm";
import { KepcoChargeCalculator } from "@/components/quotation/KepcoChargeCalculator";

interface QuotationItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  note: string | null;
  execUnitPrice: number | null;
  execAmount: number | null;
  sortOrder: number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  version: number;
  customerName: string;
  customerAddress: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  address: string | null;
  projectName: string | null;
  quotationDate: string;
  subtotal: number;
  roundingAmount: number;
  totalAmount: number;
  vatAmount: number;
  grandTotal: number;
  vatIncluded: boolean;
  roundingType: string;
  specialNotes: string | null;
  execSubtotal: number | null;
  execTotal: number | null;
  validUntil: string;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
  capacityKw: number | null;  // 설치 용량
  items: QuotationItem[];
  createdBy: {
    id: string;
    name: string | null;
  };
  organization: {
    id: string;
    name: string;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
}

const statusLabels: Record<QuotationStatus, string> = {
  DRAFT: "작성중",
  SENT: "발송됨",
  ACCEPTED: "계약완료",
  REJECTED: "거절됨",
  EXPIRED: "만료됨",
};

const statusVariants: Record<
  QuotationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "secondary",
  SENT: "default",
  ACCEPTED: "default",
  REJECTED: "destructive",
  EXPIRED: "outline",
};

export default function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [kepcoVersion, setKepcoVersion] = useState(0);  // 한전불입금 저장 시 증가

  // 관리자 권한 체크 (CLIENT는 실행단가/실행금액 못 봄)
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quotations/${id}`);
      if (!response.ok) throw new Error("Failed to fetch quotation");
      const data = await response.json();
      setQuotation(data);
    } catch (error) {
      console.error("Error fetching quotation:", error);
      toast.error("견적서를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: QuotationStatus) => {
    try {
      const response = await fetch(`/api/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("상태 변경에 실패했습니다.");

      toast.success(`상태가 '${statusLabels[status]}'(으)로 변경되었습니다.`);
      fetchQuotation();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/quotations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "삭제에 실패했습니다.");
      }

      toast.success("견적서가 삭제되었습니다.");
      router.push("/admin/quotations");
    } catch (error) {
      console.error("Error deleting quotation:", error);
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다."
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const isExpired =
    quotation &&
    new Date(quotation.validUntil) < new Date() &&
    quotation.status !== "ACCEPTED";

  // 실행견적 합계가 있는지 확인
  const hasExecData = quotation?.execSubtotal && quotation.execSubtotal > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">견적서를 찾을 수 없습니다.</p>
        <Button asChild>
          <Link href="/admin/quotations">목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/quotations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {quotation.quotationNumber}
                {quotation.version > 1 && (
                  <span className="text-muted-foreground ml-2">
                    v{quotation.version}
                  </span>
                )}
              </h1>
              <Badge
                variant={statusVariants[quotation.status]}
                className={
                  quotation.status === "ACCEPTED" ? "bg-green-600" : ""
                }
              >
                {statusLabels[quotation.status]}
              </Badge>
              {isExpired && quotation.status !== "EXPIRED" && (
                <Badge variant="destructive">유효기간 만료</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {quotation.customerName}
              {quotation.projectName && ` · ${quotation.projectName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(`/api/quotations/${id}/pdf`, "_blank")
            }
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(quotation.status === "DRAFT" || quotation.status === "ACCEPTED") && (
                <DropdownMenuItem asChild>
                  <Link href={`/admin/quotations/${id}/edit`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    수정
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                복사하여 새 견적 작성
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {quotation.status === "DRAFT" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("SENT")}
                >
                  <Send className="h-4 w-4 mr-2" />
                  발송 처리
                </DropdownMenuItem>
              )}
              {quotation.status === "SENT" && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("ACCEPTED")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    계약 완료
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("REJECTED")}
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
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="detail" className="space-y-6">
        <TabsList>
          <TabsTrigger value="detail" className="gap-2">
            <FileText className="h-4 w-4" />
            견적 상세
          </TabsTrigger>
          <TabsTrigger value="kepco" className="gap-2">
            <Zap className="h-4 w-4" />
            한전불입금
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            수익 분석
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detail">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 왼쪽: 고객 정보 + 견적 정보 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">고객 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">고객명 (수신)</p>
                    <p className="font-medium">{quotation.customerName}</p>
                  </div>
                  {quotation.customerAddress && (
                    <div>
                      <p className="text-sm text-muted-foreground">고객 주소</p>
                      <p className="font-medium">{quotation.customerAddress}</p>
                    </div>
                  )}
                  {quotation.customerPhone && (
                    <div>
                      <p className="text-sm text-muted-foreground">연락처</p>
                      <p className="font-medium">{quotation.customerPhone}</p>
                    </div>
                  )}
                  {quotation.customerEmail && (
                    <div>
                      <p className="text-sm text-muted-foreground">이메일</p>
                      <p className="font-medium">{quotation.customerEmail}</p>
                    </div>
                  )}
                  {quotation.address && (
                    <div>
                      <p className="text-sm text-muted-foreground">설치 주소</p>
                      <p className="font-medium">{quotation.address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">견적 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">견적 번호</p>
                    <p className="font-medium">{quotation.quotationNumber}</p>
                  </div>
                  {quotation.projectName && (
                    <div>
                      <p className="text-sm text-muted-foreground">건명</p>
                      <p className="font-medium">{quotation.projectName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">견적일자</p>
                    <p className="font-medium">
                      {new Date(quotation.quotationDate).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">유효기간</p>
                    <p
                      className={`font-medium ${isExpired ? "text-destructive" : ""}`}
                    >
                      {new Date(quotation.validUntil).toLocaleDateString("ko-KR")}
                      {isExpired && " (만료됨)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">부가세</p>
                    <p className="font-medium">{quotation.vatIncluded ? "포함" : "별도"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">작성자</p>
                    <p className="font-medium">
                      {quotation.createdBy.name || "알 수 없음"}
                    </p>
                  </div>
                  {quotation.project && (
                    <div>
                      <p className="text-sm text-muted-foreground">연결된 프로젝트</p>
                      <Link
                        href={`/admin/projects/${quotation.project.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {quotation.project.name}
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {quotation.specialNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">특기사항</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm">{quotation.specialNotes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 오른쪽: 견적 항목 + 합계 */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">견적 항목</CardTitle>
                  <CardDescription>
                    총 {quotation.items.length}개 항목
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">NO</TableHead>
                          <TableHead>품명</TableHead>
                          <TableHead className="text-center">단위</TableHead>
                          <TableHead className="text-right">수량</TableHead>
                          <TableHead className="text-right">단가</TableHead>
                          <TableHead className="text-right">금액</TableHead>
                          <TableHead>비고</TableHead>
                          {isAdmin && hasExecData && (
                            <>
                              <TableHead className="text-right bg-blue-50">실행단가</TableHead>
                              <TableHead className="text-right bg-blue-50">실행금액</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotation.items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-center text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-center">{item.unit}</TableCell>
                            <TableCell className="text-right font-mono">
                              {item.quantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {item.unitPrice.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {item.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.note || "-"}
                            </TableCell>
                            {isAdmin && hasExecData && (
                              <>
                                <TableCell className="text-right font-mono bg-blue-50">
                                  {item.execUnitPrice?.toLocaleString() || "-"}
                                </TableCell>
                                <TableCell className="text-right font-mono font-medium bg-blue-50">
                                  {item.execAmount?.toLocaleString() || "-"}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={5} className="text-right">소계</TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {quotation.subtotal.toLocaleString()}원
                          </TableCell>
                          <TableCell></TableCell>
                          {isAdmin && hasExecData && (
                            <>
                              <TableCell></TableCell>
                              <TableCell className="text-right font-mono font-medium bg-blue-50">
                                {quotation.execSubtotal?.toLocaleString()}원
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                        {quotation.roundingAmount !== 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-right text-muted-foreground">
                              잔액정리
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {quotation.roundingAmount.toLocaleString()}원
                            </TableCell>
                            <TableCell></TableCell>
                            {isAdmin && hasExecData && (
                              <>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                              </>
                            )}
                          </TableRow>
                        )}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={5} className="text-right font-semibold">합계</TableCell>
                          <TableCell className="text-right font-mono font-bold text-lg">
                            {quotation.totalAmount.toLocaleString()}원
                          </TableCell>
                          <TableCell></TableCell>
                          {isAdmin && hasExecData && (
                            <>
                              <TableCell></TableCell>
                              <TableCell className="text-right font-mono font-bold text-lg bg-blue-50">
                                {quotation.execTotal?.toLocaleString()}원
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">합계</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">공급가액</span>
                      <span className="font-mono">
                        {quotation.totalAmount.toLocaleString()}원
                      </span>
                    </div>
                    {!quotation.vatIncluded && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">부가세 (10%)</span>
                        <span className="font-mono">
                          {quotation.vatAmount.toLocaleString()}원
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-semibold">합계</span>
                      <span className="text-xl font-bold text-primary font-mono">
                        {quotation.grandTotal.toLocaleString()}원
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      (부가세 {quotation.vatIncluded ? "포함" : "별도"})
                    </div>

                    {/* 예상 이익 (실행견적이 있을 때, 관리자만) */}
                    {isAdmin && hasExecData && quotation.execTotal && (
                      <>
                        <Separator />
                        <div className="p-4 bg-muted rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>실행금액</span>
                            <span className="font-mono text-blue-600">
                              {quotation.execTotal.toLocaleString()}원
                            </span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>예상 이익</span>
                            <span className={`font-mono ${(quotation.totalAmount - quotation.execTotal) >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {(quotation.totalAmount - quotation.execTotal) >= 0 ? "+" : ""}
                              {(quotation.totalAmount - quotation.execTotal).toLocaleString()}원
                              ({quotation.totalAmount > 0
                                ? (((quotation.totalAmount - quotation.execTotal) / quotation.totalAmount) * 100).toFixed(1)
                                : 0}%)
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="kepco">
          <div className="max-w-2xl">
            <KepcoChargeCalculator
              quotationId={quotation.id}
              defaultCapacityKw={quotation.capacityKw || 0}
              onSave={() => setKepcoVersion((v) => v + 1)}
            />
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <ProfitAnalysisForm
            key={`analysis-${kepcoVersion}`}
            quotation={{
              id: quotation.id,
              quotationNumber: quotation.quotationNumber,
              capacityKw: quotation.capacityKw || 0,
              grandTotal: quotation.grandTotal,
            }}
          />
        </TabsContent>
      </Tabs>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>견적서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{quotation.quotationNumber}&quot; 견적서를 삭제하시겠습니까?
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
    </div>
  );
}
