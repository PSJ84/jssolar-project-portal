"use client";

import { use } from "react";
import { Button } from "@/components/ui/button";
import { QuotationForm } from "@/components/quotation/QuotationForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/quotations/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">견적서 수정</h1>
          <p className="text-muted-foreground">
            견적서 내용을 수정합니다.
          </p>
        </div>
      </div>

      <QuotationForm quotationId={id} />
    </div>
  );
}
