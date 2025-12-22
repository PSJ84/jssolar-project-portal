"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuotationTable } from "@/components/quotation/QuotationTable";
import { Plus, Search, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
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

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/quotations?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch quotations");
      const data = await response.json();
      setQuotations(data);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotations();
  };

  // 상태별 통계
  const stats = {
    total: quotations.length,
    draft: quotations.filter((q) => q.status === "DRAFT").length,
    sent: quotations.filter((q) => q.status === "SENT").length,
    accepted: quotations.filter((q) => q.status === "ACCEPTED").length,
    rejected: quotations.filter((q) => q.status === "REJECTED").length,
    expired: quotations.filter((q) => q.status === "EXPIRED").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">견적 관리</h1>
          <p className="text-muted-foreground">
            태양광 설치 견적서를 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/quotations/new">
            <Plus className="h-4 w-4 mr-2" />
            새 견적 작성
          </Link>
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">전체</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">작성중</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">발송됨</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">계약완료</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.accepted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">거절/만료</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats.rejected + stats.expired}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">검색 및 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="견적번호 또는 고객명으로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="DRAFT">작성중</SelectItem>
                <SelectItem value="SENT">발송됨</SelectItem>
                <SelectItem value="ACCEPTED">계약완료</SelectItem>
                <SelectItem value="REJECTED">거절됨</SelectItem>
                <SelectItem value="EXPIRED">만료됨</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">검색</Button>
          </form>
        </CardContent>
      </Card>

      {/* 견적 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">견적 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              로딩 중...
            </div>
          ) : (
            <QuotationTable quotations={quotations} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
