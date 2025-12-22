"use client";

import { Button } from "@/components/ui/button";
import { QuotationForm } from "@/components/quotation/QuotationForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewQuotationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/quotations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">새 견적 작성</h1>
          <p className="text-muted-foreground">
            태양광 설치 견적서를 작성합니다.
          </p>
        </div>
      </div>

      <QuotationForm />
    </div>
  );
}
