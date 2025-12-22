"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Pin, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

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

interface KnowledgeDetailProps {
  note: KnowledgeNote;
}

const CATEGORY_LABELS: Record<string, string> = {
  CONSTRUCTION: "시공노하우",
  PERMIT: "인허가팁",
  MATERIAL: "자재정보",
  REGULATION: "법규",
  CONTACT: "연락처",
  OTHER: "기타",
};

const CATEGORY_COLORS: Record<string, string> = {
  CONSTRUCTION: "bg-green-100 text-green-800",
  PERMIT: "bg-blue-100 text-blue-800",
  MATERIAL: "bg-purple-100 text-purple-800",
  REGULATION: "bg-red-100 text-red-800",
  CONTACT: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-gray-100 text-gray-800",
};

export function KnowledgeDetail({ note }: KnowledgeDetailProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(note.isPinned);

  const handleTogglePin = async () => {
    try {
      const res = await fetch(`/api/knowledge/${note.id}/pin`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("Failed to toggle pin");

      setIsPinned(!isPinned);
      toast.success(isPinned ? "핀이 해제되었습니다." : "상단에 고정되었습니다.");
    } catch {
      toast.error("핀 상태 변경에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/knowledge/${note.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("지식노트가 삭제되었습니다.");
      router.push("/admin/solution/knowledge");
      router.refresh();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleTogglePin}>
            <Pin
              className={`mr-2 h-4 w-4 ${isPinned ? "fill-primary text-primary" : ""}`}
            />
            {isPinned ? "핀 해제" : "상단 고정"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/solution/knowledge/${note.id}?edit=true`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            수정
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            삭제
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {isPinned && <Pin className="h-5 w-5 text-primary fill-primary" />}
          <Badge className={CATEGORY_COLORS[note.category]}>
            {CATEGORY_LABELS[note.category] || note.category}
          </Badge>
        </div>

        <h1 className="text-3xl font-bold">{note.title}</h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>작성자: {note.createdBy.name || "알 수 없음"}</span>
          <span>작성: {format(new Date(note.createdAt), "PPP", { locale: ko })}</span>
          {note.updatedAt !== note.createdAt && (
            <span>수정: {format(new Date(note.updatedAt), "PPP", { locale: ko })}</span>
          )}
        </div>

        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <hr />

      <article className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{note.content}</ReactMarkdown>
      </article>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>지식노트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 지식노트를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
