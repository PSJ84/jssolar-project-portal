"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KnowledgeForm } from "@/components/knowledge/KnowledgeForm";
import { KnowledgeDetail } from "@/components/knowledge/KnowledgeDetail";
import { toast } from "sonner";

interface KnowledgeNote {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  createdBy: { id: string; name: string | null };
  createdAt: string;
  updatedAt: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function KnowledgeDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const isEdit = searchParams.get("edit") === "true";
  const [note, setNote] = useState<KnowledgeNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const res = await fetch(`/api/knowledge/${id}`);
        if (!res.ok) throw new Error("Failed to fetch note");
        const data = await res.json();
        setNote(data);
      } catch {
        toast.error("지식노트를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">
          지식노트를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  if (isEdit) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>지식노트 수정</CardTitle>
          </CardHeader>
          <CardContent>
            <KnowledgeForm initialData={note} isEdit />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardContent className="pt-6">
          <KnowledgeDetail note={note} />
        </CardContent>
      </Card>
    </div>
  );
}
